'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log to console for debugging
  console.error('[GlobalError]', error)

  return (
    <html>
      <body style={{ fontFamily: 'system-ui', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#dc2626' }}>Something went wrong</h1>
        <pre style={{ 
          background: '#fef2f2', 
          padding: '16px', 
          borderRadius: '8px', 
          overflow: 'auto',
          fontSize: '13px',
          whiteSpace: 'pre-wrap'
        }}>
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button
          onClick={reset}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
