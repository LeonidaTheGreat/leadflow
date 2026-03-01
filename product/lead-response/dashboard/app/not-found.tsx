export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <title>Page Not Found - LeadFlow AI</title>
      </head>
      <body style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: 'bold',
            color: '#10b981',
            marginBottom: '16px'
          }}>
            404
          </h1>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            Page Not Found
          </h2>
          <p style={{
            color: '#6b7280',
            marginBottom: '24px'
          }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Go Home
          </a>
        </div>
      </body>
    </html>
  )
}
