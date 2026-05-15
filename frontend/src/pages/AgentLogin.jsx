import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, ArrowRight, Briefcase, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const BG_PHOTOS = [
  'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=1600&q=80', // Udaipur
  'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1600&q=80', // Jaipur
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1600&q=80',    // Darjeeling
  'https://images.unsplash.com/photo-1526712318848-5f38e2740d44?w=1600&q=80', // Hampi
]

const DEST_NAMES = ['Udaipur', 'Jaipur', 'Darjeeling', 'Hampi']

const AgentLogin = () => {
  const [isLogin,      setIsLogin]      = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [bgIndex,      setBgIndex]      = useState(0)
  const [form, setForm]   = useState({ full_name: '', email: '', password: '', business_name: '', city: '', phone: '' })
  const [errors,  setErrors]  = useState({})
  const [touched, setTouched] = useState({})
  const { login, register, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const t = setInterval(() => setBgIndex(p => (p + 1) % BG_PHOTOS.length), 5000)
    return () => clearInterval(t)
  }, [])

  // ── All original validators preserved ────────────────────
  const validators = {
    full_name: (val) => {
      if (!val.trim()) return 'Full name is required'
      if (val.trim().length < 3) return 'Name must be at least 3 characters'
      if (/[0-9]/.test(val)) return 'Name cannot contain numbers'
      if (/[^a-zA-Z\s]/.test(val)) return 'Name cannot contain special characters'
      return ''
    },
    email: (val) => {
      if (!val.trim()) return 'Email is required'
      if (/\s/.test(val)) return 'Email cannot contain spaces'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter valid email address'
      return ''
    },
    password: (val) => {
      if (!val) return 'Password is required'
      if (/\s/.test(val)) return 'Password cannot contain spaces'
      if (val.length < 6) return 'Password must be at least 6 characters'
      if (!/[0-9]/.test(val)) return 'Password must include at least one number'
      if (!/[a-zA-Z]/.test(val)) return 'Password must include at least one letter'
      return ''
    },
    business_name: (val) => {
      if (!val.trim()) return 'Business name is required'
      if (val.trim().length < 3) return 'Business name must be at least 3 characters'
      if (/[^a-zA-Z0-9\s&.\-]/.test(val)) return 'Only letters, numbers, & . - allowed'
      return ''
    },
    city: (val) => {
      if (!val.trim()) return 'City is required'
      if (val.trim().length < 3) return 'Enter valid city name'
      if (/[0-9]/.test(val)) return 'City cannot contain numbers'
      return ''
    },
    phone: (val) => {
      if (!val.trim()) return 'Phone number is required'
      const cleaned = val.replace(/\s/g, '')
      if (!/^[0-9]+$/.test(cleaned)) return 'Phone must contain only digits'
      if (cleaned.length !== 10) return 'Phone must be exactly 10 digits'
      if (!/^[6-9]/.test(cleaned)) return 'Enter valid Indian mobile number'
      return ''
    }
  }

  const validateField = (field, value) => {
    const error = validators[field] ? validators[field](value) : ''
    setErrors(prev => ({ ...prev, [field]: error }))
    return error
  }

  const validateAll = () => {
    const fields = isLogin ? ['email', 'password'] : ['full_name', 'email', 'password', 'business_name', 'city', 'phone']
    const newErrors = {}
    const newTouched = {}
    fields.forEach(field => { newTouched[field] = true; newErrors[field] = validators[field](form[field]) })
    setErrors(newErrors); setTouched(newTouched)
    return Object.values(newErrors).every(e => e === '')
  }

  const handleChange = (field, value) => {
    if (field === 'phone') value = value.replace(/[^0-9]/g, '').slice(0, 10)
    setForm(prev => ({ ...prev, [field]: value }))
    if (touched[field]) validateField(field, value)
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, form[field])
  }

  const handleSubmit = async () => {
    if (!validateAll()) return
    setLoading(true)
    try {
      if (isLogin) {
        const result = await login({ email: form.email, password: form.password })
        if (result.role !== 'agent') {
          await logout()
          toast.error('This is a user account. Please use Traveler Login.')
          setLoading(false); return
        }
        toast.success('Welcome back, Agent!')
      } else {
        await register({ full_name: form.full_name, email: form.email, password: form.password, role: 'agent', business_name: form.business_name, city: form.city, phone: form.phone })
        toast.success('Agent account created!')
      }
      navigate('/agent/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const isFormValid = () => {
    const fields = isLogin ? ['email', 'password'] : ['full_name', 'email', 'password', 'business_name', 'city', 'phone']
    return fields.every(f => form[f] && !validators[f](form[f]))
  }

  const inp = (field) => ({
    width: '100%', padding: '11px 16px',
    border: `1.5px solid ${errors[field] && touched[field] ? '#fca5a5' : touched[field] && !errors[field] ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.2)'}`,
    borderRadius: '12px', fontSize: '14px',
    fontFamily: 'inherit', background: 'rgba(255,255,255,0.08)',
    color: 'white', outline: 'none', transition: 'all 0.2s',
  })

  const renderField = (label, field, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input style={inp(field)} type={type} placeholder={placeholder}
          value={form[field]}
          onChange={e => handleChange(field, e.target.value)}
          onBlur={() => handleBlur(field)}
          maxLength={field === 'phone' ? 10 : undefined} />
        {touched[field] && !errors[field] && (
          <CheckCircle size={14} color="rgba(34,197,94,0.8)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        )}
      </div>
      {touched[field] && errors[field] && (
        <p style={{ color: '#fca5a5', fontSize: '11px', marginTop: '4px' }}>⚠ {errors[field]}</p>
      )}
      {field === 'phone' && form.phone && !errors.phone && (
        <p style={{ color: 'rgba(34,197,94,0.8)', fontSize: '11px', marginTop: '3px' }}>✓ Valid Indian mobile number</p>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 48px', fontFamily: "'DM Sans', Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        input::placeholder { color: rgba(255,255,255,0.35); }
        input:focus { border-color: rgba(255,255,255,0.55) !important; background: rgba(255,255,255,0.12) !important; outline: none; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
      `}</style>

      {/* ── Full-page background carousel ──────────────────── */}
      {BG_PHOTOS.map((photo, i) => (
        <div key={i} style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: bgIndex === i ? 1 : 0, transition: 'opacity 1.5s ease' }} />
      ))}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'linear-gradient(135deg,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.6) 100%)', backdropFilter: 'blur(2px)' }} />

      {/* ── Centered Card ──────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '440px', animation: 'fadeUp 0.5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
            <Briefcase size={22} color="white" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px', margin: '0 0 4px' }}>Agent Portal</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Planning trips to <span style={{ color: '#c4b5fd', fontWeight: '600' }}>{DEST_NAMES[bgIndex]}</span> & beyond
          </p>
        </div>

        {/* Glass card */}
        <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '24px', padding: '28px 32px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
            {['Agent Sign In', 'Register Agency'].map((tab, i) => (
              <button key={i} type="button"
                onClick={() => { setIsLogin(i === 0); setErrors({}); setTouched({}); setForm({ full_name: '', email: '', password: '', business_name: '', city: '', phone: '' }) }}
                style={{ flex: 1, padding: '10px', borderRadius: '11px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  background: (isLogin && i === 0) || (!isLogin && i === 1) ? 'rgba(139,92,246,0.35)' : 'transparent',
                  color: (isLogin && i === 0) || (!isLogin && i === 1) ? 'white' : 'rgba(255,255,255,0.4)',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Register fields */}
          {!isLogin && (
            <>
              {renderField('Full Name', 'full_name', 'text', 'Your full name')}
              {renderField('Agency Name', 'business_name', 'text', 'Nontai Travels')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {renderField('City', 'city', 'text', 'Kolkata')}
                {renderField('Phone', 'phone', 'tel', '9876543210')}
              </div>
            </>
          )}

          {renderField('Email', 'email', 'email', isLogin ? 'agent@youragency.com' : 'you@example.com')}

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '6px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inp('password'), paddingRight: '48px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 chars, include a number"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              <button onClick={() => setShowPassword(!showPassword)} type="button"
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p style={{ color: '#fca5a5', fontSize: '11px', marginTop: '4px' }}>⚠ {errors.password}</p>
            )}
            {!isLogin && form.password && (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { check: form.password.length >= 6, label: '6+ chars' },
                  { check: /[0-9]/.test(form.password), label: 'Number' },
                  { check: /[a-zA-Z]/.test(form.password), label: 'Letter' },
                  { check: !/\s/.test(form.password), label: 'No spaces' },
                ].map((rule, i) => (
                  <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: rule.check ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', color: rule.check ? 'rgba(134,239,172,0.9)' : 'rgba(255,255,255,0.35)', border: `1px solid ${rule.check ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                    {rule.check ? '✓' : '○'} {rule.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading || !isFormValid()} className="submit-btn"
            style={{ width: '100%', padding: '13px', background: loading || !isFormValid() ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: loading || !isFormValid() ? 'rgba(255,255,255,0.3)' : 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading || !isFormValid() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', boxShadow: !loading && isFormValid() ? '0 4px 20px rgba(139,92,246,0.4)' : 'none', marginBottom: '20px', transition: 'all 0.2s' }}>
            {loading
              ? <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />{isLogin ? 'Signing in...' : 'Creating account...'}</>
              : <>{isLogin ? 'Agent Sign In' : 'Register Agency'} <ArrowRight size={16} /></>
            }
          </button>

          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Not an agent?{' '}
              <Link to="/login" style={{ color: '#5eead4', fontWeight: '700', textDecoration: 'none' }}>
                Traveler login →
              </Link>
            </p>
          </div>
        </div>

        {/* Legal */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '16px', lineHeight: 1.6 }}>
          By signing up you agree to our{' '}
          <Link to="/terms" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' }}>Terms</Link> and{' '}
          <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline' }}>Privacy Policy</Link>
        </p>

        {/* BG dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
          {BG_PHOTOS.map((_, i) => (
            <button key={i} onClick={() => setBgIndex(i)}
              style={{ width: i === bgIndex ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === bgIndex ? '#8b5cf6' : 'rgba(255,255,255,0.25)', border: 'none', cursor: 'pointer', transition: 'all 0.4s', padding: 0 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default AgentLogin
