import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#e8f8f5 0%,#f0f9ff 40%,#f8fafc 100%)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .nav-btn:hover { transform: translateY(-1px); }
      `}</style>

      <Navbar />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)', padding: '24px'
      }}>
        <div style={{
          background: 'white', borderRadius: '28px',
          padding: '56px 48px', maxWidth: '520px', width: '100%',
          textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          animation: 'fadeUp 0.4s ease'
        }}>

          <div style={{ fontSize: '64px', marginBottom: '8px' }}>🗺️</div>

          <div style={{
            fontSize: '80px', fontWeight: '900',
            color: '#e2e8f0', lineHeight: 1,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: '16px'
          }}>
            404
          </div>

          <h1 style={{
            fontSize: '24px', fontWeight: '800', color: '#0f172a',
            marginBottom: '12px', margin: '0 0 12px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Page not found
          </h1>

          <p style={{
            fontSize: '15px', color: '#64748b', lineHeight: 1.7,
            marginBottom: '32px', margin: '0 0 32px'
          }}>
            Looks like you took a wrong turn on your trip!
            Let's get you back on track. 🧭
          </p>

          <div style={{
            display: 'flex', gap: '12px',
            justifyContent: 'center', flexWrap: 'wrap'
          }}>
            <button
              className="nav-btn"
              onClick={() => navigate(-1)}
              style={{
                padding: '12px 24px', background: 'white',
                color: '#64748b', border: '1.5px solid #e2e8f0',
                borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0d9488'
                e.currentTarget.style.color = '#0d9488'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.color = '#64748b'
              }}>
              ← Go Back
            </button>
            <button
              className="nav-btn"
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg,#0d9488,#0ea5e9)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
                transition: 'all 0.2s'
              }}>
              🏠 Go to Dashboard
            </button>
          </div>

          <div style={{
            marginTop: '28px', paddingTop: '20px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Need help?{' '}
              <a href="mailto:hello@tripzio.io"
                style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}>
                hello@tripzio.io
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
