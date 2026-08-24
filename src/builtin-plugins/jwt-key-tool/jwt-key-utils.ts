export type JwtKeyAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256'

export type HmacSecretEncoding = {
  hex: string
  base64: string
  base64url: string
}

export type AsymmetricKeyMaterial = {
  privatePem: string
  publicPem: string
  privateJwk: string
  publicJwk: string
}

export const HMAC_BYTE_LENGTH: Record<'HS256' | 'HS384' | 'HS512', number> = {
  HS256: 32,
  HS384: 48,
  HS512: 64,
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function toPem(bytes: Uint8Array, label: 'PRIVATE KEY' | 'PUBLIC KEY') {
  const body = bytesToBase64(bytes).match(/.{1,64}/g)?.join('\n') ?? bytesToBase64(bytes)
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`
}

export function generateHmacSecret(byteLength: number): HmacSecretEncoding {
  const safeLength = Math.min(Math.max(Math.floor(byteLength), 16), 128)
  const bytes = crypto.getRandomValues(new Uint8Array(safeLength))
  const base64 = bytesToBase64(bytes)

  return {
    hex: bytesToHex(bytes),
    base64,
    base64url: base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
  }
}

export async function generateRsaKeyPair(modulusLength: 2048 | 4096): Promise<AsymmetricKeyMaterial> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )

  return exportAsymmetricKey(keyPair)
}

export async function generateEcdsaKeyPair(): Promise<AsymmetricKeyMaterial> {
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  return exportAsymmetricKey(keyPair)
}

async function exportAsymmetricKey(keyPair: CryptoKeyPair): Promise<AsymmetricKeyMaterial> {
  const [privatePkcs8, publicSpki, privateJwk, publicJwk] = await Promise.all([
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('jwk', keyPair.privateKey),
    crypto.subtle.exportKey('jwk', keyPair.publicKey),
  ])

  return {
    privatePem: toPem(new Uint8Array(privatePkcs8), 'PRIVATE KEY'),
    publicPem: toPem(new Uint8Array(publicSpki), 'PUBLIC KEY'),
    privateJwk: JSON.stringify(privateJwk, null, 2),
    publicJwk: JSON.stringify(publicJwk, null, 2),
  }
}
