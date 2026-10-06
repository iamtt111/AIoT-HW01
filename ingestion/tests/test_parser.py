"""Fixture tests for defensive CWA forecast normalization."""

from __future__ import annotations

import json
from pathlib import Path
import unittest

from cwa_weather_ingestion.parser import parse_forecasts


FIXTURES = Path(__file__).parent / "fixtures"


def load_fixture(name: str) -> dict[str, object]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class ParserTests(unittest.TestCase):
    def test_complete_town_forecast_is_normalized(self) -> None:
        forecasts = parse_forecasts(load_fixture("fd0047-091-parser-complete.json"))
        self.assertEqual(len(forecasts), 1)
        forecast = forecasts[0]
        self.assertEqual((forecast.county_name, forecast.town_name), ("臺北市", "中正區"))
        self.assertEqual(forecast.weather_code, "02")
        self.assertEqual(forecast.max_temperature_c, 28.0)
        self.assertEqual(forecast.precipitation_probability, 30.0)

    def test_missing_optional_elements_keep_the_valid_period(self) -> None:
        payload = load_fixture("fd0047-091-parser-complete.json")
        payload["records"]["locations"][0]["location"][0]["weatherElement"] = [
            payload["records"]["locations"][0]["location"][0]["weatherElement"][2]
        ]
        forecast = parse_forecasts(payload)[0]
        self.assertEqual(forecast.min_temperature_c, 21.0)
        self.assertIsNone(forecast.uv_index)
        self.assertIsNone(forecast.weather_description)

    def test_invalid_optional_values_become_unavailable(self) -> None:
        payload = load_fixture("fd0047-091-parser-complete.json")
        elements = payload["records"]["locations"][0]["location"][0]["weatherElement"]
        elements[1]["time"][0]["elementValue"][0]["value"] = "-999"
        elements[5]["time"][0]["elementValue"][0]["value"] = "not-a-number"
        forecast = parse_forecasts(payload)[0]
        self.assertIsNone(forecast.precipitation_probability)
        self.assertIsNone(forecast.wind_speed_mps)


if __name__ == "__main__":
    unittest.main()
