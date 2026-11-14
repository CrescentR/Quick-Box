import { lt } from '../../i18n'

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  } catch {
    return null
  }
}

async function derivePbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  digest: 'SHA-256' | 'SHA-512',
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: digest,
    },
    keyMaterial,
    digest === 'SHA-512' ? 512 : 256,
  )
  return new Uint8Array(bits)
}

export async function hashPasswordPbkdf2(
  password: string,
  iterations = 100_000,
  digest: 'SHA-256' | 'SHA-512' = 'SHA-256',
  customSalt?: Uint8Array,
): Promise<string> {
  if (!password) throw new Error(lt('请输入明文密码', 'Enter a password'))
  const safeIterations = Math.min(Math.max(Math.trunc(iterations) || 100_000, 1_000), 1_000_000)
  const salt = customSalt ?? crypto.getRandomValues(new Uint8Array(16))
  const derived = await derivePbkdf2(password, salt, safeIterations, digest)
  const alg = digest === 'SHA-512' ? 'pbkdf2-sha512' : 'pbkdf2-sha256'
  return `$${alg}$i=${safeIterations}$${toBase64Url(salt)}$${toBase64Url(derived)}`
}

export async function verifyPasswordPbkdf2(
  password: string,
  encodedHash: string,
): Promise<{ valid: boolean; message: string }> {
  const parts = encodedHash.trim().split('$').filter(Boolean)
  if (parts.length !== 4) {
    return { valid: false, message: lt('哈希格式无效，需为 $pbkdf2-sha256$i=迭代数$盐$摘要', 'Invalid hash format; expected $pbkdf2-sha256$i=<iterations>$<salt>$<hash>') }
  }
  const [alg, iterPart, saltB64, hashB64] = parts
  if (alg !== 'pbkdf2-sha256' && alg !== 'pbkdf2-sha512') {
    return { valid: false, message: lt(`不支持的算法标识：${alg}`, `Unsupported algorithm: ${alg}`) }
  }
  const iterMatch = /^i=(\d+)$/.exec(iterPart)
  const iterations = iterMatch ? Number(iterMatch[1]) : 0
  if (!iterations || iterations < 1_000 || iterations > 1_000_000) {
    return { valid: false, message: lt('迭代次数超出有效范围 (1000–1000000)', 'Iteration count out of range (1000-1000000)') }
  }
  const salt = fromBase64Url(saltB64)
  const expected = fromBase64Url(hashB64)
  if (!salt || !expected || salt.length < 8) {
    return { valid: false, message: lt('盐值或哈希编码无效', 'Invalid salt or hash encoding') }
  }
  const digest = alg === 'pbkdf2-sha512' ? 'SHA-512' : 'SHA-256'
  const actual = await derivePbkdf2(password, salt, iterations, digest)
  if (actual.length !== expected.length) {
    return { valid: false, message: lt('摘要长度不匹配', 'Digest length mismatch') }
  }
  let diff = 0
  for (let i = 0; i < actual.length; i += 1) {
    diff |= actual[i] ^ expected[i]
  }
  return diff === 0
    ? { valid: true, message: lt('校验通过：明文与密码哈希匹配', 'Verified: password matches hash') }
    : { valid: false, message: lt('校验未通过：明文与密码哈希不匹配', 'Mismatch: password does not match hash') }
}
