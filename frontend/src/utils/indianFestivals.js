// frontend/src/data/indianFestivals.js
// Tripzio Module 4B — India Festival Calendar
// Static data — 80+ festivals with dates, locations, price impact, booking urgency

export const FESTIVALS = [
  // ── January ─────────────────────────────────────────────────
  {
    name: 'Makar Sankranti / Uttarayan',
    date: '2026-01-14',
    endDate: '2026-01-15',
    locations: ['Gujarat', 'Ahmedabad', 'Rajasthan', 'Jaipur', 'UP', 'Varanasi'],
    keywords: ['gujarat', 'ahmedabad', 'rajasthan', 'jaipur', 'varanasi', 'up', 'uttar pradesh'],
    type: 'festival',
    emoji: '🪁',
    description: 'Kite flying festival across India. Ahmedabad sky fills with millions of kites.',
    priceImpact: 'medium',
    priceWarning: 'Hotel prices 30-50% higher in Ahmedabad and Jaipur',
    urgency: 'Book hotels 3+ weeks in advance',
    tip: 'Book rooftop hotel in Ahmedabad for best kite-watching experience',
  },
  {
    name: 'Republic Day',
    date: '2026-01-26',
    endDate: '2026-01-26',
    locations: ['Delhi', 'New Delhi'],
    keywords: ['delhi', 'new delhi'],
    type: 'national',
    emoji: '🇮🇳',
    description: 'Grand parade on Kartavya Path. Book viewing passes months in advance.',
    priceImpact: 'high',
    priceWarning: 'Delhi hotels peak-priced. Book 2+ months ahead.',
    urgency: 'Parade passes sell out — apply via Defence Ministry website',
    tip: 'Stay near Connaught Place for best access to parade route',
  },
  {
    name: 'Jaipur Literature Festival',
    date: '2026-01-29',
    endDate: '2026-02-02',
    locations: ['Jaipur', 'Rajasthan'],
    keywords: ['jaipur', 'rajasthan'],
    type: 'cultural',
    emoji: '📚',
    description: "World's largest free literary festival at Diggi Palace, Jaipur.",
    priceImpact: 'high',
    priceWarning: 'Jaipur hotels sell out completely. Book 2 months ahead.',
    urgency: 'Critical — accommodation scarce during this period',
    tip: 'Festival entry is free but workshops are ticketed',
  },

  // ── February ─────────────────────────────────────────────────
  {
    name: 'Vasant Panchami',
    date: '2026-02-02',
    endDate: '2026-02-02',
    locations: ['Varanasi', 'Kolkata', 'West Bengal', 'UP', 'North India'],
    keywords: ['varanasi', 'kolkata', 'west bengal', 'north india'],
    type: 'festival',
    emoji: '🌼',
    description: 'Spring festival celebrating Goddess Saraswati. Yellow everywhere.',
    priceImpact: 'low',
    priceWarning: null,
    urgency: null,
    tip: 'Visit ghats in Varanasi for spectacular sunrise celebrations',
  },
  {
    name: 'Taj Mahotsav',
    date: '2026-02-18',
    endDate: '2026-02-27',
    locations: ['Agra', 'Uttar Pradesh'],
    keywords: ['agra', 'taj mahal', 'uttar pradesh'],
    type: 'cultural',
    emoji: '🕌',
    description: '10-day craft, culture and cuisine festival near the Taj Mahal.',
    priceImpact: 'medium',
    priceWarning: 'Agra hotels book fast during this period',
    urgency: 'Book 3 weeks ahead',
    tip: 'Best time to visit Agra — combine Taj visit with festival',
  },
  {
    name: 'Khajuraho Dance Festival',
    date: '2026-02-20',
    endDate: '2026-02-26',
    locations: ['Khajuraho', 'Madhya Pradesh'],
    keywords: ['khajuraho', 'madhya pradesh', 'mp'],
    type: 'cultural',
    emoji: '💃',
    description: 'Classical dance performances against the backdrop of Khajuraho temples.',
    priceImpact: 'high',
    priceWarning: 'Very limited accommodation in Khajuraho — book immediately',
    urgency: 'Critical — small town, hotels fill up fast',
    tip: 'Evening performances under stars are magical',
  },

  // ── March ─────────────────────────────────────────────────
  {
    name: 'Holi',
    date: '2026-03-03',
    endDate: '2026-03-04',
    locations: ['Mathura', 'Vrindavan', 'Barsana', 'Jaipur', 'Delhi', 'North India'],
    keywords: ['mathura', 'vrindavan', 'barsana', 'jaipur', 'delhi', 'north india', 'rajasthan', 'up', 'uttar pradesh'],
    type: 'festival',
    emoji: '🎨',
    description: 'Festival of colours. Mathura-Vrindavan celebrations are world-famous.',
    priceImpact: 'very_high',
    priceWarning: '⚠️ Prices TRIPLE in Mathura, Vrindavan, Jaipur. Book NOW.',
    urgency: 'URGENT — most popular festival. Book 6+ weeks ahead.',
    tip: 'Lathmar Holi in Barsana (one week before main Holi) is even more spectacular',
  },
  {
    name: 'Elephant Festival',
    date: '2026-03-03',
    endDate: '2026-03-03',
    locations: ['Jaipur', 'Rajasthan'],
    keywords: ['jaipur', 'rajasthan'],
    type: 'festival',
    emoji: '🐘',
    description: 'Decorated elephants parade through Jaipur on Holi day.',
    priceImpact: 'very_high',
    priceWarning: 'Coincides with Holi — Jaipur completely sold out',
    urgency: 'Book 2+ months ahead',
    tip: 'Buy elephant rides in advance — they sell out fast',
  },
  {
    name: 'Shigmo Festival',
    date: '2026-03-10',
    endDate: '2026-03-25',
    locations: ['Goa', 'Panaji'],
    keywords: ['goa', 'panaji'],
    type: 'festival',
    emoji: '🥁',
    description: "Goa's Spring festival with colourful floats and traditional dances.",
    priceImpact: 'medium',
    priceWarning: 'Goa prices elevated — still lower than peak season',
    urgency: 'Book 2 weeks ahead',
    tip: 'Panaji has the best Shigmo parade',
  },

  // ── April ────────────────────────────────────────────────────
  {
    name: 'Baisakhi',
    date: '2026-04-13',
    endDate: '2026-04-14',
    locations: ['Amritsar', 'Punjab', 'Chandigarh', 'Himachal Pradesh'],
    keywords: ['amritsar', 'punjab', 'chandigarh', 'himachal', 'golden temple'],
    type: 'festival',
    emoji: '🌾',
    description: 'Harvest festival of Punjab. Golden Temple celebrations are spectacular.',
    priceImpact: 'high',
    priceWarning: 'Amritsar hotels fill up fast on Baisakhi weekend',
    urgency: 'Book 3+ weeks ahead',
    tip: 'Visit Golden Temple at dawn — most peaceful and beautiful',
  },
  {
    name: 'Bihu Festival',
    date: '2026-04-14',
    endDate: '2026-04-16',
    locations: ['Assam', 'Guwahati', 'Northeast India'],
    keywords: ['assam', 'guwahati', 'northeast', 'north east india'],
    type: 'festival',
    emoji: '🌿',
    description: "Assam's harvest festival with traditional Bihu dance and music.",
    priceImpact: 'medium',
    priceWarning: 'Guwahati hotels moderately busy',
    urgency: 'Book 2 weeks ahead',
    tip: 'Try traditional Bihu food and witness authentic dance performances',
  },
  {
    name: 'Ram Navami',
    date: '2026-04-17',
    endDate: '2026-04-17',
    locations: ['Ayodhya', 'Varanasi', 'UP', 'North India'],
    keywords: ['ayodhya', 'varanasi', 'up', 'uttar pradesh'],
    type: 'religious',
    emoji: '🪔',
    description: 'Birth anniversary of Lord Ram. Massive celebrations in Ayodhya.',
    priceImpact: 'very_high',
    priceWarning: '⚠️ Ayodhya completely sold out — book months ahead',
    urgency: 'URGENT — new Ram Mandir draws millions of pilgrims',
    tip: 'Stay in Lucknow and day-trip to Ayodhya to avoid accommodation issues',
  },

  // ── May ──────────────────────────────────────────────────────
  {
    name: 'Buddha Purnima',
    date: '2026-05-12',
    endDate: '2026-05-12',
    locations: ['Bodh Gaya', 'Bihar', 'Sarnath', 'Varanasi', 'Ladakh', 'Sikkim'],
    keywords: ['bodh gaya', 'bihar', 'sarnath', 'varanasi', 'ladakh', 'sikkim'],
    type: 'religious',
    emoji: '☸️',
    description: "Buddha's birthday. Bodh Gaya and Sarnath host massive prayer gatherings.",
    priceImpact: 'medium',
    priceWarning: 'Bodh Gaya hotels fill up — book 3 weeks ahead',
    urgency: 'Book 3 weeks ahead',
    tip: 'Sunrise prayer at Bodh Gaya Mahabodhi Temple is deeply moving',
  },

  // ── June ─────────────────────────────────────────────────────
  {
    name: 'Rath Yatra Puri',
    date: '2026-06-27',
    endDate: '2026-06-27',
    locations: ['Puri', 'Odisha'],
    keywords: ['puri', 'odisha', 'jagannath'],
    type: 'festival',
    emoji: '🛕',
    description: 'Massive chariot festival. One of the largest Hindu pilgrimages in the world.',
    priceImpact: 'very_high',
    priceWarning: '⚠️ Puri hotels booked months in advance. Millions attend.',
    urgency: 'URGENT — book 3+ months ahead',
    tip: 'Stay in Bhubaneswar and take a day trip to Puri',
  },

  // ── August ───────────────────────────────────────────────────
  {
    name: 'Independence Day',
    date: '2026-08-15',
    endDate: '2026-08-15',
    locations: ['Delhi', 'New Delhi'],
    keywords: ['delhi', 'new delhi', 'red fort'],
    type: 'national',
    emoji: '🇮🇳',
    description: 'Flag hoisting at Red Fort by PM. Patriotic celebrations across India.',
    priceImpact: 'medium',
    priceWarning: 'Delhi busy — prices up 20-30%',
    urgency: 'Book 2 weeks ahead',
    tip: 'Connaught Place and India Gate area are best for celebrations',
  },
  {
    name: 'Janmashtami',
    date: '2026-08-23',
    endDate: '2026-08-24',
    locations: ['Mathura', 'Vrindavan', 'UP', 'Mumbai', 'Pune'],
    keywords: ['mathura', 'vrindavan', 'mumbai', 'pune', 'krishna'],
    type: 'festival',
    emoji: '🥛',
    description: "Krishna's birthday. Mathura-Vrindavan decorated beautifully. Mumbai's Dahi Handi is a spectacle.",
    priceImpact: 'high',
    priceWarning: 'Mathura-Vrindavan prices surge. Mumbai Dahi Handi areas busy.',
    urgency: 'Book 4 weeks ahead for Mathura',
    tip: 'Midnight celebrations at ISKCON temples are spectacular',
  },
  {
    name: 'Onam',
    date: '2026-08-26',
    endDate: '2026-09-04',
    locations: ['Kerala', 'Thiruvananthapuram', 'Kochi', 'Thrissur', 'Alleppey'],
    keywords: ['kerala', 'thiruvananthapuram', 'kochi', 'thrissur', 'alleppey', 'alappuzha'],
    type: 'festival',
    emoji: '🌸',
    description: "Kerala's biggest harvest festival. Pookalam flower carpets, Vallamkali boat races.",
    priceImpact: 'very_high',
    priceWarning: '⚠️ Kerala completely packed. Houseboat prices double.',
    urgency: 'URGENT — book houseboats 2+ months ahead',
    tip: 'Nehru Trophy Boat Race (Punnamada Lake) is the highlight — book stands in advance',
  },

  // ── September ─────────────────────────────────────────────
  {
    name: 'Ganesh Chaturthi',
    date: '2026-09-10',
    endDate: '2026-09-20',
    locations: ['Mumbai', 'Pune', 'Maharashtra', 'Hyderabad'],
    keywords: ['mumbai', 'pune', 'maharashtra', 'hyderabad', 'goa'],
    type: 'festival',
    emoji: '🐘',
    description: '11-day Ganesh festival. Mumbai is the epicentre — Lalbaugcha Raja draws millions.',
    priceImpact: 'very_high',
    priceWarning: '⚠️ Mumbai hotels at PEAK prices. Book immediately.',
    urgency: 'URGENT — one of India\'s biggest festivals',
    tip: 'Ganesh visarjan (last day immersion) procession is unforgettable — watch from a rooftop',
  },
  {
    name: 'Hemis Festival',
    date: '2026-09-01',
    endDate: '2026-09-03',
    locations: ['Ladakh', 'Leh', 'Hemis'],
    keywords: ['ladakh', 'leh', 'hemis', 'jammu kashmir'],
    type: 'cultural',
    emoji: '🎭',
    description: 'Largest Buddhist festival in Ladakh with masked dances at Hemis Monastery.',
    priceImpact: 'high',
    priceWarning: 'Leh guesthouses fill up fast — book 4 weeks ahead',
    urgency: 'Book early — Ladakh accommodation is limited',
    tip: 'Combine with Pangong Lake and Nubra Valley for a complete Ladakh experience',
  },

  // ── October ──────────────────────────────────────────────────
  {
    name: 'Navratri & Garba',
    date: '2026-10-09',
    endDate: '2026-10-18',
    locations: ['Gujarat', 'Ahmedabad', 'Vadodara', 'Rajasthan', 'Delhi'],
    keywords: ['gujarat', 'ahmedabad', 'vadodara', 'rajasthan', 'navratri'],
    type: 'festival',
    emoji: '💃',
    description: 'Nine nights of Garba dance. Gujarat celebrates like nowhere else in the world.',
    priceImpact: 'very_high',
    priceWarning: '⚠️ Gujarat hotels completely booked. Book 2 months ahead.',
    urgency: 'URGENT — most popular time to visit Gujarat',
    tip: 'Ahmedabad and Vadodara have the best Garba venues — get passes in advance',
  },
  {
    name: 'Dussehra',
    date: '2026-10-19',
    endDate: '2026-10-19',
    locations: ['Mysore', 'Delhi', 'Kullu', 'Varanasi', 'North India'],
    keywords: ['mysore', 'delhi', 'kullu', 'varanasi', 'north india'],
    type: 'festival',
    emoji: '🏹',
    description: 'Victory of good over evil. Mysore Dasara is UNESCO-listed. Kullu Dussehra is unique.',
    priceImpact: 'very_high',
    priceWarning: '⚠️ Mysore prices 3x normal. Book 6+ weeks ahead.',
    urgency: 'URGENT for Mysore — one of India\'s top festivals',
    tip: 'Mysore Palace is illuminated with 100,000 lights — book a view room',
  },
  {
    name: 'Pushkar Camel Fair',
    date: '2026-11-01',
    endDate: '2026-11-09',
    locations: ['Pushkar', 'Rajasthan', 'Ajmer'],
    keywords: ['pushkar', 'rajasthan', 'ajmer'],
    type: 'festival',
    emoji: '🐪',
    description: "World's largest camel fair. Unique spectacle of 50,000+ camels and tribal culture.",
    priceImpact: 'very_high',
    priceWarning: '⚠️ Pushkar prices QUADRUPLE. Tent camps sell out months ahead.',
    urgency: 'URGENT — book luxury tent camps 3+ months in advance',
    tip: 'Luxury tent camps give the authentic desert experience — worth the splurge',
  },

  // ── November ─────────────────────────────────────────────────
  {
    name: 'Diwali',
    date: '2026-11-07',
    endDate: '2026-11-11',
    locations: ['Varanasi', 'Jaipur', 'Udaipur', 'Delhi', 'Mumbai', 'North India'],
    keywords: ['varanasi', 'jaipur', 'udaipur', 'delhi', 'mumbai', 'north india', 'rajasthan', 'up', 'uttar pradesh', 'kolkata'],
    type: 'festival',
    emoji: '🪔',
    description: 'Festival of lights. Varanasi ghats and Udaipur lake are magical.',
    priceImpact: 'very_high',
    priceWarning: '⚠️ Prices surge EVERYWHERE. Hotels booked months ahead.',
    urgency: 'URGENT — book 2-3 months ahead nationwide',
    tip: 'Varanasi Diwali on ghats + Udaipur palace reflections = two unmissable experiences',
  },
  {
    name: 'Rann Utsav',
    date: '2026-11-01',
    endDate: '2027-02-28',
    locations: ['Kutch', 'Rann of Kutch', 'Gujarat'],
    keywords: ['kutch', 'rann', 'gujarat', 'bhuj'],
    type: 'cultural',
    emoji: '🌕',
    description: 'White desert festival under full moon. Salt desert transforms into festival ground.',
    priceImpact: 'high',
    priceWarning: 'Tent city accommodation books up fast for full moon nights',
    urgency: 'Book tent city accommodation 4+ weeks ahead for full moon dates',
    tip: 'Full moon nights are magical — plan your stay to coincide with Purnima',
  },
  {
    name: 'Sunburn Festival',
    date: '2026-12-27',
    endDate: '2026-12-30',
    locations: ['Goa', 'Pune'],
    keywords: ['goa', 'pune'],
    type: 'music',
    emoji: '🎵',
    description: "Asia's biggest electronic music festival in Goa.",
    priceImpact: 'very_high',
    priceWarning: '⚠️ Goa prices already peak in December — surge further for Sunburn',
    urgency: 'Book 2+ months ahead',
    tip: 'Stay near Vagator or Anjuna for best festival access',
  },

  // ── December ─────────────────────────────────────────────────
  {
    name: 'Christmas in Goa',
    date: '2026-12-24',
    endDate: '2026-12-26',
    locations: ['Goa', 'Kerala', 'Pondicherry', 'Mumbai'],
    keywords: ['goa', 'kerala', 'pondicherry', 'mumbai', 'puducherry'],
    type: 'festival',
    emoji: '🎄',
    description: "Goa's Christmas is legendary — beach parties, midnight mass at basilicas.",
    priceImpact: 'very_high',
    priceWarning: '⚠️ PEAK SEASON. Goa prices 4-5x normal. Book months ahead.',
    urgency: 'URGENT — peak of peak season',
    tip: 'Old Goa churches have beautiful midnight mass — attend Basilica of Bom Jesus',
  },
  {
    name: 'New Year in Goa',
    date: '2026-12-31',
    endDate: '2027-01-01',
    locations: ['Goa', 'Mumbai', 'Delhi', 'Bangalore'],
    keywords: ['goa', 'mumbai', 'delhi', 'bangalore', 'bengaluru'],
    type: 'festival',
    emoji: '🎆',
    description: "India's biggest New Year celebration — Goa beaches are legendary.",
    priceImpact: 'very_high',
    priceWarning: '⚠️ MOST EXPENSIVE night of the year. Book 3+ months ahead.',
    urgency: 'URGENT — highest demand night in Goa',
    tip: 'Beach shacks have special New Year dinner packages — book early',
  },

  // ── Long Weekends 2026 (approx) ──────────────────────────────
  {
    name: 'Long Weekend Alert',
    date: '2026-03-27',
    endDate: '2026-03-29',
    locations: ['All India'],
    keywords: ['all', 'india', 'goa', 'manali', 'ooty', 'darjeeling', 'shimla', 'coorg'],
    type: 'long_weekend',
    emoji: '📅',
    description: 'Holi + Weekend = 4-day long weekend. Hill stations and Goa surge.',
    priceImpact: 'high',
    priceWarning: 'Popular destinations 40-60% pricier this weekend',
    urgency: 'Book 3 weeks ahead',
    tip: 'Consider offbeat destinations to avoid crowds and high prices',
  },
]

// ── Helper: Get festivals for a destination and date range ──────
export function getFestivalsForTrip(destination, startDate, days) {
  if (!destination || !startDate) return []

  const dest = destination.toLowerCase()
  const start = new Date(startDate)
  const end = new Date(startDate)
  end.setDate(end.getDate() + (days || 7))

  return FESTIVALS.filter(f => {
    // Check location match
    const locationMatch = f.keywords.some(k =>
      dest.includes(k) || k === 'all'
    ) || f.locations.some(l =>
      dest.toLowerCase().includes(l.toLowerCase())
    )
    if (!locationMatch) return false

    // Check date overlap
    const fStart = new Date(f.date)
    const fEnd = new Date(f.endDate || f.date)
    fEnd.setDate(fEnd.getDate() + 1)

    return fStart <= end && fEnd >= start
  })
}

// ── Helper: Get urgency color ────────────────────────────────────
export function getUrgencyStyle(priceImpact) {
  switch (priceImpact) {
    case 'very_high': return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', badge: '#ef4444', label: 'BOOK NOW' }
    case 'high':      return { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#f59e0b', label: 'BOOK SOON' }
    case 'medium':    return { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#22c55e', label: 'PLAN AHEAD' }
    default:          return { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', badge: '#3b82f6', label: 'FYI' }
  }
}
