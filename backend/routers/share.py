"""
backend/routers/share.py
Tripzio Module 4A — Trip Sharing

Synced to project patterns:
- Supabase via: from database import get_supabase_client
- Auth via: from routers.users import get_current_user (optional — share is public read)
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Any
from database import get_supabase_client
from core.security import decode_access_token
import random
import string
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/share", tags=["Share"])
security = HTTPBearer(auto_error=False)

# ─── Auth (optional — for creating shares) ────────────────────

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        return payload
    except Exception:
        return None


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
    trip_data: dict
    title: Optional[str] = None
    destination: Optional[str] = None
    days: Optional[int] = None
    plan_tier: Optional[str] = None
    is_agent: Optional[bool] = False
    agent_name: Optional[str] = None


# ─── Routes ───────────────────────────────────────────────────

@router.post("/create")
def create_share(
    body: CreateShareRequest,
    user=Depends(get_optional_user)
):
    """Create a shareable link for a trip. Auth optional."""
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Database unavailable")

        slug = get_unique_slug(supabase)
        user_id = str(user.get("sub") or user.get("id") or "anonymous") if user else "anonymous"

        payload = {
            "slug":        slug,
            "user_id":     user_id,
            "trip_data":   body.trip_data,
            "title":       body.title,
            "destination": body.destination,
            "days":        body.days,
            "plan_tier":   body.plan_tier,
            "is_agent":    body.is_agent or False,
            "agent_name":  body.agent_name,
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
