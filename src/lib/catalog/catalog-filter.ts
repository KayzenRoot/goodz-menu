type CatalogCategorySearchFields = Readonly<{
  name: string;
  description: string | null;
}>;

type CatalogProductSearchFields = Readonly<{
  id: string;
  name: string;
  description: string | null;
}>;

type CatalogVariantSearchFields = Readonly<{
  id: string;
  product_id: string;
  name: string;
  size_label: string | null;
  flavor_label: string | null;
}>;

type CatalogOfferSearchFields = Readonly<{
  title_override: string | null;
  description_override: string | null;
  product_id: string | null;
  variant_id: string | null;
  sales_channel_id: string;
}>;

export type CatalogNameMaps = Readonly<{
  productNames: ReadonlyMap<string, string>;
  variantNames: ReadonlyMap<string, string>;
  channelNames: ReadonlyMap<string, string>;
}>;

export type CatalogFilterResult<
  Category,
  Product,
  Variant,
  Offer,
> = Readonly<{
  categories: Category[];
  products: Product[];
  variantProducts: Product[];
  variants: Variant[];
  offers: Offer[];
}>;

export function filterCatalogData<
  Category extends CatalogCategorySearchFields,
  Product extends CatalogProductSearchFields,
  Variant extends CatalogVariantSearchFields,
  Offer extends CatalogOfferSearchFields,
>(
  data: Readonly<{
    categories: Category[];
    products: Product[];
    variants: Variant[];
    offers: Offer[];
  }>,
  needle: string,
  names: CatalogNameMaps,
): CatalogFilterResult<Category, Product, Variant, Offer> {
  const normalizedNeedle = needle.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedNeedle) {
    return {
      categories: data.categories,
      products: data.products,
      variantProducts: data.products,
      variants: data.variants,
      offers: data.offers,
    };
  }

  const categories = data.categories.filter(({ name, description }) => matches(normalizedNeedle, name, description));
  const products = data.products.filter(({ name, description }) => matches(normalizedNeedle, name, description));
  const matchingProductIds = new Set(products.map(({ id }) => id));
  const matchingVariants = data.variants.filter(({ name, size_label, flavor_label }) => matches(normalizedNeedle, name, size_label, flavor_label));
  const variantProductIds = new Set([
    ...matchingProductIds,
    ...matchingVariants.map(({ product_id }) => product_id),
  ]);
  const variantProducts = data.products.filter(({ id }) => variantProductIds.has(id));
  const variants = data.variants.filter(({ name, size_label, flavor_label, product_id }) => (
    matchingProductIds.has(product_id) || matches(normalizedNeedle, name, size_label, flavor_label)
  ));
  const offers = data.offers.filter((offer) => matches(
    normalizedNeedle,
    offer.title_override,
    offer.description_override,
    offer.product_id ? names.productNames.get(offer.product_id) : null,
    offer.variant_id ? names.variantNames.get(offer.variant_id) : null,
    names.channelNames.get(offer.sales_channel_id),
  ));

  return { categories, products, variantProducts, variants, offers };
}

function matches(needle: string, ...values: (string | null | undefined)[]) {
  return values.some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle));
}
