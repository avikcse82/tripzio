// frontend/src/pages/GuestDashboard.jsx
// Public guest plan generator — no login required.
// Quick mode only (From, Days, Budget, Trip Type).
// Navigates to /guest/result on success.
// Rate limited: 1 per IP per 24h (enforced by backend).

import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, Sparkles, ArrowRight } from 'lucide-react'
import { API_URL } from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const TRIP_TYPES = ['Family', 'Solo', 'Couple', 'Friends', 'Adventure']

const GEN_STEPS = [
  '🗺️ Understanding your trip...',
  '🏨 Finding best hotels...',
  '🚆 Planning train routes...',
  '📍 Discovering places to visit...',
  '💰 Calculating budget breakdown...',
  '✨ Finalising your itinerary...',
]

export default function GuestDashboard() {
  const navigate = useNavigate()
  const { isAuthenticated, isAgent, loading } = useAuth()

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(isAgent ? '/agent/dashboard' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, isAgent, loading, navigate])

  const [from,       setFrom]       = useState('')
  const [days,       setDays]       = useState('')
  const [budget,     setBudget]     = useState('')
  const [tripType,   setTripType]   = useState('')
  const [generating, setGenerating] = useState(false)
  const [genStep,    setGenStep]    = useState(0)
  const [errors,     setErrors]     = useState({})

  const genStepIntervalRef = useRef(null)

  const validate = () => {
    const e = {}
    if (!from.trim())          e.from   = 'Please enter your departure city'
    if (!days || days < 1)     e.days   = 'Please enter number of days'
    if (days > 30)             e.days   = 'Maximum 30 days'
    if (!budget || budget < 1000) e.budget = 'Minimum budget is ₹1,000'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGenerate = async () => {
    if (!validate()) return
    setGenerating(true)
    setGenStep(0)
    genStepIntervalRef.current = setInterval(() => {
      setGenStep(p => p < GEN_STEPS.length - 1 ? p + 1 : p)
    }, 4000)

    try {
      const res = await fetch(`${API_URL}/itinerary/generate/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_city:      from.trim(),
          destination:    null,
          days:           parseInt(days),
          budget:         parseInt(budget),
          trip_type:      tripType || null,
          plan_tier:      'silver',
          transport_mode: 'balanced',
          start_date:     null,
          is_flexible:    false,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const code = data?.detail?.code
        if (code === 'GUEST_RATE_LIMIT') {
          toast.error('You\'ve already generated a free plan today. Sign up free for unlimited plans! 🎉', { duration: 6000 })
          return
        }
        if (code === 'INTERNATIONAL_DESTINATION') {
          toast.error('Tripzio supports Indian destinations only. International coming soon! 🌍', { duration: 5000 })
          return
        }
        throw new Error(data?.detail || 'Generation failed')
      }

      // Store in localStorage for auto-save after login
      localStorage.setItem('tripzio_guest_plan', JSON.stringify(data))

      // Navigate to guest result page
      navigate('/guest/result', {
        state: { itinerary: data, isGuest: true },
        replace: false,
      })

    } catch (err) {
      if (err.message !== 'HANDLED') {
        toast.error(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      clearInterval(genStepIntervalRef.current)
      setGenerating(false)
    }
  }

  const inp = (hasError) => ({
    width: '100%', padding: '12px 16px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '12px', fontSize: '14px', color: '#0f172a',
    background: hasError ? '#fef2f2' : 'white',
    outline: 'none', fontFamily: 'inherit',
    transition: 'all 0.2s', boxSizing: 'border-box',
  })

  const isReady = from.trim() && days >= 1 && days <= 30 && budget >= 1000 && !generating

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#e8f8f5 0%,#f0f9ff 40%,#f8fafc 100%)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        input:focus, select:focus { border-color: #0d9488 !important; outline: none; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
        .trip-chip:hover { border-color: #0d9488 !important; color: #0d9488 !important; }
        .gen-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.05); }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav style={{ padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={16} color="white" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tripzio</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/login" style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textDecoration: 'none' }}>Sign In</Link>
          <Link to="/register" style={{ fontSize: '13px', fontWeight: '700', color: 'white', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none' }}>Sign Up Free</Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 24px 80px', animation: 'fadeUp 0.5s ease' }}>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '20px', padding: '5px 14px' }}>
            <Sparkles size={12} color="#0d9488" />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0d9488', letterSpacing: '0.5px' }}>FREE PLAN — NO SIGNUP NEEDED</span>
          </div>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.5px', lineHeight: 1.15 }}>
          Plan your perfect<br />
          <span style={{ background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Indian trip in 30s
          </span>
        </h1>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '15px', marginBottom: '40px', lineHeight: 1.6 }}>
          Real trains · Real hotels · Budget breakdown · Festival alerts
        </p>

        {/* ── Form Card ────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>

          {/* From city */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Travelling From
            </label>
            <input
              type="text"
              placeholder="e.g. Kolkata, Delhi, Mumbai"
              value={from}
              onChange={e => { setFrom(e.target.value); setErrors(p => ({ ...p, from: '' })) }}
              style={inp(errors.from)}
              disabled={generating}
            />
            {errors.from && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>⚠ {errors.from}</p>}
          </div>

          {/* Days + Budget */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Number of Days
              </label>
              <input
                type="number"
                placeholder="5"
                min="1" max="30"
                value={days}
                onChange={e => { setDays(e.target.value); setErrors(p => ({ ...p, days: '' })) }}
                style={inp(errors.days)}
                disabled={generating}
              />
              {errors.days && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>⚠ {errors.days}</p>}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Budget (₹)
              </label>
              <input
                type="number"
                placeholder="15000"
                min="1000"
                value={budget}
                onChange={e => { setBudget(e.target.value); setErrors(p => ({ ...p, budget: '' })) }}
                style={inp(errors.budget)}
                disabled={generating}
              />
              {errors.budget && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>⚠ {errors.budget}</p>}
              {budget >= 1000 && days >= 1 && (
                <p style={{ fontSize: '11px', color: '#0ea5e9', marginTop: '3px', fontWeight: '600' }}>
                  ≈ ₹{Math.round(budget / days).toLocaleString('en-IN')}/day
                </p>
              )}
            </div>
          </div>

          {/* Trip type */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Trip Type <span style={{ color: '#94a3b8', fontWeight: '400', textTransform: 'none' }}>(optional)</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TRIP_TYPES.map(t => (
                <button key={t}
                  className="trip-chip"
                  onClick={() => setTripType(tripType === t ? '' : t)}
                  disabled={generating}
                  style={{
                    padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    border: `1.5px solid ${tripType === t ? '#0d9488' : '#e2e8f0'}`,
                    background: tripType === t ? '#f0fdfa' : 'white',
                    color: tripType === t ? '#0d9488' : '#64748b',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            className="gen-btn"
            onClick={handleGenerate}
            disabled={!isReady}
            style={{
              width: '100%', padding: '16px',
              background: isReady ? 'linear-gradient(135deg,#0d9488,#0ea5e9)' : '#e2e8f0',
              color: isReady ? 'white' : '#94a3b8',
              border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700',
              cursor: isReady ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'inherit', transition: 'all 0.2s',
              boxShadow: isReady ? '0 8px 24px rgba(13,148,136,0.3)' : 'none',
            }}>
            {generating ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                {GEN_STEPS[genStep]}
              </>
            ) : (
              <>✈ Generate My Free Plan <ArrowRight size={16} /></>
            )}
          </button>

          {/* Step progress */}
          {generating && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {GEN_STEPS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= genStep ? '#0d9488' : '#e2e8f0', transition: 'background 0.4s' }} />
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                Step {genStep + 1} of {GEN_STEPS.length} · Usually 15-30 seconds
              </p>
            </div>
          )}

        </div>

        {/* Trust line */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '20px', lineHeight: 1.8 }}>
          No credit card · No signup · One free plan per day
          <br />
          <Link to="/register" style={{ color: '#0d9488', fontWeight: '700', textDecoration: 'none' }}>
            Sign up free
          </Link>{' '}for unlimited plans, save & share
          <br />
          <span style={{ color: '#64748b' }}>Want Hindi/Hinglish input & more control? </span>
          <Link to="/register" style={{ color: '#0ea5e9', fontWeight: '700', textDecoration: 'none' }}>
            Try Custom Plan after signup →
          </Link>
        </p>

      </div>
    </div>
  )
}
