/**
 * Token hashing utilities for secure token storage and verification
 * Tokens are hashed before storage to prevent plaintext exposure
 */

import { createHash } from 'crypto'

/**
 * Hash a verification token using SHA-256
 * @param token The plaintext token to hash
 * @returns The hashed token
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Verify a plaintext token against a stored hash
 * @param token The plaintext token to verify
 * @param tokenHash The stored hash to compare against
 * @returns true if the token matches the hash, false otherwise
 */
export function verifyTokenHash(token: string, tokenHash: string): boolean {
  const hash = hashToken(token)
  return hash === tokenHash
}
