// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ForecastRecord } from "@/lib/forecast-records";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  AreaChart: ({ children }: { children: ReactNode }) => <svg data-testid="area-chart">{children}</svg>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Line: () => null,
  Bar: () => null,
  Area: () => null,
}));

import { ForecastDetails } from "./forecast-details";

const records: ForecastRecord[] = [
  {
    areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-06T12:00:00.000Z", validTo: "2026-10-07T00:00:00.000Z",
    weatherDescription: "\u6674\u6642\u591a\u96f2\u6709\u77ed\u66ab\u96e8", weatherCode: "02", precipitationProbability: 30, minTemperatureC: 22, maxTemperatureC: 28,
    apparentMinTemperatureC: 21, apparentMaxTemperatureC: 25, uvIndex: 5, windSpeedMps: 2, windDirectionDegrees: 270, windDescription: null,
  },
  {
    areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-07T00:00:00.000Z", validTo: "2026-10-07T12:00:00.000Z",
    weatherDescription: null, weatherCode: "99", precipitationProbability: null, minTemperatureC: 21, maxTemperatureC: 27,
    apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: null, windSpeedMps: null, windDirectionDegrees: null, windDescription: null,
  },
];

describe("ForecastDetails", () => {
  afterEach(() => cleanup());

  it("switches the primary visualization for all four map indicators while retaining returned periods", () => {
    const { rerender } = render(<ForecastDetails records={records} indicator="temperature" />);
    expect(screen.getByText("\u6eab\u5ea6\u8d70\u52e2")).toBeTruthy();
    expect(screen.getByTestId("line-chart")).toBeTruthy();
    expect(screen.getByLabelText("\u6674\u6642\u591a\u96f2")).toBeTruthy();

    rerender(<ForecastDetails records={records} indicator="precipitation" />);
    expect(screen.getByText("\u964d\u96e8\u6a5f\u7387\u8d70\u52e2")).toBeTruthy();
    expect(screen.getByTestId("bar-chart")).toBeTruthy();
    rerender(<ForecastDetails records={records} indicator="uv" />);
    expect(screen.getByText("\u7d2b\u5916\u7dda\u8d70\u52e2")).toBeTruthy();
    expect(screen.getByTestId("area-chart")).toBeTruthy();
    rerender(<ForecastDetails records={records} indicator="wind" />);
    expect(screen.getByText("\u98a8\u901f\u8d70\u52e2")).toBeTruthy();
    expect(screen.getAllByText("\u5929\u6c23\u672a\u77e5").length).toBeGreaterThan(0);
  });

  it("keeps compact weather presentation while exposing persisted source details", () => {
    render(<ForecastDetails records={records} indicator="temperature" />);

    expect(screen.getByText("\u6674\u6642\u591a\u96f2\u6709\u77ed\u66ab\u96e8")).toBeTruthy();
    expect(screen.getByLabelText("\u6674\u6642\u591a\u96f2")).toBeTruthy();
    expect(screen.queryByText("\u9ad4\u611f\uff1a21\u00b0C - 25\u00b0C")).toBeNull();
    expect(screen.getByText("2\u7d1a")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "\u986f\u793a\u66f4\u591a\u9810\u5831\u8cc7\u8a0a" })[0]);
    expect(screen.getByText("21\u00b0C - 25\u00b0C")).toBeTruthy();
    expect(screen.getByText("\u504f\u897f\u98a8 \u98a8\u901f2\u7d1a\uff082 m/s\uff09")).toBeTruthy();
    expect(screen.getByText(/\u4e2d\u91cf\u7d1a/)).toBeTruthy();
    expect(screen.getByText(/\u4e2d\u5348\u5916\u51fa\u5efa\u8b70\u4f7f\u7528\u9632\u66ec\u7528\u54c1/)).toBeTruthy();
    expect(screen.getAllByText("\u2014").length).toBeGreaterThan(0);
  });
});
