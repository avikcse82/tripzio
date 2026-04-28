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


def get_user_trips(user_id: str):
    try:
        client = get_supabase_client()
        if not client:
            return []
        response = client.table("trips").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting trips: {e}")
        return []


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


def update_agent_client(client_id: str, update_data: dict):
    try:
        client = get_supabase_client()
        if not client:
            return None
        response = client.table("agent_clients").update(
            update_data
        ).eq("id", client_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error updating agent client: {e}")
        return None


# Fallback in-memory store if Supabase not connected
fake_users_db = {}