"""Forecast versioning rules and PostgreSQL persistence."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Sequence

import psycopg
from psycopg.types.json import Jsonb

from .parser import NormalizedForecast


def canonical_checksum(payload: dict[str, Any]) -> str:
    """Hash semantically identical JSON to the same SHA-256 value."""
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def canonical_forecast_checksum(forecasts: Sequence[NormalizedForecast]) -> str:
    """Hash normalized records, independent of source JSON ordering or metadata."""
    records = [
        {
            "county_code": forecast.county_code,
            "county_name": forecast.county_name,
            "town_code": forecast.town_code,
            "town_name": forecast.town_name,
            "valid_from": forecast.valid_from.isoformat(),
            "valid_to": forecast.valid_to.isoformat(),
            "weather_description": forecast.weather_description,
            "weather_code": forecast.weather_code,
            "precipitation_probability": forecast.precipitation_probability,
            "min_temperature_c": forecast.min_temperature_c,
            "max_temperature_c": forecast.max_temperature_c,
            "apparent_min_temperature_c": forecast.apparent_min_temperature_c,
            "apparent_max_temperature_c": forecast.apparent_max_temperature_c,
            "uv_index": forecast.uv_index,
            "wind_speed_mps": forecast.wind_speed_mps,
            "wind_direction_degrees": forecast.wind_direction_degrees,
            "wind_description": forecast.wind_description,
        }
        for forecast in forecasts
    ]
    return canonical_checksum({"forecasts": sorted(records, key=lambda item: json.dumps(item, sort_keys=True))})


@dataclass(frozen=True)
class SyncResult:
    run_id: int | str
    status: str
    changed: bool
    version_id: int | None
    record_count: int
    error_summary: str | None = None


class InMemoryVersionStore:
    """Reference implementation for version rules; a DB adapter uses the same contract."""

    def __init__(self) -> None:
        self.runs: list[dict[str, Any]] = []
        self.raw_payloads: dict[int, dict[str, Any]] = {}
        self.versions: list[dict[str, Any]] = []
        self.current_forecasts: list[NormalizedForecast] = []

    def synchronize(
        self,
        *,
        dataset_id: str,
        raw_payload: dict[str, Any],
        forecasts: Sequence[NormalizedForecast],
        source_published_at: datetime | None = None,
    ) -> SyncResult:
        """Record one successful sync and replace current rows only when changed."""
        run_id = len(self.runs) + 1
        checksum = canonical_forecast_checksum(forecasts)
        run = {
            "id": run_id,
            "dataset_id": dataset_id,
            "status": "running",
            "checksum": checksum,
            "started_at": datetime.now(timezone.utc),
        }
        self.runs.append(run)
        self.raw_payloads[run_id] = raw_payload

        latest = self.versions[-1] if self.versions else None
        if (
            latest
            and latest["dataset_id"] == dataset_id
            and latest["checksum"] == checksum
            and latest["source_published_at"] == source_published_at
        ):
            run.update(status="succeeded", changed=False, record_count=len(forecasts))
            return SyncResult(run_id, "succeeded", False, None, len(forecasts))

        version_id = len(self.versions) + 1
        self.versions.append(
            {
                "id": version_id,
                "run_id": run_id,
                "dataset_id": dataset_id,
                "checksum": checksum,
                "source_published_at": source_published_at,
                "records": tuple(forecasts),
            }
        )
        self.current_forecasts = list(forecasts)
        run.update(status="succeeded", changed=True, record_count=len(forecasts), version_id=version_id)
        return SyncResult(run_id, "succeeded", True, version_id, len(forecasts))

    def record_failure(
        self,
        dataset_id: str,
        error: Exception,
        *,
        raw_payload: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Record a failed run without mutating the last successful projection."""
        run_id = len(self.runs) + 1
        summary = f"{error.__class__.__name__}: {error}"
        self.runs.append(
            {
                "id": run_id,
                "dataset_id": dataset_id,
                "status": "failed",
                "error_summary": summary,
                "started_at": datetime.now(timezone.utc),
            }
        )
        if raw_payload is not None:
            self.raw_payloads[run_id] = raw_payload
        return SyncResult(run_id, "failed", False, None, 0, summary)


class PostgresVersionStore:
    """Persist forecast snapshots atomically in the Supabase PostgreSQL schema."""

    def __init__(self, database_url: str) -> None:
        if not database_url.strip():
            raise ValueError("database_url must not be empty")
        self.database_url = database_url

    def _open_connection(self) -> psycopg.Connection[Any]:
        """Open a connection compatible with Supavisor transaction pooling."""
        return psycopg.connect(self.database_url, prepare_threshold=None)

    def synchronize(
        self,
        *,
        dataset_id: str,
        raw_payload: dict[str, Any],
        forecasts: Sequence[NormalizedForecast],
        source_published_at: datetime | None = None,
        source_url: str | None = None,
        fetched_at: datetime | None = None,
    ) -> SyncResult:
        """Store a successful fetch, creating history only for a changed source version."""
        checksum = canonical_forecast_checksum(forecasts)
        raw_checksum = canonical_checksum(raw_payload)
        fetched_at = fetched_at or datetime.now(timezone.utc)

        with self._open_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into public.sync_runs (source_dataset_id, source_published_at, source_checksum)
                    values (%s, %s, %s)
                    returning id
                    """,
                    (dataset_id, source_published_at, checksum),
                )
                run_id = str(cursor.fetchone()[0])

                cursor.execute(
                    "select public.try_acquire_forecast_sync_lock(%s::uuid)",
                    (run_id,),
                )
                if not cursor.fetchone()[0]:
                    cursor.execute(
                        """
                        update public.sync_runs
                        set status = 'skipped', completed_at = now(), error_summary = %s
                        where id = %s::uuid
                        """,
                        ("another forecast synchronization owns the active lock", run_id),
                    )
                    return SyncResult(run_id, "skipped", False, None, 0)

                cursor.execute(
                    """
                    insert into public.raw_payloads
                      (sync_run_id, payload, content_checksum, source_url, fetched_at)
                    values (%s::uuid, %s, %s, %s, %s)
                    """,
                    (run_id, Jsonb(raw_payload), raw_checksum, source_url, fetched_at),
                )

                cursor.execute(
                    """
                    select id, source_published_at, content_checksum
                    from public.forecast_versions
                    where source_dataset_id = %s
                    order by created_at desc, id desc
                    limit 1
                    """,
                    (dataset_id,),
                )
                latest = cursor.fetchone()
                unchanged = (
                    latest is not None
                    and latest[1] == source_published_at
                    and latest[2] == checksum
                )

                version_id: str | None = None
                if not unchanged:
                    cursor.execute(
                        """
                        insert into public.forecast_versions
                          (sync_run_id, source_dataset_id, source_published_at, content_checksum)
                        values (%s::uuid, %s, %s, %s)
                        returning id
                        """,
                        (run_id, dataset_id, source_published_at, checksum),
                    )
                    version_id = str(cursor.fetchone()[0])
                    location_ids = self._upsert_locations(cursor, forecasts)
                    self._insert_records(cursor, "public.forecast_records", version_id, forecasts, location_ids)
                    cursor.execute("delete from public.current_forecasts")
                    self._insert_records(cursor, "public.current_forecasts", version_id, forecasts, location_ids)

                cursor.execute(
                    """
                    update public.sync_runs
                    set status = 'succeeded', completed_at = now(), record_count = %s
                    where id = %s::uuid
                    """,
                    (len(forecasts), run_id),
                )
                cursor.execute("select public.release_forecast_sync_lock(%s::uuid)", (run_id,))
                return SyncResult(run_id, "succeeded", not unchanged, version_id, len(forecasts))

    def record_failure(
        self,
        dataset_id: str,
        error: Exception,
        *,
        raw_payload: dict[str, Any] | None = None,
        source_url: str | None = None,
        fetched_at: datetime | None = None,
    ) -> SyncResult:
        """Record an unsuccessful attempt without mutating current data or losing a response."""
        summary = f"{error.__class__.__name__}: {error}"[:1000]
        fetched_at = fetched_at or datetime.now(timezone.utc)
        with self._open_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    insert into public.sync_runs
                      (source_dataset_id, status, completed_at, error_summary)
                    values (%s, 'failed', now(), %s)
                    returning id
                    """,
                    (dataset_id, summary),
                )
                run_id = str(cursor.fetchone()[0])
                if raw_payload is not None:
                    cursor.execute(
                        """
                        insert into public.raw_payloads
                          (sync_run_id, payload, content_checksum, source_url, fetched_at)
                        values (%s::uuid, %s, %s, %s, %s)
                        """,
                        (
                            run_id,
                            Jsonb(raw_payload),
                            canonical_checksum(raw_payload),
                            source_url,
                            fetched_at,
                        ),
                    )
        return SyncResult(run_id, "failed", False, None, 0, summary)

    @staticmethod
    def _upsert_locations(
        cursor: psycopg.Cursor[Any], forecasts: Sequence[NormalizedForecast]
    ) -> dict[tuple[str, str], str]:
        location_ids: dict[tuple[str, str], str] = {}
        for forecast in forecasts:
            if not forecast.county_code or not forecast.town_code:
                raise ValueError("forecast location must include county_code and town_code")
            key = (forecast.county_code, forecast.town_code)
            if key in location_ids:
                continue
            cursor.execute(
                """
                insert into public.locations (county_code, town_code, county_name, town_name)
                values (%s, %s, %s, %s)
                on conflict (county_code, town_code) do update
                set county_name = excluded.county_name,
                    town_name = excluded.town_name,
                    updated_at = now()
                returning id
                """,
                (forecast.county_code, forecast.town_code, forecast.county_name, forecast.town_name),
            )
            location_ids[key] = str(cursor.fetchone()[0])
        return location_ids

    @staticmethod
    def _insert_records(
        cursor: psycopg.Cursor[Any], table_name: str, version_id: str,
        forecasts: Sequence[NormalizedForecast], location_ids: dict[tuple[str, str], str],
    ) -> None:
        columns = """
          version_id, location_id, valid_from, valid_to, weather_description, weather_code,
          precipitation_probability, min_temperature_c, max_temperature_c,
          apparent_min_temperature_c, apparent_max_temperature_c, uv_index,
          wind_speed_mps, wind_direction_degrees, wind_description
        """
        values = []
        for forecast in forecasts:
            if not forecast.county_code or not forecast.town_code:
                raise ValueError("forecast location must include county_code and town_code")
            values.append(
                (
                    version_id, location_ids[(forecast.county_code, forecast.town_code)],
                    forecast.valid_from, forecast.valid_to, forecast.weather_description,
                    forecast.weather_code, forecast.precipitation_probability,
                    forecast.min_temperature_c, forecast.max_temperature_c,
                    forecast.apparent_min_temperature_c, forecast.apparent_max_temperature_c,
                    forecast.uv_index, forecast.wind_speed_mps,
                    forecast.wind_direction_degrees, forecast.wind_description,
                )
            )
        if values:
            cursor.executemany(
                f"insert into {table_name} ({columns}) values ({', '.join(['%s'] * 15)})",
                values,
            )
