import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MapPin, ArrowRight, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const inp = (hasError) => ({
    width: '100%', padding: '12px 16px',
    border: `1.5px solid ${hasError ? '#fca5a5' : '#E7E3D8'}`,
    borderRadius: '12px', fontSize: '14px',
    color: '#0F172A', background: 'white',
    outline: 'none', fontFamily: 'inherit',
    transition: 'all 0.2s', boxSizing: 'border-box',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email')
      return
    }
    setLoading(true)
    try {
      await forgotPassword(email)
      // Backend always returns the same generic message whether or not the
      // email exists — never reveal account existence either way here
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
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

          {sent ? (
            <>
              <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#F0FDFA', border: '1.5px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <Mail size={24} color="#0D9488" />
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', fontSize: '24px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '12px' }}>
                Check your email
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
                If an account exists for <strong style={{ color: '#0F172A' }}>{email}</strong>, we've sent a link to reset your password. The link expires in 30 minutes.
              </p>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0D9488', fontWeight: '700', fontSize: '14px', textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', fontSize: '28px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                Forgot password?
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</label>
                  <input type="email" placeholder="you@example.com" value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    style={inp(error)} disabled={loading} autoFocus />
                  {error && <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '5px' }}>⚠ {error}</p>}
                </div>

                <button type="submit" disabled={loading} className="submit-btn"
                  style={{ width: '100%', padding: '14px', background: loading ? '#E2E8F0' : 'linear-gradient(135deg,#F97316,#F59E0B)', color: loading ? '#94A3B8' : 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 8px 22px rgba(249,115,22,0.32)', marginBottom: '18px', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease' }}>
                  {loading
                    ? <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Sending...</>
                    : <>Send Reset Link <ArrowRight size={16} /></>
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
