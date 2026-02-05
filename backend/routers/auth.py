"""Authentication router - handles user login, password reset, and user management"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import uuid
import secrets
import os

from models.schemas import (
    UserLogin, UserResponse, TokenResponse, ProfileUpdate, PasswordChange,
    PasswordResetRequest, PasswordResetConfirm, UserCreate, UserUpdate, AuthHealthResponse
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

supabase = None
JWT_SECRET = None

def init_auth(supabase_client, jwt_secret):
    global supabase, JWT_SECRET
    supabase = supabase_client
    JWT_SECRET = jwt_secret

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def parse_datetime(dt_value) -> datetime:
    if isinstance(dt_value, datetime):
        return dt_value
    if isinstance(dt_value, str):
        return datetime.fromisoformat(dt_value.replace('Z', '+00:00'))
    return datetime.now(timezone.utc)

def user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user.get("role", "staff"),
        is_active=user.get("is_active", True),
        created_at=parse_datetime(user["created_at"])
    )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    # Handle bypass token for open access mode
    if token == "bypass-token":
        return {
            "id": "bypass-user",
            "email": "staff@illinoisestatelaw.com",
            "name": "Staff User",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="User not found")

        user = result.data
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")

        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    try:
        result = supabase.table("users").select("*").eq("email", credentials.email.lower()).maybe_single().execute()
    except Exception as e:
        print(f"[AUTH] Supabase query error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service error")

    if not result or not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data

    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")

    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["email"], user.get("role", "staff"))

    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)


@router.patch("/profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.name is not None:
        updates["name"] = data.name

    supabase.table("users").update(updates).eq("id", current_user["id"]).execute()

    result = supabase.table("users").select("*").eq("id", current_user["id"]).maybe_single().execute()

    return {"success": True, "user": user_to_response(result.data)}


@router.post("/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    supabase.table("users").update({
        "password_hash": hash_password(data.new_password),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", current_user["id"]).execute()

    return {"success": True, "message": "Password changed successfully"}


@router.post("/password-reset/request")
async def request_password_reset(data: PasswordResetRequest):
    result = supabase.table("users").select("*").eq("email", data.email.lower()).maybe_single().execute()

    if result.data:
        user = result.data
        if user.get("is_active", True):
            reset_token = secrets.token_urlsafe(32)
            expires = datetime.now(timezone.utc) + timedelta(hours=1)

            supabase.table("users").update({
                "password_reset_token": reset_token,
                "password_reset_expires": expires.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", user["id"]).execute()

    return {
        "success": True,
        "message": "If an account exists with this email, a reset link has been generated"
    }


@router.get("/password-reset/token/{token}")
async def get_reset_token_info(token: str):
    result = supabase.table("users").select("email, password_reset_expires").eq("password_reset_token", token).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = result.data
    expires = parse_datetime(user.get("password_reset_expires"))

    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    return {"valid": True, "email": user["email"]}


@router.post("/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    result = supabase.table("users").select("*").eq("password_reset_token", data.token).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = result.data
    expires = parse_datetime(user.get("password_reset_expires"))

    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    supabase.table("users").update({
        "password_hash": hash_password(data.new_password),
        "password_reset_token": None,
        "password_reset_expires": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user["id"]).execute()

    return {"success": True, "message": "Password has been reset successfully"}


@router.get("/check-role")
async def check_role(current_user: dict = Depends(get_current_user)):
    return {"role": current_user.get("role", "staff"), "is_admin": current_user.get("role") == "admin"}


@router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(require_admin)):
    result = supabase.table("users").select("*").order("created_at", desc=True).execute()

    return {
        "users": [user_to_response(u) for u in result.data]
    }


@router.post("/admin/users", response_model=UserResponse)
async def create_user(data: UserCreate, current_user: dict = Depends(require_admin)):
    existing = supabase.table("users").select("id").eq("email", data.email.lower()).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    new_user = {
        "id": user_id,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "is_active": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    supabase.table("users").insert(new_user).execute()

    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    return user_to_response(result.data)


@router.patch("/admin/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(require_admin)):
    existing = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    if user_id == current_user["id"] and data.role == "staff":
        raise HTTPException(status_code=400, detail="Cannot demote your own account")

    if user_id == current_user["id"] and data.is_active == False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.name is not None:
        updates["name"] = data.name
    if data.role is not None:
        updates["role"] = data.role
    if data.is_active is not None:
        updates["is_active"] = data.is_active

    supabase.table("users").update(updates).eq("id", user_id).execute()

    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    return user_to_response(result.data)


@router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, current_user: dict = Depends(require_admin)):
    existing = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    reset_token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=24)

    supabase.table("users").update({
        "password_reset_token": reset_token,
        "password_reset_expires": expires.isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_id).execute()

    return {
        "success": True,
        "reset_token": reset_token,
        "expires": expires.isoformat(),
        "message": "Password reset token generated. Share this with the user securely."
    }


@router.get("/health", response_model=AuthHealthResponse)
async def auth_health(current_user: Optional[dict] = Depends(get_current_user_optional)):
    required_vars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "JWT_SECRET"]

    present = []
    missing = []
    for var in required_vars:
        if os.environ.get(var):
            present.append(var)
        else:
            missing.append(var)

    provider_connected = False
    try:
        result = supabase.table("users").select("id").limit(1).execute()
        provider_connected = True
    except Exception:
        pass

    return AuthHealthResponse(
        auth_provider_connected=provider_connected,
        env_vars_present=present,
        env_vars_missing=missing,
        current_user=user_to_response(current_user) if current_user else None
    )


@router.post("/seed-admin")
async def seed_admin():
    """Create initial admin user if no users exist. Only works when database is empty."""
    existing = supabase.table("users").select("id").limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Users already exist. Seed is only for initial setup.")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    admin_user = {
        "id": user_id,
        "email": "admin@illinoisestatelaw.com",
        "password_hash": hash_password("AdminPass123!"),
        "name": "Administrator",
        "role": "admin",
        "is_active": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    supabase.table("users").insert(admin_user).execute()

    return {
        "success": True,
        "message": "Admin user created",
        "credentials": {
            "email": "admin@illinoisestatelaw.com",
            "password": "AdminPass123!"
        }
    }
