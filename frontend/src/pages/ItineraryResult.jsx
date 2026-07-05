import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { API_URL } from '../api'
import { Analytics } from '../utils/analytics'
import {
  MapPin, Clock, ArrowLeft, Download, MessageCircle,
  Calendar, Thermometer, Wind, Umbrella, AlertTriangle,
  Train, Plane, Bus, Car, ChevronDown, ChevronUp,
  Utensils, ShoppingBag, Camera, Compass, Tag,
  CheckCircle, Info, TrendingUp, Star, Navigation,
  ExternalLink, Zap, Heart, Share2, Route, Building2
, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateTripPDF } from '../utils/generateItineraryHTML'
import FeedbackWidget from '../components/FeedbackWidget'
import FestivalAlert from '../components/FestivalAlert'

const tierColors = {
  bronze:   { color: '#92400e', bg: '#fef3c7', border: '#fcd34d', emoji: '🥉' },
  silver:   { color: '#334155', bg: '#f1f5f9', border: '#cbd5e1', emoji: '🥈' },
  gold:     { color: '#92400e', bg: '#fffbeb', border: '#fcd34d', emoji: '🥇' },
  diamond:  { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', emoji: '💎' },
  platinum: { color: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff', emoji: '✨' },
}

const categoryIcons = {
  'Adventure':       <Compass size={14} />,
  'Food & Dining':   <Utensils size={14} />,
  'Shopping':        <ShoppingBag size={14} />,
  'Culture & Heritage': <Camera size={14} />,
  'Nature':          <MapPin size={14} />,
}

const transportColors = ['#16a34a', '#0284c7', '#7c3aed']
const transportBgs    = ['#f0fdf4', '#eff6ff', '#f5f3ff']
const transportBorders= ['#86efac', '#7dd3fc', '#c4b5fd']
const transportIcons  = [<Bus size={20} />, <Train size={20} />, <Plane size={20} />]

// City accent colors for circuit legs
const cityAccents = [
  { color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { color: '#0ea5e9', bg: '#eff6ff', border: '#bae6fd' },
  { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { color: '#14b8a6', bg: '#f0fdfa', border: '#99f6e4' },
]

// Parse circuit cities from destination string or circuit_legs
const parseCircuitCities = (data) => {
  if (data.circuit_legs && data.circuit_legs.length > 0) {
    return data.circuit_legs.map(leg => leg.city)
  }
  const dest = data.destination || ''
  if (dest.includes('→')) {
    return dest.replace('Circuit:', '').trim().split('→').map(c => c.trim()).filter(Boolean)
  }
  // Only treat as multi-city if explicitly marked as circuit
  if (data.is_circuit && dest.includes(',')) {
    return dest.split(',').map(c => c.trim()).filter(Boolean)
  }
  return [dest]
}

const isCircuit = (data) => {
  return data.is_circuit === true ||
    (data.destination && data.destination.includes('→')) ||
    (data.circuit_legs && data.circuit_legs.length > 1)
}

// ── Shared train card — used in BOTH circuit and single-destination
// views. Single source of truth so the availability button (or any
// future train-card change) only ever needs to be added ONE place.
function TrainCard({ opt, isExpanded, onToggle, colorIndex = 0, colors, bgs, borders, icons }) {
  return (
    <div className="transport-card"
      style={{ background: 'white', border: `1.5px solid ${isExpanded ? colors[colorIndex % 3] : '#e2e8f0'}`, borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onClick={onToggle}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bgs[colorIndex % 3], border: `1px solid ${borders[colorIndex % 3]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors[colorIndex % 3] }}>
            {icons[colorIndex % 3]}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{opt.operator || opt.mode}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{opt.description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: colors[colorIndex % 3] }}>{opt.estimated_cost?.split('|')[0]?.trim() || opt.estimated_cost}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{opt.duration}</div>
          </div>
          {isExpanded ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
        </div>
      </div>
      {isExpanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {opt.details?.map((step, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: bgs[colorIndex % 3], border: `1.5px solid ${colors[colorIndex % 3]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', color: colors[colorIndex % 3], flexShrink: 0, marginTop: '1px' }}>{j + 1}</div>
                <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
            {opt.booking_tip && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', marginTop: '4px' }}>
                <Info size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '500' }}>{opt.booking_tip}</span>
              </div>
            )}
            {opt.check_availability_url && (
              <a href={opt.check_availability_url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px', padding: '9px 14px', background: '#0f172a', color: 'white', borderRadius: '10px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                🚂 Check Live Seat Availability →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


export default function ItineraryResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAgent = user?.role === 'agent'
  const [agentProfile, setAgentProfile] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailClientName, setEmailClientName] = useState('')

  useEffect(() => {
    if (!isAgent) return
    const t = localStorage.getItem('tripzio_token')
    if (!t) return
    fetch(`${API_URL}/agents/profile`, {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.profile) setAgentProfile(d.profile) })
      .catch(() => {})
  }, [isAgent])

  // Get data from navigation state OR localStorage fallback
  let data = location.state?.itinerary
  const clientName = location.state?.clientName || localStorage.getItem('tripzio_last_client') || null

  // If no state (e.g. page refresh or ErrorBoundary redirect), try localStorage
  if (!data) {
    try {
      // Check guest plan first (for /guest/result refreshes)
      const guestSaved = localStorage.getItem('tripzio_guest_plan')
      if (guestSaved) data = JSON.parse(guestSaved)
    } catch (e) { data = null }
  }
  if (!data) {
    try {
      const saved = localStorage.getItem('tripzio_last_itinerary')
      if (saved) data = JSON.parse(saved)
    } catch (e) { data = null }
  }
  const [activeDay, setActiveDay]               = useState(1)
  const [activeTab, setActiveTab]               = useState('itinerary')
  const [expandedTransport, setExpandedTransport] = useState(0)
  const [googleHotels, setGoogleHotels]         = useState({})
  const [hotelsLoading, setHotelsLoading]       = useState(false)
  const [activeHotelCity, setActiveHotelCity]   = useState(null)
  const [activePlaceCategory, setActivePlaceCategory] = useState('all')
  const [activeTier, setActiveTier] = useState(null) // null = use original plan tier
  const [isSaved, setIsSaved]                   = useState(false)
  const [saving, setSaving]                     = useState(false)
  const [shareUrl, setShareUrl]                 = useState(null)
  const [altGenerating, setAltGenerating]       = useState(null) // name of alt being generated
  const [shareLoading, setShareLoading]         = useState(false)

  // ── Guest mode ────────────────────────────────────────────────
  const isGuest = location.state?.isGuest === true || data?.is_guest === true
  const [showAuthModal, setShowAuthModal]       = useState(false)
  const [authTab,       setAuthTab]             = useState('register') // 'login' | 'register'
  const [authEmail,     setAuthEmail]           = useState('')
  const [authPassword,  setAuthPassword]        = useState('')
  const [authName,      setAuthName]            = useState('')
  const [authLoading,   setAuthLoading]         = useState(false)
  const [authErrors,    setAuthErrors]          = useState({})
  const [copying, setCopying]                   = useState(false)

  // ── Tier upgrade config ─────────────────────────────────────
  const TIER_ORDER  = ['bronze','silver','gold','diamond','platinum']
  const TIER_CONFIG = {
    bronze:   { label: 'Bronze',   emoji: '🥉', color: '#92400e', bg: '#fef3c7', border: '#fcd34d', next: 'silver'   },
    silver:   { label: 'Silver',   emoji: '🥈', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', next: 'gold'     },
    gold:     { label: 'Gold',     emoji: '🥇', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', next: 'diamond'  },
    diamond:  { label: 'Diamond',  emoji: '💎', color: '#0ea5e9', bg: '#eff6ff', border: '#bfdbfe', next: 'platinum' },
    platinum: { label: 'Platinum', emoji: '🌟', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', next: null       },
  }
  const currentTier    = activeTier || data?.plan_tier || 'silver'
  const originalTier   = data?.plan_tier || 'silver'
  const tierCfg        = TIER_CONFIG[currentTier] || TIER_CONFIG.silver
  const nextTier       = tierCfg.next
  const nextTierCfg    = nextTier ? TIER_CONFIG[nextTier] : null
  const isUpgraded     = activeTier && activeTier !== originalTier

  // Get hotels for current active tier
  const getTierHotels = () => {
    // Always use current city's SerpAPI hotels (has real photos, correct city)
    const currentCityHotels = googleHotels[activeHotelCity] || []
    if (!activeTier || activeTier === originalTier) return currentCityHotels
    // For upgraded tier — sort by rating (highest first = premium feel)
    return [...currentCityHotels].sort((a, b) =>
      parseFloat(b.rating || 0) - parseFloat(a.rating || 0)
    )
  }

  // Recalculate accommodation cost when tier changes
  const getUpgradedAccomCost = () => {
    if (!isUpgraded) return null
    const hotels = getTierHotels()
    const h = hotels[0]
    if (!h?.price_range) return null
    // Extract first complete number from price_range
    // e.g. "₹6,000 - ₹8,000" → 6000
    // e.g. "₹12,500 per night" → 12500
    const match = h.price_range.match(/₹?([\d,]+)/)
    if (!match) return null
    const price = parseInt(match[1].replace(/,/g, ''))
    if (!price || isNaN(price)) return null
    return price * (data?.days || 1)
  }

  const circuit = data ? isCircuit(data) : false
  const cities  = data ? parseCircuitCities(data) : []

  // Track itinerary view
  useEffect(() => {
    if (data?.destination) {
      Analytics.itineraryGenerated(data.destination, data.days, data.budget, data.plan_tier)
    }
  }, [data?.destination])

  useEffect(() => {
    if (data && activeTab === 'hotels') { fetchHotelsForAllCities(); Analytics.hotelsViewed(data?.destination) }
  }, [activeTab, data])

  // Show feedback widget after 45 seconds
  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => setShowFeedback(true), 45000)
      return () => clearTimeout(timer)
    }
  }, [data])

  useEffect(() => {
    if (cities.length > 0) setActiveHotelCity(cities[0])
  }, [data])

  const fetchHotelsForAllCities = async () => {
    // Always re-fetch when city_hotels data is available
    setHotelsLoading(true)
    const results = {}
    const cityHotelsMap = data.city_hotels || {}
    const cityKeys = Object.keys(cityHotelsMap)

    cities.forEach((city, index) => {
      if (cityKeys.length === 0) {
        results[city] = []
        return
      }
      // Try name match first
      const cityLower = city.trim().toLowerCase()
      const nameMatch = cityKeys.find(k => k.toLowerCase() === cityLower)
      if (nameMatch) {
        results[city] = cityHotelsMap[nameMatch]
        return
      }
      // Try partial match
      const partialMatch = cityKeys.find(k =>
        cityLower.includes(k.toLowerCase()) || k.toLowerCase().includes(cityLower)
      )
      if (partialMatch) {
        results[city] = cityHotelsMap[partialMatch]
        return
      }
      // Find which index this city is among non-source cities
      // Filter out source city (first city in destination string is often source)
      const nonSourceCities = cities.filter(c => cityKeys.some(k =>
        c.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(c.toLowerCase())
      ))
      const cityPosInDest = nonSourceCities.indexOf(city)
      if (cityPosInDest >= 0 && cityPosInDest < cityKeys.length) {
        results[city] = cityHotelsMap[cityKeys[cityPosInDest]]
      } else {
        results[city] = cityHotelsMap[cityKeys[0]] || []
      }
    })
    setGoogleHotels(results)
    setHotelsLoading(false)
  }

  const handleAltClick = async (alt) => {
    if (altGenerating) return  // prevent double-click
    const token = localStorage.getItem('tripzio_token')
    const cleanDest = alt.name
      .replace(/\b(Tour|Trip|Circuit|Package)\b/gi, '')
      .trim()
    setAltGenerating(cleanDest)
    toast.loading(`Planning ${cleanDest}...`, {
      id: 'alt-gen',
      style: { background: '#0f172a', color: 'white', fontWeight: '700' }
    })
    try {
      const resp = await fetch(`${API_URL}/itinerary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          from_city: data.from_city || 'Kolkata',
          days: data.days || 5,
          budget: data.budget || 20000,
          trip_type: data.trip_type || null,
          destination: cleanDest,
          destination_mode: 'specific',
          plan_tier: data.plan_tier || 'silver',
          transport_mode: 'balanced',
          is_flexible: false,
        })
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.detail || 'Failed')
      }
      const newData = await resp.json()
      toast.success(`${cleanDest} plan ready! 🎉`, {
        id: 'alt-gen',
        style: { background: '#0f172a', color: 'white', fontWeight: '700' }
      })
      navigate('/itinerary/result', { state: { itinerary: newData } })
    } catch (e) {
      toast.error(e.message || 'Could not generate plan. Please try again.', {
        id: 'alt-gen',
        style: { background: '#0f172a', color: 'white', fontWeight: '700' }
      })
    } finally {
      setAltGenerating(null)
    }
  }

  // readOnly = true when this itinerary was opened from My Trips (already saved)
  const readOnly = location.state?.readOnly || false

  const handleSave = async () => {
    if (isSaved) { navigate('/my-trips'); return }

    setSaving(true)
    try {
      const token = localStorage.getItem('tripzio_token')
      const title = `${data.from_city || 'Trip'} → ${data.destination || '?'} · ${data.days || '?'} Days`

      const resp = await fetch(`${API_URL}/trips/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title,
          from_city: data.from_city || '',
          destination: data.destination || '',
          days: data.days || 1,
          travelers: data.travelers || 1,
          budget: data.budget || null,
          plan_tier: data.plan_tier || 'silver',
          itinerary: data,
          weather: null,
          hotels: null,
        })
      })

      const result = await resp.json()

      if (resp.status === 403 && result?.detail?.code === 'FREE_LIMIT_REACHED') {
        toast.error('Free plan limit reached — upgrade to save more trips.')
        navigate('/pricing')
        return
      }

      if (!resp.ok) throw new Error(result?.detail || 'Save failed')

      setIsSaved(true)
      toast.success('Trip saved to My Trips! ❤️')
    } catch (e) {
      toast.error(e.message || 'Could not save trip. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    setShareLoading(true)
    try {
      const token = localStorage.getItem('tripzio_token')
      const res = await fetch(`${API_URL}/share/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trip_data: data,
          title: `${data.destination} · ${data.days} Days`,
          destination: data.destination,
          days: data.days,
          plan_tier: data.plan_tier,
          is_agent: isAgent,
          agent_name: isAgent ? (user?.business_name || user?.full_name) : null,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error('Could not create share link')
      // Use window.location.origin so it works on localhost AND production
      const shareUrl = `${window.location.origin}/trip/${result.slug}`
      if (navigator.share) {
        await navigator.share({ title: `${data.destination} Itinerary`, text: 'Check out this trip plan on Tripzio!', url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Share link copied! 🔗')
      }
    } catch (e) {
      toast.error('Could not create share link. Try again.')
    } finally {
      setShareLoading(false)
    }
  }

  const handleWhatsApp = async () => {
    try {
      const token = localStorage.getItem('tripzio_token')
      const res = await fetch(`${API_URL}/share/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ trip_data: data, title: `${data.destination} · ${data.days} Days`, destination: data.destination, days: data.days, plan_tier: data.plan_tier })
      })
      const result = await res.json()
      const tripUrl = res.ok ? `${window.location.origin}/trip/${result.slug}` : 'https://tripzio.io'
      const text = [
        `🌍 *My Tripzio Trip Plan*`,
        ``,
        `📍 *${data.destination}*`,
        `📅 ${data.days} days | 💰 ₹${data.budget?.toLocaleString('en-IN')}`,
        ``,
        data.summary,
        ``,
        `✨ *Highlights:*`,
        data.highlights?.map(h => `• ${h}`).join('\n'),
        ``,
        `📲 *View full itinerary:*`,
        tripUrl,
        ``,
        `_Plan yours free at tripzio.io_`
      ].join('\n')
      Analytics.whatsappShared(data?.destination, false)
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
      toast.success('Opening WhatsApp!')
    } catch (e) {
      const text = `🌍 *My Tripzio Trip Plan*\n\n📍 *${data.destination}*\n📅 ${data.days} days | 💰 ₹${data.budget?.toLocaleString('en-IN')}\n\n${data.summary}\n\n✨ *Highlights:*\n${data.highlights?.map(h => `• ${h}`).join('\n')}\n\n_Plan yours free at tripzio.io_`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
      toast.success('Opening WhatsApp!')
    }
  }

  // ── Agent: rich WhatsApp to client ──────────
  const handleAgentWhatsApp = async () => {
    const agentName = user?.business_name || user?.full_name || 'Your Travel Agent'
    const to = clientName ? `Hi ${clientName}! 👋` : 'Hi! 👋'

    // Create share link
    let shareUrl = 'https://tripzio.io'
    try {
      const token = localStorage.getItem('tripzio_token')
      const res = await fetch(`${API_URL}/share/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ trip_data: data, title: `${data.destination} · ${data.days} Days`, destination: data.destination, days: data.days, plan_tier: data.plan_tier, is_agent: true })
      })
      const result = await res.json()
      if (res.ok) shareUrl = `${window.location.origin}/trip/${result.slug}`
    } catch (e) { /* fallback to tripzio.io */ }

    // Day plan summary — one line per day
    const dayLines = data.day_plans?.slice(0, 5).map(d =>
      `Day ${d.day}: ${d.title}`
    ).join('\n') || ''

    // Hotels — per city for circuits
    let hotelLines = ''
    if (data.accommodation?.length > 0) {
      hotelLines = data.accommodation.slice(0, 4).map(h =>
        `• ${h.area ? h.area.split(',')[0] : ''}: ${h.name} (${h.rating}⭐)`
      ).join('\n')
    }

    // Cost breakdown
    const cb = data.cost_breakdown || {}
    const costLines = [
      cb.transport     ? `🚌 Transport: ${cb.transport}` : '',
      cb.accommodation ? `🏨 Hotels: ${cb.accommodation}` : '',
      cb.food          ? `🍽️ Food: ${cb.food}` : '',
      cb.activities    ? `🎯 Activities: ${cb.activities}` : '',
      cb.total         ? `💰 *Total: ${cb.total}*` : '',
    ].filter(Boolean).join('\n')

    // Highlights
    const highlightLines = data.highlights?.slice(0, 4).map(h => `✅ ${h}`).join('\n') || ''

    const text = [
      `${to}`,
      ``,
      `🗺️ *Your ${data.destination} Trip Plan is Ready!*`,
      `_Prepared by ${agentName} using Tripzio AI_`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📍 *${data.destination}*`,
      `📅 ${data.days} days | 💰 ₹${data.budget?.toLocaleString('en-IN')} | 🏷️ ${data.plan_tier?.toUpperCase()} Plan`,
      data.from_city ? `🚉 From: ${data.from_city}` : '',
      ``,
      `✨ *Trip Highlights*`,
      highlightLines,
      ``,
      dayLines ? `📅 *Day-wise Plan*\n${dayLines}` : '',
      hotelLines ? `\n🏨 *Hotels*\n${hotelLines}` : '',
      ``,
      `💰 *Cost Breakdown*`,
      costLines,
      ``,
      `📲 *View Complete Itinerary:*`,
      shareUrl,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Reply *YES* to confirm your booking! ✈️`,
      ``,
      `_${agentName}_`,
      `_Powered by Tripzio AI — tripzio.io_`,
    ].filter(l => l !== undefined).join('\n')

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    Analytics.whatsappShared(data?.destination, true)
    toast.success('Opening WhatsApp with full plan!')
  }

  const handleSendEmail = async () => {
    if (!emailTo) return
    setEmailSending(true)
    try {
      const token = localStorage.getItem('tripzio_token')
      const resp = await fetch(`${API_URL}/email/send-itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ to_email: emailTo, itinerary: data, client_name: emailClientName })
      })
      if (resp.ok) {
        setEmailSent(true)
        setShowEmailModal(false)
        toast.success('Itinerary emailed to ' + emailTo + ' 📧')
        setEmailTo('')
        setEmailClientName('')
      } else {
        const err = await resp.json()
        toast.error(err.detail || 'Failed to send email')
      }
    } catch (e) {
      toast.error('Failed to send email')
    } finally {
      setEmailSending(false)
    }
  }

  const handleDownload = () => {
    try {
      generateTripPDF({ data, user, isAgent, clientName, agentProfile })
      Analytics.pdfDownloaded(data?.destination)
      toast.success('PDF downloaded! 🎉')
    } catch (e) {
      console.error('PDF error:', e)
      toast.error('Could not generate PDF. Please try again.')
    }
  }

  // ── Guest auth handler ────────────────────────────────────────
  // Called when guest clicks Save / Share / PDF / Generate Another
  const handleGuestAction = () => {
    setShowAuthModal(true)
    setAuthTab('register')
    setAuthErrors({})
  }

  const handleGuestAuth = async () => {
    // Validate
    const e = {}
    if (authTab === 'register' && !authName.trim()) e.name = 'Full name is required'
    if (!authEmail.trim() || !/\S+@\S+\.\S+/.test(authEmail)) e.email = 'Valid email required'
    if (!authPassword || authPassword.length < 6) e.password = 'Minimum 6 characters'
    setAuthErrors(e)
    if (Object.keys(e).length > 0) return

    setAuthLoading(true)
    try {
      // Register or login
      const endpoint = authTab === 'register' ? '/auth/register' : '/auth/login'
      const body = authTab === 'register'
        ? { full_name: authName, email: authEmail, password: authPassword, role: 'user' }
        : { email: authEmail, password: authPassword }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!res.ok) {
        const detail = result?.detail || ''
        if (detail.toLowerCase().includes('already')) {
          setAuthErrors({ email: 'Email already registered — try signing in' })
        } else if (detail.toLowerCase().includes('invalid') || detail.toLowerCase().includes('credentials')) {
          setAuthErrors({ password: 'Incorrect email or password' })
        } else {
          toast.error(detail || 'Something went wrong. Please try again.')
        }
        return
      }

      // Store token
      const token = result.access_token || result.token
      if (token) localStorage.setItem('tripzio_token', token)
      if (result.user) localStorage.setItem('tripzio_user', JSON.stringify(result.user))

      // Auto-save guest plan
      try {
        const guestPlan = localStorage.getItem('tripzio_guest_plan')
        if (guestPlan && token) {
          const planData = JSON.parse(guestPlan)
          await fetch(`${API_URL}/trips/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              title: `${planData.destination || 'Trip'} — ${planData.days || ''} days`,
              from_city: planData.from_city || '',
              destination: planData.destination || '',
              days: planData.days || 1,
              budget: planData.budget || 0,
              trip_type: planData.trip_type || null,
              plan_tier: planData.plan_tier || 'silver',
              itinerary: planData,
            }),
          })
          localStorage.removeItem('tripzio_guest_plan')
          toast.success('Account created & your plan has been saved! 🎉', { duration: 5000 })
        } else {
          toast.success(authTab === 'register' ? 'Account created! Welcome to Tripzio 🎉' : 'Welcome back! 🌏')
        }
      } catch (_) {
        toast.success(authTab === 'register' ? 'Account created! Welcome to Tripzio 🎉' : 'Welcome back! 🌏')
      }

      // Close modal — redirect after brief delay so toast is visible
      setShowAuthModal(false)
      setIsSaved(true)
      setTimeout(() => { window.location.href = '/dashboard' }, 1800)

    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>🗺️</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>No itinerary found</h2>
          <button onClick={() => navigate(isAgent ? '/agent/dashboard' : '/dashboard')}
            style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            {isAgent ? 'Back to Dashboard' : 'Go to Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  const tier = tierColors[data.plan_tier] || tierColors.silver
  // Safety defaults for missing fields
  const safeData = {
    destination: data.destination || 'Your Trip',
    from_city: data.from_city || '',
    days: data.days || 0,
    budget: data.budget || 0,
    plan_tier: data.plan_tier || 'silver',
    trip_type: data.trip_type || null,
    summary: data.summary || '',
    highlights: data.highlights || [],
    day_plans: data.day_plans || [],
    accommodation: data.accommodation || [],
    transport_options: data.transport_options || [],
    local_transport: data.local_transport || null,
    places_to_visit: data.places_to_visit || [],
    things_to_do: data.things_to_do || [],
    cost_breakdown: data.cost_breakdown || {},
    local_tips: data.local_tips || [],
    packing_list: data.packing_list || [],
    weather: data.weather || null,
    alternatives: data.alternatives || [],
    is_circuit: data.is_circuit || false,
    circuit_legs: data.circuit_legs || [],
    permit_info: data.permit_info || [],
    parsed_from: data.parsed_from || null,
    start_date: data.start_date || null,
    season_warning: data.season_warning || null,
    ...data
  }
  Object.assign(data, safeData)

  const tabs = [
    { id: 'itinerary', label: '📅 Day Plan' },
    { id: 'hotels',    label: `🏨 Hotels${circuit ? ` (${cities.length} cities)` : ''}` },
    { id: 'transport', label: `🚂 Transport${circuit ? ` (${cities.length} legs)` : ''}` },
    { id: 'places',    label: '📍 Places' },
    { id: 'todo',      label: '🎯 Things To Do' },
    { id: 'costs',     label: '💰 Cost Breakdown' },
    { id: 'tips',      label: '💡 Tips & Pack' },
  ]

  // Get hotels for active city
  const activeHotels = activeHotelCity
    ? (googleHotels[activeHotelCity] || (data.accommodation || []).filter(h =>
        h.area?.toLowerCase().includes(activeHotelCity.toLowerCase()) ||
        activeHotelCity.toLowerCase().includes((h.area || '').toLowerCase().split(',')[0])
      ).map(h => ({
        ...h,
        name: h.name, rating: parseFloat(h.rating) || 4.2,
        address: h.area || h.address, price_display: h.price_range || h.price_display,
        why: h.why, highlight: h.highlight,
        photo_url: h.photo_url || h.thumbnail || null,
        tripadvisor_url: h.tripadvisor_url || h.link || null,
        tier: h.tier, recommended: h.recommended,
        maps_url: `https://www.google.com/maps/search/${encodeURIComponent(h.name + ' ' + activeHotelCity)}`
      })))
    : []

  // If no city-specific hotels, show all AI accommodation
  const fallbackHotels = data.accommodation?.map(h => ({
    ...h,
    name: h.name, rating: parseFloat(h.rating) || 4.2,
    address: h.area || h.address, price_display: h.price_range || h.price_display,
    why: h.why, highlight: h.highlight,
    photo_url: h.photo_url || h.thumbnail || null,
    tripadvisor_url: h.tripadvisor_url || h.link || null,
    tier: h.tier, recommended: h.recommended,
    maps_url: `https://www.google.com/maps/search/${encodeURIComponent(h.name + ' ' + data.destination)}`
  })) || []

  const tierHotels    = getTierHotels ? getTierHotels() : []
  // Use data.accommodation directly — has ALL SerpAPI hotels with photos
  // No limits — show everything SerpAPI returned
  const hotelsToShow  = isUpgraded ? tierHotels : activeHotels

  return (
    <>
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#e8f8f5 0%,#f0f9ff 40%,#f8fafc 100%)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .tab-btn:hover { background: #f1f5f9 !important; }
        .day-btn:hover { border-color: #0d9488 !important; }
        .city-tab:hover { background: #f8fafc !important; }
        .hotel-card { transition: all 0.25s ease; }
        .hotel-card:hover { transform: translateY(-3px) !important; box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important; }
        .transport-card { transition: all 0.2s ease; }
        .transport-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
        .alt-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        .action-btn:hover { transform: translateY(-1px); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .skeleton { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:12px; }
      `}</style>

      <Navbar />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Back */}
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginBottom: '24px', padding: 0 }}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* ── HERO ── */}
        <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#134e4a 100%)', borderRadius: '24px', padding: '36px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle,rgba(13,148,136,0.3) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '22px' }}>{tier.emoji}</span>
                <span style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`, padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                  {data.plan_tier?.toUpperCase()} PLAN
                </span>
                {circuit && (
                  <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Route size={11} /> Circuit · {cities.length} cities
                  </span>
                )}
                {data.start_date && (
                  <span style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} /> {new Date(data.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: '900', color: 'white', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.5px' }}>
                {data.destination} 🌏
              </h1>
              {/* Circuit route pills */}
              {circuit && cities.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {cities.map((city, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: `${cityAccents[i % cityAccents.length].color}30`, color: cityAccents[i % cityAccents.length].color, border: `1px solid ${cityAccents[i % cityAccents.length].color}50`, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                        {city}
                      </span>
                      {i < cities.length - 1 && <span style={{ color: '#94a3b8', fontSize: '12px' }}>→</span>}
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, maxWidth: '500px', lineHeight: 1.6 }}>{data.summary}</p>
            </div>

            {/* Action buttons — role aware */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {isAgent ? (
                // ── AGENT buttons ──
                <>
                  {/* Back to dashboard */}
                  <button className="action-btn"
                    onClick={() => navigate('/agent/dashboard')}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <ArrowLeft size={15} /> Dashboard
                  </button>

                  {/* Send full plan to client */}
                  <button className="action-btn"
                    onClick={handleAgentWhatsApp}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: '#25d366', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,211,102,0.4)' }}>
                    <MessageCircle size={15} />
                    {clientName ? `Send to ${clientName}` : 'Send to Client'}
                  </button>

                  {/* Download */}
                  <button className="action-btn" onClick={handleDownload}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Download size={15} /> Download
                  </button>

                  {/* Agent branding badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5eead4' }} />
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                      {user?.business_name || user?.full_name}
                    </span>
                  </div>
                </>
              ) : isGuest ? (
                // ── GUEST buttons — gate all actions behind auth modal ──
                <>
                  <button className="action-btn" onClick={handleGuestAction}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(13,148,136,0.4)' }}>
                    <Heart size={15} /> Save This Plan
                  </button>
                  <button className="action-btn" onClick={handleGuestAction}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Share2 size={15} /> Share
                  </button>
                  <button className="action-btn" onClick={handleGuestAction}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Download size={15} /> Download PDF
                  </button>
                </>
              ) : (
                // ── AUTHENTICATED USER buttons ──
                <>
                  {!readOnly && (
                    <button className="action-btn" onClick={handleSave} disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: isSaved ? '#16a34a' : 'rgba(255,255,255,0.1)', color: 'white', border: `1px solid ${isSaved ? '#16a34a' : 'rgba(255,255,255,0.2)'}`, borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                      <Heart size={15} fill={isSaved ? 'white' : 'none'} />
                      {isSaved ? 'View My Trips →' : saving ? 'Saving...' : 'Save Trip'}
                    </button>
                  )}
                  {readOnly && (
                    <button className="action-btn" onClick={() => navigate('/my-trips')}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                      ← My Trips
                    </button>
                  )}
                  <button className="action-btn" onClick={handleShare}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Share2 size={15} /> {shareLoading ? 'Creating...' : 'Share'}
                  </button>
                  <button className="action-btn" onClick={handleWhatsApp}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: '#25d366', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                  <button className="action-btn" onClick={() => setShowEmailModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Mail size={15} /> Email
                  </button>
                  <button className="action-btn" onClick={handleDownload}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Download size={15} /> Download
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Trip stats */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { icon: <MapPin size={14} />, label: 'From', value: data.from_city },
              { icon: <Clock size={14} />, label: 'Duration', value: `${data.days} days` },
              { icon: <TrendingUp size={14} />, label: 'Budget', value: `₹${data.budget?.toLocaleString('en-IN')}` },
              { icon: <Tag size={14} />, label: 'Trip Type', value: data.trip_type || 'Any' },
              circuit ? { icon: <Route size={14} />, label: 'Cities', value: `${cities.length} destinations` } : null,
            ].filter(Boolean).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: '#5eead4' }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parsed from (custom plan) */}
        {data.parsed_from && (
          <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Info size={16} color="#0d9488" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>AI understood your request as:</div>
              <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: '500' }}>{data.parsed_from}</span>
            </div>
          </div>
        )}

        {/* Highlights */}
        {data.highlights?.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px', marginBottom: '28px' }}>
            {data.highlights.map((h, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', animation: `fadeUp ${0.2 + i * 0.06}s ease` }}>
                <CheckCircle size={16} color="#0d9488" />
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── SEASON SCORE CARD ── */}
        {(() => {
          const sw = data.season_warning
          if (!sw) return null
          const RATING_CONFIG = {
            excellent: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#22c55e', label: 'GREAT TIME TO VISIT', headerBg: 'linear-gradient(135deg,#dcfce7,#f0fdf4)' },
            good:      { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#22c55e', label: 'GOOD TIME TO VISIT',  headerBg: 'linear-gradient(135deg,#dcfce7,#f0fdf4)' },
            okay:      { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#f59e0b', label: 'PLAN ACCORDINGLY',    headerBg: 'linear-gradient(135deg,#fef9c3,#fffbeb)' },
            avoid:     { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#ef4444', label: 'CHECK YOUR DATES',    headerBg: 'linear-gradient(135deg,#fee2e2,#fef2f2)' },
          }
          const rc = RATING_CONFIG[sw.rating] || RATING_CONFIG.okay
          const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
          const RATING_EMOJI = { excellent: '🟢', good: '🟢', okay: '🟡', avoid: '🔴' }
          return (
            <div style={{ background: 'white', border: `1.5px solid ${rc.border}`, borderRadius: '20px', overflow: 'hidden', marginBottom: '28px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              {/* Header */}
              <div style={{ background: rc.headerBg, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: `1px solid ${rc.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{sw.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: rc.text }}>
                      {sw.reason}
                    </div>
                    <div style={{ fontSize: '11px', color: rc.text, opacity: 0.75, marginTop: '2px' }}>
                      Season intelligence for {data.destination?.split('→')[0]?.trim() || data.destination}
                    </div>
                  </div>
                </div>
                <span style={{ background: rc.badge, color: 'white', fontSize: '10px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                  {rc.label}
                </span>
              </div>

              {/* Best Month Calendar strip */}
              <div style={{ padding: '16px 22px', borderBottom: `1px solid ${rc.border}` }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Best months to visit
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {sw.all_months && sw.all_months.map((m, i) => {
                    const isCurrent = (i + 1) === sw.month
                    const rColor = { excellent: '#22c55e', good: '#86efac', okay: '#fcd34d', avoid: '#fca5a5' }[m.rating] || '#e2e8f0'
                    const textColor = { excellent: '#166534', good: '#166534', okay: '#92400e', avoid: '#991b1b' }[m.rating] || '#64748b'
                    return (
                      <div key={i} style={{
                        padding: '5px 8px', borderRadius: '8px', textAlign: 'center', minWidth: '36px',
                        background: isCurrent ? rColor : `${rColor}40`,
                        border: `1.5px solid ${isCurrent ? textColor : rColor}`,
                        opacity: isCurrent ? 1 : 0.8,
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: isCurrent ? '800' : '600', color: isCurrent ? textColor : textColor + '99' }}>
                          {MONTH_NAMES[i]}
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '1px' }}>{m.icon}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Upside + Alternatives */}
              <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                {sw.upside && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Silver lining</div>
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>💡 {sw.upside}</div>
                  </div>
                )}
                {sw.alternatives?.length > 0 && (sw.rating === 'avoid' || sw.rating === 'okay') && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Better windows</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {sw.alternatives.map(a => (
                        <div key={a.month} style={{ padding: '5px 14px', background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: rc.text }}>
                          {a.icon} {a.monthName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Weather */}
        {data.weather && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '22px', marginBottom: '28px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                🌤 Weather at {circuit ? cities[0] : data.destination}
                {circuit && <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400', marginLeft: '8px' }}>(first stop)</span>}
              </h3>
              <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{data.weather.season}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: data.weather.advisory ? '14px' : '0' }}>
              {[
                { icon: <Thermometer size={13} color="#0ea5e9" />, label: 'Temperature', value: data.weather.temperature },
                { icon: <Wind size={13} color="#8b5cf6" />, label: 'Condition', value: data.weather.condition },
                { icon: <Umbrella size={13} color="#f59e0b" />, label: 'Humidity', value: data.weather.humidity || 'Moderate' },
                { icon: <Car size={13} color="#22c55e" />, label: 'Wind', value: data.weather.wind || 'Light' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    {item.icon}
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {data.weather.advisory && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px' }}>
                <AlertTriangle size={14} color="#ef4444" />
                <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>{data.weather.advisory}</span>
              </div>
            )}
          </div>
        )}

        {/* ── TABS ── */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', marginBottom: '28px' }}>
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #f1f5f9', padding: '0 8px' }}>
            {tabs.map(tab => (
              <button key={tab.id} className="tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{ padding: '14px 14px', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#0d9488' : 'transparent'}`, background: 'transparent', color: activeTab === tab.id ? '#0d9488' : '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px' }}>

            {/* ── DAY PLAN ── */}
            {/* ── Festival Alert ── */}
          {data?.start_date && (
            <FestivalAlert
              destination={data.destination}
              startDate={data.start_date}
              days={data.days}
            />
          )}

          {activeTab === 'itinerary' && (
              <div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  {data.day_plans?.map(d => (
                    <button key={d.day} className="day-btn"
                      onClick={() => setActiveDay(d.day)}
                      style={{ padding: '8px 16px', borderRadius: '20px', border: `2px solid ${activeDay === d.day ? '#0d9488' : '#e2e8f0'}`, background: activeDay === d.day ? '#f0fdfa' : 'white', color: activeDay === d.day ? '#0d9488' : '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                      Day {d.day}
                    </button>
                  ))}
                </div>

                {data.day_plans?.filter(d => d.day === activeDay).map(day => (
                  <div key={day.day} style={{ animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Day {day.day} — {day.title}
                      </h3>
                      <span style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
                        Est. {day.estimated_cost}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
                      {[
                        { time: '🌅 Morning', plan: day.morning, bg: '#fef3c7', border: '#fcd34d', color: '#92400e' },
                        { time: '☀️ Afternoon', plan: day.afternoon, bg: '#eff6ff', border: '#bae6fd', color: '#0369a1' },
                        { time: '🌆 Evening', plan: day.evening, bg: '#f5f3ff', border: '#ddd6fe', color: '#6d28d9' },
                      ].map((slot, i) => (
                        <div key={i} style={{ background: slot.bg, border: `1px solid ${slot.border}`, borderRadius: '14px', padding: '16px 20px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: slot.color, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{slot.time}</div>
                          <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, margin: 0 }}>{slot.plan}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px' }}>
                      {[
                        { icon: <Utensils size={14} color="#f59e0b" />, label: 'Meals', value: day.meals, bg: '#f8fafc', border: '#e2e8f0' },
                        { icon: <Star size={14} color="#0d9488" />, label: 'Stay', value: day.stay, bg: '#f8fafc', border: '#e2e8f0' },
                        day.tips ? { icon: <Info size={14} color="#f59e0b" />, label: 'Local Tip', value: day.tips, bg: '#fffbeb', border: '#fcd34d' } : null,
                      ].filter(Boolean).map((card, i) => (
                        <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '14px', padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                            {card.icon}
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, margin: 0 }}>{card.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── HOTELS TAB — PER CITY ── */}
            {activeTab === 'hotels' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px' }}>
                      🏨 Hotels — {tierCfg.emoji} {tierCfg.label} Plan {isUpgraded ? '(Upgraded)' : ''}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                      {circuit
                        ? `Hotels for each city in your circuit · Click city to switch`
                        : 'Click Maps to explore · Click Book Now to reserve'
                      }
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
                    <img src="https://www.google.com/favicon.ico" alt="" style={{ width: '14px', height: '14px' }} />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Powered by Google</span>
                  </div>
                </div>

                {/* ── TIER UPGRADE BANNER ── */}
                <div style={{ marginBottom: '16px' }}>
                  {/* Current tier pills */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Plan tier:</span>
                    {TIER_ORDER.map(t => {
                      const cfg = TIER_CONFIG[t]
                      const isActive = t === currentTier
                      const isOriginal = t === originalTier
                      const idx = TIER_ORDER.indexOf(t)
                      const origIdx = TIER_ORDER.indexOf(originalTier)
                      const isAvailable = idx >= origIdx // can only go up or stay
                      return (
                        <button key={t}
                          onClick={() => isAvailable && setActiveTier(t === originalTier ? null : t)}
                          style={{
                            padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${isActive ? cfg.border : '#e2e8f0'}`,
                            background: isActive ? cfg.bg : 'white',
                            color: isActive ? cfg.color : isAvailable ? '#64748b' : '#cbd5e1',
                            fontSize: '11px', fontWeight: '700', cursor: isAvailable ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit', transition: 'all 0.2s', opacity: isAvailable ? 1 : 0.4,
                            boxShadow: isActive ? `0 2px 8px ${cfg.border}` : 'none',
                          }}>
                          {cfg.emoji} {cfg.label}
                          {isOriginal && <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.7 }}>Your Plan</span>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Upgrade prompt */}
                  {!isUpgraded && nextTier && nextTierCfg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: `linear-gradient(135deg, ${nextTierCfg.bg}, white)`, border: `1.5px solid ${nextTierCfg.border}`, borderRadius: '14px' }}>
                      <span style={{ fontSize: '22px' }}>{nextTierCfg.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: nextTierCfg.color }}>
                          Upgrade to {nextTierCfg.label} — unlock better hotels
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          See premium hotel options for your destination
                        </div>
                      </div>
                      <button onClick={() => setActiveTier(nextTier)}
                        style={{ padding: '8px 18px', background: nextTierCfg.bg, border: `1.5px solid ${nextTierCfg.border}`, borderRadius: '10px', color: nextTierCfg.color, fontSize: '12px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        Upgrade ✨
                      </button>
                    </div>
                  )}

                  {/* Upgraded state — show downgrade option */}
                  {isUpgraded && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: tierCfg.bg, border: `1.5px solid ${tierCfg.border}`, borderRadius: '12px' }}>
                      <span style={{ fontSize: '18px' }}>{tierCfg.emoji}</span>
                      <div style={{ flex: 1, fontSize: '12px', fontWeight: '700', color: tierCfg.color }}>
                        Showing {tierCfg.label} hotels
                        {getUpgradedAccomCost() && (
                          <span style={{ fontWeight: '500', color: '#64748b', marginLeft: '8px' }}>
                            · Est. accommodation: ₹{getUpgradedAccomCost()?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <button onClick={() => setActiveTier(null)}
                        style={{ padding: '5px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                        ← Back to {TIER_CONFIG[originalTier]?.label}
                      </button>
                    </div>
                  )}
                </div>

                {/* City selector for circuit */}
                {circuit && cities.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', padding: '4px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    {cities.map((city, i) => {
                      const accent = cityAccents[i % cityAccents.length]
                      const isActive = activeHotelCity === city
                      return (
                        <button key={city}
                          className="city-tab"
                          onClick={() => setActiveHotelCity(city)}
                          style={{ padding: '8px 18px', borderRadius: '10px', border: `1.5px solid ${isActive ? accent.color : 'transparent'}`, background: isActive ? accent.bg : 'transparent', color: isActive ? accent.color : '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={13} />
                          {city}
                          {hotelsLoading && <div style={{ width: '10px', height: '10px', border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                          {!hotelsLoading && (
                            <span style={{ background: accent.color, color: 'white', fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: '8px' }}>
                              {(googleHotels[city]?.length || 0) + (data.accommodation?.length || 0) > 0 ? (googleHotels[city]?.length || data.accommodation?.length || 0) : 0}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {hotelsLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div className="skeleton" style={{ height: '160px' }} />
                        <div style={{ padding: '16px' }}>
                          <div className="skeleton" style={{ height: '18px', marginBottom: '8px', width: '70%' }} />
                          <div className="skeleton" style={{ height: '13px', width: '50%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {/* City header for circuit */}
                    {circuit && activeHotelCity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '10px 16px', background: cityAccents[Math.max(0, cities.indexOf(activeHotelCity)) % cityAccents.length].bg, border: `1px solid ${cityAccents[Math.max(0, cities.indexOf(activeHotelCity)) % cityAccents.length].border}`, borderRadius: '12px' }}>
                        <Building2 size={16} color={cityAccents[Math.max(0, cities.indexOf(activeHotelCity)) % cityAccents.length].color} />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: cityAccents[Math.max(0, cities.indexOf(activeHotelCity)) % cityAccents.length].color }}>
                          Hotels in {activeHotelCity}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
                          {hotelsToShow.length} found
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
                      {hotelsToShow.length > 0 ? hotelsToShow.map((hotel, i) => (
                        <div key={i} className="hotel-card"
                          style={{ background: 'white', border: `1.5px solid ${hotel.recommended ? '#0d9488' : '#e2e8f0'}`, borderRadius: '20px', overflow: 'hidden', boxShadow: hotel.recommended ? '0 4px 16px rgba(13,148,136,0.15)' : '0 2px 8px rgba(0,0,0,0.05)', animation: `fadeUp ${0.1 + i * 0.07}s ease` }}>
                          <div style={{ height: '150px', background: hotel.photo_url ? 'transparent' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', position: 'relative', overflow: 'hidden' }}>
                            {hotel.photo_url ? (
                              <img src={hotel.photo_url} alt={hotel.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.style.background = 'linear-gradient(135deg,#0d9488,#0ea5e9)' }} />
                            ) : (data.tripadvisor_places?.hotels?.[0]?.photo_url) ? (
                              <img
                                src={data.tripadvisor_places.hotels[0].photo_url}
                                alt={hotel.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.style.background = 'linear-gradient(135deg,#0d9488,#0ea5e9)' }} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <span style={{ fontSize: '44px', opacity: 0.35 }}>🏨</span>
                              </div>
                            )}
                            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.95)', padding: '4px 10px', borderRadius: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                              <Star size={11} fill="#f59e0b" color="#f59e0b" />
                              <span style={{ fontSize: '12px', fontWeight: '800', color: '#92400e' }}>{hotel.rating}</span>
                              {hotel.total_ratings && <span style={{ fontSize: '10px', color: '#64748b' }}>({hotel.total_ratings > 1000 ? `${(hotel.total_ratings/1000).toFixed(1)}k` : hotel.total_ratings})</span>}
                            </div>
                            {/* Tier badge top left */}
                            <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '5px' }}>
                              {hotel.recommended && (
                                <span style={{ background: '#0d9488', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' }}>
                                  ⭐ Recommended
                                </span>
                              )}
                              {!hotel.recommended && hotel.tier === 'budget' && (
                                <span style={{ background: 'rgba(22,163,74,0.9)', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' }}>
                                  💰 Budget Option
                                </span>
                              )}
                              {!hotel.recommended && hotel.tier === 'luxury' && (
                                <span style={{ background: 'rgba(139,92,246,0.9)', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' }}>
                                  👑 Premium Upgrade
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ padding: '16px' }}>
                            {hotel.recommended && (
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', letterSpacing: '0.5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                                Best for your budget
                              </div>
                            )}
                            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{hotel.name}</h4>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={11} /> {hotel.address || hotel.area || ''}
                            </p>
                            {hotel.price_range && (
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0d9488', margin: '0 0 6px' }}>
                                {hotel.price_range}
                              </div>
                            )}
                            {(hotel.why || hotel.highlight) && (
                              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: '0 0 12px', padding: '8px 12px', background: hotel.recommended ? '#f0fdfa' : '#f8fafc', border: hotel.recommended ? '1px solid #99f6e4' : 'none', borderRadius: '8px' }}>
                                {hotel.why || hotel.highlight}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <a href={hotel.tripadvisor_url || hotel.maps_url || `https://www.google.com/maps/search/${encodeURIComponent((hotel.name||'') + '+' + (hotel.area || activeHotelCity || data.destination || ''))}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#374151', textDecoration: 'none' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.color = '#0d9488' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151' }}>
                                <Navigation size={12} /> {hotel.tripadvisor_url ? 'TripAdvisor' : 'Maps'}
                              </a>
                              <a href={`https://www.booking.com/search.html?ss=${encodeURIComponent(hotel.name + ' ' + (activeHotelCity || data.destination))}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '9px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: 'white', textDecoration: 'none' }}>
                                <ExternalLink size={12} /> Book Now
                              </a>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏨</div>
                          <p style={{ color: '#64748b', fontSize: '14px' }}>Search for hotels in {activeHotelCity} on Google Maps</p>
                          <a href={`https://www.google.com/maps/search/hotels+in+${encodeURIComponent(activeHotelCity || '')}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '9px 20px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', color: '#0d9488', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                            <Navigation size={13} /> Search on Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                    {data.cost_breakdown?.per_person && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>👤</span>
                        <span style={{ fontSize: '13px', color: '#0d9488', fontWeight: '700' }}>
                          {data.cost_breakdown.per_person} per person
                        </span>
                        {data.cost_breakdown.budget_utilisation && (
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                            · {data.cost_breakdown.budget_utilisation} of budget used
                          </span>
                        )}
                      </div>
                    )}
                    {data.cost_breakdown?.savings_tip && (
                      <div style={{ marginTop: '8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', fontSize: '12px', color: '#92400e' }}>
                        💡 {data.cost_breakdown.savings_tip}
                      </div>
                    )}
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px', textAlign: 'center' }}>
                      Powered by Google · Prices approximate · Always verify before booking
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── TRANSPORT TAB — PER LEG ── */}
            {activeTab === 'transport' && (
              <div>
                {circuit && cities.length > 1 ? (
                  // Circuit transport — show per leg
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                      Complete transport plan for your <strong style={{ color: '#0f172a' }}>{cities.length}-city circuit</strong> from <strong style={{ color: '#0f172a' }}>{data.from_city}</strong>
                    </p>

                    {/* Leg 1: Origin → First city */}
                    <div style={{ marginBottom: '28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>1</div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          🚆 {data.from_city} → {cities[0]}
                        </h4>
                      </div>
                      {(() => {
                        const opts = data.transport_options || []
                        const trains = opts.filter(o => (o.type||o.mode||'').toLowerCase().includes('train'))
                        const others = opts.filter(o => !(o.type||o.mode||'').toLowerCase().includes('train'))
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                            {/* Train options — grouped into one card */}
                            {trains.length > 0 && (
                              <div style={{ background: 'white', border: `1.5px solid ${expandedTransport === 'trains' ? '#0d9488' : '#e2e8f0'}`, borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                                onClick={() => setExpandedTransport(expandedTransport === 'trains' ? -1 : 'trains')}>
                                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdfa', border: '1px solid #99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      🚆
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Train Options</div>
                                      <div style={{ fontSize: '12px', color: '#64748b' }}>{trains.length} trains available · Book on IRCTC</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ background: '#f0fdfa', color: '#0d9488', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', border: '1px solid #99f6e4' }}>{trains.length} trains</span>
                                    {expandedTransport === 'trains' ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
                                  </div>
                                </div>
                                {expandedTransport === 'trains' && (
                                  <div style={{ borderTop: '1px solid #f1f5f9' }}>
                                    {trains.map((opt, i) => (
                                      <div key={i} style={{ padding: '12px 18px', borderBottom: i < trains.length-1 ? '1px solid #f8fafc' : 'none',
                                        background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{opt.operator || opt.mode}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{opt.description}</div>
                                            {opt.details?.slice(0,2).map((d, j) => (
                                              <div key={j} style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>→ {d}</div>
                                            ))}
                                            {opt.check_availability_url && (
                                              <a href={opt.check_availability_url} target="_blank" rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', padding: '6px 11px', background: '#0f172a', color: 'white', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>
                                                🚂 Check Live Seat Availability →
                                              </a>
                                            )}
                                          </div>
                                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0d9488' }}>{opt.estimated_cost?.split('|')[0]?.trim()}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{opt.duration}</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    <div style={{ padding: '10px 18px', background: '#fffbeb', borderTop: '1px solid #fcd34d' }}>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <Info size={12} color="#f59e0b" />
                                        <span style={{ fontSize: '11px', color: '#92400e', fontWeight: '600' }}>Book on IRCTC.co.in — 60 days in advance for confirmed seats</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Other transport options */}
                            {others.map((opt, i) => (
                              <div key={i} className="transport-card"
                                style={{ background: 'white', border: `1.5px solid ${expandedTransport === i ? transportColors[i % 3] : '#e2e8f0'}`, borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                                onClick={() => setExpandedTransport(expandedTransport === i ? -1 : i)}>
                                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: transportBgs[i % 3], border: `1px solid ${transportBorders[i % 3]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: transportColors[i % 3] }}>
                                      {transportIcons[i % 3]}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{opt.mode}</div>
                                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{opt.description}</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '16px', fontWeight: '800', color: transportColors[i % 3] }}>{opt.estimated_cost}</div>
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{opt.duration}</div>
                                    </div>
                                    {expandedTransport === i ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
                                  </div>
                                </div>
                                {expandedTransport === i && (
                                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f1f5f9' }}>
                                    <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {opt.details?.map((step, j) => (
                                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: transportBgs[i % 3], border: `1.5px solid ${transportColors[i % 3]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', color: transportColors[i % 3], flexShrink: 0, marginTop: '1px' }}>{j + 1}</div>
                                          <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{step}</span>
                                        </div>
                                      ))}
                                      {opt.booking_tip && (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', marginTop: '4px' }}>
                                          <Info size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
                                          <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '500' }}>{opt.booking_tip}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Inter-city legs for circuit */}
                    {cities.slice(1).map((city, idx) => {
                      const fromCity = cities[idx]
                      const toCity = city
                      const legNum = idx + 2
                      const accent = cityAccents[idx % cityAccents.length]
                      return (
                        <div key={idx} style={{ marginBottom: '28px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: accent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>{legNum}</div>
                            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              🛺 {fromCity} → {toCity}
                            </h4>
                            <span style={{ fontSize: '11px', color: accent.color, background: accent.bg, padding: '3px 10px', borderRadius: '10px', fontWeight: '700' }}>Inter-city</span>
                          </div>

                          {/* Show local_transport options for this leg or AI-generated inter-city info */}
                          {data.local_transport?.options ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '10px' }}>
                              {data.local_transport.options
                                .filter(opt => {
                                  const route = (opt.route || '').toLowerCase()
                                  return route.includes(fromCity.toLowerCase()) ||
                                         route.includes(toCity.toLowerCase()) ||
                                         !route // show all if no specific route mentioned
                                })
                                .slice(0, 3)
                                .map((opt, i) => (
                                <div key={i} style={{ background: '#f8fafc', border: `1px solid ${accent.border}`, borderRadius: '14px', padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{opt.name}</div>
                                      <div style={{ fontSize: '11px', color: accent.color, background: accent.bg, padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '3px', fontWeight: '700' }}>{opt.type}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488' }}>{opt.cost}</div>
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{opt.duration}</div>
                                    </div>
                                  </div>
                                  {opt.route && (
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Navigation size={10} /> {opt.route}
                                    </div>
                                  )}
                                  {opt.tip && (
                                    <div style={{ fontSize: '12px', color: '#374151', background: '#fffbeb', border: '1px solid #fcd34d', padding: '7px 10px', borderRadius: '8px', lineHeight: 1.5 }}>
                                      💡 {opt.tip}
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* If no matching local transport, show generic info */}
                              {data.local_transport.options.filter(opt => {
                                const route = (opt.route || '').toLowerCase()
                                return route.includes(fromCity.toLowerCase()) || route.includes(toCity.toLowerCase()) || !route
                              }).length === 0 && (
                                <div style={{ gridColumn: '1/-1', padding: '16px', background: accent.bg, border: `1px solid ${accent.border}`, borderRadius: '14px' }}>
                                  <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                                    🚐 <strong>Shared taxi/jeep</strong> is the most common way to travel between {fromCity} and {toCity}. Available from the main taxi stand. Cost: ₹200-400 per person, Duration: 3-5 hours.
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ padding: '16px 20px', background: accent.bg, border: `1px solid ${accent.border}`, borderRadius: '14px' }}>
                              <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.6 }}>
                                🚐 Shared taxi or private cab is recommended between {fromCity} and {toCity}. Shared: ₹200-400/person · Private: ₹1,500-2,500 · Duration: 3-5 hours. Taxis available from main taxi stand.
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Return journey */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>{cities.length + 1}</div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          🏠 {cities[cities.length - 1]} → {data.from_city} (Return)
                        </h4>
                      </div>
                      <div style={{ padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                        <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.6 }}>
                          Reverse the journey from {cities[cities.length - 1]} back to {data.from_city}. Book return train/bus ticket in advance from IRCTC. Allow extra travel day for comfort.
                        </p>
                      </div>
                    </div>

                    {/* Local transport note */}
                    {data.local_transport?.note && (
                      <div style={{ padding: '14px 18px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', display: 'flex', gap: '10px' }}>
                        <Info size={16} color="#0d9488" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: '500', lineHeight: 1.6 }}>{data.local_transport.note}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // Single destination transport
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                      From <strong style={{ color: '#0f172a' }}>{data.from_city}</strong> to <strong style={{ color: '#0f172a' }}>{data.destination}</strong> — choose what works best
                    </p>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>🚆 Getting There</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                      {data.transport_options?.map((opt, i) => (
                        <TrainCard key={i} opt={opt} isExpanded={expandedTransport === i}
                          onToggle={() => setExpandedTransport(expandedTransport === i ? -1 : i)}
                          colorIndex={i} colors={transportColors} bgs={transportBgs}
                          borders={transportBorders} icons={transportIcons} />
                      ))}
                    </div>
                    {data.local_transport && (
                      <>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>🛺 Getting Around in {data.destination}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '10px', marginBottom: '16px' }}>
                          {data.local_transport.options?.map((opt, i) => (
                            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{opt.name}</div>
                                  <div style={{ fontSize: '11px', color: '#0d9488', background: '#f0fdfa', padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '3px', fontWeight: '700' }}>{opt.type}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488' }}>{opt.cost}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{opt.duration}</div>
                                </div>
                              </div>
                              {opt.route && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Navigation size={10} /> {opt.route}
                                </div>
                              )}
                              {opt.tip && (
                                <div style={{ fontSize: '12px', color: '#374151', background: '#fffbeb', border: '1px solid #fcd34d', padding: '7px 10px', borderRadius: '8px', lineHeight: 1.5 }}>
                                  💡 {opt.tip}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {data.local_transport.note && (
                          <div style={{ padding: '14px 18px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', display: 'flex', gap: '10px' }}>
                            <Info size={16} color="#0d9488" style={{ flexShrink: 0, marginTop: '1px' }} />
                            <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: '500', lineHeight: 1.6 }}>{data.local_transport.note}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── PLACES ── */}
            {activeTab === 'places' && (() => {
              const allPlaces = data.places_to_visit || []

              // ── Category config ───────────────────────────────────
              const PLACE_CATEGORIES = [
                { id: 'all',       label: '🗺️ All',          keywords: [] },
                { id: 'viewpoint', label: '🌄 Viewpoints',    keywords: ['viewpoint','sunrise','view','scenic','overlook','hill','peak','top','observatory','point'] },
                { id: 'spiritual', label: '🛕 Temples',       keywords: ['temple','monastery','church','mosque','dargah','ghat','ashram','shrine','mandir','masjid','gurudwara','stupa','pagoda','gompa','religious','sacred','spiritual'] },
                { id: 'nature',    label: '🌿 Nature',        keywords: ['lake','waterfall','park','forest','wildlife','sanctuary','river','cave','valley','garden','falls','nature','national','botanical','beach','island'] },
                { id: 'heritage',  label: '🏯 Heritage',      keywords: ['fort','palace','monument','museum','heritage','historical','ruins','castle','historical site','archaeological','ancient'] },
                { id: 'local',     label: '🛍️ Local',         keywords: ['market','bazaar','street','food','shopping','local','neighbourhood','village','craft','artisan','town'] },
                { id: 'adventure', label: '🧗 Adventure',     keywords: ['trek','rafting','paragliding','climbing','adventure','skiing','snowboarding','cable car','ropeway','zip','bungee'] },
                { id: 'daytrip',   label: '🚗 Day Trips',     keywords: ['day trip','nearby','excursion','km','kilometre','kilometer','from city','from town','from base'] },
              ]

              // Classify each place
              const classify = (place) => {
                const text = ((place.type || '') + ' ' + (place.name || '') + ' ' + (place.description || '')).toLowerCase()
                for (const cat of PLACE_CATEGORIES.slice(1)) {
                  if (cat.keywords.some(k => text.includes(k))) return cat.id
                }
                return 'heritage' // default fallback
              }

              const categorised = allPlaces.map(p => ({ ...p, _cat: classify(p) }))

              // Count per category
              const counts = {}
              PLACE_CATEGORIES.forEach(cat => {
                counts[cat.id] = cat.id === 'all'
                  ? categorised.length
                  : categorised.filter(p => p._cat === cat.id).length
              })

              const filtered = activePlaceCategory === 'all'
                ? categorised
                : categorised.filter(p => p._cat === activePlaceCategory)

              // Category color map
              const catColors = {
                viewpoint: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', badge: '#3b82f6' },
                spiritual: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', badge: '#f97316' },
                nature:    { bg: '#f0fdf4', border: '#86efac', color: '#15803d', badge: '#22c55e' },
                heritage:  { bg: '#f5f3ff', border: '#ddd6fe', color: '#7c3aed', badge: '#8b5cf6' },
                local:     { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', badge: '#f59e0b' },
                adventure: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', badge: '#ef4444' },
                daytrip:   { bg: '#f0fdfa', border: '#99f6e4', color: '#0f766e', badge: '#0d9488' },
              }
              const getColor = (cat) => catColors[cat] || { bg: '#f0fdfa', border: '#99f6e4', color: '#0d9488', badge: '#0d9488' }

              return (
                <div>
                  {/* Category filter tabs */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {PLACE_CATEGORIES.filter(cat => counts[cat.id] > 0).map(cat => (
                      <button key={cat.id}
                        onClick={() => setActivePlaceCategory(cat.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '7px 14px', borderRadius: '24px', border: 'none',
                          background: activePlaceCategory === cat.id
                            ? (cat.id === 'all' ? '#0d9488' : getColor(cat.id).badge)
                            : '#f1f5f9',
                          color: activePlaceCategory === cat.id ? 'white' : '#64748b',
                          fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                          fontFamily: 'inherit', transition: 'all 0.2s',
                          boxShadow: activePlaceCategory === cat.id ? `0 3px 10px ${getColor(cat.id).badge || '#0d9488'}40` : 'none',
                        }}>
                        {cat.label}
                        <span style={{
                          background: activePlaceCategory === cat.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                          color: activePlaceCategory === cat.id ? 'white' : '#64748b',
                          fontSize: '10px', fontWeight: '800',
                          padding: '1px 6px', borderRadius: '10px',
                        }}>{counts[cat.id]}</span>
                      </button>
                    ))}
                  </div>

                  {/* Results count */}
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Showing {filtered.length} of {allPlaces.length} places
                      {activePlaceCategory !== 'all' && ` · ${PLACE_CATEGORIES.find(c => c.id === activePlaceCategory)?.label}`}
                    </span>
                  </div>

                  {/* Places grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
                    {filtered.map((place, i) => {
                      const col = getColor(place._cat)
                      return (
                        <div key={i} style={{
                          background: 'white', border: `1.5px solid ${col.border}`,
                          borderRadius: '16px', padding: '18px',
                          animation: `fadeUp ${0.1 + i * 0.04}s ease`,
                          transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>

                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1.3, flex: 1 }}>
                              {place.name}
                            </h4>
                            <span style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}`, padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
                              {place.type}
                            </span>
                          </div>

                          {/* Description */}
                          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '12px' }}>
                            {place.description}
                          </p>

                          {/* Info pills */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {place.entry_fee && (
                              <span style={{ fontSize: '11px', color: '#374151', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>
                                🎟 {place.entry_fee}
                              </span>
                            )}
                            {place.best_time && (
                              <span style={{ fontSize: '11px', color: '#374151', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>
                                🕐 {place.best_time}
                              </span>
                            )}
                            {place.duration && (
                              <span style={{ fontSize: '11px', color: '#374151', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>
                                ⏱ {place.duration}
                              </span>
                            )}
                            {place.must_see && (
                              <span style={{ fontSize: '11px', color: 'white', background: col.badge, padding: '3px 10px', borderRadius: '20px', fontWeight: '700' }}>
                                ⭐ Must See
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
                      <p style={{ fontSize: '14px' }}>No places in this category</p>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── THINGS TO DO ── */}
            {activeTab === 'todo' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px' }}>
                {data.things_to_do?.map((cat, i) => (
                  <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', animation: `fadeUp ${0.1 + i * 0.07}s ease` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        {categoryIcons[cat.category] || <Star size={14} />}
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{cat.category}</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cat.activities?.map((act, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                          <CheckCircle size={13} color="#0d9488" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── COST BREAKDOWN ── */}
            {activeTab === 'costs' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '24px' }}>
                  {data.cost_breakdown && Object.entries(data.cost_breakdown).filter(([k]) => k !== 'total').map(([key, value], i) => {
                    const meta = {
                      transport: { emoji: '🚌', color: '#0ea5e9' },
                      accommodation: { emoji: '🏨', color: '#8b5cf6' },
                      food: { emoji: '🍽️', color: '#f59e0b' },
                      activities: { emoji: '🎯', color: '#22c55e' },
                      miscellaneous: { emoji: '📦', color: '#64748b' }
                    }
                    const m = meta[key] || { emoji: '📌', color: '#64748b' }
                    return (
                      <div key={key} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', animation: `fadeUp ${0.1 + i * 0.07}s ease` }}>
                        <div style={{ fontSize: '24px', marginBottom: '10px' }}>{m.emoji}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{key}</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: m.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</div>
                      </div>
                    )
                  })}
                </div>
                {(() => {
                  const totalNum = parseInt((data.cost_breakdown?.total || '0').replace(/[^0-9]/g, '')) || 0
                  const budgetNum = data.budget || 0
                  const savings = budgetNum - totalNum
                  const savingsPct = budgetNum > 0 ? Math.round((savings / budgetNum) * 100) : 0
                  const isOver = savings < 0
                  const tier = data.plan_tier || 'silver'
                  const utilizationPct = budgetNum > 0 ? Math.round((totalNum / budgetNum) * 100) : 0

                  // Tier-aware messaging
                  const tierMsg = {
                    bronze: {
                      good: { icon: '🎉', color: '#34d399', label: `Smart savings! ₹${savings.toLocaleString('en-IN')} back in your pocket (${savingsPct}% saved)` },
                      over: { icon: '⚠', color: '#f87171', label: `₹${Math.abs(savings).toLocaleString('en-IN')} over budget` }
                    },
                    silver: {
                      good: { icon: '✓', color: '#60a5fa', label: `Great value — ₹${savings.toLocaleString('en-IN')} buffer for shopping & extras` },
                      over: { icon: '⚠', color: '#f87171', label: `₹${Math.abs(savings).toLocaleString('en-IN')} over budget` }
                    },
                    gold: {
                      good: savings > budgetNum * 0.15
                        ? { icon: '💡', color: '#fbbf24', label: `${savingsPct}% unused — consider upgrading hotels or adding an extra day` }
                        : { icon: '⭐', color: '#34d399', label: `Premium experience — budget well utilized` },
                      over: { icon: '⚠', color: '#f87171', label: `₹${Math.abs(savings).toLocaleString('en-IN')} over budget` }
                    },
                    diamond: {
                      good: savings > budgetNum * 0.1
                        ? { icon: '💎', color: '#fbbf24', label: `${savingsPct}% unused — upgrade to luxury suites or private transfers` }
                        : { icon: '💎', color: '#34d399', label: `Full luxury experience — every rupee working for you` },
                      over: { icon: '⚠', color: '#f87171', label: `₹${Math.abs(savings).toLocaleString('en-IN')} over budget` }
                    },
                    platinum: {
                      good: { icon: '✨', color: '#c084fc', label: `Ultra luxury — uncompromising experience` },
                      over: { icon: '⚠', color: '#f87171', label: `₹${Math.abs(savings).toLocaleString('en-IN')} over budget` }
                    }
                  }

                  const msg = (tierMsg[tier] || tierMsg.silver)[isOver ? 'over' : 'good']

                  return (
                    <div style={{ background: 'linear-gradient(135deg,#0f172a,#134e4a)', borderRadius: '16px', padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Total estimated cost</div>
                          <div style={{ fontSize: '36px', fontWeight: '900', color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{data.cost_breakdown?.total}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '14px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Your budget</div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: '#5eead4', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>₹{budgetNum.toLocaleString('en-IN')}</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '14px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Budget used</div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: isOver ? '#f87171' : '#5eead4', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{utilizationPct}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Budget bar */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(utilizationPct, 100)}%`, background: isOver ? '#f87171' : utilizationPct >= 90 ? '#34d399' : utilizationPct >= 75 ? '#60a5fa' : '#fbbf24', borderRadius: '6px', transition: 'width 1s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>₹0</span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>₹{budgetNum.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Tier-aware message */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: `rgba(${isOver ? '239,68,68' : '52,211,153'},0.1)`, border: `1px solid rgba(${isOver ? '239,68,68' : '52,211,153'},0.25)`, borderRadius: '10px' }}>
                        <span style={{ fontSize: '16px' }}>{msg.icon}</span>
                        <span style={{ fontSize: '13px', color: msg.color, fontWeight: '600' }}>{msg.label}</span>
                      </div>

                      {/* Upgrade suggestion for Gold+ with leftover */}
                      {!isOver && savings > budgetNum * 0.15 && ['gold', 'diamond', 'platinum'].includes(tier) && (
                        <div style={{ marginTop: '10px', padding: '12px 16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '10px' }}>
                          <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '700', marginBottom: '6px' }}>💡 With your remaining ₹{savings.toLocaleString('en-IN')} you could:</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                              '⬆ Upgrade to better hotel',
                              '🚖 Add private taxi throughout',
                              '🗓 Extend by 1-2 days',
                              '🍽 Add a fine dining night',
                            ].map((opt, i) => (
                              <span key={i} style={{ fontSize: '11px', color: '#fcd34d', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ── TIPS & PACK ── */}
            {activeTab === 'tips' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>💡 Local Tips</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.local_tips?.map((tip, i) => (
                      <div key={i} style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>💡</span>
                        <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                  {data.permit_info?.[0] && data.permit_info[0] !== 'null' && (
                    <div style={{ marginTop: '20px' }}>
                      <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '12px' }}>📋 Permits Required</h3>
                      {data.permit_info.map((p, i) => (
                        <div key={i} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                          <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>🎒 Packing List</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {(data.weather?.pack?.length > 0 ? data.weather.pack : data.packing_list)?.map((item, i) => (
                      <div key={i} style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={13} color="#0d9488" />
                        <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alternatives */}
        {data.alternatives?.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>
              🔀 Similar Destinations at Same Budget
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '14px' }}>
              {data.alternatives.map((alt, i) => {
                const cleanName = alt.name.replace(/\b(Tour|Trip|Circuit|Package)\b/gi, '').trim()
                const isThisGenerating = altGenerating === cleanName
                const isAnyGenerating = !!altGenerating
                return (
                  <div key={i}
                    className="alt-card"
                    onClick={() => !isAnyGenerating && handleAltClick(alt)}
                    style={{
                      background: 'white', border: `1px solid ${isThisGenerating ? '#0d9488' : '#e2e8f0'}`,
                      borderRadius: '16px', padding: '20px',
                      cursor: isAnyGenerating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      opacity: isAnyGenerating && !isThisGenerating ? 0.5 : 1,
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{alt.name}</h4>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488', whiteSpace: 'nowrap', marginLeft: '8px' }}>{alt.estimated_budget}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '12px' }}>{alt.reason}</p>
                    <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#0d9488', fontWeight: '600' }}>✨ {alt.highlight}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9', fontSize: '12px', fontWeight: '700' }}>
                      {isThisGenerating ? (
                        <>
                          <div style={{ width: '12px', height: '12px', border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                          Building your {cleanName} plan...
                        </>
                      ) : (
                        <><Zap size={12} fill="#0ea5e9" /> Plan trip to {alt.name} →</>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Feedback Widget — bottom right corner */}
    {showFeedback && data && (
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, width: '320px', animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>
        <FeedbackWidget
          tripId={data.id || data.trip_id || 'unknown'}
          destination={data.destination || 'your trip'}
          onClose={() => setShowFeedback(false)}
        />
      </div>
    )}

    {/* Feedback button — always visible */}
    {!showFeedback && data && (
      <button onClick={() => setShowFeedback(true)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 998, background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: 'white', border: 'none', borderRadius: '50px', padding: '10px 18px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 16px rgba(13,148,136,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Star size={13} fill="white" /> Rate this plan
      </button>
    )}

    {/* Email Itinerary Modal */}
    {showEmailModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>📧 Email Itinerary</h3>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>RECIPIENT EMAIL *</label>
            <input type="email" placeholder="client@email.com" value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>CLIENT NAME (optional)</label>
            <input type="text" placeholder="e.g. Rahul Sharma" value={emailClientName}
              onChange={e => setEmailClientName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowEmailModal(false)}
              style={{ flex: 1, padding: '11px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: '#64748b' }}>
              Cancel
            </button>
            <button onClick={handleSendEmail} disabled={emailSending || !emailTo}
              style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '10px', background: emailSending || !emailTo ? '#e2e8f0' : '#6366f1', color: emailSending || !emailTo ? '#94a3b8' : 'white', fontSize: '13px', fontWeight: '800', cursor: emailSending || !emailTo ? 'not-allowed' : 'pointer' }}>
              {emailSending ? '⏳ Sending...' : '📧 Send Itinerary'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── GUEST sticky banner ───────────────────────────────── */}
    {isGuest && !showAuthModal && (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90, background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 -4px 24px rgba(13,148,136,0.3)', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: 0 }}>Sign up free to save, share & download this plan</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: '2px 0 0' }}>Unlimited plans · Festival alerts · Season intelligence</p>
        </div>
        <button onClick={handleGuestAction}
          style={{ padding: '10px 24px', background: 'white', color: '#0d9488', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Sign Up Free →
        </button>
      </div>
    )}

    {/* ── GUEST inline auth modal ───────────────────────────── */}
    {showAuthModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', animation: 'fadeUp 0.3s ease' }}>
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
              {authTab === 'register' ? 'Save your plan' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              {authTab === 'register'
                ? 'Create a free account to save, share & download'
                : 'Sign in to save your plan to your account'}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '3px', marginBottom: '20px', gap: '3px' }}>
            {[['register','Sign Up'], ['login','Sign In']].map(([tab, label]) => (
              <button key={tab}
                onClick={() => { setAuthTab(tab); setAuthErrors({}) }}
                style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', background: authTab === tab ? 'white' : 'transparent', color: authTab === tab ? '#0f172a' : '#64748b', boxShadow: authTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Fields */}
          {authTab === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
              <input type="text" placeholder="Your full name" value={authName}
                onChange={e => { setAuthName(e.target.value); setAuthErrors(p => ({ ...p, name: '' })) }}
                style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${authErrors.name ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                disabled={authLoading} />
              {authErrors.name && <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0', fontWeight: '600' }}>⚠ {authErrors.name}</p>}
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
            <input type="email" placeholder="you@example.com" value={authEmail}
              onChange={e => { setAuthEmail(e.target.value); setAuthErrors(p => ({ ...p, email: '' })) }}
              style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${authErrors.email ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              disabled={authLoading} />
            {authErrors.email && <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0', fontWeight: '600' }}>⚠ {authErrors.email}</p>}
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
            <input type="password" placeholder={authTab === 'login' ? 'Your password' : 'Min 6 characters'} value={authPassword}
              onChange={e => { setAuthPassword(e.target.value); setAuthErrors(p => ({ ...p, password: '' })) }}
              style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${authErrors.password ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              disabled={authLoading} />
            {authErrors.password && <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0', fontWeight: '600' }}>⚠ {authErrors.password}</p>}
          </div>

          {/* Submit */}
          <button onClick={handleGuestAuth} disabled={authLoading}
            style={{ width: '100%', padding: '14px', background: authLoading ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: authLoading ? '#94a3b8' : 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: authLoading ? 'none' : '0 4px 16px rgba(13,148,136,0.35)', marginBottom: '12px' }}>
            {authLoading
              ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#94a3b8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Processing...</>
              : authTab === 'register' ? '✓ Create Account & Save Plan' : '→ Sign In & Save Plan'
            }
          </button>

          {/* Close */}
          <button onClick={() => setShowAuthModal(false)}
            style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Maybe later — keep browsing
          </button>
        </div>
      </div>
    )}
    </>
  )
}
<Footer />
