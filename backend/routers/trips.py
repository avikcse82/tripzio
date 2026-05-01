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
from database import get_supabase_client, save_trip, get_user_trips
from routers.users import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trips", tags=["Trips"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

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


# ─── Free tier limit ───────────────────────────────────────────────────────────

def check_save_limit(user_id: str):
    """Free plan: max 3 saved trips."""
    try:
        existing = get_user_trips(user_id)
        if len(existing) >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FREE_LIMIT_REACHED",
                    "message": "Free plan allows saving up to 3 trips. Upgrade to Pro for unlimited.",
                    "upgrade_url": "/pricing",
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking save limit: {e}")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/save", status_code=201)
def save_trip_route(
    body: SaveTripRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])

    check_save_limit(user_id)

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
    }

    saved = save_trip(trip_data)
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save trip. Please try again."
        )

    return saved


@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    """Live counts for Dashboard stats cards."""
    user_id = str(current_user["id"])
    trips = get_user_trips(user_id)

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
    """All saved trips for current user, newest first."""
    user_id = str(current_user["id"])
    trips = get_user_trips(user_id)
    return trips


@router.get("/{trip_id}")
def get_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    trips = get_user_trips(user_id)
    trip = next((t for t in trips if str(t.get("id")) == trip_id), None)
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
