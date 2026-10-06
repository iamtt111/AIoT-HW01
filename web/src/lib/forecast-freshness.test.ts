import { describe, expect, it } from "vitest";

import { deriveFreshness } from "./forecast-freshness";

describe("deriveFreshness", () => {
  it("reports a successful latest synchronization as fresh", () => {
    expect(deriveFreshness({ status: "succeeded", completedAt: "2026-10-05T06:00:00Z" }, null)).toEqual({
      status: "fresh",
      lastSuccessfulAt: "2026-10-05T06:00:00Z",
      latestSyncStatus: "succeeded",
    });
  });

  it("keeps the prior successful time when the latest run failed", () => {
    expect(deriveFreshness(
      { status: "failed", completedAt: "2026-10-05T12:00:00Z" },
      "2026-10-05T06:00:00Z",
    )).toEqual({
      status: "stale",
      lastSuccessfulAt: "2026-10-05T06:00:00Z",
      latestSyncStatus: "failed",
    });
  });
});
