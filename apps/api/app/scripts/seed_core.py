from __future__ import annotations

import asyncio

from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models.core import Domain

DOMAINS = [
    {
        "slug": "market-intelligence",
        "name": "Market Intelligence",
        "description": "Dubai Fruits & Vegetables market intelligence.",
    },
    {
        "slug": "business-deals",
        "name": "Business Deals",
        "description": "Deals, commitments, risks, payment terms, and timelines.",
    },
    {
        "slug": "business-knowledge",
        "name": "Business Knowledge",
        "description": "Uploaded business documents and internal knowledge.",
    },
]


async def main() -> None:
    async with AsyncSessionLocal() as session:
        for domain in DOMAINS:
            statement = (
                insert(Domain)
                .values(**domain)
                .on_conflict_do_update(
                    index_elements=["slug"],
                    set_={
                        "name": domain["name"],
                        "description": domain["description"],
                    },
                )
            )
            await session.execute(statement)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(main())
