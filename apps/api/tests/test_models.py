from __future__ import annotations

from app.models.base import Base
from app.models.core import Business, BusinessDomain


def constraint_names(table_name: str) -> set[str]:
    return {
        str(constraint.name)
        for constraint in Base.metadata.tables[f"core.{table_name}"].constraints
        if constraint.name is not None
    }


def test_membership_uniqueness_constraint() -> None:
    assert "uq_memberships_org_business_user" in constraint_names("memberships")


def test_business_to_organization_relationship() -> None:
    foreign_keys = {fk.target_fullname for fk in Business.__table__.foreign_keys}
    assert "core.organizations.id" in foreign_keys


def test_business_domain_enablement_model() -> None:
    assert BusinessDomain.__table__.c.enabled.default is not None
    assert "uq_business_domains_org_business_domain" in constraint_names(
        "business_domains"
    )
