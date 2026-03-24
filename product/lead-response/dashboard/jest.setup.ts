import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_API_KEY = 'test-api-key'
process.env.API_SECRET_KEY = 'test-secret-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

// Mock fetch globally
global.fetch = jest.fn()
