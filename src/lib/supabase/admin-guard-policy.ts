export const PRIVILEGED_FRESHNESS_WINDOW_SECONDS = 300;
export const SYNTHETIC_REQUIRED_PERMISSION = "tenant.hierarchy.read";

export type AdminGuardReason =
  | "invalid_scope"
  | "unauthenticated"
  | "identity_unverified"
  | "authorization_denied"
  | "aal2_required"
  | "factor_unverified"
  | "step_up_required";

export type VerifiedAuthClaims = {
  sub?: unknown;
  aal?: unknown;
  amr?: unknown;
};

export type AdminGuardDecision =
  | { allowed: true }
  | { allowed: false; reason: AdminGuardReason };

export type AdminGuardDependencies = {
  readIdentity: () => Promise<{ id: string } | null>;
  readVerifiedClaims: () => Promise<VerifiedAuthClaims | null>;
  hasVerifiedTotpFactor: () => Promise<boolean | null>;
  authorizeResource: (resourceId: string) => Promise<boolean | null>;
};

export type AdminGuardAuditEvent = {
  event: "goodz.admin_guard.decision";
  action: "synthetic.privileged.proof";
  requiredPermission: typeof SYNTHETIC_REQUIRED_PERMISSION;
  outcome: "allow" | "deny";
  reason: "authorized" | AdminGuardReason;
  correlationId: string;
};

export function createAdminGuardAuditEvent(decision: AdminGuardDecision, correlationId: string): AdminGuardAuditEvent {
  return {
    event: "goodz.admin_guard.decision",
    action: "synthetic.privileged.proof",
    requiredPermission: SYNTHETIC_REQUIRED_PERMISSION,
    outcome: decision.allowed ? "allow" : "deny",
    reason: decision.allowed ? "authorized" : decision.reason,
    correlationId,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hasFreshTotpProof(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr) || amr.length === 0 || !Number.isSafeInteger(nowSeconds)) return false;

  const methods: { method: string; timestamp: number }[] = [];
  for (const entry of amr) {
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
  const latestTotp = Math.max(
    -1,
    ...methods.filter(({ method }) => method === "totp").map(({ timestamp }) => timestamp),
  );
  const age = nowSeconds - latestTotp;

  return latestTotp === latestAuthentication
    && age >= 0
    && age <= PRIVILEGED_FRESHNESS_WINDOW_SECONDS;
}

export async function evaluateAdminGuard(
  dependencies: AdminGuardDependencies,
  resourceId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<AdminGuardDecision> {
  if (!UUID.test(resourceId)) return { allowed: false, reason: "invalid_scope" };

  let identity: { id: string } | null;
  try {
    identity = await dependencies.readIdentity();
  } catch {
    identity = null;
  }
  if (!identity?.id) return { allowed: false, reason: "unauthenticated" };

  let claims: VerifiedAuthClaims | null;
  try {
    claims = await dependencies.readVerifiedClaims();
  } catch {
    claims = null;
  }
  if (!claims || claims.sub !== identity.id) {
    return { allowed: false, reason: "identity_unverified" };
  }

  let authorized: boolean | null;
  try {
    authorized = await dependencies.authorizeResource(resourceId);
  } catch {
    authorized = null;
  }
  if (authorized !== true) return { allowed: false, reason: "authorization_denied" };

  if (claims.aal !== "aal2") return { allowed: false, reason: "aal2_required" };

  let verifiedFactor: boolean | null;
  try {
    verifiedFactor = await dependencies.hasVerifiedTotpFactor();
  } catch {
    verifiedFactor = null;
  }
  if (verifiedFactor !== true) return { allowed: false, reason: "factor_unverified" };

  if (!hasFreshTotpProof(claims.amr, nowSeconds)) {
    return { allowed: false, reason: "step_up_required" };
  }

  return { allowed: true };
}
