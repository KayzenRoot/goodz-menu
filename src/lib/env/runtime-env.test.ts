import { describe, expect, it } from "vitest";
import * as runtimeEnv from "@/lib/env/runtime-env";
import { readRuntimeConfig } from "@/lib/env/runtime-env";

type SupabaseAuthConfigReader = (source?: Record<string, string | undefined>) => {
  ok: boolean;
  config?: { supabaseApiUrl: URL; anonKey: string };
  environment: string;
  reason?: string;
};

type SafePostLoginPath = (candidate: unknown) => string | null;

function requireSupabaseAuthConfigReader() {
  const reader = (runtimeEnv as unknown as { readSupabaseAuthConfig?: SupabaseAuthConfigReader }).readSupabaseAuthConfig;
  expect(reader).toBeTypeOf("function");
  return reader;
}

function requireSafePostLoginPath() {
  const helper = (runtimeEnv as unknown as { safePostLoginPath?: SafePostLoginPath }).safePostLoginPath;
  expect(helper).toBeTypeOf("function");
  return helper;
}

function tokenWithRole(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.signature`;
}

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

  it("keeps application readiness independent from the public Auth key", () => {
    const reader = requireSupabaseAuthConfigReader();
    if (!reader) return;

    expect(readRuntimeConfig({ GOODZ_ENVIRONMENT: "local" }).ok).toBe(true);
    expect(reader({ GOODZ_ENVIRONMENT: "local" })).toMatchObject({
      ok: false,
      environment: "local",
      reason: "supabase_anon_key_required",
    });
  });

  it("accepts only public Supabase Auth keys", () => {
    const reader = requireSupabaseAuthConfigReader();
    if (!reader) return;

    expect(reader({ GOODZ_ENVIRONMENT: "local", SUPABASE_ANON_KEY: tokenWithRole("anon") }).ok).toBe(true);
    expect(reader({ GOODZ_ENVIRONMENT: "local", SUPABASE_ANON_KEY: "sb_publishable_local-test-key" }).ok).toBe(true);
    expect(reader({ GOODZ_ENVIRONMENT: "local", SUPABASE_ANON_KEY: tokenWithRole("service_role") })).toMatchObject({
      ok: false,
      reason: "invalid_supabase_anon_key",
    });
    expect(reader({ GOODZ_ENVIRONMENT: "local", SUPABASE_ANON_KEY: "not-a-public-key" })).toMatchObject({
      ok: false,
      reason: "invalid_supabase_anon_key",
    });
  });

  it("accepts only the admitted tenant entry as a post-login destination", () => {
    const helper = requireSafePostLoginPath();
    if (!helper) return;

    expect(helper("/app")).toBe("/app");
    expect(helper("https://attacker.invalid")).toBeNull();
    expect(helper("//attacker.invalid/app")).toBeNull();
    expect(helper("/\\\\attacker.invalid")).toBeNull();
    expect(helper("/app/../login")).toBeNull();
    expect(helper("/login")).toBeNull();
  });
});
