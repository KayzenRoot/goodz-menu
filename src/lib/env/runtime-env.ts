import { z } from "zod";

const environmentSchema = z.enum(["local", "test", "staging", "production"]);
const runtimeSchema = z.enum(["native", "docker"]);

export type GoodzEnvironment = z.infer<typeof environmentSchema>;

export type RuntimeConfig = {
  environment: GoodzEnvironment;
  runtime: "native" | "docker";
  buildRevision: string;
  supabaseApiUrl: URL;
};

export type RuntimeConfigResult =
  | { ok: true; config: RuntimeConfig }
  | { ok: false; environment: GoodzEnvironment | "unknown"; reason: "invalid_environment" | "supabase_url_required" | "invalid_supabase_url" };

export type SupabaseAuthConfig = {
  supabaseApiUrl: URL;
  anonKey: string;
};

export type SupabaseAuthConfigResult =
  | { ok: true; environment: GoodzEnvironment; config: SupabaseAuthConfig }
  | { ok: false; environment: GoodzEnvironment | "unknown"; reason: "invalid_environment" | "supabase_url_required" | "invalid_supabase_url" | "supabase_anon_key_required" | "invalid_supabase_anon_key" };

export function readRuntimeConfig(source: Record<string, string | undefined> = process.env): RuntimeConfigResult {
  const inferredEnvironment = source.GOODZ_ENVIRONMENT ?? (source.NODE_ENV === "production" ? "production" : "local");
  const environmentResult = environmentSchema.safeParse(inferredEnvironment);
  if (!environmentResult.success) {
    return { ok: false, environment: "unknown", reason: "invalid_environment" };
  }

  const environment = environmentResult.data;
  const endpoint = source.SUPABASE_API_URL ??
    (environment === "local" || environment === "test" ? "http://127.0.0.1:54321" : undefined);
  if (!endpoint) return { ok: false, environment, reason: "supabase_url_required" };

  let supabaseApiUrl: URL;
  try {
    supabaseApiUrl = new URL(endpoint);
  } catch {
    return { ok: false, environment, reason: "invalid_supabase_url" };
  }

  if (
    !["http:", "https:"].includes(supabaseApiUrl.protocol) ||
    supabaseApiUrl.username !== "" ||
    supabaseApiUrl.password !== "" ||
    supabaseApiUrl.search !== "" ||
    supabaseApiUrl.hash !== "" ||
    ((environment === "local" || environment === "test") &&
      !["localhost", "127.0.0.1", "[::1]", "host.docker.internal"].includes(supabaseApiUrl.hostname)) ||
    ((environment === "staging" || environment === "production") && supabaseApiUrl.protocol !== "https:")
  ) {
    return { ok: false, environment, reason: "invalid_supabase_url" };
  }

  return {
    ok: true,
    config: {
      environment,
      runtime: runtimeSchema.safeParse(source.GOODZ_RUNTIME ?? "native").data ?? "native",
      buildRevision: /^[a-zA-Z0-9._-]{1,80}$/.test(source.BUILD_REVISION ?? "local")
        ? source.BUILD_REVISION ?? "local"
        : "unknown",
      supabaseApiUrl,
    },
  };
}

export function readSupabaseAuthConfig(source: Record<string, string | undefined> = process.env): SupabaseAuthConfigResult {
  const runtime = readRuntimeConfig(source);
  if (!runtime.ok) return runtime;

  const anonKey = source.SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return { ok: false, environment: runtime.config.environment, reason: "supabase_anon_key_required" };
  if (!isPublicSupabaseKey(anonKey)) return { ok: false, environment: runtime.config.environment, reason: "invalid_supabase_anon_key" };

  return {
    ok: true,
    environment: runtime.config.environment,
    config: { supabaseApiUrl: runtime.config.supabaseApiUrl, anonKey },
  };
}

export { safePostLoginPath } from "../auth/navigation";

function isPublicSupabaseKey(value: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;

  const segments = value.split(".");
  if (segments.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(segments[1])) return false;

  try {
    const payload: unknown = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
    return typeof payload === "object" && payload !== null && "role" in payload && payload.role === "anon";
  } catch {
    return false;
  }
}
