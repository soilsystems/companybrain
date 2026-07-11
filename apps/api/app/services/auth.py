from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWTError
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import Settings, get_settings
from app.db.session import get_db_session
from app.models.core import Business, BusinessDomain, Domain, Membership, User


@dataclass(frozen=True)
class AuthenticatedIdentity:
    supabase_user_id: uuid.UUID
    email: str | None
    claims: dict[str, Any]


async def verify_supabase_jwt(token: str, settings: Settings) -> AuthenticatedIdentity:
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase JWT verification is not configured.",
        )
    try:
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.auth_audience,
            options={"require": ["sub"]},
        )
    except PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token.",
        ) from exc

    return AuthenticatedIdentity(
        supabase_user_id=uuid.UUID(str(claims["sub"])),
        email=claims.get("email"),
        claims=claims,
    )


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required.",
        )
    return authorization.split(" ", 1)[1].strip()


async def get_current_identity(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedIdentity:
    token = extract_bearer_token(authorization)
    return await verify_supabase_jwt(token, settings)


async def get_current_user(
    identity: AuthenticatedIdentity = Depends(get_current_identity),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    result = await session.execute(
        select(User).where(User.supabase_user_id == identity.supabase_user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated identity is not mapped to a Company Brain user.",
        )
    return user


def me_query(
    user_id: uuid.UUID,
) -> Select[tuple[User, Membership, Business, BusinessDomain, Domain]]:
    return (
        select(User, Membership, Business, BusinessDomain, Domain)
        .options(joinedload(Business.organization))
        .join(Membership, Membership.user_id == User.id)
        .join(Business, Business.id == Membership.business_id)
        .join(
            BusinessDomain,
            (BusinessDomain.business_id == Business.id)
            & (BusinessDomain.organization_id == Membership.organization_id),
        )
        .join(Domain, Domain.id == BusinessDomain.domain_id)
        .where(User.id == user_id, BusinessDomain.enabled.is_(True))
    )
