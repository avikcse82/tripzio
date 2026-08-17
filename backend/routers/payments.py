"""
backend/routers/payments.py
Tripzio Module 3 — Pay-per-trip (Razorpay)

Model: NOT a subscription. The free cap stays at 3 locked trips forever
(see routers/trips.py's check_save_limit). Each trip beyond that requires
its own one-time payment, priced by that trip's plan_tier. A verified
payment unlocks exactly the one trip it was created for — nothing else.

Uses raw httpx calls against Razorpay's REST API (Basic Auth with
key_id:key_secret), matching how every other third-party API in this
codebase is called — no razorpay SDK dependency added.
"""

import os
import hmac
import hashlib
import logging
import httpx
from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel
from database import (
    get_supabase_client, create_payment, get_payment_by_order_id,
    update_payment, update_trip,
)
from routers.trips import _find_user_trip
from routers.users import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# ── Pay-per-trip pricing (paise — Razorpay's smallest currency unit).
# Deliberately NOT the same as the 0.6x-5.5x trip-cost-estimate multiplier
# in UserDashboard.jsx — that scales the estimated TRAVEL cost shown to
# users, this is Tripzio's own service fee for unlocking the plan.
TIER_PRICES_PAISE = {
    "bronze": 4900,
    "silver": 9900,
    "gold": 14900,
    "diamond": 24900,
    "platinum": 39900,
}


class CreateOrderRequest(BaseModel):
    trip_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def _razorpay_auth():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payments are not configured yet.")
    return httpx.BasicAuth(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)


async def _finalize_payment(order_id: str, razorpay_payment_id: str):
    """Shared by /verify (frontend callback) and /webhook (backup path) — both end
    up here once a payment is confirmed captured. Idempotent: safe to call twice
    for the same order (e.g. both the callback AND the webhook fire for one payment)."""
    payment = get_payment_by_order_id(order_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if payment.get("status") == "paid":
        return payment  # already processed — nothing more to do

    updated = update_payment(order_id, {
        "status": "paid",
        "razorpay_payment_id": razorpay_payment_id,
        "verified_at": "now()",
    })

    # Unlock the trip this payment was for. Deliberately does NOT call
    # check_save_limit — a verified payment is exactly what bypasses that gate.
    locked_trip = update_trip(payment["trip_id"], payment["user_id"], {"locked": True})
    if not locked_trip:
        logger.error(f"Payment {order_id} verified but failed to unlock trip {payment['trip_id']}")

    return updated


@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["id"])

    trip = _find_user_trip(user_id, body.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.get("locked"):
        raise HTTPException(status_code=400, detail="This trip is already saved.")

    # Price is derived from the trip's OWN plan_tier server-side — never trust a
    # client-supplied tier, or a user could request platinum content at bronze price.
    tier = (trip.get("plan_tier") or "silver").lower()
    amount = TIER_PRICES_PAISE.get(tier, TIER_PRICES_PAISE["silver"])

    async with httpx.AsyncClient(timeout=15, auth=_razorpay_auth()) as client:
        try:
            resp = await client.post(
                "https://api.razorpay.com/v1/orders",
                json={
                    "amount": amount,
                    "currency": "INR",
                    "receipt": f"trip_{body.trip_id}",
                    "notes": {"trip_id": body.trip_id, "user_id": user_id, "plan_tier": tier},
                },
            )
        except httpx.HTTPError as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise HTTPException(status_code=502, detail="Could not reach payment provider. Try again.")

    if resp.status_code != 200:
        logger.error(f"Razorpay order creation error [{resp.status_code}]: {resp.text}")
        raise HTTPException(status_code=502, detail="Could not create payment order.")

    order = resp.json()

    create_payment({
        "user_id": user_id,
        "trip_id": body.trip_id,
        "razorpay_order_id": order["id"],
        "plan_tier": tier,
        "amount": amount,
        "currency": "INR",
        "status": "created",
    })

    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,  # publishable, safe for the frontend
        "plan_tier": tier,
    }


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["id"])

    payment = get_payment_by_order_id(body.razorpay_order_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")
    if str(payment.get("user_id")) != user_id:
        # Never let one user verify/unlock using another user's order id
        raise HTTPException(status_code=403, detail="Not your payment.")

    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, body.razorpay_signature):
        logger.warning(f"Razorpay signature mismatch for order {body.razorpay_order_id}")
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    await _finalize_payment(body.razorpay_order_id, body.razorpay_payment_id)
    return {"status": "unlocked", "trip_id": payment["trip_id"]}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Backup reconciliation path — fires even if the user closes the browser right
    after paying, before the frontend's /verify call goes out. Configure this URL
    (https://<railway-domain>/payments/webhook) in the Razorpay dashboard, event:
    payment.captured, with a webhook secret separate from the API key secret."""
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook not configured.")

    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    expected_signature = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        logger.warning("Razorpay webhook signature mismatch — rejecting.")
        raise HTTPException(status_code=400, detail="Invalid signature.")

    payload = await request.json()
    event = payload.get("event", "")

    if event == "payment.captured":
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        if order_id and payment_id:
            await _finalize_payment(order_id, payment_id)

    # Razorpay expects a fast 200 regardless of event type — never error out on
    # event types we don't handle, that would cause needless webhook retries.
    return {"status": "ok"}
