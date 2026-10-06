import { describe, expect, it } from "vitest";

import { filterForecastRecords, type ForecastRecord } from "./forecast-records";

const records: ForecastRecord[] = [
  {
    areaCode: "6300000", areaName: "臺北市",
    validFrom: "2026-10-05T00:00:00+08:00", validTo: "2026-10-05T12:00:00+08:00",
    weatherDescription: null, weatherCode: null, precipitationProbability: null,
    minTemperatureC: 20, maxTemperatureC: 28, apparentMinTemperatureC: null,
    apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: null,
    windDirectionDegrees: null, windDescription: null,
  },
  {
    areaCode: "6300000", areaName: "臺北市",
    validFrom: "2026-10-05T12:00:00+08:00", validTo: "2026-10-06T00:00:00+08:00",
    weatherDescription: null, weatherCode: null, precipitationProbability: null,
    minTemperatureC: 21, maxTemperatureC: 29, apparentMinTemperatureC: null,
    apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: null,
    windDirectionDegrees: null, windDescription: null,
  },
  {
    areaCode: "6500000", areaName: "新北市",
    validFrom: "2026-10-05T00:00:00+08:00", validTo: "2026-10-05T12:00:00+08:00",
    weatherDescription: null, weatherCode: null, precipitationProbability: null,
    minTemperatureC: 19, maxTemperatureC: 27, apparentMinTemperatureC: null,
    apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: null,
    windDirectionDegrees: null, windDescription: null,
  },
];

describe("filterForecastRecords", () => {
  it("returns matching county and overlapping valid periods", () => {
    const result = filterForecastRecords(records, {
      areaCode: "6300000",
      startsAt: "2026-10-05T06:00:00+08:00",
      endsAt: "2026-10-05T18:00:00+08:00",
    });
    expect(result).toHaveLength(2);
  });

  it("returns an empty result when the county does not match", () => {
    expect(filterForecastRecords(records, { areaCode: "9999999" })).toEqual([]);
  });
});
