import { z } from "zod";
import { isPublicSupabaseAnonKey } from "./supabase-public-key.mjs";

const EnvironmentSchema = z.enum(["local", "test"]);
const RuntimeSchema = z.enum(["native", "docker"]);
const RevisionSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

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

  const defaultEndpoint = runtimeResult.data === "docker" ? "http://kong:8000" : "http://127.0.0.1:56321";
  const endpoint = input.SUPABASE_API_URL ?? defaultEndpoint;
  let supabaseApiUrl: URL;

  try {
    supabaseApiUrl = new URL(endpoint);
  } catch {
    return { ok: false, environment, runtime, revision, reason: "invalid_supabase_url" };
  }

  const host = supabaseApiUrl.hostname.toLowerCase();
  const isNativeLoopback = runtimeResult.data === "native" && ["localhost", "127.0.0.1", "[::1]"].includes(host);
  const isDockerNetworkGateway = runtimeResult.data === "docker" && host === "kong";
  const safeLocalEndpoint = isNativeLoopback || isDockerNetworkGateway;
  const expectedPort = runtimeResult.data === "docker" ? "8000" : "56321";
  const dedicatedLocalPort = supabaseApiUrl.port === expectedPort ||
    (environmentResult.data === "test" && supabaseApiUrl.port !== "");
  const hasOnlyBasePath = supabaseApiUrl.pathname === "/";

  if (
    supabaseApiUrl.protocol !== "http:" ||
    supabaseApiUrl.username !== "" ||
    supabaseApiUrl.password !== "" ||
    supabaseApiUrl.search !== "" ||
    supabaseApiUrl.hash !== "" ||
    !hasOnlyBasePath ||
    !safeLocalEndpoint ||
    !dedicatedLocalPort
  ) {
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
