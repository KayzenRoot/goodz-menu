import { z } from "zod";
import { isPublicSupabaseAnonKey } from "./supabase-public-key.mjs";

const EnvironmentSchema = z.enum(["local", "test"]);
const RuntimeSchema = z.enum(["native", "docker"]);
const RevisionSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const TestNativeLoopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type GoodzEnvironment = z.infer<typeof EnvironmentSchema>;
export type GoodzRuntime = z.infer<typeof RuntimeSchema>;

export type RuntimeEnvironment = {
  environment: GoodzEnvironment;
  runtime: GoodzRuntime;
  supabaseApiUrl: URL;
  supabaseAnonKey?: string;
  revision: string;
};

export type RuntimeEnvironmentError =
  | "invalid_environment"
  | "invalid_runtime"
  | "invalid_supabase_url"
  | "invalid_supabase_anon_key";

export type RuntimeEnvironmentResult =
  | { ok: true; config: RuntimeEnvironment }
  | {
      ok: false;
      environment: GoodzEnvironment | "unknown";
      runtime: GoodzRuntime | "unknown";
      revision: string;
      reason: RuntimeEnvironmentError;
    };

type EnvironmentInput = Record<string, string | undefined>;

export function parseRuntimeEnvironment(input: EnvironmentInput): RuntimeEnvironmentResult {
  const environmentResult = EnvironmentSchema.safeParse(input.GOODZ_ENVIRONMENT ?? "local");
  const runtimeResult = RuntimeSchema.safeParse(input.GOODZ_RUNTIME ?? "native");
  const revisionResult = RevisionSchema.safeParse(input.BUILD_REVISION ?? "local");
  const environment = environmentResult.success ? environmentResult.data : "unknown";
  const runtime = runtimeResult.success ? runtimeResult.data : "unknown";
  const revision = revisionResult.success ? revisionResult.data : "unknown";

  if (!environmentResult.success) {
    return { ok: false, environment, runtime, revision, reason: "invalid_environment" };
  }
  if (!runtimeResult.success) {
    return { ok: false, environment, runtime, revision, reason: "invalid_runtime" };
  }

  const defaultEndpoint = runtimeResult.data === "docker"
    ? "https://supabase-tls:8443"
    : "https://localhost:56443";
  const endpoint = input.SUPABASE_API_URL ?? defaultEndpoint;
  let supabaseApiUrl: URL;

  try {
    supabaseApiUrl = new URL(endpoint);
  } catch {
    return { ok: false, environment, runtime, revision, reason: "invalid_supabase_url" };
  }

  if (!isAllowedLocalSupabaseEndpoint(supabaseApiUrl, environmentResult.data, runtimeResult.data)) {
    return { ok: false, environment, runtime, revision, reason: "invalid_supabase_url" };
  }

  const anonKey = input.SUPABASE_ANON_KEY?.trim();
  if (anonKey && !isPublicSupabaseAnonKey(anonKey, environmentResult.data === "test")) {
    return { ok: false, environment, runtime, revision, reason: "invalid_supabase_anon_key" };
  }

  return {
    ok: true,
    config: {
      environment: environmentResult.data,
      runtime: runtimeResult.data,
      supabaseApiUrl,
      ...(anonKey ? { supabaseAnonKey: anonKey } : {}),
      revision,
    },
  };
}

function isAllowedLocalSupabaseEndpoint(url: URL, environment: GoodzEnvironment, runtime: GoodzRuntime): boolean {
  return isAllowedTransport(url, environment, runtime) &&
    isAllowedHost(url, environment, runtime) &&
    isAllowedPort(url, environment, runtime) &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "" &&
    url.pathname === "/";
}

function isAllowedTransport(url: URL, environment: GoodzEnvironment, runtime: GoodzRuntime): boolean {
  return url.protocol === "https:" ||
    (environment === "test" && runtime === "native" && url.protocol === "http:");
}

function isAllowedHost(url: URL, environment: GoodzEnvironment, runtime: GoodzRuntime): boolean {
  const host = url.hostname.toLowerCase();
  if (runtime === "docker") return host === "supabase-tls";
  return host === "localhost" || (environment === "test" && TestNativeLoopbackHosts.has(host));
}

function isAllowedPort(url: URL, environment: GoodzEnvironment, runtime: GoodzRuntime): boolean {
  const expectedPort = runtime === "docker" ? "8443" : "56443";
  return url.port === expectedPort || (environment === "test" && runtime === "native" && url.port !== "");
}
