"""Fixture tests for defensive CWA county forecast normalization."""

from __future__ import annotations

import json
from pathlib import Path
import unittest

from cwa_weather_ingestion.parser import parse_forecasts


FIXTURES = Path(__file__).parent / "fixtures"


def load_fixture(name: str) -> dict[str, object]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class ParserTests(unittest.TestCase):
    def test_complete_county_forecast_is_normalized(self) -> None:
        forecasts = parse_forecasts(load_fixture("fd0047-091-parser-complete.json"))
        self.assertEqual(len(forecasts), 1)
        forecast = forecasts[0]
        self.assertEqual((forecast.area_name, forecast.area_code), ("臺北市", "6300000"))
        self.assertEqual(forecast.weather_description, "多雲")
        self.assertEqual(forecast.weather_code, "02")
        self.assertEqual(forecast.max_temperature_c, 28.0)
        self.assertEqual(forecast.precipitation_probability, 30.0)
        self.assertEqual(forecast.wind_description, "偏東風")

    def test_missing_optional_elements_keep_the_valid_period(self) -> None:
        payload = load_fixture("fd0047-091-parser-complete.json")
        payload["records"]["Locations"][0]["Location"][0]["WeatherElement"] = [
            payload["records"]["Locations"][0]["Location"][0]["WeatherElement"][2]
        ]
        forecast = parse_forecasts(payload)[0]
        self.assertEqual(forecast.min_temperature_c, 21.0)
        self.assertIsNone(forecast.uv_index)
        self.assertIsNone(forecast.weather_description)

    def test_invalid_optional_values_become_unavailable(self) -> None:
        payload = load_fixture("fd0047-091-parser-complete.json")
        elements = payload["records"]["Locations"][0]["Location"][0]["WeatherElement"]
        elements[1]["Time"][0]["ElementValue"][0]["ProbabilityOfPrecipitation"] = "-999"
        elements[5]["Time"][0]["ElementValue"][0]["WindSpeed"] = "not-a-number"
        forecast = parse_forecasts(payload)[0]
        self.assertIsNone(forecast.precipitation_probability)
        self.assertIsNone(forecast.wind_speed_mps)

    def test_lowercase_structural_fields_remain_compatible(self) -> None:
        payload = load_fixture("fd0047-091-parser-complete.json")
        records = payload["records"]
        records["locations"] = records.pop("Locations")
        location = records["locations"][0]
        location["location"] = location.pop("Location")
        area = location["location"][0]
        area["locationName"] = area.pop("LocationName")
        area["geocode"] = area.pop("Geocode")
        area["weatherElement"] = area.pop("WeatherElement")
        for element in area["weatherElement"]:
            element["elementName"] = element.pop("ElementName")
            element["time"] = element.pop("Time")
            for period in element["time"]:
                period["startTime"] = period.pop("StartTime")
                period["endTime"] = period.pop("EndTime")
                period["elementValue"] = period.pop("ElementValue")

        forecast = parse_forecasts(payload)[0]
        self.assertEqual(forecast.area_code, "6300000")


if __name__ == "__main__":
    unittest.main()
