// api/trip-og.js
// Vercel Edge Function — handles /trip/{slug} URLs
// Injects dynamic OG meta tags into index.html
// Works for both bots (WhatsApp preview) and real users (React app loads normally)

import { DESTINATION_PHOTOS } from './_destinationPhotos.js'

export const config = {
  runtime: 'edge',
}

// Matches a real trip's free-text destination ("Goa", "North Goa Beaches",
// "Circuit: Shimla → Manali") against the same destination-photo database
// seo-destination.js uses for the trip-planner pages — that one only needs
// an exact key lookup because its slug IS the destination; a shared trip's
// destination is whatever the AI or the traveller wrote, so this checks for
// any known place name appearing inside it. For a circuit this picks
// whichever leg happens to match first — good enough for a preview image,
// which only needs to look like the right kind of place, not be exhaustive.
function findDestinationPhoto(destination) {
  if (!destination) return null
  const norm = destination.toLowerCase()
  const asSlug = norm.trim().replace(/\s+/g, '-')
  if (DESTINATION_PHOTOS[asSlug]) return DESTINATION_PHOTOS[asSlug]
  for (const key of Object.keys(DESTINATION_PHOTOS)) {
    if (norm.includes(key.replace(/-/g, ' '))) return DESTINATION_PHOTOS[key]
  }
  return null
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

// The backend now escapes og_title/og_desc/destination before embedding
// them in its own HTML (they used to go in raw). Regex-extracting them from
// that response means what we get back is already-escaped text — decoding
// it here keeps this whole function working on plain text exactly as
// before, so every existing escHtml() call below still runs exactly once
// instead of double-escaping ("&" -> "&amp;" -> "&amp;amp;").
function unescHtml(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
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
  let ogImage = 'https://tripzio.io/og-image.png'

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
      const destMatch  = html.match(/name="tripzio:destination-raw"\s+content="([^"]*)"/)
      if (titleMatch) ogTitle = unescHtml(titleMatch[1])
      if (descMatch)  ogDesc  = unescHtml(descMatch[1])
      const destination = destMatch ? unescHtml(destMatch[1]) : ''
      // Same DESTINATION_PHOTOS database seo-destination.js already uses
      // for its own og:image, the same way (a meta tag pointing at the
      // photo URL, no attribution rendered alongside it — there's no page
      // body here to put a credit line in, unlike that file's fully
      // rendered static page).
      const photo = findDestinationPhoto(destination)
      if (photo) ogImage = photo.photo
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
