export type DashboardState = "loading" | "ready" | "empty" | "stale" | "error";

export function resolveDashboardState(input: { isLoading: boolean; hasError: boolean; areaCount: number; freshnessStatus: "fresh" | "stale" | "empty" }): DashboardState {
  if (input.isLoading) return "loading";
  if (input.hasError) return "error";
  if (input.freshnessStatus === "stale") return "stale";
  if (input.areaCount === 0 || input.freshnessStatus === "empty") return "empty";
  return "ready";
}
