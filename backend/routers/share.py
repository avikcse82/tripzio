"""
backend/routers/share.py
Tripzio Module 4A — Trip Sharing

Synced to project patterns:
- Supabase via: from database import get_supabase_client
- Auth via: from routers.users import get_current_user (required — see note below)

Sharing requires the trip be a real, owned, LOCKED (saved/paid) trip — see
create_share. Previously this endpoint accepted an arbitrary client-supplied
trip_data blob with auth optional, meaning anyone could publish anything
(even fabricated content unrelated to any real trip) with zero ownership or
payment check, defeating the pay-per-trip cap entirely: generate a full
paid-tier itinerary for free, publish it here, never save or pay. Now the
client only supplies a trip_id it owns; the actual content published is
always the server's own copy of that trip's itinerary.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date
from core.dates import IST, today_ist  # noqa: F401  (IST re-exported for callers)
from database import get_supabase_client
from routers.users import get_current_user
from routers.trips import _find_user_trip
from routers.weather import get_weather
import random
import string
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/share", tags=["Share"])


# ─── Helpers ──────────────────────────────────────────────────

def generate_slug(length=8):
    """Generate a short unique slug like 'abc12345'"""
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choices(chars, k=length))


def get_unique_slug(supabase):
    """Generate slug, retry if collision"""
    for _ in range(5):
        slug = generate_slug()
        existing = supabase.table("shared_trips") \
            .select("id") \
            .eq("slug", slug) \
            .execute()
        if not existing.data:
            return slug
    raise HTTPException(status_code=500, detail="Could not generate unique slug")


# ─── Schemas ──────────────────────────────────────────────────

class CreateShareRequest(BaseModel):
    trip_id: str
    title: Optional[str] = None
    agent_name: Optional[str] = None


# ─── Routes ───────────────────────────────────────────────────

@router.post("/create")
def create_share(
    body: CreateShareRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a shareable link for a trip the caller owns. The trip must be
    locked (saved within the free cap, or unlocked via payment) — same gate
    as My Trips and PDF export, so publishing a public link isn't a way
    around the pay-per-trip cap."""
    try:
        user_id = str(current_user["id"])
        trip = _find_user_trip(user_id, body.trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found.")
        if not trip.get("locked"):
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "TRIP_NOT_SAVED",
                    "message": "Save this trip first to share it — free plan includes 3 saved trips.",
                }
            )

        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Database unavailable")

        # Every locked trip already gets a share link minted by
        # ensure_share_slug() at save/lock/payment time, so by the time anyone
        # clicks Share the link usually exists. Minting a second one here left
        # two shared_trips rows pointing at one trip, split its view count, and
        # — worst of it — meant reminder/nudge emails (which read
        # trips.share_slug) pointed at a DIFFERENT url than the one the user
        # had actually shared with their travel companions. Reuse the existing
        # link instead; both urls resolve to the same live trip anyway.
        existing_slug = trip.get("share_slug")
        if existing_slug:
            # Keep the title/agent_name the user just supplied.
            try:
                patch = {}
                if body.title:
                    patch["title"] = body.title
                if current_user.get("role") == "agent" and body.agent_name:
                    patch["agent_name"] = body.agent_name
                if patch:
                    supabase.table("shared_trips").update(patch).eq("slug", existing_slug).execute()
            except Exception as e:
                logger.warning(f"Could not update share metadata for {existing_slug}: {e}")
            return {
                "slug": existing_slug,
                "share_url": f"https://tripzio.io/trip/{existing_slug}",
                "short_url": f"tripzio.io/trip/{existing_slug}",
            }

        slug = get_unique_slug(supabase)
        itinerary = trip.get("itinerary") or {}
        is_agent = current_user.get("role") == "agent"

        payload = {
            "slug":        slug,
            "trip_id":     body.trip_id,
            "user_id":     user_id,
            "trip_data":   itinerary,
            "title":       body.title or trip.get("title"),
            "destination": trip.get("destination"),
            "days":        trip.get("days"),
            "plan_tier":   trip.get("plan_tier"),
            "is_agent":    is_agent,
            "agent_name":  body.agent_name if is_agent else None,
            "views":       0,
        }

        res = supabase.table("shared_trips").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create share")

        # Record it on the trip itself, so reminder/nudge emails link to THIS
        # url and a later ensure_share_slug() sees the link already exists
        # rather than minting a second one. Best-effort: the share itself
        # already succeeded and must not fail on this.
        try:
            supabase.table("trips").update({"share_slug": slug}).eq("id", body.trip_id).execute()
        except Exception as e:
            logger.warning(f"Could not stamp share_slug on trip {body.trip_id}: {e}")

        return {
            "slug": slug,
            "share_url": f"https://tripzio.io/trip/{slug}",
            "short_url": f"tripzio.io/trip/{slug}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create share error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _compute_companion(trip_data: dict, start_date: str, end_date: str):
    """
    Day-awareness for the trip companion view: is this trip happening right
    now, and if so, which day? Returns None outside the trip window (before
    it starts, after it ends, or if either date is missing/unparsable) —
    the frontend falls back to the normal full-itinerary view in that case.
    Never raises — a bad date shouldn't break the whole share page.
    """
    if not start_date or not end_date:
        return None
    try:
        sd = date.fromisoformat(start_date)
        ed = date.fromisoformat(end_date)
        today = today_ist()
        if not (sd <= today <= ed):
            return None
        day_number = (today - sd).days + 1
        day_plans = trip_data.get("day_plans") or []
        today_plan = next((d for d in day_plans if d.get("day") == day_number), None)
        return {"active": True, "day_number": day_number, "today_plan": today_plan}
    except Exception as e:
        logger.warning(f"companion day computation failed: {e}")
        return None


@router.get("/{slug}")
async def get_shared_trip(slug: str):
    """Get a shared trip by slug. Public — no auth required."""
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Database unavailable")

        res = supabase.table("shared_trips") \
            .select("*") \
            .eq("slug", slug) \
            .maybe_single() \
            .execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Trip not found")

        share = res.data

        # Increment view count (best-effort, don't fail if this errors)
        try:
            supabase.table("shared_trips") \
                .update({"views": (share.get("views") or 0) + 1}) \
                .eq("slug", slug) \
                .execute()
        except Exception:
            pass

        # Prefer the live trip over the share-time snapshot, so edits made
        # after sharing actually show up here — this is the whole point of
        # a companion view. Falls back to the snapshot (trip_data, already
        # in `share`) if the live trip is gone or the lookup fails for any
        # reason; the page should never hard-fail just because live data
        # isn't reachable.
        trip_data = share.get("trip_data") or {}
        start_date = None
        end_date = None
        if share.get("trip_id"):
            try:
                live = supabase.table("trips") \
                    .select("itinerary, start_date, end_date") \
                    .eq("id", share["trip_id"]) \
                    .maybe_single().execute()
                if live.data and live.data.get("itinerary"):
                    trip_data = live.data["itinerary"]
                    start_date = live.data.get("start_date")
                    end_date = live.data.get("end_date")
            except Exception as e:
                logger.warning(f"Live trip lookup failed for share {slug}, using snapshot: {e}")

        # Snapshot-only shares (no trip_id, or live lookup found nothing)
        # still carry dates inside the itinerary JSON itself.
        start_date = start_date or trip_data.get("start_date")
        end_date = end_date or trip_data.get("end_date")

        share["trip_data"] = trip_data
        companion = _compute_companion(trip_data, start_date, end_date)
        if companion:
            city = (companion.get("today_plan") or {}).get("city") or trip_data.get("destination", "").split("→")[0].strip()
            try:
                companion["weather"] = await get_weather(city) if city else None
            except Exception as e:
                logger.warning(f"Companion weather fetch failed for share {slug}: {e}")
                companion["weather"] = None
        share["companion"] = companion
        return share

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get shared trip error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
