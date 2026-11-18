import { describe, expect, it } from "vitest";
import {
  computeStorefrontCartSummary,
  groupOffersByCategory,
  normalizeStorefrontSlug,
  resolveSafeThemeTokens,
  validateHttpsMediaUrl,
  type PublicDeliveryZone,
  type PublicMenuOffer,
} from "@/lib/storefront/storefront-domain";

const SAMPLE_OFFERS: PublicMenuOffer[] = [
  {
    offer_id: "off-1",
    category_name: "Entradas",
    display_name: "Bruschetta Artesanal",
    description: "Tomate confit e manjericão",
    base_price: 24.9,
    currency: "BRL",
    media: null,
  },
  {
    offer_id: "off-2",
    category_name: "Pratos Principais",
    display_name: "Nhoque Dourado",
    description: "Manteiga de sálvia",
    base_price: 48.5,
    currency: "BRL",
    media: null,
  },
];

const SAMPLE_ZONE: PublicDeliveryZone = {
  zone_id: "zone-1",
  name: "Raio Jardins",
  neighborhoods: ["Jardins", "Pinheiros"],
  delivery_fee_amount: 7.5,
  minimum_order_amount: 50.0,
  estimated_delivery_minutes: 35,
};

describe("storefront-domain", () => {
  it("validates public slugs and HTTPS-only media URLs without XSS schemes", () => {
    expect(normalizeStorefrontSlug("  Bistro-Jardins-01 ")).toBe("bistro-jardins-01");
    expect(normalizeStorefrontSlug("-bad-slug")).toBeNull();
    expect(normalizeStorefrontSlug("x")).toBeNull();

    expect(validateHttpsMediaUrl("https://cdn.example.com/menu/dish.webp")).toBe("https://cdn.example.com/menu/dish.webp");
    expect(validateHttpsMediaUrl("http://insecure.example.com/a.jpg")).toBeNull();
    expect(validateHttpsMediaUrl("javascript:alert(1)")).toBeNull();
  });

  it("falls back safely to approved theme schema tokens when unknown values are supplied", () => {
    expect(resolveSafeThemeTokens({
      layout_family: "express_grid",
      accent_preset: "terracotta_oven",
      card_style: "crisp_minimal",
    })).toEqual({
      layoutFamily: "express_grid",
      accentPreset: "terracotta_oven",
      cardStyle: "crisp_minimal",
    });

    expect(resolveSafeThemeTokens({
      layout_family: "arbitrary_css_injection",
      accent_preset: "unknown",
      card_style: "raw_html",
    })).toEqual({
      layoutFamily: "editorial_bistro",
      accentPreset: "emerald_garden",
      cardStyle: "elevated_glass",
    });
  });

  it("groups offers by category and computes exact-cents cart totals and minimum order checks", () => {
    const grouped = groupOffersByCategory(SAMPLE_OFFERS);
    expect(grouped).toHaveLength(2);

    const belowMin = computeStorefrontCartSummary({
      offers: SAMPLE_OFFERS,
      quantities: { "off-1": 1 },
      fulfillmentMode: "own_delivery",
      selectedZone: SAMPLE_ZONE,
    });
    expect(belowMin.meetsMinimumOrder).toBe(false);
    expect(belowMin.minimumOrderShortfallFormatted).toBe("R$ 25,10");

    const eligible = computeStorefrontCartSummary({
      offers: SAMPLE_OFFERS,
      quantities: { "off-1": 1, "off-2": 1 },
      fulfillmentMode: "own_delivery",
      selectedZone: SAMPLE_ZONE,
    });
    expect(eligible.meetsMinimumOrder).toBe(true);
    expect(eligible.subtotalFormatted).toBe("R$ 73,40");
    expect(eligible.deliveryFeeFormatted).toBe("R$ 7,50");
    expect(eligible.totalFormatted).toBe("R$ 80,90");
  });
});
