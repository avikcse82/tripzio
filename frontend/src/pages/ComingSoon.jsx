import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'

const PAGE_CONFIG = {
  '/my-trips': {
    emoji: '✈️',
    title: 'My Trips',
    desc: 'All your planned and saved itineraries in one place. Generate your first trip from the dashboard!',
    module: 'Module 3',
    cta: 'Plan a Trip →',
    link: '/dashboard'
  },
  '/explore': {
    emoji: '🧭',
    title: 'Explore',
    desc: 'Browse 500+ destinations across India by category, season, budget and trip type.',
    module: 'Module 4',
    cta: 'Go to Dashboard →',
    link: '/dashboard'
  },
  '/saved': {
    emoji: '❤️',
    title: 'Saved Trips',
    desc: 'Your favourite itineraries saved for later. Generate and save trips from the results page.',
    module: 'Module 3',
    cta: 'Plan a Trip →',
    link: '/dashboard'
  },
}

const DEFAULT_CONFIG = {
  emoji: '🚀',
  title: 'Coming Soon',
  desc: 'This feature is under active development. Check back soon!',
  module: 'Coming soon',
  cta: 'Go to Dashboard →',
  link: '/dashboard'
}

export default function ComingSoon() {
  const navigate = useNavigate()
  const location = useLocation()
  const config = PAGE_CONFIG[location.pathname] || DEFAULT_CONFIG

  const modules = [
    { label: 'Module 1 — Auth & Dashboard', done: true },
    { label: 'Module 2 — AI Itinerary Engine', done: true },
    { label: 'Module 3 — Trips & Payments', done: false },
    { label: 'Module 4 — Booking & Explore', done: false },
  ]

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
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <Navbar />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)', padding: '24px'
      }}>
        <div style={{
          background: 'white', borderRadius: '28px',
          padding: '48px 40px', maxWidth: '520px', width: '100%',
          textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
          animation: 'fadeUp 0.4s ease'
        }}>

          <div style={{ fontSize: '64px', marginBottom: '20px' }}>
            {config.emoji}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#f0fdfa', border: '1px solid #99f6e4',
            borderRadius: '20px', padding: '5px 14px', marginBottom: '16px'
          }}>
            <div style={{
              width: '6px', height: '6px', background: '#0d9488',
              borderRadius: '50%', animation: 'blink 2s infinite'
            }} />
            <span style={{ fontSize: '12px', color: '#0d9488', fontWeight: '700' }}>
              {config.module} — In Development
            </span>
          </div>

          <h1 style={{
            fontSize: '26px', fontWeight: '900', color: '#0f172a',
            marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif",
            margin: '0 0 12px'
          }}>
            {config.title} is coming
          </h1>

          <p style={{
            fontSize: '15px', color: '#64748b', lineHeight: 1.7,
            marginBottom: '28px', margin: '0 0 28px'
          }}>
            {config.desc}
          </p>

          {/* Build progress */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '16px', padding: '20px', marginBottom: '28px',
            textAlign: 'left'
          }}>
            <div style={{
              fontSize: '11px', color: '#94a3b8', fontWeight: '700',
              letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '14px'
            }}>
              BUILD PROGRESS
            </div>
            {modules.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: i < modules.length - 1 ? '10px' : '0'
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: item.done
                    ? 'linear-gradient(135deg,#0d9488,#0ea5e9)'
                    : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {item.done && (
                    <span style={{ color: 'white', fontSize: '10px', fontWeight: '800' }}>✓</span>
                  )}
                </div>
                <span style={{
                  fontSize: '13px', fontWeight: item.done ? '600' : '400',
                  color: item.done ? '#0f172a' : '#94a3b8'
                }}>
                  {item.label}
                </span>
                {item.done && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '10px', fontWeight: '700',
                    color: '#0d9488', background: '#f0fdfa', padding: '2px 8px',
                    borderRadius: '8px', whiteSpace: 'nowrap'
                  }}>
                    LIVE ✓
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate(config.link)}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg,#0d9488,#0ea5e9)',
              color: 'white', border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            {config.cta}
          </button>

          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '16px' }}>
            Have feedback?{' '}
            <a href="mailto:hello@tripzio.io"
              style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}>
              hello@tripzio.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
