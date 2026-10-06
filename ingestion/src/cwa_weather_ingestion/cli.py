"""Command-line entry point for scheduled and manual CWA synchronizations."""

from __future__ import annotations

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import sys
from typing import Any, Sequence

from dotenv import load_dotenv

from .config import DEFAULT_DATASET_ID, CwaSettings
from .cwa_client import CwaForecastClient
from .parser import parse_forecasts
from .versioning import PostgresVersionStore, SyncResult


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line interface for a single idempotent sync run."""
    parser = argparse.ArgumentParser(
        prog="cwa-weather-sync",
        description="Fetch and persist the CWA F-D0047-091 county forecast.",
    )
    parser.add_argument(
        "--fixture",
        type=Path,
        help="Read an offline CWA JSON fixture instead of calling the CWA API.",
    )
    parser.add_argument(
        "--database-url",
        help="PostgreSQL URL. Defaults to SUPABASE_DB_URL; never pass this in CI logs.",
    )
    parser.add_argument(
        "--source-published-at",
        help="Optional ISO-8601 CWA source publication timestamp for fixture runs.",
    )
    return parser


def _load_local_environment() -> None:
    """Load the ignored repository-root .env file without replacing CI variables."""
    repository_root = Path(__file__).resolve().parents[3]
    load_dotenv(repository_root / ".env", override=False)


def _parse_source_published_at(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("source publication time must be ISO-8601") from error


def _result_summary(result: SyncResult, *, dataset_id: str) -> dict[str, Any]:
    return {
        "dataset_id": dataset_id,
        "run_id": result.run_id,
        "status": result.status,
        "changed": result.changed,
        "version_id": result.version_id,
        "record_count": result.record_count,
        "error_summary": result.error_summary,
    }


def run_sync(args: argparse.Namespace) -> SyncResult:
    """Execute one fetch/parse/persist cycle and return an operator-safe result."""
    _load_local_environment()
    database_url = args.database_url or os.environ.get("SUPABASE_DB_URL", "")
    if not database_url.strip():
        raise ValueError("SUPABASE_DB_URL must be set for synchronization")

    store = PostgresVersionStore(database_url)
    dataset_id = DEFAULT_DATASET_ID
    payload: dict[str, Any] | None = None
    source_url: str | None = None
    fetched_at: datetime | None = None
    try:
        if args.fixture:
            payload = json.loads(args.fixture.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("fixture JSON must be an object")
            source_url = f"fixture://{args.fixture.name}"
            source_published_at = _parse_source_published_at(args.source_published_at)
        else:
            settings = CwaSettings.from_environment()
            dataset_id = settings.dataset_id
            with CwaForecastClient(settings) as client:
                fetched = client.fetch()
            payload = fetched.payload
            source_url = fetched.source_url
            fetched_at = fetched.fetched_at
            source_published_at = None

        forecasts = parse_forecasts(payload)
        if not forecasts:
            raise ValueError("CWA payload contains no valid normalized forecast periods")
        return store.synchronize(
            dataset_id=dataset_id,
            raw_payload=payload,
            forecasts=forecasts,
            source_published_at=source_published_at,
            source_url=source_url,
            fetched_at=fetched_at,
        )
    except Exception as error:
        return store.record_failure(
            dataset_id,
            error,
            raw_payload=payload,
            source_url=source_url,
            fetched_at=fetched_at,
        )


def main(argv: Sequence[str] | None = None) -> int:
    """Run one sync and print a JSON summary suitable for Actions logs."""
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        result = run_sync(args)
        print(json.dumps(_result_summary(result, dataset_id=DEFAULT_DATASET_ID), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"status": "configuration_error", "error_summary": str(error)}))
        return 2
    return 0 if result.status == "succeeded" else 1


if __name__ == "__main__":
    sys.exit(main())
