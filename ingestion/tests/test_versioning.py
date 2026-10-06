"""Versioning tests for duplicate and failure safety invariants."""

from __future__ import annotations

from datetime import datetime, timezone
import unittest
from unittest import mock

from cwa_weather_ingestion.parser import NormalizedForecast
from cwa_weather_ingestion.versioning import (
    InMemoryVersionStore,
    PostgresVersionStore,
    canonical_checksum,
    canonical_forecast_checksum,
)


def forecast() -> NormalizedForecast:
    return NormalizedForecast(
        "Test County", "100",
        datetime(2026, 10, 5, tzinfo=timezone.utc),
        datetime(2026, 10, 5, 12, tzinfo=timezone.utc),
        max_temperature_c=28,
    )


class VersioningTests(unittest.TestCase):
    def test_postgres_store_disables_prepared_statements_for_transaction_pooling(self) -> None:
        with mock.patch("cwa_weather_ingestion.versioning.psycopg.connect") as connect:
            PostgresVersionStore("postgresql://test")._open_connection()
        connect.assert_called_once_with("postgresql://test", prepare_threshold=None)

    def test_canonical_checksum_ignores_json_key_order(self) -> None:
        self.assertEqual(canonical_checksum({"b": 2, "a": 1}), canonical_checksum({"a": 1, "b": 2}))

    def test_duplicate_content_does_not_create_another_version(self) -> None:
        store = InMemoryVersionStore()
        first = store.synchronize(dataset_id="F-D0047-091", raw_payload={"records": 1}, forecasts=[forecast()])
        second = store.synchronize(dataset_id="F-D0047-091", raw_payload={"records": 1}, forecasts=[forecast()])
        self.assertTrue(first.changed)
        self.assertFalse(second.changed)
        self.assertEqual(len(store.versions), 1)
        self.assertEqual(len(store.runs), 2)

    def test_changed_source_publication_time_creates_a_new_version(self) -> None:
        store = InMemoryVersionStore()
        first_time = datetime(2026, 10, 5, tzinfo=timezone.utc)
        second_time = datetime(2026, 10, 5, 6, tzinfo=timezone.utc)
        store.synchronize(
            dataset_id="F-D0047-091", raw_payload={"records": 1}, forecasts=[forecast()],
            source_published_at=first_time,
        )
        second = store.synchronize(
            dataset_id="F-D0047-091", raw_payload={"records": 2}, forecasts=[forecast()],
            source_published_at=second_time,
        )
        self.assertTrue(second.changed)
        self.assertEqual(len(store.versions), 2)

    def test_forecast_checksum_ignores_record_order(self) -> None:
        earlier = forecast()
        later = NormalizedForecast(
            "Another County", "200",
            datetime(2026, 10, 5, 12, tzinfo=timezone.utc),
            datetime(2026, 10, 6, tzinfo=timezone.utc),
        )
        self.assertEqual(
            canonical_forecast_checksum([earlier, later]),
            canonical_forecast_checksum([later, earlier]),
        )

    def test_failed_sync_preserves_current_projection(self) -> None:
        store = InMemoryVersionStore()
        store.synchronize(dataset_id="F-D0047-091", raw_payload={"records": 1}, forecasts=[forecast()])
        prior_current = list(store.current_forecasts)
        result = store.record_failure("F-D0047-091", RuntimeError("CWA unavailable"))
        self.assertEqual(result.status, "failed")
        self.assertEqual(store.current_forecasts, prior_current)
        self.assertEqual(len(store.versions), 1)


if __name__ == "__main__":
    unittest.main()
