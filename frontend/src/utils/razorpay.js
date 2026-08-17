/**
 * frontend/src/utils/razorpay.js
 * Pay-per-trip checkout — NOT a subscription. Unlocks exactly one trip
 * beyond the free 3-trip cap. See backend/routers/payments.py for the
 * server-side order creation + signature verification this talks to.
 */
import { API_URL } from '../api'

let checkoutScriptPromise = null

// Loads Razorpay's Checkout.js exactly once, even if called multiple times
// across the app (e.g. user retries after closing the modal).
function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve()
  if (checkoutScriptPromise) return checkoutScriptPromise

  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => {
      checkoutScriptPromise = null // allow retry on next call
      reject(new Error('Could not load payment checkout. Check your connection and try again.'))
    }
    document.body.appendChild(script)
  })
  return checkoutScriptPromise
}

/**
 * Opens Razorpay Checkout for the given trip, verifies the payment
 * server-side on success, then resolves with the unlocked trip.
 * Rejects (does not throw silently) on any failure, including the user
 * simply closing the checkout modal without paying.
 */
export async function payToUnlockTrip(tripId) {
  const token = localStorage.getItem('tripzio_token')

  await loadCheckoutScript()

  const orderResp = await fetch(`${API_URL}/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ trip_id: tripId }),
  })
  const order = await orderResp.json()
  if (!orderResp.ok) {
    throw new Error(order?.detail || 'Could not start payment. Please try again.')
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: 'Tripzio',
      description: `Unlock your ${order.plan_tier} trip plan`,
      theme: { color: '#0d9488' },
      handler: async (response) => {
        try {
          const verifyResp = await fetch(`${API_URL}/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const result = await verifyResp.json()
          if (!verifyResp.ok) throw new Error(result?.detail || 'Payment verification failed.')
          resolve(result)
        } catch (err) {
          reject(err)
        }
      },
      modal: {
        // User closed the checkout without paying — not an error, just not a success.
        ondismiss: () => reject(new Error('DISMISSED')),
      },
    })
    rzp.open()
  })
}
