import { useEffect, useState, useCallback } from 'react'

// Points an arrow + short label at a set of DOM elements tagged
// data-coachmark="<id>", so a first-time user knows what to look for instead
// of having to guess. Shows once ever per browser (localStorage flag keyed
// by storageKey — callers pass a distinct key per screen/dashboard, so e.g.
// the user dashboard, agent dashboard, and itinerary result page each get
// their own independent one-time tour). Dismisses on any click/tap, same as
// the reference pattern this was modeled on. `targets` defaults to the
// original plan-mode tabs (Quick / Detailed / Custom) for backward
// compatibility with existing call sites that don't pass one.
const DEFAULT_TARGETS = [
  { id: 'quick', label: 'Fastest — just 4 inputs', offset: 0 },
  { id: 'detailed', label: 'Choose dates, tier, everything', offset: 34 },
  { id: 'custom', label: 'Describe your trip in your own words', offset: 0 },
]

export default function PlanModeCoachmark({ storageKey, targets = DEFAULT_TARGETS }) {
  const [rects, setRects] = useState(null)
  const [visible, setVisible] = useState(false)

  const measure = useCallback(() => {
    const found = targets.map(t => {
      const el = document.querySelector(`[data-coachmark="${t.id}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { ...t, x: r.left + r.width / 2, bottom: r.bottom }
    })
    if (found.every(Boolean)) setRects(found)
    else setVisible(false)
  }, [targets])

  useEffect(() => {
    if (typeof window === 'undefined' || localStorage.getItem(storageKey)) return
    const el = document.querySelector(`[data-coachmark="${targets[0]?.id}"]`)
    if (!el) return

    el.scrollIntoView({ behavior: 'instant', block: 'center' })
    const t = setTimeout(() => { measure(); setVisible(true) }, 150)
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize) }
  }, [storageKey, targets, measure])

  const dismiss = () => {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  if (!visible || !rects) return null

  return (
    <div onClick={dismiss} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,18,0.55)', zIndex: 9999, cursor: 'pointer' }}>
      <svg style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }} aria-hidden="true">
        {rects.map(r => {
          const tipY = r.bottom + 16
          const startY = r.bottom + 54 + r.offset
          return (
            <g key={r.id}>
              <path d={`M ${r.x} ${startY} Q ${r.x} ${(startY + tipY) / 2} ${r.x} ${tipY + 8}`} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" />
              <path d={`M ${r.x} ${tipY} L ${r.x - 6} ${tipY + 12} L ${r.x + 6} ${tipY + 12} Z`} fill="#fff" />
            </g>
          )
        })}
      </svg>
      {rects.map(r => (
        <p key={r.id} style={{
          position: 'fixed',
          top: r.bottom + 58 + r.offset,
          left: Math.max(8, Math.min(r.x - 70, window.innerWidth - 148)),
          width: '140px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: '600',
          lineHeight: 1.4,
          margin: 0,
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          pointerEvents: 'none',
        }}>{r.label}</p>
      ))}
      <p style={{ position: 'fixed', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontFamily: 'Inter, sans-serif', margin: 0 }}>
        Tap anywhere to close
      </p>
    </div>
  )
}
