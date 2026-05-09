"""
backend/routers/agents.py
Tripzio Week 3 — Agent Profile + Client Notes added
Synced to: get_supabase() local, get_current_agent from JWT sub/user_id
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.security import decode_access_token
from core.config import settings
from supabase import create_client
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["Agents"])
security = HTTPBearer()

def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_current_agent(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "agent":
        raise HTTPException(status_code=403, detail="Agent access only")
    return payload


# ─── Schemas ──────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    phone: str
    city: str

class ClientUpdate(BaseModel):
    status: Optional[str] = None
    trip_requirement: Optional[str] = None
    notes: Optional[str] = None

class ProfileUpsert(BaseModel):
    business_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None
    brand_color: Optional[str] = None
    whatsapp_number: Optional[str] = None
    tagline: Optional[str] = None


# ─── Agent Profile ────────────────────────────────────────────

@router.get("/profile")
async def get_profile(agent=Depends(get_current_agent)):
    try:
        supabase = get_supabase()
        agent_id = agent.get("sub") or agent.get("user_id")
        res = supabase.table("agent_profiles") \
            .select("*") \
            .eq("agent_id", str(agent_id)) \
            .maybe_single() \
            .execute()
        if res.data:
            return {"profile": res.data}
        # Return empty profile with defaults so frontend never crashes
        return {"profile": {
            "agent_id": str(agent_id),
            "business_name": None,
            "contact_phone": None,
            "contact_email": None,
            "city": None,
            "logo_url": None,
            "brand_color": "#0d9488",
            "whatsapp_number": None,
            "tagline": None,
        }}
    except Exception as e:
        logger.error(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")


@router.patch("/profile")
async def upsert_profile(data: ProfileUpsert, agent=Depends(get_current_agent)):
    try:
        supabase = get_supabase()
        agent_id = str(agent.get("sub") or agent.get("user_id"))

        # Filter out None values
        updates = {k: v for k, v in data.dict().items() if v is not None}
        updates["agent_id"] = agent_id

        # Upsert — insert if not exists, update if exists
        res = supabase.table("agent_profiles") \
            .upsert(updates, on_conflict="agent_id") \
            .execute()

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save profile")

        return {"success": True, "profile": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upsert profile error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {str(e)}")


# ─── Clients ──────────────────────────────────────────────────

@router.get("/clients")
async def get_clients(agent=Depends(get_current_agent)):
    try:
        supabase = get_supabase()
        agent_id = agent.get("sub") or agent.get("user_id")
        response = supabase.table("agent_clients") \
            .select("*") \
            .eq("agent_id", agent_id) \
            .order("created_at", desc=True) \
            .execute()
        clients = response.data or []
        formatted = []
        for c in clients:
            formatted.append({
                "id": c["id"],
                "name": c["name"],
                "phone": c["phone"],
                "city": c["city"],
                "trip": c.get("trip_requirement") or "Not planned yet",
                "status": c.get("status") or "pending",
                "notes": c.get("notes") or "",
                "date": format_date(c.get("created_at")),
                "avatar_color": get_avatar_color(c["name"]),
            })
        return {"clients": formatted, "total": len(formatted)}
    except Exception as e:
        logger.error(f"Get clients error: {e}")
        return {"clients": [], "total": 0}


@router.post("/clients")
async def add_client(data: ClientCreate, agent=Depends(get_current_agent)):
    try:
        supabase = get_supabase()
        agent_id = agent.get("sub") or agent.get("user_id")

        if not data.name.strip():
            raise HTTPException(status_code=400, detail="Client name is required")
        if not data.phone.strip():
            raise HTTPException(status_code=400, detail="Phone is required")
        if not data.city.strip():
            raise HTTPException(status_code=400, detail="City is required")

        insert_data = {
            "agent_id": str(agent_id),
            "name": data.name.strip(),
            "phone": data.phone.strip(),
            "city": data.city.strip(),
            "status": "pending",
            "notes": "",
        }

        response = supabase.table("agent_clients").insert(insert_data).execute()
        client = response.data[0]

        return {
            "success": True,
            "client": {
                "id": client["id"],
                "name": client["name"],
                "phone": client["phone"],
                "city": client["city"],
                "trip": "Not planned yet",
                "status": "pending",
                "notes": "",
                "date": "Just now",
                "avatar_color": get_avatar_color(client["name"]),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add client error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add client: {str(e)}")


@router.patch("/clients/{client_id}")
async def update_client(client_id: str, data: ClientUpdate, agent=Depends(get_current_agent)):
    try:
        supabase = get_supabase()
        agent_id = agent.get("sub") or agent.get("user_id")
        existing = supabase.table("agent_clients") \
            .select("id") \
            .eq("id", client_id) \
            .eq("agent_id", str(agent_id)) \
            .execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Client not found")
        updates = {k: v for k, v in data.dict().items() if v is not None}
        if updates:
            supabase.table("agent_clients").update(updates).eq("id", client_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update client error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update client")


@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, agent=Depends(get_current_agent)):
    try:
        supabase = get_supabase()
        agent_id = agent.get("sub") or agent.get("user_id")
        existing = supabase.table("agent_clients") \
            .select("id") \
            .eq("id", client_id) \
            .eq("agent_id", str(agent_id)) \
            .execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Client not found")
        supabase.table("agent_clients").delete().eq("id", client_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete client error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete client")


# ─── Helpers ──────────────────────────────────────────────────

def format_date(iso_string):
    if not iso_string:
        return "Recently"
    try:
        from datetime import datetime, timezone
        dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        if diff.days == 0:
            if diff.seconds < 3600:
                mins = diff.seconds // 60
                return "Just now" if mins < 2 else f"{mins} mins ago"
            return f"{diff.seconds // 3600}h ago"
        if diff.days == 1:
            return "Yesterday"
        if diff.days < 7:
            return f"{diff.days} days ago"
        return dt.strftime("%d %b %Y")
    except:
        return "Recently"

def get_avatar_color(name: str) -> str:
    colors = [
        "linear-gradient(135deg,#0d9488,#0ea5e9)",
        "linear-gradient(135deg,#8b5cf6,#6d28d9)",
        "linear-gradient(135deg,#f59e0b,#d97706)",
        "linear-gradient(135deg,#ef4444,#dc2626)",
        "linear-gradient(135deg,#22c55e,#16a34a)",
        "linear-gradient(135deg,#ec4899,#db2777)",
    ]
    idx = sum(ord(c) for c in name) % len(colors)
    return colors[idx]
