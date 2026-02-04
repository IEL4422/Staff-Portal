"""Authentication router - handles user registration, login, profile management"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import uuid
import os

from models.schemas import UserRegister, UserLogin, UserResponse, TokenResponse, ProfileUpdate, PasswordChange

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()

# These will be set by the main server
supabase = None
JWT_SECRET = None

def init_auth(supabase_client, jwt_secret):
    """Initialize auth router with Supabase client and JWT secret"""
    global supabase, JWT_SECRET
    supabase = supabase_client
    JWT_SECRET = jwt_secret

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token and return the current user"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=401, detail="User not found")

        return result.data[0]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    result = supabase.table("users").select("*").eq("email", user_data.email.lower()).execute()
    if result.data and len(result.data) > 0:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    user = {
        "id": user_id,
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    supabase.table("users").insert(user).execute()

    token = create_token(user_id, user_data.email.lower())

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email.lower(),
            name=user_data.name,
            created_at=now
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password"""
    result = supabase.table("users").select("*").eq("email", credentials.email.lower()).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data[0]

    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["email"])

    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=created_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )


@router.patch("/profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    updates = {}

    if data.name is not None:
        updates["name"] = data.name

    if data.email is not None:
        result = supabase.table("users").select("*").eq("email", data.email.lower()).neq("id", current_user["id"]).execute()
        if result.data and len(result.data) > 0:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = data.email.lower()

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        supabase.table("users").update(updates).eq("id", current_user["id"]).execute()

    result = supabase.table("users").select("*").eq("id", current_user["id"]).execute()
    updated_user = result.data[0]

    created_at = updated_user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00')).isoformat()

    return {
        "success": True,
        "user": {
            "id": updated_user["id"],
            "email": updated_user["email"],
            "name": updated_user["name"],
            "created_at": created_at
        }
    }


@router.post("/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change user password"""
    if not verify_password(data.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    supabase.table("users").update({
        "password_hash": hash_password(data.new_password),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", current_user["id"]).execute()

    return {"success": True, "message": "Password changed successfully"}


@router.get("/check-admin")
async def check_admin(current_user: dict = Depends(get_current_user)):
    """Check if user is admin"""
    return {"is_admin": current_user.get("is_admin", False)}


@router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    result = supabase.table("users").select("*").execute()

    return {
        "users": [
            {
                "id": u["id"],
                "email": u["email"],
                "name": u["name"],
                "created_at": u["created_at"],
                "is_admin": u.get("is_admin", False)
            }
            for u in result.data
        ]
    }


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user (admin only)"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = supabase.table("users").delete().eq("id", user_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, "message": "User deleted"}
