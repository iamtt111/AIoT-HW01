import { serverSupabaseConfig } from "./server-supabase";

const DATASET_ID = "F-D0047-091";
const WORKFLOW_FILE = "cwa-forecast-sync.yml";

export type SyncDispatchResult =
  | { status: "accepted"; workflowRunId: number | null; workflowUrl: string | null }
  | { status: "already_running"; syncRunId: string }
  | { status: "failed" };

type ActiveRunRow = { id: string };

function githubSyncConfiguration() {
  const token = process.env.GITHUB_ACTIONS_SYNC_TOKEN?.trim();
  const repository = process.env.GITHUB_REPOSITORY?.trim();
  const ref = process.env.GITHUB_SYNC_REF?.trim() || "main";
  if (!token || !repository || !repository.includes("/")) {
    throw new Error("GitHub Actions synchronization is not configured");
  }
  return { ref, repository, token };
}

async function getActiveRun(fetcher: typeof fetch): Promise<string | null> {
  const { url, secretKey } = serverSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/sync_runs`);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("source_dataset_id", `eq.${DATASET_ID}`);
  endpoint.searchParams.set("status", "eq.running");
  endpoint.searchParams.set("limit", "1");
  const response = await fetcher(endpoint, {
    cache: "no-store",
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) throw new Error(`Supabase active sync query failed with HTTP ${response.status}`);
  const rows = (await response.json()) as ActiveRunRow[];
  return rows[0]?.id ?? null;
}

export async function dispatchManualSynchronization(fetcher: typeof fetch = fetch): Promise<SyncDispatchResult> {
  const activeRunId = await getActiveRun(fetcher);
  if (activeRunId) return { status: "already_running", syncRunId: activeRunId };

  const { ref, repository, token } = githubSyncConfiguration();
  const response = await fetcher(
    `https://api.github.com/repos/${repository}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      body: JSON.stringify({ ref }),
    },
  );
  if (!response.ok) return { status: "failed" };

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json() as { html_url?: string; workflow_run_id?: number }
    : {};
  return {
    status: "accepted",
    workflowRunId: typeof body.workflow_run_id === "number" ? body.workflow_run_id : null,
    workflowUrl: typeof body.html_url === "string" ? body.html_url : null,
  };
}
