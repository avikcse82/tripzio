// frontend/src/pages/AgentProfile.jsx
// Tripzio Week 3 — Agent Profile Page
// Synced to: AgentDashboard patterns, API_URL, localStorage token, Navbar, toast

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { API_URL } from '../api'
import {
  Save, Building2, Phone, Mail, MapPin, Palette,
  MessageCircle, Sparkles, Check, AlertCircle, ArrowLeft,
  Upload, User, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_COLOR = '#0d9488'

const PRESET_COLORS = [
  '#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6',
  '#ec4899', '#ef4444', '#f59e0b', '#22c55e',
  '#0f172a', '#334155',
]

export default function AgentProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const token = () => localStorage.getItem('tripzio_token')

  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const [form, setForm] = useState({
    business_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    logo_url: '',
    brand_color: DEFAULT_COLOR,
    whatsapp_number: '',
    tagline: '',
  })

  const [errors, setErrors]     = useState({})
  const [preview, setPreview]   = useState(null)  // logo preview URL

  // ── Fetch existing profile ─────────────────────────────────
  useEffect(() => {
    const t = token()
    if (!t) { navigate('/agent/login'); return }
    fetch(`${API_URL}/agents/profile`, {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.profile) {
          const p = data.profile
          setForm({
            business_name:   p.business_name   || '',
            contact_phone:   p.contact_phone   || '',
            contact_email:   p.contact_email   || '',
            city:            p.city            || '',
            logo_url:        p.logo_url        || '',
            brand_color:     p.brand_color     || DEFAULT_COLOR,
            whatsapp_number: p.whatsapp_number || '',
            tagline:         p.tagline         || '',
          })
          if (p.logo_url) setPreview(p.logo_url)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
    setSaved(false)
  }

  // ── Validate ───────────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.business_name.trim()) e.business_name = 'Business name is required'
    if (form.contact_phone && !/^[\d\s\+\-()]{7,15}$/.test(form.contact_phone))
      e.contact_phone = 'Enter a valid phone number'
    if (form.contact_email && !/\S+@\S+\.\S+/.test(form.contact_email))
      e.contact_email = 'Enter a valid email'
    if (form.brand_color && !/^#[0-9A-Fa-f]{6}$/.test(form.brand_color))
      e.brand_color = 'Enter a valid hex color (e.g. #0d9488)'
    setErrors(e)
    return !Object.keys(e).length
  }

  // ── Save ───────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/agents/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify(form)
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail) }
      setSaved(true)
      toast.success('Profile saved! ✓')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      toast.error(e.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  // ── Logo URL input handler ─────────────────────────────────
  function handleLogoUrl(val) {
    set('logo_url', val)
    setPreview(val || null)
  }

  // ── Styles ─────────────────────────────────────────────────
  const inp = (err) => ({
    width: '100%', padding: '10px 13px',
    border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '10px', fontSize: '13px', color: '#0f172a',
    background: '#fafafa', outline: 'none',
    fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
    boxSizing: 'border-box',
  })

  const label = (text, required = false) => (
    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {text}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
    </label>
  )

  const errMsg = (field) => errors[field] && (
    <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <AlertCircle size={10} /> {errors[field]}
    </p>
  )

  const brandC = form.brand_color || DEFAULT_COLOR

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #94a3b8; }
        input:focus, textarea:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1) !important; outline: none !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>

      <Navbar />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 20px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', animation: 'fadeUp 0.3s ease' }}>
          <button onClick={() => navigate('/agent/dashboard')}
            style={{ width: '38px', height: '38px', border: '1.5px solid #e2e8f0', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>
            <ArrowLeft size={15} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
              <div style={{ width: '6px', height: '6px', background: brandC, borderRadius: '50%' }} />
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Agent Portal</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
              Agency Profile
            </h1>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            Loading profile...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>

            {/* ── BRANDING PREVIEW CARD ── */}
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', animation: 'fadeUp 0.3s ease' }}>
              {/* Mini PDF header preview */}
              <div style={{ background: brandC, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {preview ? (
                    <img src={preview} alt="Logo" onError={() => setPreview(null)}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', background: 'white', border: '2px solid rgba(255,255,255,0.3)' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} color="white" />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {form.business_name || 'Your Agency Name'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>
                      {form.tagline || 'Your tagline appears here'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>Powered by</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>TRIPZIO AI</div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={11} color="#0d9488" />
                  This is how your agency appears on PDF exports and WhatsApp shares
                </p>
              </div>
            </div>

            {/* ── BUSINESS DETAILS ── */}
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', animation: 'fadeUp 0.35s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={15} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Business Details</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Appears on all client-facing PDFs</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px' }}>

                <div>
                  {label('Agency / Business Name', true)}
                  <input value={form.business_name}
                    onChange={e => set('business_name', e.target.value)}
                    placeholder="Sharma Travels Pvt Ltd"
                    style={inp(errors.business_name)} />
                  {errMsg('business_name')}
                </div>

                <div>
                  {label('Tagline')}
                  <input value={form.tagline}
                    onChange={e => set('tagline', e.target.value)}
                    placeholder="Your Dream Trip Awaits"
                    style={inp()} />
                </div>

                <div>
                  {label('City / Base Location')}
                  <div style={{ position: 'relative' }}>
                    <MapPin size={13} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input value={form.city}
                      onChange={e => set('city', e.target.value)}
                      placeholder="Kolkata"
                      style={{ ...inp(), paddingLeft: '30px' }} />
                  </div>
                </div>

                <div>
                  {label('Contact Phone')}
                  <div style={{ position: 'relative' }}>
                    <Phone size={13} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input value={form.contact_phone}
                      onChange={e => set('contact_phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      style={{ ...inp(errors.contact_phone), paddingLeft: '30px' }} />
                  </div>
                  {errMsg('contact_phone')}
                </div>

                <div>
                  {label('Contact Email')}
                  <div style={{ position: 'relative' }}>
                    <Mail size={13} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input value={form.contact_email}
                      onChange={e => set('contact_email', e.target.value)}
                      placeholder="hello@sharmatravels.com"
                      style={{ ...inp(errors.contact_email), paddingLeft: '30px' }} />
                  </div>
                  {errMsg('contact_email')}
                </div>

                <div>
                  {label('WhatsApp Number')}
                  <div style={{ position: 'relative' }}>
                    <MessageCircle size={13} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input value={form.whatsapp_number}
                      onChange={e => set('whatsapp_number', e.target.value)}
                      placeholder="+91 98765 43210"
                      style={{ ...inp(), paddingLeft: '30px' }} />
                  </div>
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>Used for client WhatsApp shares</p>
                </div>

              </div>
            </div>

            {/* ── LOGO + BRAND COLOR ── */}
            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', animation: 'fadeUp 0.4s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: brandC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Palette size={15} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Logo & Brand Colour</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Customises your PDF cover and WhatsApp messages</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px' }}>

                {/* Logo URL */}
                <div>
                  {label('Logo URL')}
                  <input value={form.logo_url}
                    onChange={e => handleLogoUrl(e.target.value)}
                    placeholder="https://yoursite.com/logo.png"
                    style={inp()} />
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                    Upload your logo to Google Drive / ImgBB and paste the public link
                  </p>
                  {preview && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                      <img src={preview} alt="Logo preview" onError={() => setPreview(null)}
                        style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                      <div>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', margin: '0 0 2px' }}>✓ Logo preview</p>
                        <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>Appears on PDF cover</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Brand Color */}
                <div>
                  {label('Brand Colour')}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                    <input
                      type="color"
                      value={form.brand_color || DEFAULT_COLOR}
                      onChange={e => set('brand_color', e.target.value)}
                      style={{ width: '44px', height: '38px', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '2px', cursor: 'pointer', background: 'white' }}
                    />
                    <input
                      value={form.brand_color}
                      onChange={e => set('brand_color', e.target.value)}
                      placeholder="#0d9488"
                      style={{ ...inp(errors.brand_color), width: '130px' }}
                    />
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: brandC, border: '1.5px solid #e2e8f0', flexShrink: 0 }} />
                  </div>
                  {errMsg('brand_color')}

                  {/* Preset swatches */}
                  <div>
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>PRESETS</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => set('brand_color', c)}
                          title={c}
                          style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            background: c, border: form.brand_color === c ? '2.5px solid #0f172a' : '2px solid transparent',
                            cursor: 'pointer', outline: 'none', transition: 'transform 0.1s',
                            transform: form.brand_color === c ? 'scale(1.2)' : 'scale(1)',
                          }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SAVE BUTTON ── */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', animation: 'fadeUp 0.45s ease' }}>
              <button onClick={handleSave} disabled={saving}
                style={{
                  padding: '13px 28px',
                  background: saved
                    ? 'linear-gradient(135deg,#16a34a,#15803d)'
                    : saving ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)',
                  color: saving ? '#94a3b8' : 'white',
                  border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '800',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(13,148,136,0.35)',
                  transition: 'all 0.2s',
                }}>
                {saving
                  ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Saving...</>
                  : saved
                    ? <><Check size={15} />Profile Saved!</>
                    : <><Save size={15} />Save Profile</>
                }
              </button>
              <button onClick={() => navigate('/agent/dashboard')}
                style={{ padding: '13px 20px', background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Back to Dashboard
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
