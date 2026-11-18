import type { AdminGuardDecision, AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { validateStepUpEnvelope } from "@/lib/supabase/step-up-guard-event-base";

export const DELIVERY_PRIVILEGED_PERMISSIONS = ["delivery.zone.write"] as const;
export type DeliveryPrivilegedPermission = typeof DELIVERY_PRIVILEGED_PERMISSIONS[number];

export type DeliveryAdminGuardScope = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export type DeliveryAdminGuardEvent = {
  actor_user_id: string | null;
  organization_id: string | null;
  establishment_id: string | null;
  branch_id: string | null;
  target_id: string;
  required_permissions: DeliveryPrivilegedPermission[];
  correlation_id: string;
  outcome: "allow" | "deny";
  reason_code: "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;
};

export function createDeliveryAdminGuardEvent(
  decision: AdminGuardDecision,
  context: Readonly<{
    actorUserId: string | null;
    scope: DeliveryAdminGuardScope | null;
    targetId: string;
    correlationId: string;
  }>,
): DeliveryAdminGuardEvent {
  const reasonCode = decision.allowed ? "authorized" : decision.reason;
  if (reasonCode === "audit_unavailable") throw new Error("Delivery guard audit event is invalid.");
  return validateDeliveryAdminGuardEvent({
    actor_user_id: context.actorUserId,
    organization_id: context.scope?.organizationId ?? null,
    establishment_id: context.scope?.establishmentId ?? null,
    branch_id: context.scope?.branchId ?? null,
    target_id: context.targetId,
    required_permissions: ["delivery.zone.write"],
    correlation_id: context.correlationId,
    outcome: decision.allowed ? "allow" : "deny",
    reason_code: reasonCode,
  });
}

export function validateDeliveryAdminGuardEvent(value: unknown): DeliveryAdminGuardEvent {
  const base = validateStepUpEnvelope(value, {
    targetField: "target_id",
    expectedPermission: "delivery.zone.write",
    requireBranchOnAllow: true,
    errorMessage: "Delivery guard audit event is invalid.",
  });
  return {
    actor_user_id: base.actor_user_id,
    organization_id: base.organization_id,
    establishment_id: base.establishment_id,
    branch_id: base.branch_id,
    target_id: base.targetValue,
    required_permissions: ["delivery.zone.write"],
    correlation_id: base.correlation_id,
    outcome: base.outcome,
    reason_code: base.reason_code,
  };
}
