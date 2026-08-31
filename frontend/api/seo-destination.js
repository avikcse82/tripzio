// api/seo-destination.js
// Vercel Edge Function — intercepts /[destination]-trip-planner URLs
// Fetches page data from FastAPI, returns fully rendered HTML to Google bot
// Cached by Vercel CDN after first render

import { DESTINATION_PHOTOS } from './_destinationPhotos.js'

export const config = {
  runtime: 'edge',
}

const API_URL = process.env.VITE_API_URL || 'https://tripzio-production.up.railway.app'

// Rotating accent colors for day cards — same palette used across the app
const DAY_ACCENTS = ['#0D9488', '#F97316', '#6366F1', '#0EA5E9', '#EC4899', '#16A34A']

// A route page ("delhi-to-manali") or festival page ("goa-christmas") is
// keyed by a combined slug, which is never itself a photo-database key —
// those are single destinations ("manali", "goa"). The place itself is what
// should appear behind the hero (arriving in Manali is the visual, not
// leaving Delhi; Goa is the visual, not "Christmas"), so both page types
// look their photo up by destination_name instead of by the URL slug.
function photoSlugFor(d, slug) {
  if ((d.page_type === 'route' || d.page_type === 'festival') && d.destination_name) {
    return d.destination_name.toLowerCase().replace(/\s+/g, '-')
  }
  return slug
}

// ── HTML renderer ─────────────────────────────────────────────────────────
function renderHTML(data, slug) {
  const d = data
  const canonicalUrl = `https://tripzio.io/${slug}-trip-planner`
  const heroPhoto = DESTINATION_PHOTOS[photoSlugFor(d, slug)]

  // Render day plans
  const dayPlansHTML = (d.sample_plan?.day_plans || []).map((day, i) => {
    const accent = DAY_ACCENTS[i % DAY_ACCENTS.length]
    return `
    <div class="day-card" style="animation-delay:${(i * 0.08).toFixed(2)}s; border-left-color:${accent}">
      <div class="day-header">
        <span class="day-badge" style="background:${accent}">Day ${i + 1}</span>
        <h3 class="day-title">${escHtml(day.title || '')}</h3>
      </div>
      <p class="day-desc">${escHtml(day.description || '')}</p>
      <div class="day-meta">
        ${day.stay ? `<span class="meta-chip">🏨 ${escHtml(day.stay)}</span>` : ''}
        ${day.transport ? `<span class="meta-chip">🚂 ${escHtml(day.transport)}</span>` : ''}
        ${day.cost ? `<span class="meta-chip meta-chip-cost">💰 ${escHtml(day.cost)}</span>` : ''}
      </div>
    </div>
  `
  }).join('')

  // Render best months
  const monthsHTML = (d.best_months || []).map(m => `
    <div class="month-card month-${m.rating || 'good'}">
      <div class="month-icon">${m.icon || '🌤️'}</div>
      <div class="month-name">${escHtml(m.month || '')}</div>
      <div class="month-rating">${escHtml(m.rating || '')}</div>
      <div class="month-reason">${escHtml(m.reason || '')}</div>
    </div>
  `).join('')

  // Render real trains (route pages only) — these come straight from the
  // live railway API via the backend, never rewritten by the AI, so what's
  // shown here is a real, bookable train number, not a plausible one.
  const trainsHTML = (d.trains || []).map(t => `
    <div class="train-card">
      <div class="train-name">${escHtml(t.name || 'Train')}${t.number ? ` <span class="train-number">#${escHtml(t.number)}</span>` : ''}</div>
      <div class="train-meta">
        ${t.departure ? `<span class="meta-chip">🕐 Dep ${escHtml(t.departure)}</span>` : ''}
        ${t.arrival ? `<span class="meta-chip">🏁 Arr ${escHtml(t.arrival)}</span>` : ''}
        ${t.duration ? `<span class="meta-chip">⏱ ${escHtml(t.duration)}</span>` : ''}
        ${t.classes ? `<span class="meta-chip">💺 ${escHtml(t.classes)}</span>` : ''}
      </div>
    </div>
  `).join('')

  // Render cross-links (#2: contextual internal linking) — related_destinations
  // for destination pages, related_routes for route pages. Computed
  // server-side, deterministic, never AI-guessed (see routers/seo.py's
  // related_destinations_for / related_routes_for) — this controls the
  // internal link graph a topic-cluster SEO strategy depends on, so it's
  // curated rather than left to a model to invent a page that might not
  // even exist.
  function slugToLabel(s) {
    return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  // Splits on the FIRST "-to-" rather than naive hyphen-splitting — the
  // backend's own route regex allows a hyphenated destination
  // ([a-z0-9-]+ after "-to-"), even though none of today's 15 curated
  // routes happen to use one. "delhi-to-mcleod-ganj" must become
  // ["delhi", "mcleod-ganj"], not silently drop everything after "mcleod".
  function splitRouteSlug(slug) {
    const idx = slug.indexOf('-to-')
    return idx === -1 ? [slug, ''] : [slug.slice(0, idx), slug.slice(idx + 4)]
  }
  const relatedHTML = d.page_type === 'route'
    ? (d.related_routes || []).map(slug => {
        const [fromSlug, destSlug] = splitRouteSlug(slug)
        return `<a href="/${slug}-trip-planner" class="related-card">${escHtml(slugToLabel(fromSlug))} → ${escHtml(slugToLabel(destSlug))}</a>`
      }).join('')
    : d.page_type === 'festival'
    ? (d.related_festivals || []).map(slug => {
        // related_festivals_for only ever returns siblings for the SAME
        // destination as the current page, so stripping that destination's
        // own slug prefix leaves just the festival part ("goa-sunburn" -> "sunburn").
        const destPrefix = (d.destination_name || '').toLowerCase().replace(/\s+/g, '-') + '-'
        const festivalPart = slug.startsWith(destPrefix) ? slug.slice(destPrefix.length) : slug
        return `<a href="/${slug}-trip-planner" class="related-card">${escHtml(slugToLabel(festivalPart))}</a>`
      }).join('')
    : (d.related_destinations || []).map(slug =>
        `<a href="/${slug}-trip-planner" class="related-card">${escHtml(slugToLabel(slug))}</a>`
      ).join('')

  // Render FAQs (also generates FAQ structured data for Google)
  const faqsHTML = (d.faqs || []).map(faq => `
    <div class="faq-item">
      <div class="faq-q">Q: ${escHtml(faq.q || '')}</div>
      <div class="faq-a">A: ${escHtml(faq.a || '')}</div>
    </div>
  `).join('')

  // FAQ structured data for Google rich snippets
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": (d.faqs || []).map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  }

  // TouristDestination structured data
  const destinationStructuredData = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "name": d.destination_name,
    "description": d.meta_description,
    "url": canonicalUrl,
  }

  // Quick facts
  const quickFactsHTML = (d.quick_facts || []).map(f => `
    <div class="fact-item">
      <span class="fact-icon">${f.icon || ''}</span>
      <div>
        <div class="fact-value">${escHtml(f.value || '')}</div>
        <div class="fact-label">${escHtml(f.label || '')}</div>
      </div>
    </div>
  `).join('')

  // Why Tripzio points
  const whyHTML = (d.why_tripzio || []).map(w => `
    <div class="why-item">
      <span class="why-check">✓</span>
      <div>
        <div class="why-title">${escHtml(w.title || '')}</div>
        <div class="why-desc">${escHtml(w.desc || '')}</div>
      </div>
    </div>
  `).join('')

  // All destination footer links
  const destLinks = [
    ['goa', 'Goa'], ['manali', 'Manali'], ['kerala', 'Kerala'],
    ['rajasthan', 'Rajasthan'], ['ladakh', 'Ladakh'], ['darjeeling', 'Darjeeling'],
    ['andaman', 'Andaman'], ['varanasi', 'Varanasi'], ['shimla', 'Shimla'], ['char-dham', 'Char Dham']
  ].map(([s, n]) => `<a href="/${s}-trip-planner" class="footer-link">${n}</a>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(d.meta_title || `${d.destination_name} Trip Planner | Tripzio`)}</title>
  <meta name="description" content="${escHtml(d.meta_description || '')}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${escHtml(d.meta_title || '')}" />
  <meta property="og:description" content="${escHtml(d.meta_description || '')}" />
  <meta property="og:image" content="${heroPhoto?.photo || 'https://tripzio.io/og-image.png'}" />
  <meta property="og:site_name" content="Tripzio" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(d.meta_title || '')}" />
  <meta name="twitter:description" content="${escHtml(d.meta_description || '')}" />
  <meta name="twitter:image" content="${heroPhoto?.photo || 'https://tripzio.io/og-image.png'}" />

  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(faqStructuredData)}</script>
  <script type="application/ld+json">${JSON.stringify(destinationStructuredData)}</script>

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VC06LRP2ED"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-VC06LRP2ED');</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap" rel="stylesheet" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,-apple-system,sans-serif;background:#FAFAF8;color:#0F172A}
    a{text-decoration:none;color:inherit}
    .nav{background:rgba(250,250,248,0.85);backdrop-filter:blur(12px);border-bottom:1px solid #E7E3D8;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:800;color:#0F172A;font-family:'Plus Jakarta Sans',sans-serif}
    .logo-icon{width:32px;height:32px;background:linear-gradient(135deg,#0D9488,#0EA5E9);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:14px}
    .nav-cta{background:linear-gradient(135deg,#F97316,#F59E0B);color:white;padding:8px 18px;border-radius:10px;font-weight:700;font-size:13px}
    .hero{position:relative;background:linear-gradient(135deg,#FEF3C7 0%,#E8F7F4 100%);padding:72px 24px 56px;text-align:center;background-size:cover;background-position:center}
    .hero.has-photo{color:white}
    .hero.has-photo .hero-badge{background:rgba(255,255,255,0.14);backdrop-filter:blur(8px);border-color:rgba(255,255,255,0.35);color:white}
    .hero.has-photo h1{color:white;text-shadow:0 2px 16px rgba(0,0,0,0.25)}
    .hero.has-photo .hero-sub{color:rgba(255,255,255,0.92)}
    .hero.has-photo .prompt-chip{background:rgba(255,255,255,0.14);backdrop-filter:blur(8px);border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.95)}
    .hero.has-photo .cta-note{color:rgba(255,255,255,0.8)}
    .hero-badge{display:inline-block;background:white;border:1px solid #FDE68A;border-radius:20px;padding:5px 14px;color:#B45309;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:20px}
    .hero h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(28px,5vw,48px);font-weight:700;color:#0F172A;line-height:1.15;margin-bottom:16px}
    .hero-sub{font-size:17px;color:#475569;margin-bottom:32px;line-height:1.6}
    .prompt-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:32px}
    .prompt-chip{background:white;border:1px solid #E7E3D8;border-radius:20px;padding:6px 14px;font-size:12px;color:#64748B;font-style:italic}
    .cta-btn{display:inline-flex;align-items:center;gap:8px;padding:16px 36px;background:linear-gradient(135deg,#F97316,#F59E0B);color:white;border-radius:14px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(249,115,22,.32);transition:transform .3s cubic-bezier(0.34,1.56,0.64,1),box-shadow .3s ease}
    .cta-btn:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 12px 32px rgba(249,115,22,.4)}
    .cta-note{font-size:12px;color:#64748B;margin-top:12px}
    .hero-credit{position:absolute;bottom:8px;right:14px;font-size:9px;color:rgba(255,255,255,0.55)}
    .hero-credit a{color:inherit;text-decoration:none}
    .facts-bar{background:white;border-bottom:1px solid #E7E3D8;padding:18px 24px}
    .facts-inner{max-width:900px;margin:0 auto;display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
    .fact-item{display:flex;align-items:center;gap:8px}
    .fact-icon{font-size:18px}
    .fact-value{font-size:13px;font-weight:700}
    .fact-label{font-size:11px;color:#64748b}
    .content{max-width:900px;margin:0 auto;padding:48px 24px}
    .section{margin-bottom:56px}
    .section-title{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#0F172A;margin-bottom:20px}
    .section-sub{color:#64748b;font-size:14px;margin-bottom:24px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    .day-card{background:white;border:1px solid #E7E3D8;border-left:4px solid #0D9488;border-radius:16px;padding:20px 24px;margin-bottom:16px;box-shadow:0 2px 8px rgba(15,23,42,.04);animation:fadeUp .5s ease backwards;transition:transform .35s cubic-bezier(0.34,1.56,0.64,1),box-shadow .35s ease}
    .day-card:hover{transform:translateY(-6px);box-shadow:0 16px 32px rgba(15,23,42,.12)}
    .day-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .day-badge{color:white;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px}
    .day-title{font-size:15px;font-weight:700}
    .day-desc{font-size:13px;color:#64748b;line-height:1.6;margin-bottom:12px}
    .day-meta{display:flex;gap:8px;flex-wrap:wrap}
    .meta-chip{font-size:11px;color:#0d9488;font-weight:700;background:#F0FDFA;border:1px solid #99F6E4;padding:4px 10px;border-radius:20px}
    .meta-chip-cost{color:#B45309;background:#FFFBEB;border-color:#FDE68A}
    .train-card{background:white;border:1px solid #E7E3D8;border-left:4px solid #6366F1;border-radius:16px;padding:16px 24px;margin-bottom:12px;box-shadow:0 2px 8px rgba(15,23,42,.04)}
    .train-name{font-size:14px;font-weight:700;margin-bottom:8px}
    .train-number{font-weight:500;color:#64748b}
    .train-meta{display:flex;gap:8px;flex-wrap:wrap}
    .related-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
    .related-card{display:block;background:white;border:1px solid #E7E3D8;border-radius:12px;padding:14px 16px;font-size:13px;font-weight:700;color:#0F172A;text-align:center;transition:transform .3s cubic-bezier(0.34,1.56,0.64,1),box-shadow .3s ease}
    .related-card:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(15,23,42,.08);color:#0D9488}
    .festival-fact-card{background:linear-gradient(135deg,#FEF3C7,#FEE2E2);border:1px solid #FDE68A;border-radius:16px;padding:20px 24px}
    .festival-fact-date{font-size:18px;font-weight:800;color:#92400E}
    .budget-box{background:linear-gradient(135deg,#F0FDF4,#F0F9FF);border:1px solid #86efac;border-radius:16px;padding:20px 24px;display:flex;gap:24px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-top:24px;transition:transform .35s cubic-bezier(0.34,1.56,0.64,1),box-shadow .35s ease}
    .budget-box:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(15,23,42,.08)}
    .budget-amount{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:#0d9488}
    .budget-label{font-size:13px;font-weight:700;color:#166534;margin-bottom:4px}
    .why-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
    .why-item{background:white;border:1px solid #E7E3D8;border-radius:14px;padding:16px;display:flex;gap:12px;animation:fadeUp .5s ease backwards;transition:transform .35s cubic-bezier(0.34,1.56,0.64,1),box-shadow .35s ease}
    .why-item:hover{transform:translateY(-5px);box-shadow:0 14px 28px rgba(15,23,42,.1)}
    .why-check{color:#0d9488;font-size:18px;flex-shrink:0;margin-top:2px}
    .why-title{font-size:13px;font-weight:700;margin-bottom:4px}
    .why-desc{font-size:12px;color:#64748b;line-height:1.5}
    .months-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
    .month-card{border-radius:12px;padding:12px;text-align:center;transition:transform .3s cubic-bezier(0.34,1.56,0.64,1),box-shadow .3s ease}
    .month-card:hover{transform:translateY(-4px) scale(1.03);box-shadow:0 10px 20px rgba(15,23,42,.08)}
    .month-excellent{background:#f0fdf4;border:1px solid #86efac}
    .month-good{background:#f0f9ff;border:1px solid #bae6fd}
    .month-avoid{background:#fef2f2;border:1px solid #fca5a5}
    .month-okay{background:#fffbeb;border:1px solid #fcd34d}
    .month-icon{font-size:20px;margin-bottom:4px}
    .month-name{font-size:13px;font-weight:700;margin-bottom:2px}
    .month-rating{font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:4px}
    .month-reason{font-size:10px;color:#64748b}
    .month-excellent .month-rating{color:#166534}
    .month-good .month-rating{color:#0369a1}
    .month-avoid .month-rating{color:#991b1b}
    .faq-item{background:white;border:1px solid #E7E3D8;border-radius:12px;padding:16px 20px;margin-bottom:12px;transition:transform .3s cubic-bezier(0.34,1.56,0.64,1),box-shadow .3s ease}
    .faq-item:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(15,23,42,.08)}
    .faq-q{font-size:14px;font-weight:700;margin-bottom:8px}
    .faq-a{font-size:13px;color:#64748b;line-height:1.6}
    .final-cta{background:linear-gradient(120deg,#0D9488,#0EA5E9 55%,#F97316);border-radius:24px;padding:48px 32px;text-align:center}
    .final-cta .cta-btn:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 12px 32px rgba(0,0,0,.2)}
    .final-cta h2{font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:white;margin-bottom:12px}
    .final-cta p{color:rgba(255,255,255,0.85);font-size:15px;margin-bottom:28px}
    .final-cta .cta-btn{background:white;color:#0F172A;box-shadow:0 8px 24px rgba(0,0,0,0.15)}
    .footer{background:#FAFAF8;border-top:1px solid #E7E3D8;color:#64748b;padding:28px 24px;text-align:center}
    .footer-links{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-bottom:14px;font-size:13px}
    .footer-link{color:#64748B}
    .footer-copy{font-size:12px}
  </style>
</head>
<body>
  <!-- Full HTML for Google bot and first page load -->
  <nav class="nav">
    <a href="/" class="logo">
      <div class="logo-icon">✈</div>
      Tripzio
    </a>
    <div style="display:flex;gap:12px;align-items:center">
      <a href="/login" style="font-size:13px;color:#64748b;font-weight:600">Sign In</a>
      <a href="/guest" class="nav-cta">Plan Free →</a>
    </div>
  </nav>

  <section class="hero${heroPhoto ? ' has-photo' : ''}"${heroPhoto ? ` style="background-image:linear-gradient(180deg, rgba(15,23,42,.4) 0%, rgba(15,23,42,.55) 55%, rgba(15,23,42,.82) 100%), url('${heroPhoto.photo}')"` : ''}>
    <div style="max-width:800px;margin:0 auto">
      <div class="hero-badge">✨ AI-POWERED · FREE TO START</div>
      <h1>${escHtml(d.hero_title || `Plan Your ${d.destination_name} Trip`)}</h1>
      <p class="hero-sub">${escHtml(d.hero_subtitle || '')}</p>
      <div class="prompt-chips">
        ${(d.sample_prompts || []).map(p => `<div class="prompt-chip">"${escHtml(p)}"</div>`).join('')}
      </div>
      <a href="/guest" class="cta-btn">Plan My ${escHtml(d.destination_name)} Trip Free →</a>
      <p class="cta-note">No signup needed · Takes a few minutes · Real trains & hotels</p>
    </div>
    ${heroPhoto?.credit ? `
    <div class="hero-credit">
      <a href="${heroPhoto.credit.authorUrl}" target="_blank" rel="noopener noreferrer">${escHtml(heroPhoto.credit.author)}</a>
      /
      <a href="${heroPhoto.credit.licenseUrl}" target="_blank" rel="noopener noreferrer">${escHtml(heroPhoto.credit.license)}</a>
    </div>` : ''}
  </section>

  <div class="facts-bar">
    <div class="facts-inner">${quickFactsHTML}</div>
  </div>

  <div class="content">
    <!-- Real trains (route pages only) — shown first, it's what a route
         search actually came for, ahead of the sample itinerary -->
    ${d.page_type === 'route' && trainsHTML ? `
    <section class="section">
      <h2 class="section-title">Trains from ${escHtml(d.from_name || '')} to ${escHtml(d.destination_name)}</h2>
      <p class="section-sub">Live data, not AI-generated — real train names and numbers you can book on IRCTC</p>
      ${trainsHTML}
    </section>` : ''}

    <!-- Real festival date (festival pages only) — shown first, same reasoning
         as trains: this is the one fact the AI-written content below was
         deliberately never allowed to state itself -->
    ${d.page_type === 'festival' && d.festival_date_display ? `
    <section class="section">
      <div class="festival-fact-card">
        <div class="festival-fact-date">📅 ${escHtml(d.festival_name || '')} — ${escHtml(d.festival_date_display)}</div>
        <p class="section-sub" style="margin:4px 0 12px">Verified date, not AI-generated</p>
        ${d.price_impact ? `<span class="meta-chip" style="margin-right:8px">💰 ${escHtml(d.price_impact.replace(/_/g, ' '))} price impact</span>` : ''}
        ${d.festival_tip ? `<p style="font-size:13px;color:#475569;margin-top:10px">💡 ${escHtml(d.festival_tip)}</p>` : ''}
      </div>
    </section>` : ''}

    <!-- Sample Itinerary -->
    <section class="section">
      <h2 class="section-title">Sample ${escHtml(d.destination_name)} Itinerary — Generated by AI</h2>
      <p class="section-sub">Real plan · ${d.sample_plan?.days || 5} days · ${escHtml(d.sample_plan?.budget || '')} · ${escHtml(d.sample_plan?.trip_type || '')}</p>
      ${dayPlansHTML}
      <div class="budget-box">
        <div>
          <div class="budget-label">Total Estimated Budget</div>
          <div class="budget-amount">${escHtml(d.sample_plan?.budget || '')}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">for ${escHtml(d.sample_plan?.trip_type || '')} · ${d.sample_plan?.days || 5} days</div>
        </div>
        <a href="/guest" class="cta-btn" style="padding:12px 24px;font-size:14px">Generate My ${escHtml(d.destination_name)} Plan →</a>
      </div>
    </section>

    <!-- Why Tripzio -->
    ${whyHTML ? `
    <section class="section">
      <h2 class="section-title">Why Plan Your ${escHtml(d.destination_name)} Trip with Tripzio?</h2>
      <div class="why-grid">${whyHTML}</div>
    </section>` : ''}

    <!-- Best months -->
    ${monthsHTML ? `
    <section class="section">
      <h2 class="section-title">Best Time to Visit ${escHtml(d.destination_name)}</h2>
      <div class="months-grid">${monthsHTML}</div>
    </section>` : ''}

    <!-- FAQs -->
    ${faqsHTML ? `
    <section class="section">
      <h2 class="section-title">Frequently Asked Questions — ${escHtml(d.destination_name)} Trip</h2>
      ${faqsHTML}
    </section>` : ''}

    <!-- Related destinations/routes (#2: contextual cross-linking) — real
         links only, computed server-side; nothing here can point at a page
         that doesn't (or won't) exist -->
    ${relatedHTML ? `
    <section class="section">
      <h2 class="section-title">${d.page_type === 'route' ? 'Other Popular Routes' : d.page_type === 'festival' ? `More Festivals in ${escHtml(d.destination_name)}` : `You Might Also Like`}</h2>
      <div class="related-grid">${relatedHTML}</div>
    </section>` : ''}

    <!-- Final CTA -->
    <div class="final-cta">
      <h2>Ready to Plan Your ${escHtml(d.destination_name)} Trip?</h2>
      <p>Join thousands of Indian travellers who plan smarter with Tripzio</p>
      <a href="/guest" class="cta-btn">Generate My Free ${escHtml(d.destination_name)} Plan →</a>
      <p class="cta-note" style="margin-top:12px">Free · No credit card · Takes a few minutes</p>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-links">${destLinks}</div>
    <p class="footer-copy">© 2026 Tripzio · AI Travel Planner for India · <a href="/" class="footer-link">tripzio.io</a></p>
  </footer>
</body>
</html>`
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Edge Function handler ─────────────────────────────────────────────────
export default async function handler(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Get slug from query param (vercel rewrite) or extract from path
  let slug = url.searchParams.get('slug')
  if (!slug) {
    const match = pathname.match(/^\/(.+)-trip-planner\/?$/)
    if (!match) return new Response(null, { status: 404 })
    slug = match[1]
  }

  try {
    // Fetch page data from FastAPI (Railway)
    const apiResponse = await fetch(`${API_URL}/seo/page/${slug}`, {
      headers: { 'Content-Type': 'application/json' },
      // 25 second timeout (Haiku generation takes up to 20s)
    })

    if (!apiResponse.ok) {
      throw new Error(`API returned ${apiResponse.status}`)
    }

    const { data } = await apiResponse.json()

    // Render full HTML
    const html = renderHTML(data, slug)

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Cache for 24 hours on CDN, 1 hour for browser
        'Cache-Control': 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400',
        'X-SEO-Source': data.source || 'unknown',
      }
    })

  } catch (error) {
    console.error(`SEO Edge Function error for ${slug}:`, error.message)
    // On error — return a minimal but real page so a visitor sees something
    // useful instead of a blank screen (noindex, so Google skips it either way)
    const niceName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escHtml(niceName)} Trip Planner | Tripzio</title>
  <meta name="robots" content="noindex"/>
  <style>body{font-family:-apple-system,Inter,sans-serif;background:#FAFAF8;color:#0F172A;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}a{color:#0D9488;font-weight:700;text-decoration:none}</style>
</head>
<body>
  <h1>${escHtml(niceName)} trip planning, made easy</h1>
  <p style="margin:12px 0 24px;color:#64748b">This page is having trouble loading right now.</p>
  <a href="/guest">Plan your ${escHtml(niceName)} trip on Tripzio →</a>
</body>
</html>`
    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      }
    })
  }
}
