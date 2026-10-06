export type SyncRun = {
  status: "running" | "succeeded" | "failed" | "skipped";
  completedAt: string | null;
};

export type Freshness = {
  status: "fresh" | "stale" | "unavailable";
  lastSuccessfulAt: string | null;
  latestSyncStatus: SyncRun["status"] | null;
};

type SyncRunRow = {
  status: SyncRun["status"];
  completed_at: string | null;
};

export function deriveFreshness(latest: SyncRun | null, lastSuccessfulAt: string | null): Freshness {
  if (!latest) {
    return { status: "unavailable", lastSuccessfulAt: null, latestSyncStatus: null };
  }
  if (latest.status === "succeeded") {
    return { status: "fresh", lastSuccessfulAt: latest.completedAt, latestSyncStatus: latest.status };
  }
  return {
    status: lastSuccessfulAt ? "stale" : "unavailable",
    lastSuccessfulAt,
    latestSyncStatus: latest.status,
  };
}

async function getRun(
  url: string,
  secretKey: string,
  statusFilter: string | undefined,
  fetcher: typeof fetch,
): Promise<SyncRun | null> {
  const endpoint = new URL(`${url}/rest/v1/sync_runs`);
  endpoint.searchParams.set("select", "status,completed_at");
  endpoint.searchParams.set("source_dataset_id", "eq.F-D0047-091");
  if (statusFilter) endpoint.searchParams.set("status", statusFilter);
  endpoint.searchParams.set("order", "completed_at.desc");
  endpoint.searchParams.set("limit", "1");
  const response = await fetcher(endpoint, {
    cache: "no-store",
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) throw new Error(`Supabase sync status query failed with HTTP ${response.status}`);
  const rows = (await response.json()) as SyncRunRow[];
  const row = rows[0];
  return row ? { status: row.status, completedAt: row.completed_at } : null;
}

export async function getForecastFreshness(fetcher: typeof fetch = fetch): Promise<Freshness> {
  const { url, secretKey } = serverSupabaseConfig();
  const latest = await getRun(url, secretKey, undefined, fetcher);
  const latestSuccess = latest?.status === "succeeded"
    ? latest
    : await getRun(url, secretKey, "eq.succeeded", fetcher);
  return deriveFreshness(latest, latestSuccess?.completedAt ?? null);
}
import { serverSupabaseConfig } from "./server-supabase";
