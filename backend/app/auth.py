"""Supabase JWT authentication and application-role authorization."""

import asyncio
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Annotated, Any, Callable

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from app.settings import settings


class AppRole(str, Enum):
    VIEWER = "viewer"
    ANALYST = "analyst"
    ADMIN = "admin"


_ROLE_RANK = {
    AppRole.VIEWER: 1,
    AppRole.ANALYST: 2,
    AppRole.ADMIN: 3,
}


@dataclass(frozen=True)
class Principal:
    user_id: str
    role: AppRole


@lru_cache(maxsize=4)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    # PyJWKClient caches the key set and refreshes it when a token references a
    # new kid, avoiding an Auth request for every API call.
    return PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=600)


def _decode_access_token(token: str) -> dict[str, Any]:
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        )

    issuer = f"{settings.supabase_url.rstrip('/')}/auth/v1"
    try:
        signing_key = _jwks_client(
            f"{issuer}/.well-known/jwks.json"
        ).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=issuer,
            options={"require": ["exp", "sub", "role"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_principal(
    authorization: Annotated[str | None, Header()] = None,
) -> Principal:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # JWKS refresh can perform network I/O; keep it off the event loop.
    claims = await asyncio.to_thread(_decode_access_token, token)
    app_metadata = claims.get("app_metadata")
    role_value = app_metadata.get("app_role") if isinstance(app_metadata, dict) else None
    try:
        role = AppRole(role_value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No application role has been assigned to this account.",
        ) from exc

    return Principal(user_id=str(claims["sub"]), role=role)


def require_role(minimum: AppRole) -> Callable[..., Any]:
    async def dependency(
        principal: Principal = Depends(get_current_principal),
    ) -> Principal:
        if _ROLE_RANK[principal.role] < _ROLE_RANK[minimum]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The {minimum.value} role is required.",
            )
        return principal

    return dependency


require_viewer = require_role(AppRole.VIEWER)
require_analyst = require_role(AppRole.ANALYST)
require_admin = require_role(AppRole.ADMIN)
