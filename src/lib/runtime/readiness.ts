import { parseRuntimeEnvironment } from "@/lib/env/runtime-env";

export type DependencyStatus =
  | { status: "available" }
  | { status: "unavailable"; reason: "timeout" | "unreachable" | "upstream_unavailable" }
  | { status: "not_configured"; reason: string };

export type ReadinessResult = {
  ready: boolean;
  environment: string;
  runtime: string;
  revision: string;
  supabase: DependencyStatus;
};

export async function checkReadiness(
  input: Record<string, string | undefined>,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2_500,
): Promise<ReadinessResult> {
  const runtime = parseRuntimeEnvironment(input);
  if (runtime.ok === false) {
    return notReady(runtime.environment, runtime.runtime, runtime.revision, runtime.reason);
  }

  const { config } = runtime;
  if (!config.supabaseAnonKey) {
    return notReady(config.environment, config.runtime, config.revision, "supabase_anon_key_required");
  }

  const supabase = await probeSupabaseHealth(
    config.supabaseApiUrl,
    config.supabaseAnonKey,
    fetchImpl,
    timeoutMs,
  );

  return {
    ready: supabase.status === "available",
    environment: config.environment,
    runtime: config.runtime,
    revision: config.revision,
    supabase,
  };
}

export async function probeSupabaseHealth(
  apiUrl: URL,
  anonKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2_500,
): Promise<DependencyStatus> {
  const healthUrl = new URL("/auth/v1/health", apiUrl);

  try {
    const response = await fetchImpl(healthUrl, {
      method: "GET",
      headers: { apikey: anonKey, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok
      ? { status: "available" }
      : { status: "unavailable", reason: "upstream_unavailable" };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "";
    return {
      status: "unavailable",
      reason: errorName === "TimeoutError" || errorName === "AbortError" ? "timeout" : "unreachable",
    };
  }
}

function notReady(
  environment: string,
  runtime: string,
  revision: string,
  reason: string,
): ReadinessResult {
  return {
    ready: false,
    environment,
    runtime,
    revision,
    supabase: { status: "not_configured", reason },
  };
}
