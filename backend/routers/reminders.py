# backend/routers/reminders.py
# Trip reminder email system
# Cron: daily at 9 AM IST (3:30 AM UTC) → 30 3 * * *
# Sends 7-day, 3-day, 1-day reminders before trip start_date
# Uses Resend API (same as welcome emails)
# Fail-open: any error → log and continue, never crash

import os
import logging
import httpx
from datetime import date, timedelta
from fastapi import APIRouter, Header, HTTPException
from database import get_supabase_client
from routers.weather import get_weather

logger = logging.getLogger(__name__)
router = APIRouter()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = "itinerary@tripzio.io"
FROM_NAME = "Tripzio"

# ── Email sending via Resend ──────────────────────────────────────────────
async def send_email(to: str, subject: str, html: str) -> bool:
    """Send email via Resend. Returns True on success, False on failure."""
    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY not set")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": f"{FROM_NAME} <{FROM_EMAIL}>",
                    "to": [to],
                    "subject": subject,
                    "html": html,
                }
            )
        if r.status_code in (200, 201):
            logger.info(f"Email sent to {to}: {subject}")
            return True
        else:
            logger.error(f"Resend error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        logger.error(f"send_email failed: {e}")
        return False


# ── Email templates ───────────────────────────────────────────────────────
def build_reminder_email(trip: dict, user: dict, days_until: int, weather_advisory: str = None) -> tuple[str, str]:
    """
    Returns (subject, html) for the reminder email.
    days_until: 7, 3, or 1
    weather_advisory: only set on the 1-day reminder, and only when the
    destination's current conditions look genuinely disruptive (extreme
    heat, freezing, rain/storm, snow) — see get_weather()'s advisory field
    in routers/weather.py. None for normal weather, so most 1-day emails
    are completely unchanged by this.
    """
    dest = trip.get("destination", "your destination")
    trip_days = trip.get("days", "")
    budget = trip.get("budget", "")
    from_city = trip.get("from_city", "")
    plan_tier = (trip.get("plan_tier") or "silver").capitalize()
    share_slug = trip.get("share_slug", "")
    trip_url = f"https://tripzio.io/trip/{share_slug}" if share_slug else "https://tripzio.io"
    user_name = user.get("full_name", "Traveller").split()[0]

    budget_str = f"₹{int(budget):,}" if budget else ""
    days_str = f"{trip_days} days" if trip_days else ""

    # Emoji + tone based on countdown
    if days_until == 7:
        emoji = "🗺️"
        tone = "1 week away"
        urgency = "Time to book your trains and hotels!"
        cta = "Book Trains on IRCTC →"
        cta_url = "https://www.irctc.co.in"
        color = "#0d9488"
    elif days_until == 3:
        emoji = "✈️"
        tone = "just 3 days away"
        urgency = "Last chance to confirm your bookings!"
        cta = "View Your Complete Plan →"
        cta_url = trip_url
        color = "#6366f1"
    else:  # 1 day
        emoji = "🎉"
        tone = "TOMORROW!"
        urgency = "Pack your bags — adventure awaits!"
        cta = "View Your Plan One Last Time →"
        cta_url = trip_url
        color = "#f97316"

    subject = f"{emoji} Your {dest} trip is {tone} | Tripzio"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#0d9488,#0ea5e9);border-radius:12px;width:48px;height:48px;line-height:48px;text-align:center;font-size:24px;margin-bottom:12px;">✈</div>
    <h1 style="color:white;font-size:28px;font-weight:900;margin:0 0 6px;">Tripzio</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0;">Your AI Travel Planner</p>
  </td></tr>

  <!-- Countdown banner -->
  <tr><td style="background:{color};padding:20px 32px;text-align:center;">
    <p style="color:white;font-size:32px;font-weight:900;margin:0 0 4px;">{emoji} {days_until} Day{'s' if days_until > 1 else ''} to Go!</p>
    <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">Your {dest} adventure is {tone}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:white;padding:32px;">

    <p style="font-size:16px;color:#0f172a;margin:0 0 20px;">Hi {user_name}! 👋</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
      {urgency} Your Tripzio-planned trip to <strong style="color:#0d9488;">{dest}</strong> is coming up fast.
    </p>

    <!-- Trip card -->
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 12px;">📍 {dest}</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          {'<td style="padding:4px 0;"><span style="color:#64748b;font-size:13px;">📅 Duration</span><br/><strong style="font-size:14px;">'+days_str+'</strong></td>' if days_str else ''}
          {'<td style="padding:4px 0;"><span style="color:#64748b;font-size:13px;">💰 Budget</span><br/><strong style="font-size:14px;">'+budget_str+'</strong></td>' if budget_str else ''}
          {'<td style="padding:4px 0;"><span style="color:#64748b;font-size:13px;">🚉 From</span><br/><strong style="font-size:14px;">'+from_city+'</strong></td>' if from_city else ''}
          <td style="padding:4px 0;"><span style="color:#64748b;font-size:13px;">🏷️ Plan</span><br/><strong style="font-size:14px;">{plan_tier}</strong></td>
        </tr>
      </table>
    </div>

    {'<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px 20px;margin-bottom:24px;"><p style="font-size:14px;color:#991b1b;margin:0;font-weight:700;">⚠️ Weather heads-up for '+dest+'</p><p style="font-size:14px;color:#7f1d1d;margin:6px 0 0;line-height:1.5;">'+(weather_advisory or '')+'. Check conditions again before you leave.</p></div>' if weather_advisory else ''}

    <!-- Checklist based on days -->
    <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 12px;">
      {'🎯 Before You Go — Checklist' if days_until == 7 else '✅ Quick Check' if days_until == 3 else '🎒 Packing Reminder'}
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      {''.join([
        f'<tr><td style="padding:6px 0;font-size:14px;color:#475569;">✓ &nbsp;{item}</td></tr>'
        for item in (
          ['Book train tickets on IRCTC (if not done)', 'Book hotels for all nights', 'Check festival/event dates at destination', 'Download offline maps for the area'] if days_until == 7
          else ['Confirm all bookings are in order', 'Check weather forecast for '+dest, 'Inform family/friends of your itinerary', 'Carry ID proof and travel documents'] if days_until == 3
          else ['Pack essentials: clothes, charger, medicines', 'Download your Tripzio plan offline', 'Keep emergency contacts handy', 'Reach station/airport 30 mins early']
        )
      ])}
    </table>

    <!-- CTA button -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="{trip_url}" style="display:inline-block;background:linear-gradient(135deg,{color},{color}dd);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
        {cta}
      </a>
    </div>

    {'<div style="text-align:center;margin-bottom:16px;"><a href="https://www.irctc.co.in" style="display:inline-block;background:#0f172a;color:white;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:700;margin:0 6px;">🚂 IRCTC</a><a href="https://www.booking.com/search.html?ss='+dest+'" style="display:inline-block;background:#0d9488;color:white;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:13px;font-weight:700;margin:0 6px;">🏨 Hotels</a></div>' if days_until == 7 else ''}

    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">
      Have a wonderful trip! 🌟<br/>
      <strong>Team Tripzio</strong>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="font-size:12px;color:#94a3b8;margin:0 0 8px;">
      You're receiving this because you planned a trip on Tripzio.
    </p>
    <p style="font-size:12px;color:#94a3b8;margin:0;">
      <a href="https://tripzio.io" style="color:#0d9488;text-decoration:none;">tripzio.io</a>
      &nbsp;·&nbsp;
      <a href="https://tripzio.io/unsubscribe?email={user.get('email','')}" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    return subject, html


# ── Core cron logic ───────────────────────────────────────────────────────
async def run_reminders() -> dict:
    """
    Main reminder logic. Called by cron endpoint.
    Queries trips starting in 1, 3, 7 days.
    Sends emails and marks as sent.
    Returns summary of what was sent.
    """
    supabase = get_supabase_client()
    today = date.today()
    results = {"sent": 0, "failed": 0, "skipped": 0, "errors": []}

    for days_until, col in [(7, "reminder_sent_7d"), (3, "reminder_sent_3d"), (1, "reminder_sent_1d")]:
        target_date = (today + timedelta(days=days_until)).isoformat()
        try:
            # Fetch trips for this date that haven't been reminded yet
            trips_result = supabase.table("trips")\
                .select("id, user_id, destination, days, budget, from_city, plan_tier, share_slug, start_date, is_agent_plan, agent_id, client_email, client_name")\
                .eq("start_date", target_date)\
                .eq(col, False)\
                .execute()

            trips = trips_result.data or []
            logger.info(f"Found {len(trips)} trips for {days_until}-day reminder ({target_date})")

            for trip in trips:
                try:
                    emails_to_send = []

                    # Get user email
                    if trip.get("user_id"):
                        user_result = supabase.table("users")\
                            .select("email, full_name")\
                            .eq("id", trip["user_id"])\
                            .single()\
                            .execute()
                        if user_result.data:
                            emails_to_send.append(user_result.data)

                    # Get agent's client email (if agent plan)
                    if trip.get("is_agent_plan") and trip.get("client_email"):
                        emails_to_send.append({
                            "email": trip["client_email"],
                            "full_name": trip.get("client_name", "Traveller")
                        })

                    if not emails_to_send:
                        results["skipped"] += 1
                        continue

                    # Weather heads-up — 1-day reminder only, and only when
                    # conditions actually look disruptive. get_weather()
                    # returns CURRENT conditions, not a forecast, but at a
                    # 1-day lead time that's a reasonable proxy: the kind of
                    # weather this flags (monsoon rain, heatwaves, snow) is
                    # a multi-day pattern, not a same-day flip. Fails open —
                    # get_weather() never raises, just returns no advisory.
                    weather_advisory = None
                    if days_until == 1 and trip.get("destination"):
                        try:
                            weather = await get_weather(trip["destination"], trip.get("start_date"))
                            weather_advisory = weather.get("advisory")
                        except Exception as e:
                            logger.warning(f"Weather check failed for trip {trip.get('id')}: {e}")

                    # Send to each recipient
                    trip_sent = False
                    for user in emails_to_send:
                        subject, html = build_reminder_email(trip, user, days_until, weather_advisory)
                        sent = await send_email(user["email"], subject, html)
                        if sent:
                            results["sent"] += 1
                            trip_sent = True
                        else:
                            results["failed"] += 1

                    # Mark as sent (even if one recipient failed — avoid spam)
                    if trip_sent:
                        supabase.table("trips")\
                            .update({col: True})\
                            .eq("id", trip["id"])\
                            .execute()

                except Exception as e:
                    logger.error(f"Error processing trip {trip.get('id')}: {e}")
                    results["failed"] += 1
                    results["errors"].append(str(e))

        except Exception as e:
            logger.error(f"Error fetching trips for {days_until}-day reminder: {e}")
            results["errors"].append(str(e))

    logger.info(f"Reminder run complete: {results}")
    return results


# ── Type 2: Seasonal nudge (provisioned, not yet active) ─────────────────
# Trigger: October → email all users for winter travel planning
# Logic: Run once in October, send "Winter season starting" email
# Status: PROVISIONED — activate when user base > 500
# async def run_seasonal_nudge():
#     pass


# ── Type 3: Re-engagement (provisioned, not yet active) ──────────────────
# Trigger: user has not generated a trip in 30 days
# Logic: Query users with last_trip_at < NOW - 30 days
# Status: PROVISIONED — activate when user base > 200
# async def run_reengagement():
#     pass


# ── Cron endpoint ─────────────────────────────────────────────────────────
@router.post("/reminders/run")
async def run_reminders_endpoint(x_cron_secret: str = Header(None)):
    """
    Triggered by Railway cron job daily at 9 AM IST.
    Protected by CRON_SECRET header.
    Can also be called manually for testing.
    """
    expected_secret = os.getenv("CRON_SECRET", "")
    if expected_secret and x_cron_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid cron secret")

    results = await run_reminders()
    return {
        "status": "completed",
        "date": date.today().isoformat(),
        **results
    }


@router.get("/reminders/preview/{trip_id}")
async def preview_reminder(trip_id: str, days: int = 7):
    """
    Preview email HTML for a specific trip. For testing only.
    """
    if days not in (1, 3, 7):
        raise HTTPException(status_code=400, detail="days must be 1, 3, or 7")
    try:
        supabase = get_supabase_client()
        trip_result = supabase.table("trips").select("*").eq("id", trip_id).single().execute()
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        trip = trip_result.data
        user_result = supabase.table("users").select("email, full_name").eq("id", trip["user_id"]).single().execute()
        user = user_result.data or {"email": "test@example.com", "full_name": "Test User"}
        subject, html = build_reminder_email(trip, user, days)
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
