import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  AuthInvalidJwtError,
  AuthInvalidTokenResponseError,
} from "@supabase/supabase-js";

type ClaimsResult = { data: { claims?: unknown } | null; error: unknown };
type ClaimsReader = () => Promise<ClaimsResult>;

export type ProxyClaimsOutcome = "valid" | "invalid" | "retryable" | "unverified";

const INVALID_SESSION_CODES = new Set([
  "bad_jwt",
  "session_expired",
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "user_not_found",
]);

export async function handleProxyClaims(
  readClaims: ClaimsReader,
  clearAuthCookies: () => void,
): Promise<ProxyClaimsOutcome> {
  try {
    const { data, error } = await readClaims();
    if (error === null) {
      if (data?.claims) return "valid";
      clearAuthCookies();
      return "invalid";
    }
    return handleClaimsError(error, clearAuthCookies);
  } catch (error) {
    return handleClaimsError(error, clearAuthCookies);
  }
}

function handleClaimsError(error: unknown, clearAuthCookies: () => void): ProxyClaimsOutcome {
  if (isAuthRetryableFetchError(error)) return "retryable";

  const confirmedInvalid = error instanceof AuthInvalidJwtError
    || error instanceof AuthInvalidTokenResponseError
    || error instanceof SyntaxError
    || isAuthSessionMissingError(error)
    || (isAuthApiError(error) && (error.status === 401 || INVALID_SESSION_CODES.has(error.code ?? "")));
  if (!confirmedInvalid) return "unverified";

  clearAuthCookies();
  return "invalid";
}
