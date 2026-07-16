from __future__ import annotations

import time

from app.services.document_identifiers import normalize_identifier


def test_exact_lookup_over_ten_thousand_synthetic_identifiers() -> None:
    records = [
        (f"business-{index % 7}", f"{index}/{(index % 23) + 1}")
        for index in range(10_000)
    ]
    started = time.perf_counter()
    index = {
        (business, normalize_identifier(identifier)): identifier
        for business, identifier in records
    }
    result = index[("business-2", normalize_identifier(" 7002 / 11 "))]
    elapsed = time.perf_counter() - started
    assert result == "7002/11"
    assert elapsed < 0.25
