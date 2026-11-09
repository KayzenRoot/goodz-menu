"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { confirmPrivilegedIdentity } from "@/lib/supabase/privileged-identity.server";
import {
  buildArchiveCategoryCommand,
  buildArchiveProductCommand,
  buildCreateCategoryCommand,
  buildCreateChannelCommand,
  buildCreateOfferCommand,
  buildCreateProductCommand,
  buildCreateVariantCommand,
  buildOfferAvailabilityCommand,
  buildOfferPriceCommand,
  buildOfferPresentationCommand,
  buildOfferVisibilityCommand,
  buildUpdateCategoryCommand,
  buildUpdateChannelCommand,
  buildUpdateProductCommand,
  buildUpdateVariantCommand,
  describeValidationIssues,
  type ValidationIssue,
} from "@/lib/catalog/validation";
import {
  createCategory,
  createChannelOffer,
  createProduct,
  createSalesChannel,
  createVariant,
  setCategoryArchived,
  setProductArchived,
  updateCategory,
  updateChannelOfferAvailability,
  updateChannelOfferPrice,
  updateChannelOfferPresentation,
  updateChannelOfferVisibility,
  updateProduct,
  updateSalesChannel,
  updateVariant,
  type CatalogCommandFailureCode,
  type CatalogCommandOutcome,
} from "@/lib/catalog/catalog-commands.server";

// Server actions for every catalog mutation.
//
// A submitted form reaches the database through exactly one path: validate, then invoke the matching
// server contract with the caller's own session. Nothing here accepts an actor or a correlation id
// from the browser: the scope is read from the form, the actor is the current session and the
// correlation id is resolved from the request headers, so a caller cannot choose which audit trail
// their command lands in.

export type CatalogActionResult =
  | { kind: "ok"; message: string; targetId: string | null }
  | { kind: "invalid"; message: string; issues: ValidationIssue[] }
  | { kind: "failed"; message: string; code: CatalogCommandFailureCode };

export type CatalogActionState = CatalogActionResult | null;

/** The one route every catalog command is read back through. */
const CATALOG_PATH = "/app/catalog";

const SUCCESS_MESSAGES: Record<string, string> = {
  "catalog.category.created": "Categoria criada.",
  "catalog.category.updated": "Categoria atualizada.",
  "catalog.category.archived": "Categoria arquivada.",
  "catalog.category.reactivated": "Categoria reativada.",
  "catalog.product.created": "Produto criado.",
  "catalog.product.updated": "Produto atualizado.",
  "catalog.product.archived": "Produto arquivado.",
  "catalog.product.reactivated": "Produto reativado.",
  "catalog.variant.created": "Variante criada.",
  "catalog.variant.updated": "Variante atualizada.",
  "catalog.sales_channel.created": "Canal criado.",
  "catalog.sales_channel.updated": "Canal atualizado.",
  "catalog.channel_offer.created": "Oferta criada.",
  "catalog.channel_offer.updated": "Oferta atualizada.",
  "catalog.channel_offer.price_changed": "Preço atualizado.",
  "catalog.channel_offer.promotional_price_changed": "Preço promocional atualizado.",
  "catalog.channel_offer.availability_changed": "Disponibilidade atualizada.",
  "catalog.channel_offer.visibility_changed": "Visibilidade atualizada.",
};

async function requestCorrelation(): Promise<string> {
  const requestHeaders = await headers();
  const incoming = requestHeaders.get("x-request-id");
  return requestCorrelationId(new Request("http://localhost", {
    headers: incoming ? { "x-request-id": incoming } : undefined,
  }));
}

function toActionResult(outcome: CatalogCommandOutcome): CatalogActionResult {
  if (outcome.ok) {
    return {
      kind: "ok",
      message: SUCCESS_MESSAGES[outcome.action] ?? "Alteração registrada.",
      targetId: outcome.targetId,
    };
  }
  return { kind: "failed", message: outcome.message, code: outcome.code };
}

type Builder<T> = (formData: FormData, correlationId: string) =>
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Runs one validated command. The builder decides admissibility; the contract decides authority. A
 * rejected form never reaches the database, and a database refusal never reaches the operator as raw
 * database text.
 *
 * A command that landed revalidates the console before the form reports back, so the list the
 * operator reads is the one the database now holds. Without it the console keeps rendering the
 * server-rendered state from before the write and the success message describes a row that is not on
 * screen.
 */
async function dispatch<T>(
  builder: Builder<T>,
  formData: FormData,
  invoke: (command: T) => Promise<CatalogCommandOutcome>,
): Promise<CatalogActionResult> {
  const validated = builder(formData, await requestCorrelation());
  if (!validated.ok) {
    return { kind: "invalid", message: describeValidationIssues(validated.issues), issues: validated.issues };
  }
  const outcome = await invoke(validated.value);
  if (outcome.ok) revalidatePath(CATALOG_PATH);
  return toActionResult(outcome);
}

export async function createCategoryAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildCreateCategoryCommand, formData, createCategory);
}

export async function updateCategoryAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildUpdateCategoryCommand, formData, updateCategory);
}

export async function archiveCategoryAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildArchiveCategoryCommand, formData, setCategoryArchived);
}

export async function createProductAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildCreateProductCommand, formData, createProduct);
}

export async function updateProductAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildUpdateProductCommand, formData, updateProduct);
}

export async function archiveProductAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildArchiveProductCommand, formData, setProductArchived);
}

export async function createVariantAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildCreateVariantCommand, formData, createVariant);
}

export async function updateVariantAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildUpdateVariantCommand, formData, updateVariant);
}

export async function createChannelAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildCreateChannelCommand, formData, createSalesChannel);
}

export async function updateChannelAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildUpdateChannelCommand, formData, updateSalesChannel);
}

export async function createOfferAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildCreateOfferCommand, formData, createChannelOffer);
}

export async function updateOfferPresentationAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildOfferPresentationCommand, formData, updateChannelOfferPresentation);
}

export async function updateOfferPriceAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildOfferPriceCommand, formData, updateChannelOfferPrice);
}

export async function updateOfferAvailabilityAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildOfferAvailabilityCommand, formData, updateChannelOfferAvailability);
}

export async function updateOfferVisibilityAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  return dispatch(buildOfferVisibilityCommand, formData, updateChannelOfferVisibility);
}

/**
 * Confirms the caller's identity for the privileged commercial commands that follow.
 *
 * The password and the authenticator code are verified together, in one place, because the database
 * will only accept a bearer that carries both inside the same token. Anything less either proves the
 * password without the second factor or the second factor without a recent password, and the command
 * that follows would be refused no matter what the operator typed.
 */
export async function confirmPrivilegedIdentityAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const outcome = await confirmPrivilegedIdentity(formData.get("reauth-password"), formData.get("totp-code"));
  if (!outcome.ok) return { kind: "failed", message: outcome.message, code: "privileged_confirmation_required" };
  revalidatePath(CATALOG_PATH);
  return { kind: "ok", message: "Identidade confirmada nesta sessão.", targetId: null };
}