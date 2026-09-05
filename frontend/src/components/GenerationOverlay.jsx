// src/components/GenerationOverlay.jsx
// Full-screen immersive generation experience
// Facts + bg image fetched dynamically from /seo/page/{slug}
// Zero hardcoding — works for ANY Indian destination

import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../api'
import { DESTINATION_PHOTOS } from '../../api/_destinationPhotos.js'

// Representative destinations per vibe, used only when the AI is still
// choosing and there is no destination to show yet. Picking beaches should
// still *look* like beaches while it thinks.
const VIBE_FALLBACK_CITIES = {
  'Beach':        ['goa', 'varkala', 'kovalam'],
  'Hill Station': ['manali', 'darjeeling', 'munnar'],
  'Heritage':     ['jaipur', 'hampi', 'khajuraho'],
  'Nature':       ['kerala-backwaters', 'valley-of-flowers', 'kaziranga'],
  'Adventure':    ['leh-ladakh', 'rishikesh', 'bir-billing'],
}
const GENERIC_CITIES = ['jaipur', 'kerala-backwaters', 'leh-ladakh', 'goa']

// Serve a 500px thumbnail, never the full-size original: this screen is up
// for a couple of minutes and may cycle four images, so originals are a real
// mobile-data cost for something that sits behind a blur and a scrim anyway.
// Two URL shapes live in DESTINATION_PHOTOS — ~95 are already /thumb/ URLs
// ending in /1280px-<file>, the other ~20 are unscaled originals (some of
// them several MB). Wikimedia derives a thumb of any raster original from its
// path, so both shapes collapse to the same 500px request. Every entry is a
// jpg/JPG/png, which is what makes this safe: SVG and PDF thumbs need an
// extra format suffix that this transform does not add.
function thumb500(url) {
  if (!url) return null
  if (url.includes('/1280px-')) return url.replace('/1280px-', '/500px-')
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/?]+)(\?.*)?$/)
  return m ? `${m[1]}/thumb/${m[2]}/${m[3]}/500px-${m[3]}${m[4] || ''}` : url
}

// Longest keys first so a fragment containing several known place names
// resolves to the most specific one, and so match order does not depend on
// the object's insertion order. Without this, the custom-mode fragment
// "Udaipur 6 days from Delhi budget 40000" could resolve to whichever of
// "udaipur"/"delhi" happened to be declared first.
const PHOTO_KEYS = Object.keys(DESTINATION_PHOTOS).sort((a, b) => b.length - a.length)

const titleCase = (slug) =>
  slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

// Resolve one destination fragment to a real place we have a photo of.
// Returns the CANONICAL name rather than the caller's text, because in custom
// mode the fragment is a slice of the user's raw prompt and putting that on
// screen is what produced captions like "📍 Udaipur 6 days from Delhi".
function resolveCity(fragment) {
  const key = String(fragment || '').toLowerCase().trim().replace(/\s+/g, '-')
  if (!key) return null
  const match = DESTINATION_PHOTOS[key] ? key : PHOTO_KEYS.find(k => key.includes(k))
  if (!match) return null
  return { key: match, name: titleCase(match), photo: thumb500(DESTINATION_PHOTOS[match].photo) }
}

// Pull the individual cities out of a destination string. Circuits arrive as
// "Jaipur → Jodhpur → Udaipur" (and sometimes with & or commas), so each leg
// gets its own photo and the wait doubles as a preview of the route.
// De-duplicated by resolved city: a prompt that names one place twice, or two
// fragments that collapse to the same key, should not repeat a slide.
function slidesFor(destination) {
  const seen = new Set()
  return String(destination || '')
    .split(/→|&|,| and /i)
    .map(s => resolveCity(s.replace(/\b(circuit|trip|tour|days?)\b/gi, '')))
    .filter(c => c && !seen.has(c.key) && seen.add(c.key))
    .slice(0, 4)
}

// ── Generic fallback facts (shown while destination facts load) ───────────
const INDIA_FACTS = [
  'India has 40 UNESCO World Heritage Sites',
  'India\'s railway network is the 4th largest in the world',
  'India has 6 major seasons including monsoon and spring',
  'Over 19,500 languages are spoken across India',
  'India has 28 states and 8 Union Territories',
  'The Himalayas have 10 of the world\'s 14 highest peaks',
  'India is the birthplace of yoga, chess and zero',
]

// ── Extract clean destination for Unsplash image search ──────────────────
function extractSlug(destination) {
  if (!destination) return null
  // Remove noise words to get clean destination name
  const clean = destination
    .replace(/\d+\s*(days?|din|nights?|raat)/gi, '')
    .replace(/\b(from|se|ki|ka|ke|budget|hajar|lakh|solo|couple|family|group|trip|tour|yaatra|yatra|circuit|mein|me|starting|in|during|for)\b/gi, '')
    .replace(/[₹\d,]+/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 1)  // take first meaningful word only for image search
    .join('-')
    .toLowerCase()
  return clean || null
}

// ── Extract facts from seo/page response ─────────────────────────────────
function extractFacts(pageData) {
  const facts = []

  // From FAQs — use answer sentences
  if (pageData.faqs?.length) {
    pageData.faqs.slice(0, 3).forEach(faq => {
      if (faq.a) {
        // Take first sentence of answer
        const sentence = faq.a.split('.')[0].trim()
        if (sentence.length > 20 && sentence.length < 120) {
          facts.push(sentence + '.')
        }
      }
    })
  }

  // From quick_facts
  if (pageData.quick_facts?.length) {
    pageData.quick_facts.slice(0, 2).forEach(qf => {
      if (qf.value && qf.label) {
        facts.push(`${pageData.destination_name}: ${qf.value} ${qf.label}`)
      }
    })
  }

  // From hero_subtitle
  if (pageData.hero_subtitle) {
    facts.push(pageData.hero_subtitle)
  }

  return facts.length >= 3 ? facts : null
}

// ── Build destination-aware steps ────────────────────────────────────────
function buildSteps(destination, fromCity, tripType, days, isAgent, clientName) {
  const dest = destination?.trim()
  const from = fromCity?.trim() || 'your city'
  const who = isAgent && clientName ? `${clientName}'s` : 'your'
  const tripDesc = tripType ? `${tripType} ` : ''
  const nights = days ? `${days}-day ` : ''

  // Quick mode has no destination yet — the AI is still choosing one. Slotting
  // a "your destination" placeholder into the same templates collided with the
  // possessive and produced "Crafting your perfect your destination itinerary",
  // so that case gets its own phrasing rather than a filler word.
  if (!dest) {
    return [
      `🔍 Understanding ${who} ${tripDesc}trip...`,
      `🚆 Working out the best way out of ${from}...`,
      `🏨 Matching hotels to your budget...`,
      `📍 Discovering experiences worth the trip...`,
      `🎪 Checking festivals & season for your dates...`,
      `💰 Calculating ${nights}budget breakdown...`,
      `✨ Crafting ${who} perfect itinerary...`,
    ]
  }

  return [
    `🔍 Understanding ${who} ${tripDesc}trip to ${dest}...`,
    `🚆 Finding best trains from ${from} to ${dest}...`,
    `🏨 Searching hotels in ${dest} for your budget...`,
    `📍 Discovering ${dest}'s best experiences...`,
    `🎪 Checking festivals & season near ${dest}...`,
    `💰 Calculating ${nights}budget breakdown...`,
    `✨ Crafting ${who} perfect ${dest} itinerary...`,
  ]
}

// ── Main Component ────────────────────────────────────────────────────────
export default function GenerationOverlay({
  generating,
  genStep,
  destination,
  fromCity,
  tripType,
  days,
  isAgent = false,
  clientName = '',
  vibe = null,
}) {
  const [facts, setFacts]         = useState(INDIA_FACTS)
  const [slideIdx, setSlideIdx]   = useState(0)
  const [loaded, setLoaded]       = useState({})
  const [factIdx, setFactIdx]     = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping]   = useState(true)
  const typingRef = useRef(null)
  const factRef   = useRef(null)
  const fetchedRef = useRef(null) // track last fetched slug

  // What to show behind the progress. Order of preference: the actual cities
  // of this trip (a circuit becomes a slideshow of its own route), then the
  // chosen vibe while the AI is still picking, then a generic India set.
  const named = slidesFor(destination)
  const slides = named.length
    ? named
    // Nothing recognisable yet (Quick mode, where the AI is still choosing).
    // Show the chosen vibe, unlabelled — these are stand-ins, so captioning
    // them would promise destinations the plan may not contain.
    : (VIBE_FALLBACK_CITIES[vibe] || GENERIC_CITIES)
        .map(c => resolveCity(c))
        .filter(Boolean)
        .map(c => ({ ...c, name: null }))

  // Custom mode hands us the user's raw prompt as the "destination", so the
  // headline and every step line read "...Jaipur → Jodhpur → Udaipur 6 days
  // from Delhi budget 40000". The cities resolved for the backdrop are a much
  // better label, so reuse them when we have them.
  const prettyDestination = named.length
    ? named.map(s => s.name).join(' → ')
    : (destination || '').trim()

  const steps = buildSteps(prettyDestination, fromCity, tripType, days, isAgent, clientName)
  const progress = Math.round(((genStep + 1) / steps.length) * 100)
  // Built as a whole sentence rather than "Planning your {destination}": with
  // no destination that template rendered "Planning your your trip", which is
  // what showed on every Quick-mode generation, i.e. the common case.
  const headline = prettyDestination
    ? `Planning your ${prettyDestination} trip`
    : (isAgent ? "Planning your client's trip" : 'Planning your trip')

  // ── Fetch destination facts + bg from /seo/page ───────────────────────
  useEffect(() => {
    if (!generating || !destination) return
    const slug = extractSlug(destination)
    if (!slug || slug === fetchedRef.current) return
    fetchedRef.current = slug

    // Fetch page data from seo/page endpoint
    fetch(`${API_URL}/seo/page/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(response => {
        if (!response?.data) return
        const extracted = extractFacts(response.data)
        if (extracted && extracted.length >= 3) {
          setFacts(extracted)
          setFactIdx(0)
        }
      })
      .catch(() => {}) // fail open — use India facts
  }, [generating, destination])

  // ── Reset on new generation ───────────────────────────────────────────
  useEffect(() => {
    if (generating) {
      setFacts(INDIA_FACTS)
      setFactIdx(0)
      setSlideIdx(0)
      fetchedRef.current = null
    }
  }, [generating])

  // ── Cross-fade through the trip's cities ──────────────────────────────
  useEffect(() => {
    if (!generating || slides.length < 2) return
    const t = setInterval(() => setSlideIdx(i => (i + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [generating, slides.length])

  // ── Typing animation for current step ─────────────────────────────────
  useEffect(() => {
    if (!generating) return
    const target = steps[Math.min(genStep, steps.length - 1)]
    setTypedText('')
    setIsTyping(true)
    let i = 0
    if (typingRef.current) clearInterval(typingRef.current)
    typingRef.current = setInterval(() => {
      i++
      setTypedText(target.slice(0, i))
      if (i >= target.length) {
        clearInterval(typingRef.current)
        setIsTyping(false)
      }
    }, 28)
    return () => clearInterval(typingRef.current)
  }, [genStep, generating])

  // ── Rotate fun facts every 4 seconds ──────────────────────────────────
  useEffect(() => {
    if (!generating) return
    factRef.current = setInterval(() => {
      setFactIdx(i => (i + 1) % facts.length)
    }, 4000)
    return () => clearInterval(factRef.current)
  }, [generating, facts])

  if (!generating) return null

  const activeSlide = slides[slideIdx] || null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Destination backdrop. Real photographs of the places being planned,
          cross-fading through a circuit's cities in trip order. Each frame
          fades in only once it has actually decoded, so a slow connection
          degrades to the gradient instead of flashing a broken image — which
          is what used to happen: the old source.unsplash.com endpoint was
          retired and returns 503, and because a dead URL isn't null the
          `bgImage || fallback` never fired. Hence the blank, dull screen. */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#e8eef0' }}>
        {slides.map((s, i) => (
          <img
            key={s.photo}
            src={s.photo}
            alt=""
            // Keyed by URL, not by index: if the destination changes mid-run
            // the slide list is rebuilt, and an index-keyed flag would mark a
            // brand-new image as already decoded and flash it in blank.
            onLoad={() => setLoaded(p => (p[s.photo] ? p : { ...p, [s.photo]: true }))}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: i === slideIdx && loaded[s.photo] ? 1 : 0,
              transition: 'opacity 1.2s ease',
              // Slow drift so the screen feels alive rather than frozen for
              // the couple of minutes a generation takes.
              animation: i === slideIdx ? 'ovKenBurns 22s ease-out forwards' : 'none',
              // Enough blur to keep the progress text off busy detail, but not
              // so much that the place stops being recognisable — showing the
              // actual destination is the entire point of this backdrop.
              filter: 'blur(3px) saturate(1.08)',
              transform: 'scale(1.06)',
            }}
          />
        ))}
      </div>

      {/* Scrim — lighter than before so the photograph actually reads, but
          still opaque enough to keep the dark progress text legible. */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(250,250,248,0.62) 0%,rgba(250,250,248,0.74) 100%)' }} />

      {/* Which city is on screen — on a circuit this quietly previews the
          route while the plan is still being written. */}
      {activeSlide?.name && slides.length > 1 && (
        <div style={{
          position: 'absolute', bottom: '22px', left: '22px', zIndex: 2,
          fontSize: '12px', fontWeight: '700', color: '#475569',
          background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.9)',
          padding: '6px 13px', borderRadius: '20px', backdropFilter: 'blur(6px)',
        }}>
          📍 {activeSlide.name}
        </div>
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '560px',
        margin: '0 auto', padding: '32px 24px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#F0FDFA',
            border: '1px solid #99F6E4',
            borderRadius: '20px', padding: '5px 14px', marginBottom: '14px',
          }}>
            <div style={{
              width: '7px', height: '7px', background: '#0d9488',
              borderRadius: '50%', animation: 'ovPulse 1.5s infinite',
            }} />
            <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: '700', letterSpacing: '0.5px' }}>
              AI GENERATING
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(20px,4vw,30px)', fontWeight: '800',
            color: '#0F172A', margin: '0 0 6px', lineHeight: 1.2,
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          }}>
            {headline}
          </h2>

          {isAgent && clientName && (
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              for {clientName}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
              Step {genStep + 1} of {steps.length}
            </span>
            <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700' }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: '5px', background: '#E7E3D8', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg,#0d9488,#0ea5e9)',
              borderRadius: '3px',
              transition: 'width 1.2s ease',
            }} />
          </div>
        </div>

        {/* Steps */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid #E7E3D8',
          borderRadius: '16px', padding: '18px',
          marginBottom: '20px',
          boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
        }}>
          {steps.map((step, i) => {
            const isDone    = i < genStep
            const isCurrent = i === genStep
            const isPending = i > genStep
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '7px 0',
                borderBottom: i < steps.length - 1 ? '1px solid #F1F5F9' : 'none',
                opacity: isPending ? 0.4 : 1,
                transition: 'opacity 0.4s',
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  flexShrink: 0, marginTop: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px',
                  background: isDone ? '#0d9488' : isCurrent ? '#F0FDFA' : '#F8FAFC',
                  border: isCurrent ? '1.5px solid #0d9488' : 'none',
                  color: isDone ? 'white' : '#94A3B8',
                }}>
                  {isDone ? '✓' : isCurrent ? (
                    <div style={{
                      width: '7px', height: '7px', background: '#0d9488',
                      borderRadius: '50%', animation: 'ovPulse 1s infinite',
                    }} />
                  ) : '○'}
                </div>
                <span style={{
                  fontSize: '12.5px', lineHeight: 1.5,
                  color: isDone ? '#0D9488' : isCurrent ? '#0F172A' : '#94A3B8',
                  fontWeight: isCurrent ? '600' : '400',
                }}>
                  {isCurrent ? typedText : step}
                  {isCurrent && isTyping && (
                    <span style={{
                      display: 'inline-block', width: '1.5px', height: '13px',
                      background: '#0d9488', marginLeft: '2px',
                      verticalAlign: 'middle',
                      animation: 'ovBlink 0.7s step-end infinite',
                    }} />
                  )}
                </span>
              </div>
            )
          })}
        </div>

        {/* Fun fact */}
        <div style={{
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderRadius: '12px', padding: '12px 16px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: '12px', color: '#92400E', margin: 0, lineHeight: 1.6 }}>
            {facts[factIdx % facts.length]}
          </p>
        </div>

        {/* Darker than the #94A3B8 it used to be, and on its own faint plate:
            this line sits directly on the photograph, and now that the scrim
            is light enough to see the photo through, pale grey text vanished
            over the busy parts of an image. */}
        <p style={{
          textAlign: 'center', fontSize: '11px', fontWeight: '600',
          color: '#475569', marginTop: '14px', marginBottom: 0,
          width: 'fit-content', marginLeft: 'auto', marginRight: 'auto',
          background: 'rgba(255,255,255,0.65)', borderRadius: '10px',
          padding: '4px 12px', backdropFilter: 'blur(4px)',
        }}>
          Usually 3–5 minutes · Complex routes take a little longer
        </p>
      </div>

      <style>{`
        @keyframes ovKenBurns {
          from { transform: scale(1.06) translate(0, 0); }
          to   { transform: scale(1.16) translate(-1.2%, -1%); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* Respect the OS setting — the drift is decoration, and this screen
             is already showing a progress bar and a typing animation. */
          [style*="ovKenBurns"] { animation: none !important; }
        }
        @keyframes ovPulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.5;transform:scale(0.8)}
        }
        @keyframes ovBlink {
          0%,100%{opacity:1} 50%{opacity:0}
        }
      `}</style>
    </div>
  )
}
