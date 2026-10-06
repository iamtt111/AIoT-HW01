"""Unit tests for CWA request handling using saved fixture responses."""

from __future__ import annotations

import json
from pathlib import Path
import unittest

import httpx

from cwa_weather_ingestion.config import CwaConfigurationError, CwaSettings
from cwa_weather_ingestion.cwa_client import CwaForecastClient, CwaUpstreamError


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "fd0047-091-success.json"


def fixture_payload() -> dict[str, object]:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


class CwaForecastClientTests(unittest.TestCase):
    def setUp(self) -> None:
        self.settings = CwaSettings(api_key="test-key", base_url="https://example.test/data")

    def test_fetch_returns_saved_fixture_and_redacts_credential_from_metadata(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.url.path, "/data/F-D0047-091")
            self.assertEqual(request.url.params["Authorization"], "test-key")
            return httpx.Response(200, json=fixture_payload())

        with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
            result = CwaForecastClient(self.settings, http_client=http_client).fetch()

        self.assertEqual(result.payload["records"]["datasetDescription"], "鄉鎮天氣預報")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.source_url, "https://example.test/data/F-D0047-091")
        self.assertNotIn("test-key", result.source_url)

    def test_fetch_raises_actionable_error_for_unsuccessful_http_response(self) -> None:
        transport = httpx.MockTransport(lambda request: httpx.Response(503))
        with httpx.Client(transport=transport) as http_client:
            client = CwaForecastClient(self.settings, http_client=http_client)
            with self.assertRaisesRegex(CwaUpstreamError, "HTTP 503"):
                client.fetch()

    def test_fetch_raises_actionable_error_for_timeout(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("timed out", request=request)

        with httpx.Client(transport=httpx.MockTransport(handler)) as http_client:
            client = CwaForecastClient(self.settings, http_client=http_client)
            with self.assertRaisesRegex(CwaUpstreamError, "timed out"):
                client.fetch()

    def test_settings_require_cwa_api_key(self) -> None:
        previous_value = __import__("os").environ.pop("CWA_API_KEY", None)
        try:
            with self.assertRaises(CwaConfigurationError):
                CwaSettings.from_environment()
        finally:
            if previous_value is not None:
                __import__("os").environ["CWA_API_KEY"] = previous_value


if __name__ == "__main__":
    unittest.main()
