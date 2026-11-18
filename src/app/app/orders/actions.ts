"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  HANDOFF_PAYMENT_METHODS,
  type HandoffPaymentMethod,
} from "@/lib/settings/settings-resolver";
import {
  isSensitiveHandoffStatus,
  ORDER_FULFILLMENT_MODES,
  ORDER_STATUSES,
  type OrderFulfillmentMode,
  type RecordedHandoffPaymentStatus,
} from "@/lib/orders/order-lifecycle";
import { runOrdersAdminGuard } from "@/lib/supabase/orders-admin-guard.server";
import {
  parseEnumEntry,
  parsePriceEntry,
  parseTextEntry,
  parseUuidEntry,
} from "@/lib/supabase/catalog-input-policy";

export type OrdersActionState =
  | null
  | {
      kind: "saved";
      correlationId: string;
      orderNumber?: number;
      idempotentReplay?: boolean;
      auditEventIds: string[];
    }
  | { kind: "invalid"; correlationId: string }
  | { kind: "denied"; correlationId: string }
  | { kind: "storefront_paused"; correlationId: string }
  | { kind: "offer_unavailable"; correlationId: string }
  | { kind: "below_minimum"; correlationId: string }
  | { kind: "outside_zone"; correlationId: string }
  | { kind: "invalid_transition"; correlationId: string }
  | { kind: "failed"; correlationId: string }
  | { kind: "step_up_required"; correlationId: string }
  | { kind: "reauthentication_required"; correlationId: string }
  | { kind: "factor_setup_required"; correlationId: string };

const RECORDED_HANDOFF_STATUSES = [
  "collected",
  "failed",
  "cancelled",
  "reversed",
  "disputed",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type OrdersRpcError = Readonly<{ code?: string; message?: string }>;

type ParsedPlaceOrderInput = Readonly<{
  organizationId: string;
  establishmentId: string;
  branchId: string;
  fulfillmentMode: OrderFulfillmentMode;
  customerName: string;
  customerPhone: string;
  deliveryAddress: Json;
  deliveryFee: string;
  deliveryZoneId: string | null;
  paymentMethod: HandoffPaymentMethod;
  cashChangeFor: string | null;
  customerNotes: string;
  items: Json;
  idempotencyKey: string;
}>;

export async function placeStaffOrderAction(
  _previousState: OrdersActionState,
  formData: FormData,
): Promise<OrdersActionState> {
  const correlationId = await createCorrelationId();
  const parsed = parsePlaceOrderForm(formData);
  if (!parsed) return { kind: "invalid", correlationId };

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  const args = {
    p_organization_id: parsed.organizationId,
    p_establishment_id: parsed.establishmentId,
    p_branch_id: parsed.branchId,
    p_fulfillment_mode: parsed.fulfillmentMode,
    p_customer_name: parsed.customerName,
    p_customer_phone: parsed.customerPhone,
    p_delivery_address: parsed.deliveryAddress,
    p_delivery_fee_amount: parsed.deliveryFee,
    p_declared_payment_method: parsed.paymentMethod,
    p_cash_change_for: parsed.cashChangeFor,
    p_customer_notes: parsed.customerNotes,
    p_items: parsed.items,
    p_idempotency_key: parsed.idempotencyKey,
    p_correlation_id: correlationId,
    p_delivery_zone_id: parsed.deliveryZoneId,
  } as unknown as Database["public"]["Functions"]["orders_place_staff"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("orders_place_staff", args);
    return finishOrdersCommand(error, correlationId, data);
  } catch {
    return { kind: "failed", correlationId };
  }
}

export async function transitionOrderStatusAction(
  _previousState: OrdersActionState,
  formData: FormData,
): Promise<OrdersActionState> {
  const correlationId = await createCorrelationId();
  const orderId = parseUuidEntry(formData.get("orderId"), true);
  const toStatus = parseEnumEntry(formData.get("toStatus"), ORDER_STATUSES);
  const reason = parseTextEntry(formData.get("reason"), 500, false);
  if (!orderId.ok || !orderId.value || !toStatus.ok || !reason.ok) {
    return { kind: "invalid", correlationId };
  }
  if (toStatus.value === "cancelled" && (!reason.value || reason.value.trim().length < 3)) {
    return { kind: "invalid", correlationId };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  const args = {
    p_order_id: orderId.value,
    p_to_status: toStatus.value,
    p_reason: reason.value ?? "",
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["orders_transition_status"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("orders_transition_status", args);
    return finishOrdersCommand(error, correlationId, data);
  } catch {
    return { kind: "failed", correlationId };
  }
}

export async function recordHandoffPaymentAction(
  _previousState: OrdersActionState,
  formData: FormData,
): Promise<OrdersActionState> {
  const correlationId = await createCorrelationId();
  const orgId = parseUuidEntry(formData.get("organizationId"), true);
  const estId = parseUuidEntry(formData.get("establishmentId"), true);
  const branchId = parseUuidEntry(formData.get("branchId"), true);
  const orderId = parseUuidEntry(formData.get("orderId"), true);
  const method = parseEnumEntry(formData.get("paymentMethod"), HANDOFF_PAYMENT_METHODS);
  const status = parseEnumEntry(formData.get("handoffStatus"), RECORDED_HANDOFF_STATUSES);
  const reason = parseTextEntry(formData.get("reason"), 500, false);

  if (
    !orgId.ok || !orgId.value || !estId.ok || !estId.value
    || !branchId.ok || !branchId.value || !orderId.ok || !orderId.value
    || !method.ok || !status.ok || !reason.ok
  ) {
    return { kind: "invalid", correlationId };
  }

  const handoffStatus: RecordedHandoffPaymentStatus = status.value;
  if (handoffStatus !== "collected" && (!reason.value || reason.value.trim().length < 3)) {
    return { kind: "invalid", correlationId };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  const stepUp = await acquireHandoffStepUpIfNeeded(
    isSensitiveHandoffStatus(handoffStatus),
    {
      organizationId: orgId.value,
      establishmentId: estId.value,
      branchId: branchId.value,
      orderId: orderId.value,
    },
    correlationId,
  );
  if (!stepUp.ok) return stepUp.failureState;

  const args = {
    p_order_id: orderId.value,
    p_payment_method: method.value,
    p_status: handoffStatus,
    p_reason: reason.value ?? "",
    p_step_up_proof_id: stepUp.proofId,
    p_correlation_id: stepUp.correlationId,
  } as unknown as Database["public"]["Functions"]["orders_record_handoff_payment"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("orders_record_handoff_payment", args);
    return finishOrdersCommand(error, stepUp.correlationId, data);
  } catch {
    return { kind: "failed", correlationId: stepUp.correlationId };
  }
}

function parsePlaceOrderForm(formData: FormData): ParsedPlaceOrderInput | null {
  const orgId = parseUuidEntry(formData.get("organizationId"), true);
  const estId = parseUuidEntry(formData.get("establishmentId"), true);
  const branchId = parseUuidEntry(formData.get("branchId"), true);
  const mode = parseEnumEntry(formData.get("fulfillmentMode"), ORDER_FULFILLMENT_MODES);
  const customerName = parseTextEntry(formData.get("customerName"), 120, true);
  const customerPhone = parseTextEntry(formData.get("customerPhone"), 40, true);
  const paymentMethod = parseEnumEntry(formData.get("paymentMethod"), HANDOFF_PAYMENT_METHODS);
  const cashChange = parsePriceEntry(formData.get("cashChangeFor"));
  const customerNotes = parseTextEntry(formData.get("customerNotes"), 500, false);
  const idempotencyKey = parseTextEntry(formData.get("idempotencyKey"), 128, true);
  const offerId = parseUuidEntry(formData.get("channelOfferId"), true);
  const rawQty = formData.get("quantity");

  if (
    !orgId.ok || !orgId.value || !estId.ok || !estId.value || !branchId.ok || !branchId.value
    || !mode.ok || !customerName.ok || !customerName.value || !customerPhone.ok || !customerPhone.value
    || !paymentMethod.ok || !cashChange.ok || !customerNotes.ok
    || !idempotencyKey.ok || !idempotencyKey.value || idempotencyKey.value.length < 8
    || !offerId.ok || !offerId.value
    || typeof rawQty !== "string" || !/^\d{1,2}$/.test(rawQty.trim())
  ) {
    return null;
  }

  const quantity = Number.parseInt(rawQty.trim(), 10);
  if (quantity < 1 || quantity > 99) return null;

  const addressResult = parseOptionalDeliveryAddress(mode.value, formData);
  if (!addressResult.ok) return null;

  return {
    organizationId: orgId.value,
    establishmentId: estId.value,
    branchId: branchId.value,
    fulfillmentMode: mode.value,
    customerName: customerName.value,
    customerPhone: customerPhone.value,
    deliveryAddress: addressResult.address,
    deliveryFee: addressResult.deliveryFee,
    deliveryZoneId: addressResult.deliveryZoneId,
    paymentMethod: paymentMethod.value,
    cashChangeFor: paymentMethod.value === "cash" ? cashChange.value.numeric : null,
    customerNotes: customerNotes.value ?? "",
    items: [{ channel_offer_id: offerId.value, quantity, notes: "" }],
    idempotencyKey: idempotencyKey.value,
  };
}

function parseOptionalDeliveryAddress(
  mode: OrderFulfillmentMode,
  formData: FormData,
): Readonly<{ ok: true; address: Json; deliveryFee: string; deliveryZoneId: string | null } | { ok: false }> {
  if (mode === "pickup") {
    return { ok: true, address: null, deliveryFee: "0.00", deliveryZoneId: null };
  }
  const zoneId = parseUuidEntry(formData.get("deliveryZoneId"), false);
  const street = parseTextEntry(formData.get("streetLine"), 200, true);
  const numberLabel = parseTextEntry(formData.get("numberLabel"), 40, false);
  const neighborhood = parseTextEntry(formData.get("neighborhood"), 120, true);
  const city = parseTextEntry(formData.get("city"), 120, true);
  const fee = parsePriceEntry(formData.get("deliveryFee") ?? "0.00");
  if (!zoneId.ok || !street.ok || !street.value || !numberLabel.ok || !neighborhood.ok || !neighborhood.value || !city.ok || !city.value || !fee.ok) {
    return { ok: false };
  }
  return {
    ok: true,
    deliveryFee: fee.value.numeric ?? "0.00",
    deliveryZoneId: zoneId.value,
    address: {
      street_line: street.value,
      number_label: numberLabel.value ?? "S/N",
      neighborhood: neighborhood.value,
      city: city.value,
      state_code: "SP",
    },
  };
}

async function acquireHandoffStepUpIfNeeded(
  needsStepUp: boolean,
  target: Readonly<{ organizationId: string; establishmentId: string; branchId: string; orderId: string }>,
  correlationId: string,
): Promise<
  | Readonly<{ ok: true; proofId: string | null; correlationId: string }>
  | Readonly<{ ok: false; failureState: OrdersActionState }>
> {
  if (!needsStepUp) return { ok: true, proofId: null, correlationId };
  try {
    const guard = await runOrdersAdminGuard(target);
    if (!guard.decision.allowed) {
      return { ok: false, failureState: mapGuardDenial(guard.decision.reason, guard.correlationId) };
    }
    if (!guard.proofId) {
      return { ok: false, failureState: { kind: "failed", correlationId: guard.correlationId } };
    }
    return { ok: true, proofId: guard.proofId, correlationId: guard.correlationId };
  } catch {
    return { ok: false, failureState: { kind: "failed", correlationId } };
  }
}

function mapGuardDenial(reason: AdminGuardReason, correlationId: string): OrdersActionState {
  if (reason === "aal2_required" || reason === "step_up_required") {
    return { kind: "step_up_required", correlationId };
  }
  if (reason === "reauthentication_required") {
    return { kind: "reauthentication_required", correlationId };
  }
  if (reason === "factor_unverified") {
    return { kind: "factor_setup_required", correlationId };
  }
  if (reason === "audit_unavailable") {
    return { kind: "failed", correlationId };
  }
  return { kind: "denied", correlationId };
}

function finishOrdersCommand(
  error: OrdersRpcError | null,
  correlationId: string,
  data: Json | null,
): OrdersActionState {
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("paused or disabled")) return { kind: "storefront_paused", correlationId };
    if (msg.includes("offer is unavailable")) return { kind: "offer_unavailable", correlationId };
    if (msg.includes("minimum order amount")) return { kind: "below_minimum", correlationId };
    if (msg.includes("outside configured delivery zones") || msg.includes("delivery zone is unavailable")) {
      return { kind: "outside_zone", correlationId };
    }
    if (msg.includes("transition is invalid")) return { kind: "invalid_transition", correlationId };
    if (error.code === "42501") return { kind: "denied", correlationId };
    if (error.code === "22023" || error.code === "23514") return { kind: "invalid", correlationId };
    return { kind: "failed", correlationId };
  }

  const parsed = parseOrderCommandReceipt(data);
  if (!parsed) return { kind: "failed", correlationId };
  revalidatePath("/app/orders");
  revalidatePath("/app/delivery");
  return {
    kind: "saved",
    correlationId,
    orderNumber: parsed.orderNumber,
    idempotentReplay: parsed.idempotentReplay,
    auditEventIds: parsed.auditEventIds,
  };
}

function parseOrderCommandReceipt(
  data: Json | null,
): Readonly<{ orderNumber?: number; idempotentReplay?: boolean; auditEventIds: string[] }> | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const orderId = data.order_id;
  const auditIds = data.audit_event_ids;
  if (
    typeof orderId !== "string"
    || !UUID.test(orderId)
    || !Array.isArray(auditIds)
    || auditIds.some((id) => typeof id !== "string" || !UUID.test(id))
  ) {
    return null;
  }
  const orderNumber = typeof data.order_number === "number" ? data.order_number : undefined;
  const idempotentReplay = typeof data.idempotent_replay === "boolean" ? data.idempotent_replay : undefined;
  return { orderNumber, idempotentReplay, auditEventIds: auditIds as string[] };
}

async function createCorrelationId(): Promise<string> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id");
  return requestCorrelationId(new Request("http://localhost", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
  }));
}
