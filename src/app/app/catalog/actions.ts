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
  const input = parseOfferForm(formData);
  if (!input) return { kind: "invalid", correlationId };

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  if (input.offerId === null) return createOffer(auth, input, correlationId);
  return updateOffer(auth, input, input.offerId, correlationId);
}

function parseOfferForm(formData: FormData) {
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
  ) return null;

  return {
    offerId: offerId.value,
    organizationId: submittedOrganizationId.value,
    establishmentId: submittedEstablishmentId.value,
    branchId: submittedBranchId.value,
    channelId: submittedChannelId.value,
    targetKind: targetKind.value,
    productId: submittedProductId.value,
    variantId: submittedVariantId.value,
    title: title.value,
    description: description.value,
    price: price.value,
    availability: availability.value,
    visible: visible.value,
    status: status.value,
  };
}

type ParsedOfferForm = NonNullable<ReturnType<typeof parseOfferForm>>;
type CatalogAuthContext = NonNullable<Awaited<ReturnType<typeof getCurrentAuthContext>>>;

async function createOffer(
  auth: CatalogAuthContext,
  input: ParsedOfferForm,
  correlationId: string,
): Promise<CatalogActionState> {
  if (
    !input.organizationId || !input.establishmentId || !input.branchId || !input.channelId
    || input.price.numeric !== null || input.availability !== "unknown" || input.visible || input.status !== "active"
  ) return { kind: "invalid", correlationId };

  const productTarget = input.targetKind === "product" && input.productId !== null && input.variantId === null;
  const variantTarget = input.targetKind === "variant" && input.variantId !== null && input.productId === null;
  if (!productTarget && !variantTarget) return { kind: "invalid", correlationId };

  const { data: branch, error: branchError } = await auth.client.from("branches")
    .select("id,organization_id,establishment_id,status")
    .eq("id", input.branchId)
    .maybeSingle();
  if (
    branchError || !branch || branch.status !== "active"
    || branch.organization_id !== input.organizationId
    || branch.establishment_id !== input.establishmentId
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
    p_sales_channel_id: input.channelId,
    p_target_kind: input.targetKind,
    p_product_id: productTarget ? input.productId : null,
    p_variant_id: variantTarget ? input.variantId : null,
    p_title_override: input.title,
    p_description_override: input.description,
    p_base_price: null,
    p_currency: "BRL",
    p_availability_state: "unknown",
    p_is_visible: false,
    p_status: "active",
    p_step_up_proof_id: null,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["catalog_save_offer"]["Args"];
  return saveOfferCommand(auth, args, correlationId);
}

async function updateOffer(
  auth: CatalogAuthContext,
  input: ParsedOfferForm,
  offerId: string,
  correlationId: string,
): Promise<CatalogActionState> {
  const { data: currentOffer, error: readError } = await auth.client.from("channel_offers")
    .select("id,organization_id,establishment_id,branch_id,sales_channel_id,target_kind,product_id,variant_id,base_price,currency,availability_state,is_visible,status")
    .eq("id", offerId)
    .maybeSingle();
  if (readError || !currentOffer) return { kind: "denied", correlationId };
  if (currentOffer.base_price !== null && input.price.numeric === null) return { kind: "invalid", correlationId };

  const currentPrice = currentOffer.base_price === null ? null : currentOffer.base_price.toFixed(2);
  const priceChanged = currentPrice !== input.price.text || currentOffer.currency !== "BRL";
  const availabilityChanged = currentOffer.availability_state !== input.availability
    || currentOffer.is_visible !== input.visible
    || (currentOffer.status === "archived" && input.status === "active" && input.visible);
  const requiredPermissions: CatalogPrivilegedPermission[] = [];
  if (priceChanged) requiredPermissions.push(CATALOG_PRIVILEGED_PERMISSIONS[0]);
  if (availabilityChanged) requiredPermissions.push(CATALOG_PRIVILEGED_PERMISSIONS[1]);

  const guard = requiredPermissions.length > 0
    ? await runCatalogAdminGuard({
      offerId: currentOffer.id,
      organizationId: currentOffer.organization_id,
      establishmentId: currentOffer.establishment_id,
      branchId: currentOffer.branch_id,
    }, requiredPermissions)
    : null;
  if (guard && !guard.decision.allowed) return mapGuardDecision(guard.decision.reason, guard.correlationId);
  if (guard && !guard.proofId) return { kind: "failed", correlationId: guard.correlationId };

  const commandCorrelationId = guard?.correlationId ?? correlationId;
  const args = {
    p_id: currentOffer.id,
    p_organization_id: currentOffer.organization_id,
    p_establishment_id: currentOffer.establishment_id,
    p_branch_id: currentOffer.branch_id,
    p_sales_channel_id: currentOffer.sales_channel_id,
    p_target_kind: currentOffer.target_kind,
    p_product_id: currentOffer.product_id,
    p_variant_id: currentOffer.variant_id,
    p_title_override: input.title,
    p_description_override: input.description,
    // Keep the validated exact decimal text through JSON transport to PostgreSQL numeric.
    p_base_price: input.price.numeric,
    p_currency: currentOffer.currency,
    p_availability_state: input.availability,
    p_is_visible: input.visible,
    p_status: input.status,
    p_step_up_proof_id: guard?.proofId ?? null,
    p_correlation_id: commandCorrelationId,
  } as unknown as Database["public"]["Functions"]["catalog_save_offer"]["Args"];
  return saveOfferCommand(auth, args, commandCorrelationId);
}

async function saveOfferCommand(
  auth: CatalogAuthContext,
  args: Database["public"]["Functions"]["catalog_save_offer"]["Args"],
  correlationId: string,
): Promise<CatalogActionState> {
  try {
    const { data, error } = await auth.client.rpc("catalog_save_offer", args);
    return finishCatalogCommand(error, correlationId, data);
  } catch {
    return { kind: "failed", correlationId };
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
