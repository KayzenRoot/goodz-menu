import type { AdminGuardDecision, AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { validateStepUpEnvelope } from "@/lib/supabase/step-up-guard-event-base";

export const ORDERS_PRIVILEGED_PERMISSIONS = [
  "orders.handoff_payment.sensitive",
] as const;

export type OrdersPrivilegedPermission = typeof ORDERS_PRIVILEGED_PERMISSIONS[number];

export type OrdersAdminGuardScope = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export type OrdersAdminGuardEvent = {
  actor_user_id: string | null;
  organization_id: string | null;
  establishment_id: string | null;
  branch_id: string | null;
  order_id: string;
  required_permissions: OrdersPrivilegedPermission[];
  correlation_id: string;
  outcome: "allow" | "deny";
  reason_code: "authorized" | Exclude<AdminGuardReason, "audit_unavailable">;
};

export function createOrdersAdminGuardEvent(
  decision: AdminGuardDecision,
  context: Readonly<{
    actorUserId: string | null;
    scope: OrdersAdminGuardScope | null;
    orderId: string;
    correlationId: string;
  }>,
): OrdersAdminGuardEvent {
  const reasonCode = decision.allowed ? "authorized" : decision.reason;
  if (reasonCode === "audit_unavailable") throw new Error("Orders guard audit event is invalid.");
  return validateOrdersAdminGuardEvent({
    actor_user_id: context.actorUserId,
    organization_id: context.scope?.organizationId ?? null,
    establishment_id: context.scope?.establishmentId ?? null,
    branch_id: context.scope?.branchId ?? null,
    order_id: context.orderId,
    required_permissions: ["orders.handoff_payment.sensitive"],
    correlation_id: context.correlationId,
    outcome: decision.allowed ? "allow" : "deny",
    reason_code: reasonCode,
  });
}

export function validateOrdersAdminGuardEvent(value: unknown): OrdersAdminGuardEvent {
  const base = validateStepUpEnvelope(value, {
    targetField: "order_id",
    expectedPermission: "orders.handoff_payment.sensitive",
    requireBranchOnAllow: false,
    errorMessage: "Orders guard audit event is invalid.",
  });
  return {
    actor_user_id: base.actor_user_id,
    organization_id: base.organization_id,
    establishment_id: base.establishment_id,
    branch_id: base.branch_id,
    order_id: base.targetValue,
    required_permissions: ["orders.handoff_payment.sensitive"],
    correlation_id: base.correlation_id,
    outcome: base.outcome,
    reason_code: base.reason_code,
  };
}
