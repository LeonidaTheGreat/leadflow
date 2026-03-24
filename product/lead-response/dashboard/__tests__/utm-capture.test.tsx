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
      mockSessionStorage.setItem('leadflow_utm', JSON.stringify(utmData))

      const result = getUtmParams()
      expect(result).toEqual(utmData)
    })

    it('should return null if no UTM data in sessionStorage', () => {
      const result = getUtmParams()
      expect(result).toBeNull()
    })

    it('should return null if sessionStorage data is invalid JSON', () => {
      mockSessionStorage.setItem('leadflow_utm', 'invalid json{')
      const result = getUtmParams()
      expect(result).toBeNull()
    })
  })

  describe('clearUtmParams', () => {
    it('should remove UTM data from sessionStorage', () => {
      mockSessionStorage.setItem('leadflow_utm', JSON.stringify({ utm_source: 'test' }))
      
      clearUtmParams()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('leadflow_utm')
    })
  })
})
