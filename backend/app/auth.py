"""Real accounts for ShopSense (T4): register/login with bcrypt + JWT.

Secrets: JWT_SECRET comes from the environment. The dev fallback is ONLY for
local development and is never a real credential — production must set
JWT_SECRET to a long random value. Nothing secret is logged.
"""

import os
import re
import time

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from .userstore import Store, init_db
from .ratelimit import is_allowed

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)
_store = Store()

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me")
JWT_ALG = "HS256"
JWT_TTL = 30 * 24 * 3600  # 30 days

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# R4 password rules: >= 8 chars, at least one letter and one digit.
def password_problem(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r"[A-Za-z]", password):
        return "Password must contain at least one letter"
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one digit"
    return None


def _client_ip(request: Request) -> str:
    # Respect X-Forwarded-For when behind a proxy; first entry is the client.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=80)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _valid_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email.strip()))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except Exception:
        return False


def create_token(user_id: int, email: str) -> str:
    payload = {"sub": str(user_id), "email": email,
               "iat": int(time.time()), "exp": int(time.time()) + JWT_TTL}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token")


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Not authenticated")
    payload = decode_token(creds.credentials)
    user = _store.get_user(int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User no longer exists")
    return user


@router.post("/auth/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, request: Request) -> TokenResponse:
    if not is_allowed("register", _client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many registrations, try later")
    email = body.email.strip().lower()
    if not _valid_email(email):
        raise HTTPException(status_code=422, detail="Invalid email address")
    problem = password_problem(body.password)
    if problem:
        raise HTTPException(status_code=422, detail=problem)
    user = _store.create_user(email, hash_password(body.password),
                              body.name.strip())
    if user is None:
        raise HTTPException(status_code=409, detail="Email already registered")
    return TokenResponse(access_token=create_token(user["id"], email), user=user)


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request) -> TokenResponse:
    if not is_allowed("login", _client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many login attempts, try later")
    email = body.email.strip().lower()
    row = _store.get_user_by_email(email)
    if row is None or not verify_password(body.password, row["password_hash"]):
        # Same message either way: never reveal whether the email exists.
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = {"id": row["id"], "email": row["email"], "name": row["name"]}
    return TokenResponse(access_token=create_token(user["id"], email), user=user)


@router.get("/auth/me")
def me(user: dict = Depends(get_current_user)) -> dict:
    return {"user": user}


def ensure_db() -> None:
    init_db()
