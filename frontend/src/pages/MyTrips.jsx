// frontend/src/pages/MyTrips.jsx
// Tripzio Module 3 — My Trips history page
// Synced to: UserDashboard style, API_URL from '../api', localStorage token, Navbar component

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { API_URL } from '../api'
import {
  MapPin, Calendar, Clock, Trash2, ArrowRight,
  Heart, Plane, ChevronRight, Search, AlertTriangle,
  Sparkles, BookOpen, TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_META = {
  bronze:   { label: 'Bronze',   emoji: '🥉', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  silver:   { label: 'Silver',   emoji: '🥈', color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' },
  gold:     { label: 'Gold',     emoji: '🥇', color: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
  diamond:  { label: 'Diamond',  emoji: '💎', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  platinum: { label: 'Platinum', emoji: '✨', color: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff' },
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBudget(b) {
  if (!b) return null
  if (b >= 100000) return `₹${(b / 100000).toFixed(1)}L`
  if (b >= 1000) return `₹${Math.round(b / 1000)}K`
  return `₹${b}`
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onPlan }) {
  return (
    <div style={{
      background: 'white', borderRadius: '24px',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
      padding: '64px 40px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '56px', marginBottom: '20px' }}>🗺️</div>
      <h2 style={{
        fontSize: '22px', fontWeight: '800', color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 10px',
      }}>
        No saved trips yet
      </h2>
      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
        Plan a trip and hit <strong style={{ color: '#0d9488' }}>Save Trip</strong> to see it here.
      </p>
      <button
        onClick={onPlan}
        className="gen-btn"
        style={{
          background: 'linear-gradient(135deg,#F97316,#F59E0B)',
          color: 'white', border: 'none', borderRadius: '14px',
          padding: '13px 28px', fontSize: '14px', fontWeight: '700',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          boxShadow: '0 8px 22px rgba(249,115,22,0.32)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
        }}
      >
        Plan My First Trip ✈️
      </button>
    </div>
  )
}

// ─── Trip card ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onOpen, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const tier = TIER_META[trip.plan_tier] || TIER_META.silver

  async function handleDelete(e) {
    e.stopPropagation()
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    await onDelete(trip.id)
    setDeleting(false)
    setConfirmDel(false)
  }

  return (
    <div
      className="trip-card"
      onClick={() => onOpen(trip)}
      style={{
        background: 'white',
        border: '1.5px solid rgba(0,0,0,0.06)',
        borderRadius: '22px',
        padding: '22px 24px',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease, border-color 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle teal accent top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg,#0d9488,#0ea5e9)',
        borderRadius: '22px 22px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: '16px', fontWeight: '800', color: '#0f172a',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            margin: '0 0 4px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {trip.title}
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: '500' }}>
            {timeAgo(trip.created_at)}
          </p>
        </div>

        {/* Tier badge */}
        <span style={{
          background: tier.bg,
          color: tier.color,
          border: `1px solid ${tier.border}`,
          fontSize: '10px', fontWeight: '800',
          padding: '4px 10px', borderRadius: '20px',
          whiteSpace: 'nowrap', flexShrink: 0,
          letterSpacing: '0.3px',
        }}>
          {tier.emoji} {tier.label}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[
          { icon: <Calendar size={12} color="#94a3b8" />, val: `${trip.days} days` },
          { icon: <MapPin size={12} color="#94a3b8" />, val: trip.destination },
          formatBudget(trip.budget)
            ? { icon: <span style={{ fontSize: '12px' }}>💰</span>, val: formatBudget(trip.budget) }
            : null,
        ].filter(Boolean).map(({ icon, val }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {icon}
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '14px', borderTop: '1px solid #f1f5f9',
      }}>
        <span style={{
          fontSize: '13px', fontWeight: '700', color: '#0d9488',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          View itinerary <ChevronRight size={14} />
        </span>

        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: confirmDel ? '#fff1f2' : 'transparent',
            border: `1px solid ${confirmDel ? '#fca5a5' : '#e2e8f0'}`,
            color: confirmDel ? '#e11d48' : '#94a3b8',
            borderRadius: '8px', padding: '5px 10px',
            fontSize: '11px', fontWeight: '700',
            cursor: deleting ? 'not-allowed' : 'pointer',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, color 0.2s ease, background 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '4px',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => { if (!confirmDel) { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#e11d48' } }}
          onMouseLeave={e => { if (!confirmDel) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8' } }}
        >
          <Trash2 size={11} />
          {deleting ? 'Deleting…' : confirmDel ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

// ─── Free tier banner ─────────────────────────────────────────────────────────

function FreeBanner({ count }) {
  const navigate = useNavigate()
  const left = Math.max(0, 3 - count)
  return (
    <div style={{
      background: '#fffbeb', border: '1px solid #fcd34d',
      borderRadius: '16px', padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap', marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertTriangle size={16} color="#d97706" />
        <p style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
          Free plan · <strong>{left} save{left !== 1 ? 's' : ''}</strong> remaining of 3
        </p>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        style={{
          background: 'linear-gradient(135deg,#F97316,#F59E0B)',
          color: 'white', border: 'none', borderRadius: '10px',
          padding: '7px 16px', fontSize: '12px', fontWeight: '700',
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        Upgrade to Pro ↗
      </button>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MyTrips() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterDest, setFilterDest] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    const token = localStorage.getItem('tripzio_token')
    if (!token) { navigate('/login'); return }
    fetchTrips(token)
  }, [])

  async function fetchTrips(token) {
    token = token || localStorage.getItem('tripzio_token')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/trips/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load trips')
      const data = await res.json()
      setTrips(data)
    } catch (err) {
      setError(err.message)
      toast.error('Could not load trips')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(tripId) {
    const token = localStorage.getItem('tripzio_token')
    try {
      const res = await fetch(`${API_URL}/trips/${tripId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      setTrips(prev => prev.filter(t => t.id !== tripId))
      toast.success('Trip deleted')
    } catch {
      toast.error('Could not delete trip. Please try again.')
    }
  }

  function handleOpen(trip) {
    navigate('/itinerary/result', {
      state: {
        itinerary: trip.itinerary,
        weather: trip.weather,
        hotels: trip.hotels,
        savedMeta: {
          from_city: trip.from_city,
          destination: trip.destination,
          days: trip.days,
          travelers: trip.travelers,
          budget: trip.budget,
          plan_tier: trip.plan_tier,
        },
        savedTripId: trip.id,
        readOnly: true,
      },
    })
  }

  // Get unique destinations for filter
  const uniqueDests = [...new Set(trips.map(t => t.destination).filter(Boolean))]

  const filtered = trips
    .filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !t.destination.toLowerCase().includes(search.toLowerCase()) &&
          !t.from_city.toLowerCase().includes(search.toLowerCase())) return false
      if (filterTier !== 'all' && t.plan_tier !== filterTier) return false
      if (filterDest !== 'all' && t.destination !== filterDest) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'days_desc') return (b.days || 0) - (a.days || 0)
      if (sortBy === 'days_asc') return (a.days || 0) - (b.days || 0)
      return 0
    })

  const isFree = true // TODO: replace with real sub check in Module 4

  const BG_PHOTOS = [
    'https://images.unsplash.com/photo-1587922546307-776227941871?w=1400&q=65', // Goa
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&q=65', // Kerala
    'https://images.unsplash.com/photo-1524229648276-e66561fe45a9?w=1400&q=65', // Rajasthan
    'https://images.unsplash.com/photo-1586053226626-febc8817962f?w=1400&q=65', // Andaman
    'https://images.unsplash.com/photo-1658593345227-965f61fd6ba1?w=1400&q=65', // Darjeeling
    'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1400&q=65', // Varanasi
    'https://images.unsplash.com/photo-1650341259809-9314b0de9268?w=1400&q=65', // Rishikesh
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1400&q=65', // Ladakh
    'https://images.unsplash.com/photo-1574988050647-33c6773e5e9a?w=1400&q=65', // Manali
    'https://images.unsplash.com/photo-1597074866923-dc0589150358?w=1400&q=65', // Shimla
  ]
  const [bgIdx, setBgIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setBgIdx(p => (p + 1) % BG_PHOTOS.length), 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
    }}>
      {/* Full-page fixed rotating photo background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -2, overflow: 'hidden' }}>
        {BG_PHOTOS.map((photo, i) => (
          <img key={photo} src={photo} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: bgIdx === i ? 1 : 0, transition: 'opacity 2.2s ease',
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg,rgba(250,250,248,0.62) 0%,rgba(250,250,248,0.70) 100%), radial-gradient(circle at 15% 10%, rgba(13,148,136,0.08), transparent 40%), radial-gradient(circle at 88% 85%, rgba(249,115,22,0.06), transparent 40%)',
        }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .trip-card:hover { transform: translateY(-5px) !important; box-shadow: 0 16px 36px rgba(15,23,42,0.1) !important; border-color: rgba(13,148,136,0.25) !important; }
        .gen-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(249,115,22,0.4) !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <Navbar />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '32px', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'white', border: '1px solid #e2e8f0',
                color: '#64748b', borderRadius: '10px',
                padding: '7px 14px', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              ← Dashboard
            </button>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' }}>
            <BookOpen size={12} color="#B45309" />
            <span style={{ fontSize: '11px', color: '#B45309', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>My Trips</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(26px,4vw,40px)', fontWeight: '700', color: '#0F172A',
            fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '-0.6px',
            marginBottom: '8px', lineHeight: 1.1,
          }}>
            Your saved itineraries
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
            {loading ? 'Loading…' : `${trips.length} saved trip${trips.length !== 1 ? 's' : ''}`}
            {user?.full_name ? ` · ${user.full_name.split(' ')[0]}'s collection` : ''}
          </p>
        </div>

        {/* Free plan banner */}
        {!loading && isFree && trips.length > 0 && (
          <FreeBanner count={trips.length} />
        )}

        {/* Search — only show when 3+ trips */}
        {/* ── Filters Row ── */}
        {trips.length >= 2 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
            {/* Tier filter */}
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#374151', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
              <option value="all">All Tiers</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="diamond">Diamond</option>
              <option value="platinum">Platinum</option>
            </select>

            {/* Destination filter */}
            {uniqueDests.length > 1 && (
              <select value={filterDest} onChange={e => setFilterDest(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#374151', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none', maxWidth: '180px' }}>
                <option value="all">All Destinations</option>
                {uniqueDests.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#374151', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="days_desc">Longest Trip</option>
              <option value="days_asc">Shortest Trip</option>
            </select>

            {/* Active filter count */}
            {(filterTier !== 'all' || filterDest !== 'all') && (
              <button onClick={() => { setFilterTier('all'); setFilterDest('all') }}
                style={{ padding: '7px 12px', border: '1.5px solid #fca5a5', borderRadius: '10px', fontSize: '11px', fontWeight: '700', color: '#ef4444', background: '#fff1f2', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Clear Filters ×
              </button>
            )}

            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
              {filtered.length} of {trips.length} trips
            </span>
          </div>
        )}

        {trips.length >= 3 && (
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search trips by destination or city…"
              style={{
                width: '100%', padding: '11px 14px 11px 38px',
                background: 'white', border: '1.5px solid #e2e8f0',
                borderRadius: '12px', color: '#0f172a',
                fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading your trips…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            background: '#fff1f2', border: '1px solid #fca5a5',
            borderRadius: '16px', padding: '20px', textAlign: 'center',
          }}>
            <AlertTriangle size={20} color="#e11d48" style={{ marginBottom: '8px' }} />
            <p style={{ color: '#be123c', fontSize: '14px', margin: '0 0 12px' }}>{error}</p>
            <button onClick={() => fetchTrips()} style={{
              background: '#0d9488', color: 'white', border: 'none',
              borderRadius: '8px', padding: '8px 18px', fontSize: '13px',
              fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && trips.length === 0 && (
          <EmptyState onPlan={() => navigate('/dashboard')} />
        )}

        {/* Trip grid */}
        {!loading && !error && trips.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
            gap: '20px',
          }}>
            {filtered.length === 0 ? (
              <div style={{
                gridColumn: '1/-1', textAlign: 'center',
                padding: '48px', color: '#94a3b8', fontSize: '14px',
              }}>
                No trips match "{search}"
              </div>
            ) : (
              filtered.map((trip, i) => (
                <div key={trip.id} style={{ animation: `fadeUp ${0.3 + i * 0.06}s ease` }}>
                  <TripCard trip={trip} onOpen={handleOpen} onDelete={handleDelete} />
                </div>
              ))
            )}
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && trips.length > 0 && (
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="gen-btn"
              style={{
                background: 'linear-gradient(135deg,#F97316,#F59E0B)',
                color: 'white', border: 'none', borderRadius: '14px',
                padding: '13px 28px', fontSize: '14px', fontWeight: '700',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 22px rgba(249,115,22,0.32)',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
              }}
            >
              <Sparkles size={16} /> Plan Another Trip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
