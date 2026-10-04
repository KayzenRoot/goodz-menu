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
    || !Array.isArray(claims.amr)
    || claims.amr.length === 0
    || !Number.isSafeInteger(nowSeconds)
  ) return false;

  const methods: { method: string; timestamp: number }[] = [];
  for (const entry of claims.amr) {
    if (
      typeof entry !== "object"
      || entry === null
      || typeof (entry as { method?: unknown }).method !== "string"
      || !Number.isSafeInteger((entry as { timestamp?: unknown }).timestamp)
      || (entry as { timestamp: number }).timestamp < 0
    ) return false;
    methods.push(entry as { method: string; timestamp: number });
  }

  const latestAuthentication = Math.max(...methods.map(({ timestamp }) => timestamp));
  const latestPassword = Math.max(
    -1,
    ...methods.filter(({ method }) => method === "password").map(({ timestamp }) => timestamp),
  );
  const age = nowSeconds - latestPassword;

  return latestPassword === latestAuthentication
    && age >= 0
    && age <= PRIVILEGED_REAUTH_WINDOW_SECONDS;
}
