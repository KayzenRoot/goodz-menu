import {
  AuthApiError,
  AuthInvalidJwtError,
  AuthInvalidTokenResponseError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { handleProxyClaims } from "@/lib/supabase/proxy-claims";

describe("proxy auth claim cookie handling", () => {
  it.each([
    ["malformed or invalid JWT", new AuthInvalidJwtError("Invalid JWT")],
    ["malformed token response", new AuthInvalidTokenResponseError()],
    ["missing session", new AuthSessionMissingError()],
    ["rejected session", new AuthApiError("Invalid session", 401, "bad_jwt")],
    ["revoked refresh token", new AuthApiError("Refresh token is no longer valid", 400, "refresh_token_not_found")],
  ])("clears auth cookies for a confirmed %s", async (_label, error) => {
    const clearAuthCookies = vi.fn();

    const outcome = await handleProxyClaims(
      async () => ({ data: null, error }),
      clearAuthCookies,
    );

    expect(outcome).toBe("invalid");
    expect(clearAuthCookies).toHaveBeenCalledOnce();
  });

  it("clears cookies when malformed JWT payload parsing throws", async () => {
    const clearAuthCookies = vi.fn();

    const outcome = await handleProxyClaims(async () => {
      throw new SyntaxError("JWT payload is malformed");
    }, clearAuthCookies);

    expect(outcome).toBe("invalid");
    expect(clearAuthCookies).toHaveBeenCalledOnce();
  });

  it("clears cookies when no session yields no verified claims and no error", async () => {
    const clearAuthCookies = vi.fn();

    const outcome = await handleProxyClaims(
      async () => ({ data: null, error: null }),
      clearAuthCookies,
    );

    expect(outcome).toBe("invalid");
    expect(clearAuthCookies).toHaveBeenCalledOnce();
  });

  it("preserves auth cookies when a JWKS verification fetch is retryable", async () => {
    const clearAuthCookies = vi.fn();

    const outcome = await handleProxyClaims(
      async () => ({ data: null, error: new AuthRetryableFetchError("JWKS unavailable", 503) }),
      clearAuthCookies,
    );

    expect(outcome).toBe("retryable");
    expect(clearAuthCookies).not.toHaveBeenCalled();
  });

  it("keeps the normal flow when claims are verified", async () => {
    const clearAuthCookies = vi.fn();

    const outcome = await handleProxyClaims(
      async () => ({ data: { claims: { sub: "auth-user-1" } }, error: null }),
      clearAuthCookies,
    );

    expect(outcome).toBe("valid");
    expect(clearAuthCookies).not.toHaveBeenCalled();
  });

  it("preserves cookies on an unclassified verification failure", async () => {
    const clearAuthCookies = vi.fn();

    const outcome = await handleProxyClaims(
      async () => ({ data: null, error: new Error("verification failed") }),
      clearAuthCookies,
    );

    expect(outcome).toBe("unverified");
    expect(clearAuthCookies).not.toHaveBeenCalled();
  });
});
