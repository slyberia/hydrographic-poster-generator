"""Lightweight request budgets for demo-stage drone surfaces.

This is intentionally process-local. It protects the demo service from obvious
request storms without introducing Redis or another dependency. Admins bypass
quota blocks, but still receive warning headers when they cross demo thresholds.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from time import monotonic
from typing import Deque, Dict, Tuple

from fastapi import Depends, Header, HTTPException, Request, Response, status

from app.auth import AppRole, Principal, get_current_principal


@dataclass(frozen=True)
class LimitRule:
    limit: int
    window_seconds: int
    admin_warning: int


RULES: Dict[str, Dict[str, LimitRule]] = {
    "light": {
        "anonymous": LimitRule(60, 60, 240),
        "viewer": LimitRule(120, 60, 360),
        "analyst": LimitRule(180, 60, 420),
    },
    "cell": {
        "anonymous": LimitRule(90, 60, 300),
        "viewer": LimitRule(180, 60, 480),
        "analyst": LimitRule(240, 60, 600),
    },
    "layer": {
        "anonymous": LimitRule(5, 3600, 20),
        "viewer": LimitRule(20, 3600, 60),
        "analyst": LimitRule(40, 3600, 100),
    },
    "export": {
        "anonymous": LimitRule(2, 600, 10),
        "viewer": LimitRule(6, 600, 20),
        "analyst": LimitRule(12, 600, 30),
    },
    "model": {
        "anonymous": LimitRule(0, 3600, 2),
        "viewer": LimitRule(0, 3600, 2),
        "analyst": LimitRule(3, 1800, 6),
    },
}

_hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)


async def _optional_principal(
    authorization: str | None = Header(default=None),
) -> Principal | None:
    if not authorization:
        return None
    try:
        return await get_current_principal(authorization)
    except HTTPException:
        return None


def _identity(request: Request, principal: Principal | None) -> Tuple[str, str]:
    if principal:
        return principal.role.value, f"user:{principal.user_id}"
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",", 1)[0].strip() if forwarded else None
    ip = ip or (request.client.host if request.client else "unknown")
    return "anonymous", f"ip:{ip}"


def usage_limit(scope: str):
    async def dependency(
        request: Request,
        response: Response,
        principal: Principal | None = Depends(_optional_principal),
    ) -> None:
        role, ident = _identity(request, principal)
        role_rules = RULES.get(scope)
        if not role_rules:
            return

        rule = role_rules.get(role, role_rules["viewer"])
        now = monotonic()
        key = (scope, ident)
        bucket = _hits[key]
        while bucket and now - bucket[0] > rule.window_seconds:
            bucket.popleft()
        bucket.append(now)

        if role == AppRole.ADMIN.value:
            if len(bucket) >= rule.admin_warning:
                response.headers["X-Usage-Warning"] = (
                    f"Admin bypass active: {len(bucket)} {scope} requests "
                    f"in {rule.window_seconds} seconds."
                )
            return

        if len(bucket) > rule.limit:
            retry_after = max(1, int(rule.window_seconds - (now - bucket[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many {scope} requests. Try again in "
                    f"{retry_after} seconds."
                ),
                headers={"Retry-After": str(retry_after)},
            )

    return dependency

