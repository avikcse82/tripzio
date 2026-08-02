import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, ArrowRight, Briefcase, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const BG_PHOTOS = [
  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1600&q=80', // Ladakh
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1600&q=80', // Kerala
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1600&q=80', // Rajasthan
  'https://images.unsplash.com/photo-1587922546307-776227941871?w=1600&q=80', // Goa
  'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1600&q=80',    // Varanasi
  'https://images.unsplash.com/photo-1574988050647-33c6773e5e9a?w=1600&q=80', // Manali
  'https://images.unsplash.com/photo-1597074866923-dc0589150358?w=1600&q=80', // Shimla
  'https://images.unsplash.com/photo-1658593345227-965f61fd6ba1?w=1600&q=80', // Darjeeling
  'https://images.unsplash.com/photo-1586053226626-febc8817962f?w=1600&q=80', // Andaman
  'https://images.unsplash.com/photo-1650341259809-9314b0de9268?w=1600&q=80', // Rishikesh
]

const DEST_NAMES = ['Ladakh', 'Kerala', 'Rajasthan', 'Goa', 'Varanasi', 'Manali', 'Shimla', 'Darjeeling', 'Andaman', 'Rishikesh']

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
    border: `1.5px solid ${errors[field] && touched[field] ? '#fca5a5' : touched[field] && !errors[field] ? '#86EFAC' : '#E7E3D8'}`,
    borderRadius: '12px', fontSize: '14px',
    fontFamily: 'inherit', background: 'white',
    color: '#0F172A', outline: 'none', transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  })

  const renderField = (label, field, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input style={inp(field)} type={type} placeholder={placeholder}
          value={form[field]}
          onChange={e => handleChange(field, e.target.value)}
          onBlur={() => handleBlur(field)}
          maxLength={field === 'phone' ? 10 : undefined} />
        {touched[field] && !errors[field] && (
          <CheckCircle size={14} color="#16A34A" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        )}
      </div>
      {touched[field] && errors[field] && (
        <p style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px' }}>⚠ {errors[field]}</p>
      )}
      {field === 'phone' && form.phone && !errors.phone && (
        <p style={{ color: '#16A34A', fontSize: '11px', marginTop: '3px' }}>✓ Valid Indian mobile number</p>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        input::placeholder { color: #B4AFA0; }
        input:focus { border-color: #0D9488 !important; box-shadow: 0 0 0 4px rgba(13,148,136,0.1) !important; outline: none; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(249,115,22,0.4) !important; }
      `}</style>

      {/* ── Full-page seamless rotating photo background — same system as UserLogin/dashboards ── */}
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
          background: 'linear-gradient(180deg,rgba(250,250,248,0.62) 0%,rgba(250,250,248,0.72) 100%), radial-gradient(circle at 15% 10%, rgba(124,58,237,0.08), transparent 40%), radial-gradient(circle at 88% 85%, rgba(249,115,22,0.06), transparent 40%)',
        }} />
      </div>

      {/* Logo — top-left, floats over the photo */}
      <div style={{ position: 'fixed', top: '28px', left: '32px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800', fontSize: '19px', color: '#0F172A', textShadow: '0 1px 3px rgba(250,250,248,0.9), 0 0 20px rgba(250,250,248,0.7)' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#7C3AED,#0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Briefcase size={16} color="white" />
        </div>
        Tripzio <span style={{ opacity: 0.65, fontWeight: 600, fontSize: '13px' }}>for Agents</span>
      </div>

      {/* Destination caption + dots — bottom of viewport, over the photo */}
      <div style={{ position: 'fixed', bottom: '28px', left: '32px', zIndex: 2 }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: '600', color: '#0F172A', fontSize: '15px' }}>
          Planning trips to <span style={{ color: '#7C3AED' }}>{DEST_NAMES[bgIndex]}</span> &amp; beyond
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: '28px', right: '32px', display: 'flex', gap: '6px', zIndex: 2 }}>
        {BG_PHOTOS.map((_, i) => (
          <button key={i} onClick={() => setBgIndex(i)}
            style={{ width: i === bgIndex ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === bgIndex ? '#7C3AED' : 'rgba(15,23,42,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.4s', padding: 0 }} />
        ))}
      </div>

      {/* ── Centered card ─────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '460px', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 24px 64px rgba(15,23,42,0.14)' }}>

          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '700', fontSize: '11.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED', background: '#F5F3FF', display: 'inline-block', padding: '5px 12px', borderRadius: '999px', marginBottom: '16px' }}>
            💼 Agent Portal
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', fontSize: '27px', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '20px' }}>
            {isLogin ? 'Welcome back, Agent' : 'Register your agency'}
          </h1>

          {/* Toggle */}
          <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E7E3D8', borderRadius: '14px', padding: '4px', marginBottom: '22px', gap: '4px' }}>
            {['Agent Sign In', 'Register Agency'].map((tab, i) => (
              <button key={i} type="button"
                onClick={() => { setIsLogin(i === 0); setErrors({}); setTouched({}); setForm({ full_name: '', email: '', password: '', business_name: '', city: '', phone: '' }) }}
                style={{ flex: 1, padding: '10px', borderRadius: '11px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  background: (isLogin && i === 0) || (!isLogin && i === 1) ? 'linear-gradient(135deg,#F97316,#F59E0B)' : 'transparent',
                  color: (isLogin && i === 0) || (!isLogin && i === 1) ? 'white' : '#64748B',
                  boxShadow: (isLogin && i === 0) || (!isLogin && i === 1) ? '0 6px 16px rgba(249,115,22,0.3)' : 'none',
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
          <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inp('password'), paddingRight: '48px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 chars, include a number"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              <button onClick={() => setShowPassword(!showPassword)} type="button"
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px' }}>⚠ {errors.password}</p>
            )}
            {!isLogin && form.password && (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { check: form.password.length >= 6, label: '6+ chars' },
                  { check: /[0-9]/.test(form.password), label: 'Number' },
                  { check: /[a-zA-Z]/.test(form.password), label: 'Letter' },
                  { check: !/\s/.test(form.password), label: 'No spaces' },
                ].map((rule, i) => (
                  <span key={i} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: rule.check ? '#F0FDF4' : '#F8FAFC', color: rule.check ? '#15803D' : '#94A3B8', border: `1px solid ${rule.check ? '#86EFAC' : '#E7E3D8'}`, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '600' }}>
                    {rule.check ? '✓' : '○'} {rule.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading || !isFormValid()} className="submit-btn"
            style={{ width: '100%', padding: '14px', background: loading || !isFormValid() ? '#E2E8F0' : 'linear-gradient(135deg,#F97316,#F59E0B)', color: loading || !isFormValid() ? '#94A3B8' : 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: loading || !isFormValid() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', boxShadow: !loading && isFormValid() ? '0 8px 22px rgba(249,115,22,0.32)' : 'none', marginBottom: '18px', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease, filter 0.25s ease' }}>
            {loading
              ? <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />{isLogin ? 'Signing in...' : 'Creating account...'}</>
              : <>{isLogin ? 'Agent Sign In' : 'Register Agency'} <ArrowRight size={16} /></>
            }
          </button>

          <div style={{ textAlign: 'center', paddingTop: '14px', borderTop: '1px solid #E7E3D8' }}>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Not an agent?{' '}
              <Link to="/login" style={{ color: '#0D9488', fontWeight: '700', textDecoration: 'none' }}>
                Traveler login →
              </Link>
            </p>
          </div>
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

export default AgentLogin
