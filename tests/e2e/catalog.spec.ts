import { createHmac, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createCatalogSessionFixture, type CatalogSessionFixture } from "./catalog-session-fixture";

let fixture: CatalogSessionFixture;

test.beforeAll(async () => {
  fixture = await createCatalogSessionFixture();
});

test.afterAll(async () => {
  await fixture?.cleanup();
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
}

function totp(secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = secret.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const character of normalized) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("The local TOTP fixture is unavailable.");
    bits += value.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)?.map((part) => parseInt(part, 2)) ?? []);
  const counter = Math.floor(now / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return (binary % 1_000_000).toString().padStart(6, "0");
}

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length }))).toEqual([]);
}

async function enrollTotp(page: Page, password: string) {
  await page.goto("/app/security");
  await expect(page.getByRole("heading", { name: "Configure o aplicativo autenticador" })).toBeVisible();
  await page.getByLabel("Senha para reautenticar").fill(password);
  await page.getByRole("button", { name: "Confirmar identidade e configurar" }).click();
  await expect(page.getByRole("img", { name: "QR code para configurar o aplicativo autenticador" })).toBeVisible();
  const secret = await page.getByTestId("mfa-manual-secret").textContent();
  if (!secret) throw new Error("The local TOTP fixture is unavailable.");

  const currentCounter = Math.floor(Date.now() / 30_000);
  await expect.poll(() => Math.floor(Date.now() / 30_000), { timeout: 35_000, intervals: [250, 500, 1_000] }).not.toBe(currentCounter);
  await page.getByLabel("Código do aplicativo autenticador").fill(totp(secret));
  const verifyResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Confirmar configuração" }).click();
  const verifyResponse = await verifyResponsePromise;
  expect(verifyResponse.ok()).toBe(true);
  await expect(page).toHaveURL(/\/app\/admin-guard$/, { timeout: 15_000 });
  return secret;
}

test("catalog owner flow keeps canonical product data separate and gates commercial edits", async ({ page, context, isMobile }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, fixture.owner.email, fixture.owner.password);
  await page.goto("/app/catalog");
  await expect(page.getByRole("heading", { name: "Produtos e ofertas" })).toBeVisible();
  await expect(page.getByLabel("Organização")).toHaveValue(fixture.organizationId);
  await expect(page.getByLabel("Unidade", { exact: true })).toHaveValue(fixture.branchId);
  await expectAccessible(page);

  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  expect(await page.locator("body").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  const categoryName = page.locator("#category-name-new");
  const categoryDescription = page.locator("#category-description-new");
  await categoryName.focus();
  await expect(categoryName).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(categoryDescription).toBeFocused();
  await categoryName.fill("Bebidas do catálogo E2E");
  await categoryDescription.fill("Categoria sintética acessível e editável");
  await page.getByRole("region", { name: "Categorias" }).getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByRole("region", { name: "Categorias" }).locator(".catalog-form-success")).toContainText("Salvo.", { timeout: 20_000 });

  await page.locator("#product-name-new").fill("Produto canônico E2E");
  await page.locator("#product-description-new").fill("Descrição canônica independente da oferta por canal.");
  await page.locator("#product-category-new").selectOption({ label: "Bebidas do catálogo E2E" });
  await page.getByRole("region", { name: "Produtos canônicos" }).getByRole("button", { name: "Criar produto" }).click();
  await expect(page.getByRole("region", { name: "Produtos canônicos" }).locator(".catalog-form-success")).toContainText("Salvo.", { timeout: 20_000 });

  const variantName = page.getByLabel("Nome da variante").last();
  await variantName.fill("Grande");
  await page.getByLabel("Tamanho").last().fill("Grande");
  await page.getByLabel("Sabor").last().fill("Baunilha");
  await page.getByRole("region", { name: "Variantes" }).getByRole("button", { name: "Criar variante" }).click();
  await expect(page.getByRole("region", { name: "Variantes" }).locator(".catalog-form-success")).toContainText("Salvo.", { timeout: 20_000 });

  const productOfferForm = page.locator("form.catalog-offer-create").filter({ has: page.locator(`#new-product-${fixture.branchId}-product`) });
  await productOfferForm.getByLabel("Produto").selectOption({ label: "Produto canônico E2E" });
  await productOfferForm.getByLabel("Canal de venda").selectOption({ label: "Goodz Online" });
  await productOfferForm.getByLabel("Título nesta oferta (opcional)").fill("Oferta da unidade principal");
  await productOfferForm.getByLabel("Descrição nesta oferta (opcional)").fill("Texto específico desta oferta, sem substituir o produto.");
  await productOfferForm.getByRole("button", { name: "Criar rascunho" }).click();
  await expect(productOfferForm.locator(".catalog-form-success")).toContainText("Salvo.", { timeout: 20_000 });

  const mainOffer = page.locator(".catalog-offer-card").filter({ has: page.getByRole("heading", { name: "Produto canônico E2E", exact: true }) });
  await expect(mainOffer).toBeVisible({ timeout: 20_000 });
  await expect(mainOffer.getByLabel("Título nesta oferta")).toHaveValue("Oferta da unidade principal");
  await expect(mainOffer.getByLabel("Preço base em BRL")).toHaveValue("");
  await expect(mainOffer.getByLabel("Disponibilidade interna")).toHaveValue("unknown");

  await mainOffer.getByLabel("Preço base em BRL").fill("15.50");
  await mainOffer.getByLabel("Disponibilidade interna").selectOption("available");
  await mainOffer.getByLabel("Visível no canal (exige preço e disponibilidade disponível)").check();
  const deniedCorrelationId = randomUUID();
  await page.setExtraHTTPHeaders({ "x-request-id": deniedCorrelationId });
  await mainOffer.getByRole("button", { name: "Salvar oferta" }).click();
  await expect(mainOffer.locator(".catalog-form-note")).toContainText("Verificação recente em duas etapas necessária", { timeout: 20_000 });
  await expect(mainOffer.getByRole("heading", { name: "Confirme a verificação em duas etapas" })).toBeVisible();
  await expect(mainOffer.locator(".catalog-step-up")).toContainText("Configure um fator autenticador");
  await expect(mainOffer.locator(".catalog-form-note")).not.toContainText(/SQL|PostgreSQL|stack|exception|service.role/i);
  await expect(mainOffer.locator(".catalog-step-up")).not.toContainText(/SQL|PostgreSQL|stack|exception|service.role/i);
  const deniedEvents = await fixture.inspectCommercialAudit(deniedCorrelationId);
  expect(deniedEvents).toHaveLength(1);
  expect(deniedEvents[0]).toMatchObject({
    actor_user_id: fixture.owner.id,
    organization_id: fixture.organizationId,
    establishment_id: fixture.establishmentId,
    branch_id: fixture.branchId,
    action: "catalog.privileged.step_up",
    target_type: "channel_offer",
    outcome: "deny",
    reason_code: "aal2_required",
    correlation_id: deniedCorrelationId,
    source: "admin_guard",
  });
  expect(await fixture.inspectPriceHistory(await mainOffer.locator('input[name="offerId"]').inputValue())).toHaveLength(0);
  await page.setExtraHTTPHeaders({});

  await enrollTotp(page, fixture.owner.password);
  await page.goto(`/app/catalog?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  const authorizedOffer = page.locator(".catalog-offer-card").filter({ has: page.getByRole("heading", { name: "Produto canônico E2E", exact: true }) });
  await expect(authorizedOffer).toBeVisible({ timeout: 20_000 });
  const authorizedPrice = authorizedOffer.getByLabel("Preço base em BRL");
  await authorizedPrice.fill("15.50");
  await expect(authorizedPrice).toHaveValue("15.50");
  await authorizedOffer.getByLabel("Disponibilidade interna").selectOption("available");
  await expect(authorizedPrice).toHaveValue("15.50");
  await authorizedOffer.getByLabel("Visível no canal (exige preço e disponibilidade disponível)").check();
  await expect(authorizedPrice).toHaveValue("15.50");
  const submittedOfferValues = await authorizedOffer.locator("form.catalog-offer-form").evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error("Catalog offer locator did not resolve to a form.");
    const values = new FormData(form);
    return {
      price: values.get("basePrice"),
      availability: values.get("availabilityState"),
      visibility: values.get("isVisible"),
      status: values.get("status"),
    };
  });
  expect(submittedOfferValues).toEqual({
    price: "15.50",
    availability: "available",
    visibility: "on",
    status: "active",
  });

  const correlationId = randomUUID();
  await page.setExtraHTTPHeaders({ "x-request-id": correlationId });
  await authorizedOffer.getByRole("button", { name: "Salvar oferta" }).click();
  await expect(authorizedOffer.locator(".catalog-form-success")).toContainText("Salvo. Código de atendimento:", { timeout: 20_000 });
  const [guardAndCommandEvents, priceHistory] = await Promise.all([
    fixture.inspectCommercialAudit(correlationId),
    fixture.inspectPriceHistory(await authorizedOffer.locator('input[name="offerId"]').inputValue()),
  ]);
  const guardEvent = guardAndCommandEvents.find((event) => (event as { action?: unknown }).action === "catalog.privileged.step_up") as Record<string, unknown> | undefined;
  const commercialEvent = guardAndCommandEvents.find((event) => (event as { action?: unknown }).action === "catalog.offer.commercial_updated") as Record<string, unknown> | undefined;
  expect(guardAndCommandEvents).toHaveLength(2);
  expect(guardEvent).toMatchObject({
    actor_user_id: fixture.owner.id,
    organization_id: fixture.organizationId,
    establishment_id: fixture.establishmentId,
    branch_id: fixture.branchId,
    action: "catalog.privileged.step_up",
    target_type: "channel_offer",
    outcome: "allow",
    reason_code: "authorized",
    correlation_id: correlationId,
    source: "admin_guard",
  });
  expect(commercialEvent).toMatchObject({
    actor_user_id: fixture.owner.id,
    organization_id: fixture.organizationId,
    establishment_id: fixture.establishmentId,
    branch_id: fixture.branchId,
    action: "catalog.offer.commercial_updated",
    target_type: "channel_offer",
    outcome: "allow",
    correlation_id: correlationId,
    source: "catalog_command",
  });
  expect(priceHistory).toHaveLength(1);
  expect(priceHistory[0]).toMatchObject({ version: 1, currency: "BRL", actor_user_id: fixture.owner.id, correlation_id: correlationId });
  expect((priceHistory[0] as { amount: unknown }).amount).toBe(15.5);
  expect(JSON.stringify([guardEvent, commercialEvent])).not.toMatch(/access.?token|refresh.?token|totp.?secret|totp.?code|promotion|discount/i);
  await page.setExtraHTTPHeaders({});

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => window.localStorage.setItem("theme", value), theme);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Produtos e ofertas" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^((?!dark).)*$/);
    const screenshotDirectory = path.join(process.cwd(), ".engineering", "evidence", "GMZ-IMPL-007", "screenshots");
    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDirectory, `catalog-owner-${testInfo.project.name}-${theme}.png`), fullPage: true });
  }
  await expectAccessible(page);
  expect(await page.locator("body").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  await page.getByLabel("Unidade", { exact: true }).selectOption(fixture.siblingBranchId);
  await page.getByRole("button", { name: "Abrir catálogo" }).click();
  await expect(page.getByLabel("Unidade", { exact: true })).toHaveValue(fixture.siblingBranchId);
  const variantOfferForm = page.locator("form.catalog-offer-create").filter({ has: page.locator(`#new-variant-${fixture.siblingBranchId}-variant`) });
  await variantOfferForm.getByLabel("Variante").selectOption({ label: "Produto canônico E2E · Grande" });
  await variantOfferForm.getByLabel("Canal de venda").selectOption({ label: "Goodz Online" });
  await variantOfferForm.getByLabel("Título nesta oferta (opcional)").fill("Oferta exclusiva da filial irmã");
  await variantOfferForm.getByRole("button", { name: "Criar rascunho" }).click();
  const siblingOffer = page.locator(".catalog-offer-card").filter({ has: page.getByRole("heading", { name: "Grande", exact: true }) });
  await expect(siblingOffer).toBeVisible({ timeout: 20_000 });
  await expect(siblingOffer.getByLabel("Título nesta oferta")).toHaveValue("Oferta exclusiva da filial irmã");
  await expect(page.locator(".catalog-offer-card").filter({ has: page.getByRole("heading", { name: "Produto canônico E2E", exact: true }) })).toHaveCount(0);

  await context.clearCookies();
  await signIn(page, fixture.branchStaff.email, fixture.branchStaff.password);
  await page.goto(`/app/catalog?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  await expect(page.getByRole("heading", { name: "Ofertas da unidade" })).toBeVisible();
  const branchOffer = page.locator(".catalog-offer-card").filter({ has: page.getByRole("heading", { name: "Oferta da unidade principal", exact: true }) });
  await expect(branchOffer).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Produto canônico E2E", exact: true })).toHaveCount(0);
  await expect(page.locator(".catalog-offer-card").filter({ has: page.getByRole("heading", { name: "Grande", exact: true }) })).toHaveCount(0);
  await expect(branchOffer.getByLabel("Título nesta oferta")).toHaveValue("Oferta da unidade principal");
  await expect(branchOffer.locator('input[id^="offer-price-"]')).toHaveCount(0);
  await expect(branchOffer.locator('select[id^="offer-availability-"]')).toHaveCount(0);
  await expect(branchOffer.locator('input[id^="offer-visible-"]')).toHaveCount(0);
  await expect(branchOffer.getByText("BRL 15.50", { exact: true })).toBeVisible();
  await expect(branchOffer.getByText("Disponível", { exact: true })).toBeVisible();
  await expect(branchOffer.getByText("Visibilidade: visível", { exact: true })).toBeVisible();
  await expectAccessible(page);
});
