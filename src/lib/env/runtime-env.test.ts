import { describe, expect, it } from "vitest";
import { readRuntimeConfig } from "@/lib/env/runtime-env";

describe("runtime environment boundary", () => {
  it("uses only the explicit local Supabase loopback default", () => {
    const result = readRuntimeConfig({ NODE_ENV: "development" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.supabaseApiUrl.origin).toBe("http://127.0.0.1:54321");
  });

  it("requires an explicit endpoint in production", () => {
    expect(readRuntimeConfig({ NODE_ENV: "production" })).toEqual({
      ok: false,
      environment: "production",
      reason: "supabase_url_required",
    });
  });

  it("rejects remote endpoints in local mode and credentials in every mode", () => {
    expect(readRuntimeConfig({ GOODZ_ENVIRONMENT: "local", SUPABASE_API_URL: "https://db.example.com" }).ok).toBe(false);
    expect(readRuntimeConfig({ GOODZ_ENVIRONMENT: "local", SUPABASE_API_URL: "http://user:secret@127.0.0.1:54321" }).ok).toBe(false);
  });

  it("requires TLS when a remote environment endpoint is explicit", () => {
    expect(readRuntimeConfig({ GOODZ_ENVIRONMENT: "production", SUPABASE_API_URL: "http://db.example.com" }).ok).toBe(false);
    expect(readRuntimeConfig({ GOODZ_ENVIRONMENT: "production", SUPABASE_API_URL: "https://db.example.com" }).ok).toBe(true);
  });
});
