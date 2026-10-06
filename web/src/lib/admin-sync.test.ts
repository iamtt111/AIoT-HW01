import { afterEach, describe, expect, it } from "vitest";

import { dispatchManualSynchronization } from "./admin-sync";

const originalEnvironment = { ...process.env };

function configureServer() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_example";
  process.env.GITHUB_ACTIONS_SYNC_TOKEN = "github-token";
  process.env.GITHUB_REPOSITORY = "owner/repository";
}

afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnvironment);
});

describe("manual synchronization dispatch", () => {
  it("dispatches an idle synchronization and reports the GitHub workflow", async () => {
    configureServer();
    const calls: Array<RequestInfo | URL> = [];
    const result = await dispatchManualSynchronization(async (input) => {
      calls.push(input);
      if (calls.length === 1) return new Response("[]", { status: 200 });
      return new Response(JSON.stringify({ workflow_run_id: 42, html_url: "https://example.test/run/42" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });

    expect(result).toEqual({ status: "accepted", workflowRunId: 42, workflowUrl: "https://example.test/run/42" });
    expect(String(calls[1])).toContain("cwa-forecast-sync.yml/dispatches");
  });

  it("rejects a request while a forecast synchronization is active", async () => {
    configureServer();
    const result = await dispatchManualSynchronization(async () => new Response(
      JSON.stringify([{ id: "active-run" }]), { status: 200 },
    ));
    expect(result).toEqual({ status: "already_running", syncRunId: "active-run" });
  });

  it("reports an upstream dispatch failure without returning credentials", async () => {
    configureServer();
    let call = 0;
    const result = await dispatchManualSynchronization(async () => {
      call += 1;
      return call === 1 ? new Response("[]", { status: 200 }) : new Response("denied", { status: 403 });
    });
    expect(result).toEqual({ status: "failed" });
  });
});
