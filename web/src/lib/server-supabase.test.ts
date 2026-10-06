import { afterEach, describe, expect, it } from "vitest";

import { serverSupabaseConfig } from "./server-supabase";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("serverSupabaseConfig", () => {
  it("requires the new server-only secret key and removes a trailing URL slash", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co/";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_example";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(serverSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      secretKey: "sb_secret_example",
    });
  });

  it("does not accept the deprecated service-role environment variable", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-key";
    delete process.env.SUPABASE_SECRET_KEY;

    expect(serverSupabaseConfig).toThrow("secret key");
  });
});
