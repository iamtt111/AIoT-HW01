import { afterEach, describe, expect, it } from "vitest";

import { NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

import { GET as getRawPayload } from "./raw-payload/route";
import { GET as getSession, POST as postSession } from "./session/route";
import { POST as postSync } from "./sync/route";

const originalEnvironment = { ...process.env };
const originalFetch = globalThis.fetch;

function configureAdmin() {
  process.env.ADMIN_PASSWORD = "correct horse battery staple";
  process.env.ADMIN_SESSION_SECRET = "a-very-long-session-secret-for-admin-tests";
}

afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnvironment);
  globalThis.fetch = originalFetch;
});

describe("administrator routes", () => {
  it("denies protected raw payload requests without a signed session", async () => {
    configureAdmin();
    const response = await getRawPayload(new NextRequest("https://example.test/api/admin/raw-payload"));
    expect(response.status).toBe(401);
  });

  it("sets an HttpOnly secure session and recognizes it on an authenticated request", async () => {
    configureAdmin();
    const login = await postSession(new NextRequest("https://example.test/api/admin/session", {
      body: JSON.stringify({ password: "correct horse battery staple" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }));
    const setCookie = login.headers.get("set-cookie") ?? "";
    const cookie = setCookie.split(";")[0];

    expect(login.status).toBe(200);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");

    const session = await getSession(new NextRequest("https://example.test/api/admin/session", {
      headers: { cookie },
    }));
    expect(await session.json()).toEqual({ authenticated: true });
    expect(cookie).toContain(`${ADMIN_SESSION_COOKIE}=`);
  });

  it("allows an authenticated administrator to inspect a redacted payload", async () => {
    configureAdmin();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_example";
    const login = await postSession(new NextRequest("https://example.test/api/admin/session", {
      body: JSON.stringify({ password: "correct horse battery staple" }),
      headers: { "content-type": "application/json" }, method: "POST",
    }));
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
    globalThis.fetch = async () => new Response(JSON.stringify([{
      sync_run_id: "run-1", payload: { token: "should-not-leak", safe: "visible" },
      content_checksum: "checksum", source_url: "https://example.test/F-D0047-091",
      fetched_at: "2026-10-06T00:00:00Z",
      sync_runs: { source_dataset_id: "F-D0047-091", status: "succeeded", source_published_at: null, completed_at: null, error_summary: null },
    }]), { status: 200 });

    const response = await getRawPayload(new NextRequest("https://example.test/api/admin/raw-payload", {
      headers: { cookie },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ payload: { payload: { token: "[REDACTED]", safe: "visible" } } });
  });

  it("denies unauthenticated sync requests and accepts an authenticated dispatch", async () => {
    configureAdmin();
    expect((await postSync(new NextRequest("https://example.test/api/admin/sync", { method: "POST" }))).status).toBe(401);

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_example";
    process.env.GITHUB_ACTIONS_SYNC_TOKEN = "github-token";
    process.env.GITHUB_REPOSITORY = "owner/repository";
    const login = await postSession(new NextRequest("https://example.test/api/admin/session", {
      body: JSON.stringify({ password: "correct horse battery staple" }),
      headers: { "content-type": "application/json" }, method: "POST",
    }));
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
    let call = 0;
    globalThis.fetch = async () => {
      call += 1;
      return call === 1
        ? new Response("[]", { status: 200 })
        : new Response(JSON.stringify({ workflow_run_id: 42 }), { headers: { "content-type": "application/json" }, status: 200 });
    };

    const response = await postSync(new NextRequest("https://example.test/api/admin/sync", { headers: { cookie }, method: "POST" }));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ status: "accepted", workflowRunId: 42 });
  });
});
