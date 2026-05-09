import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import {
  Plus, Search, X, Zap, Route, Settings2,
  ChevronDown, ChevronUp, Trash2, MessageCircle,
  Phone, MapPin, Clock, Edit3, Check, Save,
  User, Briefcase, ArrowRight, RefreshCw,
  History, PlusCircle, Eye, AlertCircle, Download
} from 'lucide-react'
import toast from 'react-hot-toast'

import { API_URL } from '../api'

const TIERS = [
  { id: 'bronze',   label: 'Bronze',   emoji: '🥉', color: '#92400e', bg: '#fef3c7' },
  { id: 'silver',   label: 'Silver',   emoji: '🥈', color: '#334155', bg: '#f1f5f9' },
  { id: 'gold',     label: 'Gold',     emoji: '🥇', color: '#b45309', bg: '#fffbeb' },
  { id: 'diamond',  label: 'Diamond',  emoji: '💎', color: '#1d4ed8', bg: '#eff6ff' },
  { id: 'platinum', label: 'Platinum', emoji: '✨', color: '#6b21a8', bg: '#faf5ff' },
]

const TRIP_TYPES = ['Family', 'Couple', 'Solo', 'Group', 'Honeymoon', 'Friends']

const SAMPLE_PROMPTS = [
  '2 days Darjeeling + 2 days Gangtok from Kolkata, ₹18,000, couple',
  'Rajasthan circuit — Jaipur 3 days, Jodhpur 2 days, Jaisalmer 2 days, ₹35,000',
  'Kerala — Kochi 1 day, Alleppey 2 days, Munnar 2 days, family, ₹40,000',
  'Ladakh adventure — Leh 4 days, Nubra 2 days, Pangong 1 day, solo, ₹45,000',
]

const AVATAR_COLORS = [
  'linear-gradient(135deg,#0d9488,#0ea5e9)',
  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#22c55e,#16a34a)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#14b8a6,#0891b2)',
  'linear-gradient(135deg,#f97316,#ea580c)',
]

const getColor = (name) =>
  AVATAR_COLORS[name ? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length : 0]

// ── Client state helper ──────────────────────
// State 1: no_plan  — newly added, no trip yet
// State 2: has_plan — at least one plan generated
const getClientState = (client) =>
  client.trip && client.trip !== 'Not planned yet' ? 'has_plan' : 'no_plan'

export default function AgentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // ── Core state ───────────────────────────────
  const [activeTab, setActiveTab]           = useState('clients')
  const [clients, setClients]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [searchQuery, setSearchQuery]       = useState('')
  const [expandedId, setExpandedId]         = useState(null)
  const [showAddForm, setShowAddForm]       = useState(false)

  // Add client
  const [newClient, setNewClient]           = useState({ name: '', phone: '', city: '' })
  const [addErrors, setAddErrors]           = useState({})
  const [addingSaving, setAddingSaving]     = useState(false)

  // Edit client
  const [editData, setEditData]             = useState({})
  const [editSaving, setEditSaving]         = useState(false)

  // Generate trip
  const [generateMode, setGenerateMode]     = useState('new') // 'new' | 'modify'
  const [selectedClient, setSelectedClient] = useState(null)
  const [planMode, setPlanMode]             = useState('quick')
  const [showDetailed, setShowDetailed]     = useState(false)
  const [from, setFrom]                     = useState('')
  const [days, setDays]                     = useState('')
  const [budget, setBudget]                 = useState('')
  const [tripType, setTripType]             = useState('')
  const [destination, setDestination]       = useState('')
  const [startDate, setStartDate]           = useState('')
  const [tier, setTier]                     = useState('silver')
  const [transport, setTransport]           = useState('balanced')
  const [customText, setCustomText]         = useState('')
  const [showSamples, setShowSamples]       = useState(false)
  const [generating, setGenerating]         = useState(false)
  const [lastItinerary, setLastItinerary]   = useState(() => {
    try {
      const saved = localStorage.getItem('tripzio_last_itinerary')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [lastClientName, setLastClientName] = useState(() => {
    return localStorage.getItem('tripzio_last_client') || null
  })

  const [notesSaving, setNotesSaving] = useState({})   // { [clientId]: bool }

  const token = () => localStorage.getItem('tripzio_token')

  useEffect(() => { fetchClients() }, [])

  // ── Fetch clients ────────────────────────────
  const fetchClients = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/agents/clients`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const d = await r.json()
      setClients(d.clients || [])
    } catch { setClients([]) }
    finally { setLoading(false) }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Toggle expand ────────────────────────────
  const toggleExpand = (client) => {
    if (expandedId === client.id) {
      setExpandedId(null)
      setEditData({})
    } else {
      setExpandedId(client.id)
      setEditData({
        name: client.name,
        phone: client.phone,
        city: client.city,
        trip_requirement: client.trip === 'Not planned yet' ? '' : client.trip,
        status: client.status,
      })
    }
  }

  // ── Add client ───────────────────────────────
  const validateAdd = () => {
    const e = {}
    if (!newClient.name.trim()) e.name = 'Required'
    if (!newClient.phone.trim()) e.phone = 'Required'
    if (!newClient.city.trim()) e.city = 'Required'
    setAddErrors(e)
    return !Object.keys(e).length
  }

  const handleAdd = async () => {
    if (!validateAdd()) return
    setAddingSaving(true)
    try {
      const r = await fetch(`${API_URL}/agents/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ name: newClient.name, phone: newClient.phone, city: newClient.city })
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail) }
      const d = await r.json()
      setClients(p => [d.client, ...p])
      setNewClient({ name: '', phone: '', city: '' })
      setShowAddForm(false)
      toast.success(`${d.client.name} added! ✓`)
    } catch (e) { toast.error(e.message || 'Failed to add') }
    finally { setAddingSaving(false) }
  }

  // ── Save edits ───────────────────────────────
  const handleSaveEdit = async (clientId) => {
    setEditSaving(true)
    try {
      const r = await fetch(`${API_URL}/agents/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          name: editData.name || undefined,
          phone: editData.phone || undefined,
          city: editData.city || undefined,
          status: editData.status,
          trip_requirement: editData.trip_requirement || null,
          notes: editData.notes ?? null,
        })
      })
      if (!r.ok) throw new Error('Failed')
      setClients(p => p.map(c => c.id === clientId ? {
        ...c,
        name: editData.name,
        phone: editData.phone,
        city: editData.city,
        trip: editData.trip_requirement || 'Not planned yet',
        status: editData.status,
        notes: editData.notes ?? c.notes ?? '',
        avatar_color: getColor(editData.name)
      } : c))
      setExpandedId(null)
      toast.success('Client updated ✓')
    } catch { toast.error('Failed to save') }
    finally { setEditSaving(false) }
  }

  // ── Delete ───────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return
    try {
      await fetch(`${API_URL}/agents/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      setClients(p => p.filter(c => c.id !== id))
      if (expandedId === id) setExpandedId(null)
      toast.success(`${name} removed`)
    } catch { toast.error('Failed') }
  }

  // ── Save notes ───────────────────────────────
  const handleSaveNotes = async (clientId, notes) => {
    setNotesSaving(p => ({ ...p, [clientId]: true }))
    try {
      const r = await fetch(`${API_URL}/agents/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ notes })
      })
      if (!r.ok) throw new Error('Failed')
      setClients(p => p.map(c => c.id === clientId ? { ...c, notes } : c))
      toast.success('Notes saved ✓')
    } catch { toast.error('Failed to save notes') }
    finally { setNotesSaving(p => ({ ...p, [clientId]: false })) }
  }

  // ── Generate / Modify ────────────────────────
  const openGenerate = (client, mode = 'new') => {
    setSelectedClient(client)
    setGenerateMode(mode)
    setFrom(client.city || '')

    if (mode === 'modify' && client.trip && client.trip !== 'Not planned yet') {
      // Pre-fill with existing plan for modification
      const parts = client.trip.split('·').map(p => p.trim())
      if (parts[0]) setDestination(parts[0])
      if (parts[1]) setDays(parts[1].replace(/\D/g, ''))
      if (parts[2]) setBudget(parts[2].replace(/[₹,]/g, ''))
      setPlanMode('custom')
      setCustomText(
        `Modify this plan: ${client.trip} from ${client.city}. ` +
        `Make changes as needed — add or remove destinations.`
      )
      toast(`Modifying ${client.name}'s plan`, { icon: '✏️' })
    } else {
      // Fresh plan
      setDestination('')
      setDays('')
      setBudget('')
      setCustomText('')
      setPlanMode('quick')
      toast.success(`Planning new trip for ${client.name}`)
    }
    setActiveTab('generate')
  }

  // ── Generate itinerary ───────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      let endpoint, body
      if (planMode === 'custom') {
        if (customText.trim().length < 10) {
          toast.error('Please describe the trip in more detail')
          setGenerating(false)
          return
        }
        endpoint = `${API_URL}/itinerary/generate-custom`
        body = { free_text: customText.trim() }
      } else {
        if (!from.trim() || !days || !budget) {
          toast.error('Fill From city, Days and Budget')
          setGenerating(false)
          return
        }
        const hasDest = destination.trim().length > 0
        endpoint = hasDest
          ? `${API_URL}/itinerary/generate`
          : `${API_URL}/itinerary/suggest-destinations`
        body = {
          from_city: from.trim(), days: parseInt(days), budget: parseInt(budget),
          trip_type: tripType || null, destination: destination.trim() || null,
          destination_mode: hasDest ? 'specific' : 'suggest',
          plan_tier: tier, transport_mode: transport,
          start_date: startDate || null, is_flexible: false,
        }
      }

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body)
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail) }
      const data = await r.json()

      // Update client trip requirement silently — never block navigation
      if (selectedClient) {
        try {
          const dest = data.destination || data.parsed_from || ''
          const tripSummary = `${dest} · ${data.days} days · ₹${data.budget?.toLocaleString('en-IN')}`
          await fetch(`${API_URL}/agents/clients/${selectedClient.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ trip_requirement: tripSummary })
          })
          setClients(p => p.map(c => c.id === selectedClient.id
            ? { ...c, trip: tripSummary }
            : c
          ))
        } catch (e) {
          // Silently ignore — don't block navigation
          console.log('Trip summary update skipped:', e)
        }
      }

      if (endpoint.includes('suggest-destinations')) {
        navigate('/destinations/suggest', { state: { suggestions: data.suggestions, tripParams: body } })
      } else {
        // Store for "View Plan" button — persists across sessions
        setLastItinerary(data)
        setLastClientName(selectedClient?.name || null)
        try {
          localStorage.setItem('tripzio_last_itinerary', JSON.stringify(data))
          localStorage.setItem('tripzio_last_client', selectedClient?.name || '')
        } catch (e) { console.log('Storage full:', e) }
        toast.success('Itinerary ready! 🎉')
        setTimeout(() => {
          navigate('/itinerary/result', {
            state: {
              itinerary: data,
              clientName: selectedClient?.name || null
            }
          })
        }, 500)
      }
    } catch (e) { toast.error(e.message || 'Generation failed') }
    finally { setGenerating(false) }
  }

  const handleWhatsApp = (client) => {
    const hasplan = getClientState(client) === 'has_plan'
    const text = hasplan
      ? `Hi ${client.name}! 🌍\n\nYour trip plan is ready!\n\n📍 ${client.trip}\n\nPlanned by ${user?.business_name || user?.full_name} using Tripzio AI\n\nReply YES to confirm! ✈️`
      : `Hi ${client.name}! 👋\n\nThank you for your enquiry.\n\n${user?.business_name || user?.full_name} is working on your travel plan.\nWe'll share the itinerary shortly! 🗺️`
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
  }

  // ── Styles ───────────────────────────────────
  const inp = (err) => ({
    width: '100%', padding: '10px 13px',
    border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '10px', fontSize: '13px', color: '#0f172a',
    background: '#fafafa', outline: 'none',
    fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', boxSizing: 'border-box'
  })

  const pendingCount   = clients.filter(c => c.status === 'pending').length
  const confirmedCount = clients.filter(c => c.status === 'confirmed').length

  // ── Tabs — Generate only when client selected ─
  // Tab bar: Clients | Trip History | Invoices
  // Generate is NOT a tab — it's triggered from within client row
  const tabs = [
    { id: 'clients',  icon: '👥', label: 'Clients' },
    { id: 'generate', icon: '✨', label: selectedClient ? `Plan: ${selectedClient.name.split(' ')[0]}` : 'Generate Trip' },
    { id: 'invoices', icon: '📄', label: 'Invoices' },
    { id: 'profile',  icon: '⚙️', label: 'Profile' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #94a3b8; }
        input:focus, textarea:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1) !important; outline: none; }
        .crow { transition: all 0.2s; cursor: pointer; }
        .crow:hover { border-color: #0d9488 !important; box-shadow: 0 2px 12px rgba(13,148,136,0.1) !important; }
        .crow.open { border-color: #0d9488 !important; box-shadow: 0 4px 20px rgba(13,148,136,0.12) !important; }
        .abtn { transition: all 0.15s; }
        .abtn:hover { transform: translateY(-1px); }
        .gbtn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(13,148,136,0.45) !important; }
        .chip:hover { border-color: #0d9488 !important; color: #0d9488 !important; background: #f0fdfa !important; }
        .samp:hover { border-color: #0d9488 !important; background: #f0fdfa !important; cursor: pointer; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes expand { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes shimmer{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .sk { background:linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:12px; }
      `}</style>

      <Navbar />

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '28px 20px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'linear-gradient(135deg,#0f172a,#134e4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
              <Briefcase size={22} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                <div style={{ width: '6px', height: '6px', background: '#0d9488', borderRadius: '50%', animation: 'blink 2s infinite' }} />
                <span style={{ fontSize: '10px', color: '#0d9488', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Agent Portal</span>
              </div>
              <h1 style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: '900', color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {user?.business_name || user?.full_name}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={fetchClients}
              style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={() => { setShowAddForm(!showAddForm); setAddErrors({}); setNewClient({ name: '', phone: '', city: '' }) }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 20px', background: showAddForm ? 'white' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: showAddForm ? '#64748b' : 'white', border: showAddForm ? '1.5px solid #e2e8f0' : 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: showAddForm ? 'none' : '0 4px 14px rgba(13,148,136,0.35)', fontFamily: 'Inter, sans-serif' }}>
              {showAddForm ? <X size={15} /> : <Plus size={15} />}
              {showAddForm ? 'Cancel' : 'Add Client'}
            </button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginBottom: '22px' }}>
          {[
            { icon: '👥', label: 'Total Clients', value: loading ? '—' : clients.length, sub: `${pendingCount} pending`, color: '#0ea5e9', border: '#bae6fd', bg: '#f0f9ff' },
            { icon: '⏳', label: 'Pending',        value: loading ? '—' : pendingCount,   sub: 'Need attention',   color: '#f59e0b', border: '#fcd34d', bg: '#fffbeb' },
            { icon: '✅', label: 'Confirmed',      value: loading ? '—' : confirmedCount, sub: 'This month',       color: '#22c55e', border: '#bbf7d0', bg: '#f0fdf4' },
            { icon: '💰', label: 'Revenue',        value: '₹0',                           sub: 'Module 3',         color: '#8b5cf6', border: '#ddd6fe', bg: '#f5f3ff' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: '16px', padding: '18px', animation: `fadeUp ${0.15 + i * 0.06}s ease` }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginTop: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: s.color, marginTop: '2px', fontWeight: '600' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── ADD CLIENT FORM ── */}
        {showAddForm && (
          <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '22px', marginBottom: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', animation: 'fadeUp 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={15} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add New Client</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Saved to your account only — plan their trip anytime later</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Full Name *', field: 'name',  type: 'text', ph: 'Ramesh Kumar' },
                { label: 'Phone *',     field: 'phone', type: 'tel',  ph: '+91 98765 43210' },
                { label: 'City *',      field: 'city',  type: 'text', ph: 'Kolkata' },
              ].map(({ label, field, type, ph }) => (
                <div key={field}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
                  <input type={type} placeholder={ph} value={newClient[field]}
                    onChange={e => { setNewClient(p => ({ ...p, [field]: e.target.value })); setAddErrors(p => ({ ...p, [field]: '' })) }}
                    style={inp(addErrors[field])} />
                  {addErrors[field] && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>⚠ {addErrors[field]}</p>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleAdd} disabled={addingSaving}
                style={{ padding: '10px 22px', background: addingSaving ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: addingSaving ? '#94a3b8' : 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: addingSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Inter, sans-serif', boxShadow: addingSaving ? 'none' : '0 3px 10px rgba(13,148,136,0.3)' }}>
                {addingSaving ? <><div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Saving...</> : <><Check size={13} />Save Client</>}
              </button>
              <button onClick={() => setShowAddForm(false)}
                style={{ padding: '10px 16px', background: 'transparent', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── TAB BAR ── */}
        <div style={{ display: 'flex', background: 'linear-gradient(135deg,#0d9488,#0284c7)', borderRadius: '16px 16px 0 0', padding: '6px', gap: '3px' }}>
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: '10px 14px', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? '#0d9488' : 'rgba(255,255,255,0.85)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.12)' : 'none' }}>
              {tab.icon} {tab.label}
              {tab.id === 'clients' && clients.length > 0 && (
                <span style={{ background: activeTab === 'clients' ? '#0d9488' : '#334155', color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: '800' }}>
                  {clients.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 16px 16px', marginBottom: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* ════════════════════════════════════
              CLIENTS TAB
          ════════════════════════════════════ */}
          {activeTab === 'clients' && (
            <div style={{ padding: '20px' }}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="text" placeholder="Search by name or city..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inp(false), paddingLeft: '36px', background: '#f8fafc' }} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[1,2,3].map(i => <div key={i} className="sk" style={{ height: '64px' }} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>👥</div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {clients.length === 0 ? 'No clients yet' : `No results for "${searchQuery}"`}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
                    {clients.length === 0 ? 'Add your first client to start planning AI itineraries' : 'Try a different search term'}
                  </p>
                  {clients.length === 0 && (
                    <button onClick={() => setShowAddForm(true)}
                      style={{ padding: '11px 22px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      <Plus size={13} style={{ display: 'inline', marginRight: '6px' }} />Add First Client
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filtered.map((client, i) => {
                    const isOpen    = expandedId === client.id
                    const state     = getClientState(client)
                    const hasPlan   = state === 'has_plan'

                    return (
                      <div key={client.id} style={{ animation: `fadeUp ${0.08 + i * 0.04}s ease` }}>

                        {/* ── CLIENT ROW ── */}
                        <div className={`crow${isOpen ? ' open' : ''}`}
                          onClick={() => toggleExpand(client)}
                          style={{ background: isOpen ? '#f0fdfa' : 'white', border: `1.5px solid ${isOpen ? '#0d9488' : '#f1f5f9'}`, borderRadius: isOpen ? '14px 14px 0 0' : '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>

                          {/* Avatar */}
                          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: client.avatar_color || getColor(client.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white', flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                            {client.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: '160px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>{client.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: '#64748b' }}><Phone size={10} color="#94a3b8" />{client.phone}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: '#64748b' }}><MapPin size={10} color="#94a3b8" />{client.city}</span>
                            </div>
                          </div>

                          {/* Plan status pill */}
                          <div style={{ flex: 1, minWidth: '160px' }}>
                            {hasPlan ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '20px', padding: '4px 10px' }}>
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
                                <span style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>{client.trip}</span>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '20px', padding: '4px 10px' }}>
                                <AlertCircle size={10} color="#d97706" />
                                <span style={{ fontSize: '11px', color: '#d97706', fontWeight: '600' }}>No plan yet</span>
                              </div>
                            )}
                          </div>

                          {/* Right */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={10} color="#94a3b8" />
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{client.date}</span>
                            </div>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: client.status === 'confirmed' ? '#f0fdf4' : '#fffbeb', color: client.status === 'confirmed' ? '#15803d' : '#d97706', border: `1px solid ${client.status === 'confirmed' ? '#86efac' : '#fcd34d'}` }}>
                              {client.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                            </span>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isOpen ? '#0d9488' : '#f8fafc', border: `1px solid ${isOpen ? '#0d9488' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOpen ? 'white' : '#64748b', transition: 'all 0.2s' }}>
                              {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </div>
                          </div>
                        </div>

                        {/* ── EXPANDED PANEL ── */}
                        {isOpen && (
                          <div style={{ background: 'white', border: '1.5px solid #0d9488', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '20px', animation: 'expand 0.25s ease' }}
                            onClick={e => e.stopPropagation()}>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '24px' }}>

                              {/* LEFT — Edit */}
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Edit3 size={10} /> Edit Client Profile
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Full Name</label>
                                  <input value={editData.name || ''} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} style={inp(false)} placeholder="Client name" />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                  <div>
                                    <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Phone</label>
                                    <input value={editData.phone || ''} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} style={inp(false)} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>City</label>
                                    <input value={editData.city || ''} onChange={e => setEditData(p => ({ ...p, city: e.target.value }))} style={inp(false)} />
                                  </div>
                                </div>

                                {/* Trip requirement ONLY if no plan */}
                                {!hasPlan && (
                                  <div style={{ marginBottom: '10px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Trip Requirement</label>
                                    <input value={editData.trip_requirement || ''} onChange={e => setEditData(p => ({ ...p, trip_requirement: e.target.value }))} style={inp(false)} placeholder="e.g. Goa · 5 days · ₹25,000" />
                                  </div>
                                )}

                                {/* If HAS plan — show current plan info */}
                                {hasPlan && (
                                  <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Current Plan</div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{client.trip}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Use Modify Plan or New Plan to update</div>
                                  </div>
                                )}

                                {/* Status */}
                                <div style={{ marginBottom: '14px' }}>
                                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</label>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {['pending', 'confirmed', 'cancelled'].map(s => (
                                      <button key={s} onClick={() => setEditData(p => ({ ...p, status: s }))}
                                        style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${editData.status === s ? (s === 'confirmed' ? '#22c55e' : s === 'cancelled' ? '#ef4444' : '#f59e0b') : '#e2e8f0'}`, background: editData.status === s ? (s === 'confirmed' ? '#f0fdf4' : s === 'cancelled' ? '#fef2f2' : '#fffbeb') : 'white', color: editData.status === s ? (s === 'confirmed' ? '#15803d' : s === 'cancelled' ? '#dc2626' : '#d97706') : '#64748b', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Client Notes */}
                                <div style={{ marginBottom: '10px' }}>
                                  <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Client Notes (private — not shown to client)
                                  </label>
                                  <textarea
                                    value={editData.notes ?? client.notes ?? ''}
                                    onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="e.g. Prefers window seats, vegetarian, anniversary trip..."
                                    rows={2}
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#0f172a', background: '#fafafa', resize: 'vertical', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleSaveEdit(client.id)} disabled={editSaving}
                                    style={{ flex: 1, padding: '10px', background: editSaving ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: editSaving ? '#94a3b8' : 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: editSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontFamily: 'Inter, sans-serif' }}>
                                    {editSaving ? <><div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Saving...</> : <><Save size={12} />Save Changes</>}
                                  </button>
                                  <button onClick={() => handleDelete(client.id, client.name)}
                                    style={{ padding: '10px 12px', background: 'white', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>
                                    <Trash2 size={12} /> Remove
                                  </button>
                                </div>
                              </div>

                              {/* RIGHT — Context-aware actions */}
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Zap size={10} /> Trip Actions
                                </div>

                                {/* === STATE: NO PLAN === */}
                                {!hasPlan && (
                                  <>
                                    <button className="abtn" onClick={() => openGenerate(client, 'new')}
                                      style={{ width: '100%', padding: '14px 16px', background: 'linear-gradient(135deg,#0f172a,#134e4a)', color: 'white', border: 'none', borderRadius: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                                      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Zap size={15} color="#5eead4" fill="#5eead4" />
                                      </div>
                                      <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700' }}>Generate Trip Plan</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Create their first itinerary</div>
                                      </div>
                                      <ArrowRight size={14} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                                    </button>
                                  </>
                                )}

                                {/* === STATE: HAS PLAN === */}
                                {hasPlan && (
                                  <>
                                    {/* Modify Plan */}
                                    <button className="abtn" onClick={() => openGenerate(client, 'modify')}
                                      style={{ width: '100%', padding: '13px 16px', background: 'linear-gradient(135deg,#0f172a,#134e4a)', color: 'white', border: 'none', borderRadius: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Edit3 size={14} color="#5eead4" />
                                      </div>
                                      <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700' }}>Modify Plan</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Add/remove cities, change dates</div>
                                      </div>
                                      <ArrowRight size={13} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                                    </button>

                                    {/* New Plan */}
                                    <button className="abtn" onClick={() => openGenerate(client, 'new')}
                                      style={{ width: '100%', padding: '13px 16px', background: 'white', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <PlusCircle size={14} color="#0d9488" />
                                      </div>
                                      <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>New Plan</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Start fresh — different destination</div>
                                      </div>
                                      <ArrowRight size={13} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                                    </button>

                                  </>
                                )}

                                {/* WhatsApp */}
                                <button className="abtn" onClick={() => handleWhatsApp(client)}
                                  style={{ width: '100%', padding: '13px 16px', background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac', borderRadius: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MessageCircle size={14} color="#16a34a" />
                                  </div>
                                  <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700' }}>
                                      {hasPlan ? 'Share Plan on WhatsApp' : 'WhatsApp Client'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                      {hasPlan ? 'Send itinerary for confirmation' : 'Send update or reminder'}
                                    </div>
                                  </div>
                                  <ArrowRight size={13} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                                </button>

                                {/* Download PDF — navigate to ItineraryResult if last plan matches this client */}
                                {hasPlan && (
                                  <button className="abtn"
                                    onClick={() => {
                                      // If last generated itinerary is for this client, go to result page for PDF
                                      if (lastItinerary && lastClientName === client.name) {
                                        navigate('/itinerary/result', {
                                          state: { itinerary: lastItinerary, clientName: client.name }
                                        })
                                      } else if (lastItinerary) {
                                        // Last plan exists but for different client — still allow
                                        navigate('/itinerary/result', {
                                          state: { itinerary: lastItinerary, clientName: client.name }
                                        })
                                      } else {
                                        toast('Generate a plan first, then download PDF', { icon: 'ℹ️' })
                                      }
                                    }}
                                    style={{ width: '100%', padding: '13px 16px', background: '#f8fafc', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Download size={14} color="#0d9488" />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0d9488' }}>Download PDF</div>
                                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                                        {lastItinerary && (lastClientName === client.name || lastItinerary)
                                          ? 'Opens plan — download branded PDF'
                                          : 'Generate a plan first'}
                                      </div>
                                    </div>
                                    <ArrowRight size={13} color="#0d9488" style={{ marginLeft: 'auto' }} />
                                  </button>
                                )}

                                {/* View Last Generated Plan — always visible if exists */}
                                {lastItinerary && (
                                  <button className="abtn"
                                    onClick={() => navigate('/itinerary/result', {
                                      state: { itinerary: lastItinerary, clientName: lastClientName }
                                    })}
                                    style={{ width: '100%', padding: '13px 16px', background: '#f5f3ff', color: '#6d28d9', border: '1.5px solid #ddd6fe', borderRadius: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Eye size={14} color="#7c3aed" />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                      <div style={{ fontSize: '13px', fontWeight: '700' }}>View Last Plan</div>
                                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                                        {lastItinerary.destination} · {lastItinerary.days} days
                                        {lastClientName ? ` · ${lastClientName}` : ''}
                                      </div>
                                    </div>
                                    <ArrowRight size={13} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                                  </button>
                                )}

                                {/* Call */}
                                <a href={`tel:${client.phone}`} style={{ textDecoration: 'none' }}>
                                  <button className="abtn"
                                    style={{ width: '100%', padding: '13px 16px', background: '#f0f9ff', color: '#0369a1', border: '1.5px solid #bae6fd', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Phone size={14} color="#0284c7" />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                      <div style={{ fontSize: '13px', fontWeight: '700' }}>Call Client</div>
                                      <div style={{ fontSize: '11px', color: '#64748b' }}>{client.phone}</div>
                                    </div>
                                    <ArrowRight size={13} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                                  </button>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════
              GENERATE TAB
          ════════════════════════════════════ */}
          {activeTab === 'generate' && (
            <div style={{ padding: '24px' }}>
              {/* Client + mode banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', marginBottom: '20px', background: generateMode === 'modify' ? '#fffbeb' : '#f0fdfa', border: `1px solid ${generateMode === 'modify' ? '#fcd34d' : '#99f6e4'}`, borderRadius: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: selectedClient.avatar_color || getColor(selectedClient.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '800', flexShrink: 0 }}>
                  {selectedClient.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    {generateMode === 'modify' ? `✏️ Modifying plan for: ${selectedClient.name}` : `✨ New plan for: ${selectedClient.name}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {generateMode === 'modify'
                      ? 'Current: ' + selectedClient.trip + ' — describe changes below'
                      : selectedClient.city + ' — choose plan type below'}
                  </div>
                </div>
                <button onClick={() => { setSelectedClient(null); setActiveTab('clients') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={15} />
                </button>
              </div>

              {/* Mode selector */}
              <div style={{ display: 'flex', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px', gap: '3px', marginBottom: '20px' }}>
                {[
                  { id: 'quick',   label: '⚡ Quick' },
                  { id: 'detailed',label: '🎯 Detailed' },
                  { id: 'custom',  label: '✍️ Circuit / Custom' },
                ].map(m => (
                  <button key={m.id}
                    onClick={() => { setPlanMode(m.id); if (m.id === 'detailed') setShowDetailed(true) }}
                    style={{ flex: 1, padding: '9px 10px', borderRadius: '9px', border: 'none', background: planMode === m.id ? 'white' : 'transparent', color: planMode === m.id ? '#0f172a' : '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', boxShadow: planMode === m.id ? '0 2px 8px rgba(0,0,0,0.09)' : 'none' }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* QUICK + DETAILED */}
              {planMode !== 'custom' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '14px' }}>
                    {[
                      { label: 'From City', val: from, set: setFrom, ph: 'Kolkata', type: 'text' },
                      { label: 'Days', val: days, set: setDays, ph: '5', type: 'number' },
                      { label: 'Budget (₹)', val: budget, set: setBudget, ph: '25000', type: 'number' },
                    ].map(f => (
                      <div key={f.label}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{f.label}</label>
                        <input type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} style={inp(false)} />
                        {f.label === 'Budget (₹)' && budget && days && <p style={{ fontSize: '10px', color: '#0ea5e9', marginTop: '2px', fontWeight: '600' }}>≈ ₹{Math.round(budget/days).toLocaleString('en-IN')}/day</p>}
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Trip Type</label>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {TRIP_TYPES.map(t => (
                          <button key={t} className="chip" onClick={() => setTripType(tripType === t ? '' : t)}
                            style={{ padding: '5px 9px', borderRadius: '20px', border: `1.5px solid ${tripType === t ? '#0d9488' : '#e2e8f0'}`, background: tripType === t ? '#f0fdfa' : 'white', color: tripType === t ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {planMode === 'quick' && (
                    <button onClick={() => { setShowDetailed(!showDetailed); if (!showDetailed) setPlanMode('detailed') }}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0, marginBottom: '14px', fontFamily: 'Inter, sans-serif' }}>
                      <Settings2 size={12} /> Add destination, dates & tier
                      {showDetailed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}

                  {(showDetailed || planMode === 'detailed') && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Destination</label>
                          <input type="text" placeholder="Goa, Manali..." value={destination} onChange={e => setDestination(e.target.value)} style={inp(false)} />
                          {!destination && <p style={{ fontSize: '10px', color: '#8b5cf6', marginTop: '2px' }}>Leave blank → AI suggests</p>}
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Start Date</label>
                          <input type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={e => setStartDate(e.target.value)} style={{ ...inp(false), colorScheme: 'light' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tier</label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {TIERS.map(t => (
                            <button key={t.id} className="chip" onClick={() => setTier(t.id)}
                              style={{ padding: '6px 12px', borderRadius: '20px', border: `1.5px solid ${tier === t.id ? t.color : '#e2e8f0'}`, background: tier === t.id ? t.bg : 'white', color: tier === t.id ? t.color : '#64748b', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>
                              {t.emoji} {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Transport</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {['cheapest', 'balanced', 'fastest'].map(m => (
                            <button key={m} className="chip" onClick={() => setTransport(m)}
                              style={{ padding: '6px 12px', borderRadius: '20px', border: `1.5px solid ${transport === m ? '#0d9488' : '#e2e8f0'}`, background: transport === m ? '#f0fdfa' : 'white', color: transport === m ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize', transition: 'all 0.15s' }}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div onClick={() => setPlanMode('custom')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', marginTop: '14px', background: '#faf5ff', border: '1px dashed #c4b5fd', borderRadius: '10px', cursor: 'pointer' }}>
                    <Route size={12} color="#8b5cf6" />
                    <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '700' }}>Multi-city circuit or custom modifications?</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>Switch →</span>
                  </div>
                </div>
              )}

              {/* CUSTOM */}
              {planMode === 'custom' && (
                <div style={{ animation: 'fadeUp 0.25s ease' }}>
                  <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,#f0fdfa,#eff6ff)', border: '1px solid #99f6e4', borderRadius: '12px', marginBottom: '14px', display: 'flex', gap: '10px' }}>
                    <Route size={16} color="#0d9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                        {generateMode === 'modify' ? 'Describe the changes to make' : 'Circuit / Custom Planner'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Hindi, English or mixed — AI understands all</div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <textarea value={customText} onChange={e => setCustomText(e.target.value.slice(0, 500))}
                      placeholder={generateMode === 'modify'
                        ? `Describe changes to the current plan...\n\nExamples:\n• Remove Munnar, add Coorg instead\n• Extend by 2 days, add Kovalam beach\n• Change to Gold tier hotels throughout`
                        : `Type full trip details...\n\n• 2 days Darjeeling + 2 days Gangtok from Kolkata, ₹18,000\n• Rajasthan — Jaipur 3 days, Jodhpur 2 days, Jaisalmer 2 days`}
                      style={{ width: '100%', minHeight: '140px', padding: '12px', background: '#f8fafc', border: `1.5px solid ${customText.length > 0 ? '#0d9488' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '13px', color: '#0f172a', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', lineHeight: 1.7 }} />
                    <span style={{ position: 'absolute', bottom: '9px', right: '11px', fontSize: '10px', color: '#94a3b8' }}>{customText.length}/500</span>
                  </div>

                  {generateMode === 'new' && (
                    <>
                      <button onClick={() => setShowSamples(!showSamples)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#0d9488', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0, marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}>
                        💡 {showSamples ? 'Hide' : 'Show'} examples {showSamples ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {showSamples && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', animation: 'fadeUp 0.2s ease' }}>
                          {SAMPLE_PROMPTS.map((p, i) => (
                            <div key={i} className="samp" onClick={() => setCustomText(p)}
                              style={{ padding: '8px 12px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', color: '#374151', transition: 'all 0.15s' }}>
                              {p}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* GENERATE BUTTON */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button className="gbtn" onClick={handleGenerate} disabled={generating}
                  style={{ padding: '13px 28px', background: generating ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: generating ? '#94a3b8' : 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: !generating ? '0 4px 16px rgba(13,148,136,0.4)' : 'none', transition: 'all 0.2s' }}>
                  {generating
                    ? <><div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Generating...</>
                    : <><Zap size={15} fill="white" />{generateMode === 'modify' ? 'Regenerate Plan' : planMode === 'custom' ? 'Build Circuit Plan' : 'Generate Itinerary'}</>}
                </button>
                {selectedClient && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {generateMode === 'modify' ? 'Replaces current plan' : 'New plan'} for <strong style={{ color: '#0d9488' }}>{selectedClient.name}</strong>
                  </span>
                )}
              </div>

              {/* View Last Plan — always visible after generation */}
              {lastItinerary && (
                <div style={{ marginTop: '16px', padding: '14px 18px', background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeUp 0.3s ease' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Eye size={16} color="#7c3aed" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#6d28d9' }}>Last generated plan is ready</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {lastItinerary.destination} · {lastItinerary.days} days
                      {lastClientName ? ` · For ${lastClientName}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/itinerary/result', {
                      state: { itinerary: lastItinerary, clientName: lastClientName }
                    })}
                    style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                    View Full Plan →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════
              INVOICES TAB
          ════════════════════════════════════ */}
          {activeTab === 'invoices' && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: '#f5f3ff', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '26px' }}>📄</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoice Generator</h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '300px', margin: '0 auto 18px', lineHeight: 1.7 }}>Professional branded invoices with your agency logo. Coming in Module 4.</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 16px', background: '#f5f3ff', color: '#8b5cf6', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: '1px solid #ddd6fe' }}>
                ✨ Module 4 — Coming Soon
              </span>
            </div>
          )}

          {/* ════════════════════════════════════
              PROFILE TAB — redirect to /agent/profile
          ════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Settings2 size={26} color="white" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {user?.business_name || 'Your Agency'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '340px', margin: '0 auto 20px', lineHeight: 1.7 }}>
                Set your agency name, logo, brand colour, and contact details. These appear on all PDF exports and WhatsApp messages.
              </p>
              <button
                onClick={() => navigate('/agent/profile')}
                style={{ padding: '12px 26px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 14px rgba(13,148,136,0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Settings2 size={15} /> Edit Agency Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
