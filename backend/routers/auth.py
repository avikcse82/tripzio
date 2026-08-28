from fastapi import APIRouter, HTTPException, status
from datetime import timedelta
from models.schemas import UserRegister, UserLogin, Token, ForgotPasswordRequest, ResetPasswordRequest
from core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token
)
from database import get_user_by_email, create_user, update_user
import hashlib
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


def _password_fingerprint(password_hash: str) -> str:
    """Short digest of the user's CURRENT password hash, embedded in reset
    tokens so they become single-use.

    Without this a reset link stayed valid for its full 30 minutes even after
    it had been used — so anyone who saw that email (a forwarded message, a
    shared device, a synced browser) could reset the password again, after
    the legitimate owner had already set a new one. Changing the password
    changes the hash, which changes this fingerprint, which retires every
    outstanding link for that account at once.
    """
    return hashlib.sha256((password_hash or "").encode()).hexdigest()[:16]


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    """
    Always returns the same generic message whether or not the email is
    registered — never confirm/deny an account's existence (user enumeration).
    """
    user = get_user_by_email(body.email)
    if user:
        reset_token = create_access_token(
            data={
                "sub": user["email"],
                "purpose": "password_reset",
                "pfp": _password_fingerprint(user.get("password")),
            },
            expires_delta=timedelta(minutes=30)
        )
        reset_url = f"https://tripzio.io/reset-password?token={reset_token}"
        try:
            from services.email_service import send_password_reset_email
            await send_password_reset_email(
                to_email=user["email"],
                full_name=user["full_name"],
                reset_url=reset_url
            )
        except Exception as e:
            logger.warning(f"Password reset email failed: {e}")

    return {"message": "If an account exists with that email, we've sent a password reset link."}


@router.post("/reset-password", response_model=Token)
async def reset_password(body: ResetPasswordRequest):
    payload = decode_access_token(body.token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired. Please request a new one."
        )

    user = get_user_by_email(payload.get("sub", ""))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired. Please request a new one."
        )

    # Single-use check — see _password_fingerprint. A link that has already
    # been redeemed (or was superseded by a newer one) no longer matches.
    if payload.get("pfp") != _password_fingerprint(user.get("password")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used or has expired. Please request a new one."
        )

    hashed_password = get_password_hash(body.new_password)
    updated_user = update_user(user["id"], {"password": hashed_password})
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password. Please try again."
        )

    logger.info(f"Password reset for: {updated_user['email']}")

    access_token = create_access_token(data={
        "sub": updated_user["email"],
        "role": updated_user["role"],
        "id": str(updated_user["id"])
    })

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=updated_user["role"],
        full_name=updated_user["full_name"]
    )