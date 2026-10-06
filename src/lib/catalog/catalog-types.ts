// Shapes the catalog read contracts admit.
//
// These live outside the server-only query module because both the server page and the client
// interface describe the same rows. Keeping them in one place is what stops the interface from
// inventing a default for a column the database left absent.

import type { CatalogAvailability, CatalogVisibility } from "@/lib/catalog/validation";

export type CatalogScopeView = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export type CatalogCategoryView = CatalogScopeView & {
  id: string;
  parentCategoryId: string | null;
  name: string;
  description: string | null;
  displayOrder: number;
  status: string;
};

export type CatalogProductView = CatalogScopeView & {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  status: string;
};

export type CatalogVariantView = CatalogScopeView & {
  id: string;
  productId: string;
  name: string;
  status: string;
};

export type CatalogChannelView = {
  id: string;
  organizationId: string;
  channelKey: string;
  displayName: string;
  description: string | null;
  status: string;
};

export type CatalogOfferView = CatalogScopeView & {
  id: string;
  salesChannelId: string;
  productId: string | null;
  productVariantId: string | null;
  title: string | null;
  description: string | null;
  /** Exact decimal text as persisted; never routed through a binary float. */
  basePrice: string;
  currency: string;
  promotionalPrice: string | null;
  availability: CatalogAvailability;
  visibility: CatalogVisibility;
  status: string;
  priceRevision: number;
};

export type CatalogTimelineEntry = {
  channelOfferId: string;
  priceRevision: number;
  basePrice: string;
  currency: string;
  promotionalPrice: string | null;
  availability: CatalogAvailability;
  visibility: CatalogVisibility;
  effectiveFrom: string;
  effectiveTo: string | null;
  correlationId: string;
};

export type CatalogAdmittedScope = CatalogScopeView & {
  organizationName: string;
};

export type CatalogOverview =
  | {
      ok: true;
      organizationId: string | null;
      /**
       * Scopes this session may create catalog rows into, in the order the database returns them.
       * Empty means the session holds no catalog write scope at all, which is different from
       * holding one over an empty catalog.
       */
      writeScopes: CatalogAdmittedScope[];
      categories: CatalogCategoryView[];
      products: CatalogProductView[];
      variants: CatalogVariantView[];
      channels: CatalogChannelView[];
      offers: CatalogOfferView[];
      timeline: CatalogTimelineEntry[];
    }
  | { ok: false };
