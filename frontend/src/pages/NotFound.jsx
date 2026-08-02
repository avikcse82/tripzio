import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function NotFound() {
  const navigate = useNavigate()

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
        .nav-btn:hover { transform: translateY(-3px); }
      `}</style>

      <Navbar />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)', padding: '24px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.8)', borderRadius: '28px',
          padding: '56px 48px', maxWidth: '520px', width: '100%',
          textAlign: 'center', boxShadow: '0 8px 30px rgba(15,23,42,0.08)',
          animation: 'fadeUp 0.4s ease'
        }}>

          <div style={{ position: 'relative', width: '190px', height: '150px', margin: '0 auto 8px' }}>
            <svg viewBox="0 0 220 170" width="190" height="150" xmlns="http://www.w3.org/2000/svg">
              <style>{`
                .nf-dash { stroke-dasharray: 6 7; animation: nfDash 3.5s linear infinite; }
                @keyframes nfDash { to { stroke-dashoffset: -52; } }
                .nf-pin { animation: nfFloat 3s ease-in-out infinite; transform-origin: 110px 60px; }
                @keyframes nfFloat { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
              `}</style>
              {/* Dotted route, breaking off before reaching the pin */}
              <path className="nf-dash" d="M 18 130 Q 55 95, 85 108 T 140 90" fill="none" stroke="#0D9488" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
              <circle cx="18" cy="130" r="5" fill="#0D9488" />
              <circle cx="85" cy="108" r="4" fill="#0D9488" opacity="0.7" />
              {/* The "break" */}
              <g opacity="0.9">
                <line x1="146" y1="86" x2="156" y2="96" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="156" y1="86" x2="146" y2="96" stroke="#F97316" strokeWidth="3.5" strokeLinecap="round" />
              </g>
              {/* Broken map pin, teal + saffron crack */}
              <g className="nf-pin">
                <path d="M110 30 C 130 30, 144 44, 144 62 C 144 84, 116 108, 110 112 C 104 108, 76 84, 76 62 C 76 44, 90 30, 110 30 Z" fill="#0D9488" />
                <circle cx="110" cy="60" r="15" fill="#FAFAF8" />
                <path d="M100 46 L112 62 L102 70 L118 88" fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              {/* Small compass accent */}
              <g transform="translate(168,120) rotate(12)">
                <circle cx="0" cy="0" r="16" fill="white" stroke="#FDE68A" strokeWidth="2" />
                <path d="M0 -9 L4 0 L0 9 L-4 0 Z" fill="#F59E0B" />
              </g>
              <circle cx="40" cy="60" r="2.5" fill="#FDE68A" />
              <circle cx="190" cy="55" r="2" fill="#99F6E4" />
              <circle cx="60" cy="150" r="2" fill="#FDE68A" />
            </svg>
          </div>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '20px',
            padding: '5px 14px', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: '700', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#B45309', marginBottom: '14px'
          }}>
            404 · Off the map
          </span>

          <h1 style={{
            fontSize: '24px', fontWeight: '700', color: '#0F172A',
            marginBottom: '12px', margin: '14px 0 12px',
            fontFamily: "'Playfair Display', Georgia, serif"
          }}>
            Looks like this route doesn't exist
          </h1>

          <p style={{
            fontSize: '15px', color: '#64748b', lineHeight: 1.7,
            marginBottom: '32px', margin: '0 0 32px'
          }}>
            The page you're after took a detour somewhere.
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
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, color 0.2s ease'
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
                background: 'linear-gradient(135deg,#F97316,#F59E0B)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 22px rgba(249,115,22,0.32)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease'
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
