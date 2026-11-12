"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  CATALOG_PRIVILEGED_PERMISSIONS,
  type CatalogPrivilegedPermission,
} from "@/lib/supabase/catalog-admin-guard-policy";
import { runCatalogAdminGuard } from "@/lib/supabase/catalog-admin-guard.server";
import {
  parseEnumEntry,
  parsePriceEntry,
  parseTextEntry,
  parseUuidEntry,
} from "@/lib/supabase/catalog-input-policy";

export type CatalogActionState =
  | null
  | { kind: "saved"; correlationId: string; auditEventIds: string[] }
  | { kind: "invalid"; correlationId: string }
  | { kind: "denied"; correlationId: string }
  | { kind: "failed"; correlationId: string }
  | { kind: "step_up_required"; correlationId: string }
  | { kind: "reauthentication_required"; correlationId: string }
  | { kind: "factor_setup_required"; correlationId: string };

const STATUSES = ["active", "archived"] as const;
const AVAILABILITY = ["unknown", "available", "unavailable"] as const;
type CatalogRpcError = Readonly<{ code?: string }>;

export async function saveCategoryAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const correlationId = await createCorrelationId();
  const organizationId = parseUuidEntry(formData.get("organizationId"), true);
  const categoryId = parseUuidEntry(formData.get("categoryId"), false);
  const parentId = parseUuidEntry(formData.get("parentId"), false);
  const name = parseTextEntry(formData.get("name"), 120, true);
  const description = parseTextEntry(formData.get("description"), 2000, false);
  const status = parseEnumEntry(formData.get("status"), STATUSES);
  if (!organizationId.ok || !organizationId.value || !categoryId.ok || !parentId.ok || !name.ok || !name.value || !description.ok || !status.ok) {
    return { kind: "invalid", correlationId };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };
  const args = {
    p_id: categoryId.value,
    p_organization_id: organizationId.value,
    p_parent_id: parentId.value,
    p_name: name.value,
    p_description: description.value ?? "",
    p_status: status.value,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["catalog_save_category"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("catalog_save_category", args);
    return finishCatalogCommand(error, correlationId, data);
  } catch {
    return { kind: "failed", correlationId };
  }
}

export async function saveProductAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const correlationId = await createCorrelationId();
  const organizationId = parseUuidEntry(formData.get("organizationId"), true);
  const productId = parseUuidEntry(formData.get("productId"), false);
  const categoryId = parseUuidEntry(formData.get("categoryId"), false);
  const name = parseTextEntry(formData.get("name"), 160, true);
  const description = parseTextEntry(formData.get("description"), 5000, false);
  const status = parseEnumEntry(formData.get("status"), STATUSES);
  if (!organizationId.ok || !organizationId.value || !productId.ok || !categoryId.ok || !name.ok || !name.value || !description.ok || !status.ok) {
    return { kind: "invalid", correlationId };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };
  const args = {
    p_id: productId.value,
    p_organization_id: organizationId.value,
    p_category_id: categoryId.value,
    p_name: name.value,
    p_description: description.value ?? "",
    p_status: status.value,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["catalog_save_product"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("catalog_save_product", args);
    return finishCatalogCommand(error, correlationId, data);
  } catch {
    return { kind: "failed", correlationId };
  }
}

export async function saveVariantAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const correlationId = await createCorrelationId();
  const organizationId = parseUuidEntry(formData.get("organizationId"), true);
  const variantId = parseUuidEntry(formData.get("variantId"), false);
  const productId = parseUuidEntry(formData.get("productId"), true);
  const name = parseTextEntry(formData.get("name"), 120, true);
  const size = parseTextEntry(formData.get("sizeLabel"), 80, false);
  const flavor = parseTextEntry(formData.get("flavorLabel"), 80, false);
  const status = parseEnumEntry(formData.get("status"), STATUSES);
  if (!organizationId.ok || !organizationId.value || !variantId.ok || !productId.ok || !productId.value || !name.ok || !name.value || !size.ok || !flavor.ok || !status.ok) {
    return { kind: "invalid", correlationId };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };
  const args = {
    p_id: variantId.value,
    p_organization_id: organizationId.value,
    p_product_id: productId.value,
    p_name: name.value,
    p_size_label: size.value,
    p_flavor_label: flavor.value,
    p_status: status.value,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["catalog_save_variant"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("catalog_save_variant", args);
    return finishCatalogCommand(error, correlationId, data);
  } catch {
    return { kind: "failed", correlationId };
  }
}

export async function saveOfferAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const correlationId = await createCorrelationId();
  const offerId = parseUuidEntry(formData.get("offerId"), false);
  const submittedOrganizationId = parseUuidEntry(formData.get("organizationId"), offerId.ok && offerId.value === null);
  const submittedEstablishmentId = parseUuidEntry(formData.get("establishmentId"), offerId.ok && offerId.value === null);
  const submittedBranchId = parseUuidEntry(formData.get("branchId"), offerId.ok && offerId.value === null);
  const submittedChannelId = parseUuidEntry(formData.get("salesChannelId"), offerId.ok && offerId.value === null);
  const targetKind = parseEnumEntry(formData.get("targetKind"), ["product", "variant"] as const);
  const submittedProductId = parseUuidEntry(formData.get("productId"), false);
  const submittedVariantId = parseUuidEntry(formData.get("variantId"), false);
  const title = parseTextEntry(formData.get("titleOverride"), 160, false);
  const description = parseTextEntry(formData.get("descriptionOverride"), 2000, false);
  const price = parsePriceEntry(formData.get("basePrice"));
  const availability = parseEnumEntry(formData.get("availabilityState"), AVAILABILITY);
  const visible = parseBooleanEntry(formData.get("isVisible"));
  const status = parseEnumEntry(formData.get("status"), STATUSES);
  if (
    !offerId.ok || !submittedOrganizationId.ok || !submittedEstablishmentId.ok || !submittedBranchId.ok
    || !submittedChannelId.ok || !targetKind.ok || !submittedProductId.ok || !submittedVariantId.ok
    || !title.ok || !description.ok || !price.ok || !availability.ok || !visible.ok || !status.ok
  ) return { kind: "invalid", correlationId };

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  if (offerId.value === null) {
    if (
      !submittedOrganizationId.value || !submittedEstablishmentId.value || !submittedBranchId.value
      || !submittedChannelId.value || price.value.numeric !== null
      || availability.value !== "unknown" || visible.value || status.value !== "active"
    ) return { kind: "invalid", correlationId };

    const productTarget = targetKind.value === "product" && submittedProductId.value !== null && submittedVariantId.value === null;
    const variantTarget = targetKind.value === "variant" && submittedVariantId.value !== null && submittedProductId.value === null;
    if (!productTarget && !variantTarget) return { kind: "invalid", correlationId };

    const { data: branch, error: branchError } = await auth.client.from("branches")
      .select("id,organization_id,establishment_id,status")
      .eq("id", submittedBranchId.value)
      .maybeSingle();
    if (
      branchError || !branch || branch.status !== "active"
      || branch.organization_id !== submittedOrganizationId.value
      || branch.establishment_id !== submittedEstablishmentId.value
    ) return { kind: "denied", correlationId };

    const permissionArgs = {
      p_organization_id: branch.organization_id,
      p_establishment_id: branch.establishment_id,
      p_branch_id: branch.id,
      p_permission_key: "catalog.write",
    } as unknown as Database["public"]["Functions"]["catalog_has_permission"]["Args"];
    const { data: canWrite, error: permissionError } = await auth.client.rpc("catalog_has_permission", permissionArgs);
    if (permissionError || canWrite !== true) return { kind: "denied", correlationId };

    const args = {
      p_id: null,
      p_organization_id: branch.organization_id,
      p_establishment_id: branch.establishment_id,
      p_branch_id: branch.id,
      p_sales_channel_id: submittedChannelId.value,
      p_target_kind: targetKind.value,
      p_product_id: productTarget ? submittedProductId.value : null,
      p_variant_id: variantTarget ? submittedVariantId.value : null,
      p_title_override: title.value,
      p_description_override: description.value,
      p_base_price: null,
      p_currency: "BRL",
      p_availability_state: "unknown",
      p_is_visible: false,
      p_status: "active",
      p_step_up_proof_id: null,
      p_correlation_id: correlationId,
    } as unknown as Database["public"]["Functions"]["catalog_save_offer"]["Args"];
    try {
      const { data, error } = await auth.client.rpc("catalog_save_offer", args);
      return finishCatalogCommand(error, correlationId, data);
    } catch {
      return { kind: "failed", correlationId };
    }
  }

  const { data: currentOffer, error: readError } = await auth.client.from("channel_offers")
    .select("id,organization_id,establishment_id,branch_id,sales_channel_id,target_kind,product_id,variant_id,base_price,currency,availability_state,is_visible,status")
    .eq("id", offerId.value)
    .maybeSingle();
  if (readError || !currentOffer) return { kind: "denied", correlationId };
  if (currentOffer.base_price !== null && price.value.numeric === null) return { kind: "invalid", correlationId };

  const currentPrice = currentOffer.base_price === null ? null : currentOffer.base_price.toFixed(2);
  const priceChanged = currentPrice !== price.value.text || currentOffer.currency !== "BRL";
  const availabilityChanged = currentOffer.availability_state !== availability.value
    || currentOffer.is_visible !== visible.value
    || (currentOffer.status === "archived" && status.value === "active" && visible.value);
  const requiredPermissions: CatalogPrivilegedPermission[] = [];
  if (priceChanged) requiredPermissions.push(CATALOG_PRIVILEGED_PERMISSIONS[0]);
  if (availabilityChanged) requiredPermissions.push(CATALOG_PRIVILEGED_PERMISSIONS[1]);

  let stepUpProofId: string | null = null;
  let commandCorrelationId = correlationId;
  if (requiredPermissions.length > 0) {
    const guard = await runCatalogAdminGuard({
      offerId: currentOffer.id,
      organizationId: currentOffer.organization_id,
      establishmentId: currentOffer.establishment_id,
      branchId: currentOffer.branch_id,
    }, requiredPermissions);
    commandCorrelationId = guard.correlationId;
    if (!guard.decision.allowed) return mapGuardDecision(guard.decision.reason, commandCorrelationId);
    if (!guard.proofId) return { kind: "failed", correlationId: commandCorrelationId };
    stepUpProofId = guard.proofId;
  }

  const args = {
    p_id: currentOffer.id,
    p_organization_id: currentOffer.organization_id,
    p_establishment_id: currentOffer.establishment_id,
    p_branch_id: currentOffer.branch_id,
    p_sales_channel_id: currentOffer.sales_channel_id,
    p_target_kind: currentOffer.target_kind,
    p_product_id: currentOffer.product_id,
    p_variant_id: currentOffer.variant_id,
    p_title_override: title.value,
    p_description_override: description.value,
    // Keep the validated exact decimal text through JSON transport to PostgreSQL numeric.
    p_base_price: price.value.numeric,
    p_currency: currentOffer.currency,
    p_availability_state: availability.value,
    p_is_visible: visible.value,
    p_status: status.value,
    p_step_up_proof_id: stepUpProofId,
    p_correlation_id: commandCorrelationId,
  } as unknown as Database["public"]["Functions"]["catalog_save_offer"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("catalog_save_offer", args);
    return finishCatalogCommand(error, commandCorrelationId, data);
  } catch {
    return { kind: "failed", correlationId: commandCorrelationId };
  }
}

function parseBooleanEntry(value: FormDataEntryValue | null) {
  if (value === null) return { ok: true as const, value: false };
  if (value === "on" || value === "true") return { ok: true as const, value: true };
  return { ok: false as const };
}

async function createCorrelationId(): Promise<string> {
  const requestHeaders = await headers();
  return requestCorrelationId(new Request("http://localhost", {
    headers: requestHeaders.get("x-request-id")
      ? { "x-request-id": requestHeaders.get("x-request-id")! }
      : undefined,
  }));
}

function finishCatalogCommand(
  error: CatalogRpcError | null,
  correlationId: string,
  result: Json | null,
): CatalogActionState {
  if (error) {
    return { kind: categorizeError(error), correlationId };
  }
  const receipt = parseCatalogCommandReceipt(result);
  if (!receipt) return { kind: "failed", correlationId };
  revalidatePath("/app/catalog");
  return { kind: "saved", correlationId, auditEventIds: receipt.auditEventIds };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCatalogCommandReceipt(result: Json | null): Readonly<{ auditEventIds: string[] }> | null {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return null;
  if (typeof result.entity_id !== "string" || !UUID.test(result.entity_id)) return null;
  const auditEventIds = result.audit_event_ids;
  if (!Array.isArray(auditEventIds)) return null;
  const validatedAuditEventIds: string[] = [];
  for (const id of auditEventIds) {
    if (typeof id !== "string" || !UUID.test(id)) return null;
    validatedAuditEventIds.push(id);
  }
  return { auditEventIds: validatedAuditEventIds };
}

function categorizeError(error: CatalogRpcError): "invalid" | "denied" | "failed" {
  if (error.code === "42501" || error.code === "P0002") return "denied";
  if (["22023", "23503", "23514", "23505"].includes(error.code ?? "")) return "invalid";
  return "failed";
}

function mapGuardDecision(reason: AdminGuardReason, correlationId: string): CatalogActionState {
  if (reason === "factor_unverified") return { kind: "factor_setup_required", correlationId };
  if (reason === "aal2_required" || reason === "step_up_required") return { kind: "step_up_required", correlationId };
  if (reason === "reauthentication_required") return { kind: "reauthentication_required", correlationId };
  if (reason === "audit_unavailable") return { kind: "failed", correlationId };
  return { kind: "denied", correlationId };
}
