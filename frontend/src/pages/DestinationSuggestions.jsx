import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { API_URL } from '../api'
import {
  MapPin, Clock, ArrowLeft, ArrowRight,
  Thermometer, RefreshCw, Zap, Star,
  TrendingUp, CheckCircle, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

const budgetFitConfig = {
  'perfect': { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: '✓ Perfect fit' },
  'comfortable': { color: '#0284c7', bg: '#eff6ff', border: '#7dd3fc', label: '✓ Comfortable' },
  'slight stretch': { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: '~ Slight stretch' },
}

const seasonRatingConfig = {
  'excellent': { color: '#16a34a', bg: '#f0fdf4', label: '🌟 Excellent season' },
  'good': { color: '#0284c7', bg: '#eff6ff', label: '✓ Good season' },
  'avoid': { color: '#ef4444', bg: '#fef2f2', label: '⚠ Not ideal season' },
}

const typeColors = {
  'Hill Station': { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  'Beach': { bg: '#eff6ff', color: '#0284c7', border: '#bae6fd' },
  'Heritage': { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  'Nature': { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  'Adventure': { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' },
  'Island': { bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' },
  'Default': { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
}

const getTypeStyle = (type) => {
  for (const key of Object.keys(typeColors)) {
    if (type?.includes(key)) return typeColors[key]
  }
  return typeColors.Default
}

export default function DestinationSuggestions() {
  const location = useLocation()
  const navigate = useNavigate()
  const { suggestions, tripParams } = location.state || {}
  const [generating, setGenerating] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [currentSuggestions, setCurrentSuggestions] = useState(suggestions)

  if (!currentSuggestions || !tripParams) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>No suggestions found</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>Go back and generate trip suggestions first</p>
          <button onClick={() => navigate('/dashboard')}
            style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#F97316,#F59E0B)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 22px rgba(249,115,22,0.32)', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const handleSelectDestination = async (destination) => {
    setGenerating(destination.name)
    try {
      const token = localStorage.getItem('tripzio_token')
      const response = await fetch(`${API_URL}/itinerary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...tripParams,
          destination: destination.name,
          destination_mode: 'specific'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Generation failed')
      }

      const itinerary = await response.json()
      toast.success(`Generating your ${destination.name} trip!`)
      navigate('/itinerary/result', { state: { itinerary } })
    } catch (err) {
      toast.error(err.message || 'Failed to generate itinerary')
      setGenerating(null)
    }
  }

  // `overrides` lets the all-avoid banner below re-ask without the vibe
  // filter; with no argument this is the plain "show different options"
  // refresh it has always been.
  const handleRefresh = async (overrides = null) => {
    setRefreshing(true)
    try {
      const token = localStorage.getItem('tripzio_token')
      const response = await fetch(`${API_URL}/itinerary/suggest-destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(overrides ? { ...tripParams, ...overrides } : tripParams)
      })

      if (!response.ok) throw new Error('Failed to refresh')
      const data = await response.json()
      setCurrentSuggestions(data.suggestions)
      toast.success('Fresh suggestions loaded!')
    } catch (err) {
      toast.error('Failed to refresh suggestions')
    } finally {
      setRefreshing(false)
    }
  }

  const season = currentSuggestions?.[0]?.weather_preview?.season || 'Current season'

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
    <div style={{ minHeight: '100vh', background: 'transparent', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dest-card { transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease; }
        .dest-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 48px rgba(15,23,42,0.12) !important; }
        .select-btn { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; }
        .select-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(249,115,22,0.4) !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .loading-card {
          background: linear-gradient(90deg, #f0fdfa 25%, #e6faf8 50%, #f0fdfa 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <Navbar />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Back */}
        <button onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginBottom: '28px', padding: 0 }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: '36px', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' }}>
            <div style={{ width: '6px', height: '6px', background: '#F97316', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '11px', color: '#B45309', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>AI Suggestions</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: '700', color: '#0F172A', marginBottom: '10px', fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.5px', lineHeight: 1.15 }}>
            Where should you go? ✨
          </h1>
          <p style={{ fontSize: '16px', color: '#64748b', lineHeight: 1.6, maxWidth: '520px' }}>
            Our AI picked these 4 destinations based on your budget, season and trip type. Pick the one that excites you most.
          </p>
        </div>

        {/* ── TRIP SUMMARY PILL ── */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {[
            { icon: <MapPin size={13} />, label: `From ${tripParams.from_city}` },
            { icon: <Clock size={13} />, label: `${tripParams.days} days` },
            { icon: <TrendingUp size={13} />, label: `₹${tripParams.budget?.toLocaleString('en-IN')}` },
            { icon: <Star size={13} />, label: tripParams.trip_type || 'Any type' },
            { icon: <Zap size={13} />, label: `${tripParams.plan_tier?.toUpperCase()} plan` },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <span style={{ color: '#0d9488' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}

          {/* Refresh button */}
          <button
            // Wrapped, not passed directly: handleRefresh now takes an
            // overrides object, and React would hand it the click event.
            onClick={() => handleRefresh()}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: refreshing ? '#f8fafc' : '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '700', color: '#0d9488', cursor: refreshing ? 'not-allowed' : 'pointer', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease' }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Show different options'}
          </button>
        </div>

        {/* Asking for beaches in July is an honest dead end: the model rates
            every option "avoid" and the page becomes a wall of red badges
            with no way forward. Only fires when a vibe was actually chosen —
            without one, all-avoid means the dates themselves are difficult,
            which is different advice and not something dropping a filter
            fixes. */}
        {(() => {
          const vibeUsed = tripParams?.vibe
          const list = currentSuggestions || []
          const allAvoid = list.length > 0 && list.every(d => d.season_rating === 'avoid')
          if (!vibeUsed || !allAvoid) return null
          const vibeLabel = vibeUsed === 'Hill Station' ? 'Mountain' : vibeUsed
          return (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>🌧️</span>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e', marginBottom: '3px' }}>
                  {vibeLabel} trips are a tough call in {season}
                </div>
                <div style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
                  Every option below is rated “avoid” for your dates — they’re still here if you want them, but a different kind of trip would suit this season far better.
                </div>
              </div>
              <button
                onClick={() => handleRefresh({ vibe: null })}
                disabled={refreshing}
                style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#f59e0b', color: 'white', fontSize: '13px', fontWeight: '700', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.7 : 1, fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                {refreshing ? 'Finding…' : `Show what suits ${season}`}
              </button>
            </div>
          )
        })()}

        {/* ── DESTINATION CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(480px,1fr))', gap: '20px', marginBottom: '40px' }}>
          {currentSuggestions?.map((dest, i) => {
            const typeStyle = getTypeStyle(dest.type)
            const budgetFit = budgetFitConfig[dest.budget_fit] || budgetFitConfig['comfortable']
            const seasonRating = seasonRatingConfig[dest.season_rating] || seasonRatingConfig['good']
            const isGenerating = generating === dest.name

            return (
              <div key={i}
                className="dest-card"
                style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', animation: `fadeUp ${0.3 + i * 0.1}s ease`, position: 'relative' }}>

                {/* Card Top — colored accent bar */}
                <div style={{ height: '5px', background: `linear-gradient(135deg,#F97316,#F59E0B)` }} />

                <div style={{ padding: '24px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '28px' }}>{dest.emoji}</span>
                        <div>
                          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px' }}>
                            {dest.name}
                          </h2>
                          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: '500' }}>{dest.region}</p>
                        </div>
                      </div>
                    </div>
                    <span style={{ padding: '5px 12px', background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`, borderRadius: '20px', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {dest.type}
                    </span>
                  </div>

                  {/* Why this destination */}
                  <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', color: '#0d9488', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Why this trip?</div>
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: 0, fontWeight: '500' }}>{dest.why}</p>
                  </div>

                  {/* Highlight */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '18px', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px' }}>
                    <Star size={14} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', lineHeight: 1.5 }}>
                      Must do: {dest.highlight}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '18px' }}>
                    {/* Budget */}
                    <div style={{ padding: '12px', background: budgetFit.bg, border: `1px solid ${budgetFit.border}`, borderRadius: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Budget</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: budgetFit.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{dest.estimated_budget}</div>
                      <div style={{ fontSize: '11px', color: budgetFit.color, fontWeight: '700', marginTop: '2px' }}>{budgetFit.label}</div>
                    </div>

                    {/* Travel time */}
                    <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Travel time</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{dest.travel_time}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>from {tripParams.from_city}</div>
                    </div>

                    {/* Season */}
                    <div style={{ padding: '12px', background: seasonRating.bg, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Season now</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: seasonRating.color }}>{seasonRating.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>{dest.season_note}</div>
                    </div>

                    {/* Weather preview */}
                    {dest.weather_preview && (
                      <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                          <Thermometer size={10} style={{ display: 'inline', marginRight: '2px' }} />
                          Weather now
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{dest.weather_preview.temp}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{dest.weather_preview.condition}</div>
                      </div>
                    )}
                  </div>

                  {/* Select Button */}
                  <button
                    className="select-btn"
                    onClick={() => handleSelectDestination(dest)}
                    disabled={generating !== null}
                    style={{
                      width: '100%', padding: '15px',
                      background: isGenerating
                        ? '#e2e8f0'
                        : generating !== null
                        ? '#f8fafc'
                        : 'linear-gradient(135deg,#F97316,#F59E0B)',
                      color: isGenerating ? '#94a3b8' : generating !== null ? '#94a3b8' : 'white',
                      border: 'none', borderRadius: '14px',
                      fontSize: '15px', fontWeight: '800',
                      cursor: generating !== null ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '9px',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      boxShadow: !generating ? '0 8px 22px rgba(249,115,22,0.32)' : 'none',
                      letterSpacing: '-0.2px'
                    }}>
                    {isGenerating ? (
                      <>
                        <div style={{ width: '17px', height: '17px', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#64748b', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        Building your {dest.name} itinerary...
                      </>
                    ) : (
                      <>
                        <Zap size={17} fill="currentColor" />
                        Plan my trip to {dest.name}
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── MANUAL OPTION ── */}
        <div style={{ background: 'white', border: '1.5px dashed #cbd5e1', borderRadius: '20px', padding: '28px', textAlign: 'center', animation: 'fadeUp 0.7s ease' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Have a specific destination in mind?
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            Go back to the planner, switch to Detailed mode and type any destination
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '11px 28px', background: 'none', border: '2px solid #0d9488', color: '#0d9488', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, color 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0d9488'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#0d9488' }}>
            Back to Planner
          </button>
        </div>
      </div>
    </div>
  )
}
