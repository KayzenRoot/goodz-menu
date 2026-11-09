import { describe, expect, it } from "vitest";
import {
  buildArchiveCategoryCommand,
  buildCreateCategoryCommand,
  buildCreateChannelCommand,
  buildCreateOfferCommand,
  buildCreateProductCommand,
  buildOfferAvailabilityCommand,
  buildOfferPriceCommand,
  buildOfferVisibilityCommand,
  buildUpdateVariantCommand,
  describeValidationIssues,
  type ValidationIssue,
} from "@/lib/catalog/validation";

const ORGANIZATION = "3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607";
const ESTABLISHMENT = "4a1b2c3d-5e6f-4071-8a92-b3c4d5e6f708";
const BRANCH = "5b2c3d4e-6f70-4182-9a03-c4d5e6f70819";
const PARENT = "6c3d4e5f-7081-4293-a014-d5e6f7081920";
const TARGET = "7d4e5f60-8192-43a4-b125-e6f708192031";
const CORRELATION = "8e5f6071-92a3-44b5-a236-f70819203142";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function issuesOf(result: { ok: boolean; issues?: ValidationIssue[] } | { ok: true }): ValidationIssue[] {
  if (result.ok) return [];
  return (result as { issues: ValidationIssue[] }).issues;
}

function codes(result: ReturnType<typeof buildCreateCategoryCommand>): ValidationIssue[] {
  return issuesOf(result).map(({ code }) => ({ field: "", code }));
}

describe("catalog scope", () => {
  it("admits a category without an optional description, title or parent", () => {
    const result = buildCreateCategoryCommand(
      form({ organizationId: ORGANIZATION, name: "Bebidas", displayOrder: "10" }),
      CORRELATION,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        organizationId: ORGANIZATION,
        establishmentId: null,
        branchId: null,
        correlationId: CORRELATION,
        idempotencyKey: null,
        parentCategoryId: null,
        name: "Bebidas",
        description: null,
        displayOrder: 10,
      },
    });
  });

  it("admits a full establishment and branch scope", () => {
    const result = buildCreateCategoryCommand(
      form({
        organizationId: ORGANIZATION,
        establishmentId: ESTABLISHMENT,
        branchId: BRANCH,
        parentCategoryId: PARENT,
        name: "Sucos",
        description: "  Espremidos  ",
        displayOrder: "0",
        idempotencyKey: TARGET,
      }),
      CORRELATION,
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        establishmentId: ESTABLISHMENT,
        branchId: BRANCH,
        parentCategoryId: PARENT,
        description: "Espremidos",
        displayOrder: 0,
        idempotencyKey: TARGET,
      },
    });
  });

  it("refuses a branch scope without the establishment that contains it", () => {
    const result = buildCreateCategoryCommand(
      form({ organizationId: ORGANIZATION, branchId: BRANCH, name: "Sucos", displayOrder: "1" }),
      CORRELATION,
    );

    expect(issuesOf(result)).toEqual([{ field: "branchId", code: "invalid_identifier" }]);
  });

  it("refuses an identifier that is not a uuid", () => {
    const result = buildCreateCategoryCommand(
      form({ organizationId: "not-a-uuid", name: "Sucos", displayOrder: "1" }),
      CORRELATION,
    );

    expect(issuesOf(result)).toContainEqual({ field: "organizationId", code: "invalid_identifier" });
  });

  it("refuses a non integer display order", () => {
    const result = buildCreateCategoryCommand(
      form({ organizationId: ORGANIZATION, name: "Sucos", displayOrder: "1.5" }),
      CORRELATION,
    );

    expect(issuesOf(result)).toContainEqual({ field: "displayOrder", code: "invalid_number" });
  });
});

describe("command envelope", () => {
  it("takes the correlation id from the request, never from the submitted form", () => {
    const submitted = buildCreateProductCommand(
      form({ organizationId: ORGANIZATION, name: "Café", correlationId: TARGET }),
      CORRELATION,
    );

    expect(submitted).toMatchObject({ ok: true, value: { correlationId: CORRELATION } });
  });

  it("refuses a correlation id the server could not have issued", () => {
    const result = buildCreateProductCommand(
      form({ organizationId: ORGANIZATION, name: "Café" }),
      "forged",
    );

    expect(issuesOf(result)).toEqual([{ field: "correlationId", code: "invalid_identifier" }]);
  });
});

describe("channel identity", () => {
  it("admits a provider independent channel key", () => {
    const result = buildCreateChannelCommand(
      form({ organizationId: ORGANIZATION, channelKey: "goodz-online", displayName: "Goodz Online" }),
      CORRELATION,
    );

    expect(result).toMatchObject({ ok: true, value: { channelKey: "goodz-online" } });
  });

  it("refuses a channel key that is not a canonical identifier", () => {
    for (const channelKey of ["Goodz Online", "1online", "ifood!", "-online"]) {
      const result = buildCreateChannelCommand(
        form({ organizationId: ORGANIZATION, channelKey, displayName: "Canal" }),
        CORRELATION,
      );
      expect(issuesOf(result).map(({ code }) => code), channelKey).toContain("invalid_text");
    }
  });

  it("treats a blank channel key as missing rather than malformed", () => {
    const result = buildCreateChannelCommand(
      form({ organizationId: ORGANIZATION, channelKey: "   ", displayName: "Canal" }),
      CORRELATION,
    );

    expect(issuesOf(result)).toContainEqual({ field: "channelKey", code: "required" });
  });
});

describe("offer commercial state", () => {
  const base = {
    organizationId: ORGANIZATION,
    salesChannelId: TARGET,
    productId: PARENT,
    currency: "BRL",
    basePrice: "10.0000",
  };

  it("admits an offer for a canonical product", () => {
    const result = buildCreateOfferCommand(form(base), CORRELATION);

    expect(result).toMatchObject({
      ok: true,
      value: { productId: PARENT, productVariantId: null, promotionalPrice: null },
    });
  });

  it("admits a strict promotional reduction and keeps it exact", () => {
    const result = buildCreateOfferCommand(
      form({ ...base, basePrice: "0.3000", promotionalPrice: "0.2000" }),
      CORRELATION,
    );

    expect(result).toMatchObject({
      ok: true,
      value: { basePrice: { decimal: "0.3000", scaled: BigInt(3000) }, promotionalPrice: { decimal: "0.2000" } },
    });
  });

  it("refuses an offer that targets both a product and a variant", () => {
    const result = buildCreateOfferCommand(
      form({ ...base, productVariantId: ESTABLISHMENT }),
      CORRELATION,
    );

    // With both targets present the product is the admitted one and the variant is the excess.
    expect(issuesOf(result)).toEqual([{ field: "productId", code: "invalid_choice" }]);
  });

  it("refuses an offer that targets neither a product nor a variant", () => {
    const result = buildCreateOfferCommand(form({ ...base, productId: "" }), CORRELATION);

    // With neither target present the variant is the field the operator has to resolve.
    expect(issuesOf(result)).toEqual([{ field: "productVariantId", code: "invalid_choice" }]);
  });

  it("refuses a promotional price that is not a reduction", () => {
    for (const promotionalPrice of ["10.0000", "10.0001"]) {
      const result = buildCreateOfferCommand(
        form({ ...base, basePrice: "10.0000", promotionalPrice }),
        CORRELATION,
      );
      expect(issuesOf(result), promotionalPrice).toEqual([
        { field: "promotionalPrice", code: "invalid_promotional_price" },
      ]);
    }
  });

  it("refuses a price that is not an exact decimal amount", () => {
    for (const basePrice of ["-1.00", "10,00", "10.00001", "abc"]) {
      const result = buildCreateOfferCommand(form({ ...base, basePrice }), CORRELATION);
      expect(issuesOf(result).map(({ code }) => code), basePrice).toContain("invalid_money");
    }
  });

  it("refuses a currency that is not three upper case letters", () => {
    const result = buildCreateOfferCommand(form({ ...base, currency: "brl" }), CORRELATION);

    expect(issuesOf(result)).toContainEqual({ field: "currency", code: "invalid_currency" });
  });
});

describe("price change", () => {
  it("admits a new base price and keeps the prior truth reconstructable", () => {
    const result = buildOfferPriceCommand(
      form({ offerId: TARGET, basePrice: "12.0000", promotionalPrice: "9.0000" }),
      CORRELATION,
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        offerId: TARGET,
        basePrice: { decimal: "12.0000", scaled: BigInt(120000) },
        promotionalPrice: { decimal: "9.0000" },
      },
    });
  });

  it("refuses a promotional price equal to the new base price", () => {
    const result = buildOfferPriceCommand(
      form({ offerId: TARGET, basePrice: "12.0000", promotionalPrice: "12.0000" }),
      CORRELATION,
    );

    expect(issuesOf(result)).toEqual([{ field: "promotionalPrice", code: "invalid_promotional_price" }]);
  });

  it("refuses a promotional price above the new base price", () => {
    const result = buildOfferPriceCommand(
      form({ offerId: TARGET, basePrice: "12.0000", promotionalPrice: "13.0000" }),
      CORRELATION,
    );

    expect(issuesOf(result)).toEqual([{ field: "promotionalPrice", code: "invalid_promotional_price" }]);
  });
});

describe("availability, visibility and archival", () => {
  it("admits only the admitted availability and visibility values", () => {
    expect(buildOfferAvailabilityCommand(form({ offerId: TARGET, availability: "available" }), CORRELATION))
      .toMatchObject({ ok: true, value: { availability: "available" } });
    expect(buildOfferAvailabilityCommand(form({ offerId: TARGET, availability: "sold_out" }), CORRELATION))
      .toMatchObject({ ok: false });
    expect(buildOfferVisibilityCommand(form({ offerId: TARGET, visibility: "hidden" }), CORRELATION))
      .toMatchObject({ ok: true, value: { visibility: "hidden" } });
    expect(buildOfferVisibilityCommand(form({ offerId: TARGET, visibility: "public" }), CORRELATION))
      .toMatchObject({ ok: false });
  });

  it("treats a missing archive flag as active rather than archived", () => {
    expect(buildArchiveCategoryCommand(form({ categoryId: TARGET }), CORRELATION))
      .toMatchObject({ ok: true, value: { archived: false } });
    expect(buildArchiveCategoryCommand(form({ categoryId: TARGET, archived: "on" }), CORRELATION))
      .toMatchObject({ ok: true, value: { archived: true } });
  });

  it("admits a variant rename together with its archival state", () => {
    const result = buildUpdateVariantCommand(
      form({ variantId: TARGET, name: "500 ml", archived: "on" }),
      CORRELATION,
    );

    expect(result).toMatchObject({ ok: true, value: { variantId: TARGET, name: "500 ml", archived: true } });
  });
});

describe("safe error rendering", () => {
  it("never echoes the rejected input back to the browser", () => {
    const rejected = "10,0000<script>";
    const result = buildOfferPriceCommand(form({ offerId: TARGET, basePrice: rejected }), CORRELATION);
    const rendered = describeValidationIssues(issuesOf(result));

    expect(rendered).not.toContain(rejected);
    expect(rendered).not.toContain("script");
    expect(rendered).toBe("Informe um valor decimal positivo com até 4 casas.");
  });

  it("collapses repeated codes into one message per distinct code", () => {
    const result = buildCreateCategoryCommand(form({ displayOrder: "x" }), CORRELATION);

    expect(codes(result).length).toBeGreaterThan(1);
    expect(describeValidationIssues(issuesOf(result))).toBe("Preencha este campo. Número inválido.");
  });
});