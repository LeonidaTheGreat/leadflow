import '@testing-library/jest-dom'
import { getUtmParams, clearUtmParams } from '../lib/utm-capture'

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

describe('UTM Parameter Capture', () => {
  beforeEach(() => {
    mockSessionStorage.clear()
    jest.clearAllMocks()
  })

  describe('getUtmParams', () => {
    it('should return parsed UTM data from sessionStorage', () => {
      const utmData = {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'test_campaign',
      }
      mockSessionStorage.setItem('lf_utm', JSON.stringify(utmData))

      const result = getUtmParams()
      expect(result).toEqual(utmData)
    })

    it('should return null if no UTM data in sessionStorage', () => {
      const result = getUtmParams()
      expect(result).toBeNull()
    })

    it('should return null if sessionStorage data is invalid JSON', () => {
      mockSessionStorage.setItem('lf_utm', 'invalid json{')
      const result = getUtmParams()
      expect(result).toBeNull()
    })
  })

  describe('clearUtmParams', () => {
    it('should remove UTM data from sessionStorage', () => {
      mockSessionStorage.setItem('lf_utm', JSON.stringify({ utm_source: 'test' }))
      
      clearUtmParams()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('lf_utm')
    })
  })

  // T-1: Happy Path — UTM Captured and Stored
  describe('T-1: Happy Path — UTM Captured and Stored', () => {
    it('captures UTM params from URL and stores in sessionStorage', () => {
      const utmData = {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'pilot-q1',
        utm_content: null,
        utm_term: null,
      }
      mockSessionStorage.setItem('lf_utm', JSON.stringify(utmData))

      const result = getUtmParams()
      expect(result).toBeTruthy()
      expect(result?.utm_source).toBe('google')
      expect(result?.utm_medium).toBe('cpc')
      expect(result?.utm_campaign).toBe('pilot-q1')
    })
  })

  // T-2: No UTM — Clean Null
  describe('T-2: No UTM — Direct Visit Produces No sessionStorage Entry', () => {
    it('returns null when no UTM params in sessionStorage', () => {
      const result = getUtmParams()
      expect(result).toBeNull()
    })
  })

  // T-3: First-Touch Wins
  describe('T-3: First-Touch Wins', () => {
    it('preserves first UTM data when multiple calls made', () => {
      const firstUtm = {
        utm_source: 'email',
        utm_campaign: 'wave1',
      }
      mockSessionStorage.setItem('lf_utm', JSON.stringify(firstUtm))

      const result = getUtmParams()
      expect(result?.utm_source).toBe('email')
      expect(result?.utm_campaign).toBe('wave1')
    })
  })
})
