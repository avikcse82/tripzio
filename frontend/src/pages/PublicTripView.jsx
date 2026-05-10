// frontend/src/pages/PublicTripView.jsx
// Tripzio Module 4A — Public Trip View
// Opens via /trip/:slug — no login required
// Beautiful read-only itinerary with CTA to signup

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../api'
import {
  MapPin, Clock, Calendar, Heart, Share2,
  MessageCircle, ChevronDown, ChevronUp, Star,
  ArrowRight, Sparkles, Users, Navigation
} from 'lucide-react'

const TIER_COLORS = {
  bronze:   { color: '#92400e', bg: '#fef3c7', label: 'Bronze Plan' },
  silver:   { color: '#334155', bg: '#f1f5f9', label: 'Silver Plan' },
  gold:     { color: '#92400e', bg: '#fef9c3', label: 'Gold Plan' },
  diamond:  { color: '#1d4ed8', bg: '#eff6ff', label: 'Diamond Plan' },
  platinum: { color: '#6b21a8', bg: '#faf5ff', label: 'Platinum Plan' },
}

const DAY_COLORS = [
  { from: '#f97316', to: '#ef4444', light: '#fff7ed' },
  { from: '#8b5cf6', to: '#6d28d9', light: '#f5f3ff' },
  { from: '#0d9488', to: '#0284c7', light: '#f0fdfa' },
  { from: '#f59e0b', to: '#d97706', light: '#fffbeb' },
  { from: '#22c55e', to: '#16a34a', light: '#f0fdf4' },
  { from: '#ec4899', to: '#db2777', light: '#fdf2f8' },
]

export default function PublicTripView() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [trip, setTrip]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/share/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Trip not found')
        return r.json()
      })
      .then(data => {
        setTrip(data)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [slug])

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const text = `Check out this amazing trip plan: ${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function handlePlanMine() {
    navigate('/login', { state: { from: 'share', dest: trip?.destination } })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading trip...</p>
        <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Trip not found</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>This link may have expired or been removed.</p>
        <button onClick={() => navigate('/')}
          style={{ padding: '12px 24px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          Go to Tripzio
        </button>
      </div>
    </div>
  )

  const data = trip?.trip_data || {}
  const tier = TIER_COLORS[data.plan_tier] || TIER_COLORS.silver
  const agentName = trip?.agent_name || null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={14} color="white" />
          </div>
          <span style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            TRIPZIO
          </span>
          {agentName && (
            <span style={{ fontSize: '11px', color: '#64748b', borderLeft: '1px solid #e2e8f0', paddingLeft: '10px', marginLeft: '2px' }}>
              via {agentName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleCopyLink}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: '#374151' }}>
            <Share2 size={13} />
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button onClick={handlePlanMine}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg,#0d9488,#0284c7)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: 'white' }}>
            <Sparkles size={13} />
            Plan Mine Free
          </button>
        </div>
      </div>

      {/* Hero — full height with destination photo */}
      <div style={{ position: 'relative', minHeight: '520px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', background: '#0f172a' }}>

        {/* Destination photo from picsum — seed based on destination name */}
        <img
          src={`https://picsum.photos/seed/${encodeURIComponent((data.destination||'travel').replace(/[^a-zA-Z]/g,'').toLowerCase().slice(0,15))}/1600/900`}
          alt={data.destination || 'Destination'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />

        {/* Gradient overlay — dark at bottom for text readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.4) 40%, rgba(15,23,42,0.88) 80%, rgba(15,23,42,0.97) 100%)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '60px 24px 48px', textAlign: 'center' }}>

          {/* Tier badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: tier.bg, borderRadius: '20px', padding: '5px 14px', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: tier.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tier.label} Itinerary</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(30px,5vw,52px)', fontWeight: '900', color: 'white',
            fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1px',
            marginBottom: '14px', lineHeight: 1.05, maxWidth: '700px', margin: '0 auto 14px',
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}>
            {data.destination || trip?.destination || 'Your Trip'}
          </h1>

          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', maxWidth: '520px', margin: '0 auto 28px', lineHeight: 1.65, textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
            {data.summary || ''}
          </p>

          {/* Meta chips */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
            {[
              data.days      && { icon: <Calendar size={13} />, val: `${data.days} Days` },
              data.from_city && { icon: <MapPin size={13} />, val: `From ${data.from_city}` },
              data.budget    && { icon: <span style={{fontSize:'13px'}}>Rs.</span>, val: Number(data.budget).toLocaleString('en-IN') },
            ].filter(Boolean).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: '600' }}>
                {m.icon} {m.val}
              </div>
            ))}
          </div>

          {/* Views count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
            <Users size={12} />
            <span>{(trip?.views || 0)} people viewed this trip</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Highlights */}
        {data.highlights?.length > 0 && (
          <div style={{ marginBottom: '36px', animation: 'fadeUp 0.3s ease' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>
              ✨ Trip Highlights
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px' }}>
              {data.highlights.slice(0, 6).map((h, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488', flexShrink: 0, marginTop: '5px' }} />
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day plans */}
        {data.day_plans?.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>
              📅 Day-by-Day Itinerary
            </h2>
            {data.day_plans.map((day, i) => {
              const dc = DAY_COLORS[i % DAY_COLORS.length]
              const isOpen = expanded === i
              return (
                <div key={i} style={{ marginBottom: '12px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', animation: `fadeUp ${0.2 + i * 0.05}s ease` }}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : i)}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', background: isOpen ? `linear-gradient(135deg,${dc.from},${dc.to})` : 'white', transition: 'background 0.2s' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isOpen ? 'rgba(255,255,255,0.2)' : `linear-gradient(135deg,${dc.from},${dc.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'white' }}>D{day.day}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: isOpen ? 'white' : '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {day.title || `Day ${day.day}`}
                      </div>
                      {day.estimated_cost && (
                        <div style={{ fontSize: '11px', color: isOpen ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginTop: '2px' }}>
                          Est. {day.estimated_cost}
                        </div>
                      )}
                    </div>
                    {isOpen
                      ? <ChevronUp size={16} color="rgba(255,255,255,0.8)" />
                      : <ChevronDown size={16} color="#94a3b8" />}
                  </div>

                  {isOpen && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9' }}>
                      {[
                        { label: 'Morning', val: day.morning, color: '#f59e0b' },
                        { label: 'Afternoon', val: day.afternoon, color: '#0ea5e9' },
                        { label: 'Evening', val: day.evening, color: '#8b5cf6' },
                      ].filter(s => s.val).map(slot => (
                        <div key={slot.label} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ minWidth: '80px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: slot.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{slot.label}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.55 }}>{slot.val}</p>
                        </div>
                      ))}
                      {(day.meals || day.stay) && (
                        <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                          {day.meals && <span style={{ fontSize: '12px', color: '#64748b' }}><strong style={{ color: '#374151' }}>Meals:</strong> {day.meals}</span>}
                          {day.stay && <span style={{ fontSize: '12px', color: '#64748b' }}><strong style={{ color: '#374151' }}>Stay:</strong> {day.stay}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Hotels */}
        {data.accommodation?.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '16px' }}>
              🏨 Recommended Hotels
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }}>
              {data.accommodation.slice(0, 4).map((h, i) => {
                const seed = (h.area || h.name || 'hotel').replace(/[^a-zA-Z]/g,'').toLowerCase().slice(0,10) + i
                return (
                <div key={i} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                  {/* Hotel photo */}
                  <div style={{ position: 'relative', height: '140px', background: '#1e293b', overflow: 'hidden' }}>
                    <img
                      src={`https://picsum.photos/seed/${seed}/600/300`}
                      alt={h.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                      onError={e => { e.currentTarget.style.display='none' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                    {/* Area badge */}
                    {h.area && (
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '3px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: '#374151' }}>
                        {h.area}
                      </div>
                    )}
                  </div>
                  {/* Hotel info */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{h.name}</div>
                      <div style={{ color: '#f59e0b', fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>{'★'.repeat(Math.min(Math.round(parseFloat(h.rating)||4), 5))}</div>
                    </div>
                    {h.why && <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', lineHeight: 1.4 }}>{h.why}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0d9488' }}>{h.price_range}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '20px' }}>Recommended</div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* CTA Block */}
        <div style={{
          background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
          borderRadius: '24px', padding: '40px 32px', textAlign: 'center',
          animation: 'fadeUp 0.4s ease',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0d9488', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
            Love this itinerary?
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: '900', color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '10px', letterSpacing: '-0.5px' }}>
            Plan your own trip for free
          </h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px' }}>
            Tripzio AI builds personalized itineraries in 30 seconds. Completely free.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handlePlanMine}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 26px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 16px rgba(13,148,136,0.4)' }}>
              <Sparkles size={16} /> Start Planning Free
            </button>
            <button onClick={handleWhatsApp}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 22px', background: '#25d366', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              <MessageCircle size={16} /> Share on WhatsApp
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '20px' }}>
            Powered by Tripzio AI · tripzio.io
            {agentName && ` · Shared by ${agentName}`}
          </p>
        </div>
      </div>
    </div>
  )
}
