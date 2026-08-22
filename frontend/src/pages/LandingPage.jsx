import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSEO } from '../hooks/useSEO'
import { MapPin, Zap, ArrowRight, Globe, Shield, Clock, TrendingUp, Calendar, Star, ChevronRight, Sparkles } from 'lucide-react'

// ── Real destination photos from Unsplash (free, no key needed) ─────────
const DESTINATIONS = [
  { name: 'Ladakh',      region: 'J&K',        photo: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80', tag: 'Adventure' },
  { name: 'Goa',         region: 'Goa',         photo: 'https://images.unsplash.com/photo-1587922546307-776227941871?w=800&q=80', tag: 'Beach' },
  { name: 'Darjeeling',  region: 'West Bengal', photo: 'https://images.unsplash.com/photo-1549817997-f6958ecf47b9?w=800&q=80', tag: 'Hill Station' },
  { name: 'Varanasi',    region: 'UP',          photo: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80', tag: 'Spiritual' },
  { name: 'Kerala',      region: 'Kerala',      photo: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80', tag: 'Backwaters' },
  { name: 'Rajasthan',   region: 'Rajasthan',   photo: 'https://images.unsplash.com/photo-1524229648276-e66561fe45a9?w=800&q=80', tag: 'Heritage' },
  { name: 'Munnar',      region: 'Kerala',      photo: 'https://images.unsplash.com/photo-1455157823797-3019317cbcf0?w=800&q=80', tag: 'Nature' },
  { name: 'Hampi',       region: 'Karnataka',   photo: 'https://images.unsplash.com/photo-1631622958637-11d9f35ef78e?w=800&q=80', tag: 'UNESCO' },
]

const FEATURES = [
  { icon: '⚡', color: '#0ea5e9', bg: '#eff6ff', title: 'No Chatbot. Just Type.', desc: 'No back-and-forth questions. Type your full trip in one line — AI understands everything. Faster than any chatbot.' },
  { icon: '🗺️', color: '#14b8a6', bg: '#f0fdfa', title: 'All India Coverage', desc: '101+ destinations across every Indian state. From Kashmir to Kanyakumari, Kutch to Arunachal — no destination left behind.' },
  { icon: '🎪', color: '#f59e0b', bg: '#fffbeb', title: 'Festival Intelligence', desc: 'Unique feature: Tripzio warns you about festivals near your travel dates. Know when Goa prices spike 4x for Christmas — before you book.' },
  { icon: '💼', color: '#8b5cf6', bg: '#f5f3ff', title: 'Built for Travel Agents', desc: 'Generate 3 itinerary options in 2 minutes. White-label PDF with your agency branding. WhatsApp share in one click.' },
  { icon: '🇮🇳', color: '#ef4444', bg: '#fef2f2', title: 'India-First Intelligence', desc: 'Real Indian pricing. Budget from ₹5,000 to ₹5 lakh. Understands trains, permits, seasons, circuits, and regional festivals.' },
  { icon: '💰', color: '#22c55e', bg: '#f0fdf4', title: 'Transparent Budget', desc: 'Every plan includes a clear cost breakdown — transport, hotels, food, activities. No surprises. Plan confidently.' },
  { icon: '🏥', color: '#6366f1', bg: '#eef2ff', title: 'Health & Safety Built In', desc: 'Every plan includes the nearest hospital, India\'s emergency helpline, and destination-specific advisories — monsoon risks, altitude warnings, and more.' },
  { icon: '🙏', color: '#ec4899', bg: '#fdf2f8', title: 'Local Culture, Explained', desc: 'Cultural etiquette, dress codes, tipping norms, and local tips for every destination — so you never accidentally offend, overpay, or miss the unwritten rules.' },
]

const SAMPLE_PLAN = {
  destination: 'Darjeeling → Gangtok Circuit',
  days: 5, budget: '₹18,000', from: 'Kolkata', tier: 'Silver',
  highlights: ['Tiger Hill sunrise — Kanchenjunga views', 'Darjeeling Toy Train UNESCO ride', 'Rumtek Monastery — largest in Sikkim', 'MG Marg evening stroll Gangtok', 'Tea garden walks — fresh Darjeeling tea'],
  days_plan: [
    { day: 1, title: 'Arrival in Darjeeling', plan: 'NJP → taxi to Darjeeling. Mall Road, momos at Glenary\'s. Observatory Hill sunset.' },
    { day: 2, title: 'Tiger Hill & Heritage', plan: '4AM Tiger Hill sunrise, Batasia Loop, HMI Museum, Peace Pagoda, Chowrasta.' },
    { day: 3, title: 'Toy Train + Transfer', plan: 'Morning Toy Train joyride, drive Gangtok via Teesta River Valley, MG Marg.' },
    { day: 4, title: 'Gangtok Monasteries', plan: 'Rumtek, Enchey Monastery, Do-Drul Chorten, Handicraft Centre, local market.' },
    { day: 5, title: 'Return to Kolkata', plan: 'Tashi Viewpoint sunrise, drive NJP, Howrah Express evening, home by night.' },
  ],
  hotels: [
    { city: 'Darjeeling', name: 'Cedar Inn', rating: 4.1, price: '₹2,500/night', real: true },
    { city: 'Gangtok', name: 'Chumbi Residency', rating: 4.3, price: '₹3,000/night', real: true },
  ],
  costs: { transport: '₹5,000', hotels: '₹8,000', food: '₹3,000', activities: '₹2,000', total: '₹18,000' },
  festival: { name: 'Republic Day', date: 'Jan 26', note: 'Falls 6 days after trip — consider extending!', emoji: '🇮🇳' }
}

const HOW_IT_WORKS = [
  { step: '01', title: 'Describe your trip', desc: 'Type in Hindi, English, or mixed. "Goa 5 din December mein, budget 25 hajar, couple" — our AI understands it all.', icon: '✍️' },
  { step: '02', title: 'AI builds your plan', desc: 'In under 2 minutes, get a complete itinerary with day-wise plan, hotels, cost breakdown, and festival alerts.', icon: '🤖' },
  { step: '03', title: 'Share or export', desc: 'Share a beautiful link with family. Download a branded PDF. Send via WhatsApp. Your plan, your way.', icon: '📤' },
]

// ── Typewriter prompts — cycles through real examples in all 3 languages ──
const TYPEWRITER_PROMPTS = [
  { text: '5 days Shimla + Manali from Delhi, ₹25,000, couple, May 10', lang: 'English' },
  { text: 'Kolkata se 7 din — Darjeeling 3 din, Gangtok 4 din, October mein, budget 20 hajar', lang: 'Hindi' },
  { text: 'Goa beach trip — 5 din, December 20, couple, ₹30,000, North Goa beaches', lang: 'Mixed' },
  { text: 'Northeast circuit — Shillong 2 days, Cherrapunji 1 day, solo, ₹15,000, March', lang: 'English' },
  { text: 'Rajasthan poora tour — Jaipur 2 din, Jodhpur 2 din, Jaisalmer 3 din, November, budget 40 hajar', lang: 'Hindi' },
]

// ── Sample plans for each language tab in the teaser card ────────────────
const SAMPLE_PLANS = {
  english: {
    destination: 'Darjeeling → Gangtok Circuit',
    days: 5, budget: '₹18,000', from: 'Kolkata',
    days_plan: [
      { day: 1, title: 'Arrival in Darjeeling', plan: 'NJP → taxi to Darjeeling. Mall Road, momos at Glenary\'s. Observatory Hill sunset.' },
      { day: 2, title: 'Tiger Hill & Heritage', plan: '4AM Tiger Hill sunrise, Batasia Loop, HMI Museum, Peace Pagoda, Chowrasta.' },
      { day: 3, title: 'Toy Train + Transfer', plan: 'Morning Toy Train joyride, drive Gangtok via Teesta River Valley, MG Marg.' },
    ],
    totalDays: 5,
    costs: { transport: '₹5,000', hotels: '₹8,000', food: '₹3,000', total: '₹18,000' },
    festival: { name: 'Republic Day', note: 'Falls after your trip — consider extending!', emoji: '🇮🇳' },
  },
  hindi: {
    destination: 'Jaipur → Jodhpur → Jaisalmer',
    days: 7, budget: '₹40,000', from: 'Delhi',
    days_plan: [
      { day: 1, title: 'Jaipur pahunch — Hawa Mahal', plan: 'Delhi se train, Jaipur station. Hawa Mahal, Jantar Mantar. Rajasthani thali dinner.' },
      { day: 2, title: 'Amber Fort aur City Palace', plan: 'Subah Amber Fort elephant ride, City Palace museum, Nahargarh fort sunset.' },
      { day: 3, title: 'Jodhpur — Neeli Nagri', plan: 'Jaipur se Jodhpur drive. Mehrangarh Fort, Jaswant Thada, Clock Tower bazaar.' },
    ],
    totalDays: 7,
    costs: { transport: '₹8,000', hotels: '₹20,000', food: '₹7,000', total: '₹40,000' },
    festival: { name: 'Diwali', note: 'November mein — 3 maheene pehle book karo!', emoji: '🪔' },
  },
  mixed: {
    destination: 'Goa Beach Circuit',
    days: 5, budget: '₹30,000', from: 'Mumbai',
    days_plan: [
      { day: 1, title: 'Arrive — North Goa beaches', plan: 'Mumbai se flight. Calangute, Baga beach evening. Seafood dinner at shacks.' },
      { day: 2, title: 'Old Goa + Anjuna vibes', plan: 'Basilica of Bom Jesus, Anjuna flea market, sunset at Vagator rocks.' },
      { day: 3, title: 'South Goa — ekdum peaceful', plan: 'Palolem beach — quiet aur clean. Kayaking, dolphin spotting, beach yoga.' },
    ],
    totalDays: 5,
    costs: { transport: '₹6,000', hotels: '₹15,000', food: '₹5,000', total: '₹30,000' },
    festival: { name: 'Christmas', note: 'Dec 25 — Goa prices 4x, book 2 months ahead!', emoji: '🎄' },
  },
}

export default function LandingPage() {
  useSEO({
    title: 'Tripzio — AI Travel Planner for India',
    description: 'AI-powered travel planning for India. Get personalized itineraries with real trains, hotels, and budgets in seconds.',
    path: '/',
  })

  const [showDemo, setShowDemo]       = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [isVisible, setIsVisible]     = useState(false)
  const [activeLang, setActiveLang]   = useState('english')
  const [promptIdx, setPromptIdx]     = useState(0)
  const [promptChar, setPromptChar]   = useState(0)
  const [promptPhase, setPromptPhase] = useState('typing')
  const [tripCount, setTripCount]     = useState(null)

  // ── Real trip counter — fail silent ──────────────────────────────────
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'https://tripzio-production.up.railway.app'
    fetch(`${API}/stats/public`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.trip_count > 0) setTripCount(data.trip_count) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setIsVisible(true)
    const photoInterval = setInterval(() => {
      setActivePhoto(p => (p + 1) % DESTINATIONS.length)
    }, 3500)
    return () => clearInterval(photoInterval)
  }, [])

  // Typewriter engine
  useEffect(() => {
    const current = TYPEWRITER_PROMPTS[promptIdx].text
    let timer

    if (promptPhase === 'typing') {
      if (promptChar < current.length) {
        timer = setTimeout(() => setPromptChar(p => p + 1), 38)
      } else {
        timer = setTimeout(() => setPromptPhase('pause'), 1800)
      }
    } else if (promptPhase === 'pause') {
      timer = setTimeout(() => setPromptPhase('erasing'), 400)
    } else if (promptPhase === 'erasing') {
      if (promptChar > 0) {
        timer = setTimeout(() => setPromptChar(p => p - 1), 18)
      } else {
        setPromptIdx(p => (p + 1) % TYPEWRITER_PROMPTS.length)
        setPromptPhase('typing')
      }
    }
    return () => clearTimeout(timer)
  }, [promptChar, promptPhase, promptIdx])

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:0.8} }
        @keyframes slideIn { from{transform:translateX(-20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .hero-btn:hover { transform: translateY(-3px); filter: brightness(1.05); }
        .feature-card:hover { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(15,23,42,0.12) !important; }
        .dest-chip:hover { transform: scale(1.08) translateY(-2px); }
        .step-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(15,23,42,0.1) !important; }
        .day-card-bounce:hover { transform: translateY(-5px); box-shadow: 0 16px 32px rgba(15,23,42,0.1) !important; }
        .polaroid-bounce:hover { transform: scale(1.06) rotate(0deg) !important; z-index: 10; }
        .stat-card-bounce:hover { transform: translateY(-5px); box-shadow: 0 16px 32px rgba(15,23,42,0.1) !important; }
        @media (max-width: 760px) {
          .bento-grid { grid-template-columns: 1fr !important; grid-auto-rows: auto !important; }
          .bento-card { grid-column: span 1 !important; grid-row: span 1 !important; }
        }
      `}</style>

      <Navbar />

      {/* ── DEMO MODAL ─────────────────────────────────────── */}
      {showDemo && (
        <div onClick={() => setShowDemo(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '28px', padding: '32px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", boxShadow: '0 40px 80px rgba(0,0,0,0.3)', animation: 'fadeUp 0.3s ease' }}>
            <button onClick={() => setShowDemo(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', fontWeight: '700', color: '#64748b' }}>✕</button>

            {/* Plan header */}
            <div style={{ background: 'linear-gradient(120deg,#FEF3C7 0%,#E8F7F4 100%)', border: '1px solid #FDE68A', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ background: 'white', border: '1.5px dashed #0D9488', color: '#0D9488', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>🥈 SILVER</span>
                <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>🗺️ Circuit · 2 Cities</span>
                <span style={{ background: 'white', color: '#64748B', border: '1px solid #E7E3D8', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>⚡ AI Generated</span>
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }}>{SAMPLE_PLAN.destination} 🏔️</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
                {[['From', SAMPLE_PLAN.from], ['Duration', `${SAMPLE_PLAN.days} Days`], ['Budget', SAMPLE_PLAN.budget]].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: '10px', color: '#64748B', fontWeight: '600', letterSpacing: '1px', marginBottom: '3px' }}>{l.toUpperCase()}</div><div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>{v}</div></div>
                ))}
              </div>
            </div>

            {/* Festival Alert */}
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{SAMPLE_PLAN.festival.emoji}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>{SAMPLE_PLAN.festival.name} · {SAMPLE_PLAN.festival.date}</div>
                <div style={{ fontSize: '12px', color: '#b91c1c' }}>{SAMPLE_PLAN.festival.note}</div>
              </div>
              <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px' }}>BOOK NOW</span>
            </div>

            {/* Highlights */}
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px', letterSpacing: '0.5px' }}>✨ TRIP HIGHLIGHTS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '6px', marginBottom: '20px' }}>
              {SAMPLE_PLAN.highlights.map(h => (
                <div key={h} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#374151', fontWeight: '500' }}>
                  <span style={{ color: '#0d9488', fontWeight: '800' }}>✓</span>{h}
                </div>
              ))}
            </div>

            {/* Day plan */}
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px', letterSpacing: '0.5px' }}>📅 DAY-WISE PLAN</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {SAMPLE_PLAN.days_plan.map(d => (
                <div key={d.day} style={{ display: 'flex', gap: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#0d9488', color: 'white', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>D{d.day}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>{d.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{d.plan}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hotels */}
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px', letterSpacing: '0.5px' }}>🏨 HOTELS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px', marginBottom: '20px' }}>
              {SAMPLE_PLAN.hotels.map(h => (
                <div key={h.name} style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', color: '#0d9488', fontWeight: '700', marginBottom: '4px' }}>{h.city}</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{h.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '700' }}>⭐ {h.rating}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{h.price}</span>
                  </div>
                  {h.real && <div style={{ marginTop: '6px', fontSize: '10px', color: '#16a34a', fontWeight: '600' }}>✓ Real hotel</div>}
                </div>
              ))}
            </div>

            {/* Cost */}
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E7E3D8', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '14px', letterSpacing: '1px' }}>💰 COST BREAKDOWN</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '14px' }}>
                {[['🚌','Transport',SAMPLE_PLAN.costs.transport],['🏨','Hotels',SAMPLE_PLAN.costs.hotels],['🍽️','Food',SAMPLE_PLAN.costs.food],['🎯','Activities',SAMPLE_PLAN.costs.activities]].map(([e,l,v]) => (
                  <div key={l} style={{ background: 'white', border: '1px solid #E7E3D8', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '4px' }}>{e} {l}</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'white', border: '1px solid #99F6E4', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '14px' }}>Total estimated</span>
                <span style={{ color: '#0D9488', fontSize: '24px', fontWeight: '900' }}>{SAMPLE_PLAN.costs.total}</span>
              </div>
            </div>

            <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#0d9488', margin: 0, lineHeight: 1.6 }}>
                <strong>⚠️ Note:</strong> This is an AI-generated sample plan for demonstration. Hotel suggestions are based on known properties — always verify availability and current prices before booking.
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" onClick={() => setShowDemo(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: 'linear-gradient(135deg,#F97316,#F59E0B)', color: 'white', textDecoration: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}>
                Plan My Trip Free <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', overflow: 'hidden', background: '#FAFAF8', isolation: 'isolate' }}>

        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: '500px', height: '500px', background: 'radial-gradient(circle,rgba(13,148,136,0.12) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '0%', width: '400px', height: '400px', background: 'radial-gradient(circle,rgba(249,115,22,0.10) 0%,transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '26px 24px 64px', position: 'relative', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: '40px', alignItems: 'start' }}>

            {/* Left — Text */}
            <div style={{ animation: isVisible ? 'fadeUp 0.8s ease forwards' : 'none' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '24px', padding: '6px 16px', marginBottom: '10px' }}>
                <Sparkles size={12} color="#B45309" />
                <span style={{ fontSize: '12px', color: '#B45309', fontWeight: '700', letterSpacing: '1px' }}>INDIA'S AI TRAVEL PLANNER</span>
              </div>

              <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(42px,5.5vw,76px)', fontWeight: '700', color: '#0F172A', lineHeight: 1.08, marginBottom: '14px', letterSpacing: '-1px' }}>
                Plan your
                <span style={{ display: 'block', fontStyle: 'italic', background: 'linear-gradient(135deg,#0D9488,#F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  perfect India trip
                </span>
                in under 2 minutes.
              </h1>

              <p style={{ fontSize: '12px', color: ' rgb(249, 115,22)', lineHeight: 1.7, marginBottom: '10px', maxWidth: '520px', fontWeight: '800' }}>
                Just type your full trip in one line — our AI understands everything instantly.
              </p>

              {/* ── No chatbot differentiator ──────────────────────── 
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', maxWidth: '520px', padding: '12px 16px', background: 'rgba(255,255,255,0.75)', border: '1px solid #E7E3D8', borderRadius: '12px', boxShadow: '0 8px 30px rgba(15,23,42,0.06)' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>⚡</span>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>No chatbot. No back-and-forth. </span>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Just type your full trip in one line — our AI understands everything instantly.</span>
                </div>
              </div>*/}

              <div style={{ marginBottom: '36px', maxWidth: '520px' }}>
                {/* Language badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Understands:</span>
                  {['English', 'Hindi', 'Mixed'].map((lang, i) => (
                    <span key={lang} style={{
                      fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px',
                      background: TYPEWRITER_PROMPTS[promptIdx]?.lang === lang ? '#F0FDFA' : '#F8FAFC',
                      color: TYPEWRITER_PROMPTS[promptIdx]?.lang === lang ? '#0D9488' : '#94A3B8',
                      border: `1px solid ${TYPEWRITER_PROMPTS[promptIdx]?.lang === lang ? '#99F6E4' : '#E7E3D8'}`,
                      transition: 'all 0.3s',
                    }}>{lang}</span>
                  ))}
                </div>

                {/* Input box simulation */}
                <div style={{ background: 'white', border: '1.5px solid #E7E3D8', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', boxShadow: '0 8px 30px rgba(15,23,42,0.06)' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>✍️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#0F172A', lineHeight: 1.6, minHeight: '20px', fontFamily: "'Courier New', monospace", letterSpacing: '0.2px' }}>
                      {TYPEWRITER_PROMPTS[promptIdx].text.slice(0, promptChar)}
                      <span style={{ display: 'inline-block', width: '2px', height: '14px', background: '#F97316', marginLeft: '1px', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link to="/guest"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#F0FDFA', border: '1px solid #99F6E4', color: '#0D9488', textDecoration: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>
                    Generate My Plan <ArrowRight size={12} />
                  </Link>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>← Try this prompt after signup</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <Link to="/guest" className="hero-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '13px 22px', background: 'linear-gradient(135deg,#F97316,#F59E0B)', color: 'white', textDecoration: 'none', borderRadius: '12px', fontSize: '14.5px', fontWeight: '700', boxShadow: '0 8px 32px rgba(249,115,22,0.35)', transition: `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease`, whiteSpace: 'nowrap' }}>
                  Start Planning Free <ArrowRight size={16} />
                </Link>
                <button onClick={() => setShowDemo(true)} className="hero-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '13px 18px', background: 'white', color: '#0D9488', border: '1.5px solid #99F6E4', borderRadius: '12px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease`, boxShadow: '0 4px 16px rgba(15,23,42,0.05)', whiteSpace: 'nowrap' }}>
                  👀 See Sample Plan
                </button>
                <Link to="/agent/login" className="hero-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '13px 16px', background: 'white', color: '#64748B', border: '1px solid #E7E3D8', borderRadius: '12px', fontSize: '13px', fontWeight: '600', textDecoration: 'none', transition: `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease`, whiteSpace: 'nowrap' }}>
                  Travel Agent Login <ChevronRight size={15} />
                </Link>
              </div>

              {/* Sign in for existing users */}
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#0D9488', fontWeight: '700', textDecoration: 'none' }}>Sign in →</Link>
              </p>

              <p style={{ fontSize: '12px', color: '#94A3B8' }}>Free to sign up · No credit card required · India destinations only</p>

              {/* ── INLINE SAMPLE PLAN TEASER with language tabs ────── */}
              {(() => {
                const plan = SAMPLE_PLANS[activeLang]
                return (
                  <div style={{ marginTop: '36px', background: 'white', border: '1px solid #E7E3D8', borderRadius: '20px', overflow: 'hidden', maxWidth: '540px', minHeight: '320px', boxShadow: '0 8px 30px rgba(15,23,42,0.06)' }}>

                    {/* Language tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #E7E3D8', background: '#F8FAFC' }}>
                      {[
                        { key: 'english', label: '🇬🇧 English', desc: 'Darjeeling circuit' },
                        { key: 'hindi',   label: '🇮🇳 Hindi',   desc: 'Rajasthan tour' },
                        { key: 'mixed',   label: '🔀 Hinglish', desc: 'Goa trip' },
                      ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveLang(tab.key)}
                          style={{
                            flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', background: 'none', transition: 'all 0.2s',
                            borderBottom: activeLang === tab.key ? '2px solid #0D9488' : '2px solid transparent',
                          }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: activeLang === tab.key ? '#0D9488' : '#64748B' }}>{tab.label}</div>
                          <div style={{ fontSize: '9px', color: activeLang === tab.key ? '#94A3B8' : '#94A3B8', marginTop: '2px' }}>{tab.desc}</div>
                        </button>
                      ))}
                    </div>

                    {/* Card header */}
                    <div style={{ background: 'linear-gradient(120deg,#FEF3C7,#E8F7F4)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E7E3D8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>🗺️</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{plan.destination}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>From {plan.from} · {plan.days} days · {plan.budget}</div>
                        </div>
                      </div>
                      <span style={{ background: 'white', border: '1px solid #99F6E4', color: '#0D9488', fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>⚡ AI GENERATED</span>
                    </div>

                    {/* 3 sample days */}
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {plan.days_plan.map(d => (
                        <div key={d.day} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ background: '#0D9488', color: 'white', borderRadius: '6px', padding: '3px 7px', fontSize: '10px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>D{d.day}</div>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{d.title}</span>
                            <span style={{ fontSize: '11px', color: '#64748B' }}> — {d.plan.slice(0, 55)}…</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ fontSize: '11px', color: '#94A3B8', paddingLeft: '32px' }}>+ {plan.totalDays - 3} more days in the full plan</div>
                    </div>

                    {/* Mini cost bar */}
                    <div style={{ padding: '10px 18px', background: '#F8FAFC', display: 'flex', gap: '6px', alignItems: 'center', borderTop: '1px solid #E7E3D8', borderBottom: '1px solid #E7E3D8' }}>
                      {[
                        { emoji: '🚌', label: 'Transport', val: plan.costs.transport },
                        { emoji: '🏨', label: 'Hotels',    val: plan.costs.hotels },
                        { emoji: '🍽️', label: 'Food',      val: plan.costs.food },
                      ].map(c => (
                        <div key={c.label} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>{c.emoji} {c.label}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{c.val}</div>
                        </div>
                      ))}
                      <div style={{ width: '1px', height: '28px', background: '#E7E3D8', flexShrink: 0 }} />
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>Total</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#0D9488' }}>{plan.costs.total}</div>
                      </div>
                    </div>

                    {/* Festival snippet + CTA */}
                    <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>{plan.festival.emoji}</span>
                        <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {plan.festival.name} · {plan.festival.note}
                        </span>
                      </div>
                      <button onClick={() => setShowDemo(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'linear-gradient(135deg,#F97316,#F59E0B)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        Full Plan <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Right — Polaroid collage + trust card, driven by existing activePhoto/tripCount state */}
            <div>
            <div style={{ position: 'relative', height: '400px', marginTop: '14px' }}>
              {[
                { top: '0', left: '30px', rot: '-7deg', z: 3, w: '195px', h: '230px', offset: 0 },
                { top: '30px', right: '0', rot: '8deg', z: 2, w: '160px', h: '195px', offset: 2, tape: true },
                { bottom: '10px', left: '0', rot: '6deg', z: 1, w: '155px', h: '180px', offset: 4 },
                { bottom: '0', right: '20px', rot: '-5deg', z: 4, w: '170px', h: '128px', offset: 6, tape: true },
              ].map((p, idx) => {
                const dest = DESTINATIONS[(activePhoto + p.offset) % DESTINATIONS.length]
                return (
                  <div key={idx} className="polaroid-bounce" style={{
                    position: 'absolute', top: p.top, left: p.left, right: p.right, bottom: p.bottom,
                    width: p.w, height: p.h, zIndex: p.z, transform: `rotate(${p.rot})`,
                    background: 'white', padding: '8px 8px 28px', borderRadius: '6px',
                    boxShadow: '0 14px 32px rgba(15,23,42,0.16)', transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                  }}>
                    {p.tape && (
                      <div style={{ position: 'absolute', width: '48px', height: '18px', background: 'rgba(245,158,11,0.35)', top: '-9px', left: '50%', transform: 'translateX(-50%) rotate(-3deg)', borderRadius: '2px' }} />
                    )}
                    <img src={dest.photo} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px', transition: 'opacity 0.6s ease' }} />
                    <div style={{ position: 'absolute', bottom: '7px', left: 0, right: 0, textAlign: 'center', fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '12px', color: '#64748B' }}>
                      {dest.name}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Trust card — fills the space below the polaroids, uses existing tripCount state */}
            <div style={{ marginTop: '28px', background: 'white', border: '1px solid #E7E3D8', borderRadius: '18px', padding: '20px 22px', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: '700', fontSize: '26px', color: '#0D9488' }}>
                  {tripCount ? `${tripCount.toLocaleString('en-IN')}+` : '...'}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>trips planned<br />by Indian travellers</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                {DESTINATIONS.slice(0, 5).map(dest => (
                  <span key={dest.name} style={{ fontSize: '10.5px', fontWeight: '600', color: '#0D9488', background: '#F0FDFA', border: '1px solid #99F6E4', padding: '3px 9px', borderRadius: '20px' }}>{dest.name}</span>
                ))}
              </div>
            </div>
            </div>
          </div>

          {/* Bottom — Scrolling destination photos */}
          <div style={{ marginTop: '60px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeIn 1.2s ease forwards' }}>
            {DESTINATIONS.map((dest, i) => (
              <button key={dest.name} onClick={() => setActivePhoto(i)} className="dest-chip"
                style={{
                  position: 'relative', width: '110px', height: '70px', borderRadius: '14px', overflow: 'hidden', border: `2px solid ${activePhoto === i ? '#0D9488' : 'rgba(15,23,42,0.08)'}`, cursor: 'pointer', transition: `transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease, box-shadow 0.3s ease`, background: 'none', padding: 0,
                  boxShadow: activePhoto === i ? '0 0 0 3px rgba(13,148,136,0.25)' : 'none'
                }}>
                <img src={dest.photo} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: activePhoto === i ? 'none' : 'brightness(0.5)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.6),transparent)' }} />
                <div style={{ position: 'absolute', bottom: '5px', left: '7px', right: '4px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'white', lineHeight: 1 }}>{dest.name}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', marginTop: '1px' }}>{dest.tag}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── REAL STATS (honest numbers) ─────────────────────── */}
      <section style={{ background: '#FAFAF8', padding: '56px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '18px' }}>
          {[
            { icon: '✈️', value: tripCount ? `${tripCount.toLocaleString('en-IN')}+` : '...', label: 'Trips Planned', sub: 'By Indian travellers', accent: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
            { icon: '⚡', value: 'Under 2 Min', label: 'Plan Generation', sub: 'Vs 3 hours manually', accent: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
            { icon: '🗺️', value: '36', label: 'States & UTs', sub: 'No destination untouched', accent: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
            { icon: '₹', value: '₹0', label: 'To Start', sub: 'Free forever plan', accent: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          ].map((stat, i) => (
            <div key={i} className="stat-card-bounce" style={{
              animation: `fadeUp ${0.2 + i * 0.1}s ease`,
              background: 'white', border: `1.5px solid ${stat.border}`, borderRadius: '20px',
              padding: '24px 20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
              position: 'relative', overflow: 'hidden', transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stat.accent }} />
              <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: stat.bg, border: `1px solid ${stat.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '22px' }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: '30px', fontWeight: '700', fontFamily: "'Playfair Display', Georgia, serif", color: stat.accent, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0F172A', marginTop: '8px' }}>{stat.label}</div>
              <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '3px' }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DESTINATION SHOWCASE ─────────────────────────────── */}
      <section style={{ padding: '64px 24px', background: '#FAFAF8', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '20px', padding: '5px 14px', marginBottom: '16px' }}>
              <Globe size={12} color="#0D9488" />
              <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: '700', letterSpacing: '1px' }}>EXPLORE INDIA</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
              From Himalayas to backwaters
            </h2>
            <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '480px', margin: '0 auto' }}>
              101+ destinations across every Indian state. Click any destination to plan your trip.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
            {DESTINATIONS.map((dest, i) => (
              // Plain <a>, not React Router <Link> — /xxx-trip-planner is served
              // by a Vercel edge rewrite, not a client-side route, so it needs a
              // real page load rather than SPA navigation (which would 404)
              <a key={dest.name} href={`/${dest.name.toLowerCase()}-trip-planner`}
                style={{ position: 'relative', height: '200px', borderRadius: '20px', overflow: 'hidden', textDecoration: 'none', display: 'block', animation: `fadeUp ${0.1 + i * 0.05}s ease` }}
                onMouseEnter={e => { e.currentTarget.querySelector('img').style.transform = 'scale(1.08)' }}
                onMouseLeave={e => { e.currentTarget.querySelector('img').style.transform = 'scale(1)' }}>
                <img src={dest.photo} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.1) 60%)' }} />
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>
                  {dest.tag}
                </div>
                <div style={{ position: 'absolute', bottom: '14px', left: '14px', right: '14px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', fontFamily: "'Playfair Display', Georgia, serif" }}>{dest.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={10} /> {dest.region} · Tap to plan
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', background: 'white', color: '#0F172A', border: '1px solid #E7E3D8', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              View all 101+ destinations <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '64px 24px', background: '#FAFAF8', scrollMarginTop: '80px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(28px,4vw,44px)', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
              How it works
            </h2>
            <p style={{ fontSize: '16px', color: '#64748B' }}>Three steps to your perfect trip</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="step-card"
                style={{ background: 'white', borderRadius: '20px', padding: '32px', border: '1.5px solid #E7E3D8', boxShadow: '0 2px 16px rgba(15,23,42,0.04)', transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.06, fontWeight: '700', fontFamily: "'Playfair Display', Georgia, serif", color: '#0D9488', lineHeight: 1 }}>{step.step}</div>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>{step.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0D9488', letterSpacing: '1.5px', marginBottom: '8px' }}>STEP {step.step}</div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" style={{ padding: '64px 24px', background: 'white', scrollMarginTop: '80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(28px,4vw,44px)', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
              Everything you need to travel smarter
            </h2>
            <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '480px', margin: '0 auto' }}>
              Built for Indian travelers. Powered by AI that understands India deeply.
            </p>
          </div>

          <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gridAutoRows: '150px', gap: '18px' }}>
            {FEATURES.map((f, i) => {
              const spans = [
                { gridColumn: 'span 3', gridRow: 'span 2' },
                { gridColumn: 'span 3', gridRow: 'span 1' },
                { gridColumn: 'span 3', gridRow: 'span 1' },
                { gridColumn: 'span 2', gridRow: 'span 1' },
                { gridColumn: 'span 2', gridRow: 'span 1' },
                { gridColumn: 'span 2', gridRow: 'span 1' },
                { gridColumn: 'span 3', gridRow: 'span 1' },
                { gridColumn: 'span 3', gridRow: 'span 1' },
              ][i] || { gridColumn: 'span 2', gridRow: 'span 1' }
              const isAccent = i === 5
              return (
                <div key={i} className="feature-card bento-card"
                  style={{
                    ...spans,
                    background: isAccent ? 'linear-gradient(135deg,#F97316,#F59E0B)' : 'white',
                    border: isAccent ? 'none' : '1.5px solid #E7E3D8',
                    borderRadius: '20px', padding: '26px', transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease`,
                    boxShadow: isAccent ? '0 8px 24px rgba(249,115,22,0.28)' : '0 2px 8px rgba(15,23,42,0.04)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  }}>
                  <div style={{ width: '52px', height: '52px', background: isAccent ? 'rgba(255,255,255,0.2)' : f.bg, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', fontSize: '24px' }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: i === 0 ? '19px' : '16px', fontWeight: '800', color: isAccent ? 'white' : '#0F172A', marginBottom: '8px' }}>{f.title}</h3>
                  <p style={{ fontSize: '13.5px', color: isAccent ? 'rgba(255,255,255,0.9)' : '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SAMPLE DAY-BY-DAY PREVIEW ────────────────────────── */}
      <section style={{ padding: '64px 24px', background: '#FAFAF8' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
              A trip that reads like <em style={{ fontStyle: 'italic', color: '#0D9488' }}>this</em>
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B' }}>{SAMPLE_PLAN.destination} — generated from one line, in under 2 minutes</p>
          </div>

          <div style={{ position: 'relative', paddingLeft: '8px' }}>
            <div style={{ position: 'absolute', left: '23px', top: '8px', bottom: '8px', width: '2px', background: '#E7E3D8' }} />
            {SAMPLE_PLAN.days_plan.map(d => (
              <div key={d.day} style={{ position: 'relative', paddingLeft: '56px', marginBottom: '24px' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '2px solid #0D9488', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800', fontSize: '14px', zIndex: 2 }}>
                  {d.day}
                </div>
                <div className="day-card-bounce" style={{ background: 'white', border: '1px solid #E7E3D8', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)', transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#0F172A', marginBottom: '5px' }}>{d.title}</div>
                  <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6 }}>{d.plan}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FESTIVAL FEATURE HIGHLIGHT ───────────────────────── */}
      <section style={{ padding: '64px 24px', background: 'linear-gradient(135deg,#FEF3C7 0%,#E8F7F4 100%)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #FECACA', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px' }}>
              <Calendar size={12} color="#DC2626" />
              <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700', letterSpacing: '1px' }}>UNIQUE FEATURE</span>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: '700', color: '#0F172A', marginBottom: '16px', lineHeight: 1.15 }}>
              India's only travel planner with festival intelligence
            </h2>
            <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, marginBottom: '28px' }}>
              No other travel app warns you that Goa prices spike 4-5x during Christmas, or that Mysore hotels sell out 6 weeks before Dussehra. Tripzio does — automatically.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Automatically detects festival dates from your prompt', 'Shows price surge warnings before you book', 'Suggests extending trip to catch nearby festivals', 'Covers 50+ festivals across all India'].map(point => (
                <div key={point} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                  <span style={{ color: '#0D9488', fontWeight: '800', fontSize: '16px' }}>✓</span>{point}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { emoji: '🪔', name: 'Diwali', date: 'Nov 7', note: 'Prices surge everywhere — book 2 months ahead', badge: 'BOOK NOW', badgeBg: '#EF4444' },
              { emoji: '🎨', name: 'Holi', date: 'Mar 3', note: 'Mathura prices TRIPLE — book 6 weeks ahead', badge: 'BOOK NOW', badgeBg: '#EF4444' },
              { emoji: '🌸', name: 'Onam', date: 'Aug 26', note: 'Kerala houseboats double in price', badge: 'URGENT', badgeBg: '#F59E0B' },
              { emoji: '🇮🇳', name: 'Republic Day', date: 'Jan 26', note: 'Falls after your trip — consider extending!', badge: 'PLAN AHEAD', badgeBg: '#22C55E' },
            ].map(f => (
              <div key={f.name} style={{ background: 'white', border: '1px solid #E7E3D8', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{f.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{f.name} · {f.date}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{f.note}</div>
                </div>
                <span style={{ background: f.badgeBg, color: 'white', fontSize: '9px', fontWeight: '800', padding: '3px 9px', borderRadius: '20px', flexShrink: 0 }}>{f.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────── */}
      <section style={{ padding: '64px 24px', background: 'white' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
              Simple, honest pricing
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B' }}>Start free. Upgrade when you need more.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '20px' }}>
            {[
              { name: 'Free', price: '₹0', per: 'forever', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', features: ['3 plans/month', 'All destinations', 'Share & download', 'Festival alerts'], highlight: false },
              { name: 'User Pro', price: '₹99', per: '/month', color: '#0ea5e9', bg: '#eff6ff', border: '#0ea5e9', features: ['Unlimited plans', 'Priority AI', 'All features', 'Email itinerary'], highlight: false },
              { name: 'Agent Starter', price: '₹499', per: '/month', color: '#8b5cf6', bg: '#f5f3ff', border: '#8b5cf6', features: ['25 clients', 'White-label PDF', 'Client dashboard', 'WhatsApp share'], highlight: true },
              { name: 'Agent Pro', price: '₹999', per: '/month', color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b', features: ['Unlimited clients', 'All Agent features', 'Priority support', 'Custom branding'], highlight: false },
            ].map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'white', border: `2px solid ${plan.highlight ? '#8b5cf6' : plan.border}`, borderRadius: '20px', padding: '28px', position: 'relative', boxShadow: plan.highlight ? '0 12px 32px rgba(139,92,246,0.25)' : 'none' }}>
                {plan.highlight && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: 'white', fontSize: '10px', fontWeight: '800', padding: '4px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
                <div style={{ fontSize: '14px', fontWeight: '700', color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#64748b', marginBottom: '8px' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '700', color: plan.highlight ? 'white' : plan.color, fontFamily: "'Playfair Display', Georgia, serif" }}>{plan.price}</span>
                  <span style={{ fontSize: '13px', color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#94a3b8' }}>{plan.per}</span>
                </div>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: plan.highlight ? 'rgba(255,255,255,0.85)' : '#475569', marginBottom: '8px' }}>
                    <span style={{ color: plan.highlight ? '#a78bfa' : plan.color, fontWeight: '800' }}>✓</span>{f}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(120deg,#0D9488,#0EA5E9 55%,#F97316)', borderRadius: '32px', padding: '64px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'float 3s ease infinite' }}>🗺️</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: '700', color: 'white', marginBottom: '16px' }}>
                Your next India trip starts here
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', marginBottom: '36px', lineHeight: 1.7 }}>
                Free to start. No credit card. Plan your first trip in under 2 minutes.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/guest"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 36px', background: 'white', color: '#0F172A', textDecoration: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                  Start for Free <ArrowRight size={18} />
                </Link>
                <Link to="/explore"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 28px', background: 'rgba(255,255,255,0.12)', color: 'white', textDecoration: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', border: '1.5px solid rgba(255,255,255,0.3)' }}>
                  Browse Destinations <ChevronRight size={16} />
                </Link>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '16px' }}>India destinations only · AI-generated plans · Always verify before booking</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
