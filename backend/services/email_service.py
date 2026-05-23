# backend/services/email_service.py
# Tripzio — Email itinerary via Resend
# Free: 3,000 emails/month, no credit card needed

import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_URL = "https://api.resend.com/emails"
FROM_EMAIL = "Tripzio <itinerary@tripzio.io>"


def build_itinerary_html(data: dict, client_name: str = "") -> str:
    """Build beautiful HTML email for itinerary"""
    dest = data.get("destination", "Your Trip")
    days = data.get("days", 0)
    budget = data.get("budget", 0)
    summary = data.get("summary", "")
    plan_tier = data.get("plan_tier", "silver").title()
    from_city = data.get("from_city", "")

    # Cost breakdown
    cb = data.get("cost_breakdown", {})
    total = cb.get("total", f"₹{budget:,}" if budget else "")
    per_person = cb.get("per_person", "")
    utilisation = cb.get("budget_utilisation", "")

    # Day plans
    day_plans = data.get("day_plans", [])

    # Transport
    transport = data.get("transport_options", [])
    recommended_transport = next((t for t in transport if "recommended" in t.get("mode","").lower()), transport[0] if transport else {})

    # Hotels
    accommodation = data.get("accommodation", [])
    recommended_hotel = next((h for h in accommodation if h.get("recommended")), accommodation[0] if accommodation else {})

    greeting = f"Hi {client_name}," if client_name else "Hi there,"

    days_html = ""
    for day in day_plans[:7]:
        days_html += f"""
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 700; color: #0d9488; font-size: 13px; margin-bottom: 4px;">
              Day {day.get('day', '')} — {day.get('title', '')}
            </div>
            <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
              🌅 <strong>Morning:</strong> {day.get('morning', '')}<br>
              ☀️ <strong>Afternoon:</strong> {day.get('afternoon', '')}<br>
              🌙 <strong>Evening:</strong> {day.get('evening', '')}
            </div>
          </td>
        </tr>"""

    transport_html = ""
    if recommended_transport:
        transport_html = f"""
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin: 12px 0;">
          <div style="font-weight: 700; color: #15803d; font-size: 13px;">🚆 Recommended Transport</div>
          <div style="font-size: 12px; color: #374151; margin-top: 4px;">
            {recommended_transport.get('operator', '')} — {recommended_transport.get('description', '')}<br>
            💰 {recommended_transport.get('estimated_cost', '')} &nbsp;⏱ {recommended_transport.get('duration', '')}<br>
            💡 {recommended_transport.get('booking_tip', '')}
          </div>
        </div>"""

    hotel_html = ""
    if recommended_hotel:
        hotel_html = f"""
        <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin: 12px 0;">
          <div style="font-weight: 700; color: #92400e; font-size: 13px;">🏨 Recommended Stay</div>
          <div style="font-size: 12px; color: #374151; margin-top: 4px;">
            <strong>{recommended_hotel.get('name', '')}</strong> — {recommended_hotel.get('area', '')}<br>
            ⭐ {recommended_hotel.get('rating', '')} &nbsp;💰 {recommended_hotel.get('price_range', '')}<br>
            ✨ {recommended_hotel.get('highlight', '')}
          </div>
        </div>"""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d9488,#0ea5e9);border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
      <div style="font-size:28px;font-weight:900;color:white;letter-spacing:-1px;">✈️ Tripzio</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">Your AI Travel Itinerary</div>
    </div>

    <!-- Greeting -->
    <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <p style="font-size:15px;color:#374151;margin:0 0 12px;">{greeting}</p>
      <p style="font-size:14px;color:#64748b;margin:0;">
        Your <strong style="color:#0d9488;">{days}-day {dest}</strong> itinerary is ready!
        {f"Travelling from {from_city}." if from_city else ""}
        {f"Plan tier: <strong>{plan_tier}</strong>." if plan_tier else ""}
      </p>
      {f'<p style="font-size:13px;color:#64748b;margin:12px 0 0;font-style:italic;">{summary}</p>' if summary else ''}
    </div>

    <!-- Cost Summary -->
    <div style="background:linear-gradient(135deg,#0d9488,#0ea5e9);border-radius:16px;padding:20px;margin-bottom:16px;color:white;">
      <div style="font-size:13px;opacity:0.85;margin-bottom:8px;">Budget Summary</div>
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div><div style="font-size:22px;font-weight:900;">{total}</div><div style="font-size:11px;opacity:0.8;">Total Cost</div></div>
        {f'<div><div style="font-size:18px;font-weight:800;">{per_person}</div><div style="font-size:11px;opacity:0.8;">Per Person</div></div>' if per_person else ''}
        {f'<div><div style="font-size:18px;font-weight:800;">{utilisation}</div><div style="font-size:11px;opacity:0.8;">Budget Used</div></div>' if utilisation else ''}
      </div>
    </div>

    <!-- Transport & Hotel -->
    {transport_html}
    {hotel_html}

    <!-- Day Plans -->
    <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:14px;">📅 Day-by-Day Itinerary</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        {days_html}
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:20px;">
      <a href="https://tripzio.io" style="background:linear-gradient(135deg,#0d9488,#0ea5e9);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;">
        🌐 View Full Itinerary on Tripzio
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#94a3b8;padding:16px;">
      <p style="margin:0;">Powered by <strong>Tripzio</strong> — India's AI Travel Platform</p>
      <p style="margin:4px 0 0;">tripzio.io · Prices approximate · Always verify before booking</p>
    </div>

  </div>
</body>
</html>"""
    return html


async def send_itinerary_email(
    to_email: str,
    itinerary_data: dict,
    client_name: str = "",
    agent_name: str = "",
    reply_to: str = ""
) -> dict:
    """Send itinerary email via Resend"""

    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY not set")
        return {"success": False, "error": "Email service not configured"}

    dest = itinerary_data.get("destination", "Your Trip")
    days = itinerary_data.get("days", 0)
    subject = f"🗺️ Your {days}-Day {dest} Itinerary — Tripzio"
    if agent_name:
        subject = f"🗺️ {dest} Trip Plan from {agent_name} — Tripzio"

    html = build_itinerary_html(itinerary_data, client_name)

    payload = {
        "from": FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                RESEND_URL,
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            result = response.json()
            if response.status_code == 200 or response.status_code == 201:
                logger.info(f"Email sent to {to_email}: {result.get('id')}")
                return {"success": True, "id": result.get("id")}
            else:
                logger.error(f"Resend error: {result}")
                return {"success": False, "error": result.get("message", "Failed to send")}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"success": False, "error": str(e)}
