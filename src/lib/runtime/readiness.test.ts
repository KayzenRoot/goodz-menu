import { describe, expect, it, vi } from "vitest";
import { checkReadiness, probeSupabaseHealth } from "@/lib/runtime/readiness";

describe("local readiness probe", () => {
  it("uses the internal Supabase gateway for the Docker runtime", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const result = await checkReadiness(
      {
        GOODZ_RUNTIME: "docker",
        SUPABASE_API_URL: "https://supabase-tls:8443",
        SUPABASE_ANON_KEY: "sb_publishable_synthetic-key",
      },
      fetchMock,
    );

    expect(result.ready).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://supabase-tls:8443/auth/v1/health"),
      expect.objectContaining({ headers: { apikey: "sb_publishable_synthetic-key", accept: "application/json" } }),
    );
  });

  it("reports an available local Supabase health endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const result = await checkReadiness(
      {
        GOODZ_ENVIRONMENT: "test",
        SUPABASE_API_URL: "http://127.0.0.1:56388",
        SUPABASE_ANON_KEY: "test-public-key",
      },
      fetchMock,
    );

    expect(result.ready).toBe(true);
    expect(result.supabase).toEqual({ status: "available" });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://127.0.0.1:56388/auth/v1/health"),
      expect.objectContaining({ headers: { apikey: "test-public-key", accept: "application/json" } }),
    );
  });

  it("fails closed when Supabase is not configured", async () => {
    const result = await checkReadiness({ GOODZ_ENVIRONMENT: "test" });
    expect(result.ready).toBe(false);
    expect(result.supabase).toEqual({ status: "not_configured", reason: "supabase_anon_key_required" });
  });

  it("returns a sanitized failure when the upstream health endpoint is unavailable", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("secret upstream diagnostic", { status: 503 }));
    const result = await probeSupabaseHealth(new URL("http://127.0.0.1:56388"), "test-public-key", fetchMock);
    expect(result).toEqual({ status: "unavailable", reason: "upstream_unavailable" });
    expect(JSON.stringify(result)).not.toContain("secret upstream diagnostic");
  });

  it("maps transport failures to a bounded timeout state", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    await expect(probeSupabaseHealth(new URL("http://127.0.0.1:56388"), "test-public-key", fetchMock)).resolves.toEqual({
      status: "unavailable",
      reason: "timeout",
    });
  });
});
