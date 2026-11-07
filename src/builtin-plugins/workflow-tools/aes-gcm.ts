export type AesMode = 'encrypt' | 'decrypt'

export function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

export function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

export function bytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

export async function deriveAesKey(password: string, salt: Uint8Array) {
  const encoder = new TextEncoder()
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: bytesToArrayBuffer(salt), iterations: 100_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptAesGcm(plainText: string, password: string) {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveAesKey(password, salt)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bytesToArrayBuffer(iv) }, key, encoder.encode(plainText))
  return JSON.stringify(
    {
      algorithm: 'AES-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 100_000,
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    },
    null,
    2,
  )
}

export async function decryptAesGcm(packageText: string, password: string) {
  const decoder = new TextDecoder()
  const parsed = JSON.parse(packageText) as { iv: string; salt: string; ciphertext: string }
  const key = await deriveAesKey(password, base64ToBytes(parsed.salt))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytesToArrayBuffer(base64ToBytes(parsed.iv)) },
    key,
    bytesToArrayBuffer(base64ToBytes(parsed.ciphertext)),
  )
  return decoder.decode(decrypted)
}
