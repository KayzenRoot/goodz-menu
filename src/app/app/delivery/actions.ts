"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  DELIVERY_DISPATCH_STATUSES,
  DELIVERY_ZONE_STATUSES,
  parseNeighborhoodList,
  type DeliveryDispatchStatus,
  type DeliveryZoneStatus,
} from "@/lib/delivery/delivery-rules";
import { runDeliveryAdminGuard } from "@/lib/supabase/delivery-admin-guard.server";
import { isUuid } from "@/lib/supabase/step-up-guard-event-base";
import {
  parseEnumEntry,
  parsePriceEntry,
  parseTextEntry,
  parseUuidEntry,
} from "@/lib/supabase/catalog-input-policy";

export type DeliveryActionState =
  | null
  | {
      kind: "saved";
      correlationId: string;
      version?: number;
      auditEventIds: string[];
    }
  | { kind: "invalid"; correlationId: string }
  | { kind: "denied"; correlationId: string }
  | { kind: "entitlement_denied"; correlationId: string }
  | { kind: "duplicate_zone"; correlationId: string }
  | { kind: "invalid_transition"; correlationId: string }
  | { kind: "failed"; correlationId: string }
  | { kind: "step_up_required"; correlationId: string }
  | { kind: "reauthentication_required"; correlationId: string }
  | { kind: "factor_setup_required"; correlationId: string };

type RpcErrorShape = Readonly<{ code?: string; message?: string }>;

type ParsedZoneForm = Readonly<{
  zoneId: string | null;
  organizationId: string;
  establishmentId: string;
  branchId: string;
  name: string;
  neighborhoods: string[];
  deliveryFee: string;
  minimumOrder: string;
  estimatedMinutes: number;
  status: DeliveryZoneStatus;
}>;

export async function saveDeliveryZoneAction(
  _previousState: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const fallbackCorrelationId = await readRequestCorrelation();
  const parsed = parseSaveZoneForm(formData);
  if (!parsed) return { kind: "invalid", correlationId: fallbackCorrelationId };

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId: fallbackCorrelationId };

  let proofId: string | null = null;
  let correlationId = fallbackCorrelationId;
  try {
    const guard = await runDeliveryAdminGuard({
      organizationId: parsed.organizationId,
      establishmentId: parsed.establishmentId,
      branchId: parsed.branchId,
      zoneId: parsed.zoneId,
    });
    correlationId = guard.correlationId;
    if (!guard.decision.allowed) {
      return mapDeliveryGuardFailure(guard.decision.reason, correlationId);
    }
    if (!guard.proofId) return { kind: "failed", correlationId };
    proofId = guard.proofId;
  } catch {
    return { kind: "failed", correlationId };
  }

  const args = {
    p_zone_id: parsed.zoneId,
    p_organization_id: parsed.organizationId,
    p_establishment_id: parsed.establishmentId,
    p_branch_id: parsed.branchId,
    p_name: parsed.name,
    p_neighborhoods: parsed.neighborhoods,
    p_delivery_fee_amount: parsed.deliveryFee,
    p_minimum_order_amount: parsed.minimumOrder,
    p_estimated_delivery_minutes: parsed.estimatedMinutes,
    p_status: parsed.status,
    p_step_up_proof_id: proofId,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["delivery_save_zone"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("delivery_save_zone", args);
    return finalizeDeliveryRpc(error, correlationId, data, "zone_id");
  } catch {
    return { kind: "failed", correlationId };
  }
}

export async function advanceDeliveryDispatchAction(
  _previousState: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const correlationId = await readRequestCorrelation();
  const deliveryId = parseUuidEntry(formData.get("deliveryId"), true);
  const toStatus = parseEnumEntry(formData.get("toStatus"), DELIVERY_DISPATCH_STATUSES);
  const courierLabel = parseTextEntry(formData.get("courierLabel"), 120, false);
  const reason = parseTextEntry(formData.get("reason"), 500, false);

  if (!deliveryId.ok || !deliveryId.value || !toStatus.ok || !courierLabel.ok || !reason.ok) {
    return { kind: "invalid", correlationId };
  }
  const targetStatus: DeliveryDispatchStatus = toStatus.value;
  if (targetStatus === "cancelled" && (!reason.value || reason.value.trim().length < 3)) {
    return { kind: "invalid", correlationId };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  const args = {
    p_delivery_id: deliveryId.value,
    p_to_status: targetStatus,
    p_courier_label: courierLabel.value ?? "",
    p_reason: reason.value ?? "",
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["delivery_advance_dispatch"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("delivery_advance_dispatch", args);
    return finalizeDeliveryRpc(error, correlationId, data, "delivery_id");
  } catch {
    return { kind: "failed", correlationId };
  }
}

function parseSaveZoneForm(formData: FormData): ParsedZoneForm | null {
  const zoneId = parseUuidEntry(formData.get("zoneId"), false);
  const orgId = parseUuidEntry(formData.get("organizationId"), true);
  const estId = parseUuidEntry(formData.get("establishmentId"), true);
  const branchId = parseUuidEntry(formData.get("branchId"), true);
  const name = parseTextEntry(formData.get("name"), 120, true);
  const rawNeighborhoods = formData.get("neighborhoods");
  const fee = parsePriceEntry(formData.get("deliveryFee"));
  const minOrder = parsePriceEntry(formData.get("minimumOrder"));
  const rawMinutes = formData.get("estimatedMinutes");
  const status = parseEnumEntry(formData.get("status") ?? "active", DELIVERY_ZONE_STATUSES);

  if (
    !zoneId.ok || !orgId.ok || !orgId.value || !estId.ok || !estId.value || !branchId.ok || !branchId.value
    || !name.ok || !name.value || typeof rawNeighborhoods !== "string"
    || !fee.ok || !minOrder.ok || !status.ok
    || typeof rawMinutes !== "string" || !/^\d{1,3}$/.test(rawMinutes.trim())
  ) {
    return null;
  }

  const neighborhoods = parseNeighborhoodList(rawNeighborhoods);
  const estimatedMinutes = Number.parseInt(rawMinutes.trim(), 10);
  if (!neighborhoods || estimatedMinutes < 5 || estimatedMinutes > 240) return null;

  return {
    zoneId: zoneId.value,
    organizationId: orgId.value,
    establishmentId: estId.value,
    branchId: branchId.value,
    name: name.value,
    neighborhoods,
    deliveryFee: fee.value.numeric ?? "0.00",
    minimumOrder: minOrder.value.numeric ?? "0.00",
    estimatedMinutes,
    status: status.value,
  };
}

function mapDeliveryGuardFailure(reason: AdminGuardReason, correlationId: string): DeliveryActionState {
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

function finalizeDeliveryRpc(
  error: RpcErrorShape | null,
  correlationId: string,
  data: Json | null,
  expectedIdKey: "zone_id" | "delivery_id",
): DeliveryActionState {
  if (error) {
    const message = error.message ?? "";
    if (message.includes("entitlement is not active")) return { kind: "entitlement_denied", correlationId };
    if (message.includes("transition is invalid")) return { kind: "invalid_transition", correlationId };
    if (error.code === "23505") return { kind: "duplicate_zone", correlationId };
    if (error.code === "42501") return { kind: "denied", correlationId };
    if (error.code === "22023" || error.code === "23514") return { kind: "invalid", correlationId };
    return { kind: "failed", correlationId };
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { kind: "failed", correlationId };
  }
  const entityId = data[expectedIdKey];
  const auditIds = data.audit_event_ids;
  if (
    !isUuid(entityId)
    || !Array.isArray(auditIds)
    || auditIds.some((item) => !isUuid(item))
  ) {
    return { kind: "failed", correlationId };
  }

  revalidatePath("/app/delivery");
  revalidatePath("/app/orders");
  return {
    kind: "saved",
    correlationId,
    version: typeof data.version === "number" ? data.version : undefined,
    auditEventIds: auditIds as string[],
  };
}

async function readRequestCorrelation(): Promise<string> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id");
  return requestCorrelationId(new Request("http://localhost", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
  }));
}
