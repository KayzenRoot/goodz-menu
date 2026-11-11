import type { DependencyStatus } from "@/lib/runtime/readiness";

export function logReadinessFailure(correlationId: string, dependency: DependencyStatus): void {
  if (dependency.status === "available") return;

  console.warn(JSON.stringify({
    level: "warn",
    event: "runtime.readiness_failed",
    dependency: "supabase",
    status: dependency.status,
    reason: dependency.reason,
    correlationId,
  }));
}
