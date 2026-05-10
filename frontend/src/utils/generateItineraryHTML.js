/**
 * frontend/src/utils/generateItineraryHTML.js
 * Tripzio — Premium Itinerary Generator
 * Generates the exact template HTML with real data, opens in new tab → user prints as PDF
 * Uses Unsplash for destination photos (no API key needed)
 */

// ── Sanitize for HTML ──────────────────────────────────────────
function h(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Day gradient colors (cycles through days) ──────────────────
const DAY_GRADIENTS = [
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-orange-500 to-red-600',
  'from-teal-500 to-green-600',
  'from-pink-500 to-rose-600',
]

const DAY_TEXT_COLORS = [
  'text-amber-100', 'text-rose-100', 'text-emerald-100',
  'text-violet-100', 'text-blue-100', 'text-orange-100',
  'text-teal-100', 'text-pink-100',
]

// ── Highlight card configs ──────────────────────────────────────
const HIGHLIGHT_STYLES = [
  { bg: 'from-amber-50 to-orange-50', border: 'border-amber-100', icon_bg: 'bg-amber-100', icon_color: 'text-amber-600', icon: 'sunrise' },
  { bg: 'from-emerald-50 to-green-50', border: 'border-emerald-100', icon_bg: 'bg-emerald-100', icon_color: 'text-emerald-600', icon: 'map-pin' },
  { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-100', icon_bg: 'bg-blue-100', icon_color: 'text-blue-600', icon: 'waves' },
  { bg: 'from-violet-50 to-purple-50', border: 'border-violet-100', icon_bg: 'bg-violet-100', icon_color: 'text-violet-600', icon: 'sparkles' },
  { bg: 'from-rose-50 to-pink-50', border: 'border-rose-100', icon_bg: 'bg-rose-100', icon_color: 'text-rose-600', icon: 'camera' },
  { bg: 'from-lime-50 to-green-50', border: 'border-lime-100', icon_bg: 'bg-lime-100', icon_color: 'text-lime-600', icon: 'leaf' },
]

// ── Cost item configs ───────────────────────────────────────────
const COST_STYLES = [
  { bg: 'bg-blue-50',    icon_color: 'text-blue-600',    bar: 'from-blue-400 to-blue-600',    icon: 'car' },
  { bg: 'bg-purple-50',  icon_color: 'text-purple-600',  bar: 'from-purple-400 to-purple-600',  icon: 'bed-double' },
  { bg: 'bg-amber-50',   icon_color: 'text-amber-600',   bar: 'from-amber-400 to-amber-600',   icon: 'utensils' },
  { bg: 'bg-emerald-50', icon_color: 'text-emerald-600', bar: 'from-emerald-400 to-emerald-600', icon: 'ticket' },
  { bg: 'bg-slate-50',   icon_color: 'text-slate-600',   bar: 'from-slate-400 to-slate-600',   icon: 'package' },
]

// ── Tier config ─────────────────────────────────────────────────
const TIER_LABELS = {
  bronze: 'Bronze Plan', silver: 'Silver Plan', gold: 'Gold Plan',
  diamond: 'Diamond Plan', platinum: 'Platinum Plan',
}

// ── Generate photo URL from destination ────────────────────────
// Picsum photos — reliable, no CORS, works in print
// Seed based on destination name so same destination always gets same photo
function photoUrl(destination) {
  const seed = (destination || 'travel')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()
    .slice(0, 20)
  return `https://picsum.photos/seed/${seed}/1920/1080`
}

function hotelPhotoUrl(area, i) {
  const seeds = ['hotel1', 'resort2', 'luxury3', 'boutique4', 'lodge5', 'inn6']
  const seed = area
    ? area.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 10) + i
    : seeds[i % seeds.length]
  return `https://picsum.photos/seed/${seed}/800/400`
}

// ── Calculate cost percentage ───────────────────────────────────
function costPct(val, total) {
  const v = parseFloat(String(val || '0').replace(/[^0-9.]/g, ''))
  const t = parseFloat(String(total || '1').replace(/[^0-9.]/g, ''))
  return t > 0 ? Math.round((v / t) * 100) : 0
}

// ── Build day cards HTML ────────────────────────────────────────
function buildDayCards(dayPlans) {
  return (dayPlans || []).map((day, i) => {
    const grad = DAY_GRADIENTS[i % DAY_GRADIENTS.length]
    const tc = DAY_TEXT_COLORS[i % DAY_TEXT_COLORS.length]
    const loc = h(day.location || day.title?.split(' ')[0] || '')
    const subtitle = h(day.title || '')

    return `
    <div class="day-card bg-white border border-slate-200 rounded-2xl overflow-hidden" data-day="${i + 1}">
      <div class="grid lg:grid-cols-4">
        <div class="lg:col-span-1 bg-gradient-to-br ${grad} p-6 lg:p-8 text-white flex flex-col justify-between">
          <div>
            <div class="${tc} text-xs font-semibold uppercase tracking-widest mb-2">Day ${day.day || i + 1}</div>
            <h3 class="font-serif text-2xl font-bold mb-1">${loc}</h3>
            <p class="text-white/80 text-sm">${subtitle}</p>
          </div>
          <div class="mt-6">
            ${day.estimated_cost ? `
            <div class="flex items-center gap-2 text-white/70 text-sm">
              <i data-lucide="indian-rupee" class="w-4 h-4"></i>
              <span>${h(day.estimated_cost)}</span>
            </div>` : ''}
          </div>
        </div>
        <div class="lg:col-span-3 p-6 lg:p-8">
          <div class="grid md:grid-cols-3 gap-6">
            ${day.morning ? `
            <div class="flex gap-3">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <i data-lucide="sun" class="w-5 h-5 text-amber-500"></i>
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Morning</div>
                <p class="text-sm text-slate-600 leading-relaxed">${h(day.morning)}</p>
              </div>
            </div>` : ''}
            ${day.afternoon ? `
            <div class="flex gap-3">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <i data-lucide="cloud-sun" class="w-5 h-5 text-orange-500"></i>
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Afternoon</div>
                <p class="text-sm text-slate-600 leading-relaxed">${h(day.afternoon)}</p>
              </div>
            </div>` : ''}
            ${day.evening ? `
            <div class="flex gap-3">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <i data-lucide="moon" class="w-5 h-5 text-indigo-500"></i>
                </div>
              </div>
              <div>
                <div class="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Evening</div>
                <p class="text-sm text-slate-600 leading-relaxed">${h(day.evening)}</p>
              </div>
            </div>` : ''}
          </div>
          ${(day.meals || day.stay) ? `
          <div class="border-t border-slate-100 mt-6 pt-5 flex flex-wrap gap-6">
            ${day.meals ? `
            <div class="flex items-center gap-2">
              <i data-lucide="utensils" class="w-4 h-4 text-slate-400"></i>
              <span class="text-sm text-slate-500"><span class="font-medium text-slate-700">Meals:</span> ${h(day.meals)}</span>
            </div>` : ''}
            ${day.stay ? `
            <div class="flex items-center gap-2">
              <i data-lucide="bed-double" class="w-4 h-4 text-slate-400"></i>
              <span class="text-sm text-slate-500"><span class="font-medium text-slate-700">Stay:</span> ${h(day.stay)}</span>
            </div>` : ''}
          </div>` : ''}
        </div>
      </div>
    </div>`
  }).join('')
}

// ── Build hotel cards HTML ──────────────────────────────────────
function buildHotels(accommodation) {
  return (accommodation || []).slice(0, 4).map((hotel, i) => `
    <div class="hotel-card bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div class="relative h-48 bg-slate-200">
        <img src="${hotelPhotoUrl(hotel.area, i)}"
          alt="${h(hotel.name)}"
          class="w-full h-full object-cover"
          onerror="this.style.display='none'">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div class="absolute top-3 left-3">
          <span class="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
            ${h(hotel.area || '')}
          </span>
        </div>
      </div>
      <div class="p-5">
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-serif text-lg font-bold">${h(hotel.name || '')}</h3>
          <div class="flex text-amber-400 text-sm ml-2 flex-shrink-0">
            ${'★'.repeat(Math.min(Math.round(parseFloat(hotel.rating) || 4), 5))}
          </div>
        </div>
        <p class="text-slate-500 text-sm mb-4 leading-relaxed">${h(hotel.why || '')}</p>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-900">${h(hotel.price_range || '')} <span class="text-slate-400 text-xs font-normal">/night</span></span>
          <span class="inline-flex items-center gap-1 text-forest-600 text-xs font-semibold bg-forest-50 border border-forest-200 px-3 py-1 rounded-full">
            <i data-lucide="check-circle" class="w-3 h-3"></i>
            Recommended
          </span>
        </div>
      </div>
    </div>
  `).join('')
}

// ── Build tips HTML ─────────────────────────────────────────────
function buildTips(tips) {
  return (tips || []).slice(0, 6).map((tip, i) => {
    // Split tip into title + description if contains delimiter
    const parts = String(tip).split(/\s*[:\-–]\s(.+)/)
    const title = parts.length > 1 ? parts[0] : `Tip ${i + 1}`
    const desc = parts.length > 1 ? parts[1] : tip

    return `
    <div class="tip-card bg-white border border-gold-200 rounded-2xl p-6">
      <div class="text-3xl font-bold text-gold-500 mb-3">${String(i + 1).padStart(2, '0')}</div>
      <h3 class="font-semibold text-base mb-2">${h(title)}</h3>
      <p class="text-slate-500 text-sm leading-relaxed">${h(desc)}</p>
    </div>`
  }).join('')
}

// ── Build transport HTML ────────────────────────────────────────
function buildTransport(options) {
  return (options || []).slice(0, 3).map((opt, i) => `
    <div class="bg-white border border-slate-200 rounded-2xl p-6">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <i data-lucide="${i === 0 ? 'navigation' : 'route'}" class="w-5 h-5 text-brand-600"></i>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-semibold">${h(opt.mode || `Option ${i + 1}`)}</h3>
            ${i === 0 ? '<span class="bg-forest-100 text-forest-700 text-xs font-semibold px-2 py-0.5 rounded-full">Recommended</span>' : '<span class="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">Alternative</span>'}
          </div>
          <p class="text-slate-500 text-sm">${h(opt.recommendation || opt.duration || '')}</p>
          ${opt.cost ? `<p class="text-brand-600 font-medium text-sm mt-1">${h(opt.cost)}</p>` : ''}
        </div>
      </div>
    </div>
  `).join('')
}

// ── Build cost rows HTML ────────────────────────────────────────
function buildCostRows(cb) {
  if (!cb) return ''
  const total = cb.total || ''
  const rows = [
    ['Transport', cb.transport, COST_STYLES[0]],
    ['Accommodation', cb.accommodation, COST_STYLES[1]],
    ['Food', cb.food, COST_STYLES[2]],
    ['Activities', cb.activities, COST_STYLES[3]],
    ['Miscellaneous', cb.miscellaneous, COST_STYLES[4]],
  ].filter(r => r[1])

  return rows.map(([label, val, style]) => {
    const pct = costPct(val, total)
    return `
    <div class="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-md transition-shadow">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center">
            <i data-lucide="${style.icon}" class="w-5 h-5 ${style.icon_color}"></i>
          </div>
          <span class="font-medium text-sm">${label}</span>
        </div>
        <span class="font-semibold text-lg">${h(val)}</span>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-2">
        <div class="cost-bar bg-gradient-to-r ${style.bar} h-2 rounded-full" style="width: 0%" data-width="${pct}%"></div>
      </div>
    </div>`
  }).join('')
}

// ── MAIN EXPORT ─────────────────────────────────────────────────
// Convert image URL to base64 to avoid CORS in new tab context
async function toBase64(url) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateTripPDF({ data, user, isAgent = false, clientName = null, agentProfile = null }) {
  const dest      = data.destination || 'Your Trip'
  const tier      = data.plan_tier || 'silver'
  const tierLabel = TIER_LABELS[tier] || 'Silver Plan'
  const agentName = agentProfile?.business_name || user?.business_name || user?.full_name || 'Tripzio'
  const forName   = isAgent ? (clientName || 'Client') : (user?.full_name || 'Traveler')
  const initials  = forName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const today     = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const phone     = agentProfile?.contact_phone || agentProfile?.whatsapp_number || ''
  const rawLogoUrl = agentProfile?.logo_url || ''
  // Convert logo to base64 so it works in new tab without CORS issues
  const logoUrl = rawLogoUrl ? (await toBase64(rawLogoUrl) || rawLogoUrl) : ''
  const brand     = agentProfile?.brand_color || '#2563eb'

  const cb        = data.cost_breakdown || {}
  const totalCost = cb.total || ''
  const budget    = data.budget ? `₹${Number(data.budget).toLocaleString('en-IN')}` : ''
  const totalNum  = parseFloat(String(totalCost).replace(/[^0-9.]/g, '')) || 0
  const budgetNum = parseFloat(String(data.budget || 0)) || 0
  const savings   = budgetNum > totalNum ? `₹${(budgetNum - totalNum).toLocaleString('en-IN')}` : null
  const perDay    = data.days && totalNum ? `₹${Math.round(totalNum / data.days).toLocaleString('en-IN')}` : null
  const savingsPct = budgetNum > 0 && savings ? ((budgetNum - totalNum) / budgetNum * 100).toFixed(1) : 0

  // Day tabs
  const dayTabs = (data.day_plans || []).map((_, i) =>
    `<button onclick="showDay(${i + 1})" class="day-tab px-5 py-2.5 rounded-full text-sm font-medium transition-all" data-day="${i + 1}">Day ${i + 1}</button>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tripzio — ${h(dest)} Itinerary</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
          serif: ['Playfair Display', 'serif'],
        },
        colors: {
          brand: { 50:'#eff6ff', 100:'#dbeafe', 400:'#60a5fa', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8', 900:'#1e3a8a' },
          gold:  { 50:'#fffbeb', 100:'#fef3c7', 200:'#fde68a', 300:'#fcd34d', 400:'#fbbf24', 500:'#f59e0b', 600:'#d97706', 700:'#b45309' },
          forest:{ 50:'#f0fdf4', 100:'#dcfce7', 200:'#bbf7d0', 300:'#86efac', 400:'#4ade80', 500:'#22c55e', 600:'#16a34a', 700:'#15803d' },
        }
      }
    }
  }
</script>
<style>
  * { -webkit-font-smoothing: antialiased; }
  .hero-bg { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 30%, #1e3a8a 60%, #0f172a 100%); }
  .hero-overlay { background: linear-gradient(to bottom, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.1) 40%, rgba(15,23,42,0.7) 80%, rgba(15,23,42,0.95) 100%); }
  .nav-glass { background: rgba(15,23,42,0.85); backdrop-filter: blur(16px); }
  .gold-shimmer { background: linear-gradient(90deg,#d97706,#fbbf24,#f59e0b,#fbbf24,#d97706); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s linear infinite; }
  @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  .day-tab { background: #f1f5f9; color: #64748b; }
  .day-tab:hover { background: #e2e8f0; color: #334155; }
  .day-tab.active-tab { background: ${brand}; color: white; }
  .cost-bar { transition: width 1.5s cubic-bezier(0.4,0,0.2,1); }
  .day-card { transition: all 0.4s cubic-bezier(0.4,0,0.2,1); }
  .day-card:hover { transform: translateY(-4px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); }
  .hotel-card { transition: all 0.4s ease; }
  .hotel-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15); }
  .tip-card { transition: all 0.3s ease; }
  .tip-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
  @media print {
    .no-print { display: none !important; }
    .day-card:hover, .hotel-card:hover, .tip-card:hover { transform: none !important; box-shadow: none !important; }
    body { font-size: 11px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    @page { margin: 0; size: A4; }
    .day-card { break-inside: avoid; page-break-inside: avoid; }

    /* Force dark backgrounds to print */
    .hero-bg, section[style*="background"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Slate dark sections */
    .bg-gradient-to-br.from-slate-900,
    .bg-gradient-to-br.from-slate-800,
    [class*="from-slate-9"],
    [class*="from-slate-8"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: #0f172a !important;
      color: white !important;
    }
    /* Day card gradients */
    [class*="bg-gradient-to-br"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
</head>
<body class="font-sans text-slate-900 bg-white">

<!-- Nav -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-glass border-b border-white/10 no-print">
  <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:${brand}">
        <i data-lucide="compass" class="w-5 h-5 text-white"></i>
      </div>
      <span class="text-white font-semibold text-lg tracking-tight">Tripzio</span>
      <span class="text-gold-400 text-xs font-semibold uppercase tracking-widest ml-2 bg-gold-400/10 px-2 py-0.5 rounded-full">${h(tierLabel)}</span>
    </div>
    <div class="flex items-center gap-3">
      ${logoUrl ? `<img src="${h(logoUrl)}" 
        class="h-8 rounded-lg border border-white/20" 
        alt="${h(agentName)}"
        crossorigin="anonymous"
        onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div style="display:none;width:32px;height:32px;border-radius:8px;background:${brand};align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;flex-shrink:0;">
          ${h(agentName.charAt(0).toUpperCase())}
        </div>` : ''}
      <span class="text-white/70 text-sm">${h(agentName)}</span>
      <button onclick="window.print()" class="flex items-center gap-2 text-white/70 hover:text-white text-sm px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-all">
        <i data-lucide="printer" class="w-4 h-4"></i>
        <span>Save as PDF</span>
      </button>
    </div>
  </div>
</nav>

<!-- Hero -->
<section class="relative hero-bg min-h-[700px] h-screen max-h-[900px] flex items-center overflow-hidden" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;">
  <img src="${photoUrl(dest)}" alt="${h(dest)}"
    class="absolute inset-0 w-full h-full object-cover opacity-50"
    style="-webkit-print-color-adjust:exact;print-color-adjust:exact;"
    onerror="this.style.display='none'">
  <div class="hero-overlay absolute inset-0"></div>
  <div class="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
    <div class="max-w-3xl">
      <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
        <span class="w-2 h-2 bg-gold-400 rounded-full"></span>
        <span class="text-gold-300 text-xs font-semibold uppercase tracking-widest">${h(tierLabel)} Itinerary</span>
      </div>
      <h1 class="font-serif text-5xl md:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
        ${h(dest).replace(' & ', '<br><span class="text-white/60">&amp;</span> ').replace(' and ', '<br><span class="text-white/60">&</span> ')}
      </h1>
      <p class="text-lg md:text-xl text-white/70 leading-relaxed mb-10 max-w-xl">
        ${h(data.summary || '')}
      </p>
      <div class="flex flex-wrap gap-4 mb-12">
        ${data.days ? `
        <div class="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3">
          <i data-lucide="calendar-days" class="w-5 h-5 text-gold-400"></i>
          <div>
            <div class="text-white font-semibold text-sm">${data.days} Days</div>
            <div class="text-white/50 text-xs">Duration</div>
          </div>
        </div>` : ''}
        ${data.from_city ? `
        <div class="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3">
          <i data-lucide="map-pin" class="w-5 h-5 text-blue-400"></i>
          <div>
            <div class="text-white font-semibold text-sm">From ${h(data.from_city)}</div>
            <div class="text-white/50 text-xs">Starting Point</div>
          </div>
        </div>` : ''}
        ${budget ? `
        <div class="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3">
          <i data-lucide="indian-rupee" class="w-5 h-5 text-green-400"></i>
          <div>
            <div class="text-white font-semibold text-sm">${h(budget)}</div>
            <div class="text-white/50 text-xs">Budget</div>
          </div>
        </div>` : ''}
      </div>
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style="background:${brand}">${h(initials)}</div>
        <div>
          <div class="text-white font-medium text-sm">Prepared for ${h(forName)}</div>
          <div class="text-white/50 text-xs">${isAgent ? `By ${h(agentName)} &bull; ` : ''}${h(today)}</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Highlights -->
${data.highlights?.length ? `
<section class="py-20 bg-white relative overflow-hidden">
  <div class="absolute top-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
  <div class="max-w-7xl mx-auto px-6 relative">
    <div class="text-center mb-16">
      <span style="color:${brand}" class="text-xs font-semibold uppercase tracking-widest">Why You'll Love This</span>
      <h2 class="font-serif text-3xl md:text-4xl font-bold mt-3 tracking-tight">Trip Highlights</h2>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-${Math.min(data.highlights.length, 4)} gap-6">
      ${data.highlights.slice(0, 6).map((hl, i) => {
        const st = HIGHLIGHT_STYLES[i % HIGHLIGHT_STYLES.length]
        const parts = String(hl).split(/\s*[:\-–]\s(.+)/)
        const title = parts.length > 1 ? parts[0] : hl
        const desc = parts.length > 1 ? parts[1] : ''
        return `
        <div class="group bg-gradient-to-br ${st.bg} border ${st.border} rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 cursor-default">
          <div class="w-14 h-14 ${st.icon_bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <i data-lucide="${st.icon}" class="w-7 h-7 ${st.icon_color}"></i>
          </div>
          <h3 class="font-semibold text-base mb-2">${h(title)}</h3>
          ${desc ? `<p class="text-slate-500 text-sm leading-relaxed">${h(desc)}</p>` : ''}
        </div>`
      }).join('')}
    </div>
  </div>
</section>` : ''}

<!-- Cost Breakdown -->
${Object.keys(cb).length ? `
<section class="py-20 bg-slate-50">
  <div class="max-w-7xl mx-auto px-6">
    <div class="grid lg:grid-cols-5 gap-12 items-start">
      <div class="lg:col-span-3">
        <span style="color:${brand}" class="text-xs font-semibold uppercase tracking-widest">Budget Overview</span>
        <h2 class="font-serif text-3xl md:text-4xl font-bold mt-3 mb-8 tracking-tight">Cost Breakdown</h2>
        <div class="space-y-5">${buildCostRows(cb)}</div>
      </div>
      <div class="lg:col-span-2">
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white sticky top-24" style="-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <div class="flex items-center gap-2 mb-6">
            <i data-lucide="wallet" class="w-5 h-5 text-gold-400"></i>
            <span class="text-gold-400 text-xs font-semibold uppercase tracking-widest">Total Estimated Cost</span>
          </div>
          <div class="text-5xl font-bold mb-2">
            <span class="text-3xl text-white/60">₹</span>${totalNum.toLocaleString('en-IN')}
          </div>
          <p class="text-white/50 text-sm mb-8">Estimated for ${data.days || ''} days</p>
          <div class="space-y-4 mb-8">
            ${perDay ? `<div class="flex justify-between text-sm"><span class="text-white/60">Per Day Average</span><span class="font-medium">${h(perDay)}</span></div><div class="border-t border-white/10"></div>` : ''}
            ${budget ? `<div class="flex justify-between text-sm"><span class="text-white/60">Budget Allocated</span><span class="font-medium">${h(budget)}</span></div><div class="border-t border-white/10"></div>` : ''}
            ${savings ? `<div class="flex justify-between text-sm"><span class="text-white/60">Savings</span><span class="font-medium text-green-400">${h(savings)}</span></div>` : ''}
          </div>
          ${savings ? `
          <div class="bg-white/10 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <i data-lucide="trending-down" class="w-4 h-4 text-green-400"></i>
              <span class="text-green-400 text-sm font-medium">Under Budget</span>
            </div>
            <p class="text-white/50 text-xs">You're saving ${savingsPct}% below your allocated budget of ${h(budget)}</p>
          </div>` : ''}
        </div>
      </div>
    </div>
  </div>
</section>` : ''}

<!-- Day Itinerary -->
${data.day_plans?.length ? `
<section class="py-20 bg-white" id="itinerary">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center mb-16">
      <span style="color:${brand}" class="text-xs font-semibold uppercase tracking-widest">Your Journey Awaits</span>
      <h2 class="font-serif text-3xl md:text-4xl font-bold mt-3 tracking-tight">Day-Wise Itinerary</h2>
      <p class="text-slate-500 mt-3 max-w-lg mx-auto">Every detail thoughtfully planned so you can focus on making memories</p>
    </div>
    <div class="flex flex-wrap justify-center gap-2 mb-12 no-print" id="dayTabs">
      ${dayTabs}
      <button onclick="showDay(0)" class="day-tab px-5 py-2.5 rounded-full text-sm font-medium transition-all" data-day="0">View All</button>
    </div>
    <div class="space-y-8" id="dayContainer">
      ${buildDayCards(data.day_plans)}
    </div>
  </div>
</section>` : ''}

<!-- Hotels -->
${data.accommodation?.length ? `
<section class="py-20 bg-slate-50">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center mb-16">
      <span style="color:${brand}" class="text-xs font-semibold uppercase tracking-widest">Where You'll Stay</span>
      <h2 class="font-serif text-3xl md:text-4xl font-bold mt-3 tracking-tight">Recommended Hotels</h2>
    </div>
    <div class="grid md:grid-cols-2 gap-6">${buildHotels(data.accommodation)}</div>
  </div>
</section>` : ''}

<!-- Transport -->
${data.transport_options?.length ? `
<section class="py-20 bg-white">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center mb-16">
      <span style="color:${brand}" class="text-xs font-semibold uppercase tracking-widest">Getting There</span>
      <h2 class="font-serif text-3xl md:text-4xl font-bold mt-3 tracking-tight">Transport Options</h2>
    </div>
    <div class="max-w-2xl mx-auto space-y-4">${buildTransport(data.transport_options)}</div>
  </div>
</section>` : ''}

<!-- Tips -->
${data.local_tips?.length ? `
<section class="py-20 bg-gold-50">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center mb-16">
      <span class="text-gold-600 text-xs font-semibold uppercase tracking-widest">Pro Tips</span>
      <h2 class="font-serif text-3xl md:text-4xl font-bold mt-3 tracking-tight">Local Tips &amp; Advice</h2>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">${buildTips(data.local_tips)}</div>
  </div>
</section>` : ''}

<!-- CTA -->
<section class="py-24 relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%); -webkit-print-color-adjust:exact; print-color-adjust:exact;">
  <div class="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl opacity-20" style="background:${brand}"></div>
  <div class="relative max-w-3xl mx-auto px-6 text-center">
    <div class="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
      <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
      <span class="text-green-300 text-xs font-semibold uppercase tracking-widest">Ready to Go?</span>
    </div>
    <h2 class="font-serif text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
      Confirm Your<br><span class="gold-shimmer">Dream Itinerary</span>
    </h2>
    <p class="text-white/60 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
      This ${h(tierLabel)} itinerary is custom-crafted for ${h(forName)}.
      ${isAgent ? `Contact ${h(agentName)} to lock in your dates and start your adventure.` : 'Visit tripzio.io to plan more trips instantly.'}
    </p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
      ${isAgent && phone ? `
      <a href="tel:${h(phone)}" class="inline-flex items-center gap-3 text-white font-medium px-8 py-4 rounded-xl shadow-lg" style="background:${brand}">
        <i data-lucide="phone" class="w-5 h-5"></i>Call ${h(phone)}
      </a>
      <a href="https://wa.me/${phone.replace(/\D/g,'')}" target="_blank" class="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-8 py-4 rounded-xl transition-all">
        <i data-lucide="message-circle" class="w-5 h-5"></i>WhatsApp Us
      </a>` : `
      <a href="https://tripzio.io" class="inline-flex items-center gap-3 text-white font-medium px-8 py-4 rounded-xl shadow-lg" style="background:${brand}">
        <i data-lucide="globe" class="w-5 h-5"></i>Plan More at tripzio.io
      </a>`}
    </div>
    <div class="flex items-center justify-center gap-6 text-white/40 text-sm">
      <div class="flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4"></i><span>Secure Booking</span></div>
      <div class="w-1 h-1 bg-white/20 rounded-full"></div>
      <div class="flex items-center gap-2"><i data-lucide="refresh-cw" class="w-4 h-4"></i><span>Free Cancellation</span></div>
      <div class="w-1 h-1 bg-white/20 rounded-full"></div>
      <div class="flex items-center gap-2"><i data-lucide="headphones" class="w-4 h-4"></i><span>24/7 Support</span></div>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="bg-slate-900 border-t border-slate-800 py-10">
  <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:${brand}">
        <i data-lucide="compass" class="w-4 h-4 text-white"></i>
      </div>
      <span class="text-white font-semibold">Tripzio</span>
      <span class="text-white/30 text-xs">AI Travel Planner</span>
    </div>
    <div class="text-white/30 text-xs text-center md:text-right">
      ${isAgent ? `Prepared by <span class="text-white/50">${h(agentName)}</span> &bull; ` : ''}
      Powered by <span class="text-white/50">Tripzio AI</span> &bull; tripzio.io
    </div>
  </div>
</footer>

<script>
  lucide.createIcons();

  function showDay(day) {
    const cards = document.querySelectorAll('.day-card');
    const tabs = document.querySelectorAll('.day-tab');
    tabs.forEach(tab => {
      tab.classList.remove('active-tab');
      if (parseInt(tab.dataset.day) === day) tab.classList.add('active-tab');
    });
    cards.forEach(card => {
      if (day === 0) {
        card.style.display = '';
      } else {
        card.style.display = parseInt(card.dataset.day) === day ? '' : 'none';
      }
    });
  }

  // Animate cost bars
  setTimeout(() => {
    document.querySelectorAll('.cost-bar').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 300);

  showDay(0);
</script>
</body>
</html>`

  // Open in new tab → user saves as PDF via Ctrl+P
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')

  // Auto-trigger print dialog after content loads
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.focus()
        win.print()
      }, 3500) // wait 3.5s for images and fonts to fully load
    }
  }

  // Cleanup blob URL after use
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
