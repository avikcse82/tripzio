import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Map, Eye, EyeOff, ArrowRight, Briefcase, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const AgentLogin = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    business_name: '', city: '', phone: ''
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const { login, register, logout } = useAuth()
  const navigate = useNavigate()

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
    const fields = isLogin
      ? ['email', 'password']
      : ['full_name', 'email', 'password', 'business_name', 'city', 'phone']
    const newErrors = {}
    const newTouched = {}
    fields.forEach(field => {
      newTouched[field] = true
      newErrors[field] = validators[field](form[field])
    })
    setErrors(newErrors)
    setTouched(newTouched)
    return Object.values(newErrors).every(e => e === '')
  }

  const handleChange = (field, value) => {
    if (field === 'phone') {
      value = value.replace(/[^0-9]/g, '').slice(0, 10)
    }
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
          setLoading(false)
          return
        }
        toast.success('Welcome back, Agent!')
      } else {
        await register({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: 'agent',
          business_name: form.business_name,
          city: form.city,
          phone: form.phone
        })
        toast.success('Agent account created!')
      }
      navigate('/agent/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const getFieldStyle = (field) => ({
    width: '100%',
    padding: '12px 16px',
    border: `1.5px solid ${
      errors[field] && touched[field]
        ? '#ef4444'
        : touched[field] && !errors[field]
        ? '#22c55e'
        : '#e2e8f0'
    }`,
    borderRadius: '10px',
    fontSize: '15px',
    fontFamily: 'Inter, sans-serif',
    background: 'white',
    color: '#0f172a',
    transition: 'all 0.2s ease',
    outline: 'none'
  })

  const isFormValid = () => {
    const fields = isLogin
      ? ['email', 'password']
      : ['full_name', 'email', 'password', 'business_name', 'city', 'phone']
    return fields.every(f => form[f] && !validators[f](form[f]))
  }

  const renderField = (label, field, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '16px' }}>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          style={getFieldStyle(field)}
          type={type}
          placeholder={placeholder}
          value={form[field]}
          onChange={e => handleChange(field, e.target.value)}
          onBlur={() => handleBlur(field)}
          maxLength={field === 'phone' ? 10 : undefined}
        />
        {touched[field] && !errors[field] && (
          <CheckCircle size={16} color="#22c55e"
            style={{
              position: 'absolute', right: '12px',
              top: '50%', transform: 'translateY(-50%)'
            }} />
        )}
      </div>
      {touched[field] && errors[field] && (
        <p style={{
          color: '#ef4444', fontSize: '12px',
          marginTop: '4px', display: 'flex',
          alignItems: 'center', gap: '4px'
        }}>
          ⚠ {errors[field]}
        </p>
      )}
      {field === 'phone' && form.phone && !errors.phone && (
        <p style={{ color: '#22c55e', fontSize: '12px', marginTop: '4px' }}>
          ✓ Valid Indian mobile number
        </p>
      )}
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #f0fdf4 100%)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px',
        padding: '48px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '32px', justifyContent: 'center'
        }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Map size={22} color="white" />
          </div>
          <span style={{
            fontSize: '26px', fontWeight: '800',
            background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Tripzio
          </span>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', background: '#f1f5f9',
          borderRadius: '12px', padding: '4px', marginBottom: '32px'
        }}>
          {['Agent Sign In', 'Register Agency'].map((tab, i) => (
            <button key={i}
              onClick={() => {
                setIsLogin(i === 0)
                setErrors({})
                setTouched({})
                setForm({ full_name: '', email: '', password: '', business_name: '', city: '', phone: '' })
              }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: 'none', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s',
                background: (isLogin && i === 0) || (!isLogin && i === 1) ? 'white' : 'transparent',
                color: (isLogin && i === 0) || (!isLogin && i === 1) ? '#0f172a' : '#64748b',
                boxShadow: (isLogin && i === 0) || (!isLogin && i === 1) ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Agent Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', background: '#f0fdfa',
          borderRadius: '10px', border: '1px solid #99f6e4', marginBottom: '24px'
        }}>
          <Briefcase size={16} color="#0d9488" />
          <span style={{ fontSize: '13px', color: '#0d9488', fontWeight: '500' }}>
            Travel Agent Portal
          </span>
        </div>

        {/* Register Fields */}
        {!isLogin && (
          <>
            {renderField('Full Name', 'full_name', 'text', 'Your full name')}
            {renderField('Business Name', 'business_name', 'text', 'Your travel agency name')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {renderField('City', 'city', 'text', 'Kolkata')}
              {renderField('Phone', 'phone', 'tel', '9876543210')}
            </div>
          </>
        )}

        {renderField('Email Address', 'email', 'email', isLogin ? 'agent@youragency.com' : 'you@example.com')}

        {/* Password */}
        <div style={{ marginBottom: '24px' }}>
          <label className="label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...getFieldStyle('password'), paddingRight: '44px' }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 6 chars, include a number"
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', alignItems: 'center'
              }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {touched.password && errors.password && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚠ {errors.password}
            </p>
          )}
          {!isLogin && form.password && (
            <div style={{ marginTop: '8px' }}>
              {[
                { check: form.password.length >= 6, label: 'Min 6 characters' },
                { check: /[0-9]/.test(form.password), label: 'Contains a number' },
                { check: /[a-zA-Z]/.test(form.password), label: 'Contains a letter' },
                { check: !/\s/.test(form.password), label: 'No spaces' },
              ].map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: rule.check ? '#22c55e' : '#e2e8f0' }} />
                  <span style={{ fontSize: '11px', color: rule.check ? '#22c55e' : '#94a3b8' }}>{rule.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !isFormValid()}
          style={{
            width: '100%', padding: '14px',
            background: loading || !isFormValid() ? '#e2e8f0' : 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
            color: loading || !isFormValid() ? '#94a3b8' : 'white',
            border: 'none', borderRadius: '12px',
            fontSize: '16px', fontWeight: '700',
            cursor: loading || !isFormValid() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s',
            boxShadow: !loading && isFormValid() ? '0 4px 20px rgba(20,184,166,0.35)' : 'none'
          }}>
          {loading ? (
            <>{isLogin ? 'Signing in...' : 'Creating account...'}</>
          ) : (
            <>{isLogin ? 'Agent Sign In' : 'Register Agency'}<ArrowRight size={18} /></>
          )}
        </button>

        <div style={{
          textAlign: 'center', marginTop: '24px',
          paddingTop: '24px', borderTop: '1px solid #e2e8f0'
        }}>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Not an agent?{' '}
            <Link to="/login" style={{ color: '#0ea5e9', fontWeight: '600', textDecoration: 'none' }}>
              Traveler Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AgentLogin
