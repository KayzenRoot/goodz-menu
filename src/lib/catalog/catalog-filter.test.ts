import { describe, expect, it } from "vitest";
import { filterCatalogData } from "@/lib/catalog/catalog-filter";

const products = [
  { id: "product-1", name: "Limonada", description: "Bebida natural" },
  { id: "product-2", name: "Café gelado", description: "Café com leite" },
];

const variants = [
  { id: "variant-1", product_id: "product-1", name: "Tradicional", size_label: "500 ml", flavor_label: "Limão" },
  { id: "variant-2", product_id: "product-1", name: "Família", size_label: "1 litro", flavor_label: "Tangerina" },
  { id: "variant-3", product_id: "product-2", name: "Baunilha", size_label: "300 ml", flavor_label: "Baunilha" },
];

const data = {
  categories: [],
  products,
  variants,
  offers: [],
};

const names = {
  productNames: new Map(products.map(({ id, name }) => [id, name])),
  variantNames: new Map(variants.map(({ id, name }) => [id, name])),
  channelNames: new Map<string, string>(),
};

describe("catalog search", () => {
  it.each(["tradicional", "500 ml", "limão"])("shows a variant and its parent product for a %s search", (search) => {
    const result = filterCatalogData(data, search, names);

    expect(result.products).toEqual([]);
    expect(result.variantProducts.map(({ id }) => id)).toEqual(["product-1"]);
    expect(result.variants.map(({ id }) => id)).toEqual(["variant-1"]);
  });

  it("shows all variants when their canonical product matches", () => {
    const result = filterCatalogData(data, "café gelado", names);

    expect(result.products.map(({ id }) => id)).toEqual(["product-2"]);
    expect(result.variantProducts.map(({ id }) => id)).toEqual(["product-2"]);
    expect(result.variants.map(({ id }) => id)).toEqual(["variant-3"]);
  });

  it("returns the full catalog for an empty search", () => {
    const result = filterCatalogData(data, "  ", names);

    expect(result.products).toBe(products);
    expect(result.variantProducts).toBe(products);
    expect(result.variants).toBe(variants);
  });
});
