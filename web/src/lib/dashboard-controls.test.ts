import { describe, expect, it } from "vitest";

import { forecastQuery, normalizeDateScope } from "./dashboard-controls";

describe("dashboard controls", () => {
  it("keeps a selected county and serializes its date range", () => {
    expect(forecastQuery({
      areaCode: "63000000",
      startsAt: "2026-10-06",
      endsAt: "2026-10-08",
    })).toBe("/api/forecasts?area_code=63000000&starts_at=2026-10-06&ends_at=2026-10-08");
  });

  it("normalizes an inverted date range before it reaches the API", () => {
    expect(normalizeDateScope("2026-10-09", "2026-10-06")).toEqual({
      startsAt: "2026-10-06",
      endsAt: "2026-10-09",
    });
  });
});
