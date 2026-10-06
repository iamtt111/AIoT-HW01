import { serverSupabaseConfig } from "./server-supabase";

type RawPayloadRow = {
  content_checksum: string;
  fetched_at: string;
  payload: unknown;
  source_url: string | null;
  sync_run_id: string;
  sync_runs: {
    completed_at: string | null;
    error_summary: string | null;
    source_dataset_id: string;
    source_published_at: string | null;
    status: string;
  } | null;
};

export type AdminRawPayload = {
  contentChecksum: string;
  fetchedAt: string;
  payload: unknown;
  sourceUrl: string | null;
  syncRun: {
    completedAt: string | null;
    errorSummary: string | null;
    id: string;
    sourceDatasetId: string;
    sourcePublishedAt: string | null;
    status: string;
  };
};

const sensitiveKey = /(authorization|api[_-]?key|token|secret|password|credential)/i;

function configuredSecrets(): string[] {
  return [
    process.env.ADMIN_PASSWORD,
    process.env.ADMIN_SESSION_SECRET,
    process.env.CWA_API_KEY,
    process.env.GITHUB_ACTIONS_SYNC_TOKEN,
    process.env.SUPABASE_SECRET_KEY,
  ].filter((value): value is string => Boolean(value));
}

function redactString(value: string, secrets: string[]): string {
  return secrets.reduce((redacted, secret) => redacted.replaceAll(secret, "[REDACTED]"), value);
}

export function redactSensitiveValues(value: unknown, secrets = configuredSecrets()): unknown {
  if (typeof value === "string") return redactString(value, secrets);
  if (Array.isArray(value)) return value.map((entry) => redactSensitiveValues(entry, secrets));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : redactSensitiveValues(entry, secrets),
    ]),
  );
}

export async function getLatestRawPayload(fetcher: typeof fetch = fetch): Promise<AdminRawPayload | null> {
  const { url, secretKey } = serverSupabaseConfig();
  const endpoint = new URL(`${url}/rest/v1/raw_payloads`);
  endpoint.searchParams.set(
    "select",
    "sync_run_id,payload,content_checksum,source_url,fetched_at,sync_runs(source_dataset_id,status,source_published_at,completed_at,error_summary)",
  );
  endpoint.searchParams.set("order", "fetched_at.desc");
  endpoint.searchParams.set("limit", "1");

  const response = await fetcher(endpoint, {
    cache: "no-store",
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) throw new Error(`Supabase raw payload query failed with HTTP ${response.status}`);

  const rows = (await response.json()) as RawPayloadRow[];
  const row = rows[0];
  if (!row || !row.sync_runs) return null;

  return {
    contentChecksum: row.content_checksum,
    fetchedAt: row.fetched_at,
    payload: redactSensitiveValues(row.payload),
    sourceUrl: row.source_url ? String(redactSensitiveValues(row.source_url)) : null,
    syncRun: {
      completedAt: row.sync_runs.completed_at,
      errorSummary: row.sync_runs.error_summary
        ? String(redactSensitiveValues(row.sync_runs.error_summary))
        : null,
      id: row.sync_run_id,
      sourceDatasetId: row.sync_runs.source_dataset_id,
      sourcePublishedAt: row.sync_runs.source_published_at,
      status: row.sync_runs.status,
    },
  };
}
