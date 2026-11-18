"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  MEDIA_MIME_TYPES,
  MEDIA_PROVIDER_KEYS,
  normalizeStorefrontSlug,
  STOREFRONT_ACCENT_PRESETS,
  STOREFRONT_CARD_STYLES,
  STOREFRONT_LAYOUT_FAMILIES,
  validateHttpsMediaUrl,
} from "@/lib/storefront/storefront-domain";
import { isUuid } from "@/lib/supabase/step-up-guard-event-base";
import { runStorefrontAdminGuard } from "@/lib/supabase/storefront-admin-guard.server";
import { parseEnumEntry, parseTextEntry, parseUuidEntry } from "@/lib/supabase/catalog-input-policy";

export type StorefrontAdminActionState =
  | null
  | {
      kind: "saved";
      correlationId: string;
      publicSlug?: string;
      version?: number;
      auditEventIds: string[];
    }
  | { kind: "invalid"; correlationId: string }
  | { kind: "denied"; correlationId: string }
  | { kind: "duplicate_slug"; correlationId: string }
  | { kind: "failed"; correlationId: string }
  | { kind: "step_up_required"; correlationId: string }
  | { kind: "reauthentication_required"; correlationId: string }
  | { kind: "factor_setup_required"; correlationId: string };

type RpcErr = Readonly<{ code?: string; message?: string }>;

export async function saveStorefrontProfileAction(
  _prev: StorefrontAdminActionState,
  formData: FormData,
): Promise<StorefrontAdminActionState> {
  const initialCorrelation = await getCorrelation();
  const parsed = parseProfileForm(formData);
  if (!parsed) return { kind: "invalid", correlationId: initialCorrelation };

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId: initialCorrelation };

  let proofId: string | null = null;
  let correlationId = initialCorrelation;
  try {
    const guard = await runStorefrontAdminGuard({
      organizationId: parsed.organizationId,
      establishmentId: parsed.establishmentId,
      branchId: parsed.branchId,
    });
    correlationId = guard.correlationId;
    if (!guard.decision.allowed) {
      return mapStorefrontGuardReason(guard.decision.reason, correlationId);
    }
    if (!guard.proofId) return { kind: "failed", correlationId };
    proofId = guard.proofId;
  } catch {
    return { kind: "failed", correlationId };
  }

  const args = {
    p_organization_id: parsed.organizationId,
    p_establishment_id: parsed.establishmentId,
    p_branch_id: parsed.branchId,
    p_public_slug: parsed.publicSlug,
    p_headline: parsed.headline,
    p_subheadline: parsed.subheadline,
    p_layout_family: parsed.layoutFamily,
    p_accent_preset: parsed.accentPreset,
    p_card_style: parsed.cardStyle,
    p_hero_media_asset_id: parsed.heroMediaAssetId,
    p_is_published: parsed.isPublished,
    p_step_up_proof_id: proofId,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["storefront_save_profile"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("storefront_save_profile", args);
    return finalizeAdminReceipt(error, correlationId, data, "profile_id");
  } catch {
    return { kind: "failed", correlationId };
  }
}

export async function registerProductMediaAction(
  _prev: StorefrontAdminActionState,
  formData: FormData,
): Promise<StorefrontAdminActionState> {
  const correlationId = await getCorrelation();
  const parsed = parseMediaForm(formData);
  if (!parsed) return { kind: "invalid", correlationId };

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  const args = {
    p_organization_id: parsed.organizationId,
    p_establishment_id: parsed.establishmentId,
    p_branch_id: parsed.branchId,
    p_product_id: parsed.productId,
    p_provider_key: parsed.providerKey,
    p_storage_key: parsed.storageKey,
    p_canonical_url: parsed.canonicalUrl,
    p_mime_type: parsed.mimeType,
    p_alt_text: parsed.altText,
    p_width_px: parsed.widthPx,
    p_height_px: parsed.heightPx,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["catalog_register_product_media"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("catalog_register_product_media", args);
    return finalizeAdminReceipt(error, correlationId, data, "media_asset_id");
  } catch {
    return { kind: "failed", correlationId };
  }
}

function parseProfileForm(formData: FormData) {
  const orgId = parseUuidEntry(formData.get("organizationId"), true);
  const estId = parseUuidEntry(formData.get("establishmentId"), true);
  const branchId = parseUuidEntry(formData.get("branchId"), true);
  const rawSlug = formData.get("publicSlug");
  const headline = parseTextEntry(formData.get("headline"), 140, true);
  const subheadline = parseTextEntry(formData.get("subheadline"), 280, false);
  const layout = parseEnumEntry(formData.get("layoutFamily"), STOREFRONT_LAYOUT_FAMILIES);
  const accent = parseEnumEntry(formData.get("accentPreset"), STOREFRONT_ACCENT_PRESETS);
  const card = parseEnumEntry(formData.get("cardStyle"), STOREFRONT_CARD_STYLES);
  const heroMedia = parseUuidEntry(formData.get("heroMediaAssetId"), false);
  const isPublished = formData.get("isPublished") === "true";

  const publicSlug = typeof rawSlug === "string" ? normalizeStorefrontSlug(rawSlug) : null;
  if (
    !orgId.ok || !orgId.value || !estId.ok || !estId.value || !branchId.ok || !branchId.value
    || !publicSlug || !headline.ok || !headline.value || headline.value.length < 3
    || !subheadline.ok || !layout.ok || !accent.ok || !card.ok || !heroMedia.ok
  ) {
    return null;
  }

  return {
    organizationId: orgId.value,
    establishmentId: estId.value,
    branchId: branchId.value,
    publicSlug,
    headline: headline.value,
    subheadline: subheadline.value ?? "",
    layoutFamily: layout.value,
    accentPreset: accent.value,
    cardStyle: card.value,
    heroMediaAssetId: heroMedia.value,
    isPublished,
  };
}

function parseMediaForm(formData: FormData) {
  const orgId = parseUuidEntry(formData.get("organizationId"), true);
  const estId = parseUuidEntry(formData.get("establishmentId"), true);
  const branchId = parseUuidEntry(formData.get("branchId"), true);
  const productId = parseUuidEntry(formData.get("productId"), false);
  const provider = parseEnumEntry(formData.get("providerKey"), MEDIA_PROVIDER_KEYS);
  const storageKey = parseTextEntry(formData.get("storageKey"), 512, true);
  const rawUrl = formData.get("canonicalUrl");
  const mime = parseEnumEntry(formData.get("mimeType"), MEDIA_MIME_TYPES);
  const altText = parseTextEntry(formData.get("altText"), 180, true);
  const rawWidth = formData.get("widthPx");
  const rawHeight = formData.get("heightPx");

  const canonicalUrl = typeof rawUrl === "string" ? validateHttpsMediaUrl(rawUrl) : null;
  if (
    !orgId.ok || !orgId.value || !estId.ok || !estId.value || !branchId.ok || !branchId.value
    || !productId.ok || !provider.ok || !storageKey.ok || !storageKey.value
    || !canonicalUrl || !mime.ok || !altText.ok || !altText.value
    || typeof rawWidth !== "string" || !/^\d{2,4}$/.test(rawWidth.trim())
    || typeof rawHeight !== "string" || !/^\d{2,4}$/.test(rawHeight.trim())
  ) {
    return null;
  }

  const widthPx = Number.parseInt(rawWidth.trim(), 10);
  const heightPx = Number.parseInt(rawHeight.trim(), 10);
  if (widthPx < 64 || widthPx > 4096 || heightPx < 64 || heightPx > 4096) return null;

  return {
    organizationId: orgId.value,
    establishmentId: estId.value,
    branchId: branchId.value,
    productId: productId.value,
    providerKey: provider.value,
    storageKey: storageKey.value,
    canonicalUrl,
    mimeType: mime.value,
    altText: altText.value,
    widthPx,
    heightPx,
  };
}

function mapStorefrontGuardReason(
  reason: AdminGuardReason,
  correlationId: string,
): StorefrontAdminActionState {
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

function finalizeAdminReceipt(
  error: RpcErr | null,
  correlationId: string,
  data: Json | null,
  idKey: "profile_id" | "media_asset_id",
): StorefrontAdminActionState {
  if (error) {
    if (error.code === "23505") return { kind: "duplicate_slug", correlationId };
    if (error.code === "42501") return { kind: "denied", correlationId };
    if (error.code === "22023" || error.code === "23514") return { kind: "invalid", correlationId };
    return { kind: "failed", correlationId };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { kind: "failed", correlationId };
  }
  const entityId = data[idKey];
  const auditIds = data.audit_event_ids;
  if (!isUuid(entityId) || !Array.isArray(auditIds) || auditIds.some((id) => !isUuid(id))) {
    return { kind: "failed", correlationId };
  }
  const publicSlug = typeof data.public_slug === "string" ? data.public_slug : undefined;
  revalidatePath("/app/storefront");
  if (publicSlug) revalidatePath(`/menu/${publicSlug}`);
  return {
    kind: "saved",
    correlationId,
    publicSlug,
    version: typeof data.version === "number" ? data.version : undefined,
    auditEventIds: auditIds as string[],
  };
}

async function getCorrelation(): Promise<string> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id");
  return requestCorrelationId(new Request("http://localhost", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
  }));
}
