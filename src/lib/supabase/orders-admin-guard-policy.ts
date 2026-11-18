import type { AdminGuardDecision, AdminGuardReason } from "@/lib/supabase/admin-guard-policy";

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
  if (!isPlainObject(value) || Object.keys(value).length !== 9) {
    throw new Error("Orders guard audit event is invalid.");
  }
  const {
    actor_user_id,
    organization_id,
    establishment_id,
    branch_id,
    order_id,
    required_permissions,
    correlation_id,
    outcome,
    reason_code,
  } = value;

  if (
    !isNullableUuid(actor_user_id)
    || !isNullableUuid(organization_id)
    || !isNullableUuid(establishment_id)
    || !isNullableUuid(branch_id)
    || !isUuid(order_id)
    || !isUuid(correlation_id)
    || (outcome !== "allow" && outcome !== "deny")
    || typeof reason_code !== "string"
    || !(REASONS as readonly string[]).includes(reason_code)
    || !Array.isArray(required_permissions)
    || required_permissions.length !== 1
    || required_permissions[0] !== "orders.handoff_payment.sensitive"
  ) {
    throw new Error("Orders guard audit event is invalid.");
  }

  const invalidScopeShape = (establishment_id !== null && organization_id === null)
    || (branch_id !== null && (organization_id === null || establishment_id === null));
  const invalidAllow = outcome === "allow" && (
    actor_user_id === null || organization_id === null || reason_code !== "authorized"
  );
  const invalidDeny = outcome === "deny" && reason_code === "authorized";
  if (invalidScopeShape || invalidAllow || invalidDeny) {
    throw new Error("Orders guard audit event is invalid.");
  }

  return {
    actor_user_id,
    organization_id,
    establishment_id,
    branch_id,
    order_id,
    required_permissions: ["orders.handoff_payment.sensitive"],
    correlation_id,
    outcome,
    reason_code: reason_code as OrdersAdminGuardEvent["reason_code"],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}
