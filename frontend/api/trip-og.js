// api/trip-og.js
// Vercel Edge Function — handles /trip/{slug} URLs
// Injects dynamic OG meta tags into index.html
// Works for both bots (WhatsApp preview) and real users (React app loads normally)

export const config = {
  runtime: 'edge',
}

const API_URL = process.env.VITE_API_URL || 'https://tripzio-production.up.railway.app'

function isBot(userAgent) {
  if (!userAgent) return false
  return /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|googlebot|bingbot|applebot|pinterest|discordbot/i.test(userAgent)
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export default async function handler(request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') || url.pathname.split('/').pop()

  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return new Response(null, { status: 404 })
  }

  const canonical = `https://tripzio.io/trip/${slug}`
  const userAgent = request.headers.get('user-agent') || ''
  const bot = isBot(userAgent)

  // Default OG values
  let ogTitle = 'AI-Generated Trip Plan | Tripzio'
  let ogDesc = 'Complete trip plan with real trains, hotels & budget breakdown. Plan yours free at tripzio.io'
  const ogImage = 'https://tripzio.io/og-image.png'

  // Always fetch trip data — both bots and users benefit from correct title
  try {
    const apiRes = await fetch(`${API_URL}/trip-og/${slug}`, {
      headers: { 'User-Agent': 'TripzioBot/1.0' },
      signal: AbortSignal.timeout(5000), // 5s timeout
    })
    if (apiRes.ok) {
      const html = await apiRes.text()
      const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/)
      const descMatch  = html.match(/property="og:description"\s+content="([^"]+)"/)
      if (titleMatch) ogTitle = titleMatch[1]
      if (descMatch)  ogDesc  = descMatch[1]
    }
  } catch {
    // Fail open — use defaults
  }

  // OG tags to inject into <head>
  const ogTags = `
  <!-- Dynamic OG tags for trip ${escHtml(slug)} -->
  <title>${escHtml(ogTitle)}</title>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${canonical}"/>
  <meta property="og:title" content="${escHtml(ogTitle)}"/>
  <meta property="og:description" content="${escHtml(ogDesc)}"/>
  <meta property="og:image" content="${ogImage}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:site_name" content="Tripzio"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escHtml(ogTitle)}"/>
  <meta name="twitter:description" content="${escHtml(ogDesc)}"/>
  <meta name="twitter:image" content="${ogImage}"/>
  <link rel="canonical" href="${canonical}"/>
  `

  // Fetch the built index.html from Vercel's own origin
  try {
    const origin = new URL(request.url).origin
    const indexRes = await fetch(`${origin}/index.html`)
    if (indexRes.ok) {
      let indexHtml = await indexRes.text()
      // Inject OG tags after <head> opening tag
      indexHtml = indexHtml.replace(
        /<head>/i,
        `<head>${ogTags}`
      )
      // Remove default title (we inject our own above)
      indexHtml = indexHtml.replace(
        /<title>Tripzio[^<]*<\/title>/,
        ''
      )
      return new Response(indexHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': bot
            ? 'public, s-maxage=3600, stale-while-revalidate=3600'
            : 'no-cache',
        }
      })
    }
  } catch {
    // Fallback if index.html fetch fails
  }

  // Ultimate fallback — minimal HTML with OG tags + React bootstrap
  const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  ${ogTags}
</head>
<body>
  <div id="root"></div>
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
