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
from database import get_supabase_client
from routers.users import get_current_user
from routers.trips import _find_user_trip
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

        slug = get_unique_slug(supabase)
        itinerary = trip.get("itinerary") or {}
        is_agent = current_user.get("role") == "agent"

        payload = {
            "slug":        slug,
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


@router.get("/{slug}")
def get_shared_trip(slug: str):
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

        # Increment view count (best-effort, don't fail if this errors)
        try:
            supabase.table("shared_trips") \
                .update({"views": (res.data.get("views") or 0) + 1}) \
                .eq("slug", slug) \
                .execute()
        except Exception:
            pass

        return res.data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get shared trip error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
