export const PRIVILEGED_FRESHNESS_WINDOW_SECONDS = 300;
export const SYNTHETIC_REQUIRED_PERMISSION = "tenant.hierarchy.read";

export type AdminGuardReason =
  | "invalid_scope"
  | "unauthenticated"
  | "identity_unverified"
  | "authorization_denied"
  | "aal2_required"
  | "factor_unverified"
  | "reauthentication_required"
  | "step_up_required"
  | "audit_unavailable";

export type VerifiedAuthClaims = {
  sub?: unknown;
  aal?: unknown;
  amr?: unknown;
};

export type AdminGuardDecision =
  | { allowed: true }
  | { allowed: false; reason: AdminGuardReason };

export type AdminGuardAuditScope = {
  organizationId: string;
  establishmentId: string;
  branchId: string;
};

export type AdminGuardAuditContext = {
  actorUserId: string | null;
  resourceId: string;
  scope: AdminGuardAuditScope | null;
  metadata?: unknown;
};

export type AdminGuardAuditEvent = {
  actor_user_id: string | null;
  organization_id: string | null;
  establishment_id: string | null;
  branch_id: string | null;
  action: "synthetic.privileged.proof";
  target_type: "branch";
  target_id: string | null;
  outcome: "allow" | "deny";
  reason_code: "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;
  correlation_id: string;
  source: "admin_guard";
  metadata: { required_permission: typeof SYNTHETIC_REQUIRED_PERMISSION };
};

export type AdminGuardDependencies = {
  readIdentity: () => Promise<{ id: string } | null>;
  readVerifiedClaims: () => Promise<VerifiedAuthClaims | null>;
  hasVerifiedTotpFactor: () => Promise<boolean | null>;
  hasFreshReauthentication: (identityId: string) => Promise<boolean | null>;
  authorizeResource: (resourceId: string) => Promise<boolean | null>;
  persistAuditDecision: (
    decision: AdminGuardDecision,
    identity: { id: string } | null,
    resourceId: string,
  ) => Promise<void>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIT_REASON_CODES = [
  "authorized",
  "invalid_scope",
  "unauthenticated",
  "identity_unverified",
  "authorization_denied",
  "aal2_required",
  "factor_unverified",
  "reauthentication_required",
  "step_up_required",
] as const;
const AUDIT_EVENT_FIELDS = [
  "actor_user_id",
  "organization_id",
  "establishment_id",
  "branch_id",
  "action",
  "target_type",
  "target_id",
  "outcome",
  "reason_code",
  "correlation_id",
  "source",
  "metadata",
] as const;

export function createAdminGuardAuditEvent(
  decision: AdminGuardDecision,
  correlationId: string,
  context: AdminGuardAuditContext,
): AdminGuardAuditEvent {
  if (!isAuditUuid(correlationId)) throw new Error("Audit event is invalid.");
  const metadata = normalizeAdminGuardMetadata(
    context.metadata === undefined
      ? { required_permission: SYNTHETIC_REQUIRED_PERMISSION }
      : context.metadata,
  );
  return validateAdminGuardAuditEvent({
    actor_user_id: context.actorUserId,
    organization_id: context.scope?.organizationId ?? null,
    establishment_id: context.scope?.establishmentId ?? null,
    branch_id: context.scope?.branchId ?? null,
    action: "synthetic.privileged.proof",
    target_type: "branch",
    target_id: UUID.test(context.resourceId) ? context.resourceId : null,
    outcome: decision.allowed ? "allow" : "deny",
    reason_code: decision.allowed ? "authorized" : decision.reason,
    correlation_id: correlationId,
    source: "admin_guard",
    metadata,
  });
}

export function validateAdminGuardAuditEvent(value: unknown): AdminGuardAuditEvent {
  if (
    !isPlainRecord(value)
    || Reflect.ownKeys(value).length !== AUDIT_EVENT_FIELDS.length
    || Object.keys(value).length !== AUDIT_EVENT_FIELDS.length
    || Object.keys(value).some((key) => !(AUDIT_EVENT_FIELDS as readonly string[]).includes(key))
  ) {
    throw new Error("Audit event is invalid.");
  }

  const actorUserId = value.actor_user_id;
  const organizationId = value.organization_id;
  const establishmentId = value.establishment_id;
  const branchId = value.branch_id;
  const targetId = value.target_id;
  if (
    (actorUserId !== null && !isAuditUuid(actorUserId))
    || (organizationId !== null && !isAuditUuid(organizationId))
    || (establishmentId !== null && !isAuditUuid(establishmentId))
    || (branchId !== null && !isAuditUuid(branchId))
    || (targetId !== null && !isAuditUuid(targetId))
    || !isAuditUuid(value.correlation_id)
    || value.action !== "synthetic.privileged.proof"
    || value.target_type !== "branch"
    || (value.outcome !== "allow" && value.outcome !== "deny")
    || typeof value.reason_code !== "string"
    || !(AUDIT_REASON_CODES as readonly string[]).includes(value.reason_code)
    || value.source !== "admin_guard"
  ) {
    throw new Error("Audit event is invalid.");
  }

  if (
    (establishmentId !== null && organizationId === null)
    || (branchId !== null && (organizationId === null || establishmentId === null))
    || (value.outcome === "allow" && (
      actorUserId === null
      || organizationId === null
      || establishmentId === null
      || branchId === null
      || targetId !== branchId
      || value.reason_code !== "authorized"
    ))
    || (value.outcome === "deny" && value.reason_code === "authorized")
  ) {
    throw new Error("Audit event is invalid.");
  }

  return {
    actor_user_id: actorUserId as string | null,
    organization_id: organizationId as string | null,
    establishment_id: establishmentId as string | null,
    branch_id: branchId as string | null,
    action: "synthetic.privileged.proof",
    target_type: "branch",
    target_id: targetId as string | null,
    outcome: value.outcome,
    reason_code: value.reason_code as AdminGuardAuditEvent["reason_code"],
    correlation_id: value.correlation_id,
    source: "admin_guard",
    metadata: normalizeAdminGuardMetadata(value.metadata),
  };
}

function normalizeAdminGuardMetadata(value: unknown): AdminGuardAuditEvent["metadata"] {
  try {
    if (!isPlainRecord(value)) throw new Error();
    const serialized = JSON.stringify(value);
    if (typeof serialized !== "string" || new TextEncoder().encode(serialized).byteLength > 1024) throw new Error();
    if (
      Reflect.ownKeys(value).length !== 1
      || Object.keys(value).length !== 1
      || Object.keys(value)[0] !== "required_permission"
      || value.required_permission !== SYNTHETIC_REQUIRED_PERMISSION
    ) throw new Error();
    return { required_permission: SYNTHETIC_REQUIRED_PERMISSION };
  } catch {
    throw new Error("Audit metadata is invalid.");
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isAuditUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

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
  let identityForAudit: { id: string } | null = null;
  const evaluationDependencies: AdminGuardDependencies = {
    ...dependencies,
    async readIdentity() {
      const identity = await dependencies.readIdentity();
      identityForAudit = identity;
      return identity;
    },
  };

  const decision = await evaluateAdminGuardDecision(evaluationDependencies, resourceId, nowSeconds);
  try {
    await dependencies.persistAuditDecision(decision, identityForAudit, resourceId);
    return decision;
  } catch {
    return decision.allowed ? { allowed: false, reason: "audit_unavailable" } : decision;
  }
}

async function evaluateAdminGuardDecision(
  dependencies: AdminGuardDependencies,
  resourceId: string,
  nowSeconds: number,
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

  let reauthenticated: boolean | null;
  try {
    reauthenticated = await dependencies.hasFreshReauthentication(identity.id);
  } catch {
    reauthenticated = null;
  }
  if (reauthenticated !== true) return { allowed: false, reason: "reauthentication_required" };

  return { allowed: true };
}
