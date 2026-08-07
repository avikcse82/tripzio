// frontend/src/components/Footer.jsx
// Tripzio — Legal Footer
// Add to LandingPage, ItineraryResult, and all public pages

import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()
  const year = new Date().getFullYear()

  return (
    <div style={{
      background: '#FAFAF8',
      borderTop: '1px solid #E7E3D8',
      padding: '32px 24px',
      marginTop: '48px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* AI Disclaimer — always visible */}
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
        }}>
          <p style={{ fontSize: '11px', color: '#7F1D1D', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: '#DC2626' }}>⚠️ AI Disclaimer:</strong> All itineraries, hotel suggestions, and cost estimates are AI-generated and for planning purposes only. Always verify hotel availability, prices, and details independently before booking. Tripzio is not liable for inaccuracies in AI-generated content.
          </p>
        </div>

        {/* Affiliate Disclosure */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: '#64748B' }}>Affiliate Disclosure:</strong> Tripzio may earn commissions when you book through partner links (Booking.com, Agoda, TripAdvisor) at no extra cost to you.
          </p>
        </div>

        {/* Popular destination guides — real <a> tags (not client-side
            navigate()) so search engines can actually crawl/discover these
            SEO pages, which are served by a Vercel edge rewrite, not React Router */}
        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E7E3D8' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
            Popular Trip Planners
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {[
              ['goa', 'Goa'], ['manali', 'Manali'], ['kerala', 'Kerala'],
              ['rajasthan', 'Rajasthan'], ['ladakh', 'Ladakh'], ['darjeeling', 'Darjeeling'],
              ['andaman', 'Andaman'], ['varanasi', 'Varanasi'], ['shimla', 'Shimla'], ['char-dham', 'Char Dham'],
            ].map(([slug, label]) => (
              <a key={slug} href={`/${slug}-trip-planner`}
                style={{ fontSize: '12px', color: '#64748B', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0d9488'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
              >
                {label} Trip Planner
              </a>
            ))}
          </div>
        </div>

        {/* Links + Copyright */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '20px', borderTop: '1px solid #E7E3D8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px' }}>🗺️</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>Tripzio</span>
            <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '4px' }}>India's AI Travel Planner</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              { label: 'Privacy Policy', path: '/privacy' },
              { label: 'Terms of Service', path: '/terms' },
              { label: 'Disclaimer', path: '/disclaimer' },
            ].map(link => (
              <button key={link.path}
                onClick={() => navigate(link.path)}
                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0d9488'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
              >
                {link.label}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
            © {year} Tripzio. India only. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
