import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import type { Database } from "@/lib/supabase/database.types";
import {
  authorizePrivilegedCatalogCommand,
  createStepUpClient,
  type CatalogStepUpReason,
} from "@/lib/catalog/catalog-privileged.server";
import type {
  ArchiveCategoryCommand,
  ArchiveProductCommand,
  CreateCategoryCommand,
  CreateChannelCommand,
  CreateOfferCommand,
  CreateProductCommand,
  CreateVariantCommand,
  OfferAvailabilityCommand,
  OfferPresentationCommand,
  OfferPriceCommand,
  OfferVisibilityCommand,
  UpdateCategoryCommand,
  UpdateChannelCommand,
  UpdateProductCommand,
  UpdateVariantCommand,
} from "@/lib/catalog/validation";

// Server application contracts for every catalog mutation.
//
// A command is only ever issued with the current user's own authority. No service-role credential is
// used for catalog authorization, catalog business mutation or tenant bypass, which is why the
// contracts are SECURITY DEFINER functions that resolve the actor from the caller's session rather
// than privileged Data API tables.

export type CatalogCommandFailureCode =
  | "unauthenticated"
  | "unauthorized"
  | "invalid_input"
  | "privileged_confirmation_required"
  | "conflict"
  | "unavailable";

export type CatalogCommandOutcome =
  | {
      ok: true;
      action: string;
      targetId: string;
      auditEventId: string | null;
      priceRevision: number | null;
      replayed: boolean;
    }
  | { ok: false; code: CatalogCommandFailureCode; message: string };

const SAFE_MESSAGES: Record<CatalogCommandFailureCode, string> = {
  unauthenticated: "Sessão expirada. Entre novamente para continuar.",
  unauthorized: "Você não tem permissão para alterar este item do catálogo.",
  invalid_input: "Revise os dados informados e tente novamente.",
  privileged_confirmation_required: "Confirme a identidade novamente para alterar preço ou disponibilidade.",
  conflict: "Este cadastro já existe ou entra em conflito com outro item.",
  unavailable: "Não foi possível concluir a alteração agora. Tente novamente.",
};

const STEP_UP_MESSAGES: Record<CatalogStepUpReason, CatalogCommandFailureCode> = {
  unauthenticated: "unauthenticated",
  identity_unverified: "unauthenticated",
  aal2_required: "privileged_confirmation_required",
  factor_unverified: "privileged_confirmation_required",
  step_up_required: "privileged_confirmation_required",
  reauthentication_required: "privileged_confirmation_required",
};

const UNAUTHORIZED = "42501";
const UNIQUE_VIOLATION = "23505";
const INVALID_PARAMETER_VALUE = "22023";
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";

type RpcName =
  | "catalog_create_category"
  | "catalog_update_category"
  | "catalog_set_category_archived"
  | "catalog_create_product"
  | "catalog_update_product"
  | "catalog_set_product_archived"
  | "catalog_create_variant"
  | "catalog_update_variant"
  | "catalog_create_sales_channel"
  | "catalog_update_sales_channel"
  | "catalog_create_channel_offer"
  | "catalog_update_channel_offer_presentation"
  | "catalog_update_channel_offer_price"
  | "catalog_update_channel_offer_availability"
  | "catalog_update_channel_offer_visibility";

function failure(code: CatalogCommandFailureCode): CatalogCommandOutcome {
  return { ok: false, code, message: SAFE_MESSAGES[code] };
}

function mapDatabaseError(error: unknown): CatalogCommandOutcome {
  const raw = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
  // Only a string carries meaning here. Stringifying anything else would produce
  // "[object Object]", which matches no SQLSTATE below and would silently report "unavailable".
  const code = typeof raw === "string" ? raw : "";
  if (code === UNAUTHORIZED) return failure("unauthorized");
  if (code === UNIQUE_VIOLATION) return failure("conflict");
  if (code === INVALID_PARAMETER_VALUE || code === CHECK_VIOLATION || code === FOREIGN_KEY_VIOLATION) {
    return failure("invalid_input");
  }
  return failure("unavailable");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCommandResult(data: unknown): CatalogCommandOutcome | null {
  if (!isRecord(data)) return null;
  const { action, target_id: targetId, audit_event_id: auditEventId, price_revision: priceRevision, replayed } = data;
  if (typeof action !== "string" || typeof targetId !== "string") return null;
  if (auditEventId !== null && typeof auditEventId !== "string") return null;
  if (priceRevision !== null && !Number.isSafeInteger(priceRevision)) return null;
  return {
    ok: true,
    action,
    targetId,
    auditEventId,
    priceRevision: priceRevision === null ? null : Number(priceRevision),
    replayed: replayed === true,
  };
}

/**
 * Argument types for each contract, declared from the contracts themselves.
 *
 * The generated Data API types describe every catalog argument as a plain `string`, because the
 * generator drops the nullability of parameters a function is willing to receive NULL for. Typing
 * the calls from that output would either reject the admitted NULLs or, if widened, stop checking
 * anything at all. `CONTRACT_ARGUMENTS` is therefore declared here and held to the database by a
 * compile-time check that every contract in `RpcName` has exactly one entry.
 */
type ContractArguments = {
  catalog_create_category: {
    p_organization_id: string;
    p_establishment_id: string | null;
    p_branch_id: string | null;
    p_parent_category_id: string | null;
    p_name: string;
    p_description: string | null;
    p_display_order: number;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_category: {
    p_category_id: string;
    p_name: string;
    p_description: string | null;
    p_display_order: number;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_set_category_archived: {
    p_category_id: string;
    p_archived: boolean;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_create_product: {
    p_organization_id: string;
    p_establishment_id: string | null;
    p_branch_id: string | null;
    p_category_id: string | null;
    p_name: string;
    p_description: string | null;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_product: {
    p_product_id: string;
    p_name: string;
    p_description: string | null;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_set_product_archived: {
    p_product_id: string;
    p_archived: boolean;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_create_variant: {
    p_organization_id: string;
    p_establishment_id: string | null;
    p_branch_id: string | null;
    p_product_id: string;
    p_name: string;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_variant: {
    p_variant_id: string;
    p_name: string;
    p_archived: boolean;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_create_sales_channel: {
    p_organization_id: string;
    p_channel_key: string;
    p_display_name: string;
    p_description: string | null;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_sales_channel: {
    p_channel_id: string;
    p_display_name: string;
    p_description: string | null;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_create_channel_offer: {
    p_organization_id: string;
    p_establishment_id: string | null;
    p_branch_id: string | null;
    p_sales_channel_id: string;
    p_product_id: string | null;
    p_product_variant_id: string | null;
    p_title: string | null;
    p_description: string | null;
    p_base_price_amount: number;
    p_base_price_currency: string;
    p_promotional_price_amount: number | null;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_channel_offer_presentation: {
    p_offer_id: string;
    p_title: string | null;
    p_description: string | null;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_channel_offer_price: {
    p_offer_id: string;
    p_base_price_amount: number;
    p_promotional_price_amount: number | null;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_channel_offer_availability: {
    p_offer_id: string;
    p_availability: string;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
  catalog_update_channel_offer_visibility: {
    p_offer_id: string;
    p_visibility: string;
    p_correlation_id: string;
    p_idempotency_key: string | null;
  };
};

// Compiles only while every contract is described above and none of the descriptions is unused.
// It is exported rather than asserted with a bare expression so the check survives a compiler that
// would otherwise treat an unused binding as removable.
type UndescribedContract = Exclude<RpcName, keyof ContractArguments>;
type UnreachableContract = Exclude<keyof ContractArguments, RpcName>;
export const catalogContractsAreFullyDescribed: [UndescribedContract, UnreachableContract] extends [never, never]
  ? true
  : never = true;

/**
 * The generated types describe a Postgres numeric as a JavaScript number because the Data API
 * serialises one as a JSON number. Sending an admitted price that way would round it through an
 * IEEE-754 double, so exact money crosses this boundary as a decimal string and is converted here,
 * at the single point where the generated type and the persisted representation disagree.
 */
function exactNumeric(decimal: string): number {
  return decimal as unknown as number;
}

async function invoke<Contract extends RpcName>(
  client: SupabaseClient<Database> | ServerSupabaseClient,
  contract: Contract,
  args: ContractArguments[Contract],
): Promise<CatalogCommandOutcome> {
  try {
    const { data, error } = await client.rpc(contract, args as never);
    if (error) return mapDatabaseError(error);
    const parsed = readCommandResult(data as unknown);
    return parsed ?? failure("unavailable");
  } catch {
    return failure("unavailable");
  }
}

async function invokeStructural<Contract extends RpcName>(
  contract: Contract,
  args: ContractArguments[Contract],
): Promise<CatalogCommandOutcome> {
  const auth = await getCurrentAuthContext();
  if (!auth) return failure("unauthenticated");
  return invoke(auth.client, contract, args);
}

/**
 * Privileged contracts additionally require a fresh two-step proof and a fresh password
 * reauthentication. When they are missing the command is refused before it reaches the database,
 * and the caller is told to confirm their identity again instead of being shown a raw error.
 */
async function invokePrivileged<Contract extends RpcName>(
  contract: Contract,
  args: ContractArguments[Contract],
): Promise<CatalogCommandOutcome> {
  const auth = await getCurrentAuthContext();
  if (!auth) return failure("unauthenticated");

  const decision = await authorizePrivilegedCatalogCommand(auth.client);
  if (!decision.allowed) return failure(STEP_UP_MESSAGES[decision.reason]);

  const stepUpClient = createStepUpClient(decision.accessToken);
  if (!stepUpClient) return failure("unavailable");

  return invoke(stepUpClient, contract, args);
}

export async function createCategory(command: CreateCategoryCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_create_category", {
    p_organization_id: command.organizationId,
    p_establishment_id: command.establishmentId,
    p_branch_id: command.branchId,
    p_parent_category_id: command.parentCategoryId,
    p_name: command.name,
    p_description: command.description,
    p_display_order: command.displayOrder,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateCategory(command: UpdateCategoryCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_update_category", {
    p_category_id: command.categoryId,
    p_name: command.name,
    p_description: command.description,
    p_display_order: command.displayOrder,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function setCategoryArchived(command: ArchiveCategoryCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_set_category_archived", {
    p_category_id: command.categoryId,
    p_archived: command.archived,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function createProduct(command: CreateProductCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_create_product", {
    p_organization_id: command.organizationId,
    p_establishment_id: command.establishmentId,
    p_branch_id: command.branchId,
    p_category_id: command.categoryId,
    p_name: command.name,
    p_description: command.description,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateProduct(command: UpdateProductCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_update_product", {
    p_product_id: command.productId,
    p_name: command.name,
    p_description: command.description,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function setProductArchived(command: ArchiveProductCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_set_product_archived", {
    p_product_id: command.productId,
    p_archived: command.archived,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function createVariant(command: CreateVariantCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_create_variant", {
    p_organization_id: command.organizationId,
    p_establishment_id: command.establishmentId,
    p_branch_id: command.branchId,
    p_product_id: command.productId,
    p_name: command.name,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateVariant(command: UpdateVariantCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_update_variant", {
    p_variant_id: command.variantId,
    p_name: command.name,
    p_archived: command.archived,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function createSalesChannel(command: CreateChannelCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_create_sales_channel", {
    p_organization_id: command.organizationId,
    p_channel_key: command.channelKey,
    p_display_name: command.displayName,
    p_description: command.description,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateSalesChannel(command: UpdateChannelCommand): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_update_sales_channel", {
    p_channel_id: command.channelId,
    p_display_name: command.displayName,
    p_description: command.description,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function createChannelOffer(command: CreateOfferCommand): Promise<CatalogCommandOutcome> {
  return invokePrivileged("catalog_create_channel_offer", {
    p_organization_id: command.organizationId,
    p_establishment_id: command.establishmentId,
    p_branch_id: command.branchId,
    p_sales_channel_id: command.salesChannelId,
    p_product_id: command.productId,
    p_product_variant_id: command.productVariantId,
    p_title: command.title,
    p_description: command.description,
    p_base_price_amount: exactNumeric(command.basePrice.decimal),
    p_base_price_currency: command.currency,
    p_promotional_price_amount: command.promotionalPrice === null
      ? null
      : exactNumeric(command.promotionalPrice.decimal),
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateChannelOfferPresentation(
  command: OfferPresentationCommand,
): Promise<CatalogCommandOutcome> {
  return invokeStructural("catalog_update_channel_offer_presentation", {
    p_offer_id: command.offerId,
    p_title: command.title,
    p_description: command.description,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateChannelOfferPrice(command: OfferPriceCommand): Promise<CatalogCommandOutcome> {
  return invokePrivileged("catalog_update_channel_offer_price", {
    p_offer_id: command.offerId,
    p_base_price_amount: exactNumeric(command.basePrice.decimal),
    p_promotional_price_amount: command.promotionalPrice === null
      ? null
      : exactNumeric(command.promotionalPrice.decimal),
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateChannelOfferAvailability(
  command: OfferAvailabilityCommand,
): Promise<CatalogCommandOutcome> {
  return invokePrivileged("catalog_update_channel_offer_availability", {
    p_offer_id: command.offerId,
    p_availability: command.availability,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export async function updateChannelOfferVisibility(
  command: OfferVisibilityCommand,
): Promise<CatalogCommandOutcome> {
  return invokePrivileged("catalog_update_channel_offer_visibility", {
    p_offer_id: command.offerId,
    p_visibility: command.visibility,
    p_correlation_id: command.correlationId,
    p_idempotency_key: command.idempotencyKey,
  });
}

export { describeValidationIssues, SAFE_VALIDATION_MESSAGES } from "@/lib/catalog/validation";