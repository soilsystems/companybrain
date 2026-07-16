from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient, PyJWTError
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import Settings, get_settings
from app.db.session import get_db_session
from app.models.core import (
    Business,
    BusinessDomain,
    Domain,
    Membership,
    MembershipRole,
    Organization,
    User,
)


@dataclass(frozen=True)
class AuthenticatedIdentity:
    supabase_user_id: uuid.UUID
    email: str | None
    claims: dict[str, Any]


async def verify_supabase_jwt(token: str, settings: Settings) -> AuthenticatedIdentity:
    jwks_url = str(settings.supabase_jwks_url or "")
    if not jwks_url and settings.supabase_url:
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    if not settings.supabase_jwt_secret and not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase JWT verification is not configured.",
        )
    try:
        if jwks_url:
            signing_key = await asyncio.to_thread(
                _jwks_client(jwks_url).get_signing_key_from_jwt, token
            )
            if signing_key.key is None:
                raise PyJWTError("Supabase signing key is unavailable.")
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience=settings.auth_audience,
                options={"require": ["sub"]},
            )
        else:
            if not settings.supabase_jwt_secret:
                raise PyJWTError("Supabase JWT secret is unavailable.")
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


@lru_cache(maxsize=8)
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True)


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
        if not identity.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The authenticated account does not have an email address.",
            )
        user = await provision_personal_workspace(session, identity)
    return user


async def provision_personal_workspace(
    session: AsyncSession, identity: AuthenticatedIdentity
) -> User:
    organization = Organization(
        name="Company Brain Workspace",
        slug=f"workspace-{identity.supabase_user_id.hex[:16]}",
    )
    business = Business(
        organization=organization,
        name="Documents Workspace",
        slug="documents-workspace",
    )
    domain = await session.scalar(
        select(Domain).where(Domain.slug == "business-knowledge")
    )
    if domain is None:
        domain = Domain(
            slug="business-knowledge",
            name="Business Knowledge",
            description="Uploaded business documents and internal knowledge.",
        )
        session.add(domain)
        await session.flush()
    user = User(
        supabase_user_id=identity.supabase_user_id,
        email=identity.email or "",
        display_name=str(
            identity.claims.get("user_metadata", {}).get("display_name") or ""
        )
        or None,
    )
    session.add_all([organization, business, user])
    await session.flush()
    session.add_all(
        [
            Membership(
                organization_id=organization.id,
                business_id=business.id,
                user_id=user.id,
                role=MembershipRole.owner,
            ),
            BusinessDomain(
                organization_id=organization.id,
                business_id=business.id,
                domain_id=domain.id,
                enabled=True,
            ),
        ]
    )
    await session.commit()
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
