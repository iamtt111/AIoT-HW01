// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FeatureCollection, Geometry } from "geojson";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ForecastRecord } from "@/lib/forecast-records";

import { ForecastMap } from "./forecast-map";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  GeoJSON: ({ data, onEachFeature }: { data: CountyCollection; onEachFeature: (feature: CountyCollection["features"][number], layer: { bindTooltip: (...args: unknown[]) => void; openTooltip: () => void; on: (handlers: { click?: () => void }) => void }) => void }) => <div>{data.features.map((feature) => {
    let click: (() => void) | undefined;
    onEachFeature(feature, { bindTooltip: () => undefined, openTooltip: () => undefined, on: (handlers) => { click = handlers.click; } });
    return <button key={feature.properties?.cwa_area_code} type="button" onClick={() => click?.()}>{feature.properties?.area_name}</button>;
  })}</div>,
}));

type CountyProperties = { cwa_area_code?: string; area_name?: string };
type CountyCollection = FeatureCollection<Geometry, CountyProperties>;

const counties: CountyCollection = {
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: { cwa_area_code: "cwa-63000000", area_name: "\u81fa\u5317\u5e02" }, geometry: { type: "Polygon", coordinates: [] } }],
};

const record: ForecastRecord = {
  areaCode: "63000000", areaName: "\u81fa\u5317\u5e02", validFrom: "2026-10-07T00:00:00.000Z", validTo: "2026-10-07T12:00:00.000Z",
  weatherDescription: null, weatherCode: "02", precipitationProbability: 30, minTemperatureC: 22, maxTemperatureC: 28,
  apparentMinTemperatureC: null, apparentMaxTemperatureC: null, uvIndex: 5, windSpeedMps: 3, windDirectionDegrees: null, windDescription: null,
};

const periods = [{ id: `${record.validFrom}|${record.validTo}`, validFrom: record.validFrom, validTo: record.validTo }];

describe("ForecastMap", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => counties }));
  });

  it("selects a county from the map and exposes the active 12-hour period", async () => {
    const onAreaSelect = vi.fn();
    const onPeriodSelect = vi.fn();
    const user = userEvent.setup();
    render(<ForecastMap records={[record]} periods={periods} activePeriodId={periods[0].id} indicator="temperature" selectedAreaCode="" freshness={{ status: "fresh", lastSuccessfulAt: "2026-10-06T12:11:00.000Z" }} onAreaSelect={onAreaSelect} onPeriodSelect={onPeriodSelect} onIndicatorSelect={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "\u81fa\u5317\u5e02" }));
    expect(onAreaSelect).toHaveBeenCalledWith("63000000");
    expect(screen.getByText("\u9ede\u9078\u7e23\u5e02\u67e5\u770b\u9810\u5831")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("\u5730\u5716\u9810\u5831\u6642\u6bb5"), periods[0].id);
    expect(onPeriodSelect).toHaveBeenCalledWith(periods[0].id);
  });

  it("renders stale and unavailable state labels without inventing data", async () => {
    render(<ForecastMap records={[]} periods={[]} activePeriodId={null} indicator="uv" selectedAreaCode="" freshness={{ status: "stale", lastSuccessfulAt: null }} onAreaSelect={vi.fn()} onPeriodSelect={vi.fn()} onIndicatorSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("\u8cc7\u6599\u53ef\u80fd\u5df2\u904e\u671f")).toBeTruthy());
    expect(screen.getAllByText(/\u7121\u8cc7\u6599/).length).toBeGreaterThan(0);
  });

  it("uses concise rainfall wording in the map controls", async () => {
    render(<ForecastMap records={[record]} periods={periods} activePeriodId={periods[0].id} indicator="temperature" selectedAreaCode="" freshness={{ status: "fresh", lastSuccessfulAt: null }} onAreaSelect={vi.fn()} onPeriodSelect={vi.fn()} onIndicatorSelect={vi.fn()} />);

    await screen.findByRole("button", { name: "\u964d\u96e8" });
    expect(screen.queryByRole("button", { name: "\u964d\u96e8\u6a5f\u7387" })).toBeNull();
  });
});
