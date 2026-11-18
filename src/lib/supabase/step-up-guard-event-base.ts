import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";

export type StepUpGuardReasonCode = "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;

export type ValidatedStepUpEnvelope = Readonly<{
  actor_user_id: string | null;
  organization_id: string | null;
  establishment_id: string | null;
  branch_id: string | null;
  targetValue: string;
  correlation_id: string;
  outcome: "allow" | "deny";
  reason_code: StepUpGuardReasonCode;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

export function validateStepUpEnvelope(
  value: unknown,
  options: Readonly<{
    targetField: string;
    expectedPermission: string;
    requireBranchOnAllow: boolean;
    errorMessage: string;
  }>,
): ValidatedStepUpEnvelope {
  if (!isPlainObject(value) || Object.keys(value).length !== 9) {
    throw new Error(options.errorMessage);
  }
  const {
    actor_user_id,
    organization_id,
    establishment_id,
    branch_id,
    required_permissions,
    correlation_id,
    outcome,
    reason_code,
  } = value;
  const targetValue = value[options.targetField];

  if (
    !isNullableUuid(actor_user_id)
    || !isNullableUuid(organization_id)
    || !isNullableUuid(establishment_id)
    || !isNullableUuid(branch_id)
    || !isUuid(targetValue)
    || !isUuid(correlation_id)
    || (outcome !== "allow" && outcome !== "deny")
    || typeof reason_code !== "string"
    || !(REASONS as readonly string[]).includes(reason_code)
    || !Array.isArray(required_permissions)
    || required_permissions.length !== 1
    || required_permissions[0] !== options.expectedPermission
  ) {
    throw new Error(options.errorMessage);
  }

  const invalidScopeShape = (establishment_id !== null && organization_id === null)
    || (branch_id !== null && (organization_id === null || establishment_id === null));
  const invalidAllow = outcome === "allow" && (
    actor_user_id === null
    || organization_id === null
    || (options.requireBranchOnAllow && branch_id === null)
    || reason_code !== "authorized"
  );
  const invalidDeny = outcome === "deny" && reason_code === "authorized";

  if (invalidScopeShape || invalidAllow || invalidDeny) {
    throw new Error(options.errorMessage);
  }

  return {
    actor_user_id,
    organization_id,
    establishment_id,
    branch_id,
    targetValue,
    correlation_id,
    outcome,
    reason_code: reason_code as StepUpGuardReasonCode,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}
