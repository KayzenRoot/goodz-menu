import { safeBuildRevision, safeEnvironmentName } from "@/lib/observability/correlation";

type SafeRuntimeLog = {
  event: "health" | "readiness";
  correlationId: string;
  status: "ok" | "ready" | "not_ready";
  elapsedMs?: number;
  dependencyStatus?: "available" | "unavailable" | "not_configured";
  reason?: "invalid_environment" | "supabase_url_required" | "invalid_supabase_url" | "timeout" | "unreachable" | "unexpected_status";
};

export function logRuntimeEvent(entry: SafeRuntimeLog) {
  console.info(JSON.stringify({
    event: `goodz.runtime.${entry.event}`,
    timestamp: new Date().toISOString(),
    environment: safeEnvironmentName(),
    revision: safeBuildRevision(),
    correlationId: entry.correlationId,
    status: entry.status,
    ...(entry.elapsedMs === undefined ? {} : { elapsedMs: Math.max(0, Math.round(entry.elapsedMs)) }),
    ...(entry.dependencyStatus ? { dependencyStatus: entry.dependencyStatus } : {}),
    ...(entry.reason ? { reason: entry.reason } : {}),
  }));
}
