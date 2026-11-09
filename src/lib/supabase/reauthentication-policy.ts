export const PRIVILEGED_REAUTH_COOKIE = "goodz-privileged-reauth";
export const PRIVILEGED_REAUTH_WINDOW_SECONDS = 300;

export type PasswordReauthenticationClaims = {
  sub?: unknown;
  aal?: unknown;
  amr?: unknown;
};

export function matchesPasswordGrantIdentity(
  expectedUserId: unknown,
  responseUserId: unknown,
  sessionUserId: unknown,
): expectedUserId is string {
  return typeof expectedUserId === "string"
    && expectedUserId.length > 0
    && responseUserId === expectedUserId
    && sessionUserId === expectedUserId;
}

/**
 * The authentication methods a token actually records, or null when the claim is not a well formed
 * list of methods. A claim that cannot be read is never treated as an absent method either: it makes
 * the token unusable rather than making it look like a token with fewer proofs on it.
 */
function readAuthenticationMethods(
  amr: unknown,
): { method: string; timestamp: number }[] | null {
  if (!Array.isArray(amr) || amr.length === 0) return null;
  const methods: { method: string; timestamp: number }[] = [];
  for (const entry of amr) {
    if (
      typeof entry !== "object"
      || entry === null
      || typeof (entry as { method?: unknown }).method !== "string"
      || !Number.isSafeInteger((entry as { timestamp?: unknown }).timestamp)
      || (entry as { timestamp: number }).timestamp < 0
    ) return null;
    methods.push(entry as { method: string; timestamp: number });
  }
  return methods;
}

function latestOf(
  methods: { method: string; timestamp: number }[],
  method: string,
): { latestPassword: number; latestAuthentication: number } {
  return {
    latestPassword: Math.max(
      -1,
      ...methods.filter((entry) => entry.method === method).map((entry) => entry.timestamp),
    ),
    latestAuthentication: Math.max(...methods.map((entry) => entry.timestamp)),
  };
}

/**
 * Whether the token records a password authentication inside the freshness window, whatever else it
 * also records.
 *
 * A token that has been raised past the first factor keeps the password entry in its history, so this
 * is the question the database asks when it reads the bearer of a privileged command: was a password
 * presented recently, not necessarily most recently.
 */
export function hasFreshPasswordAuthentication(
  claims: PasswordReauthenticationClaims | null | undefined,
  nowSeconds: number,
): boolean {
  if (!claims || !Number.isSafeInteger(nowSeconds)) return false;
  const methods = readAuthenticationMethods(claims.amr);
  if (!methods) return false;
  const { latestPassword } = latestOf(methods, "password");
  if (latestPassword < 0) return false;
  const age = nowSeconds - latestPassword;
  return age >= 0 && age <= PRIVILEGED_REAUTH_WINDOW_SECONDS;
}

/**
 * Whether the token is a plain password grant for this identity that nothing has been layered on top
 * of. The password must be the most recent method: a token that also carries a second factor is not
 * the password grant this proof is supposed to be, it is a different token.
 */
export function hasFreshPasswordReauthentication(
  claims: PasswordReauthenticationClaims | null | undefined,
  expectedUserId: string,
  nowSeconds: number,
): boolean {
  if (
    !claims
    || !expectedUserId
    || claims.sub !== expectedUserId
    || claims.aal !== "aal1"
    || !Number.isSafeInteger(nowSeconds)
  ) return false;

  const methods = readAuthenticationMethods(claims.amr);
  if (!methods) return false;
  const { latestPassword, latestAuthentication } = latestOf(methods, "password");
  const age = nowSeconds - latestPassword;

  return latestPassword >= 0
    && latestPassword === latestAuthentication
    && age >= 0
    && age <= PRIVILEGED_REAUTH_WINDOW_SECONDS;
}
