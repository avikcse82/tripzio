/**
 * frontend/src/utils/affiliateLinks.js
 * Shared affiliate/tracked-link builders — used by both ItineraryResult.jsx
 * (live web result page) and generateItineraryHTML.js (downloadable PDF),
 * so every provider's URL format only has one source of truth.
 */

// CJ Affiliate — Booking.com APAC (advertiser 7854081), Tripzio publisher/site ID 101855193.
// The Evergreen Link (17293139) is CJ's only deep-link-enabled creative for this program —
// wrapping any booking.com URL in ?url= routes the click through CJ so it gets a real
// cjevent ID and is commissioned. Never link to booking.com directly, or the click won't track.
const CJ_BOOKING_CLICK_URL = 'https://www.jdoqocy.com/click-101855193-17293139'
export function withBookingAffiliateTracking(bookingUrl) {
  return `${CJ_BOOKING_CLICK_URL}?url=${encodeURIComponent(bookingUrl)}`
}

// Agoda Partners — Tripzio site ID (cid) 1970466, approved 2026-08-16.
// Only a city-level deep link is confirmed working (agoda.com/city/{slug}-in.html?cid=...),
// verified live with real Agoda session cookies set. No confirmed way to deep-link a specific
// hotel by name, so this links to the destination city's listings, not one exact property.
// Slug is usually just the lowercased city name, but Agoda doesn't always match the plain
// name exactly (e.g. Delhi's real slug is "new-delhi-and-ncr", not "new-delhi") — verified
// against Agoda's own homepage city links, not guessed, so only known exceptions go here.
const AGODA_CID = '1970466'
const AGODA_CITY_SLUG_OVERRIDES = {
  'new delhi': 'new-delhi-and-ncr',
  'delhi': 'new-delhi-and-ncr',
}
export function agodaCitySearchUrl(cityName) {
  const normalized = (cityName || '').toLowerCase().trim()
  const slug = AGODA_CITY_SLUG_OVERRIDES[normalized]
    || normalized.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `https://www.agoda.com/city/${slug}-in.html?cid=${AGODA_CID}`
}

// INRDeals — Tripzio's publisher ID, shared across every INRDeals-routed provider below
// (Goibibo/MakeMyTrip via campaign=hotel, Air India/IndiGo via campaign=cps). Each provider
// routes through a different underlying ad network behind the scenes (Vcommission for
// Goibibo, icubeswire for MakeMyTrip, CJ Affiliate for Air India/IndiGo — confirmed live via
// each one's own attribution cookie/params), but the wrapper URL shape is identical.
const INRDEALS_ID = 'avi679039442'
export function inrDealsTrackedUrl(targetUrl, campaign) {
  return `https://inr.deals/track?id=${INRDEALS_ID}&src=merchant-detail-backend&campaign=${campaign}&url=${encodeURIComponent(targetUrl)}`
}

// Goibibo via INRDeals — tested live: the `url=` param is NOT respected as a deep-link
// target (tried a city-specific goibibo.com/hotels/hotels-in-goa-ct/ URL, it silently
// redirected to the generic /hotels/ homepage regardless), so unlike Booking.com/Agoda
// this can only be a flat "Book on Goibibo" link, not city- or hotel-specific.
export const GOIBIBO_TRACKED_URL = inrDealsTrackedUrl('https://www.goibibo.com/hotels/', 'hotel')

// MakeMyTrip via INRDeals (same account/id, different underlying network — routes through
// icubeswire, not Vcommission like Goibibo). Unlike Goibibo, this ONE does respect the `url=`
// deep-link param — verified live, landed correctly on city-specific pages with tracking intact
// (confirmed via MakeMyTrip's own `referrer` cookie recording the icubeswire attribution chain).
// Real page is only "budget-hotels-in-{city}.html" — the plain "hotels-in-{city}.html" 404s/
// redirects to the homepage, verified directly, not guessed.
// Delhi's slug is "delhi" here — different from Agoda's "new-delhi-and-ncr" exception,
// verified separately for this provider, not assumed to match Agoda's override.
const MMT_CITY_SLUG_OVERRIDES = {
  'new delhi': 'delhi',
}
export function makeMyTripCitySearchUrl(cityName) {
  const normalized = (cityName || '').toLowerCase().trim()
  const slug = MMT_CITY_SLUG_OVERRIDES[normalized]
    || normalized.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const target = `https://www.makemytrip.com/hotels/budget-hotels-in-${slug}.html`
  return inrDealsTrackedUrl(target, 'hotel')
}

// Air India + IndiGo via INRDeals — both route through CJ Affiliate underneath (confirmed
// live via a real cjevent param + utm_source=Commission+Junction on the Air India redirect).
// Only tested with each airline's generic booking/home page, not a specific route — deep-
// linking to a from/to search wasn't verified, so these stay flat "Book on X" links for now.
export const AIRINDIA_TRACKED_URL = inrDealsTrackedUrl('https://www.airindia.com/en-in/book-flights/', 'cps')
export const INDIGO_TRACKED_URL = inrDealsTrackedUrl('https://www.goindigo.in/', 'cps')

// RedBus — no working affiliate link yet (real Cuelinks campaign exists but is blocked
// behind a still-pending publisher channel review), so this is a direct, unmonetized
// convenience link, same pattern as the IRCTC link elsewhere. Route-specific SEO page format
// verified live: redbus.in/bus-tickets/{from}-to-{to}.
export function slugifyCityName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
export function redBusRouteUrl(fromCity, toCity) {
  return `https://www.redbus.in/bus-tickets/${slugifyCityName(fromCity)}-to-${slugifyCityName(toCity)}`
}

// No real cab affiliate program exists anywhere we could find (Savaari/Ola/Uber/Rapido all
// checked, all dead ends or new-user-only bounties) — plain Google Maps search, same
// fail-open pattern already used for hotels with no data.
export function cabSearchUrl(fromCity, toCity) {
  return `https://www.google.com/maps/search/${encodeURIComponent(`cabs taxi ${fromCity} to ${toCity}`)}`
}
