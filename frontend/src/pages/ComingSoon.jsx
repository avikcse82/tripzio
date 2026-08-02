import { useState, useEffect } from 'react'
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

  const BG_PHOTOS = [
    'https://images.unsplash.com/photo-1587922546307-776227941871?w=1400&q=65', // Goa
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=65', // Kerala
    'https://images.unsplash.com/photo-1524229648276-e66561fe45a9?w=1400&q=65', // Rajasthan
    'https://images.unsplash.com/photo-1586053226626-febc8817962f?w=1400&q=65', // Andaman
    'https://images.unsplash.com/photo-1658593345227-965f61fd6ba1?w=1400&q=65', // Darjeeling
    'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1400&q=65', // Varanasi
    'https://images.unsplash.com/photo-1650341259809-9314b0de9268?w=1400&q=65', // Rishikesh
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=65', // Ladakh
    'https://images.unsplash.com/photo-1574988050647-33c6773e5e9a?w=1400&q=65', // Manali
    'https://images.unsplash.com/photo-1597074866923-dc0589150358?w=1400&q=65', // Shimla
  ]
  const [bgIdx, setBgIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setBgIdx(p => (p + 1) % BG_PHOTOS.length), 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
    }}>
      {/* Full-page fixed rotating photo background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -2, overflow: 'hidden' }}>
        {BG_PHOTOS.map((photo, i) => (
          <img key={photo} src={photo} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: bgIdx === i ? 1 : 0, transition: 'opacity 2.2s ease',
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg,rgba(250,250,248,0.62) 0%,rgba(250,250,248,0.70) 100%), radial-gradient(circle at 15% 10%, rgba(13,148,136,0.08), transparent 40%), radial-gradient(circle at 88% 85%, rgba(249,115,22,0.06), transparent 40%)',
        }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
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
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.8)', borderRadius: '28px',
          padding: '48px 40px', maxWidth: '520px', width: '100%',
          textAlign: 'center', boxShadow: '0 8px 30px rgba(15,23,42,0.08)',
          animation: 'fadeUp 0.4s ease'
        }}>

          <div style={{ fontSize: '64px', marginBottom: '20px' }}>
            {config.emoji}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#FEF3C7', border: '1px solid #FDE68A',
            borderRadius: '20px', padding: '5px 14px', marginBottom: '16px'
          }}>
            <div style={{
              width: '6px', height: '6px', background: '#F97316',
              borderRadius: '50%', animation: 'blink 2s infinite'
            }} />
            <span style={{ fontSize: '12px', color: '#B45309', fontWeight: '700' }}>
              {config.module} — In Development
            </span>
          </div>

          <h1 style={{
            fontSize: '28px', fontWeight: '700', color: '#0F172A',
            marginBottom: '12px', fontFamily: "'Playfair Display', Georgia, serif",
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
              background: 'linear-gradient(135deg,#F97316,#F59E0B)',
              color: 'white', border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 8px 22px rgba(249,115,22,0.32)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
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
