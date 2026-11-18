import { formatBrlFromCents, toExactCents } from "@/lib/orders/order-lifecycle";

export const STOREFRONT_LAYOUT_FAMILIES = ["editorial_bistro", "express_grid"] as const;
export type StorefrontLayoutFamily = typeof STOREFRONT_LAYOUT_FAMILIES[number];

export const STOREFRONT_ACCENT_PRESETS = [
  "emerald_garden",
  "terracotta_oven",
  "midnight_amber",
] as const;
export type StorefrontAccentPreset = typeof STOREFRONT_ACCENT_PRESETS[number];

export const STOREFRONT_CARD_STYLES = ["elevated_glass", "crisp_minimal"] as const;
export type StorefrontCardStyle = typeof STOREFRONT_CARD_STYLES[number];

export const MEDIA_PROVIDER_KEYS = [
  "external_https",
  "supabase_storage",
  "cdn_proxy",
] as const;
export type MediaProviderKey = typeof MEDIA_PROVIDER_KEYS[number];

export const MEDIA_MIME_TYPES = [
  "image/webp",
  "image/avif",
  "image/jpeg",
  "image/png",
] as const;
export type MediaMimeType = typeof MEDIA_MIME_TYPES[number];

export type PublicMediaSnapshot = Readonly<{
  url: string;
  alt_text: string;
  width_px: number;
  height_px: number;
}>;

export type PublicMenuOffer = Readonly<{
  offer_id: string;
  category_name: string;
  display_name: string;
  description: string;
  base_price: number;
  currency: string;
  media: PublicMediaSnapshot | null;
}>;

export type PublicDeliveryZone = Readonly<{
  zone_id: string;
  name: string;
  neighborhoods: string[];
  delivery_fee_amount: number;
  minimum_order_amount: number;
  estimated_delivery_minutes: number;
}>;

export type StorefrontCartSummary = Readonly<{
  itemCount: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  subtotalFormatted: string;
  deliveryFeeFormatted: string;
  totalFormatted: string;
  meetsMinimumOrder: boolean;
  minimumOrderShortfallFormatted: string;
}>;

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;
const HTTPS_URL_REGEX = /^https:\/\/[^\s"'<>]{4,1000}$/;

export function normalizeStorefrontSlug(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase();
  return SLUG_REGEX.test(cleaned) ? cleaned : null;
}

export function validateHttpsMediaUrl(raw: string): string | null {
  const cleaned = raw.trim();
  return HTTPS_URL_REGEX.test(cleaned) ? cleaned : null;
}

export function resolveSafeThemeTokens(theme: Readonly<{
  layout_family?: string;
  accent_preset?: string;
  card_style?: string;
}> | null | undefined): Readonly<{
  layoutFamily: StorefrontLayoutFamily;
  accentPreset: StorefrontAccentPreset;
  cardStyle: StorefrontCardStyle;
}> {
  const layoutFamily = (STOREFRONT_LAYOUT_FAMILIES as readonly string[]).includes(theme?.layout_family ?? "")
    ? (theme!.layout_family as StorefrontLayoutFamily)
    : "editorial_bistro";
  const accentPreset = (STOREFRONT_ACCENT_PRESETS as readonly string[]).includes(theme?.accent_preset ?? "")
    ? (theme!.accent_preset as StorefrontAccentPreset)
    : "emerald_garden";
  const cardStyle = (STOREFRONT_CARD_STYLES as readonly string[]).includes(theme?.card_style ?? "")
    ? (theme!.card_style as StorefrontCardStyle)
    : "elevated_glass";
  return { layoutFamily, accentPreset, cardStyle };
}

export function groupOffersByCategory(
  offers: readonly PublicMenuOffer[],
): ReadonlyArray<Readonly<{ categoryName: string; items: PublicMenuOffer[] }>> {
  const groups = new Map<string, PublicMenuOffer[]>();
  for (const offer of offers) {
    const bucket = groups.get(offer.category_name) ?? [];
    bucket.push(offer);
    groups.set(offer.category_name, bucket);
  }
  return [...groups.entries()].map(([categoryName, items]) => ({ categoryName, items }));
}

export function computeStorefrontCartSummary(options: Readonly<{
  offers: readonly PublicMenuOffer[];
  quantities: Readonly<Record<string, number>>;
  fulfillmentMode: "pickup" | "own_delivery";
  selectedZone: PublicDeliveryZone | null;
}>): StorefrontCartSummary {
  const offerMap = new Map(options.offers.map((offer) => [offer.offer_id, offer]));
  let itemCount = 0;
  let subtotalCents = 0;

  for (const [offerId, rawQty] of Object.entries(options.quantities)) {
    const qty = Math.max(0, Math.min(99, Math.trunc(rawQty)));
    if (qty <= 0) continue;
    const offer = offerMap.get(offerId);
    if (!offer) continue;
    const unitCents = toExactCents(offer.base_price);
    if (unitCents === null) continue;
    itemCount += qty;
    subtotalCents += unitCents * qty;
  }

  const isDelivery = options.fulfillmentMode === "own_delivery";
  const deliveryFeeCents = isDelivery && options.selectedZone
    ? (toExactCents(options.selectedZone.delivery_fee_amount) ?? 0)
    : 0;
  const minimumCents = isDelivery && options.selectedZone
    ? (toExactCents(options.selectedZone.minimum_order_amount) ?? 0)
    : 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const meetsMinimumOrder = !isDelivery || (options.selectedZone !== null && subtotalCents >= minimumCents);
  const shortfallCents = Math.max(0, minimumCents - subtotalCents);

  return {
    itemCount,
    subtotalCents,
    deliveryFeeCents,
    totalCents,
    subtotalFormatted: formatBrlFromCents(subtotalCents),
    deliveryFeeFormatted: formatBrlFromCents(deliveryFeeCents),
    totalFormatted: formatBrlFromCents(totalCents),
    meetsMinimumOrder,
    minimumOrderShortfallFormatted: formatBrlFromCents(shortfallCents),
  };
}
