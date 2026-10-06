import { describe, expect, it } from "vitest";

import { availableMapPeriods, detailDateRangeForArea, futureWeekDateRangeForArea, nextMapPeriod, recordsForMapPeriod } from "./dashboard-selection";
import type { ForecastRecord } from "./forecast-records";

const records: ForecastRecord[] = [
  {
    areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-06T12:00:00.000Z", validTo: "2026-10-07T00:00:00.000Z",
    weatherDescription: null, weatherCode: "02", precipitationProbability: 30, minTemperatureC: 22, maxTemperatureC: 28,
    apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: 5, windSpeedMps: 3, windDirectionDegrees: null, windDescription: null,
  },
  {
    areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-07T00:00:00.000Z", validTo: "2026-10-07T12:00:00.000Z",
    weatherDescription: null, weatherCode: "03", precipitationProbability: 40, minTemperatureC: 21, maxTemperatureC: 27,
    apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: 4, windSpeedMps: 4, windDirectionDegrees: null, windDescription: null,
  },
  {
    areaCode: "66000000", areaName: "\u81fa\u4e2d\u5e02", validFrom: "2026-10-07T00:00:00.000Z", validTo: "2026-10-07T12:00:00.000Z",
    weatherDescription: null, weatherCode: "01", precipitationProbability: null, minTemperatureC: 20, maxTemperatureC: 29,
    apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: 2, windDirectionDegrees: null, windDescription: null,
  },
];

describe("dashboard selection", () => {
  it("deduplicates periods and selects the next future 12-hour period", () => {
    const periods = availableMapPeriods(records);
    expect(periods).toHaveLength(2);
    expect(nextMapPeriod(periods, new Date("2026-10-06T18:00:00.000Z"))?.validFrom).toBe("2026-10-07T00:00:00.000Z");
  });

  it("falls back to the earliest period and filters only exact matching records", () => {
    const periods = availableMapPeriods(records);
    expect(nextMapPeriod(periods, new Date("2026-10-08T00:00:00.000Z"))?.id).toBe(periods[0].id);
    expect(recordsForMapPeriod(records, periods[1].id)).toHaveLength(2);
    expect(recordsForMapPeriod(records, null)).toEqual([]);
  });

  it("derives the selected county range in Taiwan calendar dates", () => {
    expect(detailDateRangeForArea(records, "63000000")).toEqual({ startsAt: "2026-10-06", endsAt: "2026-10-07" });
    expect(detailDateRangeForArea(records, "missing")).toBeNull();
  });

  it("defaults detail data to the upcoming seven calendar days and clamps to availability", () => {
    expect(futureWeekDateRangeForArea(records, "63000000", new Date("2026-10-06T13:00:00.000Z"))).toEqual({ startsAt: "2026-10-06", endsAt: "2026-10-07" });
    expect(futureWeekDateRangeForArea(records, "missing", new Date("2026-10-06T13:00:00.000Z"))).toBeNull();
  });
});
