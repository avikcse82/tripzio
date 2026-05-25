from fastapi import APIRouter, HTTPException, status
from models.schemas import UserRegister, UserLogin, Token
from core.security import (
    get_password_hash,
    verify_password,
    create_access_token
)
from database import get_user_by_email, create_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user already exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please login instead."
        )

    # Hash password
    hashed_password = get_password_hash(user_data.password)

    # Build user object
    new_user_data = {
        "full_name": user_data.full_name,
        "email": user_data.email,
        "password": hashed_password,
        "role": user_data.role.value,
        "business_name": user_data.business_name,
        "city": user_data.city,
        "phone": user_data.phone,
    }

    # Save to Supabase
    created_user = create_user(new_user_data)
    if not created_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account. Please try again."
        )

    # Generate token
    access_token = create_access_token(data={
        "sub": created_user["email"],
        "role": created_user["role"],
        "id": str(created_user["id"])
    })

    logger.info(f"New user registered: {created_user['email']}")

    # Send welcome email (non-blocking)
    try:
        import asyncio
        from services.email_service import send_welcome_email
        asyncio.create_task(send_welcome_email(
            to_email=created_user["email"],
            full_name=created_user["full_name"],
            role=created_user["role"]
        ))
    except Exception as _e:
        logger.warning(f"Welcome email failed: {_e}")

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=created_user["role"],
        full_name=created_user["full_name"]
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user
    user = get_user_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email."
        )

    # Verify password
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    # Check if active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact support."
        )

    # Generate token
    access_token = create_access_token(data={
        "sub": user["email"],
        "role": user["role"],
        "id": str(user["id"])
    })

    logger.info(f"User logged in: {user['email']}")

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user["role"],
        full_name=user["full_name"]
    )