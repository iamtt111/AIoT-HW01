"""Optional local-Supabase integration tests for PostgreSQL version persistence."""

from __future__ import annotations

from datetime import datetime, timezone
import os
import unittest

import psycopg

from cwa_weather_ingestion.parser import NormalizedForecast
from cwa_weather_ingestion.versioning import PostgresVersionStore


DATASET_ID = "test-db-versioning"


def forecast() -> NormalizedForecast:
    return NormalizedForecast(
        "Test County", "999", "Test Town", "999001",
        datetime(2026, 10, 5, tzinfo=timezone.utc),
        datetime(2026, 10, 5, 12, tzinfo=timezone.utc),
        weather_description="Clear", max_temperature_c=28,
    )


@unittest.skipUnless(os.environ.get("SUPABASE_TEST_DB_URL"), "SUPABASE_TEST_DB_URL is not set")
class PostgresVersionStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.database_url = os.environ["SUPABASE_TEST_DB_URL"]
        self.store = PostgresVersionStore(self.database_url)
        self._cleanup()

    def tearDown(self) -> None:
        self._cleanup()

    def _cleanup(self) -> None:
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    delete from public.current_forecasts
                    where version_id in (
                      select id from public.forecast_versions where source_dataset_id = %s
                    )
                    """,
                    (DATASET_ID,),
                )
                cursor.execute(
                    """
                    delete from public.forecast_records
                    where version_id in (
                      select id from public.forecast_versions where source_dataset_id = %s
                    )
                    """,
                    (DATASET_ID,),
                )
                cursor.execute(
                    """
                    delete from public.raw_payloads
                    where sync_run_id in (
                      select id from public.sync_runs where source_dataset_id = %s
                    )
                    """,
                    (DATASET_ID,),
                )
                cursor.execute(
                    "delete from public.forecast_versions where source_dataset_id = %s", (DATASET_ID,)
                )
                cursor.execute("delete from public.sync_runs where source_dataset_id = %s", (DATASET_ID,))
                cursor.execute(
                    "delete from public.locations where county_code = '999' and town_code = '999001'"
                )

    def test_duplicate_content_retains_raw_payload_but_not_a_second_version(self) -> None:
        first = self.store.synchronize(
            dataset_id=DATASET_ID, raw_payload={"records": {"version": 1}}, forecasts=[forecast()]
        )
        second = self.store.synchronize(
            dataset_id=DATASET_ID, raw_payload={"records": {"version": 1}}, forecasts=[forecast()]
        )

        self.assertTrue(first.changed)
        self.assertFalse(second.changed)
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "select count(*) from public.forecast_versions where source_dataset_id = %s",
                    (DATASET_ID,),
                )
                self.assertEqual(cursor.fetchone()[0], 1)
                cursor.execute(
                    """
                    select count(*) from public.raw_payloads
                    where sync_run_id in (
                      select id from public.sync_runs where source_dataset_id = %s
                    )
                    """,
                    (DATASET_ID,),
                )
                self.assertEqual(cursor.fetchone()[0], 2)

    def test_failed_sync_preserves_the_current_projection(self) -> None:
        self.store.synchronize(
            dataset_id=DATASET_ID, raw_payload={"records": {"version": 1}}, forecasts=[forecast()]
        )
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select version_id, count(*) from public.current_forecasts group by version_id")
                before = cursor.fetchall()

        result = self.store.record_failure(DATASET_ID, RuntimeError("CWA unavailable"))
        self.assertEqual(result.status, "failed")
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select version_id, count(*) from public.current_forecasts group by version_id")
                self.assertEqual(cursor.fetchall(), before)
                cursor.execute(
                    "select status from public.sync_runs where id = %s::uuid", (result.run_id,)
                )
                self.assertEqual(cursor.fetchone()[0], "failed")

    def test_failed_sync_retains_a_fetched_raw_payload(self) -> None:
        result = self.store.record_failure(
            DATASET_ID,
            ValueError("unparseable CWA payload"),
            raw_payload={"records": {"unexpected": True}},
            source_url="https://example.test/F-D0047-091",
        )
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "select payload, source_url from public.raw_payloads where sync_run_id = %s::uuid",
                    (result.run_id,),
                )
                payload, source_url = cursor.fetchone()
        self.assertEqual(payload, {"records": {"unexpected": True}})
        self.assertEqual(source_url, "https://example.test/F-D0047-091")

    def test_new_source_publication_time_creates_a_new_immutable_version(self) -> None:
        self.store.synchronize(
            dataset_id=DATASET_ID,
            raw_payload={"records": {"published": "first"}},
            forecasts=[forecast()],
            source_published_at=datetime(2026, 10, 5, tzinfo=timezone.utc),
        )
        second = self.store.synchronize(
            dataset_id=DATASET_ID,
            raw_payload={"records": {"published": "second"}},
            forecasts=[forecast()],
            source_published_at=datetime(2026, 10, 5, 6, tzinfo=timezone.utc),
        )
        self.assertTrue(second.changed)
        with psycopg.connect(self.database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "select count(*) from public.forecast_versions where source_dataset_id = %s",
                    (DATASET_ID,),
                )
                self.assertEqual(cursor.fetchone()[0], 2)
