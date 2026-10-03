import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock, readSupabaseAuthConfigMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  readSupabaseAuthConfigMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: createServerClientMock }));
vi.mock("@/lib/env/runtime-env", () => ({ readSupabaseAuthConfig: readSupabaseAuthConfigMock }));

import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function requestWithAuthCookie() {
  return new NextRequest("http://localhost/app", {
    headers: { cookie: "sb-local-auth-token=malformed; theme=dark" },
  });
}

function mockClaims(result: unknown) {
  const getClaims = vi.fn().mockResolvedValue(result);
  createServerClientMock.mockReturnValue({ auth: { getClaims } });
  return getClaims;
}

describe("proxy session cookie preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readSupabaseAuthConfigMock.mockReturnValue({
      ok: true,
      config: { supabaseApiUrl: new URL("http://127.0.0.1:54321"), anonKey: "local-public-key" },
    });
  });

  it("removes the auth cookie after a confirmed invalid session", async () => {
    const getClaims = mockClaims({ data: null, error: null });
    const request = requestWithAuthCookie();

    const response = await proxy(request);

    expect(getClaims).toHaveBeenCalledOnce();
    expect(request.cookies.has("sb-local-auth-token")).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("sb-local-auth-token=;");
  });

  it("removes refreshed auth cookies from the forwarded request after the session is rejected", async () => {
    createServerClientMock.mockImplementation((_url, _key, options) => ({
      auth: {
        getClaims: async () => {
          options.cookies.setAll([
            { name: "sb-local-auth-token", value: "refreshed", options: { path: "/", httpOnly: true } },
          ]);
          return { data: null, error: null };
        },
      },
    }));
    const request = requestWithAuthCookie();

    const response = await proxy(request);

    expect(request.cookies.has("sb-local-auth-token")).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("sb-local-auth-token=;");
    expect(response.headers.get("set-cookie")).not.toContain("refreshed");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("theme=dark");
    expect(response.headers.get("x-middleware-request-cookie")).not.toContain("sb-local-auth-token");
  });

  it("preserves auth cookies when claims verification fails transiently", async () => {
    const getClaims = mockClaims({ data: null, error: new AuthRetryableFetchError("JWKS unavailable", 503) });
    const request = requestWithAuthCookie();

    const response = await proxy(request);

    expect(getClaims).toHaveBeenCalledOnce();
    expect(request.cookies.has("sb-local-auth-token")).toBe(true);
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("keeps the normal response flow when claims are valid", async () => {
    const getClaims = mockClaims({ data: { claims: { sub: "auth-user-1" } }, error: null });
    const request = requestWithAuthCookie();

    const response = await proxy(request);

    expect(getClaims).toHaveBeenCalledOnce();
    expect(request.cookies.has("sb-local-auth-token")).toBe(true);
    expect(response.headers.has("set-cookie")).toBe(false);
  });
});
