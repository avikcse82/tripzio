// src/components/GenerationOverlay.jsx
// Full-screen immersive generation experience
// Facts + bg image fetched dynamically from /seo/page/{slug}
// Zero hardcoding — works for ANY Indian destination

import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../api'

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
  const dest = destination?.trim() || 'your destination'
  const from = fromCity?.trim() || 'your city'
  const who = isAgent && clientName ? `${clientName}'s` : 'your'
  const tripDesc = tripType ? `${tripType} ` : ''

  return [
    `🔍 Understanding ${who} ${tripDesc}trip to ${dest}...`,
    `🚆 Finding best trains from ${from} to ${dest}...`,
    `🏨 Searching hotels in ${dest} for your budget...`,
    `📍 Discovering ${dest}'s best experiences...`,
    `🎪 Checking festivals & season near ${dest}...`,
    `💰 Calculating ${days ? days + '-day ' : ''}budget breakdown...`,
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
}) {
  const [facts, setFacts]         = useState(INDIA_FACTS)
  const [bgImage, setBgImage]     = useState(null)
  const [factIdx, setFactIdx]     = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping]   = useState(true)
  const typingRef = useRef(null)
  const factRef   = useRef(null)
  const fetchedRef = useRef(null) // track last fetched slug

  const steps = buildSteps(destination, fromCity, tripType, days, isAgent, clientName)
  const progress = Math.round(((genStep + 1) / steps.length) * 100)
  const destDisplay = destination?.trim() || (isAgent ? 'client trip' : 'your trip')

  // ── Fetch destination facts + bg from /seo/page ───────────────────────
  useEffect(() => {
    if (!generating || !destination) return
    const slug = extractSlug(destination)
    if (!slug || slug === fetchedRef.current) return
    fetchedRef.current = slug

    // Background: Unsplash dynamic search — no hardcoding
    const query = encodeURIComponent(`${destination},india,travel`)
    setBgImage(`https://source.unsplash.com/1200x800/?${query}`)

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
      setBgImage(null)
      setFactIdx(0)
      fetchedRef.current = null
    }
  }, [generating])

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

  // Default bg if Unsplash hasn't loaded
  const bg = bgImage || 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=60&auto=format'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Blurred destination background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(10px) brightness(0.3)',
        transform: 'scale(1.08)',
        transition: 'background-image 1s ease',
      }} />

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,24,0.78)' }} />

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
            background: 'rgba(13,148,136,0.15)',
            border: '1px solid rgba(13,148,136,0.35)',
            borderRadius: '20px', padding: '5px 14px', marginBottom: '14px',
          }}>
            <div style={{
              width: '7px', height: '7px', background: '#0d9488',
              borderRadius: '50%', animation: 'ovPulse 1.5s infinite',
            }} />
            <span style={{ fontSize: '11px', color: '#5eead4', fontWeight: '700', letterSpacing: '0.5px' }}>
              AI GENERATING
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(20px,4vw,30px)', fontWeight: '900',
            color: 'white', margin: '0 0 6px', lineHeight: 1.2,
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
          }}>
            Planning your {destDisplay}
          </h2>

          {isAgent && clientName && (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
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
          <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
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
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', padding: '18px',
          marginBottom: '20px',
        }}>
          {steps.map((step, i) => {
            const isDone    = i < genStep
            const isCurrent = i === genStep
            const isPending = i > genStep
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '7px 0',
                borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                opacity: isPending ? 0.35 : 1,
                transition: 'opacity 0.4s',
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  flexShrink: 0, marginTop: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px',
                  background: isDone ? '#0d9488' : isCurrent ? 'rgba(13,148,136,0.15)' : 'rgba(255,255,255,0.04)',
                  border: isCurrent ? '1.5px solid #0d9488' : 'none',
                  color: isDone ? 'white' : '#64748b',
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
                  color: isDone ? '#5eead4' : isCurrent ? 'white' : '#475569',
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
          background: 'rgba(13,148,136,0.07)',
          border: '1px solid rgba(13,148,136,0.18)',
          borderRadius: '12px', padding: '12px 16px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '15px', flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
            {facts[factIdx % facts.length]}
          </p>
        </div>

        <p style={{
          textAlign: 'center', fontSize: '11px',
          color: '#334155', marginTop: '14px', marginBottom: 0,
        }}>
          Usually 30–90 seconds · Complex routes take a little longer
        </p>
      </div>

      <style>{`
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
