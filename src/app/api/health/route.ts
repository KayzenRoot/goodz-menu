import { NextResponse } from "next/server";
import { requestCorrelationId, safeBuildRevision, safeEnvironmentName, safeRuntimeName } from "@/lib/observability/correlation";
import { logRuntimeEvent } from "@/lib/observability/runtime-log";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const correlationId = requestCorrelationId(request);
  logRuntimeEvent({ event: "health", correlationId, status: "ok" });
  const response = NextResponse.json({
    status: "ok",
    environment: safeEnvironmentName(),
    runtime: safeRuntimeName(),
    revision: safeBuildRevision(),
    correlationId,
  }, { headers: { "cache-control": "no-store" } });
  response.headers.set("x-request-id", correlationId);
  return response;
}
