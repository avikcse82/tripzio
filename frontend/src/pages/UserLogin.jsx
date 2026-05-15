import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, MapPin, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

const BG_PHOTOS = [
  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1600&q=80', // Ladakh
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1600&q=80', // Kerala
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1600&q=80', // Rajasthan
  'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1600&q=80',    // Varanasi
  'https://images.unsplash.com/photo-1587922546307-776227941871?w=1600&q=80', // Goa
]

const DEST_NAMES = ['Ladakh', 'Kerala', 'Rajasthan', 'Varanasi', 'Goa']

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
    border: `1.5px solid ${hasError ? '#fca5a5' : 'rgba(255,255,255,0.25)'}`,
    borderRadius: '12px', fontSize: '14px',
    color: 'white', background: 'rgba(255,255,255,0.08)',
    outline: 'none', fontFamily: 'inherit',
    transition: 'all 0.2s', boxSizing: 'border-box',
  })

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans', Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        input::placeholder { color: rgba(255,255,255,0.4); }
        input:focus { border-color: rgba(255,255,255,0.6) !important; background: rgba(255,255,255,0.12) !important; outline: none; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .tab-active { background: rgba(255,255,255,0.15) !important; color: white !important; }
        .tab-inactive { color: rgba(255,255,255,0.5) !important; }
      `}</style>

      {/* ── Full-page background carousel ──────────────────── */}
      {BG_PHOTOS.map((photo, i) => (
        <div key={i} style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: bgIndex === i ? 1 : 0,
          transition: 'opacity 1.5s ease',
        }} />
      ))}

      {/* Dark overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'linear-gradient(135deg,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.55) 100%)', backdropFilter: 'blur(2px)' }} />

      {/* ── Centered Card ──────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', animation: 'fadeUp 0.5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(13,148,136,0.4)' }}>
            <MapPin size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px', margin: '0 0 6px' }}>Tripzio</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            Exploring <span style={{ color: '#5eead4', fontWeight: '600' }}>{DEST_NAMES[bgIndex]}</span> today
          </p>
        </div>

        {/* Glass card */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', padding: '4px', marginBottom: '28px', gap: '4px' }}>
            {['Sign In', 'Sign Up'].map((tab, i) => (
              <button key={i} type="button"
                onClick={() => switchTab(i === 0)}
                style={{ flex: 1, padding: '11px', borderRadius: '11px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  background: (isLogin && i === 0) || (!isLogin && i === 1) ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: (isLogin && i === 0) || (!isLogin && i === 1) ? 'white' : 'rgba(255,255,255,0.45)',
                }}>
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            {!isLogin && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '7px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Full Name</label>
                <input type="text" placeholder="Your full name" value={fullName}
                  onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })) }}
                  style={inp(errors.fullName)} disabled={loading} />
                {errors.fullName && <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.fullName}</p>}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '7px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                style={inp(errors.email)} disabled={loading} />
              {errors.email && <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.email}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '7px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Enter password' : 'Min 6 characters'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                  style={{ ...inp(errors.password), paddingRight: '48px' }}
                  disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 0, display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.password}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="submit-btn"
              style={{ width: '100%', padding: '14px', background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: loading ? 'rgba(255,255,255,0.4)' : 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 20px rgba(13,148,136,0.4)', marginBottom: '20px', transition: 'all 0.2s' }}>
              {loading
                ? <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.6)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />{isLogin ? 'Signing in...' : 'Creating account...'}</>
                : <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>
              }
            </button>

            {/* Agent link */}
            <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Travel agent?{' '}
                <Link to="/agent/login" style={{ color: '#5eead4', fontWeight: '700', textDecoration: 'none' }}>
                  Agent portal →
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Legal */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '20px', lineHeight: 1.6 }}>
          By signing up you agree to our{' '}
          <Link to="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>Terms</Link> and{' '}
          <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>Privacy Policy</Link>
        </p>

        {/* BG dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
          {BG_PHOTOS.map((_, i) => (
            <button key={i} onClick={() => setBgIndex(i)}
              style={{ width: i === bgIndex ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === bgIndex ? '#0d9488' : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.4s', padding: 0 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
