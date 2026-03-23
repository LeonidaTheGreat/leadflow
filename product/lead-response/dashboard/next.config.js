/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip collecting page data for API routes during build
  // This prevents module-level code evaluation that depends on runtime env vars
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
}

module.exports = nextConfig
