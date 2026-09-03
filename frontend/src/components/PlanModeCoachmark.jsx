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

  // Pill-shaped speech-bubble tooltip anchored tight to its target (HSBC-app
  // style), replacing the old long dashed line + tiny triangle — that shape
  // read fine with one target far from the others, but two ADJACENT tabs
  // (e.g. Hotels/Transport) sent two dashed lines converging into the same
  // small area with overlapping labels. A tail-tipped bubble sitting right
  // under its own tab, plus each caller's own `offset` to stagger targets
  // that sit close together, keeps every label pinned to the tab it names.
  return (
    <div onClick={dismiss} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,18,0.55)', zIndex: 9999, cursor: 'pointer' }}>
      {rects.map(r => {
        const bubbleTop = r.bottom + 14 + r.offset
        const clampedLeft = Math.max(72, Math.min(r.x, window.innerWidth - 72))
        return (
          <div key={r.id} style={{ position: 'fixed', top: bubbleTop, left: clampedLeft, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: '-6px', left: '50%', width: '12px', height: '12px',
              background: '#fff', borderRadius: '3px', transform: 'translateX(-50%) rotate(45deg)',
            }} />
            <div style={{
              position: 'relative',
              background: '#fff',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'Inter, sans-serif',
              padding: '10px 18px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              boxShadow: '0 10px 28px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}>{r.label}</div>
          </div>
        )
      })}
      <p style={{ position: 'fixed', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontFamily: 'Inter, sans-serif', margin: 0 }}>
        Tap anywhere to close
      </p>
    </div>
  )
}
