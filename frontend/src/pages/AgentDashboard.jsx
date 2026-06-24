import { useState, useEffect, useRef } from 'react'
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
import FestivalAlert from '../components/FestivalAlert'

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
  '2 days Darjeeling + 2 days Gangtok from Kolkata, ₹18,000, couple, starting March 15',
  'Rajasthan circuit — Jaipur 3 days, Jodhpur 2 days, Jaisalmer 2 days, ₹35,000, from Delhi, October',
  'Kerala — Kochi 1 day, Alleppey 2 days, Munnar 2 days, family, ₹40,000, starting December 20',
  'Ladakh adventure — Leh 4 days, Nubra 2 days, Pangong 1 day, solo, ₹45,000, from Delhi, July',
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
  const [clientTrips, setClientTrips]       = useState({})   // { clientId: [trip, ...] }
  const [loadingTrips, setLoadingTrips]     = useState({})   // { clientId: true/false }
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
  const [customExtractedDate, setCustomExtractedDate] = useState(null)
  const [tier, setTier]                     = useState('silver')
  const [transport, setTransport]           = useState('balanced')
  const [customText, setCustomText]         = useState('')
  const [promptWarning, setPromptWarning]   = useState('')
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

  // ── Generate step state (was missing — crash fix) ────────────
  const [genStep, setGenStep] = useState(0)
  const GEN_STEPS = [
    '🗺️ Understanding your trip...',
    '🏨 Finding best hotels...',
    '🚆 Planning transport routes...',
    '📍 Discovering places to visit...',
    '💰 Calculating budget breakdown...',
    '🎪 Checking festival alerts...',
    '✨ Finalising your itinerary...',
  ]

  // ── Interval ref (replaces window._genStepInterval) ─────────
  const genStepIntervalRef = useRef(null)

  // ── AI city check state (replaces hardcoded INDIA_LOCATIONS) ─
  const [cityCheckWarning, setCityCheckWarning]   = useState('')
  const [cityCheckLoading, setCityCheckLoading]   = useState(false)
  const cityCheckTimerRef      = useRef(null)
  const cityCheckRequestIdRef  = useRef(0)
  const isMountedRef           = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (cityCheckTimerRef.current) clearTimeout(cityCheckTimerRef.current)
    }
  }, [])

  const token = () => localStorage.getItem('tripzio_token')

  useEffect(() => { fetchClients() }, [])

  // ── Fetch trip history for a client ──────────
  const fetchClientTrips = async (clientId) => {
    if (clientTrips[clientId]) return // already loaded
    setLoadingTrips(p => ({ ...p, [clientId]: true }))
    try {
      const r = await fetch(`${API_URL}/itinerary/history/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (r.ok) {
        const d = await r.json()
        setClientTrips(p => ({ ...p, [clientId]: d.trips || [] }))
      }
    } catch (e) {
      console.log('Trip history fetch failed:', e)
    } finally {
      setLoadingTrips(p => ({ ...p, [clientId]: false }))
    }
  }

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
      fetchClientTrips(client.id)
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
      const d = await r.json()
      if (!r.ok) { throw new Error(d?.detail || 'Request failed') }
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
    setGenStep(0)
    genStepIntervalRef.current = setInterval(() => {
      setGenStep(p => p < 6 ? p + 1 : p)
    }, 4000)
    try {
      let endpoint, body
      if (planMode === 'custom') {
        if (customText.trim().length < 10) {
          toast.error('Please describe the trip in more detail')
          clearInterval(genStepIntervalRef.current)
          setGenerating(false)
          return
        }
        endpoint = `${API_URL}/itinerary/generate-custom`
        body = { free_text: customText.trim(), start_date: customExtractedDate || null, client_id: selectedClient?.id || null }
      } else {
        if (!from.trim() || !days || !budget) {
          toast.error('Fill From city, Days and Budget')
          clearInterval(genStepIntervalRef.current)
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
          client_id: selectedClient?.id || null,
        }
      }

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body)
      })
      const data = await r.json()
      if (!r.ok) { throw new Error(data?.detail || 'Generation failed') }

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
    finally {
      clearInterval(genStepIntervalRef.current)
      setGenerating(false)
      setGenStep(0)
    }
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
    { id: 'clients',   icon: '👥', label: 'Clients' },
    { id: 'generate',  icon: '✨', label: selectedClient ? `Plan: ${selectedClient.name.split(' ')[0]}` : 'Generate Trip' },
    { id: 'analytics', icon: '📊', label: 'Analytics' },
    { id: 'invoices',  icon: '📄', label: 'Invoices' },
    { id: 'profile',   icon: '⚙️', label: 'Profile' },
  ]

  
  // ── Real-time prompt validation ─────────────────────────────
  const validatePromptRealTime = (text) => {
    if (!text || text.length < 8) return ''
    const t = text.toLowerCase()

    const VALID_MONTHS = new Set([
      'jan','january','feb','february','mar','march','apr','april',
      'may','jun','june','jul','july','aug','august','sep','september',
      'oct','october','nov','november','dec','december'
    ])

    // City validation is AI-powered via checkCityWithAI → /itinerary/check-city (Haiku, fail-open)
    // INDIA_LOCATIONS hardcoded set removed — no static city list anywhere in this file

    // ── 1. Invalid year — only when after month name or "year" keyword ──
    // Avoids flagging budget numbers like 20000, 25000 as years
    const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
    const yearAfterMonth = t.match(new RegExp(MONTH_RE + '\\s+(\\d{5,})', 'i'))
    const yearAfterOrdinal = t.match(/\b\d{1,2}(?:st|nd|rd|th)\s+\w+\s+(\d{5,})/i)
    const yearKeyword = t.match(/\byear\s+(\d{4,})/i)
    for (const m of [yearAfterMonth, yearAfterOrdinal, yearKeyword]) {
      if (m) {
        const yr = parseInt(m[m.length - 1])
        if (yr > 2035 || (yr > 2000 && yr < 2025)) {
          return `❌ "${m[m.length - 1]}" doesn't look like a valid travel year. Please use 2025 to 2035.`
        }
      }
    }

    // ── 2. Invalid numeric dates (dd/mm/yyyy) ─────────────────
    const numDates = [...t.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g)]
    for (const m of numDates) {
      const day = parseInt(m[1]), mon = parseInt(m[2])
      const yr = m[3].length === 4 ? parseInt(m[3]) : parseInt('20' + m[3])
      if (mon < 1 || mon > 12) return `❌ Invalid date — month "${m[2]}" doesn't exist. Months are 1 to 12.`
      const maxDays = [0,31,29,31,30,31,30,31,31,30,31,30,31]
      if (day < 1 || day > maxDays[mon]) return `❌ Invalid date — ${m[1]}/${m[2]} doesn't exist.`
      if (yr > 2035 || yr < 2025) return `❌ Invalid year "${m[3]}" — please use 2025 to 2035.`
    }

    // ── 3. Ordinal + invalid month word (e.g. "3rd FRB") ──────
    const ordinalMonth = [...t.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\s+([a-z]{2,15})\b/g)]
    for (const m of ordinalMonth) {
      const word = m[2].toLowerCase()
      if (!VALID_MONTHS.has(word)) {
        return `❌ "${m[2].toUpperCase()}" is not a valid month. Did you mean Jan, Feb, Mar... Dec?`
      }
    }

    // ── 4. Written invalid dates (Feb 30, March 45) ───────────
    const monthDays = {
      'january':31,'jan':31,'february':29,'feb':29,'march':31,'mar':31,
      'april':30,'apr':30,'may':31,'june':30,'jun':30,'july':31,'jul':31,
      'august':31,'aug':31,'september':30,'sep':30,'october':31,'oct':31,
      'november':30,'nov':30,'december':31,'dec':31
    }
    for (const [mon, maxD] of Object.entries(monthDays)) {
      const r1 = new RegExp(`\\b${mon}\\s+(\\d{1,2})\\b`, 'i')
      const r2 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${mon}\\b`, 'i')
      for (const r of [r1, r2]) {
        const m = t.match(r)
        if (m) {
          const day = parseInt(m[1])
          if (day > maxD) return `❌ Invalid date — ${mon.charAt(0).toUpperCase()+mon.slice(1)} ${day} doesn't exist.`
          if (day < 1) return `❌ Invalid date — day must be 1 or more.`
        }
      }
    }

    // ── 5. Source city check ──────────────────────────────────
    // Handled asynchronously by checkCityWithAI (fires on from-field blur,
    // or debounced on custom text when from field is empty).
    // validatePromptRealTime is synchronous — city validity is async only.

    return ''
  }

  // ── Extract date from custom plan text ───────────────────────
  const extractDateFromText = (text) => {
    try {
      if (!text || text.length < 5) return null
      const t = text.toLowerCase()
      const now = new Date()
      const year = now.getFullYear()

      // BLOCK: if text contains a past year (e.g. 2023, 2024) — don't extract date
      const pastYearMatch = t.match(/\b(20[0-2][0-9])\b/)
      if (pastYearMatch) {
        const yr = parseInt(pastYearMatch[1])
        if (yr < year) return null  // past year mentioned — ignore
      }

      const months = {
        'january':1,'jan':1,'february':2,'feb':2,
        'march':3,'mar':3,'april':4,'apr':4,
        'may':5,'june':6,'jun':6,'july':7,'jul':7,
        'august':8,'aug':8,'september':9,'sep':9,
        'october':10,'oct':10,'november':11,'nov':11,
        'december':12,'dec':12,
      }

      // Normalise ordinal suffixes: "20th"→"20", "1st"→"1", "3rd"→"3"
      const norm = t.replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, '$1')

      // PRIORITY 0: Numeric date formats — dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
      // e.g. "15/08/2026", "15-08-2026", "15.08.2026"
      const numericFull = norm.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/)
      if (numericFull) {
        const day = parseInt(numericFull[1])
        const mon = parseInt(numericFull[2])
        const yr  = parseInt(numericFull[3])
        if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31 && yr >= year) {
          return `${yr}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        }
      }

      // dd/mm or dd-mm (no year) e.g. "15/08", "trip on 26/01"
      const numericShort = norm.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/)
      if (numericShort) {
        const day = parseInt(numericShort[1])
        const mon = parseInt(numericShort[2])
        if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
          return makeDate(year, mon, day)
        }
      }

      // "next month" / "this month"
      if (t.includes('next month')) {
        const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      }
      if (t.includes('this month')) {
        return now.toISOString().split('T')[0]
      }

      // Season keywords
      const seasonMap = {
        'this winter':'12','next winter':'12','winter trip':'12','winter vacation':'12',
        'this summer':'05','next summer':'05','summer trip':'05','summer vacation':'05',
        'this monsoon':'07','next monsoon':'07','monsoon trip':'07',
        'this spring':'03','spring trip':'03',
      }
      for (const [kw, mon] of Object.entries(seasonMap)) {
        if (t.includes(kw)) {
          const m = parseInt(mon)
          return makeDate(year, m, 1)
        }
      }

      // Helper — build date string and auto-advance to next year if past
      // NO Date object conversion — avoids IST timezone offset bug completely
      const makeDate = (y, m, d) => {
        const pad = n => String(n).padStart(2, '0')
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
        const dateStr  = `${y}-${pad(m)}-${pad(d)}`
        if (dateStr < todayStr) return `${y+1}-${pad(m)}-${pad(d)}`
        return dateStr
      }

      // PRIORITY 1: "Month Day Year" — "Jan 10 2026", "January 10 2026"
      const mdyMatch = norm.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\s+(\d{4})/i)
      if (mdyMatch) {
        const mon = months[mdyMatch[1].toLowerCase()]
        const day = parseInt(mdyMatch[2])
        const yr  = parseInt(mdyMatch[3])
        if (mon && day >= 1 && day <= 31 && yr >= year) {
          return makeDate(yr, mon, day)
        }
      }

      // PRIORITY 2: "Day Month Year" — "10 Jan 2026"
      const dmyMatch = norm.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i)
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1])
        const mon = months[dmyMatch[2].toLowerCase()]
        const yr  = parseInt(dmyMatch[3])
        if (mon && day >= 1 && day <= 31 && yr >= year) {
          return makeDate(yr, mon, day)
        }
      }

      // PRIORITY 3: "Month Day" — "March 3", "January 20", "starting August 26"
      const mdMatch = norm.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b/i)
      if (mdMatch) {
        const mon = months[mdMatch[1].toLowerCase()]
        const day = parseInt(mdMatch[2])
        if (mon && day >= 1 && day <= 31) {
          return makeDate(year, mon, day)
        }
      }

      // PRIORITY 4: "Day Month" — "20 January", "10 September se"
      const dmMatch = norm.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)/i)
      if (dmMatch) {
        const day = parseInt(dmMatch[1])
        const mon = months[dmMatch[2].toLowerCase()]
        if (mon && day >= 1 && day <= 31) {
          return makeDate(year, mon, day)
        }
      }

      // PRIORITY 3: Festival keywords → exact date
      const festivalMap = {
        'republic day':`${year}-01-26`,
        'holi':`${year}-03-03`,'होली':`${year}-03-03`,
        'baisakhi':`${year}-04-13`,'vaisakhi':`${year}-04-13`,
        'independence day':`${year}-08-15`,
        'onam':`${year}-08-26`,
        'janmashtami':`${year}-08-23`,
        'ganesh chaturthi':`${year}-09-10`,'ganesh':`${year}-09-10`,'ganapati':`${year}-09-10`,
        'navratri':`${year}-10-09`,'नवरात्रि':`${year}-10-09`,'garba':`${year}-10-09`,
        'dussehra':`${year}-10-19`,'dasara':`${year}-10-19`,
        'diwali':`${year}-11-07`,'दिवाली':`${year}-11-07`,'deepawali':`${year}-11-07`,
        'pushkar':`${year}-11-01`,
        'christmas':`${year}-12-24`,'xmas':`${year}-12-24`,
        'new year':`${year}-12-31`,'new years':`${year}-12-31`,
        'sunburn':`${year}-12-27`,
        'buddha purnima':`${year}-05-12`,
      }
      for (const [kw, date] of Object.entries(festivalMap)) {
        if (t.includes(kw)) return date
      }

      // PRIORITY 4: Month only — "October mein", "in December", "December mein"
      const moMatch = norm.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i)
      if (moMatch) {
        const mon = months[moMatch[1].toLowerCase()]
        if (mon) {
          return makeDate(year, mon, 1)
        }
      }

      // Hindi month keywords
      const hindiMap = {
        'january mein':1,'february mein':2,'march mein':3,'april mein':4,
        'may mein':5,'june mein':6,'july mein':7,'august mein':8,
        'september mein':9,'october mein':10,'november mein':11,'december mein':12,
        'अक्टूबर':10,'नवम्बर':11,'दिसम्बर':12,'मार्च':3,'अगस्त':8,
      }
      for (const [kw, mon] of Object.entries(hindiMap)) {
        if (t.includes(kw)) {
          return makeDate(year, mon, 1)
        }
      }

      return null
    } catch(e) { return null }
  }

  // ── AI-powered city check (replaces INDIA_LOCATIONS hardcoded set) ──
  // from-field: fires on blur (discrete input, single city word, no debounce needed)
  // custom text: fires debounced 1.2s, only when from field is empty
  const checkCityWithAI = (cityWord, { debounce = false } = {}) => {
    if (cityCheckTimerRef.current) clearTimeout(cityCheckTimerRef.current)
    if (!cityWord || cityWord.trim().length < 3) {
      setCityCheckWarning('')
      return
    }
    cityCheckRequestIdRef.current += 1
    const myRequestId = cityCheckRequestIdRef.current

    const doCheck = async () => {
      try {
        setCityCheckLoading(true)
        const token = localStorage.getItem('tripzio_token')
        const res = await fetch(`${API_URL}/itinerary/check-city`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ city: cityWord.trim() })
        })
        const data = await res.json()
        if (myRequestId !== cityCheckRequestIdRef.current) return
        if (!isMountedRef.current) return
        if (res.ok && data.valid === false) {
          setCityCheckWarning(
            data.suggestion
              ? `❌ "${cityWord.trim()}" doesn't look right — did you mean "${data.suggestion}"?`
              : `❌ "${cityWord.trim()}" doesn't seem to be a valid Indian city.`
          )
        } else {
          setCityCheckWarning('')
        }
      } catch {
        if (myRequestId === cityCheckRequestIdRef.current && isMountedRef.current) {
          setCityCheckWarning('')  // fail open — never block agent on network error
        }
      } finally {
        if (myRequestId === cityCheckRequestIdRef.current && isMountedRef.current) {
          setCityCheckLoading(false)
        }
      }
    }

    if (debounce) {
      cityCheckTimerRef.current = setTimeout(doCheck, 1200)
    } else {
      doCheck()
    }
  }

  // ── Validate date is not in past ─────────────────────────
  const isValidFutureDate = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d >= today
  }

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

                            {/* ── TRIP HISTORY ── */}
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Clock size={10} /> Trip History
                                {clientTrips[client.id]?.length > 0 && (
                                  <span style={{ background: '#0d9488', color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: '800', marginLeft: '4px' }}>
                                    {clientTrips[client.id].length}
                                  </span>
                                )}
                              </div>
                              {loadingTrips[client.id] ? (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Loading...</div>
                              ) : clientTrips[client.id]?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {clientTrips[client.id].map((trip, ti) => (
                                    <div key={trip.id || ti}
                                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.borderColor = '#99f6e4' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                                      onClick={() => navigate('/itinerary/result', { state: { itinerary: trip.itinerary, clientName: client.name } })}
                                    >
                                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>
                                        🗺️
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{trip.destination}</div>
                                        <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                                          <span>📅 {trip.days} days</span>
                                          {trip.budget > 0 && <span>💰 ₹{trip.budget?.toLocaleString('en-IN')}</span>}
                                          {trip.plan_tier && <span style={{ textTransform: 'capitalize' }}>🏅 {trip.plan_tier}</span>}
                                          <span style={{ color: '#94a3b8' }}>{new Date(trip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={e => { e.stopPropagation(); navigate('/itinerary/result', { state: { itinerary: trip.itinerary, clientName: client.name } }) }}
                                        style={{ padding: '4px 10px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                                        View
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : clientTrips[client.id] !== undefined ? (
                                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '11px', color: '#92400e' }}>
                                  No trip history yet — generate a plan to start tracking
                                </div>
                              ) : null}
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
                        <input
                          type={f.type}
                          placeholder={f.ph}
                          value={f.val}
                          onChange={e => {
                            f.set(e.target.value)
                            if (f.label === 'From City') setCityCheckWarning('')
                          }}
                          onBlur={f.label === 'From City' ? e => {
                            const val = e.target.value.trim()
                            if (val.length >= 3) checkCityWithAI(val)
                            else setCityCheckWarning('')
                          } : undefined}
                          style={inp(f.label === 'From City' && cityCheckWarning)}
                        />
                        {f.label === 'From City' && cityCheckWarning && (
                          <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontWeight: '600', lineHeight: 1.4 }}>{cityCheckWarning}</p>
                        )}
                        {f.label === 'From City' && cityCheckLoading && !cityCheckWarning && (
                          <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>Checking city...</p>
                        )}
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
                          {startDate && !isValidFutureDate(startDate) && (
                            <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                              ⚠️ Please select a future date
                            </p>
                          )}
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
                    <textarea value={customText} onChange={e => {
                      const val = e.target.value.slice(0, 500)
                      setCustomText(val)
                      setCustomExtractedDate(extractDateFromText(val))
                      const intlWords = ['london','paris','dubai','singapore','usa','america','europe','australia','japan','china','thailand','maldives','tokyo','new york','san francisco','los angeles','canada','italy','spain','germany','france','switzerland','korea','vietnam','indonesia','philippines','malaysia','sri lanka','nepal','bhutan','pakistan','egypt','africa','brazil','mexico','abroad','international','foreign','overseas','outside india','world tour']
                      const shortIntlWords = new Set(['uk','us','eu','rio','iran','oman','uae','cuba','iraq','seoul','rome','milan','vienna','geneva','zurich'])
                      const t_intl = val.toLowerCase()
                      const hasIntl = intlWords.some(w => t_intl.includes(w)) || [...shortIntlWords].some(w => new RegExp('\\b' + w + '\\b').test(t_intl))
                      if (!hasIntl) { setPromptWarning(validatePromptRealTime(val)) }
                      else { setPromptWarning('') }
                      // AI city check on custom text — only when from field is empty
                      // (if from is filled, it was already validated on blur)
                      if (!from.trim()) {
                        const fromMatch = val.match(/(?:from|starting from|travelling from)\s+([a-zA-Z]{3,25})(?:\s|,|$|\.)/i)
                        const seMatch   = val.match(/([a-zA-Z]{3,25})\s+se\b/i)
                        const cityWord  = fromMatch?.[1] || seMatch?.[1] || null
                        if (cityWord) checkCityWithAI(cityWord, { debounce: true })
                        else setCityCheckWarning('')
                      }
                    }}
                      placeholder={generateMode === 'modify'
                        ? `Describe changes to the current plan...\n\nExamples:\n• Remove Munnar, add Coorg instead\n• Extend by 2 days, add Kovalam beach\n• Change to Gold tier hotels throughout`
                        : `Type full trip details...\n\n• 2 days Darjeeling + 2 days Gangtok from Kolkata, ₹18,000, starting March 15\n• Rajasthan — Jaipur 3 days, Jodhpur 2 days, Jaisalmer 2 days, October, from Delhi`}
                      style={{ width: '100%', minHeight: '140px', padding: '12px', background: '#f8fafc', border: `1.5px solid ${customText.length > 0 ? '#0d9488' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '13px', color: '#0f172a', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', lineHeight: 1.7 }} />
                    <span style={{ position: 'absolute', bottom: '9px', right: '11px', fontSize: '10px', color: '#94a3b8' }}>{customText.length}/500</span>
                  </div>

                  {/* Real-time prompt warning */}
                  {promptWarning && generateMode === 'new' && (
                    <div style={{ marginBottom: '10px', padding: '11px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b' }}>{promptWarning}</div>
                        <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '3px' }}>Please fix this before generating the trip plan.</div>
                      </div>
                    </div>
                  )}

                  {/* AI city check warning */}
                  {cityCheckWarning && (
                    <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>📍</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#991b1b' }}>{cityCheckWarning}</span>
                    </div>
                  )}

                  {/* Smart festival alert — no date field needed */}
                  {generateMode === 'new' && customText.length > 10 && !promptWarning && (
                    <div style={{ marginBottom: '10px' }}>
                      {customExtractedDate && (
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', width: 'fit-content' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488' }}>
                              📅 Date detected: {new Date(customExtractedDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          {(() => {
                            const now = new Date()
                            const typed = customText.match(/20[0-2][0-9]/)
                            const typedYear = typed ? parseInt(typed[0]) : null
                            const detectedYear = parseInt(customExtractedDate.split('-')[0])
                            const isAdvanced = (typedYear && typedYear < detectedYear) ||
                                               (typedYear && typedYear === now.getFullYear() &&
                                                new Date(typedYear + '-' + customExtractedDate.slice(5) + 'T12:00:00') < now)
                            return isAdvanced ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', padding: '5px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', width: 'fit-content' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400e' }}>
                                  ⚠️ That date has passed — planning for: {new Date(customExtractedDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                      <FestivalAlert
                        destination={customText.slice(0, 120)}
                        startDate={customExtractedDate && isValidFutureDate(customExtractedDate) ? customExtractedDate : null}
                        days={7}
                        compact={true}
                      />
                    </div>
                  )}

                  {/* Soft nudge — no date detected */}
                  {generateMode === 'new' && customText.length > 20 && !customExtractedDate && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '10px 14px', marginBottom: '10px',
                      background: '#f0f9ff', border: '1px solid #bae6fd',
                      borderRadius: '10px',
                    }}>
                      <span style={{ fontSize: '15px', flexShrink: 0 }}>💡</span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>
                          Add travel dates for festival alerts & price planning
                        </div>
                        <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', lineHeight: 1.5 }}>
                          e.g. <strong>"...starting March 3"</strong> or <strong>"...in December"</strong> or <strong>"...during Diwali"</strong>
                        </div>
                      </div>
                    </div>
                  )}

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
                <button className="gbtn" onClick={handleGenerate} disabled={generating || (customExtractedDate && !isValidFutureDate(customExtractedDate)) || !!promptWarning || !!cityCheckWarning}
                  style={{ padding: '13px 28px', background: generating ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: generating ? '#94a3b8' : 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: !generating ? '0 4px 16px rgba(13,148,136,0.4)' : 'none', transition: 'all 0.2s' }}>
                  {generating
                    ? <><div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />{GEN_STEPS[genStep]}</>
                    : <><Zap size={15} fill="white" />{generateMode === 'modify' ? 'Regenerate Plan' : planMode === 'custom' ? 'Build Circuit Plan' : 'Generate Itinerary'}</>}
                </button>

                {/* Progress bar during generation */}
                {generating && (
                  <div style={{ width: '100%', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '5px' }}>
                      {GEN_STEPS.map((_, i) => (
                        <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= genStep ? '#0d9488' : '#e2e8f0', transition: 'background 0.4s' }} />
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0, textAlign: 'center' }}>
                      Step {genStep + 1} of {GEN_STEPS.length} · Usually 15-30 seconds
                    </p>
                  </div>
                )}

                {selectedClient && !generating && (
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
              ANALYTICS TAB
          ════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div style={{ padding: '24px', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>Agency Performance</div>
                <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>Analytics Dashboard</h2>
              </div>

              {/* ── Stats Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '28px' }}>
                {[
                  { label: 'Total Clients',    val: clients.length,                                              color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
                  { label: 'Plans Generated',  val: clients.filter(c => c.trip && c.trip !== 'Not planned yet').length, color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
                  { label: 'Confirmed Trips',  val: clients.filter(c => c.status === 'confirmed').length,        color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
                  { label: 'Pending',          val: clients.filter(c => c.status === 'pending').length,          color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
                ].map((s, i) => (
                  <div key={i} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: '16px', padding: '18px' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Conversion Rate ── */}
              {clients.length > 0 && (
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>Conversion Pipeline</div>
                  {[
                    { label: 'Enquiries (Total Clients)', val: clients.length, color: '#64748b', pct: 100 },
                    { label: 'Plans Generated',           val: clients.filter(c => c.trip && c.trip !== 'Not planned yet').length, color: '#8b5cf6', pct: Math.round(clients.filter(c => c.trip && c.trip !== 'Not planned yet').length / clients.length * 100) },
                    { label: 'Confirmed Bookings',        val: clients.filter(c => c.status === 'confirmed').length, color: '#16a34a', pct: Math.round(clients.filter(c => c.status === 'confirmed').length / clients.length * 100) },
                    { label: 'Completed Trips',           val: clients.filter(c => c.status === 'completed').length, color: '#0d9488', pct: Math.round(clients.filter(c => c.status === 'completed').length / clients.length * 100) },
                  ].map((row, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{row.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: row.color }}>{row.val} ({row.pct}%)</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: '4px', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Top Destinations ── */}
              {clients.length > 0 && (() => {
                const destCount = {}
                clients.forEach(c => {
                  if (c.trip && c.trip !== 'Not planned yet') {
                    const dest = c.trip.split('·')[0].trim()
                    destCount[dest] = (destCount[dest] || 0) + 1
                  }
                })
                const topDests = Object.entries(destCount).sort((a,b) => b[1]-a[1]).slice(0,5)
                if (topDests.length === 0) return null
                return (
                  <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>Top Destinations</div>
                    {topDests.map(([dest, count], i) => {
                      const colors = ['#0d9488','#8b5cf6','#f59e0b','#3b82f6','#ef4444']
                      return (
                        <div key={dest} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: colors[i % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: 'white', flexShrink: 0 }}>{i+1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{dest}</span>
                              <span style={{ fontSize: '12px', fontWeight: '800', color: colors[i % 5] }}>{count} trips</span>
                            </div>
                            <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(count/topDests[0][1])*100}%`, background: colors[i % 5], borderRadius: '4px' }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* ── Recent Activity ── */}
              <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>Recent Activity</div>
                {clients.slice(0, 5).map((client, i) => (
                  <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getColor(client.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                      {client.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{client.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client.trip && client.trip !== 'Not planned yet' ? client.trip : 'No plan yet'}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <span style={{
                        fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px',
                        background: client.status === 'confirmed' ? '#f0fdf4' : client.status === 'completed' ? '#eff6ff' : '#fffbeb',
                        color: client.status === 'confirmed' ? '#16a34a' : client.status === 'completed' ? '#1d4ed8' : '#d97706',
                        border: `1px solid ${client.status === 'confirmed' ? '#86efac' : client.status === 'completed' ? '#bfdbfe' : '#fcd34d'}`,
                      }}>
                        {client.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                    No clients yet — add your first client to see analytics
                  </div>
                )}
              </div>
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
