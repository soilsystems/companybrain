from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserSummary(BaseModel):
    id: UUID
    supabase_user_id: UUID
    email: EmailStr
    display_name: str | None
    status: str


class DomainSummary(BaseModel):
    id: UUID
    slug: str
    name: str
    enabled: bool


class BusinessSummary(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: str
    role: str
    domains: list[DomainSummary]


class OrganizationSummary(BaseModel):
    id: UUID
    name: str
    slug: str
    businesses: list[BusinessSummary]


class MeResponse(BaseModel):
    user: UserSummary
    organizations: list[OrganizationSummary]
