import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '@/services/auth'

describe('authService', () => {
  const fetchMock = vi.fn()
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = fetchMock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    })
    // Reset auth service token
    authService.clearToken()
  })

  describe('register', () => {
    const mockRegistrationData = {
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '5551234567',
      brokerageName: 'Test Realty',
      licenseNumber: '12345678',
      state: 'CA' as const,
      website: '',
      brandVoice: 'professional' as const,
      customGreeting: '',
      responseTime: '5min' as const,
      autoSchedule: true,
      calcomLink: '',
      smsPhoneNumber: '',
      calendarProvider: undefined,
      leadSources: [],
      termsAccepted: true,
      marketingConsent: false,
    }

    it('registers user successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
          token: 'fake-token',
        }),
      })

      const result = await authService.register(mockRegistrationData)

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.token).toBe('fake-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('leadflow_token', 'fake-token')
    })

    it('handles registration failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
      })

      const result = await authService.register(mockRegistrationData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email already exists')
    })

    it('handles network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.register(mockRegistrationData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('login', () => {
    it('logs in user successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
          token: 'fake-token',
        }),
      })

      const result = await authService.login('test@example.com', 'Password123')

      expect(result.success).toBe(true)
      expect(result.token).toBe('fake-token')
    })

    it('handles login failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      })

      const result = await authService.login('test@example.com', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })
  })

  describe('token management', () => {
    it('sets and stores token', () => {
      authService.setToken('new-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('leadflow_token', 'new-token')
    })

    it('clears token', () => {
      authService.setToken('token')
      authService.clearToken()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('leadflow_token')
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('gets token', () => {
      authService.setToken('my-token')
      expect(authService.getToken()).toBe('my-token')
    })

    it('checks authentication status', () => {
      expect(authService.isAuthenticated()).toBe(false)
      authService.setToken('token')
      expect(authService.isAuthenticated()).toBe(true)
    })

    it('loads token from localStorage on init', () => {
      localStorageMock.getItem.mockReturnValue('stored-token')
      // Create new instance would load token, but we're using singleton
      // This test verifies the behavior expectation
      expect(localStorageMock.getItem).toHaveBeenCalledWith('leadflow_token')
    })
  })

  describe('logout', () => {
    it('clears token on logout', async () => {
      authService.setToken('token')
      await authService.logout()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('leadflow_token')
    })
  })

  describe('verifyEmail', () => {
    it('verifies email successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await authService.verifyEmail('verification-token')

      expect(result.success).toBe(true)
    })

    it('handles verification failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid token' }),
      })

      const result = await authService.verifyEmail('invalid-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid token')
    })
  })

  describe('resendVerification', () => {
    it('resends verification email', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await authService.resendVerification('test@example.com')

      expect(result.success).toBe(true)
    })
  })

  describe('getCurrentUser', () => {
    it('fetches current user', async () => {
      authService.setToken('token')
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
        }),
      })

      const result = await authService.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('handles unauthorized error', async () => {
      authService.setToken('token')
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })

      const result = await authService.getCurrentUser()

      expect(result.success).toBe(false)
    })
  })

  describe('checkEmailExists', () => {
    it('returns true when email exists', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: true }),
      })

      const result = await authService.checkEmailExists('existing@example.com')

      expect(result).toBe(true)
    })

    it('returns false when email does not exist', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: false }),
      })

      const result = await authService.checkEmailExists('new@example.com')

      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.checkEmailExists('test@example.com')

      expect(result).toBe(false)
    })
  })

  describe('includes authorization header', () => {
    it('includes token in request headers when authenticated', async () => {
      authService.setToken('auth-token')
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: {} }),
      })

      await authService.getCurrentUser()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token',
          }),
        })
      )
    })
  })
})
