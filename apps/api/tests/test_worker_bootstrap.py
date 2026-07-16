from __future__ import annotations

import subprocess
import sys


def test_worker_registers_core_foreign_key_tables() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import app.jobs.document_ingestion; "
                "from app.models.base import Base; "
                "assert 'core.organizations' in Base.metadata.tables; "
                "assert 'core.domains' in Base.metadata.tables"
            ),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
