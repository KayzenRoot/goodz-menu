import { checkReadiness } from "@/lib/runtime/readiness";
import { correlationHeaders, resolveCorrelationId } from "@/lib/observability/correlation";
import { logReadinessFailure } from "@/lib/observability/runtime-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const correlationId = resolveCorrelationId(request.headers);
  const readiness = await checkReadiness(process.env);
  logReadinessFailure(correlationId, readiness.supabase);

  return Response.json(
    {
      status: readiness.ready ? "ready" : "not_ready",
      environment: readiness.environment,
      runtime: readiness.runtime,
      revision: readiness.revision,
      correlationId,
      dependencies: { supabase: readiness.supabase },
    },
    {
      status: readiness.ready ? 200 : 503,
      headers: correlationHeaders(correlationId),
    },
  );
}
