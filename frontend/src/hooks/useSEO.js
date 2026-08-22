import { useEffect } from 'react'

const SITE = 'https://tripzio.io'

function upsertMeta(attr, key, content) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Sets this page's <title>, meta description, canonical, and OG/Twitter tags.
 * index.html ships one static set (homepage) for every route via Vercel's
 * catch-all rewrite — without this, every sitemapped route (e.g. /guest)
 * renders byte-identical meta tags to the homepage while a canonical tag
 * claims "treat me as the homepage" too. Google sometimes ignores that
 * canonical when the page's real content clearly differs and indexes it
 * separately anyway, but with generic/synthesized title text since nothing
 * on the page told it what this page actually is.
 *
 * path must start with "/" (or be "" for the homepage); canonical is always
 * derived from it, never passed separately, so it can't drift from the
 * route it's describing.
 */
export function useSEO({ title, description, path = '' }) {
  useEffect(() => {
    const canonical = `${SITE}${path}`
    document.title = title

    let link = document.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', canonical)

    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
  }, [title, description, path])
}
