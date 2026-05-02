'use strict'

const { ApiKeyAuthService } = require('../../lib/services/api-key-auth-service')

describe('ApiKeyAuthService', () => {
  test('returns true for matching keys after trimming', () => {
    const result = ApiKeyAuthService.isAuthorized({
      expected: 'secret-key',
      provided: ' secret-key '
    })

    expect(result).toBe(true)
  })

  test('returns false for mismatched keys', () => {
    const result = ApiKeyAuthService.isAuthorized({
      expected: 'secret-key',
      provided: 'wrong-key'
    })

    expect(result).toBe(false)
  })

  test('returns false when expected key is missing', () => {
    const result = ApiKeyAuthService.isAuthorized({
      expected: '',
      provided: 'secret-key'
    })

    expect(result).toBe(false)
  })
})
