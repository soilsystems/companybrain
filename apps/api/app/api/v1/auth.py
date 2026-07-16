from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.core import User
from app.schemas.auth import (
    BusinessSummary,
    DomainSummary,
    MeResponse,
    OrganizationSummary,
    UserSummary,
)
from app.services.auth import get_current_user, me_query

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeResponse:
    rows = (await session.execute(me_query(current_user.id))).all()
    organizations: dict[str, tuple[UUID, str, str]] = {}
    business_domains: dict[str, list[DomainSummary]] = defaultdict(list)
    businesses: dict[str, BusinessSummary] = {}

    for _user, membership, business, business_domain, domain in rows:
        org_id = str(membership.organization_id)
        organizations.setdefault(
            org_id,
            (
                membership.organization_id,
                business.organization.name,
                business.organization.slug,
            ),
        )
        business_key = str(business.id)
        business_domains[business_key].append(
            DomainSummary(
                id=domain.id,
                slug=domain.slug,
                name=domain.name,
                enabled=business_domain.enabled,
            )
        )
        businesses[business_key] = BusinessSummary(
            id=business.id,
            organization_id=business.organization_id,
            name=business.name,
            slug=business.slug,
            role=membership.role.value,
            domains=[],
        )

    org_payloads: list[OrganizationSummary] = []
    for organization_id, organization_name, organization_slug in organizations.values():
        org_businesses = [
            business.model_copy(update={"domains": business_domains[str(business.id)]})
            for business in businesses.values()
            if business.organization_id == organization_id
        ]
        org_payloads.append(
            OrganizationSummary(
                id=organization_id,
                name=organization_name,
                slug=organization_slug,
                businesses=org_businesses,
            )
        )

    return MeResponse(
        user=UserSummary(
            id=current_user.id,
            supabase_user_id=current_user.supabase_user_id,
            email=current_user.email,
            display_name=current_user.display_name,
            status=current_user.status.value,
        ),
        organizations=org_payloads,
    )
