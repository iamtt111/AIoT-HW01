"""Defensive normalization for the CWA F-D0047-091 county forecast payload."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
import math
from typing import Any, Iterable


MISSING_VALUES = {"", "-", "--", "...", "-99", "-999", "nan", "null", "none"}


@dataclass(frozen=True)
class NormalizedForecast:
    area_name: str
    area_code: str | None
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


def _field(mapping: dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in mapping:
            return mapping[name]
    return None


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


def _element_values(period: dict[str, Any]) -> tuple[list[str | None], dict[str, str]]:
    """Return values in source order plus a case-insensitive field lookup."""
    ordered: list[str | None] = []
    named: dict[str, str] = {}
    for item in _items(_field(period, "ElementValue", "elementValue")):
        for key, value in item.items():
            text = _text(value)
            ordered.append(text)
            if text is not None:
                named.setdefault(key.casefold(), text)
    return ordered, named


def _value(ordered: list[str | None], named: dict[str, str], *names: str, index: int = 0) -> str | None:
    for name in names:
        found = named.get(name.casefold())
        if found is not None:
            return found
    return ordered[index] if index < len(ordered) else None


def _locations(records: dict[str, Any]) -> Iterable[dict[str, Any]]:
    for group in _items(_field(records, "Locations", "locations")):
        yield from _items(_field(group, "Location", "location"))
    yield from _items(_field(records, "Location", "location"))


def parse_forecasts(payload: dict[str, Any]) -> list[NormalizedForecast]:
    """Normalize valid county forecast periods and retain optional missing values."""
    records = payload.get("records")
    if not isinstance(records, dict):
        return []

    output: list[NormalizedForecast] = []
    for location in _locations(records):
        area_name = _text(_field(location, "LocationName", "locationName", "countyName"))
        area_code = _text(_field(location, "Geocode", "geocode", "countyCode"))
        if area_name is None or area_code is None:
            continue

        periods: dict[tuple[datetime, datetime], NormalizedForecast] = {}
        for element in _items(_field(location, "WeatherElement", "weatherElement")):
            name = _text(_field(element, "ElementName", "elementName"))
            if name is None:
                continue
            for period in _items(_field(element, "Time", "time")):
                start = _time(_field(period, "StartTime", "startTime"))
                end = _time(_field(period, "EndTime", "endTime"))
                if start is None or end is None or end <= start:
                    continue
                key = (start, end)
                forecast = periods.setdefault(key, NormalizedForecast(area_name, area_code, start, end))
                ordered, named = _element_values(period)
                first = _value(ordered, named)
                second = _value(ordered, named, index=1)

                if name in {"Wx", "WeatherDescription", "天氣現象", "天氣預報綜合描述"}:
                    forecast = replace(
                        forecast,
                        weather_description=_value(
                            ordered, named, "WeatherDescription", "Weather", index=0
                        ) or forecast.weather_description,
                        weather_code=_value(ordered, named, "WeatherCode", index=1)
                        or forecast.weather_code,
                    )
                elif name in {"PoP", "PoP6h", "PoP12h", "12小時降雨機率"}:
                    forecast = replace(
                        forecast,
                        precipitation_probability=_number(
                            _value(ordered, named, "ProbabilityOfPrecipitation") or first
                        ),
                    )
                elif name in {"MinT", "最低溫度"}:
                    forecast = replace(
                        forecast,
                        min_temperature_c=_number(_value(ordered, named, "MinTemperature") or first),
                    )
                elif name in {"MaxT", "最高溫度"}:
                    forecast = replace(
                        forecast,
                        max_temperature_c=_number(_value(ordered, named, "MaxTemperature") or first),
                    )
                elif name in {"MinAT", "ATMin", "最低體感溫度"}:
                    forecast = replace(
                        forecast,
                        apparent_min_temperature_c=_number(
                            _value(ordered, named, "MinApparentTemperature") or first
                        ),
                    )
                elif name in {"MaxAT", "ATMax", "最高體感溫度"}:
                    forecast = replace(
                        forecast,
                        apparent_max_temperature_c=_number(
                            _value(ordered, named, "MaxApparentTemperature") or first
                        ),
                    )
                elif name in {"UVI", "UV", "紫外線指數"}:
                    forecast = replace(
                        forecast,
                        uv_index=_number(_value(ordered, named, "UVIndex") or first),
                    )
                elif name in {"WS", "風速"}:
                    forecast = replace(
                        forecast,
                        wind_speed_mps=_number(_value(ordered, named, "WindSpeed") or first),
                    )
                elif name in {"WD", "風向"}:
                    direction_text = _value(ordered, named, "WindDirection") or first
                    direction = _number(direction_text)
                    forecast = replace(
                        forecast,
                        wind_direction_degrees=direction,
                        wind_description=None if direction is not None else direction_text,
                    )
                periods[key] = forecast
        output.extend(periods.values())
    return sorted(output, key=lambda forecast: (forecast.area_name, forecast.valid_from))
