import type { AdminGuardDecision, AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { validateStepUpEnvelope } from "@/lib/supabase/step-up-guard-event-base";

export const PRIVACY_PRIVILEGED_PERMISSIONS = ["privacy.manage"] as const;
export type PrivacyPrivilegedPermission = typeof PRIVACY_PRIVILEGED_PERMISSIONS[number];

export type PrivacyAdminGuardEvent = {
  actor_user_id: string | null;
  organization_id: string | null;
  customer_id: string;
  required_permissions: PrivacyPrivilegedPermission[];
  correlation_id: string;
  outcome: "allow" | "deny";
  reason_code: "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;
};

export function createPrivacyAdminGuardEvent(
  decision: AdminGuardDecision,
  context: Readonly<{
    actorUserId: string | null;
    organizationId: string | null;
    customerId: string;
    correlationId: string;
  }>,
): PrivacyAdminGuardEvent {
  const reasonCode = decision.allowed ? "authorized" : decision.reason;
  if (reasonCode === "audit_unavailable") throw new Error("Privacy guard audit event is invalid.");
  return validatePrivacyAdminGuardEvent({
    actor_user_id: context.actorUserId,
    organization_id: context.organizationId,
    customer_id: context.customerId,
    required_permissions: ["privacy.manage"],
    correlation_id: context.correlationId,
    outcome: decision.allowed ? "allow" : "deny",
    reason_code: reasonCode,
  });
}

export function validatePrivacyAdminGuardEvent(value: unknown): PrivacyAdminGuardEvent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Privacy guard audit event is invalid.");
  }
  const base = validateStepUpEnvelope(
    {
      ...value,
      establishment_id: null,
      branch_id: null,
    },
    {
      targetField: "customer_id",
      expectedPermission: "privacy.manage",
      requireBranchOnAllow: false,
      errorMessage: "Privacy guard audit event is invalid.",
    },
  );
  return {
    actor_user_id: base.actor_user_id,
    organization_id: base.organization_id,
    customer_id: base.targetValue,
    required_permissions: ["privacy.manage"],
    correlation_id: base.correlation_id,
    outcome: base.outcome,
    reason_code: base.reason_code,
  };
}
