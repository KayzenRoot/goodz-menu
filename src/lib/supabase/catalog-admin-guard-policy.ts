import type { AdminGuardDecision, AdminGuardReason } from "@/lib/supabase/admin-guard-policy";

export const CATALOG_PRIVILEGED_PERMISSIONS = [
  "catalog.price.write",
  "catalog.availability.write",
] as const;

export type CatalogPrivilegedPermission = typeof CATALOG_PRIVILEGED_PERMISSIONS[number];

export type CatalogAdminGuardScope = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export type CatalogAdminGuardEvent = {
  actor_user_id: string | null;
  organization_id: string | null;
  establishment_id: string | null;
  branch_id: string | null;
  target_id: string;
  required_permissions: CatalogPrivilegedPermission[];
  correlation_id: string;
  outcome: "allow" | "deny";
  reason_code: "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_FIELDS = [
  "actor_user_id",
  "organization_id",
  "establishment_id",
  "branch_id",
  "target_id",
  "required_permissions",
  "correlation_id",
  "outcome",
  "reason_code",
] as const;
const REASONS = [
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

export function createCatalogAdminGuardEvent(
  decision: AdminGuardDecision,
  context: Readonly<{
    actorUserId: string | null;
    scope: CatalogAdminGuardScope | null;
    targetId: string;
    requiredPermissions: readonly CatalogPrivilegedPermission[];
    correlationId: string;
  }>,
): CatalogAdminGuardEvent {
  const reasonCode = decision.allowed ? "authorized" : decision.reason;
  if (reasonCode === "audit_unavailable") throw new Error("Catalog guard audit event is invalid.");
  return validateCatalogAdminGuardEvent({
    actor_user_id: context.actorUserId,
    organization_id: context.scope?.organizationId ?? null,
    establishment_id: context.scope?.establishmentId ?? null,
    branch_id: context.scope?.branchId ?? null,
    target_id: context.targetId,
    required_permissions: [...context.requiredPermissions],
    correlation_id: context.correlationId,
    outcome: decision.allowed ? "allow" : "deny",
    reason_code: reasonCode,
  });
}

export function validateCatalogAdminGuardEvent(value: unknown): CatalogAdminGuardEvent {
  if (
    !isPlainRecord(value)
    || Reflect.ownKeys(value).length !== EVENT_FIELDS.length
    || Object.keys(value).length !== EVENT_FIELDS.length
    || Object.keys(value).some((key) => !(EVENT_FIELDS as readonly string[]).includes(key))
  ) {
    throw new Error("Catalog guard audit event is invalid.");
  }

  const { actor_user_id, organization_id, establishment_id, branch_id, target_id, correlation_id, outcome, reason_code } = value;
  const permissions = value.required_permissions;
  if (
    (actor_user_id !== null && !isUuid(actor_user_id))
    || (organization_id !== null && !isUuid(organization_id))
    || (establishment_id !== null && !isUuid(establishment_id))
    || (branch_id !== null && !isUuid(branch_id))
    || !isUuid(target_id)
    || !isUuid(correlation_id)
    || (outcome !== "allow" && outcome !== "deny")
    || typeof reason_code !== "string"
    || !(REASONS as readonly string[]).includes(reason_code)
    || !Array.isArray(permissions)
    || permissions.length === 0
    || permissions.some((permission) => !(CATALOG_PRIVILEGED_PERMISSIONS as readonly unknown[]).includes(permission))
    || new Set(permissions).size !== permissions.length
  ) {
    throw new Error("Catalog guard audit event is invalid.");
  }

  if (
    (establishment_id !== null && organization_id === null)
    || (branch_id !== null && (organization_id === null || establishment_id === null))
    || (outcome === "allow" && (
      actor_user_id === null
      || organization_id === null
      || reason_code !== "authorized"
    ))
    || (outcome === "deny" && reason_code === "authorized")
  ) {
    throw new Error("Catalog guard audit event is invalid.");
  }

  const normalizedPermissions = [...permissions].sort() as CatalogPrivilegedPermission[];
  return {
    actor_user_id: actor_user_id as string | null,
    organization_id: organization_id as string | null,
    establishment_id: establishment_id as string | null,
    branch_id: branch_id as string | null,
    target_id: target_id as string,
    required_permissions: normalizedPermissions,
    correlation_id: correlation_id as string,
    outcome,
    reason_code: reason_code as CatalogAdminGuardEvent["reason_code"],
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
