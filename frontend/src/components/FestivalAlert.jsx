// frontend/src/components/FestivalAlert.jsx
// Tripzio Module 4B — Festival Alert (API-backed)
// Fetches from /festivals/ endpoint — NO static JS file dependency

import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../api'
import { Calendar, ChevronDown, ChevronUp, X, AlertTriangle, Sparkles } from 'lucide-react'

function urgencyStyle(impact) {
  switch (impact) {
    case 'very_high': return { bg:'#fef2f2', border:'#fecaca', text:'#991b1b', badge:'#ef4444', label:'BOOK NOW' }
    case 'high':      return { bg:'#fffbeb', border:'#fcd34d', text:'#92400e', badge:'#f59e0b', label:'BOOK SOON' }
    case 'medium':    return { bg:'#f0fdf4', border:'#86efac', text:'#166534', badge:'#22c55e', label:'PLAN AHEAD' }
    default:          return { bg:'#eff6ff', border:'#bfdbfe', text:'#1e40af', badge:'#3b82f6', label:'FYI' }
  }
}

export default function FestivalAlert({ destination, startDate, days, compact = false }) {
  const [festivals, setFestivals] = useState([])
  const [expanded, setExpanded]   = useState(false)
  const [dismissed, setDismissed] = useState([])
  const abortRef = useRef(null)

  useEffect(() => {
    if (!destination || destination.trim().length < 3) {
      setFestivals([])
      return
    }

    // Do not fetch or display festivals if no travel date is provided —
    // showing "upcoming" festivals without a date erodes credibility.
    if (!startDate) {
      setFestivals([])
      return
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          destination: destination.trim().slice(0, 120)
        })
        if (startDate) params.append('start_date', startDate)
        if (days)      params.append('days', String(days))

        const res = await fetch(`${API_URL}/festivals/?${params}`, {
          signal: abortRef.current.signal
        })
        if (!res.ok) { setFestivals([]); return }
        const data = await res.json()
        if (Array.isArray(data)) setFestivals(data)
        else setFestivals([])
      } catch (e) {
        if (e.name !== 'AbortError') setFestivals([])
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [destination, startDate, days])

  const visible = festivals.filter(f => !dismissed.includes(f.name))
  if (!destination || !startDate || visible.length === 0) return null

  const top   = visible[0]
  const style = urgencyStyle(top.price_impact)
  const hasUrgent = visible.some(f => ['very_high','high'].includes(f.price_impact))

  // ── Compact mode ──────────────────────────────────────────
  if (compact) {
    return (
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visible.slice(0, 3).map(f => {
          const st = urgencyStyle(f.price_impact)
          const fDate = f.date
            ? new Date(f.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
            : ''
          return (
            <div key={f.name} style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'8px 10px', background:st.bg,
              border:`1px solid ${st.border}`, borderRadius:'10px',
            }}>
              <span style={{ fontSize:'15px', flexShrink:0 }}>{f.emoji || '🎉'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontWeight:'700', color:st.text, fontSize:'11px' }}>{f.name}</span>
                {f.match_note && (
                  <span style={{ color:st.text, opacity:0.85, fontSize:'11px' }}> · {f.match_note}</span>
                )}
                {!f.match_note && !startDate && fDate && (
                  <span style={{ color:st.text, opacity:0.75, fontSize:'11px' }}> · {fDate}</span>
                )}
                {!f.match_note && startDate && f.price_warning && (
                  <span style={{ color:st.text, opacity:0.75, fontSize:'11px' }}> · {f.price_warning}</span>
                )}
              </div>
              <span style={{
                background:st.badge, color:'white', fontSize:'9px',
                fontWeight:'800', padding:'2px 7px', borderRadius:'4px',
                flexShrink:0, letterSpacing:'0.3px',
              }}>
                {st.label}
              </span>
              <button
                onClick={() => setDismissed(p => [...p, f.name])}
                style={{ background:'none', border:'none', cursor:'pointer', color:st.text, opacity:0.5, padding:'0 2px', flexShrink:0, fontSize:'14px', lineHeight:1 }}>
                ×
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Full card mode ────────────────────────────────────────
  return (
    <div style={{
      background:style.bg, border:`1.5px solid ${style.border}`,
      borderRadius:'16px', overflow:'hidden', marginBottom:'16px',
      fontFamily:'Inter, sans-serif',
    }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.3)}}`}</style>

      <div onClick={() => setExpanded(p => !p)}
        style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', cursor:'pointer' }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <span style={{ fontSize:'24px' }}>{top.emoji || '🎉'}</span>
          {hasUrgent && (
            <div style={{ position:'absolute', top:-2, right:-4, width:'10px', height:'10px', background:'#ef4444', borderRadius:'50%', border:'2px solid white', animation:'pulse 2s infinite' }} />
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'13px', fontWeight:'800', color:style.text }}>
              {startDate
                ? top.match_type === 'nearby_after'
                  ? (visible.length === 1 ? `${top.name} just after your trip!` : `${visible.length} festivals near your travel dates!`)
                  : top.match_type === 'nearby_before'
                  ? (visible.length === 1 ? `${top.name} just before your trip!` : `${visible.length} festivals near your travel dates!`)
                  : (visible.length === 1 ? `${top.name} during your trip!` : `${visible.length} festivals during your trip!`)
                : (visible.length === 1 ? `${top.name} coming up!` : `${visible.length} upcoming festivals!`)
              }
            </span>
            <span style={{ background:style.badge, color:'white', fontSize:'9px', fontWeight:'800', padding:'2px 7px', borderRadius:'4px', letterSpacing:'0.5px' }}>
              {style.label}
            </span>
          </div>
          <p style={{ fontSize:'11px', color:style.text, opacity:0.8, margin:'2px 0 0', lineHeight:1.4 }}>
            {top.price_warning || top.description}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
          {visible.length > 1 && (
            <span style={{ fontSize:'11px', fontWeight:'700', color:style.text, opacity:0.7 }}>+{visible.length-1} more</span>
          )}
          {expanded ? <ChevronUp size={15} color={style.text}/> : <ChevronDown size={15} color={style.text}/>}
        </div>
      </div>

      {expanded && (
        <div style={{ padding:'0 16px 14px', borderTop:`1px solid ${style.border}` }}>
          <div style={{ paddingTop:'12px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {visible.map(f => {
              const fs = urgencyStyle(f.price_impact)
              const fDate = f.date ? new Date(f.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''
              const fEnd  = f.end_date ? new Date(f.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : null
              return (
                <div key={f.name} style={{ background:'white', border:`1px solid ${fs.border}`, borderRadius:'12px', padding:'12px 14px', position:'relative' }}>
                  <button onClick={() => setDismissed(p => [...p, f.name])}
                    style={{ position:'absolute', top:'8px', right:'8px', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'2px' }}>
                    <X size={12}/>
                  </button>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                    <span style={{ fontSize:'20px', flexShrink:0 }}>{f.emoji || '🎉'}</span>
                    <div style={{ flex:1, minWidth:0, paddingRight:'16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'4px' }}>
                        <span style={{ fontSize:'13px', fontWeight:'800', color:'#0f172a' }}>{f.name}</span>
                        <span style={{ background:fs.badge, color:'white', fontSize:'9px', fontWeight:'800', padding:'2px 6px', borderRadius:'4px' }}>{fs.label}</span>
                        {fDate && (
                          <span style={{ fontSize:'10px', color:'#64748b', display:'flex', alignItems:'center', gap:'3px' }}>
                            <Calendar size={9}/> {fDate}{fEnd && fEnd !== fDate ? ` – ${fEnd}` : ''}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize:'12px', color:'#475569', margin:'0 0 6px', lineHeight:1.5 }}>{f.description}</p>
                      {f.price_warning && (
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:'700', color:fs.text, marginBottom:'4px' }}>
                          <AlertTriangle size={11}/>{f.price_warning}
                        </div>
                      )}
                      {f.tip && (
                        <div style={{ display:'flex', alignItems:'flex-start', gap:'5px', fontSize:'11px', color:'#0d9488', background:'#f0fdfa', padding:'6px 8px', borderRadius:'8px', marginTop:'6px' }}>
                          <Sparkles size={11} style={{ flexShrink:0, marginTop:'1px' }}/>
                          <span><strong>Pro tip:</strong> {f.tip}</span>
                        </div>
                      )}
                      {f.urgency && (
                        <p style={{ fontSize:'11px', fontWeight:'700', color:fs.text, marginTop:'5px' }}>⏰ {f.urgency}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
