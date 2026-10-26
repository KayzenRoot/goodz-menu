import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/ready", () => {
  it("returns HTTP 503 with a sanitized dependency state when Supabase is not configured", async () => {
    vi.stubEnv("GOODZ_ENVIRONMENT", "local");
    vi.stubEnv("GOODZ_RUNTIME", "native");
    vi.stubEnv("BUILD_REVISION", "ready-route-test");
    vi.stubEnv("SUPABASE_API_URL", "http://127.0.0.1:56321");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await GET(new Request("http://localhost/api/ready", {
      headers: { "x-correlation-id": "ready-route-test-id" },
    }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("x-correlation-id")).toBe("ready-route-test-id");
    expect(body).toMatchObject({
      status: "not_ready",
      revision: "ready-route-test",
      correlationId: "ready-route-test-id",
      dependencies: {
        supabase: { status: "not_configured", reason: "supabase_anon_key_required" },
      },
    });
  });
});
