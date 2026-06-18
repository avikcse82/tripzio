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
}
