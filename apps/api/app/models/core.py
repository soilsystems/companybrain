from __future__ import annotations

import uuid
from enum import StrEnum
from typing import Any

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, RecordStatus, TimestampMixin, UUIDPrimaryKeyMixin


class MembershipRole(StrEnum):
    owner = "owner"
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


status_enum = Enum(RecordStatus, name="record_status", schema="core")
role_enum = Enum(MembershipRole, name="membership_role", schema="core")


class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organizations"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_organizations_slug"),
        {"schema": "core"},
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RecordStatus] = mapped_column(
        status_enum, default=RecordStatus.active, nullable=False
    )

    businesses: Mapped[list[Business]] = relationship(back_populates="organization")


class Business(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "businesses"
    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_businesses_org_slug"),
        Index("ix_businesses_organization_id", "organization_id"),
        {"schema": "core"},
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RecordStatus] = mapped_column(
        status_enum, default=RecordStatus.active, nullable=False
    )

    organization: Mapped[Organization] = relationship(back_populates="businesses")


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("supabase_user_id", name="uq_users_supabase_user_id"),
        UniqueConstraint("email", name="uq_users_email"),
        {"schema": "core"},
    )

    supabase_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    email: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    status: Mapped[RecordStatus] = mapped_column(
        status_enum, default=RecordStatus.active, nullable=False
    )


class Domain(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "domains"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_domains_slug"),
        {"schema": "core"},
    )

    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[RecordStatus] = mapped_column(
        status_enum, default=RecordStatus.active, nullable=False
    )
    configuration: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )


class Membership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "business_id",
            "user_id",
            name="uq_memberships_org_business_user",
        ),
        Index("ix_memberships_organization_business", "organization_id", "business_id"),
        Index("ix_memberships_user", "user_id"),
        {"schema": "core"},
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[MembershipRole] = mapped_column(
        role_enum, default=MembershipRole.viewer, nullable=False
    )
    status: Mapped[RecordStatus] = mapped_column(
        status_enum, default=RecordStatus.active, nullable=False
    )


class BusinessDomain(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "business_domains"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "business_id",
            "domain_id",
            name="uq_business_domains_org_business_domain",
        ),
        Index(
            "ix_business_domains_organization_business",
            "organization_id",
            "business_id",
        ),
        {"schema": "core"},
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    domain_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.domains.id", ondelete="CASCADE"),
        nullable=False,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    configuration: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )
