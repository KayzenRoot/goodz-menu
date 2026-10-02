export type SupabaseProbe = {
  status: "available" | "unavailable";
  reason?: "timeout" | "unreachable" | "unexpected_status";
};

export async function probeLocalSupabase(baseUrl: URL): Promise<SupabaseProbe> {
  const healthUrl = new URL("/auth/v1/health", baseUrl);
  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
      headers: { accept: "application/json" },
    });
    if (response.ok) return { status: "available" };
    return { status: "unavailable", reason: "unexpected_status" };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "unreachable",
    };
  }
}

export function readinessHttpStatus(dependencyStatus: "available" | "unavailable") {
  return dependencyStatus === "available" ? 200 : 503;
}
