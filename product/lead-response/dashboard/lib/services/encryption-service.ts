/**
 * Encryption service for sensitive data at rest.
 *
 * Uses AES-256-GCM (authenticated encryption) with a random 12-byte IV per
 * encryption. Ciphertext is stored as a colon-delimited hex string:
 *   "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * The ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes).
 * Generate with: openssl rand -hex 32
 *
 * IMPORTANT: If ENCRYPTION_KEY rotates, all previously-encrypted values
 * become unreadable. Store the key in Vercel project settings alongside
 * other production secrets.
 */
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12  // 96-bit IV — recommended for GCM
const KEY_HEX_LENGTH = 64 // 32 bytes = 64 hex chars

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY

  if (!raw || raw.length !== KEY_HEX_LENGTH) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[encryption-service] ENCRYPTION_KEY must be a 64-character hex string. ' +
        'Generate with: openssl rand -hex 32'
      )
    }
    // Dev fallback — logs a warning so it is visible in CI and local dev
    console.warn(
      '[encryption-service] WARNING: ENCRYPTION_KEY is not set or invalid. ' +
      'Using insecure dev fallback. Set ENCRYPTION_KEY in production.'
    )
    // Deterministic 32-byte dev key — never used in production
    return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')
  }

  return Buffer.from(raw, 'hex')
}

/**
 * Encrypts a plaintext string.
 * Returns a colon-delimited string: "<iv>:<authTag>:<ciphertext>" (all hex).
 * Returns null if plaintext is null/undefined/empty.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null

  const key = getKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

/**
 * Decrypts a value produced by encrypt().
 * Returns null if the input is null/undefined/empty.
 *
 * Graceful fallback: if the value does not look like an encrypted payload
 * (i.e. it is not in "<iv>:<authTag>:<ciphertext>" format), the function
 * returns the value as-is. This allows existing plaintext rows in the
 * database to be read without crashing — they will be re-encrypted on
 * the next write.
 */
export function decrypt(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null

  const parts = encrypted.split(':')

  // If the value does not look like our encrypted format, treat as plaintext
  // (backward-compatible with rows stored before encryption was added)
  if (parts.length !== 3) {
    return encrypted
  }

  const [ivHex, authTagHex, ciphertextHex] = parts

  // Validate hex lengths to avoid misleading errors on malformed data
  if (!ivHex || !authTagHex || !ciphertextHex) {
    return encrypted
  }

  try {
    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const ciphertext = Buffer.from(ciphertextHex, 'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plaintext.toString('utf8')
  } catch {
    // Decryption failed — could be a corrupt value or wrong key
    // Return null rather than crashing the request
    console.error('[encryption-service] Decryption failed for stored value')
    return null
  }
}

/**
 * Returns true if the value looks like an encrypted payload produced by
 * this service (i.e. "<iv_hex>:<authTag_hex>:<ciphertext_hex>").
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false
  return value.split(':').length === 3
}
