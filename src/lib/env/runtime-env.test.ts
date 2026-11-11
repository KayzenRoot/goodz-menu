import { describe, expect, it } from "vitest";
import { parseRuntimeEnvironment } from "@/lib/env/runtime-env";
import { isPublicSupabaseAnonKey } from "@/lib/env/supabase-public-key.mjs";

describe("parseRuntimeEnvironment", () => {
  it("defaults only to the isolated local Supabase endpoint", () => {
    const result = parseRuntimeEnvironment({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.environment).toBe("local");
      expect(result.config.runtime).toBe("native");
      expect(result.config.supabaseApiUrl.origin).toBe("https://localhost:56443");
    }
  });

  it("defaults the Docker runtime to the gateway on its shared local network", () => {
    const result = parseRuntimeEnvironment({ GOODZ_RUNTIME: "docker" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.supabaseApiUrl.origin).toBe("https://supabase-tls:8443");
  });

  it("accepts the local TLS proxy only for the Docker runtime", () => {
    const result = parseRuntimeEnvironment({
      GOODZ_RUNTIME: "docker",
      SUPABASE_API_URL: "https://supabase-tls:8443",
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    "https://example.supabase.co",
    "https://user:pass@localhost:56443",
    "https://localhost:56443/private",
    "https://host.docker.internal:56443",
    "https://supabase-tls:8443",
    "https://127.0.0.1:56443",
    "https://localhost:54321",
    "http://127.0.0.1:56443",
  ])("rejects an endpoint outside the isolated local contract: %s", (endpoint) => {
    expect(parseRuntimeEnvironment({ SUPABASE_API_URL: endpoint })).toMatchObject({
      ok: false,
      reason: "invalid_supabase_url",
    });
  });

  it.each(["https://localhost:56443", "https://host.docker.internal:56443"])(
    "rejects host-only Supabase endpoints from the Docker runtime: %s",
    (endpoint) => {
      expect(parseRuntimeEnvironment({
        GOODZ_RUNTIME: "docker",
        SUPABASE_API_URL: endpoint,
      })).toMatchObject({ ok: false, reason: "invalid_supabase_url" });
    },
  );

  it("allows HTTP only for an isolated native test fixture", () => {
    expect(parseRuntimeEnvironment({
      GOODZ_ENVIRONMENT: "test",
      SUPABASE_API_URL: "http://127.0.0.1:56388",
    })).toMatchObject({ ok: true });
    expect(parseRuntimeEnvironment({
      GOODZ_ENVIRONMENT: "local",
      SUPABASE_API_URL: "http://127.0.0.1:56388",
    })).toMatchObject({ ok: false, reason: "invalid_supabase_url" });
  });

  it("keeps public runtime identity fields bounded and sanitized", () => {
    const result = parseRuntimeEnvironment({
      GOODZ_ENVIRONMENT: "local",
      GOODZ_RUNTIME: "native",
      BUILD_REVISION: "candidate_42",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.revision).toBe("candidate_42");
  });

  it("rejects a Supabase secret key in the public-key setting", () => {
    const secretKeyPrefix = ["sb", "secret"].join("_");
    expect(parseRuntimeEnvironment({
      GOODZ_ENVIRONMENT: "local",
      SUPABASE_ANON_KEY: `${secretKeyPrefix}_synthetic_value`,
    })).toMatchObject({ ok: false, reason: "invalid_supabase_anon_key" });
  });

  it("accepts publishable keys and anonymous JWTs while rejecting service-role JWTs", () => {
    const jwt = (role: string) => {
      const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
      return `${header}.${payload}.synthetic-signature`;
    };

    expect(isPublicSupabaseAnonKey("sb_publishable_synthetic-key")).toBe(true);
    expect(isPublicSupabaseAnonKey(jwt("anon"))).toBe(true);
    expect(isPublicSupabaseAnonKey(jwt("service_role"))).toBe(false);
    expect(isPublicSupabaseAnonKey("synthetic-test-key", true)).toBe(true);
  });
});
