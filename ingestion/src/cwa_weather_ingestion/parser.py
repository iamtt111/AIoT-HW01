"""Defensive normalization for CWA township forecast payloads."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
import math
from typing import Any, Iterable


MISSING_VALUES = {"", "-", "--", "...", "-99", "-999", "nan", "null", "none"}


@dataclass(frozen=True)
class NormalizedForecast:
    county_name: str
    county_code: str | None
    town_name: str
    town_code: str | None
    valid_from: datetime
    valid_to: datetime
    weather_description: str | None = None
    weather_code: str | None = None
    precipitation_probability: float | None = None
    min_temperature_c: float | None = None
    max_temperature_c: float | None = None
    apparent_min_temperature_c: float | None = None
    apparent_max_temperature_c: float | None = None
    uv_index: float | None = None
    wind_speed_mps: float | None = None
    wind_direction_degrees: float | None = None
    wind_description: str | None = None


def _items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return [value] if isinstance(value, dict) else []


def _text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _number(value: Any) -> float | None:
    text = _text(value)
    if text is None or text.lower() in MISSING_VALUES:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def _time(value: Any) -> datetime | None:
    text = _text(value)
    if text is None:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def _values(period: dict[str, Any]) -> list[str | None]:
    values: list[str | None] = []
    for item in _items(period.get("elementValue")):
        values.append(_text(item.get("value", item.get("parameterValue"))))
    return values


def _locations(records: dict[str, Any]) -> Iterable[tuple[dict[str, Any], dict[str, Any]]]:
    for group in _items(records.get("locations")):
        for location in _items(group.get("location")):
            yield group, location
    for location in _items(records.get("location")):
        yield {}, location


def parse_forecasts(payload: dict[str, Any]) -> list[NormalizedForecast]:
    """Normalize complete periods and retain records with missing optional data."""
    records = payload.get("records")
    if not isinstance(records, dict):
        return []

    output: list[NormalizedForecast] = []
    for group, location in _locations(records):
        county_name = _text(group.get("locationsName") or location.get("countyName"))
        town_name = _text(location.get("locationName") or location.get("townName"))
        if county_name is None or town_name is None:
            continue
        town_code = _text(location.get("geocode") or location.get("townCode"))
        county_code = _text(location.get("countyCode")) or (town_code[:3] if town_code else None)
        periods: dict[tuple[datetime, datetime], NormalizedForecast] = {}
        for element in _items(location.get("weatherElement")):
            name = _text(element.get("elementName"))
            if name is None:
                continue
            for period in _items(element.get("time")):
                start, end = _time(period.get("startTime")), _time(period.get("endTime"))
                if start is None or end is None or end <= start:
                    continue
                key = (start, end)
                forecast = periods.setdefault(
                    key,
                    NormalizedForecast(county_name, county_code, town_name, town_code, start, end),
                )
                values = _values(period)
                first, second = (values + [None, None])[:2]
                if name in {"Wx", "WeatherDescription"}:
                    forecast = replace(
                        forecast,
                        weather_description=first or forecast.weather_description,
                        weather_code=second if name == "Wx" else forecast.weather_code,
                    )
                elif name in {"PoP", "PoP6h", "PoP12h"}:
                    forecast = replace(forecast, precipitation_probability=_number(first))
                elif name == "MinT":
                    forecast = replace(forecast, min_temperature_c=_number(first))
                elif name == "MaxT":
                    forecast = replace(forecast, max_temperature_c=_number(first))
                elif name in {"MinAT", "ATMin"}:
                    forecast = replace(forecast, apparent_min_temperature_c=_number(first))
                elif name in {"MaxAT", "ATMax"}:
                    forecast = replace(forecast, apparent_max_temperature_c=_number(first))
                elif name in {"UVI", "UV"}:
                    forecast = replace(forecast, uv_index=_number(first))
                elif name == "WS":
                    forecast = replace(forecast, wind_speed_mps=_number(first))
                elif name == "WD":
                    direction = _number(first)
                    forecast = replace(
                        forecast,
                        wind_direction_degrees=direction,
                        wind_description=None if direction is not None else first,
                    )
                periods[key] = forecast
        output.extend(periods.values())
    return sorted(output, key=lambda forecast: (forecast.county_name, forecast.town_name, forecast.valid_from))
