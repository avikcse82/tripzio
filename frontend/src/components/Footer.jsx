// frontend/src/components/Footer.jsx
// Tripzio — Legal Footer
// Add to LandingPage, ItineraryResult, and all public pages

import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()
  const year = new Date().getFullYear()

  return (
    <div style={{
      background: '#0f172a',
      padding: '32px 24px',
      marginTop: '48px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* AI Disclaimer — always visible */}
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
        }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: '#fca5a5' }}>⚠️ AI Disclaimer:</strong> All itineraries, hotel suggestions, and cost estimates are AI-generated and for planning purposes only. Always verify hotel availability, prices, and details independently before booking. Tripzio is not liable for inaccuracies in AI-generated content.
          </p>
        </div>

        {/* Affiliate Disclosure */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Affiliate Disclosure:</strong> Tripzio may earn commissions when you book through partner links (Booking.com, Agoda, TripAdvisor) at no extra cost to you.
          </p>
        </div>

        {/* Links + Copyright */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px' }}>🗺️</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>Tripzio</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>India's AI Travel Planner</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              { label: 'Privacy Policy', path: '/privacy' },
              { label: 'Terms of Service', path: '/terms' },
              { label: 'Disclaimer', path: '/disclaimer' },
            ].map(link => (
              <button key={link.path}
                onClick={() => navigate(link.path)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0d9488'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                {link.label}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            © {year} Tripzio. India only. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
