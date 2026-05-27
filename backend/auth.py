"""
LegacyLift — Authentication
JWT-based signup/login with bcrypt password hashing and tier-based usage limits.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

from database import get_db

SECRET_KEY = os.getenv("JWT_SECRET", "legacylift-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

TIER_LIMITS = {
    "free": 5,
    "pro": 100,
    "enterprise": 10000,
}


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserInfo(BaseModel):
    id: int
    email: str
    tier: str
    daily_usage: int
    daily_limit: int


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: int, email: str, tier: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "tier": tier, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


async def get_current_user(request: Request) -> UserInfo:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header[7:]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="User not found")

        tier = row["tier"]
        return UserInfo(
            id=row["id"],
            email=row["email"],
            tier=tier,
            daily_usage=row["daily_usage"],
            daily_limit=TIER_LIMITS.get(tier, 5),
        )
    finally:
        await db.close()


async def check_usage_limit(user: UserInfo) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    db = await get_db()
    try:
        cursor = await db.execute("SELECT daily_usage, last_usage_date FROM users WHERE id = ?", (user.id,))
        row = await cursor.fetchone()

        if row["last_usage_date"] != today:
            await db.execute(
                "UPDATE users SET daily_usage = 0, last_usage_date = ? WHERE id = ?",
                (today, user.id),
            )
            await db.commit()
            return

        limit = TIER_LIMITS.get(user.tier, 5)
        if row["daily_usage"] >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily limit reached ({limit} conversions). Upgrade your plan for more.",
            )
    finally:
        await db.close()


async def increment_usage(user_id: int) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    db = await get_db()
    try:
        await db.execute(
            "UPDATE users SET daily_usage = daily_usage + 1, last_usage_date = ? WHERE id = ?",
            (today, user_id),
        )
        await db.commit()
    finally:
        await db.close()


async def signup(req: SignupRequest) -> TokenResponse:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (req.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")

        pw_hash = hash_password(req.password)
        cursor = await db.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (req.email, pw_hash),
        )
        await db.commit()
        user_id = cursor.lastrowid
        token = create_token(user_id, req.email, "free")
        return TokenResponse(
            access_token=token,
            user={"id": user_id, "email": req.email, "tier": "free", "daily_usage": 0, "daily_limit": 5},
        )
    finally:
        await db.close()


async def login(req: LoginRequest) -> TokenResponse:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (req.email,))
        row = await cursor.fetchone()
        if not row or not verify_password(req.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        tier = row["tier"]
        token = create_token(row["id"], row["email"], tier)
        return TokenResponse(
            access_token=token,
            user={
                "id": row["id"],
                "email": row["email"],
                "tier": tier,
                "daily_usage": row["daily_usage"],
                "daily_limit": TIER_LIMITS.get(tier, 5),
            },
        )
    finally:
        await db.close()
