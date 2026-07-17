from __future__ import annotations

import argparse
import asyncio
import uuid

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models.core import (
    Business,
    BusinessDomain,
    Membership,
    Organization,
    User,
)
from app.models.knowledge import Document

SUB_ORGANIZATIONS = (
    ("woods-and-spices", "Woods & Spices"),
    ("windflower", "Windflower"),
    ("peppywoods", "Peppywoods"),
    ("tallsilver", "Tallsilver"),
    ("lacavana-resort", "LaCavana (Resort)"),
)


async def configure(owner_email: str) -> None:
    async with AsyncSessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == owner_email))
        if user is None:
            raise RuntimeError(f"No Company Brain user exists for {owner_email}.")

        memberships = (
            (
                await session.execute(
                    select(Membership).where(Membership.user_id == user.id)
                )
            )
            .scalars()
            .all()
        )
        organization_ids = {membership.organization_id for membership in memberships}
        if len(organization_ids) != 1:
            raise RuntimeError("The owner must belong to exactly one organization.")
        organization_id = next(iter(organization_ids))
        organization = await session.get(Organization, organization_id)
        if organization is None:
            raise RuntimeError("The owner's organization no longer exists.")

        organization.name = "SoilSystems"
        organization.slug = "soilsystems"

        document_count = func.count(Document.id).label("document_count")
        source_row = (
            await session.execute(
                select(Business, Membership, document_count)
                .join(Membership, Membership.business_id == Business.id)
                .outerjoin(Document, Document.business_id == Business.id)
                .where(
                    Membership.user_id == user.id,
                    Business.organization_id == organization_id,
                )
                .group_by(Business.id, Membership.id)
                .order_by(document_count.desc(), Business.created_at)
            )
        ).first()
        if source_row is None:
            raise RuntimeError("The owner has no business workspace to configure.")
        source_business, source_membership, _count = source_row

        existing_woods = await session.scalar(
            select(Business).where(
                Business.organization_id == organization_id,
                Business.slug == "woods-and-spices",
            )
        )
        woods = existing_woods or source_business
        woods.name = "Woods & Spices"
        woods.slug = "woods-and-spices"
        await session.flush()

        source_domains = (
            (
                await session.execute(
                    select(BusinessDomain).where(
                        BusinessDomain.organization_id == organization_id,
                        BusinessDomain.business_id == source_business.id,
                    )
                )
            )
            .scalars()
            .all()
        )

        for slug, name in SUB_ORGANIZATIONS:
            business = await session.scalar(
                select(Business).where(
                    Business.organization_id == organization_id,
                    Business.slug == slug,
                )
            )
            if business is None:
                business = Business(
                    id=uuid.uuid4(),
                    organization_id=organization_id,
                    slug=slug,
                    name=name,
                )
                session.add(business)
                await session.flush()
            else:
                business.name = name

            await session.execute(
                insert(Membership)
                .values(
                    id=uuid.uuid4(),
                    organization_id=organization_id,
                    business_id=business.id,
                    user_id=user.id,
                    role=source_membership.role,
                    status=source_membership.status,
                )
                .on_conflict_do_update(
                    constraint="uq_memberships_org_business_user",
                    set_={
                        "role": source_membership.role,
                        "status": source_membership.status,
                    },
                )
            )
            for source_domain in source_domains:
                await session.execute(
                    insert(BusinessDomain)
                    .values(
                        id=uuid.uuid4(),
                        organization_id=organization_id,
                        business_id=business.id,
                        domain_id=source_domain.domain_id,
                        enabled=source_domain.enabled,
                        configuration=source_domain.configuration,
                    )
                    .on_conflict_do_update(
                        constraint="uq_business_domains_org_business_domain",
                        set_={
                            "enabled": source_domain.enabled,
                            "configuration": source_domain.configuration,
                        },
                    )
                )

        await session.commit()


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--owner-email", required=True)
    args = parser.parse_args()
    await configure(args.owner_email)


if __name__ == "__main__":
    asyncio.run(main())
