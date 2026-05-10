// frontend/src/pages/ExplorePage.jsx
// Tripzio Module 4A — Explore Page
// Synced to: UserDashboard design, Navbar, API_URL, localStorage token

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  Search, Mountain, Waves, Sun, Compass, MapPin,
  Clock, Star, ArrowRight, Filter, TrendingUp,
  Sparkles, Heart, Zap, Globe, ChevronRight
} from 'lucide-react'

// ── Full destination data ─────────────────────────────────────
const ALL_DESTINATIONS = [
  // Hill Stations
  {
    name: 'Manali', region: 'Himachal Pradesh', category: 'Hill Station',
    duration: '5-7', budget: 12000, rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#1a1a2e,#0f3460)',
    emoji: '🏔️', badge: 'Trending', badgeColor: '#f59e0b',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#e9d5ff',
    tags: ['Adventure', 'Snow', 'Trekking'], season: 'Mar-Jun, Sep-Nov',
    desc: 'Snow-capped peaks, river valleys, and adventure activities in the Himalayas.',
  },
  {
    name: 'Darjeeling', region: 'West Bengal', category: 'Hill Station',
    duration: '4-6', budget: 10000, rating: 4.7,
    photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#1a2e1a,#0f3420)',
    emoji: '🍵', badge: 'Top Rated', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Tea Gardens', 'Toy Train', 'Views'], season: 'Oct-May',
    desc: 'Queen of the Hills with tea gardens, Toy Train rides, and Kanchenjunga views.',
  },
  {
    name: 'Ooty', region: 'Tamil Nadu', category: 'Hill Station',
    duration: '3-5', budget: 8000, rating: 4.5,
    photo: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#134e1a,#166534)',
    emoji: '🌿', badge: 'Family Fav', badgeColor: '#16a34a',
    accent: '#16a34a', lightBg: '#f0fdf4', border: '#86efac',
    tags: ['Nilgiris', 'Lakes', 'Gardens'], season: 'Oct-Jun',
    desc: 'The Blue Mountains of South India with rolling tea estates and botanical gardens.',
  },
  {
    name: 'Shimla', region: 'Himachal Pradesh', category: 'Hill Station',
    duration: '4-6', budget: 11000, rating: 4.6,
    photo: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#1e3a5f,#1e40af)',
    emoji: '❄️', badge: 'Winter Special', badgeColor: '#3b82f6',
    accent: '#3b82f6', lightBg: '#eff6ff', border: '#bfdbfe',
    tags: ['Snow', 'Mall Road', 'Heritage'], season: 'Oct-Feb',
    desc: 'Former summer capital of British India with colonial charm and snow in winters.',
  },
  // Beaches
  {
    name: 'Goa', region: 'Goa', category: 'Beach',
    duration: '4-6', budget: 15000, rating: 4.7,
    photo: 'https://images.unsplash.com/photo-1587922546307-776227941871?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#006994,#00bcd4)',
    emoji: '🏖️', badge: 'Most Booked', badgeColor: '#0284c7',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Beach', 'Nightlife', 'Water Sports'], season: 'Nov-Mar',
    desc: 'India\'s beach paradise with golden sands, Portuguese heritage, and vibrant nightlife.',
  },
  {
    name: 'Andaman Islands', region: 'Andaman & Nicobar', category: 'Beach',
    duration: '5-7', budget: 25000, rating: 4.9,
    photo: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#0f4c75,#1b6ca8)',
    emoji: '🐠', badge: 'Hidden Gem', badgeColor: '#6366f1',
    accent: '#6366f1', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Scuba Diving', 'Pristine Beaches', 'Islands'], season: 'Nov-May',
    desc: 'Crystal clear waters, coral reefs, and pristine beaches in the Bay of Bengal.',
  },
  {
    name: 'Pondicherry', region: 'Puducherry', category: 'Beach',
    duration: '3-4', budget: 9000, rating: 4.5,
    photo: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#1e3a5f,#fbbf24)',
    emoji: '🇫🇷', badge: 'French Vibes', badgeColor: '#ec4899',
    accent: '#ec4899', lightBg: '#fdf2f8', border: '#fbcfe8',
    tags: ['French Quarter', 'Cafes', 'Auroville'], season: 'Oct-Mar',
    desc: 'A slice of France in India with colonial architecture and serene beaches.',
  },
  // Heritage
  {
    name: 'Rajasthan Circuit', region: 'Rajasthan', category: 'Heritage',
    duration: '7-10', budget: 18000, rating: 4.9,
    photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#7c2d12,#d97706)',
    emoji: '🏯', badge: 'Top Rated', badgeColor: '#d97706',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Forts', 'Desert', 'Palaces'], season: 'Oct-Mar',
    desc: 'Land of kings with majestic forts, royal palaces, and the Thar Desert.',
  },
  {
    name: 'Varanasi', region: 'Uttar Pradesh', category: 'Heritage',
    duration: '3-4', budget: 8000, rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1561361058-c24e0e408312?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#7c2d12,#b45309)',
    emoji: '🪔', badge: 'Spiritual', badgeColor: '#f97316',
    accent: '#f97316', lightBg: '#fff7ed', border: '#fed7aa',
    tags: ['Ghats', 'Temples', 'Ganga Aarti'], season: 'Oct-Mar',
    desc: 'The spiritual capital of India with ancient ghats, temples, and evening aartis.',
  },
  {
    name: 'Agra', region: 'Uttar Pradesh', category: 'Heritage',
    duration: '2-3', budget: 7000, rating: 4.6,
    photo: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#3b1515,#7c3aed)',
    emoji: '🕌', badge: 'UNESCO', badgeColor: '#7c3aed',
    accent: '#7c3aed', lightBg: '#f5f3ff', border: '#ddd6fe',
    tags: ['Taj Mahal', 'Mughal History', 'Agra Fort'], season: 'Oct-Mar',
    desc: 'Home to the Taj Mahal — one of the Seven Wonders of the World.',
  },
  // Adventure
  {
    name: 'Leh-Ladakh', region: 'Ladakh', category: 'Adventure',
    duration: '7-10', budget: 22000, rating: 4.9,
    photo: 'https://images.unsplash.com/photo-1626015365107-338e3f8f7f3c?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#0f172a,#1e3a5f)',
    emoji: '🏍️', badge: 'Epic', badgeColor: '#ef4444',
    accent: '#ef4444', lightBg: '#fef2f2', border: '#fecaca',
    tags: ['Bike Trip', 'High Altitude', 'Pangong Lake'], season: 'Jun-Sep',
    desc: 'The last frontier — moonscapes, Buddhist monasteries, and Pangong Lake.',
  },
  {
    name: 'Rishikesh', region: 'Uttarakhand', category: 'Adventure',
    duration: '3-5', budget: 8000, rating: 4.7,
    photo: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#134e4a,#0d9488)',
    emoji: '🌊', badge: 'Adrenaline', badgeColor: '#0d9488',
    accent: '#0d9488', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['River Rafting', 'Bungee', 'Yoga'], season: 'Sep-Jun',
    desc: 'Yoga capital of the world and adventure hub on the banks of the Ganges.',
  },
  // Nature & Wildlife
  {
    name: 'Kerala', region: 'Kerala', category: 'Nature',
    duration: '5-7', budget: 14000, rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#134e4a,#065f46)',
    emoji: '🌴', badge: 'God\'s Own', badgeColor: '#22c55e',
    accent: '#22c55e', lightBg: '#f0fdf4', border: '#bbf7d0',
    tags: ['Backwaters', 'Ayurveda', 'Houseboat'], season: 'Sep-Mar',
    desc: 'God\'s own country with serene backwaters, spice plantations, and elephant sanctuaries.',
  },
  {
    name: 'Jim Corbett', region: 'Uttarakhand', category: 'Nature',
    duration: '3-4', budget: 12000, rating: 4.6,
    photo: 'https://images.unsplash.com/photo-1615838033239-1d3a9c06cd63?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#14532d,#166534)',
    emoji: '🐯', badge: 'Wildlife', badgeColor: '#f59e0b',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Tiger Safari', 'Jungle', 'Wildlife'], season: 'Nov-Jun',
    desc: 'India\'s oldest national park — home to tigers, elephants, and over 600 bird species.',
  },
]

const CATEGORIES = [
  { id: 'all',        label: 'All',          icon: <Globe size={15} />,    color: '#0d9488' },
  { id: 'Hill Station', label: 'Hill Stations', icon: <Mountain size={15} />, color: '#8b5cf6' },
  { id: 'Beach',      label: 'Beaches',      icon: <Waves size={15} />,    color: '#0ea5e9' },
  { id: 'Heritage',   label: 'Heritage',     icon: <Sun size={15} />,      color: '#f59e0b' },
  { id: 'Adventure',  label: 'Adventure',    icon: <Compass size={15} />,  color: '#ef4444' },
  { id: 'Nature',     label: 'Nature',       icon: <Sparkles size={15} />, color: '#22c55e' },
]

const BUDGET_FILTERS = [
  { id: 'all',    label: 'Any Budget' },
  { id: 'low',    label: 'Under ₹10K',  min: 0,     max: 10000 },
  { id: 'mid',    label: '₹10K–₹20K',  min: 10000, max: 20000 },
  { id: 'high',   label: 'Above ₹20K', min: 20000, max: 999999 },
]

const DURATION_FILTERS = [
  { id: 'all',    label: 'Any Duration' },
  { id: 'short',  label: '1–4 Days',  min: 1, max: 4 },
  { id: 'medium', label: '5–7 Days',  min: 5, max: 7 },
  { id: 'long',   label: '8+ Days',   min: 8, max: 99 },
]

export default function ExplorePage() {
  const navigate = useNavigate()
  const [category, setCategory]   = useState('all')
  const [budget,   setBudget]     = useState('all')
  const [duration, setDuration]   = useState('all')
  const [search,   setSearch]     = useState('')
  const [saved,    setSaved]      = useState([])

  // Filter logic
  const filtered = ALL_DESTINATIONS.filter(d => {
    if (category !== 'all' && d.category !== category) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) &&
        !d.region.toLowerCase().includes(search.toLowerCase()) &&
        !d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false
    if (budget !== 'all') {
      const bf = BUDGET_FILTERS.find(b => b.id === budget)
      if (bf && (d.budget < bf.min || d.budget > bf.max)) return false
    }
    if (duration !== 'all') {
      const df = DURATION_FILTERS.find(d2 => d2.id === duration)
      const minDays = parseInt(d.duration.split('-')[0])
      if (df && (minDays < df.min || minDays > df.max)) return false
    }
    return true
  })

  function handlePlanThis(dest) {
    navigate('/dashboard', {
      state: {
        prefill: {
          destination: dest.name,
          planMode: 'detailed',
          destinationMode: 'specific',
        }
      }
    })
  }

  function toggleSave(name) {
    setSaved(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name])
  }

  const activeCategory = CATEGORIES.find(c => c.id === category) || CATEGORIES[0]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dest-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(0,0,0,0.12) !important; }
        .dest-card { transition: all 0.28s cubic-bezier(0.4,0,0.2,1); }
        .cat-pill:hover { transform: translateY(-1px); }
        .plan-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <Navbar />

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)',
        padding: '60px 24px 48px', textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: '20px', padding: '5px 14px', marginBottom: '18px' }}>
          <TrendingUp size={12} color="#0d9488" />
          <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Explore India</span>
        </div>
        <h1 style={{
          fontSize: 'clamp(28px,5vw,48px)', fontWeight: '900', color: 'white',
          fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1px',
          marginBottom: '12px', lineHeight: 1.1,
        }}>
          Where do you want to go?
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '28px', maxWidth: '480px', margin: '0 auto 28px' }}>
          Browse {ALL_DESTINATIONS.length}+ handpicked destinations across India
        </p>

        {/* Search */}
        <div style={{ maxWidth: '500px', margin: '0 auto', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search destinations, regions, activities..."
            style={{
              width: '100%', padding: '14px 16px 14px 44px',
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px',
              color: 'white', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#0d9488'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id}
              className="cat-pill"
              onClick={() => setCategory(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 18px', borderRadius: '24px',
                border: `1.5px solid ${category === cat.id ? cat.color : '#e2e8f0'}`,
                background: category === cat.id ? cat.color : 'white',
                color: category === cat.id ? 'white' : '#64748b',
                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                boxShadow: category === cat.id ? `0 4px 14px ${cat.color}40` : 'none',
              }}>
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
            <Filter size={13} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Filters:</span>
          </div>

          {/* Budget filter */}
          <select
            value={budget}
            onChange={e => setBudget(e.target.value)}
            style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#374151', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
            {BUDGET_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>

          {/* Duration filter */}
          <select
            value={duration}
            onChange={e => setDuration(e.target.value)}
            style={{ padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#374151', background: 'white', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none' }}>
            {DURATION_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>

          {/* Result count */}
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>
            {filtered.length} destination{filtered.length !== 1 ? 's' : ''}
            {category !== 'all' ? ` in ${activeCategory.label}` : ''}
          </span>
        </div>

        {/* No results */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>No destinations found</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your filters</p>
          </div>
        )}

        {/* Destination grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '22px',
        }}>
          {filtered.map((dest, i) => (
            <div key={dest.name}
              className="dest-card"
              style={{
                background: 'white', borderRadius: '22px', overflow: 'hidden',
                border: '1.5px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                animation: `fadeUp ${0.2 + i * 0.05}s ease`,
                cursor: 'pointer',
              }}>

              {/* Photo */}
              <div style={{ position: 'relative', height: '200px', background: dest.photoBg, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '72px', opacity: 0.2 }}>{dest.emoji}</span>
                </div>
                <img src={dest.photo} alt={dest.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  onError={e => e.currentTarget.style.opacity = '0'}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />

                {/* Badge */}
                <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  <span style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white', fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dest.badgeColor, display: 'inline-block' }} />
                    {dest.badge}
                  </span>
                </div>

                {/* Save button */}
                <button
                  onClick={e => { e.stopPropagation(); toggleSave(dest.name) }}
                  style={{ position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <Heart size={14} fill={saved.includes(dest.name) ? '#ef4444' : 'none'} color={saved.includes(dest.name) ? '#ef4444' : '#64748b'} />
                </button>

                {/* Rating */}
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255,255,255,0.95)', padding: '4px 9px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={10} fill="#f59e0b" color="#f59e0b" />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#92400e' }}>{dest.rating}</span>
                </div>

                {/* Season */}
                <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
                  <span style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.8)', fontSize: '9px', fontWeight: '600', padding: '3px 8px', borderRadius: '10px' }}>
                    Best: {dest.season}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                      {dest.name}
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', flexShrink: 0, marginLeft: '8px', marginTop: '3px' }}>
                      {dest.region}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.5 }}>{dest.desc}</p>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {dest.tags.map(tag => (
                    <span key={tag} style={{ padding: '3px 9px', background: dest.lightBg, border: `1px solid ${dest.border}`, borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: dest.accent }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} color="#94a3b8" />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{dest.duration} days</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>from</span>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: dest.accent, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        ₹{dest.budget.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <button
                    className="plan-btn"
                    onClick={() => handlePlanThis(dest)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '10px',
                      background: dest.accent, color: 'white',
                      border: 'none', fontSize: '12px', fontWeight: '700',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.2s',
                      boxShadow: `0 3px 10px ${dest.accent}40`,
                    }}>
                    Plan This <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '52px', padding: '40px', background: 'white', borderRadius: '24px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈️</div>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 8px' }}>
            Don't see your dream destination?
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>
            Our AI can plan a trip to anywhere in India — just describe what you want
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '13px 28px', background: 'linear-gradient(135deg,#0d9488,#0284c7)',
              color: 'white', border: 'none', borderRadius: '14px',
              fontSize: '14px', fontWeight: '800', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 4px 16px rgba(13,148,136,0.35)',
            }}>
            Plan a Custom Trip with AI ✨
          </button>
        </div>
      </div>
    </div>
  )
}
