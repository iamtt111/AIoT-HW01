"""Tests for manual and scheduled synchronization command behaviour."""

from __future__ import annotations

import io
import json
from pathlib import Path
from unittest import mock
import unittest

from cwa_weather_ingestion import cli
from cwa_weather_ingestion.versioning import SyncResult


FIXTURE = Path(__file__).parent / "fixtures" / "fd0047-091-parser-complete.json"
EMPTY_FIXTURE = Path(__file__).parent / "fixtures" / "fd0047-091-success.json"


class CliTests(unittest.TestCase):
    @mock.patch("cwa_weather_ingestion.cli.PostgresVersionStore")
    def test_fixture_run_prints_actionable_success_summary(self, store_class: mock.Mock) -> None:
        store = store_class.return_value
        store.synchronize.return_value = SyncResult("run-1", "succeeded", True, "version-1", 1)
        output = io.StringIO()
        with mock.patch("sys.stdout", output):
            code = cli.main(["--fixture", str(FIXTURE), "--database-url", "postgresql://test"])

        self.assertEqual(code, 0)
        summary = json.loads(output.getvalue())
        self.assertEqual(summary["status"], "succeeded")
        self.assertEqual(summary["record_count"], 1)
        self.assertEqual(store.synchronize.call_args.kwargs["source_url"], f"fixture://{FIXTURE.name}")

    @mock.patch("cwa_weather_ingestion.cli.PostgresVersionStore")
    def test_bad_fixture_records_a_failed_run(self, store_class: mock.Mock) -> None:
        store = store_class.return_value
        store.record_failure.return_value = SyncResult("run-2", "failed", False, None, 0, "bad fixture")
        output = io.StringIO()
        with mock.patch("sys.stdout", output):
            code = cli.main(["--fixture", "does-not-exist.json", "--database-url", "postgresql://test"])

        self.assertEqual(code, 1)
        self.assertTrue(store.record_failure.called)
        self.assertEqual(json.loads(output.getvalue())["status"], "failed")

    @mock.patch("cwa_weather_ingestion.cli.PostgresVersionStore")
    def test_unparseable_payload_is_retained_with_the_failed_run(self, store_class: mock.Mock) -> None:
        store = store_class.return_value
        store.record_failure.return_value = SyncResult("run-3", "failed", False, None, 0, "no periods")
        output = io.StringIO()
        with mock.patch("sys.stdout", output):
            code = cli.main(["--fixture", str(EMPTY_FIXTURE), "--database-url", "postgresql://test"])

        self.assertEqual(code, 1)
        self.assertEqual(
            store.record_failure.call_args.kwargs["raw_payload"]["records"]["datasetDescription"],
            "鄉鎮天氣預報",
        )
        self.assertEqual(
            store.record_failure.call_args.kwargs["source_url"], f"fixture://{EMPTY_FIXTURE.name}"
        )

    @mock.patch("cwa_weather_ingestion.cli._load_local_environment")
    def test_missing_database_url_returns_configuration_error(self, _: mock.Mock) -> None:
        output = io.StringIO()
        with mock.patch.dict("os.environ", {"SUPABASE_DB_URL": ""}, clear=False), mock.patch(
            "sys.stdout", output
        ):
            code = cli.main(["--fixture", str(FIXTURE)])

        self.assertEqual(code, 2)
        self.assertEqual(json.loads(output.getvalue())["status"], "configuration_error")
