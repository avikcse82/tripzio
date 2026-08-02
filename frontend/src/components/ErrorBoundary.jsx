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
          background: '#FAFAF8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, sans-serif', padding: '24px'
        }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
          <div style={{
            background: 'white', borderRadius: '24px', padding: '48px',
            maxWidth: '480px', width: '100%', textAlign: 'center',
            boxShadow: '0 8px 30px rgba(15,23,42,0.08)', border: '1px solid #E7E3D8',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>🗺️</div>
            <h2 style={{
              fontSize: '24px', fontWeight: '700', color: '#0F172A',
              marginBottom: '10px', fontFamily: "'Playfair Display', Georgia, serif"
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
                  padding: '12px 24px', background: 'linear-gradient(135deg,#F97316,#F59E0B)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', boxShadow: '0 8px 22px rgba(249,115,22,0.32)',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                🔄 Refresh Page
              </button>
              <button
                onClick={() => { window.location.href = '/dashboard' }}
                style={{
                  padding: '12px 24px', background: 'white',
                  color: '#0d9488', border: '2px solid #0d9488', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
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
