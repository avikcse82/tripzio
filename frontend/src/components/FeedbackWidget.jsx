// frontend/src/components/FeedbackWidget.jsx
// Tripzio — Rate this plan widget
// Shows after itinerary is generated

import { useState } from 'react'
import { Star } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function FeedbackWidget({ tripId, destination, onClose }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('tripzio_token')
      const resp = await fetch(`${API_URL}/itinerary/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ trip_id: tripId, rating, feedback, destination })
      })
      if (resp.ok) {
        setSubmitted(true)
        setTimeout(() => onClose?.(), 2000)
      }
    } catch (e) {
      console.error('Feedback error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🙏</div>
        <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>Thank you!</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Your feedback helps us improve</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Rate this plan ✨</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>How was your {destination} itinerary?</div>
        </div>
        {onClose && (
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1 }}>
            ×
          </button>
        )}
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {[1,2,3,4,5].map(star => (
          <button key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', transition: 'transform 0.15s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
            <Star
              size={28}
              fill={(hover || rating) >= star ? '#f59e0b' : 'none'}
              color={(hover || rating) >= star ? '#f59e0b' : '#e2e8f0'}
              strokeWidth={1.5}
            />
          </button>
        ))}
        {rating > 0 && (
          <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center', marginLeft: '4px' }}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
          </span>
        )}
      </div>

      {/* Optional feedback text */}
      <textarea
        placeholder="What can we improve? (optional)"
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        rows={2}
        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', color: '#374151' }}
        onFocus={e => e.currentTarget.style.borderColor = '#0d9488'}
        onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
      />

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {onClose && (
          <button onClick={onClose}
            style={{ flex: 1, padding: '9px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: '#64748b' }}>
            Skip
          </button>
        )}
        <button onClick={handleSubmit} disabled={!rating || submitting}
          style={{ flex: 2, padding: '9px', border: 'none', borderRadius: '10px', background: !rating ? '#e2e8f0' : 'linear-gradient(135deg,#0d9488,#0ea5e9)', color: !rating ? '#94a3b8' : 'white', fontSize: '12px', fontWeight: '800', cursor: !rating ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {submitting ? 'Submitting...' : '⭐ Submit Rating'}
        </button>
      </div>
    </div>
  )
}
