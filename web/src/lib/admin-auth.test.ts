import { afterEach, describe, expect, it } from "vitest";

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSession,
  verifyAdminPassword,
  verifyAdminSession,
} from "./admin-auth";

const originalEnvironment = { ...process.env };

function configureAdmin() {
  process.env.ADMIN_PASSWORD = "correct horse battery staple";
  process.env.ADMIN_SESSION_SECRET = "a-very-long-session-secret-for-admin-tests";
}

afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnvironment);
});

describe("administrator sessions", () => {
  it("accepts only the configured password and creates a short-lived signed session", () => {
    configureAdmin();
    const now = Date.UTC(2026, 9, 6, 12, 0, 0);
    const session = createAdminSession(now);

    expect(verifyAdminPassword("correct horse battery staple")).toBe(true);
    expect(verifyAdminPassword("incorrect")).toBe(false);
    expect(verifyAdminSession(session, now + 1_000)).toBe(true);
    expect(verifyAdminSession(session, now + (ADMIN_SESSION_MAX_AGE_SECONDS + 1) * 1_000)).toBe(false);
  });

  it("rejects tampered sessions and missing configuration", () => {
    configureAdmin();
    const session = createAdminSession();
    expect(verifyAdminSession(`${session}tampered`)).toBe(false);

    delete process.env.ADMIN_SESSION_SECRET;
    expect(() => verifyAdminPassword("anything")).toThrow("not configured");
  });
});
