import { describe, expect, it } from "vitest";

import { apparentTemperatureSummary, indicatorChartSeries, weatherPresentation, weatherSourceExtras, weatherSummary, windForceLabel, windSummary } from "./weather-presentation";
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

  it("formats persisted apparent temperature and wind values for detailed forecasts", () => {
    expect(apparentTemperatureSummary(21, 22)).toBe("\u9ad4\u611f\uff1a21\u00b0C - 22\u00b0C");
    expect(apparentTemperatureSummary(null, null)).toBeNull();
    expect(windSummary(270, null, 2)).toBe("\u504f\u897f\u98a8 \u98a8\u901f2\u7d1a\uff082 m/s\uff09");
    expect(windForceLabel(2)).toBe("2\u7d1a");
    expect(windSummary(null, "\u504f\u6771\u98a8", null)).toBe("\u504f\u6771\u98a8");
  });

  it("splits the CWA source sentence into a compact summary and non-duplicated extras", () => {
    const source = "\u9670\u77ed\u66ab\u9663\u96e8\u3002\u964d\u96e8\u6a5f\u738730%\u3002\u6eab\u5ea6\u651d\u6c0f21\u81f325\u5ea6\u3002\u8212\u9069\u3002\u504f\u897f\u98a8 \u98a8\u901f2\u7d1a(2\u516c\u5c3a)\u3002\u76f8\u5c0d\u6fd5\u5ea671%\u3002";
    expect(weatherSummary(source, "\u591a\u96f2")).toBe("\u9670\u77ed\u66ab\u9663\u96e8");
    expect(weatherSourceExtras(source)).toEqual({ comfort: "\u8212\u9069", relativeHumidity: "\u76f8\u5c0d\u6fd5\u5ea671%" });
  });
});
