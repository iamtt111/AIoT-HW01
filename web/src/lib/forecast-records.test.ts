import { describe, expect, it } from "vitest";

import { filterForecastRecords, type ForecastRecord } from "./forecast-records";

const records: ForecastRecord[] = [
  {
    countyCode: "630", countyName: "Taipei", townCode: "6300100", townName: "Songshan",
    validFrom: "2026-10-05T00:00:00+08:00", validTo: "2026-10-05T12:00:00+08:00",
    weatherDescription: null, weatherCode: null, precipitationProbability: null,
    minTemperatureC: 20, maxTemperatureC: 28, apparentMinTemperatureC: null,
    apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: null,
    windDirectionDegrees: null, windDescription: null,
  },
  {
    countyCode: "630", countyName: "Taipei", townCode: "6300100", townName: "Songshan",
    validFrom: "2026-10-05T12:00:00+08:00", validTo: "2026-10-06T00:00:00+08:00",
    weatherDescription: null, weatherCode: null, precipitationProbability: null,
    minTemperatureC: 21, maxTemperatureC: 29, apparentMinTemperatureC: null,
    apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: null,
    windDirectionDegrees: null, windDescription: null,
  },
  {
    countyCode: "650", countyName: "New Taipei", townCode: "6500100", townName: "Banqiao",
    validFrom: "2026-10-05T00:00:00+08:00", validTo: "2026-10-05T12:00:00+08:00",
    weatherDescription: null, weatherCode: null, precipitationProbability: null,
    minTemperatureC: 19, maxTemperatureC: 27, apparentMinTemperatureC: null,
    apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: null,
    windDirectionDegrees: null, windDescription: null,
  },
];

describe("filterForecastRecords", () => {
  it("returns matching county, town, and overlapping valid periods", () => {
    const result = filterForecastRecords(records, {
      countyCode: "630",
      townCode: "6300100",
      startsAt: "2026-10-05T06:00:00+08:00",
      endsAt: "2026-10-05T18:00:00+08:00",
    });
    expect(result).toHaveLength(2);
  });

  it("returns an empty result when filters do not match", () => {
    expect(filterForecastRecords(records, { countyCode: "999" })).toEqual([]);
  });
});
