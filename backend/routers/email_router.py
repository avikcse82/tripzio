# backend/routers/email_router.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.email_service import send_itinerary_email
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security
from core.security import decode_access_token
from database import get_user_by_email

security = HTTPBearer()

def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_email(payload.get("sub"))
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="User not found")
    return user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email", tags=["Email"])


class SendItineraryRequest(BaseModel):
    to_email: str
    itinerary: dict
    client_name: Optional[str] = ""
    reply_to: Optional[str] = ""


@router.post("/send-itinerary")
async def send_itinerary(
    req: SendItineraryRequest,
    current_user: dict = Depends(get_current_user_from_token)
):
    agent_name = current_user.get("full_name", "")
    reply_to = req.reply_to or current_user.get("email", "")

    result = await send_itinerary_email(
        to_email=req.to_email,
        itinerary_data=req.itinerary,
        client_name=req.client_name,
        agent_name=agent_name,
        reply_to=reply_to
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))

    return {"message": "Itinerary sent successfully", "email_id": result.get("id")}
