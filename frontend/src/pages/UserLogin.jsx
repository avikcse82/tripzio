import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserLogin() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // If path is /register, start on register tab
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

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

  const inp = (hasError) => ({
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '12px', fontSize: '14px', color: '#0f172a',
    background: 'white', outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border 0.2s', boxSizing: 'border-box'
  })

  const switchTab = (toLogin) => {
    setIsLogin(toLogin)
    setErrors({})
    setEmail('')
    setPassword('')
    setFullName('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#e8f8f5 0%,#f0f9ff 40%,#f8fafc 100%)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }
        input:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1) !important; }
        input::placeholder { color: #94a3b8; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        background: 'white', borderRadius: '28px',
        padding: '40px', width: '100%', maxWidth: '420px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
        animation: 'fadeUp 0.3s ease'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'linear-gradient(135deg,#0d9488,#0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 4px 14px rgba(13,148,136,0.3)'
          }}>
            <MapPin size={24} color="white" />
          </div>
          <h1 style={{
            fontSize: '24px', fontWeight: '900', color: '#0f172a',
            margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            {isLogin ? 'Welcome back 👋' : 'Join Tripzio 🌏'}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {isLogin ? 'Sign in to your account' : 'Plan your perfect Indian trip'}
          </p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', background: '#f1f5f9',
          borderRadius: '12px', padding: '4px',
          marginBottom: '24px', gap: '4px'
        }}>
          {['Sign In', 'Sign Up'].map((tab, i) => (
            <button key={i}
              type="button"
              onClick={() => switchTab(i === 0)}
              style={{
                flex: 1, padding: '10px',
                borderRadius: '10px', border: 'none',
                fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s',
                background: (isLogin && i === 0) || (!isLogin && i === 1) ? 'white' : 'transparent',
                color: (isLogin && i === 0) || (!isLogin && i === 1) ? '#0f172a' : '#64748b',
                boxShadow: (isLogin && i === 0) || (!isLogin && i === 1) ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                fontFamily: 'Inter, sans-serif'
              }}>
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Full Name — register only */}
          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '7px' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Avik Chakraborty"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })) }}
                style={inp(errors.fullName)}
                disabled={loading}
              />
              {errors.fullName && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.fullName}</p>}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '7px' }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
              style={inp(errors.email)}
              disabled={loading}
            />
            {errors.email && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.email}</p>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '7px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isLogin ? 'Enter your password' : 'Min 6 characters'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                style={{ ...inp(errors.password), paddingRight: '44px' }}
                disabled={loading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.password}</p>}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)',
              color: loading ? '#94a3b8' : 'white',
              border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.35)',
              marginBottom: '20px', transition: 'all 0.2s'
            }}>
            {loading ? (
              <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#94a3b8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                {isLogin ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              isLogin ? 'Sign In →' : 'Create Account →'
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Are you a travel agent?{' '}
              <Link to="/agent/login" style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}>
                Agent login →
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
