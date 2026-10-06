import { describe, expect, it } from "vitest";

import { mapValueForRecord, temperatureTrend } from "./forecast-presentation";
import type { ForecastRecord } from "./forecast-records";

const fixture: ForecastRecord = {
  areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-06T00:00:00Z", validTo: "2026-10-06T12:00:00Z",
  weatherDescription: null, weatherCode: null, precipitationProbability: 60, minTemperatureC: 22, maxTemperatureC: 27,
  apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: 5, windSpeedMps: 3.5, windDirectionDegrees: null, windDescription: null,
};

describe("forecast presentation", () => {
  it("selects each supported map indicator without inventing a missing value", () => {
    expect(mapValueForRecord(fixture, "temperature")).toEqual({ value: 27, unit: "\u00b0C" });
    expect(mapValueForRecord(fixture, "precipitation")).toEqual({ value: 60, unit: "%" });
    expect(mapValueForRecord(fixture, "uv")).toEqual({ value: 5, unit: "" });
    expect(mapValueForRecord(fixture, "wind")).toEqual({ value: 3.5, unit: "m/s" });
    expect(mapValueForRecord(undefined, "wind").value).toBeNull();
  });

  it("keeps every returned period in the temperature trend", () => {
    expect(temperatureTrend([fixture, { ...fixture, validFrom: "2026-10-07T00:00:00Z", maxTemperatureC: 29 }])).toHaveLength(2);
  });
});
