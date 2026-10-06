import { describe, expect, it } from "vitest";
import { resolveDashboardState } from "./dashboard-state";

describe("resolveDashboardState", () => {
  it("represents loading, empty, stale, error, and ready API responses", () => {
    expect(resolveDashboardState({ isLoading: true, hasError: false, areaCount: 0, freshnessStatus: "empty" })).toBe("loading");
    expect(resolveDashboardState({ isLoading: false, hasError: false, areaCount: 0, freshnessStatus: "empty" })).toBe("empty");
    expect(resolveDashboardState({ isLoading: false, hasError: false, areaCount: 22, freshnessStatus: "stale" })).toBe("stale");
    expect(resolveDashboardState({ isLoading: false, hasError: true, areaCount: 0, freshnessStatus: "empty" })).toBe("error");
    expect(resolveDashboardState({ isLoading: false, hasError: false, areaCount: 22, freshnessStatus: "fresh" })).toBe("ready");
  });
});
