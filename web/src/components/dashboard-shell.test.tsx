// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ForecastRecord } from "@/lib/forecast-records";

vi.mock("next/dynamic", () => ({
  default: () => ({ onAreaSelect }: { onAreaSelect: (areaCode: string) => void }) => <button type="button" onClick={() => onAreaSelect("66000000")}>地圖選取臺中市</button>,
}));

vi.mock("./forecast-details", () => ({
  ForecastDetails: ({ records }: { records: ForecastRecord[] }) => <p>{records.map((record) => record.areaName).join(",")}</p>,
}));

import { DashboardShell } from "./dashboard-shell";

const taipei: ForecastRecord = {
  areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-06T12:00:00.000Z", validTo: "2026-10-07T00:00:00.000Z",
  weatherDescription: null, weatherCode: "02", precipitationProbability: 30, minTemperatureC: 22, maxTemperatureC: 28,
  apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: 5, windSpeedMps: 3, windDirectionDegrees: null, windDescription: null,
};
const taichung: ForecastRecord = {
  ...taipei, areaCode: "66000000", areaName: "\u81fa\u4e2d\u5e02", validFrom: "2026-10-08T00:00:00.000Z", validTo: "2026-10-09T00:00:00.000Z",
};
let shouldFailForecastFetch = false;

function response(body: unknown) {
  return { ok: true, json: async () => body };
}

describe("DashboardShell selection", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    shouldFailForecastFetch = false;
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: true })) });
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("fetch", vi.fn((input: string | URL) => {
      const url = String(input);
      if (url === "/api/locations") return Promise.resolve(response({ areas: [{ areaCode: taipei.areaCode, areaName: taipei.areaName }, { areaCode: taichung.areaCode, areaName: taichung.areaName }] }));
      if (url === "/api/freshness") return Promise.resolve(response({ status: "fresh", lastSuccessfulAt: "2026-10-06T12:11:00.000Z" }));
      const areaCode = new URL(url, "https://example.test").searchParams.get("area_code");
      if (shouldFailForecastFetch) return Promise.resolve({ ok: false, json: async () => ({}) });
      return Promise.resolve(response({ records: areaCode === taichung.areaCode ? [taichung] : [taipei] }));
    }));
  });

  it("keeps the accessible selector synchronized with a map-driven county selection", async () => {
    const user = userEvent.setup();
    render(<DashboardShell />);

    const selector = await screen.findByLabelText("\u7e23\u5e02");
    await waitFor(() => expect((selector as HTMLSelectElement).value).toBe(taipei.areaCode));
    await user.click(screen.getByRole("button", { name: "\u5730\u5716\u9078\u53d6\u81fa\u4e2d\u5e02" }));

    await waitFor(() => expect((selector as HTMLSelectElement).value).toBe(taichung.areaCode));
    expect(screen.getByDisplayValue("2026-10-08")).toBeTruthy();
    expect(screen.getByDisplayValue("2026-10-09")).toBeTruthy();
  });

  it("uses the fallback selector to update the county detail state", async () => {
    render(<DashboardShell />);

    const selector = await screen.findByLabelText("\u7e23\u5e02");
    await waitFor(() => expect(screen.getByDisplayValue("2026-10-06")).toBeTruthy());
    fireEvent.change(selector, { target: { value: taichung.areaCode } });

    await waitFor(() => expect(screen.getByRole("heading", { name: "\u81fa\u4e2d\u5e02\u7684\u9810\u5831\u8a73\u7d30" })).toBeTruthy());
    await waitFor(() => expect(screen.getByDisplayValue("2026-10-08")).toBeTruthy());
    expect(screen.getByDisplayValue("2026-10-09")).toBeTruthy();
  });

  it("keeps the last successful county detail visible when a refresh fails", async () => {
    render(<DashboardShell />);

    await waitFor(() => expect(screen.getAllByText("\u81fa\u5317\u5e02").length).toBeGreaterThan(1));
    shouldFailForecastFetch = true;
    fireEvent.change(screen.getByLabelText("\u958b\u59cb\u65e5\u671f"), { target: { value: "2026-10-07" } });

    await waitFor(() => expect(screen.getByText("\u66ab\u6642\u7121\u6cd5\u66f4\u65b0\u6240\u9078\u9810\u5831\uff1b\u6b63\u4fdd\u7559\u4e0a\u4e00\u6b21\u6210\u529f\u986f\u793a\u7684\u8cc7\u6599\u3002")).toBeTruthy());
    expect(screen.getAllByText("\u81fa\u5317\u5e02").length).toBeGreaterThan(1);
  });
});
