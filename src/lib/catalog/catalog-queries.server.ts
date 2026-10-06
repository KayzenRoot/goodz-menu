import "server-only";

import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { loadAllPages } from "@/lib/supabase/query-pagination";
import type {
  CatalogAdmittedScope,
  CatalogCategoryView,
  CatalogChannelView,
  CatalogOfferView,
  CatalogOverview,
  CatalogProductView,
  CatalogTimelineEntry,
  CatalogVariantView,
} from "@/lib/catalog/catalog-types";

export type * from "@/lib/catalog/catalog-types";

// Read contracts for the catalog.
//
// Every read is an ordinary Data API query issued with the current user's own session, so row level
// security is the only thing standing between two tenants. The application never filters by tenant
// itself: what this module receives is exactly what the catalog policy admits, and a row that is not
// returned was never selected in the first place.
//
// Projections fail closed. A row that does not match the admitted shape is treated as a load failure
// rather than being coerced into a view with invented defaults, because a silently reshaped price is
// indistinguishable from a correct one once it reaches the interface.

const EMPTY_OVERVIEW: CatalogOverview = { ok: false };

function requiredText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function requiredInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function requiredChoice<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function mapRows<Row, View>(rows: readonly Row[], project: (row: Row) => View | null): View[] | null {
  const mapped: View[] = [];
  for (const row of rows) {
    const view = project(row);
    if (view === null) return null;
    mapped.push(view);
  }
  return mapped;
}

function normalizeSearch(search: string | null | undefined): string {
  return typeof search === "string" ? search.trim().toLocaleLowerCase("pt-BR") : "";
}

function matches(haystack: string | null, needle: string): boolean {
  if (needle.length === 0) return true;
  if (haystack === null) return false;
  return haystack.toLocaleLowerCase("pt-BR").includes(needle);
}

export async function loadCatalogOverview(
  client: ServerSupabaseClient,
  search: string | null | undefined,
  offerId: string | null,
): Promise<CatalogOverview> {
  const needle = normalizeSearch(search);

  try {
    const [categories, products, variants, channels, pricing, timeline, scopes] = await Promise.all([
      loadAllPages((from, to) => client
        .from("product_categories")
        .select("id, organization_id, establishment_id, branch_id, parent_category_id, name, description, display_order, status", { count: "exact" })
        .order("display_order", { ascending: true })
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)),
      loadAllPages((from, to) => client
        .from("products")
        .select("id, organization_id, establishment_id, branch_id, category_id, name, description, status", { count: "exact" })
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)),
      loadAllPages((from, to) => client
        .from("product_variants")
        .select("id, organization_id, establishment_id, branch_id, product_id, name, status", { count: "exact" })
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)),
      loadAllPages((from, to) => client
        .from("sales_channels")
        .select("id, organization_id, channel_key, display_name, description, status", { count: "exact" })
        .order("display_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)),
      loadAllPages((from, to) => client
        .from("channel_offer_pricing")
        .select("id, organization_id, establishment_id, branch_id, sales_channel_id, product_id, product_variant_id, title, description, base_price_amount, base_price_currency, promotional_price_amount, availability, visibility, status, price_revision", { count: "exact" })
        .order("id", { ascending: true })
        .range(from, to)),
      loadAllPages((from, to) => {
        const query = client
          .from("channel_offer_price_timeline")
          .select("channel_offer_id, price_revision, base_price_amount, base_price_currency, promotional_price_amount, availability, visibility, effective_from, effective_to, correlation_id", { count: "exact" })
          .order("price_revision", { ascending: false })
          .range(from, to);
        return offerId ? query.eq("channel_offer_id", offerId) : query;
      }),
      client.rpc("catalog_admitted_scopes", { p_permission_key: "catalog.write" }),
    ]);

    if (!categories || !products || !variants || !channels || !pricing || !timeline) return EMPTY_OVERVIEW;
    if (scopes.error) return EMPTY_OVERVIEW;

    const categoryViews = mapRows(
      categories.filter((row) => matches(optionalText(row.name), needle) || matches(optionalText(row.description), needle)),
      (row): CatalogCategoryView | null => {
        const id = requiredText(row.id);
        const organizationId = requiredText(row.organization_id);
        const name = requiredText(row.name);
        const displayOrder = requiredInteger(row.display_order);
        if (!id || !organizationId || !name || displayOrder === null) return null;
        return {
          id,
          organizationId,
          establishmentId: optionalText(row.establishment_id),
          branchId: optionalText(row.branch_id),
          parentCategoryId: optionalText(row.parent_category_id),
          name,
          description: optionalText(row.description),
          displayOrder,
          status: requiredText(row.status) ?? "",
        };
      },
    );

    const productViews = mapRows(
      products.filter((row) => matches(optionalText(row.name), needle) || matches(optionalText(row.description), needle)),
      (row): CatalogProductView | null => {
        const id = requiredText(row.id);
        const organizationId = requiredText(row.organization_id);
        const name = requiredText(row.name);
        if (!id || !organizationId || !name) return null;
        return {
          id,
          organizationId,
          establishmentId: optionalText(row.establishment_id),
          branchId: optionalText(row.branch_id),
          categoryId: optionalText(row.category_id),
          name,
          description: optionalText(row.description),
          status: requiredText(row.status) ?? "",
        };
      },
    );

    const variantViews = mapRows(
      variants.filter((row) => matches(optionalText(row.name), needle)),
      (row): CatalogVariantView | null => {
        const id = requiredText(row.id);
        const organizationId = requiredText(row.organization_id);
        const productId = requiredText(row.product_id);
        const name = requiredText(row.name);
        if (!id || !organizationId || !productId || !name) return null;
        return {
          id,
          organizationId,
          establishmentId: optionalText(row.establishment_id),
          branchId: optionalText(row.branch_id),
          productId,
          name,
          status: requiredText(row.status) ?? "",
        };
      },
    );

    const channelViews = mapRows(
      channels.filter((row) => matches(optionalText(row.display_name), needle) || matches(optionalText(row.description), needle)),
      (row): CatalogChannelView | null => {
        const id = requiredText(row.id);
        const organizationId = requiredText(row.organization_id);
        const channelKey = requiredText(row.channel_key);
        const displayName = requiredText(row.display_name);
        if (!id || !organizationId || !channelKey || !displayName) return null;
        return {
          id,
          organizationId,
          channelKey,
          displayName,
          description: optionalText(row.description),
          status: requiredText(row.status) ?? "",
        };
      },
    );

    const offerViews = mapRows(
      pricing.filter((row) => matches(optionalText(row.title), needle) || matches(optionalText(row.description), needle)),
      (row): CatalogOfferView | null => {
        const id = requiredText(row.id);
        const organizationId = requiredText(row.organization_id);
        const salesChannelId = requiredText(row.sales_channel_id);
        const basePrice = requiredText(row.base_price_amount);
        const currency = requiredText(row.base_price_currency);
        const availability = requiredChoice(row.availability, ["available", "unavailable"] as const);
        const visibility = requiredChoice(row.visibility, ["visible", "hidden"] as const);
        const priceRevision = requiredInteger(row.price_revision);
        if (
          !id || !organizationId || !salesChannelId || !basePrice || !currency
          || !availability || !visibility || priceRevision === null
        ) return null;
        return {
          id,
          organizationId,
          establishmentId: optionalText(row.establishment_id),
          branchId: optionalText(row.branch_id),
          salesChannelId,
          productId: optionalText(row.product_id),
          productVariantId: optionalText(row.product_variant_id),
          title: optionalText(row.title),
          description: optionalText(row.description),
          basePrice,
          currency,
          promotionalPrice: optionalText(row.promotional_price_amount),
          availability,
          visibility,
          status: requiredText(row.status) ?? "",
          priceRevision,
        };
      },
    );

    const timelineViews = mapRows(timeline, (row): CatalogTimelineEntry | null => {
      const channelOfferId = requiredText(row.channel_offer_id);
      const basePrice = requiredText(row.base_price_amount);
      const currency = requiredText(row.base_price_currency);
      const availability = requiredChoice(row.availability, ["available", "unavailable"] as const);
      const visibility = requiredChoice(row.visibility, ["visible", "hidden"] as const);
      const priceRevision = requiredInteger(row.price_revision);
      const effectiveFrom = requiredText(row.effective_from);
      const correlationId = requiredText(row.correlation_id);
      if (
        !channelOfferId || !basePrice || !currency || !availability || !visibility
        || priceRevision === null || !effectiveFrom || !correlationId
      ) return null;
      return {
        channelOfferId,
        priceRevision,
        basePrice,
        currency,
        promotionalPrice: optionalText(row.promotional_price_amount),
        availability,
        visibility,
        effectiveFrom,
        effectiveTo: optionalText(row.effective_to),
        correlationId,
      };
    });

    if (!categoryViews || !productViews || !variantViews || !channelViews || !offerViews || !timelineViews) {
      return EMPTY_OVERVIEW;
    }

    const scopeViews: CatalogAdmittedScope[] = [];
    for (const row of scopes.data ?? []) {
      const organizationId = requiredText(row.organization_id);
      const organizationName = requiredText(row.organization_name);
      if (!organizationId || !organizationName) return EMPTY_OVERVIEW;
      scopeViews.push({
        organizationId,
        establishmentId: optionalText(row.establishment_id),
        branchId: optionalText(row.branch_id),
        organizationName,
      });
    }

    const organizationIds = new Set([
      ...categoryViews.map((row) => row.organizationId),
      ...productViews.map((row) => row.organizationId),
      ...channelViews.map((row) => row.organizationId),
    ]);

    return {
      ok: true,
      organizationId: organizationIds.size === 1 ? [...organizationIds][0] : null,
      writeScopes: scopeViews,
      categories: categoryViews,
      products: productViews,
      variants: variantViews,
      channels: channelViews,
      offers: offerViews,
      timeline: timelineViews,
    };
  } catch {
    return EMPTY_OVERVIEW;
  }
}