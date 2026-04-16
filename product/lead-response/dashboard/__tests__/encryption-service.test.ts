/**
 * Unit tests for the encryption service.
 *
 * Tests AES-256-GCM encrypt/decrypt, edge cases, and backward-compatible
 * plaintext passthrough.
 */

describe('encryption-service', () => {
  const VALID_KEY = 'a'.repeat(64) // 64 hex chars = 32 bytes

  beforeEach(() => {
    jest.resetModules()
  })

  function loadService(envKey?: string) {
    if (envKey !== undefined) {
      process.env.ENCRYPTION_KEY = envKey
    } else {
      delete process.env.ENCRYPTION_KEY
    }
    // Disable production check so tests don't throw on missing key
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const svc = require('../lib/services/encryption-service')
    process.env.NODE_ENV = origEnv
    return svc
  }

  describe('encrypt', () => {
    it('returns null for null input', () => {
      const { encrypt } = loadService(VALID_KEY)
      expect(encrypt(null)).toBeNull()
    })

    it('returns null for empty string', () => {
      const { encrypt } = loadService(VALID_KEY)
      expect(encrypt('')).toBeNull()
    })

    it('returns null for undefined', () => {
      const { encrypt } = loadService(VALID_KEY)
      expect(encrypt(undefined)).toBeNull()
    })

    it('returns a colon-delimited hex string with 3 parts', () => {
      const { encrypt } = loadService(VALID_KEY)
      const result = encrypt('my-fub-api-key-value-here')
      expect(result).not.toBeNull()
      const parts = result!.split(':')
      expect(parts).toHaveLength(3)
    })

    it('produces different ciphertext each call (random IV)', () => {
      const { encrypt } = loadService(VALID_KEY)
      const a = encrypt('same-key')
      const b = encrypt('same-key')
      expect(a).not.toEqual(b)
    })

    it('produces hex-only parts (no invalid characters)', () => {
      const { encrypt } = loadService(VALID_KEY)
      const result = encrypt('test-api-key-12345678')!
      const [iv, tag, ciphertext] = result.split(':')
      expect(iv).toMatch(/^[0-9a-f]+$/i)
      expect(tag).toMatch(/^[0-9a-f]+$/i)
      expect(ciphertext).toMatch(/^[0-9a-f]+$/i)
    })
  })

  describe('decrypt', () => {
    it('returns null for null input', () => {
      const { decrypt } = loadService(VALID_KEY)
      expect(decrypt(null)).toBeNull()
    })

    it('returns null for empty string', () => {
      const { decrypt } = loadService(VALID_KEY)
      expect(decrypt('')).toBeNull()
    })

    it('round-trips short strings', () => {
      const { encrypt, decrypt } = loadService(VALID_KEY)
      const plaintext = 'my-fub-api-key-abc123'
      expect(decrypt(encrypt(plaintext))).toBe(plaintext)
    })

    it('round-trips long strings', () => {
      const { encrypt, decrypt } = loadService(VALID_KEY)
      const plaintext = 'x'.repeat(200)
      expect(decrypt(encrypt(plaintext))).toBe(plaintext)
    })

    it('round-trips strings with special characters', () => {
      const { encrypt, decrypt } = loadService(VALID_KEY)
      const plaintext = 'FUB_key!@#$%^&*()_+-=[]{}|;\':",./<>?'
      expect(decrypt(encrypt(plaintext))).toBe(plaintext)
    })

    it('returns plaintext passthrough for non-encrypted format (backward compatibility)', () => {
      const { decrypt } = loadService(VALID_KEY)
      const oldPlaintext = 'fub_api_key_stored_before_encryption'
      expect(decrypt(oldPlaintext)).toBe(oldPlaintext)
    })

    it('returns plaintext passthrough for values without colons', () => {
      const { decrypt } = loadService(VALID_KEY)
      expect(decrypt('noColonsHere')).toBe('noColonsHere')
    })

    it('returns null on decryption failure (wrong key)', () => {
      const { encrypt } = loadService(VALID_KEY)
      const encrypted = encrypt('sensitive-value')

      // Load with different key
      const differentKey = 'b'.repeat(64)
      const { decrypt } = loadService(differentKey)
      expect(decrypt(encrypted)).toBeNull()
    })
  })

  describe('isEncrypted', () => {
    it('returns false for null', () => {
      const { isEncrypted } = loadService(VALID_KEY)
      expect(isEncrypted(null)).toBe(false)
    })

    it('returns false for empty string', () => {
      const { isEncrypted } = loadService(VALID_KEY)
      expect(isEncrypted('')).toBe(false)
    })

    it('returns false for plaintext (no colons)', () => {
      const { isEncrypted } = loadService(VALID_KEY)
      expect(isEncrypted('plaintext-api-key')).toBe(false)
    })

    it('returns true for encrypted output from encrypt()', () => {
      const { encrypt, isEncrypted } = loadService(VALID_KEY)
      const encrypted = encrypt('my-key')
      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('returns false for mask placeholder', () => {
      const { isEncrypted } = loadService(VALID_KEY)
      expect(isEncrypted('••••••••')).toBe(false)
    })
  })

  describe('dev fallback (no ENCRYPTION_KEY set)', () => {
    it('still encrypts and decrypts consistently using the dev fallback key', () => {
      // Temporarily force non-production so dev fallback is used
      const origNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      delete process.env.ENCRYPTION_KEY

      jest.resetModules()
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { encrypt, decrypt } = require('../lib/services/encryption-service')
      const plaintext = 'dev-roundtrip-test'
      expect(decrypt(encrypt(plaintext))).toBe(plaintext)

      process.env.NODE_ENV = origNodeEnv
    })
  })
})
