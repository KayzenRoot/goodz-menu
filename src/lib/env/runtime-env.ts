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
