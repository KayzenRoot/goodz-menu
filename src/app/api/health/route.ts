import { correlationHeaders, resolveCorrelationId } from "@/lib/observability/correlation";
import { parseRuntimeEnvironment } from "@/lib/env/runtime-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const correlationId = resolveCorrelationId(request.headers);
  const environment = parseRuntimeEnvironment(process.env);
  const identity = environment.ok
    ? environment.config
    : {
        environment: environment.environment,
        runtime: environment.runtime,
        revision: environment.revision,
      };

  return Response.json(
    {
      status: "ok",
      environment: identity.environment,
      runtime: identity.runtime,
      revision: identity.revision,
      correlationId,
    },
    { status: 200, headers: correlationHeaders(correlationId) },
  );
}
