// src/utils/analytics.js
// Tripzio GA4 Event Tracking

export const trackEvent = (eventName, params = {}) => {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}

// Key events to track
export const Analytics = {

  // User generates an itinerary
  itineraryGenerated: (destination, days, budget, planTier) => {
    trackEvent('itinerary_generated', {
      destination,
      days,
      budget,
      plan_tier: planTier,
    })
  },

  // User shares on WhatsApp
  whatsappShared: (destination, isAgent = false) => {
    trackEvent('whatsapp_shared', {
      destination,
      share_type: isAgent ? 'agent' : 'user',
    })
  },

  // User saves trip
  tripSaved: (destination, days) => {
    trackEvent('trip_saved', { destination, days })
  },

  // User views hotels tab
  hotelsViewed: (destination) => {
    trackEvent('hotels_viewed', { destination })
  },

  // User clicks upgrade
  upgradeClicked: (fromTier, toPlan) => {
    trackEvent('upgrade_clicked', { from_tier: fromTier, to_plan: toPlan })
  },

  // Agent registers
  agentRegistered: () => {
    trackEvent('agent_registered')
  },

  // PDF downloaded
  pdfDownloaded: (destination) => {
    trackEvent('pdf_downloaded', { destination })
  },

  // User clicks an affiliate booking link (Booking.com, Agoda, Goibibo, MakeMyTrip, etc.)
  affiliateLinkClicked: (provider, destination) => {
    trackEvent('affiliate_link_clicked', { provider, destination })
  },

  // User clicks a transport link (bus/cab/flight) — separate from affiliateLinkClicked
  // since some of these (RedBus, Google Maps cab search) aren't monetized, unlike the
  // flight ones (Air India/IndiGo), so lumping them under "affiliate" would be misleading.
  transportLinkClicked: (mode, provider, destination) => {
    trackEvent('transport_link_clicked', { mode, provider, destination })
  },

  // User picks a trip vibe before letting the AI choose a destination.
  // Deliberately records the ORIGIN CITY and MONTH alongside the choice:
  // on its own "someone wanted beaches" is trivia, but "beach demand from
  // Kolkata peaks in November" is the demand signal the tourism-partnership
  // pitch describes, and it costs nothing to collect here.
  // `vibe` is null when the user leaves it on "Surprise me", which is worth
  // recording too — how often people express no preference is the baseline
  // everything else is measured against.
  destinationVibeSelected: (vibe, fromCity, startDate) => {
    trackEvent('destination_vibe_selected', {
      vibe: vibe || 'none',
      from_city: (fromCity || '').trim().toLowerCase() || 'unknown',
      travel_month: startDate
        ? new Date(startDate).toLocaleString('en-IN', { month: 'short' })
        : 'unspecified',
    })
  },
}
