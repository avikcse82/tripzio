import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Tripzio Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg,#e8f8f5 0%,#f0f9ff 40%,#f8fafc 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, sans-serif', padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', padding: '48px',
            maxWidth: '480px', width: '100%', textAlign: 'center',
            boxShadow: '0 4px 32px rgba(0,0,0,0.08)'
          }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🗺️</div>
            <h2 style={{
              fontSize: '22px', fontWeight: '800', color: '#0f172a',
              marginBottom: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, marginBottom: '28px' }}>
              We hit an unexpected error. Don't worry — your data is safe.
              Try refreshing the page or go back to the dashboard.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}>
                🔄 Refresh Page
              </button>
              <button
                onClick={() => { window.location.href = '/dashboard' }}
                style={{
                  padding: '12px 24px', background: 'white',
                  color: '#0d9488', border: '2px solid #0d9488', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}>
                🏠 Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
