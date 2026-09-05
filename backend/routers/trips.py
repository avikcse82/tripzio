"""
backend/routers/trips.py
Tripzio Module 3 — My Trips

Synced to project patterns:
- Supabase via: from database import get_supabase_client
- Auth via:     from routers.users import get_current_user
- Error style:  try/except with logger, same as database.py
- save_trip / get_user_trips already exist in database.py — reused here
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Any
from database import (
    get_supabase_client, save_trip, update_trip, get_user_trips,
    get_trip_for_user, get_user_trip_stats, ensure_share_slug,
    count_lifetime_saves, record_trip_save, FREE_SAVE_LIMIT,
)
from routers.users import get_current_user
from core.dates import today_ist
from routers.itinerary import compute_end_date
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trips", tags=["Trips"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SetTripDatesRequest(BaseModel):
    start_date: str  # YYYY-MM-DD


class SaveTripRequest(BaseModel):
    title: str
    from_city: str
    destination: str
    days: int
    travelers: int = 1
    budget: Optional[float] = None
    plan_tier: Optional[str] = "silver"
    itinerary: dict
    weather: Optional[Any] = None
    hotels: Optional[Any] = None
    # If this itinerary was already auto-saved as a draft on generation
    # (see routers/itinerary.py's save_or_replace_draft), its id is echoed
    # back to the frontend as itinerary.trip_id — pass it here so an
    # explicit Save promotes that SAME row instead of inserting a duplicate.
    trip_id: Optional[str] = None


# ─── Free tier limit ───────────────────────────────────────────────────────────

def check_save_limit(user_id: str):
    """Free plan: 3 trips kept, counted for the lifetime of the account.

    Deliberately NOT a live count of locked trips. Deleting a trip is a hard
    delete, so counting current rows let a free user keep 3, delete 1 and
    save another indefinitely — the paywall had a one-click bypass. The
    count now comes from the append-only trip_save_log, which deletion never
    touches. See database.count_lifetime_saves for the schema and the
    backfill that has to run before this ships.
    """
    used = count_lifetime_saves(user_id)
    if used < 0:
        return  # count unavailable — fail open, saving costs us nothing
    if used >= FREE_SAVE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FREE_LIMIT_REACHED",
                # Says the quiet part out loud on purpose: users WILL try
                # deleting to free a slot, and finding out afterwards that it
                # didn't work is exactly the kind of thing that generates
                # angry support mail.
                "message": (
                    f"Your free plan includes {FREE_SAVE_LIMIT} saved trips and you've used all "
                    f"{FREE_SAVE_LIMIT}. Deleting a trip clears it from My Trips but doesn't free "
                    "up a slot. Upgrade to Pro for unlimited saves."
                ),
                "used": used,
                "limit": FREE_SAVE_LIMIT,
                "upgrade_url": "/pricing",
            }
        )


def _find_user_trip(user_id: str, trip_id: str):
    """Fetch a single trip owned by this user, draft or kept."""
    return get_trip_for_user(user_id, trip_id)


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/save", status_code=201)
def save_trip_route(
    body: SaveTripRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])

    trip_data = {
        "user_id": user_id,
        "title": body.title,
        "from_city": body.from_city,
        "destination": body.destination,
        "days": body.days,
        "travelers": body.travelers,
        "budget": body.budget,
        "plan_tier": body.plan_tier,
        "itinerary": body.itinerary,
        "weather": body.weather,
        "hotels": body.hotels,
        "locked": True,
    }

    if body.trip_id:
        existing = _find_user_trip(user_id, body.trip_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Trip not found.")
        # Only counts against the quota when this draft is being promoted —
        # re-saving an already-kept trip is free
        if not existing.get("locked"):
            check_save_limit(user_id)
        saved = update_trip(body.trip_id, user_id, trip_data)
    else:
        check_save_limit(user_id)
        saved = save_trip(trip_data)

    if not saved:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save trip. Please try again."
        )

    # Only after the write actually succeeded — a failed save must never
    # cost the user a slot. Idempotent, so the re-save path above (which
    # skips check_save_limit) can't double-count an already-kept trip.
    record_trip_save(user_id, saved["id"])
    ensure_share_slug(saved["id"])
    return saved


@router.post("/{trip_id}/lock", status_code=200)
def lock_trip_route(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Marks a draft as kept once the user shares/emails/downloads it, so the
    next generated plan won't silently overwrite it. Same quota rules as an
    explicit save — sharing a 4th plan on the free tier just leaves it as an
    (still-viewable) draft rather than failing the share/download itself;
    the frontend calls this fire-and-forget and never blocks on it.
    """
    user_id = str(current_user["id"])
    existing = _find_user_trip(user_id, trip_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if existing.get("locked"):
        return existing

    check_save_limit(user_id)
    updated = update_trip(trip_id, user_id, {"locked": True})
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to lock trip.")
    record_trip_save(user_id, trip_id)
    ensure_share_slug(trip_id)
    return updated


@router.patch("/{trip_id}/dates")
def set_trip_dates(
    trip_id: str,
    body: SetTripDatesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Attach travel dates to a trip that was planned without them.

    Quick Plan has no date field at all and Custom Plan's is optional, so a
    trip can legitimately be saved undated — in which case it silently gets
    no countdown reminders, no festival alerts and no in-trip companion,
    because every one of those keys off start_date. This lets the result
    page offer the date afterwards instead of making the user regenerate.

    Writes the date to both the column and the itinerary JSON: the column is
    what the reminder and nudge queries select on, while the embedded copy is
    what the public share page falls back to and what the PDF renders.
    """
    user_id = str(current_user["id"])

    try:
        start = datetime.strptime(body.start_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Date must be in YYYY-MM-DD format.")

    # today_ist, not the UTC server's date — a traveller setting a date just
    # after midnight in India would otherwise have "today" rejected as past.
    if start < today_ist():
        raise HTTPException(status_code=400, detail="Travel date can't be in the past.")

    trip = _find_user_trip(user_id, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")

    itinerary = trip.get("itinerary") or {}
    if isinstance(itinerary, dict):
        itinerary = {**itinerary, "start_date": body.start_date}

    updated = update_trip(trip_id, user_id, {
        "start_date": body.start_date,
        "end_date": compute_end_date(body.start_date, trip.get("days")),
        "itinerary": itinerary,
    })
    if not updated:
        raise HTTPException(status_code=500, detail="Could not save the travel dates.")

    return {
        "start_date": updated.get("start_date"),
        "end_date": updated.get("end_date"),
        "trip_id": trip_id,
    }


@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    """Live counts for Dashboard stats cards — kept trips only, not drafts."""
    user_id = str(current_user["id"])
    # Stats-only columns — this used to pull every trip's full itinerary JSON
    # just to count rows and sum a days column.
    trips = get_user_trip_stats(user_id, locked_only=True)

    total = len(trips)
    total_days = sum(t.get("days", 0) for t in trips)
    unique_dest = len(set(t.get("destination", "") for t in trips if t.get("destination")))

    return {
        "trips_planned": total,
        "saved_trips": total,
        "destinations": unique_dest,
        "days_travelled": total_days,
    }


@router.get("/")
def list_trips(current_user: dict = Depends(get_current_user)):
    """All KEPT trips for current user, newest first — drafts are excluded."""
    user_id = str(current_user["id"])
    trips = get_user_trips(user_id, locked_only=True)
    return trips


@router.get("/{trip_id}")
def get_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    trip = _find_user_trip(user_id, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip


@router.delete("/{trip_id}", status_code=204)
def delete_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    try:
        client = get_supabase_client()
        if not client:
            raise HTTPException(status_code=500, detail="Database unavailable.")

        response = client.table("trips") \
            .delete() \
            .eq("id", trip_id) \
            .eq("user_id", user_id) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Trip not found.")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting trip: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete trip.")
