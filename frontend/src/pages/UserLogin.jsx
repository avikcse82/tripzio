import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, MapPin, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

const BG_PHOTOS = [
  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1600&q=80', // Ladakh
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1600&q=80', // Rajasthan
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1600&q=80', // Kerala
  'https://images.unsplash.com/photo-1587922546307-776227941871?w=1600&q=80', // Goa
  'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1600&q=80',    // Varanasi
  'https://images.unsplash.com/photo-1574988050647-33c6773e5e9a?w=1600&q=80', // Manali
  'https://images.unsplash.com/photo-1597074866923-dc0589150358?w=1600&q=80', // Shimla
  'https://images.unsplash.com/photo-1658593345227-965f61fd6ba1?w=1600&q=80', // Darjeeling
  'https://images.unsplash.com/photo-1586053226626-febc8817962f?w=1600&q=80', // Andaman
  'https://images.unsplash.com/photo-1650341259809-9314b0de9268?w=1600&q=80', // Rishikesh
]

const DEST_NAMES = ['Ladakh', 'Rajasthan', 'Kerala', 'Goa', 'Varanasi', 'Manali', 'Shimla', 'Darjeeling', 'Andaman', 'Rishikesh']

export default function UserLogin() {
  const { login, register } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [isLogin,      setIsLogin]      = useState(location.pathname !== '/register')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [fullName,     setFullName]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [errors,       setErrors]       = useState({})
  const [bgIndex,      setBgIndex]      = useState(0)

  useEffect(() => {
    const t = setInterval(() => setBgIndex(p => (p + 1) % BG_PHOTOS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const validate = () => {
    const e = {}
    if (!isLogin && !fullName.trim()) e.fullName = 'Full name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Minimum 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (isLogin) {
        await login({ email, password })
        toast.success('Welcome back! 🌏')
      } else {
        await register({ full_name: fullName, email, password, role: 'user' })
        toast.success('Account created! Welcome to Tripzio 🎉')
      }

      // ── Auto-save guest plan if one exists ────────────────
      try {
        const guestPlan = localStorage.getItem('tripzio_guest_plan')
        const token = localStorage.getItem('tripzio_token')
        if (guestPlan && token) {
          const planData = JSON.parse(guestPlan)
          const saveRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/trips/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              title: `${planData.destination || 'Trip'} — ${planData.days || ''} days`,
              from_city: planData.from_city || '',
              destination: planData.destination || '',
              days: planData.days || 1,
              budget: planData.budget || 0,
              trip_type: planData.trip_type || null,
              plan_tier: planData.plan_tier || 'silver',
              itinerary: planData,
              trip_id: planData.trip_id || undefined,
            }),
          })
          if (saveRes.ok) {
            localStorage.removeItem('tripzio_guest_plan')
            toast.success('Your free plan has been saved to My Trips! 🗺️', { duration: 5000 })
          }
        }
      } catch (_) {
        // Fail silent — auto-save is a bonus, not critical
      }

      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail.toLowerCase().includes('already')) {
        toast.error('Email already registered. Please login.')
        setErrors({ email: 'Email already registered' })
      } else if (detail.toLowerCase().includes('invalid') || detail.toLowerCase().includes('credentials') || detail.includes('401')) {
        toast.error('Incorrect email or password')
        setErrors({ password: 'Incorrect email or password' })
      } else {
        toast.error(detail || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (toLogin) => {
    setIsLogin(toLogin)
    setErrors({})
    setEmail('')
    setPassword('')
    setFullName('')
  }

  const inp = (hasError) => ({
    width: '100%', padding: '12px 16px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#E7E3D8'}`,
    borderRadius: '12px', fontSize: '14px',
    color: '#0F172A', background: 'white',
    outline: 'none', fontFamily: 'inherit',
    transition: 'all 0.2s', boxSizing: 'border-box',
  })

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        input::placeholder { color: #B4AFA0; }
        input:focus { border-color: #0D9488 !important; box-shadow: 0 0 0 4px rgba(13,148,136,0.1) !important; outline: none; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(249,115,22,0.4) !important; }
        .tab-active { background: linear-gradient(135deg,#F97316,#F59E0B) !important; color: white !important; box-shadow: 0 6px 16px rgba(249,115,22,0.3); }
        .tab-inactive { color: #64748B !important; }
      `}</style>

      {/* ── Full-page seamless rotating photo background — same system as the dashboards ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -2, overflow: 'hidden' }}>
        {BG_PHOTOS.map((photo, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${photo})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: bgIndex === i ? 1 : 0,
            transition: 'opacity 1.8s ease',
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg,rgba(250,250,248,0.62) 0%,rgba(250,250,248,0.72) 100%), radial-gradient(circle at 15% 10%, rgba(13,148,136,0.08), transparent 40%), radial-gradient(circle at 88% 85%, rgba(249,115,22,0.06), transparent 40%)',
        }} />
      </div>

      {/* Logo — top-left, floats over the photo */}
      <div style={{ position: 'fixed', top: '28px', left: '32px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800', fontSize: '19px', color: '#0F172A', textShadow: '0 1px 3px rgba(250,250,248,0.9), 0 0 20px rgba(250,250,248,0.7)' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#0D9488,#0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapPin size={16} color="white" />
        </div>
        Tripzio
      </div>

      {/* Destination caption + dots — bottom of viewport, over the photo */}
      <div style={{ position: 'fixed', bottom: '28px', left: '32px', zIndex: 2 }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: '600', color: '#0F172A', fontSize: '15px' }}>
          Exploring <span style={{ color: '#0D9488' }}>{DEST_NAMES[bgIndex]}</span> today
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: '28px', right: '32px', display: 'flex', gap: '6px', zIndex: 2 }}>
        {BG_PHOTOS.map((_, i) => (
          <button key={i} onClick={() => setBgIndex(i)}
            style={{ width: i === bgIndex ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === bgIndex ? '#0D9488' : 'rgba(15,23,42,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.4s', padding: 0 }} />
        ))}
      </div>

      {/* ── Centered card ─────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '440px', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 24px 64px rgba(15,23,42,0.14)' }}>

          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '700', fontSize: '11.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0D9488', background: '#FEF3C7', display: 'inline-block', padding: '5px 12px', borderRadius: '999px', marginBottom: '16px' }}>
            No chatbot. One line, full plan.
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', fontSize: '28px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '20px' }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>

          {/* Toggle */}
          <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E7E3D8', borderRadius: '14px', padding: '4px', marginBottom: '24px', gap: '4px' }}>
            {['Sign In', 'Sign Up'].map((tab, i) => (
              <button key={i} type="button"
                onClick={() => switchTab(i === 0)}
                className={(isLogin && i === 0) || (!isLogin && i === 1) ? 'tab-active' : 'tab-inactive'}
                style={{ flex: 1, padding: '11px', borderRadius: '11px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', background: 'transparent' }}>
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            {!isLogin && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Full Name</label>
                <input type="text" placeholder="Your full name" value={fullName}
                  onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })) }}
                  style={inp(errors.fullName)} disabled={loading} />
                {errors.fullName && <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.fullName}</p>}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                style={inp(errors.email)} disabled={loading} />
              {errors.email && <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.email}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Enter password' : 'Min 6 characters'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                  style={{ ...inp(errors.password), paddingRight: '48px' }}
                  disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.password}</p>}
              {isLogin && (
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <Link to="/forgot-password" style={{ fontSize: '12.5px', color: '#0D9488', fontWeight: '600', textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="submit-btn"
              style={{ width: '100%', padding: '14px', background: loading ? '#E2E8F0' : 'linear-gradient(135deg,#F97316,#F59E0B)', color: loading ? '#94A3B8' : 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 8px 22px rgba(249,115,22,0.32)', marginBottom: '18px', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease, filter 0.25s ease' }}>
              {loading
                ? <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />{isLogin ? 'Signing in...' : 'Creating account...'}</>
                : <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>
              }
            </button>

            {/* Agent link */}
            <div style={{ textAlign: 'center', paddingTop: '14px', borderTop: '1px solid #E7E3D8' }}>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Travel agent?{' '}
                <Link to="/agent/login" style={{ color: '#0D9488', fontWeight: '700', textDecoration: 'none' }}>
                  Agent portal →
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Legal */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#0F172A', marginTop: '18px', lineHeight: 1.6, textShadow: '0 1px 3px rgba(250,250,248,0.9), 0 0 20px rgba(250,250,248,0.7)' }}>
          By signing up you agree to our{' '}
          <Link to="/terms" style={{ color: '#0F172A', textDecoration: 'underline' }}>Terms</Link> and{' '}
          <Link to="/privacy" style={{ color: '#0F172A', textDecoration: 'underline' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
