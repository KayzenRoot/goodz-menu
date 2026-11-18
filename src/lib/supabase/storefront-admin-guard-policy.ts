import type { AdminGuardDecision, AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { validateStepUpEnvelope } from "@/lib/supabase/step-up-guard-event-base";

export const STOREFRONT_PRIVILEGED_PERMISSIONS = ["storefront.write"] as const;
export type StorefrontPrivilegedPermission = typeof STOREFRONT_PRIVILEGED_PERMISSIONS[number];

export type StorefrontAdminGuardScope = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export type StorefrontAdminGuardEvent = {
  actor_user_id: string | null;
  organization_id: string | null;
  establishment_id: string | null;
  branch_id: string | null;
  target_id: string;
  required_permissions: StorefrontPrivilegedPermission[];
  correlation_id: string;
  outcome: "allow" | "deny";
  reason_code: "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;
};

export function createStorefrontAdminGuardEvent(
  decision: AdminGuardDecision,
  context: Readonly<{
    actorUserId: string | null;
    scope: StorefrontAdminGuardScope | null;
    targetId: string;
    correlationId: string;
  }>,
): StorefrontAdminGuardEvent {
  const reasonCode = decision.allowed ? "authorized" : decision.reason;
  if (reasonCode === "audit_unavailable") throw new Error("Storefront guard audit event is invalid.");
  return validateStorefrontAdminGuardEvent({
    actor_user_id: context.actorUserId,
    organization_id: context.scope?.organizationId ?? null,
    establishment_id: context.scope?.establishmentId ?? null,
    branch_id: context.scope?.branchId ?? null,
    target_id: context.targetId,
    required_permissions: ["storefront.write"],
    correlation_id: context.correlationId,
    outcome: decision.allowed ? "allow" : "deny",
    reason_code: reasonCode,
  });
}

export function validateStorefrontAdminGuardEvent(value: unknown): StorefrontAdminGuardEvent {
  const base = validateStepUpEnvelope(value, {
    targetField: "target_id",
    expectedPermission: "storefront.write",
    requireBranchOnAllow: true,
    errorMessage: "Storefront guard audit event is invalid.",
  });
  return {
    actor_user_id: base.actor_user_id,
    organization_id: base.organization_id,
    establishment_id: base.establishment_id,
    branch_id: base.branch_id,
    target_id: base.targetValue,
    required_permissions: ["storefront.write"],
    correlation_id: base.correlation_id,
    outcome: base.outcome,
    reason_code: base.reason_code,
  };
}
