import { describe, expect, it } from "vitest";

import { optionalForecastTime } from "./forecast-query-params";

describe("optionalForecastTime", () => {
  it("expands a dashboard date to the full calendar day in Taiwan time", () => {
    expect(optionalForecastTime("2026-10-06", "starts_at", "start")).toBe("2026-10-06T00:00:00.000+08:00");
    expect(optionalForecastTime("2026-10-06", "ends_at", "end")).toBe("2026-10-06T23:59:59.999+08:00");
  });

  it("keeps a supplied ISO-8601 timestamp unchanged", () => {
    expect(optionalForecastTime("2026-10-06T04:00:00+00:00", "starts_at", "start")).toBe("2026-10-06T04:00:00+00:00");
  });
});
