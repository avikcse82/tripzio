import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, MapPin, ArrowRight, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword]  = useState('')
  const [showPassword,    setShowPassword]     = useState(false)
  const [errors,          setErrors]           = useState({})
  const [loading,         setLoading]          = useState(false)

  const inp = (hasError) => ({
    width: '100%', padding: '12px 16px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#E7E3D8'}`,
    borderRadius: '12px', fontSize: '14px',
    color: '#0F172A', background: 'white',
    outline: 'none', fontFamily: 'inherit',
    transition: 'all 0.2s', boxSizing: 'border-box',
  })

  const validate = () => {
    const e = {}
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Minimum 6 characters'
    if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await resetPassword(token, password)
      toast.success('Password reset! Welcome back 🌏')
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      toast.error(detail || 'Could not reset password. Please try again.')
      setErrors({ form: detail || 'This reset link is invalid or has expired.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif", background: '#FAFAF8' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        input::placeholder { color: #B4AFA0; }
        input:focus { border-color: #0D9488 !important; box-shadow: 0 0 0 4px rgba(13,148,136,0.1) !important; outline: none; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(249,115,22,0.4) !important; }
      `}</style>

      <div style={{ position: 'fixed', top: '28px', left: '32px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800', fontSize: '19px', color: '#0F172A' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#0D9488,#0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapPin size={16} color="white" />
        </div>
        Tripzio
      </div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '440px', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 24px 64px rgba(15,23,42,0.14)' }}>

          {!token ? (
            <>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#FEF2F2', border: '1.5px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <AlertTriangle size={24} color="#DC2626" />
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', fontSize: '24px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '12px' }}>
                Invalid reset link
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
                This link is missing its reset token. Request a new one below.
              </p>
              <Link to="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0D9488', fontWeight: '700', fontSize: '14px', textDecoration: 'none' }}>
                Request new link →
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', fontSize: '28px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                Set a new password
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={password}
                      onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '', form: '' })) }}
                      style={{ ...inp(errors.password), paddingRight: '48px' }} disabled={loading} autoFocus />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.password}</p>}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Confirm Password</label>
                  <input type={showPassword ? 'text' : 'password'} placeholder="Re-enter password" value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '', form: '' })) }}
                    style={inp(errors.confirmPassword)} disabled={loading} />
                  {errors.confirmPassword && <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>⚠ {errors.confirmPassword}</p>}
                </div>

                {errors.form && (
                  <p style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', textAlign: 'center' }}>⚠ {errors.form}</p>
                )}

                <button type="submit" disabled={loading} className="submit-btn"
                  style={{ width: '100%', padding: '14px', background: loading ? '#E2E8F0' : 'linear-gradient(135deg,#F97316,#F59E0B)', color: loading ? '#94A3B8' : 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 8px 22px rgba(249,115,22,0.32)', marginBottom: '18px', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease' }}>
                  {loading
                    ? <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Resetting...</>
                    : <>Reset Password <ArrowRight size={16} /></>
                  }
                </button>

                <div style={{ textAlign: 'center' }}>
                  <Link to="/login" style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', textDecoration: 'none' }}>
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
