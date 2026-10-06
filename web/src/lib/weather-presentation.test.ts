import { describe, expect, it } from "vitest";

import { indicatorChartSeries, weatherPresentation } from "./weather-presentation";
import type { ForecastRecord } from "./forecast-records";

const record: ForecastRecord = {
  areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-06T00:00:00Z", validTo: "2026-10-06T12:00:00Z",
  weatherDescription: "\u6674\u6717", weatherCode: "01", precipitationProbability: 60, minTemperatureC: 22, maxTemperatureC: 27,
  apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: 5, windSpeedMps: 3.5, windDirectionDegrees: null, windDescription: null,
};

describe("weather presentation", () => {
  it("maps supported and unknown weather codes to accessible compact presentations", () => {
    expect(weatherPresentation("01")).toEqual({ icon: "sun", label: "\u6674\u6717" });
    expect(weatherPresentation("08").icon).toBe("cloud-rain");
    expect(weatherPresentation("unknown")).toEqual({ icon: "cloudy", label: "\u5929\u6c23\u672a\u77e5" });
  });

  it("creates indicator-specific chart values without inventing null values", () => {
    expect(indicatorChartSeries([record], "temperature")[0]).toMatchObject({ primary: 27, secondary: 22 });
    expect(indicatorChartSeries([record], "precipitation")[0].primary).toBe(60);
    expect(indicatorChartSeries([{ ...record, uvIndex: null }], "uv")[0].primary).toBeNull();
    expect(indicatorChartSeries([record], "wind")[0].primary).toBe(3.5);
  });
});
