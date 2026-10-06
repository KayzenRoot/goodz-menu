// Deterministic, side-effect free validation for every catalog command.
//
// This module is the only place that decides whether a submitted form is admissible. It never
// performs authorization and never touches the database: authorization belongs to the RLS policy and
// to the server contract, and persistence belongs to the database. Keeping the two apart is what
// makes a rejection explainable and a test deterministic.

import { isPromotionalPriceAdmissible, parseMoney, type ParsedMoney } from "@/lib/catalog/money";

export type ValidationCode =
  | "required"
  | "invalid_identifier"
  | "invalid_text"
  | "invalid_number"
  | "invalid_money"
  | "invalid_currency"
  | "invalid_promotional_price"
  | "invalid_choice"
  | "impossible_commercial_state";

export type ValidationIssue = { field: string; code: ValidationCode };

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CHANNEL_KEY_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const INTEGER_PATTERN = /^-?[0-9]{1,9}$/;

type Collector = { issues: ValidationIssue[] };

function issue(collector: Collector, field: string, code: ValidationCode): void {
  collector.issues.push({ field, code });
}

function readString(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requiredIdentifier(
  collector: Collector,
  formData: FormData,
  field: string,
): string | undefined {
  const value = readString(formData, field);
  if (!value) {
    issue(collector, field, "required");
    return undefined;
  }
  if (!UUID_PATTERN.test(value)) {
    issue(collector, field, "invalid_identifier");
    return undefined;
  }
  return value;
}

function optionalIdentifier(
  collector: Collector,
  formData: FormData,
  field: string,
): string | null | undefined {
  const value = readString(formData, field);
  if (value === null) return null;
  if (!UUID_PATTERN.test(value)) {
    issue(collector, field, "invalid_identifier");
    return undefined;
  }
  return value;
}

function optionalText(
  collector: Collector,
  formData: FormData,
  field: string,
  maxLength: number,
): string | null | undefined {
  const value = readString(formData, field);
  if (value === null) return null;
  if (value.length > maxLength) {
    issue(collector, field, "invalid_text");
    return undefined;
  }
  return value;
}

function requiredText(
  collector: Collector,
  formData: FormData,
  field: string,
  maxLength: number,
): string | undefined {
  const value = readString(formData, field);
  if (!value) {
    issue(collector, field, "required");
    return undefined;
  }
  if (value.length > maxLength) {
    issue(collector, field, "invalid_text");
    return undefined;
  }
  return value;
}

function requiredInteger(collector: Collector, formData: FormData, field: string): number | undefined {
  const value = readString(formData, field);
  if (!value) {
    issue(collector, field, "required");
    return undefined;
  }
  if (!INTEGER_PATTERN.test(value)) {
    issue(collector, field, "invalid_number");
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    issue(collector, field, "invalid_number");
    return undefined;
  }
  return parsed;
}

function requiredEnum<T extends string>(
  collector: Collector,
  formData: FormData,
  field: string,
  allowed: readonly T[],
): T | undefined {
  const value = readString(formData, field);
  if (!value) {
    issue(collector, field, "required");
    return undefined;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    issue(collector, field, "invalid_choice");
    return undefined;
  }
  return value as T;
}

function optionalBoolean(formData: FormData, field: string): boolean {
  return formData.get(field) === "on" || formData.get(field) === "true";
}

function requiredMoney(collector: Collector, formData: FormData, field: string): ParsedMoney | undefined {
  const raw = readString(formData, field);
  if (!raw) {
    issue(collector, field, "required");
    return undefined;
  }
  const parsed = parseMoney(raw);
  if (!parsed.ok) {
    issue(collector, field, "invalid_money");
    return undefined;
  }
  return parsed.money;
}

function optionalMoney(
  collector: Collector,
  formData: FormData,
  field: string,
): ParsedMoney | null | undefined {
  const raw = readString(formData, field);
  if (raw === null) return null;
  const parsed = parseMoney(raw);
  if (!parsed.ok) {
    issue(collector, field, "invalid_money");
    return undefined;
  }
  return parsed.money;
}

function settled<T>(collector: Collector, build: () => T): ValidationResult<T> {
  if (collector.issues.length > 0) return { ok: false, issues: collector.issues };
  return { ok: true, value: build() };
}

function failed(collector: Collector): ValidationResult<never> {
  return { ok: false, issues: collector.issues };
}

export const CATALOG_AVAILABILITY_VALUES = ["available", "unavailable"] as const;
export const CATALOG_VISIBILITY_VALUES = ["visible", "hidden"] as const;

export type CatalogAvailability = (typeof CATALOG_AVAILABILITY_VALUES)[number];
export type CatalogVisibility = (typeof CATALOG_VISIBILITY_VALUES)[number];

export type CatalogScopeInput = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export type CatalogCommandEnvelope = {
  correlationId: string;
  idempotencyKey: string | null;
};

function readScope(collector: Collector, formData: FormData): CatalogScopeInput | undefined {
  const organizationId = requiredIdentifier(collector, formData, "organizationId");
  const establishmentId = optionalIdentifier(collector, formData, "establishmentId");
  const branchId = optionalIdentifier(collector, formData, "branchId");
  if (!organizationId || establishmentId === undefined || branchId === undefined) return undefined;
  if (branchId !== null && establishmentId === null) {
    issue(collector, "branchId", "invalid_identifier");
    return undefined;
  }
  return { organizationId, establishmentId, branchId };
}

// The correlation id is never read from the submitted form: it is resolved from the request headers
// by the server action, so a caller cannot choose which trail their command lands in.
function readEnvelope(collector: Collector, correlationId: string, formData: FormData): CatalogCommandEnvelope | undefined {
  if (!UUID_PATTERN.test(correlationId)) {
    issue(collector, "correlationId", "invalid_identifier");
    return undefined;
  }
  const idempotencyKey = optionalIdentifier(collector, formData, "idempotencyKey");
  if (idempotencyKey === undefined) return undefined;
  return { correlationId, idempotencyKey };
}

export type CreateCategoryCommand = CatalogScopeInput & CatalogCommandEnvelope & {
  parentCategoryId: string | null;
  name: string;
  description: string | null;
  displayOrder: number;
};

export function buildCreateCategoryCommand(formData: FormData, correlationId: string): ValidationResult<CreateCategoryCommand> {
  const collector: Collector = { issues: [] };
  const scope = readScope(collector, formData);
  const envelope = readEnvelope(collector, correlationId, formData);
  const parentCategoryId = optionalIdentifier(collector, formData, "parentCategoryId");
  const name = requiredText(collector, formData, "name", 120);
  const description = optionalText(collector, formData, "description", 1000);
  const displayOrder = requiredInteger(collector, formData, "displayOrder");
  if (!scope || !envelope || !name || description === undefined || displayOrder === undefined || parentCategoryId === undefined) {
    return failed(collector);
  }
  return settled(collector, () => ({ ...scope, ...envelope, parentCategoryId, name, description, displayOrder }));
}

export type UpdateCategoryCommand = CatalogCommandEnvelope & {
  categoryId: string;
  name: string;
  description: string | null;
  displayOrder: number;
};

export function buildUpdateCategoryCommand(formData: FormData, correlationId: string): ValidationResult<UpdateCategoryCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const categoryId = requiredIdentifier(collector, formData, "categoryId");
  const name = requiredText(collector, formData, "name", 120);
  const description = optionalText(collector, formData, "description", 1000);
  const displayOrder = requiredInteger(collector, formData, "displayOrder");
  if (!envelope || !categoryId || !name || description === undefined || displayOrder === undefined) return failed(collector);
  return settled(collector, () => ({ ...envelope, categoryId, name, description, displayOrder }));
}

export type ArchiveCategoryCommand = CatalogCommandEnvelope & { categoryId: string; archived: boolean };

export function buildArchiveCategoryCommand(formData: FormData, correlationId: string): ValidationResult<ArchiveCategoryCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const categoryId = requiredIdentifier(collector, formData, "categoryId");
  if (!envelope || !categoryId) return failed(collector);
  return settled(collector, () => ({ ...envelope, categoryId, archived: optionalBoolean(formData, "archived") }));
}

export type ArchiveProductCommand = CatalogCommandEnvelope & { productId: string; archived: boolean };

export function buildArchiveProductCommand(formData: FormData, correlationId: string): ValidationResult<ArchiveProductCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const productId = requiredIdentifier(collector, formData, "productId");
  if (!envelope || !productId) return failed(collector);
  return settled(collector, () => ({ ...envelope, productId, archived: optionalBoolean(formData, "archived") }));
}

export type CreateProductCommand = CatalogScopeInput & CatalogCommandEnvelope & {
  categoryId: string | null;
  name: string;
  description: string | null;
};

export function buildCreateProductCommand(formData: FormData, correlationId: string): ValidationResult<CreateProductCommand> {
  const collector: Collector = { issues: [] };
  const scope = readScope(collector, formData);
  const envelope = readEnvelope(collector, correlationId, formData);
  const categoryId = optionalIdentifier(collector, formData, "categoryId");
  const name = requiredText(collector, formData, "name", 120);
  const description = optionalText(collector, formData, "description", 1000);
  if (!scope || !envelope || !name || description === undefined || categoryId === undefined) return failed(collector);
  return settled(collector, () => ({ ...scope, ...envelope, categoryId, name, description }));
}

export type UpdateProductCommand = CatalogCommandEnvelope & {
  productId: string;
  name: string;
  description: string | null;
};

export function buildUpdateProductCommand(formData: FormData, correlationId: string): ValidationResult<UpdateProductCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const productId = requiredIdentifier(collector, formData, "productId");
  const name = requiredText(collector, formData, "name", 120);
  const description = optionalText(collector, formData, "description", 1000);
  if (!envelope || !productId || !name || description === undefined) return failed(collector);
  return settled(collector, () => ({ ...envelope, productId, name, description }));
}

export type CreateVariantCommand = CatalogScopeInput & CatalogCommandEnvelope & {
  productId: string;
  name: string;
};

export function buildCreateVariantCommand(formData: FormData, correlationId: string): ValidationResult<CreateVariantCommand> {
  const collector: Collector = { issues: [] };
  const scope = readScope(collector, formData);
  const envelope = readEnvelope(collector, correlationId, formData);
  const productId = requiredIdentifier(collector, formData, "productId");
  const name = requiredText(collector, formData, "name", 120);
  if (!scope || !envelope || !productId || !name) return failed(collector);
  return settled(collector, () => ({ ...scope, ...envelope, productId, name }));
}

export type UpdateVariantCommand = CatalogCommandEnvelope & {
  variantId: string;
  name: string;
  archived: boolean;
};

export function buildUpdateVariantCommand(formData: FormData, correlationId: string): ValidationResult<UpdateVariantCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const variantId = requiredIdentifier(collector, formData, "variantId");
  const name = requiredText(collector, formData, "name", 120);
  if (!envelope || !variantId || !name) return failed(collector);
  return settled(collector, () => ({
    ...envelope,
    variantId,
    name,
    archived: optionalBoolean(formData, "archived"),
  }));
}

export type CreateChannelCommand = CatalogCommandEnvelope & {
  organizationId: string;
  channelKey: string;
  displayName: string;
  description: string | null;
};

export function buildCreateChannelCommand(formData: FormData, correlationId: string): ValidationResult<CreateChannelCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const organizationId = requiredIdentifier(collector, formData, "organizationId");
  const channelKey = requiredText(collector, formData, "channelKey", 64);
  const displayName = requiredText(collector, formData, "displayName", 120);
  const description = optionalText(collector, formData, "description", 1000);
  if (!envelope || !organizationId || !channelKey || !displayName || description === undefined) return failed(collector);
  if (!CHANNEL_KEY_PATTERN.test(channelKey)) {
    issue(collector, "channelKey", "invalid_text");
    return failed(collector);
  }
  return settled(collector, () => ({ ...envelope, organizationId, channelKey, displayName, description }));
}

export type UpdateChannelCommand = CatalogCommandEnvelope & {
  channelId: string;
  displayName: string;
  description: string | null;
};

export function buildUpdateChannelCommand(formData: FormData, correlationId: string): ValidationResult<UpdateChannelCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const channelId = requiredIdentifier(collector, formData, "channelId");
  const displayName = requiredText(collector, formData, "displayName", 120);
  const description = optionalText(collector, formData, "description", 1000);
  if (!envelope || !channelId || !displayName || description === undefined) return failed(collector);
  return settled(collector, () => ({ ...envelope, channelId, displayName, description }));
}

export type CreateOfferCommand = CatalogScopeInput & CatalogCommandEnvelope & {
  salesChannelId: string;
  productId: string | null;
  productVariantId: string | null;
  title: string | null;
  description: string | null;
  basePrice: ParsedMoney;
  currency: string;
  promotionalPrice: ParsedMoney | null;
};

export function buildCreateOfferCommand(formData: FormData, correlationId: string): ValidationResult<CreateOfferCommand> {
  const collector: Collector = { issues: [] };
  const scope = readScope(collector, formData);
  const envelope = readEnvelope(collector, correlationId, formData);
  const salesChannelId = requiredIdentifier(collector, formData, "salesChannelId");
  const productId = optionalIdentifier(collector, formData, "productId");
  const productVariantId = optionalIdentifier(collector, formData, "productVariantId");
  const title = optionalText(collector, formData, "title", 120);
  const description = optionalText(collector, formData, "description", 1000);
  const currency = requiredText(collector, formData, "currency", 3);
  const basePrice = requiredMoney(collector, formData, "basePrice");
  const promotionalPrice = optionalMoney(collector, formData, "promotionalPrice");
  if (
    !scope || !envelope || !salesChannelId || title === undefined || description === undefined || !currency || !basePrice
    || promotionalPrice === undefined || productId === undefined || productVariantId === undefined
  ) {
    return failed(collector);
  }
  if ((productId === null) === (productVariantId === null)) {
    issue(collector, productId === null ? "productVariantId" : "productId", "invalid_choice");
    return failed(collector);
  }
  if (!CURRENCY_PATTERN.test(currency)) {
    issue(collector, "currency", "invalid_currency");
    return failed(collector);
  }
  if (promotionalPrice !== null && promotionalPrice.scaled < BigInt(0)) {
    issue(collector, "promotionalPrice", "invalid_money");
    return failed(collector);
  }
  if (!isPromotionalPriceAdmissible(basePrice, promotionalPrice)) {
    issue(collector, "promotionalPrice", "invalid_promotional_price");
    return failed(collector);
  }
  return settled(collector, () => ({
    ...scope,
    ...envelope,
    salesChannelId,
    productId,
    productVariantId,
    title,
    description,
    basePrice,
    currency,
    promotionalPrice,
  }));
}

export type OfferPresentationCommand = CatalogCommandEnvelope & {
  offerId: string;
  title: string | null;
  description: string | null;
};

export function buildOfferPresentationCommand(formData: FormData, correlationId: string): ValidationResult<OfferPresentationCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const offerId = requiredIdentifier(collector, formData, "offerId");
  const title = optionalText(collector, formData, "title", 120);
  const description = optionalText(collector, formData, "description", 1000);
  if (!envelope || !offerId || title === undefined || description === undefined) return failed(collector);
  return settled(collector, () => ({ ...envelope, offerId, title, description }));
}

export type OfferPriceCommand = CatalogCommandEnvelope & {
  offerId: string;
  basePrice: ParsedMoney;
  promotionalPrice: ParsedMoney | null;
};

export function buildOfferPriceCommand(formData: FormData, correlationId: string): ValidationResult<OfferPriceCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const offerId = requiredIdentifier(collector, formData, "offerId");
  const basePrice = requiredMoney(collector, formData, "basePrice");
  const promotionalPrice = optionalMoney(collector, formData, "promotionalPrice");
  if (!envelope || !offerId || !basePrice || promotionalPrice === undefined) return failed(collector);
  if (basePrice.scaled < BigInt(0)) {
    issue(collector, "basePrice", "invalid_money");
    return failed(collector);
  }
  if (!isPromotionalPriceAdmissible(basePrice, promotionalPrice)) {
    issue(collector, "promotionalPrice", "invalid_promotional_price");
    return failed(collector);
  }
  return settled(collector, () => ({ ...envelope, offerId, basePrice, promotionalPrice }));
}

export type OfferAvailabilityCommand = CatalogCommandEnvelope & {
  offerId: string;
  availability: CatalogAvailability;
};

export function buildOfferAvailabilityCommand(formData: FormData, correlationId: string): ValidationResult<OfferAvailabilityCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const offerId = requiredIdentifier(collector, formData, "offerId");
  const availability = requiredEnum(collector, formData, "availability", CATALOG_AVAILABILITY_VALUES);
  if (!envelope || !offerId || !availability) return failed(collector);
  return settled(collector, () => ({ ...envelope, offerId, availability }));
}

export type OfferVisibilityCommand = CatalogCommandEnvelope & {
  offerId: string;
  visibility: CatalogVisibility;
};

export function buildOfferVisibilityCommand(formData: FormData, correlationId: string): ValidationResult<OfferVisibilityCommand> {
  const collector: Collector = { issues: [] };
  const envelope = readEnvelope(collector, correlationId, formData);
  const offerId = requiredIdentifier(collector, formData, "offerId");
  const visibility = requiredEnum(collector, formData, "visibility", CATALOG_VISIBILITY_VALUES);
  if (!envelope || !offerId || !visibility) return failed(collector);
  return settled(collector, () => ({ ...envelope, offerId, visibility }));
}

export const SAFE_VALIDATION_MESSAGES: Record<ValidationCode, string> = {
  required: "Preencha este campo.",
  invalid_identifier: "Valor inválido.",
  invalid_text: "Texto inválido ou longo demais.",
  invalid_number: "Número inválido.",
  invalid_money: "Informe um valor decimal positivo com até 4 casas.",
  invalid_currency: "Use um código de moeda de três letras em maiúsculas.",
  invalid_promotional_price: "O preço promocional deve ser menor que o preço base.",
  invalid_choice: "Seleção inválida.",
  impossible_commercial_state: "Estado comercial inválido.",
};

/** Maps a validation issue onto a message that never echoes the rejected input back to the browser. */
export function describeValidationIssues(issues: readonly ValidationIssue[]): string {
  const codes = [...new Set(issues.map(({ code }) => code))];
  return codes.map((code) => SAFE_VALIDATION_MESSAGES[code]).join(" ");
}