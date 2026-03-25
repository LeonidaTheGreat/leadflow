import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_API_KEY = 'test-api-key'
process.env.API_SECRET_KEY = 'test-secret-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.RESEND_API_KEY = 'test-resend-key'

// Mock fetch globally
global.fetch = jest.fn()
