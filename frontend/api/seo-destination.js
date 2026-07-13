// api/seo-destination.js
// Vercel Edge Function — intercepts /[destination]-trip-planner URLs
// Fetches page data from FastAPI, returns fully rendered HTML to Google bot
// Cached by Vercel CDN after first render

export const config = {
  runtime: 'edge',
}

const API_URL = process.env.VITE_API_URL || 'https://tripzio-production.up.railway.app'

// ── HTML renderer ─────────────────────────────────────────────────────────
function renderHTML(data, slug) {
  const d = data
  const canonicalUrl = `https://tripzio.io/${slug}-trip-planner`

  // Render day plans
  const dayPlansHTML = (d.sample_plan?.day_plans || []).map((day, i) => `
    <div class="day-card">
      <div class="day-header">
        <span class="day-badge">Day ${i + 1}</span>
        <h3 class="day-title">${escHtml(day.title || '')}</h3>
      </div>
      <p class="day-desc">${escHtml(day.description || '')}</p>
      <div class="day-meta">
        ${day.stay ? `<span class="meta-item">🏨 ${escHtml(day.stay)}</span>` : ''}
        ${day.transport ? `<span class="meta-item">🚂 ${escHtml(day.transport)}</span>` : ''}
        ${day.cost ? `<span class="meta-item">💰 ${escHtml(day.cost)}</span>` : ''}
      </div>
    </div>
  `).join('')

  // Render best months
  const monthsHTML = (d.best_months || []).map(m => `
    <div class="month-card month-${m.rating || 'good'}">
      <div class="month-icon">${m.icon || '🌤️'}</div>
      <div class="month-name">${escHtml(m.month || '')}</div>
      <div class="month-rating">${escHtml(m.rating || '')}</div>
      <div class="month-reason">${escHtml(m.reason || '')}</div>
    </div>
  `).join('')

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
  <meta property="og:image" content="https://tripzio.io/og-image.png" />
  <meta property="og:site_name" content="Tripzio" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(d.meta_title || '')}" />
  <meta name="twitter:description" content="${escHtml(d.meta_description || '')}" />
  <meta name="twitter:image" content="https://tripzio.io/og-image.png" />

  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(faqStructuredData)}</script>
  <script type="application/ld+json">${JSON.stringify(destinationStructuredData)}</script>

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VC06LRP2ED"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-VC06LRP2ED');</script>

  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
    a{text-decoration:none;color:inherit}
    .nav{background:white;border-bottom:1px solid #e2e8f0;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
    .logo{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:800;color:#0f172a}
    .logo-icon{width:32px;height:32px;background:linear-gradient(135deg,#0d9488,#0ea5e9);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:14px}
    .nav-cta{background:linear-gradient(135deg,#0d9488,#0ea5e9);color:white;padding:8px 18px;border-radius:10px;font-weight:700;font-size:13px}
    .hero{background:linear-gradient(135deg,#0f172a,#1e293b);padding:64px 24px;text-align:center}
    .hero-badge{display:inline-block;background:rgba(13,148,136,.15);border:1px solid rgba(13,148,136,.3);border-radius:20px;padding:5px 14px;color:#5eead4;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:20px}
    .hero h1{font-size:clamp(28px,5vw,48px);font-weight:900;color:white;line-height:1.1;margin-bottom:16px}
    .hero-sub{font-size:17px;color:#94a3b8;margin-bottom:32px;line-height:1.6}
    .prompt-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:32px}
    .prompt-chip{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:6px 14px;font-size:12px;color:#cbd5e1;font-style:italic}
    .cta-btn{display:inline-flex;align-items:center;gap:8px;padding:16px 36px;background:linear-gradient(135deg,#0d9488,#0ea5e9);color:white;border-radius:14px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(13,148,136,.4)}
    .cta-note{font-size:12px;color:#475569;margin-top:12px}
    .facts-bar{background:white;border-bottom:1px solid #e2e8f0;padding:18px 24px}
    .facts-inner{max-width:900px;margin:0 auto;display:flex;gap:32px;flex-wrap:wrap;justify-content:center}
    .fact-item{display:flex;align-items:center;gap:8px}
    .fact-icon{font-size:18px}
    .fact-value{font-size:13px;font-weight:700}
    .fact-label{font-size:11px;color:#64748b}
    .content{max-width:900px;margin:0 auto;padding:48px 24px}
    .section{margin-bottom:56px}
    .section-title{font-size:26px;font-weight:800;margin-bottom:20px}
    .section-sub{color:#64748b;font-size:14px;margin-bottom:24px}
    .day-card{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
    .day-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .day-badge{background:linear-gradient(135deg,#0d9488,#0ea5e9);color:white;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px}
    .day-title{font-size:15px;font-weight:700}
    .day-desc{font-size:13px;color:#64748b;line-height:1.6;margin-bottom:12px}
    .day-meta{display:flex;gap:16px;flex-wrap:wrap}
    .meta-item{font-size:12px;color:#0d9488;font-weight:600}
    .budget-box{background:linear-gradient(135deg,#f0fdf4,#f0f9ff);border:1px solid #86efac;border-radius:16px;padding:20px 24px;display:flex;gap:24px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-top:24px}
    .budget-amount{font-size:28px;font-weight:900;color:#0d9488}
    .budget-label{font-size:13px;font-weight:700;color:#166534;margin-bottom:4px}
    .why-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
    .why-item{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px;display:flex;gap:12px}
    .why-check{color:#0d9488;font-size:18px;flex-shrink:0;margin-top:2px}
    .why-title{font-size:13px;font-weight:700;margin-bottom:4px}
    .why-desc{font-size:12px;color:#64748b;line-height:1.5}
    .months-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
    .month-card{border-radius:12px;padding:12px;text-align:center}
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
    .faq-item{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:12px}
    .faq-q{font-size:14px;font-weight:700;margin-bottom:8px}
    .faq-a{font-size:13px;color:#64748b;line-height:1.6}
    .final-cta{background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:24px;padding:48px 32px;text-align:center}
    .final-cta h2{font-size:26px;font-weight:900;color:white;margin-bottom:12px}
    .final-cta p{color:#94a3b8;font-size:15px;margin-bottom:28px}
    .footer{background:#0f172a;color:#64748b;padding:28px 24px;text-align:center}
    .footer-links{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-bottom:14px;font-size:13px}
    .footer-link{color:#475569}
    .footer-copy{font-size:12px}
    /* React app loads after this — handles SPA navigation */
    #react-root{display:none}
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

  <section class="hero">
    <div style="max-width:800px;margin:0 auto">
      <div class="hero-badge">✨ AI-POWERED · FREE TO START</div>
      <h1>${escHtml(d.hero_title || `Plan Your ${d.destination_name} Trip`)}</h1>
      <p class="hero-sub">${escHtml(d.hero_subtitle || '')}</p>
      <div class="prompt-chips">
        ${(d.sample_prompts || []).map(p => `<div class="prompt-chip">"${escHtml(p)}"</div>`).join('')}
      </div>
      <a href="/guest" class="cta-btn">Plan My ${escHtml(d.destination_name)} Trip Free →</a>
      <p class="cta-note">No signup needed · Takes 30-90 seconds · Real trains & hotels</p>
    </div>
  </section>

  <div class="facts-bar">
    <div class="facts-inner">${quickFactsHTML}</div>
  </div>

  <div class="content">
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

    <!-- Final CTA -->
    <div class="final-cta">
      <h2>Ready to Plan Your ${escHtml(d.destination_name)} Trip?</h2>
      <p>Join thousands of Indian travellers who plan smarter with Tripzio</p>
      <a href="/guest" class="cta-btn">Generate My Free ${escHtml(d.destination_name)} Plan →</a>
      <p class="cta-note" style="margin-top:12px">Free · No credit card · Takes 30-90 seconds</p>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-links">${destLinks}</div>
    <p class="footer-copy">© 2026 Tripzio · AI Travel Planner for India · <a href="/" class="footer-link">tripzio.io</a></p>
  </footer>

  <!-- React app loads for SPA navigation after initial render -->
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
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
    // On error — return minimal HTML so page doesn't break
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} Trip Planner | Tripzio</title>
  <meta name="robots" content="noindex"/>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
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
