from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import UserResponse
from core.security import decode_access_token
from database import (
    get_user_by_email,
    get_user_by_id,
    get_user_trips,
    get_agent_clients,
    save_agent_client,
    update_agent_client
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please login again."
        )
    user_id = payload.get("id")
    email = payload.get("sub")

    # Try by ID first then email
    user = get_user_by_id(user_id) if user_id else None
    if not user:
        user = get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    return user


def require_agent(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "agent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent access required."
        )
    return current_user


def require_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User access required."
        )
    return current_user


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: dict = Depends(get_current_user)
):
    return UserResponse(**current_user)


@router.get("/dashboard/user")
async def user_dashboard(
    current_user: dict = Depends(get_current_user)
):
    trips = get_user_trips(str(current_user["id"]))
    return {
        "message": f"Welcome to Tripzio, {current_user['full_name']}!",
        "role": current_user["role"],
        "stats": {
            "trips_planned": len(trips),
            "saved_trips": len([t for t in trips if t.get("status") == "saved"]),
            "completed_trips": len([t for t in trips if t.get("status") == "completed"]),
        },
        "recent_trips": trips[:5]
    }


@router.get("/dashboard/agent")
async def agent_dashboard(
    current_user: dict = Depends(require_agent)
):
    clients = get_agent_clients(str(current_user["id"]))
    return {
        "message": f"Welcome back, {current_user['full_name']}!",
        "role": current_user["role"],
        "business": current_user.get("business_name"),
        "city": current_user.get("city"),
        "stats": {
            "total_clients": len(clients),
            "pending": len([c for c in clients if c.get("status") == "pending"]),
            "confirmed": len([c for c in clients if c.get("status") == "confirmed"]),
            "completed": len([c for c in clients if c.get("status") == "completed"]),
        },
        "recent_clients": clients[:5]
    }


@router.post("/agent/clients")
async def add_agent_client(
    client_data: dict,
    current_user: dict = Depends(require_agent)
):
    if not client_data.get("client_name"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client name is required."
        )
    if not client_data.get("phone"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required."
        )

    new_client = {
        "agent_id": str(current_user["id"]),
        "client_name": client_data["client_name"],
        "phone": client_data["phone"],
        "city": client_data.get("city", ""),
        "trip_requirement": client_data.get("trip_requirement", ""),
        "status": "pending",
        "notes": client_data.get("notes", "")
    }

    saved = save_agent_client(new_client)
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save client. Please try again."
        )
    return {"message": "Client added successfully", "client": saved}


@router.get("/agent/clients")
async def get_my_clients(
    current_user: dict = Depends(require_agent)
):
    clients = get_agent_clients(str(current_user["id"]))
    return {"clients": clients, "total": len(clients)}


@router.patch("/agent/clients/{client_id}")
async def update_client_status(
    client_id: str,
    update_data: dict,
    current_user: dict = Depends(require_agent)
):
    allowed_fields = ["status", "notes", "trip_requirement"]
    filtered = {k: v for k, v in update_data.items() if k in allowed_fields}
    if not filtered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update."
        )
    updated = update_agent_client(client_id, filtered)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update client."
        )
    return {"message": "Client updated successfully", "client": updated}