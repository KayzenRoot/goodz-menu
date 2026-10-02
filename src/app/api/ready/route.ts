import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@/lib/env/runtime-env";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { probeLocalSupabase, readinessHttpStatus } from "@/lib/runtime/readiness";
import { logRuntimeEvent } from "@/lib/observability/runtime-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = performance.now();
  const correlationId = requestCorrelationId(request);
  const config = readRuntimeConfig();
  if (!config.ok) {
    logRuntimeEvent({ event: "readiness", correlationId, status: "not_ready", dependencyStatus: "not_configured", reason: config.reason, elapsedMs: performance.now() - startedAt });
    const response = NextResponse.json({
      status: "not_ready",
      environment: config.environment,
      revision: process.env.BUILD_REVISION?.match(/^[a-zA-Z0-9._-]{1,80}$/)?.[0] ?? "local",
      correlationId,
      dependencies: { supabase: { status: "not_configured", reason: config.reason } },
    }, { status: 503, headers: { "cache-control": "no-store" } });
    response.headers.set("x-request-id", correlationId);
    return response;
  }

  const probe = await probeLocalSupabase(config.config.supabaseApiUrl);
  const status = probe.status === "available" ? "ready" : "not_ready";
  logRuntimeEvent({ event: "readiness", correlationId, status, dependencyStatus: probe.status, reason: probe.reason, elapsedMs: performance.now() - startedAt });
  const response = NextResponse.json({
    status,
    environment: config.config.environment,
    runtime: config.config.runtime,
    revision: config.config.buildRevision,
    correlationId,
    dependencies: { supabase: probe },
  }, {
    status: readinessHttpStatus(probe.status),
    headers: { "cache-control": "no-store" },
  });
  response.headers.set("x-request-id", correlationId);
  return response;
}
