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


def ensure_share_slug(trip_id: str) -> str:
    """
    Guarantees a locked trip has a working public share link, even if the
    user never manually clicked Share — reminder emails and the trip
    companion page both depend on trips.share_slug being real, and before
    this existed it was never populated at all (reminders.py's link always
    fell back to the generic homepage). Idempotent: returns the existing
    slug unchanged if one's already there. Fail-open: never raises — a
    failure here should never break the save/lock/payment flow it's
    attached to, it just means that trip won't get a share link this time.
    """
    try:
        client = get_supabase_client()
        if not client:
            return None

        trip_result = client.table("trips").select(
            "share_slug, user_id, title, destination, days, plan_tier, itinerary, is_agent_plan"
        ).eq("id", trip_id).single().execute()
        trip = trip_result.data
        if not trip:
            return None
        if trip.get("share_slug"):
            return trip["share_slug"]

        import random
        import string
        slug = None
        for _ in range(5):
            candidate = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            existing = client.table("shared_trips").select("id").eq("slug", candidate).execute()
            if not existing.data:
                slug = candidate
                break
        if not slug:
            logger.warning(f"ensure_share_slug: could not generate a unique slug for trip {trip_id}")
            return None

        client.table("shared_trips").insert({
            "slug": slug,
            "trip_id": trip_id,
            "user_id": trip.get("user_id"),
            "trip_data": trip.get("itinerary") or {},
            "title": trip.get("title"),
            "destination": trip.get("destination"),
            "days": trip.get("days"),
            "plan_tier": trip.get("plan_tier"),
            "is_agent": bool(trip.get("is_agent_plan")),
            "agent_name": None,
            "views": 0,
        }).execute()

        client.table("trips").update({"share_slug": slug}).eq("id", trip_id).execute()
        return slug
    except Exception as e:
        logger.warning(f"ensure_share_slug failed for trip {trip_id}: {e}")
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


def get_user_trips(user_id: str, locked_only: bool = False, limit: int = None):
    try:
        client = get_supabase_client()
        if not client:
            return []
        query = client.table("trips").select("*").eq("user_id", user_id)
        if locked_only:
            query = query.eq("locked", True)
        query = query.order("created_at", desc=True)
        if limit:
            query = query.limit(limit)
        response = query.execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting trips: {e}")
        return []


def get_trip_for_user(user_id: str, trip_id: str):
    """One trip by id, scoped to its owner — a single indexed lookup.

    Callers used to do this by pulling EVERY trip the user owns (each with
    its full itinerary JSON) and scanning in Python for a matching id. That
    ran on the hot path of save, lock, share-create and payment-order, so a
    user with 20 saved trips shipped 20 full itineraries across the wire to
    find one row.
    """
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("trips").select("*").eq(
            "id", trip_id
        ).eq("user_id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error getting trip {trip_id} for user: {e}")
        return None


def get_user_trip_stats(user_id: str, locked_only: bool = False):
    """Columns needed for the stats cards only — never the itinerary blob."""
    try:
        client = get_supabase_client()
        if not client:
            return []
        query = client.table("trips").select("id, days, destination, status").eq("user_id", user_id)
        if locked_only:
            query = query.eq("locked", True)
        return query.execute().data or []
    except Exception as e:
        logger.error(f"Error getting trip stats: {e}")
        return []


def get_user_trip_status_counts(user_id: str):
    """Counts-only version of get_user_trips for dashboard stats — selects
    id+status instead of every trip's full itinerary blob (which can be
    tens of KB each), since the dashboard only ever counts them."""
    try:
        client = get_supabase_client()
        if not client:
            return []
        response = client.table("trips").select("id, status").eq("user_id", user_id).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting trip status counts: {e}")
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


def get_agent_client_by_id(client_id: str):
    """Fetch a single client row by id, unscoped by agent — used at trip
    generation time to pull the client's name/email onto the trip row.
    Callers already know the client_id came from that agent's own request,
    so this doesn't re-check ownership; it's not exposed as an API route."""
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("agent_clients").select("*").eq("id", client_id).single().execute()
        return response.data
    except Exception as e:
        logger.warning(f"get_agent_client_by_id failed for {client_id}: {e}")
        return None


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


# ── Free-plan save quota ──────────────────────────────────────────────────
# Counted from an append-only log rather than from a live COUNT of kept
# trips, because DELETE /trips/{id} is a hard delete: counting current rows
# meant a free user could keep 3, delete 1, save another, forever — the
# paywall had a one-click escape hatch. The log is never touched by trip
# deletion, so deleting still tidies My Trips but no longer refunds a slot.
#
# UNIQUE (user_id, trip_id) is what makes this safe to call from every
# promote-to-kept path without auditing them: re-saving or re-locking the
# same trip conflicts and is ignored, so a trip can only ever be counted
# once no matter how many times it's saved.
#
# Run ALL THREE parts of this SQL in Supabase BEFORE deploying. Each part
# has bitten once already:
#
#   CREATE TABLE IF NOT EXISTS trip_save_log (
#       id BIGSERIAL PRIMARY KEY,
#       user_id TEXT NOT NULL,
#       trip_id TEXT NOT NULL,
#       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
#       UNIQUE (user_id, trip_id)
#   );
#   CREATE INDEX IF NOT EXISTS idx_trip_save_log_user ON trip_save_log (user_id);
#
#   -- (2) The backend connects with the ANON key, not service_role, so RLS
#   -- applies to it. Created with RLS on and no policy, inserts are rejected
#   -- AND selects quietly return an empty set — the count reads 0 for
#   -- everyone and the limit never fires, with nothing in the logs. This
#   -- matches how generation_log is already configured.
#   ALTER TABLE trip_save_log DISABLE ROW LEVEL SECURITY;
#
#   -- (3) Backfill. Skip it and every existing user's counter starts at 0,
#   -- handing them all 3 fresh slots.
#   INSERT INTO trip_save_log (user_id, trip_id, created_at)
#   SELECT user_id::text, id::text, COALESCE(created_at, NOW())
#   FROM trips WHERE locked = true
#   ON CONFLICT (user_id, trip_id) DO NOTHING;
FREE_SAVE_LIMIT = 3


def count_lifetime_saves(user_id: str) -> int:
    """How many distinct trips this user has ever kept. Returns -1 if the
    count can't be established, which callers treat as "don't block" —
    saving costs us nothing (no AI call), so a metering outage should never
    stop a paying-or-not user from keeping their own trip. Same fail-open
    stance as check_generation_limit, where the real cost cap lives."""
    try:
        client = get_supabase_client()
        if not client:
            return -1
        response = client.table("trip_save_log").select(
            "id", count="exact"
        ).eq("user_id", user_id).execute()
        return response.count or 0
    except Exception as e:
        # ERROR, not warning: while this is failing the save paywall is
        # effectively off for everyone. Most likely cause is deploying the
        # code before creating trip_save_log — see the SQL above.
        logger.error(f"lifetime save count failed — SAVE LIMIT NOT ENFORCED: {e}")
        return -1


def record_trip_save(user_id: str, trip_id: str) -> None:
    """Records that this trip was kept. Idempotent via UNIQUE(user_id,
    trip_id) — a duplicate insert conflicts, which is the expected path when
    an already-kept trip is re-saved. Never raises: a metering failure must
    not break the user's save.

    Only a duplicate is benign. Anything else (permissions, RLS, missing
    table) means saves are silently not being counted, and because a
    SELECT blocked by RLS returns an empty set rather than an error, the
    count would read 0 for everyone and the limit would never fire — with
    nothing in the logs to say so. That exact situation happened on first
    setup: the table was created with RLS on and no policy, so inserts were
    rejected while reads quietly returned nothing. Hence: duplicates at
    debug, everything else at ERROR, so this is loud the first time a save
    is recorded rather than silently disabling the paywall.
    """
    try:
        client = get_supabase_client()
        if not client:
            return
        client.table("trip_save_log").insert(
            {"user_id": user_id, "trip_id": str(trip_id)}
        ).execute()
    except Exception as e:
        msg = str(e).lower()
        is_duplicate = "duplicate key" in msg or "23505" in msg or "already exists" in msg
        if is_duplicate:
            logger.debug(f"trip already counted, not double-charging: {trip_id}")
        else:
            logger.error(
                f"SAVE NOT COUNTED — save limit is not being enforced. "
                f"user={user_id} trip={trip_id}: {e}"
            )