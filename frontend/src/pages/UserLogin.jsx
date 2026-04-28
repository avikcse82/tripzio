import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UserLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login({ email, password })
      toast.success('Welcome back! 🌏')
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail.includes('401') || detail.toLowerCase().includes('invalid') || detail.toLowerCase().includes('credentials') || detail.toLowerCase().includes('incorrect')) {
        setErrors({ password: 'Incorrect email or password' })
        toast.error('Incorrect email or password')
      } else if (detail.toLowerCase().includes('not found')) {
        setErrors({ email: 'No account found with this email' })
        toast.error('No account found')
      } else {
        toast.error(detail || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError) => ({
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '12px', fontSize: '14px', color: '#0f172a',
    background: 'white', outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border 0.2s', boxSizing: 'border-box'
  })

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
      `}</style>

      <div style={{
        background: 'white', borderRadius: '28px',
        padding: '48px 40px', width: '100%', maxWidth: '420px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'linear-gradient(135deg,#0d9488,#0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 4px 14px rgba(13,148,136,0.3)'
          }}>
            <MapPin size={24} color="white" />
          </div>
          <h1 style={{
            fontSize: '26px', fontWeight: '900', color: '#0f172a',
            margin: '0 0 6px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Welcome back 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Sign in to your Tripzio account
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              fontSize: '13px', fontWeight: '600', color: '#374151',
              display: 'block', marginBottom: '7px'
            }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
              style={inputStyle(errors.email)}
              disabled={loading}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', fontWeight: '500' }}>
                ⚠ {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontSize: '13px', fontWeight: '600', color: '#374151',
              display: 'block', marginBottom: '7px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                style={{ ...inputStyle(errors.password), paddingRight: '44px' }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '13px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#94a3b8',
                  padding: 0, display: 'flex', alignItems: 'center'
                }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', fontWeight: '500' }}>
                ⚠ {errors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading
                ? '#e2e8f0'
                : 'linear-gradient(135deg,#0d9488,#0ea5e9)',
              color: loading ? '#94a3b8' : 'white',
              border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.35)',
              marginBottom: '20px',
              transition: 'all 0.2s'
            }}>
            {loading ? (
              <>
                <div style={{
                  width: '17px', height: '17px',
                  border: '2px solid rgba(0,0,0,0.15)',
                  borderTopColor: '#94a3b8',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }} />
                Signing in...
              </>
            ) : (
              'Sign In →'
            )}
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>
              Don't have an account?{' '}
              <Link to="/register"
                style={{ color: '#0d9488', fontWeight: '700', textDecoration: 'none' }}>
                Sign up free
              </Link>
            </p>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Are you a travel agent?{' '}
              <Link to="/agent/login"
                style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}>
                Agent login →
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
