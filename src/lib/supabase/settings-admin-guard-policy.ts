import type { AdminGuardDecision, AdminGuardReason } from "@/lib/supabase/admin-guard-policy";

export const SETTINGS_PRIVILEGED_PERMISSIONS = [
  "settings.sensitive.write",
] as const;

export type SettingsPrivilegedPermission = typeof SETTINGS_PRIVILEGED_PERMISSIONS[number];
export type SettingsStepUpScopeType = "organization" | "establishment" | "branch" | "role";

export type SettingsAdminGuardScope = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export type SettingsAdminGuardEvent = {
  actor_user_id: string | null;
  organization_id: string | null;
  establishment_id: string | null;
  branch_id: string | null;
  scope_type: SettingsStepUpScopeType;
  setting_key: string;
  required_permissions: SettingsPrivilegedPermission[];
  correlation_id: string;
  outcome: "allow" | "deny";
  reason_code: "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOTTED_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const SCOPES: readonly SettingsStepUpScopeType[] = ["organization", "establishment", "branch", "role"];
const EVENT_FIELDS = [
  "actor_user_id",
  "organization_id",
  "establishment_id",
  "branch_id",
  "scope_type",
  "setting_key",
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

export function createSettingsAdminGuardEvent(
  decision: AdminGuardDecision,
  context: Readonly<{
    actorUserId: string | null;
    scope: SettingsAdminGuardScope | null;
    scopeType: SettingsStepUpScopeType;
    settingKey: string;
    requiredPermissions: readonly SettingsPrivilegedPermission[];
    correlationId: string;
  }>,
): SettingsAdminGuardEvent {
  const reasonCode = decision.allowed ? "authorized" : decision.reason;
  if (reasonCode === "audit_unavailable") throw new Error("Settings guard audit event is invalid.");
  return validateSettingsAdminGuardEvent({
    actor_user_id: context.actorUserId,
    organization_id: context.scope?.organizationId ?? null,
    establishment_id: context.scope?.establishmentId ?? null,
    branch_id: context.scope?.branchId ?? null,
    scope_type: context.scopeType,
    setting_key: context.settingKey,
    required_permissions: [...context.requiredPermissions],
    correlation_id: context.correlationId,
    outcome: decision.allowed ? "allow" : "deny",
    reason_code: reasonCode,
  });
}

export function validateSettingsAdminGuardEvent(value: unknown): SettingsAdminGuardEvent {
  if (
    !isPlainRecord(value)
    || Reflect.ownKeys(value).length !== EVENT_FIELDS.length
    || Object.keys(value).length !== EVENT_FIELDS.length
    || Object.keys(value).some((key) => !(EVENT_FIELDS as readonly string[]).includes(key))
  ) {
    throw new Error("Settings guard audit event is invalid.");
  }

  const {
    actor_user_id,
    organization_id,
    establishment_id,
    branch_id,
    scope_type,
    setting_key,
    correlation_id,
    outcome,
    reason_code,
  } = value;
  const permissions = value.required_permissions;

  if (
    (actor_user_id !== null && !isUuid(actor_user_id))
    || (organization_id !== null && !isUuid(organization_id))
    || (establishment_id !== null && !isUuid(establishment_id))
    || (branch_id !== null && !isUuid(branch_id))
    || typeof scope_type !== "string"
    || !(SCOPES as readonly string[]).includes(scope_type)
    || typeof setting_key !== "string"
    || setting_key.length > 120
    || !DOTTED_KEY.test(setting_key)
    || !isUuid(correlation_id)
    || (outcome !== "allow" && outcome !== "deny")
    || typeof reason_code !== "string"
    || !(REASONS as readonly string[]).includes(reason_code)
    || !Array.isArray(permissions)
    || permissions.length !== 1
    || permissions[0] !== "settings.sensitive.write"
  ) {
    throw new Error("Settings guard audit event is invalid.");
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
    throw new Error("Settings guard audit event is invalid.");
  }

  return {
    actor_user_id: actor_user_id as string | null,
    organization_id: organization_id as string | null,
    establishment_id: establishment_id as string | null,
    branch_id: branch_id as string | null,
    scope_type: scope_type as SettingsStepUpScopeType,
    setting_key,
    required_permissions: ["settings.sensitive.write"],
    correlation_id: correlation_id as string,
    outcome,
    reason_code: reason_code as SettingsAdminGuardEvent["reason_code"],
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
