import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { API_URL } from '../api'
import FestivalAlert from '../components/FestivalAlert'
import {
  MapPin, Search, Heart, TrendingUp, Clock, Star,
  ArrowRight, Compass, Sun, Mountain, Waves, Calendar,
  ThumbsUp, AlertTriangle, Thermometer, Wind, Umbrella,
  Tag, Train, Plane, Bus, Car, ChevronDown, ChevronUp,
  Zap, Settings2, Sparkles, Send, Globe, Route,
  MessageSquare, Lightbulb, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Destination data ──────────────────────────────────────────────────
const destinations = [
  {
    name: 'Manali', region: 'Himachal Pradesh', type: 'Hill Station',
    duration: '5-7 days', budget: '12,000', rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 40%,#0f3460 100%)',
    photoEmoji: '🏔️', badge: 'Trending', badgeColor: '#f59e0b',
    icon: <Mountain size={18} color="white" />, iconBg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    accent: '#8b5cf6', lightBg: '#f5f3ff', border: '#e9d5ff',
    tags: ['Adventure', 'Snow', 'Trekking'],
  },
  {
    name: 'Goa', region: 'Goa', type: 'Beach Paradise',
    duration: '4-6 days', budget: '15,000', rating: 4.7,
    photo: 'https://images.unsplash.com/photo-1587922546307-776227941871?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#006994 0%,#0099cc 50%,#00bcd4 100%)',
    photoEmoji: '🏖️', badge: 'Most Booked', badgeColor: '#0284c7',
    icon: <Waves size={18} color="white" />, iconBg: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
    accent: '#0ea5e9', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Beach', 'Nightlife', 'Water Sports'],
  },
  {
    name: 'Rajasthan', region: 'Rajasthan', type: 'Heritage & Culture',
    duration: '7-10 days', budget: '18,000', rating: 4.9,
    photo: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#7c2d12 0%,#b45309 50%,#d97706 100%)',
    photoEmoji: '🏯', badge: 'Top Rated', badgeColor: '#d97706',
    icon: <Sun size={18} color="white" />, iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)',
    accent: '#f59e0b', lightBg: '#fffbeb', border: '#fcd34d',
    tags: ['Heritage', 'Forts', 'Desert'],
  },
  {
    name: 'Kerala', region: 'Kerala', type: 'Nature & Wellness',
    duration: '5-7 days', budget: '14,000', rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1609766418204-94aae0ecfdfc?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#14532d 0%,#166534 50%,#16a34a 100%)',
    photoEmoji: '🌴', badge: 'Trending', badgeColor: '#16a34a',
    icon: <Compass size={18} color="white" />, iconBg: 'linear-gradient(135deg,#22c55e,#16a34a)',
    accent: '#22c55e', lightBg: '#f0fdf4', border: '#bbf7d0',
    tags: ['Backwaters', 'Ayurveda', 'Nature'],
  },
  {
    name: 'Leh Ladakh', region: 'J&K / Ladakh', type: 'Adventure & Offbeat',
    duration: '7-10 days', budget: '25,000', rating: 4.9,
    photo: 'https://images.unsplash.com/photo-1571402780805-c88e4cfb2cfe?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#0c1445 0%,#1e3a5f 50%,#2563eb 100%)',
    photoEmoji: '⛰️', badge: 'Must Visit', badgeColor: '#1d4ed8',
    icon: <Mountain size={18} color="white" />, iconBg: 'linear-gradient(135deg,#0ea5e9,#0369a1)',
    accent: '#0369a1', lightBg: '#eff6ff', border: '#bae6fd',
    tags: ['Adventure', 'Mountains', 'Permit'],
  },
  {
    name: 'Andaman', region: 'Andaman & Nicobar', type: 'Island Paradise',
    duration: '5-7 days', budget: '20,000', rating: 4.8,
    photo: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80&auto=format&fit=crop',
    photoBg: 'linear-gradient(160deg,#003049 0%,#0077b6 50%,#00b4d8 100%)',
    photoEmoji: '🏝️', badge: 'Hot Pick', badgeColor: '#0d9488',
    icon: <Waves size={18} color="white" />, iconBg: 'linear-gradient(135deg,#14b8a6,#0d9488)',
    accent: '#14b8a6', lightBg: '#f0fdfa', border: '#99f6e4',
    tags: ['Beach', 'Diving', 'Islands'],
  },
]

const planTiers = [
  { id: 'bronze', label: 'Bronze', emoji: '🥉', tagline: 'Budget Explorer', color: '#92400e', bg: '#fef3c7', border: '#fcd34d', multiplier: 0.6, stay: 'Hostels', transport: 'State bus', food: 'Dhabas' },
  { id: 'silver', label: 'Silver', emoji: '🥈', tagline: 'Smart Traveler', color: '#334155', bg: '#f1f5f9', border: '#cbd5e1', multiplier: 1.0, stay: '2-3 Star', transport: 'AC Train', food: 'Local mix' },
  { id: 'gold', label: 'Gold', emoji: '🥇', tagline: 'Comfort Seeker', color: '#92400e', bg: '#fffbeb', border: '#fcd34d', multiplier: 1.7, stay: '3-4 Star', transport: 'Flight', food: 'Restaurants' },
  { id: 'diamond', label: 'Diamond', emoji: '💎', tagline: 'Premium', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', multiplier: 3.0, stay: '4-5 Star', transport: 'Flight+Cab', food: 'Fine dining', premium: true },
  { id: 'platinum', label: 'Platinum', emoji: '✨', tagline: 'Ultra Luxury', color: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff', multiplier: 5.5, stay: '5-Star', transport: 'Charter', food: 'Chef exp.', premium: true },
]

const transportModes = [
  { id: 'cheapest', label: 'Cheapest', icon: <Bus size={14} />, color: '#16a34a', bg: '#f0fdf4', border: '#86efac', desc: 'Save maximum' },
  { id: 'balanced', label: 'Balanced', icon: <Train size={14} />, color: '#0284c7', bg: '#eff6ff', border: '#7dd3fc', desc: 'Best value' },
  { id: 'fastest', label: 'Fastest', icon: <Plane size={14} />, color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: 'Save time' },
  { id: 'all', label: 'Show All', icon: <Car size={14} />, color: '#b45309', bg: '#fffbeb', border: '#fcd34d', desc: 'Compare all' },
]

// Sample prompts to inspire users
const SAMPLE_PROMPTS = [
  { lang: 'English', text: '5 days Shimla and Manali circuit from Delhi, budget ₹25,000, couple trip, starting May 10' },
  { lang: 'Hindi', text: 'Kolkata se 7 din ka trip — 2 din Darjeeling, 2 din Gangtok, 3 din Leh, budget 35 hajar, adventure trip, October mein' },
  { lang: 'Mixed', text: 'Delhi to Kerala road trip — Ooty 2 days, Munnar 3 days, Alleppey backwaters 2 days, family of 4, gold tier, starting December 22' },
  { lang: 'English', text: 'Northeast circuit — Shillong 2 days, Cherrapunji 1 day, Mawlynnong 1 day from Kolkata, ₹15,000 solo, March' },
  { lang: 'Hindi', text: 'Rajasthan ka poora tour — Jaipur 2 din, Jodhpur 2 din, Jaisalmer 3 din, Udaipur 2 din, Delhi se, budget 40 hajar, November mein' },
]

const getSeasonFromDate = (d) => {
  if (!d) return null
  const m = new Date(d).getMonth() + 1
  if (m >= 3 && m <= 5) return 'summer'
  if (m >= 6 && m <= 9) return 'monsoon'
  return 'winter'
}

// ── SEASON_DATA — India seasonal intelligence ─────────────────────────────
// Structured knowledge (IMD classifications). No AI call needed.
const SEASON_DATA = {
  himalayan: {
    keywords: ['ladakh','leh','spiti','zanskar','nubra','pangong','tso moriri','kargil','srinagar','gulmarg','pahalgam','sonamarg','himachal','uttarakhand','manali','shimla','dharamshala','kasol','kufri'],
    months: {
      1:{rating:'avoid',icon:'❄️',reason:'Frozen, -20°C, most roads closed',upside:'Chadar Trek on frozen Zanskar river'},
      2:{rating:'avoid',icon:'❄️',reason:'Extreme cold, most routes closed',upside:'Chadar Trek season, very few crowds'},
      3:{rating:'okay',icon:'🌨️',reason:'Thawing begins, some roads opening',upside:'Cheaper stays, Holi at lower altitudes'},
      4:{rating:'good',icon:'🌸',reason:'Roads opening, pleasant days',upside:'Apricot blossom in Hundar, less crowded'},
      5:{rating:'excellent',icon:'☀️',reason:'Perfect weather, all passes open',upside:'Best for Khardung La, Chang La, clear skies'},
      6:{rating:'excellent',icon:'☀️',reason:'Peak season, all routes accessible',upside:'Nubra Valley, Pangong fully accessible'},
      7:{rating:'good',icon:'⛅',reason:'Some rain at lower altitudes',upside:'Hemis Festival in July, lush valleys'},
      8:{rating:'good',icon:'⛅',reason:'Occasional rain, roads mostly clear',upside:'Green landscapes, moderate temperatures'},
      9:{rating:'excellent',icon:'☀️',reason:'Crystal skies, best photography',upside:'Post-monsoon clarity, fewer tourists than June'},
      10:{rating:'good',icon:'🍂',reason:'Getting cold, some passes closing',upside:'Golden landscapes, Zanskar still accessible'},
      11:{rating:'avoid',icon:'❄️',reason:'Most passes closing, cold setting in',upside:'Isolated experience for serious adventurers'},
      12:{rating:'avoid',icon:'❄️',reason:'Severe winter, most of Ladakh closed',upside:'Frozen Pangong — very challenging access'},
    }
  },
  southwest_monsoon: {
    keywords: ['goa','mumbai','kerala','kochi','munnar','alleppey','alappuzha','varkala','kovalam','kozhikode','wayanad','coorg','kodagu','mangalore','gokarna','malvan','konkan'],
    months: {
      1:{rating:'excellent',icon:'☀️',reason:'Perfect sunny weather, cool breeze',upside:'Peak season, all beaches open, festivals'},
      2:{rating:'excellent',icon:'☀️',reason:'Best weather of the year',upside:'Carnival in Goa, clear skies, comfortable'},
      3:{rating:'good',icon:'☀️',reason:'Getting warm but still pleasant',upside:'Holi, good before summer rush, fewer crowds'},
      4:{rating:'okay',icon:'🌤️',reason:'Hot and humid, pre-monsoon building',upside:'Cheap stays, fewer tourists, waterfalls starting'},
      5:{rating:'okay',icon:'🌦️',reason:'Pre-monsoon showers beginning',upside:'Lush greenery starting, 30-40% cheaper hotels'},
      6:{rating:'avoid',icon:'🌧️',reason:'Peak monsoon — heavy daily rain, rough seas',upside:'Waterfalls at peak beauty, 40-50% cheaper, green paradise'},
      7:{rating:'avoid',icon:'🌧️',reason:'Peak monsoon — beach shacks closed',upside:'Dudhsagar at peak, Athirapally falls stunning'},
      8:{rating:'avoid',icon:'🌧️',reason:'Monsoon continues, most beaches closed',upside:'Onam preparations in Kerala, cultural richness'},
      9:{rating:'okay',icon:'🌦️',reason:'Monsoon retreating, occasional rain',upside:'Onam festival in Kerala, waterfalls still flowing'},
      10:{rating:'good',icon:'⛅',reason:'Post-monsoon, fresh and lush',upside:'Beaches reopening, great value, green landscapes'},
      11:{rating:'excellent',icon:'☀️',reason:'Ideal weather, season beginning',upside:'Diwali, beaches perfect, comfortable temperature'},
      12:{rating:'excellent',icon:'☀️',reason:'Peak season — Christmas, New Year',upside:'Vibrant Goa nightlife, Christmas on the beach'},
    }
  },
  rajasthan: {
    keywords: ['rajasthan','jaipur','jodhpur','jaisalmer','udaipur','pushkar','ajmer','bikaner','mount abu','chittorgarh','ranthambore','bundi','mandawa'],
    months: {
      1:{rating:'excellent',icon:'☀️',reason:'Cool, clear, perfect sightseeing',upside:'Jaipur Literature Festival, ideal fort exploration'},
      2:{rating:'excellent',icon:'☀️',reason:'Best month — pleasant all day',upside:'Desert Festival in Jaisalmer, clear skies'},
      3:{rating:'good',icon:'☀️',reason:'Warming up, comfortable mornings',upside:'Holi (famous in Rajasthan), good before summer'},
      4:{rating:'okay',icon:'🌤️',reason:'Getting hot 35-40°C, plan early mornings',upside:'Very cheap stays, fewer tourists at forts'},
      5:{rating:'avoid',icon:'🔥',reason:'Extreme heat 42-48°C, harsh conditions',upside:'Empty monuments, ultra-cheap — for heat-lovers only'},
      6:{rating:'avoid',icon:'🔥',reason:'Peak heat + pre-monsoon, oppressive',upside:'Almost empty tourist sites, ultra-cheap'},
      7:{rating:'okay',icon:'🌦️',reason:'Monsoon arrives, cooler but muddy roads',upside:'Green Rajasthan — rare and beautiful, cheaper'},
      8:{rating:'okay',icon:'🌦️',reason:'Monsoon continues, some flooding risk',upside:'Pushkar Lake full, unique photography'},
      9:{rating:'good',icon:'⛅',reason:'Cooling down, rain reducing',upside:'Navratri, post-monsoon green desert'},
      10:{rating:'excellent',icon:'☀️',reason:'Perfect weather returning',upside:'Dussehra, Pushkar Camel Fair, Navratri'},
      11:{rating:'excellent',icon:'☀️',reason:'Peak season, ideal conditions',upside:'Diwali in Jaipur, Pushkar Fair, all forts open'},
      12:{rating:'excellent',icon:'☀️',reason:'Cool evenings, perfect days',upside:'Christmas, New Year, festive atmosphere'},
    }
  },
  north_plains: {
    keywords: ['delhi','agra','varanasi','mathura','vrindavan','lucknow','allahabad','prayagraj','ayodhya','fatehpur sikri','corbett','nainital','mussoorie','dehradun','haridwar','rishikesh','amritsar','chandigarh'],
    months: {
      1:{rating:'good',icon:'🌫️',reason:'Cold 5-15°C, dense fog possible',upside:'Makar Sankranti, Republic Day, fog photography'},
      2:{rating:'good',icon:'🌸',reason:'Pleasant, spring approaching',upside:'Taj Mahal in winter light, comfortable walks'},
      3:{rating:'excellent',icon:'🌸',reason:'Perfect spring weather',upside:'Holi best in Mathura/Vrindavan, pleasant days'},
      4:{rating:'good',icon:'☀️',reason:'Warm but manageable, 28-34°C',upside:'Baisakhi in Amritsar, good before summer rush'},
      5:{rating:'avoid',icon:'🔥',reason:'Very hot 40-45°C, harsh for sightseeing',upside:'Empty monuments, ultra-cheap hotels'},
      6:{rating:'avoid',icon:'🔥',reason:'Peak heat, hot winds (loo), oppressive',upside:'Avoid unless absolutely necessary'},
      7:{rating:'okay',icon:'🌧️',reason:'Monsoon brings relief but humidity',upside:'Green Agra, Taj in mist — beautiful photos'},
      8:{rating:'okay',icon:'🌧️',reason:'Heavy rain, flooding risk in some areas',upside:'Janmashtami in Mathura/Vrindavan'},
      9:{rating:'good',icon:'⛅',reason:'Cooling down, rain reducing',upside:'Navratri, Durga Puja in Varanasi'},
      10:{rating:'excellent',icon:'☀️',reason:'Ideal weather returns',upside:'Dussehra, Diwali, perfect for Taj Mahal visit'},
      11:{rating:'excellent',icon:'☀️',reason:'Best months — cool and clear',upside:'Diwali, Chhath Puja in Varanasi, peak season'},
      12:{rating:'good',icon:'🌫️',reason:'Cold, some fog, festive atmosphere',upside:'Christmas, New Year, winter fairs'},
    }
  },
  northeast: {
    keywords: ['darjeeling','sikkim','gangtok','pelling','lachung','yumthang','shillong','cherrapunji','mawlynnong','kaziranga','tawang','ziro','kohima','northeast','meghalaya','assam','arunachal','manipur','nagaland','mizoram','tripura'],
    months: {
      1:{rating:'good',icon:'❄️',reason:'Cold, clear views of Kanchenjunga',upside:'Snow on hills, tea garden walks, peaceful'},
      2:{rating:'good',icon:'🌸',reason:'Rhododendron blooming begins',upside:'Cherry blossom in Shillong area'},
      3:{rating:'excellent',icon:'🌸',reason:'Rhododendron peak, beautiful weather',upside:'Best for Sikkim, Darjeeling first tea flush'},
      4:{rating:'excellent',icon:'☀️',reason:'Perfect weather, flowers everywhere',upside:'First flush tea, orchids blooming, clear skies'},
      5:{rating:'good',icon:'⛅',reason:'Pre-monsoon, still mostly pleasant',upside:'Good views before monsoon, less crowded'},
      6:{rating:'avoid',icon:'🌧️',reason:'Heavy monsoon — landslides possible',upside:'Cherrapunji waterfalls spectacular'},
      7:{rating:'avoid',icon:'🌧️',reason:'Peak monsoon, road closures common',upside:'Waterfalls at absolute peak, raw nature'},
      8:{rating:'avoid',icon:'🌧️',reason:'Very heavy rain, travel disruptions',upside:'Least crowded, nature at its most dramatic'},
      9:{rating:'okay',icon:'🌦️',reason:'Monsoon reducing, some rain',upside:'Greenest landscapes, Ganesh Chaturthi'},
      10:{rating:'excellent',icon:'☀️',reason:'Crystal clear skies, best views',upside:'Best Kanchenjunga views, Diwali, Durga Puja'},
      11:{rating:'excellent',icon:'☀️',reason:'Ideal weather, clear mountain views',upside:'Orange harvest in Sikkim, peaceful season'},
      12:{rating:'good',icon:'❄️',reason:'Cold but beautiful, snow on higher peaks',upside:'Snow-covered Sandakphu, Christmas in hills'},
    }
  },
  south_plains: {
    keywords: ['karnataka','tamilnadu','tamil nadu','chennai','hyderabad','bengaluru','bangalore','mysuru','mysore','hampi','ooty','kodaikanal','pondicherry','mahabalipuram','madurai','tirupati','rameswaram','kanyakumari'],
    months: {
      1:{rating:'excellent',icon:'☀️',reason:'Cool and dry, ideal conditions',upside:'Pongal festival, best weather for temples'},
      2:{rating:'excellent',icon:'☀️',reason:'Perfect weather continues',upside:'Hampi Utsav, clear days, comfortable evenings'},
      3:{rating:'good',icon:'☀️',reason:'Getting warmer but still manageable',upside:'Holi, Ugadi (Telugu/Kannada New Year)'},
      4:{rating:'okay',icon:'🌤️',reason:'Hot and humid, 35-40°C',upside:'Temple festivals, fewer crowds, cheaper stays'},
      5:{rating:'okay',icon:'🌦️',reason:'Pre-monsoon thunderstorms, muggy',upside:'Waterfalls beginning, nature coming alive'},
      6:{rating:'good',icon:'🌧️',reason:'Southwest monsoon — brief heavy showers',upside:'Green landscapes, cooler than summer'},
      7:{rating:'good',icon:'🌧️',reason:'Moderate rain, not as heavy as west coast',upside:'Lush, cheaper hotels, Bonalu festival Hyderabad'},
      8:{rating:'good',icon:'🌧️',reason:'Intermittent showers, mostly manageable',upside:'Independence Day, green hills'},
      9:{rating:'good',icon:'⛅',reason:'Rain reducing, pleasant temperatures',upside:'Navratri, Mysuru Dasara prep'},
      10:{rating:'excellent',icon:'☀️',reason:'Mysuru Dasara — best festival month',upside:'Mysuru Dasara world-famous, Dussehra everywhere'},
      11:{rating:'okay',icon:'🌧️',reason:'Northeast monsoon — Tamil Nadu/Chennai wet',upside:'Diwali, cooler weather, green after rains'},
      12:{rating:'good',icon:'☀️',reason:'Northeast monsoon ending, pleasant',upside:'Christmas, New Year, comfortable temperatures'},
    }
  },
}

const getZoneForDestination = (destination) => {
  if (!destination) return null
  const d = destination.toLowerCase()
  for (const [zone, zoneData] of Object.entries(SEASON_DATA)) {
    if (zoneData.keywords.some(k => d.includes(k))) return zone
  }
  return null
}

const getSeasonNudge = (destination, dateStr) => {
  if (!destination || !dateStr) return null
  const zone = getZoneForDestination(destination)
  if (!zone) return null
  const month = new Date(dateStr + 'T12:00:00').getMonth() + 1
  if (!month) return null
  const entry = SEASON_DATA[zone].months[month]
  if (!entry) return null
  // Build 2 alternative good/excellent months
  const alternatives = []
  for (let i = 1; i <= 12; i++) {
    if (i === month) continue
    const m = SEASON_DATA[zone].months[i]
    if (m && (m.rating === 'excellent' || m.rating === 'good')) {
      alternatives.push({
        month: i,
        monthName: new Date(2024, i - 1, 1).toLocaleString('en-IN', { month: 'long' }),
        icon: m.icon,
        reason: m.reason,
      })
      if (alternatives.length === 2) break
    }
  }
  return { zone, month, rating: entry.rating, icon: entry.icon, reason: entry.reason, upside: entry.upside, destination, alternatives }
}

const addDays = (dateStr, days) => {
  if (!dateStr || !days) return null
  const d = new Date(dateStr)
  d.setDate(d.getDate() + parseInt(days) - 1)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getSuggestedTier = (budget, days) => {
  if (!budget || !days) return null
  const pd = parseInt(budget) / parseInt(days)
  if (pd < 1500) return 'bronze'
  if (pd < 3000) return 'silver'
  if (pd < 6000) return 'gold'
  if (pd < 12000) return 'diamond'
  return 'platinum'
}

// ── SeasonNudgeCard — inline component, no new file needed ───────────────
function SeasonNudgeCard({ nudge }) {
  if (!nudge) return null
  const STYLES = {
    excellent: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#22c55e', label: '✓ GREAT TIME' },
    good:      { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#22c55e', label: '✓ GOOD TIME' },
    okay:      { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#f59e0b', label: '⚠ HEADS UP' },
    avoid:     { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#ef4444', label: '🌧 CHECK DATES' },
  }
  const s = STYLES[nudge.rating] || STYLES.okay
  // For 'excellent' and 'good' — render a subtle chip only, not a full banner
  if (nudge.rating === 'excellent' || nudge.rating === 'good') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', marginTop: '8px', width: 'fit-content' }}>
        <span style={{ fontSize: '14px' }}>{nudge.icon}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: s.text }}>{nudge.reason}</span>
        <span style={{ background: s.badge, color: 'white', fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.3px' }}>{s.label}</span>
      </div>
    )
  }
  // For 'okay' and 'avoid' — full banner with upside + alternatives
  return (
    <div style={{ marginTop: '8px', padding: '12px 14px', background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>{nudge.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: s.text }}>{nudge.reason}</span>
            <span style={{ background: s.badge, color: 'white', fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>{s.label}</span>
          </div>
          {nudge.upside && (
            <div style={{ fontSize: '11px', color: s.text, opacity: 0.85, marginBottom: '8px', lineHeight: 1.5 }}>
              💡 <strong>Silver lining:</strong> {nudge.upside}
            </div>
          )}
          {nudge.alternatives?.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: s.text, opacity: 0.7, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Better windows:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {nudge.alternatives.map(a => (
                  <div key={a.month} style={{ padding: '4px 12px', background: 'white', border: `1px solid ${s.border}`, borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: s.text }}>
                    {a.icon} {a.monthName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UserDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Plan mode — quick / detailed / custom
  const [planMode, setPlanMode] = useState('quick')
  const [showDetailed, setShowDetailed] = useState(false)

  // Quick + Detailed state
  const [from, setFrom] = useState('')
  const [days, setDays] = useState('')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [tripType, setTripType] = useState('')
  const [destinationMode, setDestinationMode] = useState('suggest')
  const [selectedDestination, setSelectedDestination] = useState('')
  const [intlWarning, setIntlWarning] = useState(false)
  const [promptWarning, setPromptWarning] = useState('')  // invalid source/dest/date warning
  const [cityCheckWarning, setCityCheckWarning] = useState('')  // AI-based city validity (debounced)
  const [cityCheckLoading, setCityCheckLoading] = useState(false)
  const cityCheckTimerRef = useRef(null)
  const cityCheckRequestIdRef = useRef(0)  // guards against stale/out-of-order responses
  const isMountedRef = useRef(true)  // guards against setState after unmount

  // Cleanup on unmount — cancel pending debounce, mark unmounted
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (cityCheckTimerRef.current) clearTimeout(cityCheckTimerRef.current)
    }
  }, [])
  const [isFlexible, setIsFlexible] = useState(false)
  const [transportMode, setTransportMode] = useState('balanced')
  const [selectedTier, setSelectedTier] = useState(null)
  const [showAllDest, setShowAllDest] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  // Custom Plan state
  const [customText, setCustomText] = useState('')
  const [customExtractedDate, setCustomExtractedDate] = useState(null)
  const [customCharCount, setCustomCharCount] = useState(0)
  const [showSamples, setShowSamples] = useState(false)
  const customTextRef = useRef(null)
  const genStepIntervalRef = useRef(null)

  // Shared
  const [generating, setGenerating] = useState(false)
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
  const [selectedDest, setSelectedDest] = useState(null)

  const suggestedTier = getSuggestedTier(budget, days)
  useEffect(() => {
    if (suggestedTier && !selectedTier) setSelectedTier(suggestedTier)
  }, [suggestedTier])

  // ── Live trip stats ──────────────────────────────────────────
  const [tripStats, setTripStats] = useState({
    trips_planned: 0, saved_trips: 0, destinations: 0, days_travelled: 0
  })
  useEffect(() => {
    const token = localStorage.getItem('tripzio_token')
    if (!token) return
    fetch(`${API_URL}/trips/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTripStats(data) })
      .catch(() => {})
  }, [])

  const getTodayString = () => new Date().toISOString().split('T')[0]
  const silverMult = planTiers.find(t => t.id === 'silver').multiplier
  const getTierEstimate = (mult) => {
    if (!budget || !days) return null
    return `₹${(Math.round((parseInt(budget) * mult / silverMult) / 500) * 500).toLocaleString('en-IN')}`
  }

  const season = getSeasonFromDate(startDate)
  const climateDestObj = destinations.find(d =>
    d.name.toLowerCase().includes(selectedDestination.toLowerCase()) ||
    selectedDestination.toLowerCase().includes(d.name.toLowerCase())
  )

  // ── Validation ──────────────────────────────────────────────
  const validateQuick = () => {
    const e = {}
    if (!from.trim()) e.from = 'Enter your city'
    if (!days || days < 1 || days > 30) e.days = 'Enter 1-30 days'
    if (!budget || budget < 1000) e.budget = 'Min ₹1,000'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const validateDetailed = () => {
    const e = {}
    if (!from.trim()) e.from = 'Enter your city'
    if (!days || days < 1 || days > 30) e.days = 'Enter 1-30 days'
    if (!budget || budget < 1000) e.budget = 'Min ₹1,000'
    if (!startDate) e.startDate = 'Select start date'
    if (!selectedTier) e.tier = 'Select a plan tier'
    if (destinationMode === 'specific' && !selectedDestination) e.destination = 'Select destination'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const validateCustom = () => {
    if (!customText.trim() || customText.trim().length < 20) {
      toast.error('Please describe your trip in at least a few words')
      return false
    }
    return true
  }

  // ── Generate handlers ────────────────────────────────────────
  const handleGenerate = async () => {
    const valid = planMode === 'quick' ? validateQuick() :
                  planMode === 'detailed' ? validateDetailed() :
                  validateCustom()
    if (!valid) return
    setGenerating(true)
    setGenStep(0)
    genStepIntervalRef.current = setInterval(() => {
      setGenStep(p => p < 6 ? p + 1 : p)
    }, 4000)

    try {
      const token = localStorage.getItem('tripzio_token')

      if (planMode === 'custom') {
        // Custom plan — send free text to AI
        const response = await fetch(`${API_URL}/itinerary/generate-custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ free_text: customText.trim(), start_date: customExtractedDate || null })
        })
        const customData = await response.json()
        if (!response.ok) {
          if (customData?.detail?.code === 'INTERNATIONAL_DESTINATION') {
            toast.error('Tripzio supports Indian destinations only. International coming soon! 🌍', { duration: 5000 })
            setIntlWarning(true)
            clearInterval(genStepIntervalRef.current)
            setGenerating(false)
            return
          }
          throw new Error(customData?.detail || 'Generation failed')
        }
        toast.success('Your custom itinerary is ready!')
        navigate('/itinerary/result', { state: { itinerary: customData } })
        return
      }

      const tripParams = {
        from_city: from,
        days: parseInt(days),
        budget: parseInt(budget),
        trip_type: tripType || null,
        destination: destinationMode === 'specific' ? selectedDestination : null,
        destination_mode: destinationMode,
        plan_tier: selectedTier || suggestedTier || 'silver',
        transport_mode: transportMode,
        start_date: startDate || null,
        is_flexible: isFlexible,
      }

      if (destinationMode === 'specific' && selectedDestination) {
        const response = await fetch(`${API_URL}/itinerary/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(tripParams)
        })
        const genData = await response.json()
        if (!response.ok) {
          throw new Error(genData?.detail || 'Generation failed')
        }
        navigate('/itinerary/result', { state: { itinerary: genData } })
      } else {
        const response = await fetch(`${API_URL}/itinerary/suggest-destinations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(tripParams)
        })
        const suggestData = await response.json()
        if (!response.ok) {
          throw new Error(suggestData?.detail || 'Suggestion failed')
        }
        navigate('/destinations/suggest', { state: { suggestions: suggestData.suggestions, tripParams } })
      }
    } catch (err) {
      // Handle international destination error from backend
      if (err.message?.includes?.('INTERNATIONAL') || err.code === 'INTERNATIONAL_DESTINATION') {
        toast.error('Tripzio supports Indian destinations only. International coming soon! 🌍', { duration: 5000 })
      } else {
        toast.error(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      clearInterval(genStepIntervalRef.current)
      setGenerating(false)
    }
  }

  const inputBase = (err) => ({
    width: '100%', padding: '11px 14px',
    background: 'white',
    border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius: '10px', color: '#0f172a',
    fontSize: '14px', fontFamily: 'Inter, sans-serif',
    outline: 'none', transition: 'border 0.2s',
  })

  const stepLabel = (color, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: '700', color, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{text}</span>
    </div>
  )

  // ── Real-time prompt validation ─────────────────────────────
  const validatePromptRealTime = (text) => {
    if (!text || text.length < 8) return ''
    const t = text.toLowerCase()

    const VALID_MONTHS = new Set([
      'jan','january','feb','february','mar','march','apr','april',
      'may','jun','june','jul','july','aug','august','sep','september',
      'oct','october','nov','november','dec','december'
    ])

    // City name validity is now checked via AI (checkCityWithAI, debounced)
    // instead of a static 600-city list — see /itinerary/check-city endpoint

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

    // ── 5. Invalid source city ────────────────────────────────
    const fromMatch = t.match(/(?:from|starting from|travelling from)\s+([a-zA-Z]{3,25})(?:\s|,|$|\.)/i)
    const seMatch   = t.match(/([a-zA-Z]{3,25})\s+se\b/i)

    const SKIP_WORDS = new Set([
      'the','and','or','for','with','my','our','a','an','this','that',
      'trip','tour','plan','days','budget','here','there','home','base',
      'solo','couple','family','group','friends','adventure','holiday',
    ])

    const checkSource = (word) => {
      if (!word) return ''
      const clean = word.trim().toLowerCase()
      if (clean.length < 3 || SKIP_WORDS.has(clean)) return ''
      if (/\d/.test(clean)) return `❌ "${word.trim()}" doesn't look like a valid source city.`
      // City spelling validity is now checked via AI (checkCityWithAI,
      // debounced) instead of a static list — see cityCheckWarning state
      return ''
    }

    if (fromMatch) { const w = checkSource(fromMatch[1]); if (w) return w }
    if (seMatch)   { const w = checkSource(seMatch[1]);   if (w) return w }

    // ── 6. Missing departure city entirely ──────────────────────
    // Only warn once the prompt looks otherwise complete (avoids
    // nagging the user while they're still mid-sentence typing)
    const looksComplete = t.length >= 30 && /\d/.test(t)
    if (looksComplete && !fromMatch && !seMatch) {
      return '📍 Please mention your departure city — e.g. "from Kolkata" or "Kolkata se"'
    }

    return ''
  }

  // ── AI-powered city check (debounced, replaces hardcoded list) ──
  // Calls our backend's lightweight Haiku endpoint, but only after
  // the user pauses typing for 1.2s — keeps cost negligible.
  const checkCityWithAI = (cityWord) => {
    if (cityCheckTimerRef.current) clearTimeout(cityCheckTimerRef.current)
    if (!cityWord || cityWord.trim().length < 3) {
      setCityCheckWarning('')
      return
    }
    // Bump request id — any in-flight response from a PREVIOUS call will be
    // ignored when it arrives, preventing stale/out-of-order results
    cityCheckRequestIdRef.current += 1
    const myRequestId = cityCheckRequestIdRef.current

    cityCheckTimerRef.current = setTimeout(async () => {
      try {
        setCityCheckLoading(true)
        const token = localStorage.getItem('tripzio_token')
        const res = await fetch(`${API_URL}/itinerary/check-city`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ city: cityWord.trim() })
        })
        const data = await res.json()
        // Ignore stale responses — only the LATEST request may update state
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
      } catch (e) {
        if (myRequestId === cityCheckRequestIdRef.current && isMountedRef.current) {
          setCityCheckWarning('')  // fail open — never block user on network error
        }
      } finally {
        if (myRequestId === cityCheckRequestIdRef.current && isMountedRef.current) {
          setCityCheckLoading(false)
        }
      }
    }, 1200)
  }

  // ── Validate date is not in past ─────────────────────────────
  const isValidFutureDate = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d >= today
  }

  const quickReady = from && days && budget && !intlWarning
  const detailedReady = from && days && budget && startDate && selectedTier && (destinationMode === 'suggest' || selectedDestination) && !intlWarning && isValidFutureDate(startDate)
  const customReady = customText.trim().length >= 20 && !intlWarning && !promptWarning && !cityCheckWarning &&
    (customExtractedDate ? isValidFutureDate(customExtractedDate) : true)
  const isReady = planMode === 'quick' ? quickReady : planMode === 'detailed' ? detailedReady : customReady

  const modeConfig = {
    quick: { label: '⚡ Quick Plan', desc: '4 inputs · AI picks everything else' },
    detailed: { label: '🎯 Detailed', desc: 'Full control · Dates, tier, destination' },
    custom: { label: '✍️ Custom Plan', desc: 'Any language · Multi-city circuits' },
  }

  // ── Extract date from free text ─────────────────────────────
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



  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#e8f8f5 0%,#f0f9ff 40%,#f8fafc 100%)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder, textarea::placeholder { color: #94a3b8; }
        input:focus, textarea:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1) !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.4; }
        .dest-photo-card { transition: all 0.25s ease; }
        .dest-photo-card:hover { transform: translateY(-5px) !important; box-shadow: 0 16px 40px rgba(0,0,0,0.14) !important; }
        .tier-card { transition: all 0.2s ease; }
        .tier-card:hover { transform: translateY(-2px); }
        .gen-btn { transition: all 0.2s ease; }
        .gen-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(13,148,136,0.45) !important; }
        .mode-btn { transition: all 0.2s ease; }
        .mode-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .sample-chip:hover { border-color: #0d9488 !important; background: #f0fdfa !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
      `}</style>

      <Navbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: '20px', padding: '5px 14px', marginBottom: '14px' }}>
            <div style={{ width: '6px', height: '6px', background: '#0d9488', borderRadius: '50%', animation: 'blink 2s infinite' }} />
            <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase' }}>AI-Powered</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4.5vw,46px)', fontWeight: '900', color: '#0f172a', marginBottom: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-1px', lineHeight: 1.1 }}>
            Where to next, {user?.full_name?.split(' ')[0]}? 🌏
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, maxWidth: '480px' }}>
            Tell us a little — our AI builds your perfect Indian itinerary.
          </p>
        </div>

        {/* Stats — live from /trips/stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px', marginBottom: '32px' }}>
          {[
            {
              label: 'Trips Planned',
              value: tripStats.trips_planned,
              sub: tripStats.trips_planned === 0 ? '✦ Plan your first trip today' : `✦ ${tripStats.trips_planned} itinerar${tripStats.trips_planned === 1 ? 'y' : 'ies'} generated`,
              subColor: '#0284c7',
              action: 'Start planning →',
              iconBg: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
              icon: <Plane size={18} color="white" />,
              onClick: () => window.scrollTo({ top: 400, behavior: 'smooth' }),
              highlight: tripStats.trips_planned > 0,
            },
            {
              label: 'Saved Trips',
              value: tripStats.saved_trips,
              sub: tripStats.saved_trips === 0 ? '✦ Save trips you love' : `✦ Tap to view all saved`,
              subColor: '#e11d48',
              action: 'View My Trips →',
              iconBg: 'linear-gradient(135deg,#f43f5e,#e11d48)',
              icon: <Heart size={18} color="white" />,
              onClick: () => navigate('/my-trips'),
              highlight: tripStats.saved_trips > 0,
            },
            {
              label: 'Destinations',
              value: tripStats.destinations,
              sub: tripStats.destinations === 0 ? '✦ 500+ destinations ready' : `✦ Unique places explored`,
              subColor: '#0f766e',
              action: 'View trending →',
              iconBg: 'linear-gradient(135deg,#0d9488,#0f766e)',
              icon: <MapPin size={18} color="white" />,
              onClick: () => {},
              highlight: tripStats.destinations > 0,
            },
            {
              label: 'Days Travelled',
              value: tripStats.days_travelled,
              sub: tripStats.days_travelled === 0 ? '✦ Life is short, travel more' : `✦ Days of adventure planned`,
              subColor: '#d97706',
              action: 'Get inspired →',
              iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)',
              icon: <Calendar size={18} color="white" />,
              onClick: () => {},
              highlight: tripStats.days_travelled > 0,
            },
          ].map((s, i) => (
            <div key={i}
              onClick={s.onClick}
              style={{
                background: 'white',
                border: s.highlight ? `1.5px solid ${s.subColor}22` : '1px solid rgba(0,0,0,0.06)',
                borderRadius: '20px', padding: '22px',
                boxShadow: s.highlight ? `0 4px 20px ${s.subColor}12` : '0 2px 12px rgba(0,0,0,0.04)',
                animation: `fadeUp ${0.3 + i * 0.08}s ease`,
                cursor: 'pointer', transition: 'all 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${s.subColor}18` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = s.highlight ? `0 4px 20px ${s.subColor}12` : '0 2px 12px rgba(0,0,0,0.04)' }}>

              {/* Subtle accent bar at top when active */}
              {s.highlight && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg,${s.subColor},${s.subColor}88)`, borderRadius: '20px 20px 0 0' }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>{s.icon}</div>
                {s.highlight
                  ? <span style={{ fontSize: '10px', fontWeight: '700', color: s.subColor, background: `${s.subColor}12`, border: `1px solid ${s.subColor}30`, padding: '3px 8px', borderRadius: '10px' }}>Live ✓</span>
                  : <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '10px' }}>M3</span>
                }
              </div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: s.highlight ? s.subColor : '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, transition: 'color 0.3s' }}>{s.value}</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginTop: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '12px', color: s.subColor, marginTop: '4px', fontWeight: '500' }}>{s.sub}</div>
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: s.subColor, fontWeight: '700' }}>{s.action}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN PLANNER ── */}
        <div style={{ background: 'white', borderRadius: '28px', overflow: 'hidden', marginBottom: '52px', boxShadow: '0 4px 32px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)', animation: 'fadeUp 0.5s ease' }}>

          {/* Planner Header */}
          <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#134e4a 100%)', padding: '24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(13,148,136,0.3)', border: '1px solid rgba(13,148,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="#5eead4" />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'white', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Plan your trip
                  </h2>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, marginTop: '2px' }}>
                    {modeConfig[planMode].desc}
                  </p>
                </div>
              </div>

              {/* Mode Toggle — 3 buttons */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '4px', gap: '4px' }}>
                {Object.entries(modeConfig).map(([id, cfg]) => (
                  <button key={id}
                    className="mode-btn"
                    onClick={() => { setPlanMode(id); if (id === 'detailed') setShowDetailed(true) }}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: planMode === id ? 'white' : 'transparent', color: planMode === id ? '#0f172a' : '#94a3b8', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', boxShadow: planMode === id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none', whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '32px' }}>

            {/* ── CUSTOM PLAN TAB ── */}
            {planMode === 'custom' && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>

                {/* Intro banner */}
                <div style={{ background: 'linear-gradient(135deg,#f0fdfa,#eff6ff)', border: '1px solid #99f6e4', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Globe size={20} color="white" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Tell us your dream trip — in any language
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                      Single destination or multi-city circuit — Hindi, English, or mixed. Our AI understands it all and builds your complete plan.
                    </p>
                  </div>
                </div>

                {/* What you can do chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {[
                    { icon: <Route size={12} />, label: 'Multi-city circuits' },
                    { icon: <MessageSquare size={12} />, label: 'Hindi / English / Mixed' },
                    { icon: <Tag size={12} />, label: 'Mention budget & dates' },
                    { icon: <Lightbulb size={12} />, label: 'Any trip type' },
                  ].map((chip, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      <span style={{ color: '#0d9488' }}>{chip.icon}</span>
                      {chip.label}
                    </div>
                  ))}
                </div>

                {/* Main text area */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <textarea
                    ref={customTextRef}
                    value={customText}
                    onChange={e => {
                      const val = e.target.value
                      setCustomText(val)
                      setCustomCharCount(val.length)
                      // Block international destinations
                      const intlWords = ['london','paris','dubai','singapore','usa','america','europe','australia','japan','china','thailand','bali','maldives','tokyo','new york','san francisco','los angeles','canada','italy','spain','germany','france','switzerland','korea','vietnam','indonesia','philippines','malaysia','sri lanka','nepal','bhutan','pakistan','egypt','africa','brazil','mexico','abroad','international','foreign','overseas','outside india','world tour']
                      const shortIntlWords = new Set(['uk','us','eu','rio','iran','oman','uae','cuba','iraq','bali','seoul','rome','milan','vienna','geneva','zurich'])
                      const t_intl = val.toLowerCase()
                      const hasIntl = intlWords.some(w => t_intl.includes(w)) ||
                        [...shortIntlWords].some(w => new RegExp('\\b' + w + '\\b').test(t_intl))
                      setIntlWarning(hasIntl)
                      // Auto-extract date from text
                      setCustomExtractedDate(extractDateFromText(val))
                      // Real-time prompt validation
                      if (!hasIntl) {
                        setPromptWarning(validatePromptRealTime(val))
                      } else {
                        setPromptWarning('')
                      }
                      // Extract departure city word and check it via AI (debounced)
                      const fm = val.match(/(?:from|starting from|travelling from)\s+([a-zA-Z]{3,25})(?:\s|,|$|\.)/i)
                      const sm = val.match(/([a-zA-Z]{3,25})\s+se\b/i)
                      const cityWord = fm?.[1] || sm?.[1] || ''
                      checkCityWithAI(cityWord)
                    }}
                    placeholder={`अपना सपनों का सफर बताइए...\n\nExamples:\n• "5 days Shimla + Manali from Delhi, ₹25,000, couple trip, starting May 10"\n• "Kolkata se 7 din — 2 din Darjeeling, 2 din Gangtok, 3 din Leh, October mein"\n• "Kerala road trip — Munnar 2 days, Alleppey 2 days, Kovalam 2 days, family of 4, ₹40,000, December"`}
                    style={{ width: '100%', minHeight: '180px', padding: '16px', background: '#f8fafc', border: `1.5px solid ${customText.length > 0 ? '#0d9488' : '#e2e8f0'}`, borderRadius: '16px', color: '#0f172a', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', lineHeight: 1.7, transition: 'border 0.2s' }}
                  />
                  <div style={{ position: 'absolute', bottom: '12px', right: '14px', fontSize: '11px', color: customCharCount > 500 ? '#ef4444' : '#94a3b8', fontWeight: '500' }}>
                    {customCharCount}/500
                  {intlWarning && (
                    <div style={{ marginTop: '10px', padding: '12px 14px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>🌍</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>International destination detected</div>
                        <div style={{ fontSize: '12px', color: '#b45309', marginTop: '3px', lineHeight: 1.5 }}>
                          Tripzio specialises in incredible Indian destinations. International travel planning is coming soon!<br/>
                          <strong>Try:</strong> Darjeeling + Gangtok, Goa, Manali, Kerala, Leh-Ladakh, Rajasthan
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>

                {/* Real-time prompt warning — invalid date/source/destination */}
                {promptWarning && !intlWarning && (
                  <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b' }}>{promptWarning}</div>
                      <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '3px', lineHeight: 1.5 }}>
                        Please fix this before generating your trip plan.
                      </div>
                    </div>
                  </div>
                )}

                {/* AI-powered city name check (debounced, replaces hardcoded list) */}
                {cityCheckWarning && !promptWarning && !intlWarning && (
                  <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b' }}>{cityCheckWarning}</div>
                  </div>
                )}

                {/* Smart festival alert — date auto-extracted from text */}
                {customText.length > 10 && !intlWarning && !promptWarning && (
                  <div style={{ marginBottom: '12px' }}>
                    {customExtractedDate && (
                      <div style={{ marginBottom: '6px' }}>
                        {/* Show detected date — always green since makeDate already advances past dates */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', width: 'fit-content' }}>
                          <Calendar size={11} color="#0d9488" />
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488' }}>
                            📅 Date detected: {new Date(customExtractedDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        {/* Warn if original text had a past date — user mentioned e.g. "Jan 2026" but we advanced it */}
                        {(() => {
                          const now = new Date()
                          const typed = customText.match(/20[0-2][0-9]/)
                          const typedYear = typed ? parseInt(typed[0]) : null
                          // Advanced if: typed year is past OR date was bumped to next year
                          const detectedYear = parseInt(customExtractedDate.split('-')[0])
                          const isAdvanced = (typedYear && typedYear < detectedYear) ||
                                             (typedYear && typedYear === now.getFullYear() &&
                                              new Date(typedYear + '-' + customExtractedDate.slice(5) + 'T12:00:00') < now)
                          return isAdvanced ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', padding: '5px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', width: 'fit-content' }}>
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
                      startDate={customExtractedDate || null}
                      days={7}
                      compact={true}
                    />
                    {/* Season Nudge — custom mode: date extracted + destination from full text */}
                    {customExtractedDate && (() => {
                      const nudge = getSeasonNudge(customText.slice(0, 120), customExtractedDate)
                      if (!nudge) return null
                      return <SeasonNudgeCard nudge={nudge} />
                    })()}
                  </div>
                )}

                {/* Soft nudge — shows when no date detected, no intl warning */}
                {customText.length > 20 && !customExtractedDate && !intlWarning && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '10px 14px', marginBottom: '12px',
                    background: '#f0f9ff', border: '1px solid #bae6fd',
                    borderRadius: '10px',
                  }}>
                    <span style={{ fontSize: '15px', flexShrink: 0 }}>💡</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>
                        Add travel dates for festival alerts, season advice & better price planning
                      </div>
                      <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', lineHeight: 1.5 }}>
                        e.g. <strong>"...starting March 3"</strong> or <strong>"...in December"</strong> or <strong>"...during Diwali"</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample prompts */}
                <div style={{ marginBottom: '24px' }}>
                  <button
                    onClick={() => setShowSamples(!showSamples)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#0d9488', fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '0 0 12px', fontFamily: 'Inter, sans-serif' }}>
                    <Lightbulb size={14} />
                    {showSamples ? 'Hide examples' : 'Show example prompts'}
                    {showSamples ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showSamples && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeUp 0.2s ease' }}>
                      {SAMPLE_PROMPTS.map((sample, i) => (
                        <div key={i}
                          className="sample-chip"
                          onClick={() => { setCustomText(sample.text); setCustomCharCount(sample.text.length); customTextRef.current?.focus() }}
                          style={{ padding: '12px 16px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <span style={{ padding: '2px 8px', background: '#f0fdfa', color: '#0d9488', borderRadius: '8px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '1px' }}>{sample.lang}</span>
                          <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{sample.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={12} /> For best results mention
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '6px' }}>
                    {[
                      '📍 Your starting city',
                      '📅 Days per destination',
                      '💰 Total budget (₹)',
                      '👥 Trip type (family/solo/couple)',
                      '🗓 Travel month or dates',
                      '✈️ Preferred transport',
                    ].map((tip, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#92400e', fontWeight: '500' }}>
                        <CheckCircle size={11} color="#d97706" />
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── QUICK / DETAILED TABS ── */}
            {planMode !== 'custom' && (
              <>
                {/* Core 4 inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '18px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '7px' }}>Travelling From</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input type="text" placeholder="Kolkata" value={from}
                        onChange={e => { setFrom(e.target.value); setFormErrors(p => ({ ...p, from: '' })) }}
                        style={{ ...inputBase(formErrors.from), paddingLeft: '34px' }} />
                    </div>
                    {formErrors.from && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>⚠ {formErrors.from}</p>}
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '7px' }}>Number of Days</label>
                    <input type="number" placeholder="5" min="1" max="30" value={days}
                      onChange={e => { setDays(e.target.value); setFormErrors(p => ({ ...p, days: '' })) }}
                      style={inputBase(formErrors.days)} />
                    {formErrors.days
                      ? <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>⚠ {formErrors.days}</p>
                      : startDate && days ? <p style={{ color: '#0d9488', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>↩ Returns {addDays(startDate, days)}</p> : null}
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '7px' }}>Total Budget (₹)</label>
                    <input type="number" placeholder="15000" min="1000" value={budget}
                      onChange={e => { setBudget(e.target.value); setFormErrors(p => ({ ...p, budget: '' })); setSelectedTier(null) }}
                      style={inputBase(formErrors.budget)} />
                    {formErrors.budget
                      ? <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>⚠ {formErrors.budget}</p>
                      : budget && days ? <p style={{ color: '#0ea5e9', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>≈ ₹{Math.round(budget / days).toLocaleString('en-IN')}/day</p> : null}
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '7px' }}>Trip Type</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['Family', 'Solo', 'Couple', 'Friends', 'Adventure'].map(t => (
                        <button key={t} onClick={() => setTripType(tripType === t ? '' : t)}
                          style={{ padding: '6px 13px', borderRadius: '20px', border: `1.5px solid ${tripType === t ? '#0d9488' : '#e2e8f0'}`, background: tripType === t ? '#f0fdfa' : 'white', color: tripType === t ? '#0d9488' : '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick banner */}
                {planMode === 'quick' && (
                  <div style={{ padding: '13px 18px', background: 'linear-gradient(135deg,#f0fdfa,#eff6ff)', border: '1px solid #99f6e4', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#0d9488,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sparkles size={14} color="white" />
                    </div>
                    <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: '500', lineHeight: 1.5 }}>
                      AI picks the <strong>best destination</strong>, <strong>plan tier</strong>, travel dates and transport for your budget and season
                    </span>
                  </div>
                )}

                {/* Expand toggle */}
                {planMode === 'quick' && (
                  <button onClick={() => { setShowDetailed(!showDetailed); if (!showDetailed) setPlanMode('detailed') }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '0', fontFamily: 'Inter, sans-serif', marginBottom: showDetailed ? '24px' : '0' }}>
                    <Settings2 size={14} />
                    {showDetailed ? 'Hide advanced options' : 'Customise — dates, destination, tier & transport'}
                    {showDetailed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}

                {/* Detailed section */}
                {(showDetailed || planMode === 'detailed') && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '30px', marginTop: '24px' }}>

                    {/* STEP 1 — Dates */}
                    <div style={{ marginBottom: '28px' }}>
                      {stepLabel('#0ea5e9', 'Step 1 — Travel Dates')}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(185px,1fr))', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '7px' }}>Start Date</label>
                          <input type="date" min={getTodayString()} value={startDate}
                            onChange={e => { setStartDate(e.target.value); setFormErrors(p => ({ ...p, startDate: '' })) }}
                            style={{ ...inputBase(formErrors.startDate), colorScheme: 'light' }} />
                          {formErrors.startDate && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>⚠ {formErrors.startDate}</p>}
                          {startDate && !isValidFutureDate(startDate) && (
                            <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                              ⚠️ Please select a future date
                            </p>
                          )}
                        </div>
                          {/* Festival Alert — shows when date + destination selected */}
                          {startDate && selectedDestination && (
                            <FestivalAlert
                              destination={selectedDestination}
                              startDate={startDate}
                              days={parseInt(days) || 5}
                              compact={true}
                            />
                          )}
                          {/* Season Nudge — detailed mode: specific destination + date */}
                          {startDate && selectedDestination && isValidFutureDate(startDate) && (() => {
                            const nudge = getSeasonNudge(selectedDestination, startDate)
                            if (!nudge) return null
                            return <SeasonNudgeCard nudge={nudge} />
                          })()}
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '7px' }}>Return Date</label>
                          {startDate && days ? (
                            <div style={{ padding: '11px 14px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Calendar size={14} color="#16a34a" />
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#15803d' }}>{addDays(startDate, days)}</span>
                            </div>
                          ) : (
                            <div style={{ padding: '11px 14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px' }}>
                              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Auto from start date + days</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '7px' }}>Flexibility</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {[{ val: false, label: '📌 Fixed' }, { val: true, label: '🔄 ±3 days' }].map(opt => (
                              <button key={String(opt.val)} onClick={() => setIsFlexible(opt.val)}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${isFlexible === opt.val ? '#0d9488' : '#e2e8f0'}`, background: isFlexible === opt.val ? '#f0fdfa' : 'white', color: isFlexible === opt.val ? '#0d9488' : '#64748b', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* STEP 2 — Tier */}
                    <div style={{ marginBottom: '28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        {stepLabel('#f59e0b', 'Step 2 — Experience Tier')}
                        {suggestedTier && (
                          <span style={{ fontSize: '11px', color: '#16a34a', background: '#dcfce7', border: '1px solid #86efac', padding: '3px 12px', borderRadius: '20px', fontWeight: '700', marginBottom: '16px' }}>
                            ✓ Best match: {planTiers.find(t => t.id === suggestedTier)?.label}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(108px,1fr))', gap: '10px' }}>
                        {planTiers.map(tier => {
                          const isSelected = selectedTier === tier.id
                          const isSugg = suggestedTier === tier.id
                          return (
                            <div key={tier.id} style={{ position: 'relative' }}>
                              {isSugg && !isSelected && (
                                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', fontSize: '8px', fontWeight: '800', padding: '3px 9px', borderRadius: '10px', whiteSpace: 'nowrap', zIndex: 1, boxShadow: '0 2px 6px rgba(22,163,74,0.3)' }}>
                                  BEST MATCH
                                </div>
                              )}
                              <button className="tier-card"
                                onClick={() => { setSelectedTier(tier.id); setFormErrors(p => ({ ...p, tier: '' })) }}
                                style={{ width: '100%', padding: '16px 10px', borderRadius: '16px', border: `2px solid ${isSelected ? tier.color : '#e2e8f0'}`, background: isSelected ? tier.bg : 'white', cursor: 'pointer', textAlign: 'center', fontFamily: 'Inter, sans-serif', boxShadow: isSelected ? `0 4px 16px ${tier.color}25` : '0 1px 4px rgba(0,0,0,0.04)' }}>
                                <div style={{ fontSize: '24px', marginBottom: '7px' }}>{tier.emoji}</div>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: isSelected ? tier.color : '#475569', marginBottom: '2px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tier.label}</div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '7px' }}>{tier.tagline}</div>
                                {budget && days && (
                                  <div style={{ fontSize: '11px', fontWeight: '700', color: isSelected ? tier.color : '#94a3b8', background: isSelected ? `${tier.color}15` : '#f8fafc', padding: '3px 0', borderRadius: '6px' }}>
                                    {getTierEstimate(tier.multiplier)}
                                  </div>
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      {selectedTier && (
                        <div style={{ marginTop: '14px', padding: '12px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                          {[{ e: '🏨', k: 'stay' }, { e: '🚌', k: 'transport' }, { e: '🍽️', k: 'food' }].map(item => (
                            <div key={item.k} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                              <span>{item.e}</span><span>{planTiers.find(t => t.id === selectedTier)?.[item.k]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* STEP 3 — Destination */}
                    <div style={{ marginBottom: '28px' }}>
                      {stepLabel('#8b5cf6', 'Step 3 — Where To?')}
                      {/* Multi-city hint */}
                      <div
                        onClick={() => setPlanMode('custom')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 16px', marginBottom: '16px',
                          background: '#faf5ff', border: '1px dashed #c4b5fd',
                          borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3e8ff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#faf5ff'}>
                        <span style={{ fontSize: '16px' }}>✍️</span>
                        <div>
                          <span style={{ fontSize: '13px', color: '#7c3aed', fontWeight: '600' }}>
                            Planning a multi-city circuit?
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '6px' }}>
                            Switch to Custom Plan — type your entire route in any language
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '700', marginLeft: 'auto' }}>
                          Switch →
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
                        {[
                          { val: 'suggest', label: '✨ Suggest me', sub: 'AI picks best match' },
                          { val: 'specific', label: '📍 I know where', sub: 'I have a destination' }
                        ].map(opt => (
                          <button key={opt.val}
                            onClick={() => { setDestinationMode(opt.val); setSelectedDestination(''); setFormErrors(p => ({ ...p, destination: '' })) }}
                            style={{ flex: 1, padding: '13px 18px', borderRadius: '14px', border: `2px solid ${destinationMode === opt.val ? '#8b5cf6' : '#e2e8f0'}`, background: destinationMode === opt.val ? '#f5f3ff' : 'white', color: destinationMode === opt.val ? '#7c3aed' : '#64748b', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', boxShadow: destinationMode === opt.val ? '0 4px 14px rgba(139,92,246,0.15)' : 'none' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>{opt.label}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{opt.sub}</div>
                          </button>
                        ))}
                      </div>

                      {destinationMode === 'specific' && (
                        <div>
                          <div style={{ position: 'relative', marginBottom: '14px' }}>
                            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <input type="text" placeholder="Type any destination — Coorg, Spiti, Bali..."
                              value={selectedDestination}
                              onChange={e => {
                              const val = e.target.value
                              setSelectedDestination(val)
                              setFormErrors(p => ({ ...p, destination: '' }))
                              // Detect international destinations
                              const intlWords = ['london','paris','dubai','singapore','usa','america','europe','australia','japan','china','thailand','bali','maldives','london','tokyo','york','francisco','angeles','canada','italy','spain','germany','france','switzerland','korea','vietnam','indonesia','philippines','malaysia','sri lanka','nepal','bhutan','pakistan','egypt','africa','brazil','mexico']
                              const isIntl = intlWords.some(w => val.toLowerCase().includes(w))
                              setIntlWarning(isIntl)
                            }}
                              style={{ ...inputBase(false), paddingLeft: '38px', paddingRight: '38px', borderColor: selectedDestination ? '#8b5cf6' : '#e2e8f0' }} />
                            {selectedDestination && (
                              <button onClick={() => { setSelectedDestination(''); setIntlWarning(false) }} style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: 0 }}>x</button>
                            )}
                            {intlWarning && (
                              <div style={{ marginTop: '8px', padding: '10px 14px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontSize: '16px', flexShrink: 0 }}>🌍</span>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>International destination detected</div>
                                  <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', lineHeight: 1.5 }}>
                                    Tripzio specialises in incredible Indian destinations. International travel planning is coming soon!
                                    Try: <strong>Goa, Manali, Kerala, Rajasthan, Darjeeling</strong>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Inline festival alert — shows upcoming festivals for typed destination */}
                            {selectedDestination && !intlWarning && (
                              <FestivalAlert
                                destination={selectedDestination}
                                startDate={startDate || null}
                                days={parseInt(days) || 5}
                                compact={true}
                              />
                            )}
                          </div>
                          <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>— or pick from popular —</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '10px', marginBottom: '12px' }}>
                            {(showAllDest ? destinations : destinations.slice(0, 4)).map(dest => (
                              <button key={dest.name}
                                onClick={() => { setSelectedDestination(dest.name); setFormErrors(p => ({ ...p, destination: '' })) }}
                                style={{ padding: '11px 13px', borderRadius: '12px', border: `1.5px solid ${selectedDestination === dest.name ? dest.accent : '#e2e8f0'}`, background: selectedDestination === dest.name ? dest.lightBg : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: dest.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{dest.icon}</div>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: '700', color: selectedDestination === dest.name ? dest.accent : '#0f172a' }}>{dest.name}</div>
                                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>₹{dest.budget}+</div>
                                </div>
                              </button>
                            ))}
                          </div>
                          <button onClick={() => setShowAllDest(!showAllDest)}
                            style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                            {showAllDest ? <><ChevronUp size={13} />Show less</> : <><ChevronDown size={13} />Show all {destinations.length} destinations</>}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* STEP 4 — Transport */}
                    <div>
                      {stepLabel('#22c55e', 'Step 4 — Transport Preference')}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                        {transportModes.map(mode => (
                          <button key={mode.id} onClick={() => setTransportMode(mode.id)}
                            style={{ padding: '14px 10px', borderRadius: '14px', border: `2px solid ${transportMode === mode.id ? mode.color : '#e2e8f0'}`, background: transportMode === mode.id ? mode.bg : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', boxShadow: transportMode === mode.id ? `0 3px 10px ${mode.color}25` : 'none' }}>
                            <div style={{ color: transportMode === mode.id ? mode.color : '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{mode.icon}</div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: transportMode === mode.id ? mode.color : '#64748b', marginBottom: '2px' }}>{mode.label}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{mode.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── GENERATE BUTTON ── */}
            <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button
                className="gen-btn"
                onClick={handleGenerate}
                disabled={generating || !isReady}
                style={{ padding: '15px 36px', background: generating || !isReady ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: generating || !isReady ? '#94a3b8' : 'white', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: '800', cursor: generating || !isReady ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '9px', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: !generating && isReady ? '0 4px 18px rgba(13,148,136,0.4)' : 'none', letterSpacing: '-0.2px' }}>
                {generating ? (
                  <><div style={{ width: '17px', height: '17px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    {GEN_STEPS[genStep]}</>
                ) : (
                  <>{planMode === 'custom' ? <Send size={17} /> : <Zap size={17} fill="currentColor" />}
                    {planMode === 'custom' ? 'Build My Custom Plan' : `Generate ${planMode === 'quick' ? 'Quick ' : ''}Itinerary`}</>
                )}
              </button>

              {/* Progress steps during generation */}
              {generating && (
                <div style={{ width: '100%', maxWidth: '420px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {GEN_STEPS.map((_, i) => (
                      <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= genStep ? '#0d9488' : '#e2e8f0', transition: 'background 0.4s' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0, textAlign: 'center' }}>
                    Step {genStep + 1} of {GEN_STEPS.length} · This takes 15-30 seconds
                  </p>
                </div>
              )}

              {!isReady && planMode !== 'custom' && (
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  {planMode === 'quick' ? 'Fill city, days and budget to continue' : 'Complete all steps above'}
                </p>
              )}
              {!isReady && planMode === 'custom' && customText.length > 0 && customText.length < 20 && (
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Write a bit more to describe your trip</p>
              )}

              {isReady && planMode !== 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 18px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px' }}>
                  <span style={{ fontSize: '20px' }}>{planTiers.find(t => t.id === (selectedTier || suggestedTier))?.emoji || '✨'}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                      {planTiers.find(t => t.id === (selectedTier || suggestedTier))?.label || 'Auto'} Plan · {days} days
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      {from} → {destinationMode === 'suggest' || !selectedDestination ? 'AI picks destination' : selectedDestination}
                    </div>
                  </div>
                </div>
              )}

              {isReady && planMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#f0fdfa', border: '1.5px solid #99f6e4', borderRadius: '14px' }}>
                  <CheckCircle size={16} color="#0d9488" />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f766e' }}>Ready — AI will parse and plan your trip</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── POPULAR DESTINATIONS ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px' }}>
                Popular Destinations
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Handpicked experiences across India</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#b45309' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'blink 2s infinite' }} />
                    Trending now
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: '#15803d' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    Best for this season
                  </span>
                </div>
              </div>
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px solid #e2e8f0', color: '#0d9488', fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '9px 18px', borderRadius: '12px', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
            {destinations.map((dest, i) => (
              <div key={i}
                className="dest-photo-card"
                onClick={() => {
                  setPlanMode('detailed')
                  setShowDetailed(true)
                  setDestinationMode('specific')
                  setSelectedDestination(dest.name)
                  window.scrollTo({ top: 300, behavior: 'smooth' })
                }}
                style={{ background: 'white', border: `2px solid ${selectedDestination === dest.name && planMode !== 'custom' ? dest.accent : 'transparent'}`, borderRadius: '22px', overflow: 'hidden', cursor: 'pointer', boxShadow: selectedDestination === dest.name && planMode !== 'custom' ? `0 8px 28px ${dest.accent}25` : '0 2px 12px rgba(0,0,0,0.07)', animation: `fadeUp ${0.5 + i * 0.07}s ease`, position: 'relative' }}>

                {/* Photo */}
                <div style={{ position: 'relative', height: '190px', overflow: 'hidden', background: dest.photoBg }}>
                  <div style={{ position: 'absolute', inset: 0, background: dest.photoBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '64px', opacity: 0.25 }}>{dest.photoEmoji}</span>
                  </div>
                  <img src={dest.photo} alt={dest.name}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    onError={e => e.currentTarget.style.opacity = '0'} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top,rgba(0,0,0,0.6),transparent)', zIndex: 2 }} />
                  {/* Trending badge */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: 'white', fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dest.badgeColor, display: 'inline-block' }} />
                      {dest.badge}
                    </span>
                  </div>
                  {/* Rating */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.95)', padding: '5px 10px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 3 }}>
                    <Star size={11} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#92400e' }}>{dest.rating}</span>
                  </div>
                  {/* Icon */}
                  <div style={{ position: 'absolute', bottom: '12px', left: '14px', width: '36px', height: '36px', borderRadius: '10px', background: dest.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(0,0,0,0.3)', zIndex: 3 }}>
                    {dest.icon}
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '18px 20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 3px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{dest.name}</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px', fontWeight: '500' }}>{dest.type}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {dest.tags.map(tag => (
                      <span key={tag} style={{ padding: '3px 10px', background: dest.lightBg, border: `1px solid ${dest.border}`, borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: dest.accent }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} color="#94a3b8" />
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{dest.duration}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>from</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: dest.accent, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>₹{dest.budget}</span>
                    </div>
                  </div>
                  {selectedDestination === dest.name && planMode !== 'custom' && (
                    <div style={{ marginTop: '12px', padding: '8px 14px', background: dest.lightBg, border: `1px solid ${dest.border}`, borderRadius: '10px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <CheckCircle size={14} color={dest.accent} />
                      <span style={{ fontSize: '12px', color: dest.accent, fontWeight: '700' }}>Selected for your trip</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
