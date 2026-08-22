from supabase import create_client, Client
from core.config import settings
import logging

logger = logging.getLogger(__name__)

supabase: Client = None


def get_supabase_client() -> Client:
    global supabase
    if supabase is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            logger.warning("Supabase credentials not set")
            return None
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return supabase


def get_user_by_email(email: str):
    try:
        client = get_supabase_client()
        if not client:
            return fake_users_db.get(email)
        response = client.table("users").select("*").eq(
            "email", email
        ).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting user by email: {e}")
        return None


def get_user_by_id(user_id: str):
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("users").select("*").eq(
            "id", user_id
        ).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting user by id: {e}")
        return None


def create_user(user_data: dict):
    try:
        client = get_supabase_client()
        if not client:
            fake_users_db[user_data["email"]] = user_data
            return user_data
        insert_data = {
            "full_name": user_data["full_name"],
            "email": user_data["email"],
            "password": user_data["password"],
            "role": user_data["role"],
            "business_name": user_data.get("business_name"),
            "city": user_data.get("city"),
            "phone": user_data.get("phone"),
        }
        response = client.table("users").insert(insert_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return None


def update_user(user_id: str, update_data: dict):
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("users").update(
            update_data
        ).eq("id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        return None


def save_trip(trip_data: dict):
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("trips").insert(trip_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error saving trip: {e}")
        return None


def update_trip(trip_id: str, user_id: str, trip_data: dict):
    """Update an existing trip row, scoped to its owner. Returns the updated row or None."""
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("trips").update(trip_data).eq(
            "id", trip_id
        ).eq("user_id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error updating trip: {e}")
        return None


def get_unlocked_draft(user_id: str):
    """Most recent auto-saved-but-not-yet-kept trip for this user, if any."""
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("trips").select("*").eq(
            "user_id", user_id
        ).eq("locked", False).order("created_at", desc=True).limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting unlocked draft: {e}")
        return None


def save_or_replace_draft(user_id: str, trip_data: dict):
    """
    Auto-save on generation. If the user already has an unlocked draft (a
    generation they never saved/shared/downloaded), overwrite it in place
    instead of inserting a new row — so exploring/regenerating doesn't pile
    up rows in "My Trips" or burn the free-plan save quota. A draft becomes
    permanent (and stops being overwritten) once the user explicitly saves
    it or shares/emails/downloads it — see routers/trips.py's /save and
    /{trip_id}/lock routes.
    """
    trip_data = {**trip_data, "locked": False}
    draft = get_unlocked_draft(user_id)
    if draft:
        return update_trip(draft["id"], user_id, trip_data)
    return save_trip(trip_data)


def get_user_trips(user_id: str, locked_only: bool = False):
    try:
        client = get_supabase_client()
        if not client:
            return []
        query = client.table("trips").select("*").eq("user_id", user_id)
        if locked_only:
            query = query.eq("locked", True)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting trips: {e}")
        return []


def create_payment(payment_data: dict):
    """Insert a new payment row (status='created') right after a Razorpay Order is created."""
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("payments").insert(payment_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error creating payment: {e}")
        return None


def get_payment_by_order_id(order_id: str):
    """Look up a payment row by its Razorpay order_id — used by both /payments/verify
    (idempotency check) and the webhook (to find which trip/user to unlock)."""
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("payments").select("*").eq(
            "razorpay_order_id", order_id
        ).single().execute()
        return response.data
    except Exception as e:
        logger.warning(f"Payment lookup failed for order {order_id}: {e}")
        return None


def update_payment(order_id: str, update_data: dict):
    """Update a payment row by order_id (not id) — that's the value both the frontend
    checkout callback and the webhook actually have on hand."""
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("payments").update(update_data).eq(
            "razorpay_order_id", order_id
        ).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error updating payment: {e}")
        return None


def save_agent_client(client_data: dict):
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table(
            "agent_clients"
        ).insert(client_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error saving agent client: {e}")
        return None


def get_agent_clients(agent_id: str):
    try:
        client = get_supabase_client()
        if not client:
            return []
        response = client.table("agent_clients").select("*").eq(
            "agent_id", agent_id
        ).order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting agent clients: {e}")
        return []


def update_agent_client(client_id: str, agent_id: str, update_data: dict):
    """Scoped to the owning agent — without this filter any authenticated
    agent could update any other agent's client row just by knowing/guessing
    its id. See routers/users.py's update_client_status."""
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("agent_clients").update(
            update_data
        ).eq("id", client_id).eq("agent_id", agent_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error updating agent client: {e}")
        return None


# Fallback in-memory store if Supabase not connected
fake_users_db = {}


def check_guest_rate_limit(ip_address: str) -> bool:
    """
    Returns True if this IP is allowed to generate (under limit).
    1 generation per IP per 24 hours.
    Fail-open: if DB check fails for any reason, allow the request.

    Run this SQL in Supabase before deploying:
    CREATE TABLE IF NOT EXISTS guest_rate_limits (
        ip_address TEXT PRIMARY KEY,
        last_generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """
    try:
        client = get_supabase_client()
        if not client:
            return True  # fail-open
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        response = client.table("guest_rate_limits") \
            .select("last_generated_at") \
            .eq("ip_address", ip_address) \
            .execute()
        if not response.data:
            return True  # no record — first time, allow
        record = response.data[0]
        last = record.get("last_generated_at", "")
        if not last or last < cutoff:
            return True  # last generation was > 24 hours ago, allow
        return False  # within 24 hours, block
    except Exception as e:
        logger.warning(f"guest rate limit check failed (fail-open): {e}")
        return True  # fail-open — never block on our error


def record_guest_generation(ip_address: str) -> None:
    """
    Records a guest generation for this IP.
    Upserts into guest_rate_limits table.
    Fail-silent: never raises.
    """
    try:
        client = get_supabase_client()
        if not client:
            return
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        client.table("guest_rate_limits").upsert({
            "ip_address": ip_address,
            "last_generated_at": now,
        }, on_conflict="ip_address").execute()
    except Exception as e:
        logger.warning(f"guest rate limit record failed (silent): {e}")


# ── Authenticated generation cap ──────────────────────────────────────────
# The 3-free-trips cap (check_save_limit in routers/trips.py) only gates
# SAVING — /generate, /generate-custom, and /itinerary/edit trigger a real
# paid Claude API call regardless of save status, with no limit tied to that
# cost at all. This closes that gap: a per-account rolling-24h cap, separate
# from and in addition to the save cap, so a single account can't be looped
# to run up an unbounded AI bill.
GENERATION_DAILY_LIMIT = 12


def check_generation_limit(user_id: str) -> bool:
    """
    Returns True if this user is under today's generation cap.
    Rolling 24h window, counted from generation_log rows.
    Fail-open: if the DB check fails for any reason, allow the request —
    a metering outage should never block a legitimate generation, only
    catch real abuse when the DB is healthy.

    Run this SQL in Supabase before deploying:
    CREATE TABLE IF NOT EXISTS generation_log (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_generation_log_user_created
        ON generation_log (user_id, created_at DESC);
    """
    try:
        client = get_supabase_client()
        if not client:
            return True  # fail-open
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        response = client.table("generation_log").select("id", count="exact").eq(
            "user_id", user_id
        ).gte("created_at", cutoff).execute()
        return (response.count or 0) < GENERATION_DAILY_LIMIT
    except Exception as e:
        logger.warning(f"generation limit check failed (fail-open): {e}")
        return True  # fail-open — never block on our error


def record_generation(user_id: str) -> None:
    """Records one generation event for this user. Fail-silent: never raises,
    a logging failure should never surface as a user-facing error."""
    try:
        client = get_supabase_client()
        if not client:
            return
        client.table("generation_log").insert({"user_id": user_id}).execute()
    except Exception as e:
        logger.warning(f"generation log record failed (silent): {e}")