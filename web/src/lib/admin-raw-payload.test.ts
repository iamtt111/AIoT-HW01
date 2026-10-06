import { afterEach, describe, expect, it } from "vitest";

import { getLatestRawPayload, redactSensitiveValues } from "./admin-raw-payload";

const originalEnvironment = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnvironment);
});

describe("protected raw payloads", () => {
  it("redacts sensitive field names and configured values", () => {
    expect(redactSensitiveValues({ Authorization: "key", nested: { note: "keep me" } }, ["key"])).toEqual({
      Authorization: "[REDACTED]",
      nested: { note: "keep me" },
    });
    expect(redactSensitiveValues("contains key", ["key"])).toBe("contains [REDACTED]");
  });

  it("returns raw payload metadata without server credentials", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_example";
    process.env.CWA_API_KEY = "cwa-private-value";

    const result = await getLatestRawPayload(async () => new Response(JSON.stringify([{
      sync_run_id: "run-1",
      payload: { records: { note: "cwa-private-value" } },
      content_checksum: "checksum",
      source_url: "https://example.test/F-D0047-091",
      fetched_at: "2026-10-06T00:00:00Z",
      sync_runs: {
        source_dataset_id: "F-D0047-091",
        status: "succeeded",
        source_published_at: null,
        completed_at: "2026-10-06T00:01:00Z",
        error_summary: "request used cwa-private-value",
      },
    }]), { status: 200 }));

    expect(result?.payload).toEqual({ records: { note: "[REDACTED]" } });
    expect(result?.syncRun.errorSummary).toBe("request used [REDACTED]");
    expect(JSON.stringify(result)).not.toContain("cwa-private-value");
    expect(JSON.stringify(result)).not.toContain("sb_secret_example");
  });
});
