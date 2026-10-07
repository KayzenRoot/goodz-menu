import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createCatalogUiFixture, enrollTotpFor, type CatalogUiFixture } from "./catalog-ui-fixture";
import { totp } from "./totp";

// End-to-end proof of the catalog management surface.
//
// Every test here runs under both Playwright projects, so the whole surface is exercised once at
// 1440x1000 and once at 390x844 with touch. That is the point of the two projects: a catalog form
// that lays out correctly on a desktop column and becomes unreachable on a phone is not done.
//
// The tests within a project run one at a time. They share identities and an archival timeline, and
// two workers rotating the same password or counting the same revisions mid-run would make the
// assertions describe a race rather than the catalog.

test.describe.configure({ mode: "serial" });

// One test in this file waits for an authenticator window to roll before it can confirm a money
// action, and the hook below provisions that factor. The suite default is sized for a click-through;
// this surface needs the longer leash, and says so rather than letting a hook time out quietly.
test.setTimeout(180_000);

test.use({ screenshot: "off", trace: "off", timezoneId: "UTC" });

let fixture: CatalogUiFixture;
let totpSecret: string;
// The channel the first test created. An offer is unique per channel and target, and every run
// reconciles rather than resets, so a creation has to aim at a channel that has never carried one.
let runChannelName: string;

test.beforeAll(async ({ browser }) => {
  fixture = await createCatalogUiFixture();
  // The manager carries no authenticator between runs, so each run enrolls its own. That is what a
  // real operator does, and it means the money proof below is exercised against a factor this run
  // actually configured rather than one left behind by the last.
  totpSecret = await enrollTotpFor(browser, fixture.manager);
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  // A bare rule id is not an actionable failure: the report names the element and the two colours so
  // the fix is in the stylesheet that produced them rather than in a guess about which one it was.
  expect(result.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodes: nodes.map((node) => ({
      target: node.target.join(" "),
      summary: node.failureSummary?.split("\n").slice(0, 2).join(" ") ?? null,
    })),
  }))).toEqual([]);
}

/** The card heading for one named catalog row. Names also appear in labels and in option lists. */
function cardHeading(page: Page, name: string) {
  return page.locator(`li.catalog-card .catalog-card-head strong:text-is("${name}")`);
}

/**
 * The card whose heading is this exact name.
 *
 * The inner match is deliberately written without an ancestor path: Playwright evaluates `has`
 * inside the outer element, so a document-rooted selector on the inner side resolves to nothing.
 */
function cardTitled(page: Page, name: string) {
  return page.locator("li.catalog-card", { has: page.locator(`strong:text-is("${name}")`) });
}

/** The feedback paragraph belonging to one form, so a refusal cannot be confused with a sibling's. */
function formOf(page: Page, labelText: string) {
  return page.getByLabel(labelText).locator("xpath=ancestor::form[1]");
}

async function openDisclosure(page: Page, summary: string) {
  const disclosure = page.locator("details", { has: page.locator(`summary:text-is("${summary}")`) });
  await disclosure.locator("summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  return disclosure;
}

async function submitForm(page: Page, root: ReturnType<typeof page.locator>) {
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]),
  );
  await root.getByRole("button").last().click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
}

/**
 * Confirms the identity the way the console asks for it: password and authenticator code together.
 *
 * The code is typed inside the current 30 second window unless that window has already been spent,
 * which happens when the enrollment earlier in the run used one. A code that has been used is refused,
 * so the proof would fail for a reason that has nothing to do with the catalog.
 */
/**
 * A price derived from the price already on the offer, moved by an exact number of thousandths.
 *
 * The catalog keeps history rather than resetting it, so a second run finds the offer wherever the
 * last one left it. Hard-coding a price would then ask for a change that is not a change, and the
 * command would be right to refuse it. The arithmetic is done on the decimal string itself, with no
 * binary floating point anywhere near it.
 */
function movedPrice(base: string, deltaThousandths: number): string {
  const [whole, fraction = ""] = base.split(".");
  if (!/^\d+$/.test(whole) || !/^\d{1,4}$/.test(fraction)) {
    throw new Error(`Unexpected local price format: ${base}`);
  }
  const scale = BigInt(10_000);
  const total = BigInt(whole) * scale + BigInt(fraction.padEnd(4, "0")) + BigInt(deltaThousandths);
  if (total < BigInt(0)) throw new Error("Unexpected local price format: the derived price is negative.");
  return `${total / scale}.${(total % scale).toString().padStart(4, "0")}`;
}

async function confirmCommercialIdentity(page: Page) {
  const currentCounter = Math.floor(Date.now() / 30_000);
  await expect
    .poll(() => Math.floor(Date.now() / 30_000), { timeout: 35_000, intervals: [250, 500, 1_000] })
    .not.toBe(currentCounter);
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]),
  );
  await page.getByLabel("Senha para reautenticar").fill(fixture.manager.password);
  await page.getByLabel("Código do aplicativo autenticador").fill(totp(totpSecret));
  await page.getByRole("button", { name: "Confirmar identidade" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  await expect(page.locator(".catalog-confirmation-ok")).toBeVisible();
}

test("a catalog manager lists and searches only their own tenant, and edits structural truth", async ({ page }) => {
  await signIn(page, fixture.manager.email, fixture.manager.password);
  await page.goto("/app/catalog");
  await expect(page.getByRole("heading", { name: "Produtos, categorias e ofertas por canal" })).toBeVisible();
  await expect(cardHeading(page, fixture.seededCategoryName)).toBeVisible();
  await expect(cardHeading(page, fixture.seededProductName)).toBeVisible();
  await expect(cardHeading(page, fixture.seededChannelName)).toBeVisible();
  await expect(cardHeading(page, fixture.seededOfferTitle)).toBeVisible();
  await expectAccessible(page);

  // The seeded offer renders its money as the exact decimal text that is persisted, never as a
  // binary float reformatted for display.
  const baseline = await fixture.readOfferState();
  const offerCard = cardTitled(page, fixture.seededOfferTitle);
  await expect(offerCard).toContainText(`${baseline.base_price} BRL`);
  await expect(offerCard).toContainText(`revisão ${baseline.price_revision}`);

  // A foreign tenant's category is not merely absent from the list; searching for it yields nothing
  // and cannot be told apart from a category that does not exist.
  await page.getByLabel("Buscar no catálogo").fill(fixture.foreignCategoryName);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Nenhum item de catálogo visível")).toBeVisible();
  await expect(page.getByText(fixture.foreignCategoryName)).toHaveCount(0);
  await expectAccessible(page);

  await page.goto("/app/catalog");

  // Structural creation: category, product, variant and channel. None of these are money actions,
  // so none of them asks for a stronger confirmation.
  const categoryName = `E2E ${Date.now()} Torradas`;
  const categoryCreator = await openDisclosure(page, "Nova categoria");
  await categoryCreator.getByLabel("Nome da nova categoria").fill(categoryName);
  await submitForm(page, categoryCreator.locator("form"));
  await expect(categoryCreator.locator(".catalog-feedback-ok")).toHaveText("Categoria criada.");
  await expect(categoryCreator.getByLabel("Nome da nova categoria")).toHaveValue("");
  await expect(categoryCreator.getByLabel("Ordem da nova categoria")).toHaveValue("0");
  await expect(cardHeading(page, categoryName)).toBeVisible();

  const productName = `E2E ${Date.now()} Pão de fermentação natural`;
  const productCreator = await openDisclosure(page, "Novo produto");
  await productCreator.getByLabel("Nome do novo produto").fill(productName);
  await submitForm(page, productCreator.locator("form"));
  await expect(productCreator.locator(".catalog-feedback-ok")).toHaveText("Produto criado.");
  await expect(cardHeading(page, productName)).toBeVisible();

  const variantName = `E2E ${Date.now()} Pão escuro`;
  const variantCreator = await openDisclosure(page, "Nova variante");
  const variantProduct = variantCreator.getByLabel("Produto da nova variante");
  await variantProduct.focus();
  await variantProduct.selectOption({ label: productName });
  await expect(variantProduct).toBeFocused();
  await variantCreator.getByLabel("Nome da nova variante").fill(variantName);
  await submitForm(page, variantCreator.locator("form"));
  await expect(variantCreator.locator(".catalog-feedback-ok")).toHaveText("Variante criada.");
  await expect(cardHeading(page, variantName)).toBeVisible();

  const channelName = `E2E ${Date.now()} Canal próprio`;
  runChannelName = channelName;
  const channelCreator = await openDisclosure(page, "Novo canal");
  await channelCreator.getByLabel("Chave do novo canal").fill(`e2e-${Date.now()}-proprio`);
  await channelCreator.getByLabel("Nome exibido do novo canal").fill(channelName);
  await submitForm(page, channelCreator.locator("form"));
  await expect(channelCreator.locator(".catalog-feedback-ok")).toHaveText("Canal criado.");
  await expect(cardHeading(page, channelName)).toBeVisible();
  await expectAccessible(page);

  // Editing is keyed to the entity it edits, so renaming the new category cannot silently retarget
  // the seeded one.
  const renamed = `${categoryName} (renomeada)`;
  const categoryForm = formOf(page, `Nome de ${categoryName}`);
  await categoryForm.getByLabel(`Nome de ${categoryName}`).fill(renamed);
  await submitForm(page, categoryForm);
  await expect(categoryForm.locator(".catalog-feedback-ok")).toHaveText("Categoria atualizada.");
  await expect(categoryForm.getByLabel(`Nome de ${renamed}`)).toHaveValue(renamed);
  await expect(cardHeading(page, renamed)).toBeVisible();
  const unrelatedCategoryForm = formOf(page, `Nome de ${fixture.seededCategoryName}`);
  await expect(unrelatedCategoryForm.locator("output")).toHaveText("");

  // Archival is material and audited, and it is not a price change, so it stays permission-bound.
  const productCard = cardTitled(page, productName);
  await productCard.getByRole("button", { name: "Arquivar" }).click();
  await expect(productCard).toContainText("Arquivado");
});

test("a money action is refused without a fresh confirmation, and a priced change is reconstructable afterwards", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, fixture.manager.email, fixture.manager.password);
  await page.goto("/app/catalog");

  // The standing state explains the refusal before the operator hits it.
  await expect(page.getByRole("heading", { name: /Confirme a identidade antes de alterar preço/ })).toBeVisible();
  await expectAccessible(page);

  // The price history is never rewritten by a run, so the submission restates the price that is
  // actually stored rather than a value this test happened to pick when it was written.
  const before = await fixture.readOfferState();
  const priceForm = formOf(page, `Preço base de ${fixture.seededOfferTitle}`);
  await priceForm.getByLabel(`Preço base de ${fixture.seededOfferTitle}`).fill(before.base_price);
  await priceForm.getByLabel(`Preço promocional de ${fixture.seededOfferTitle}`).fill("");
  await submitForm(page, priceForm);
  await expect(priceForm.locator(".catalog-feedback-failed")).toHaveText(
    "Confirme a identidade novamente para alterar preço ou disponibilidade.",
  );

  // The refusal is not cosmetic: nothing moved, and no revision or audit event was invented.
  expect(await fixture.readOfferState()).toEqual(before);
  await expect(formOf(page, `Preço base de ${fixture.seededOfferTitle}`).getByLabel(`Preço base de ${fixture.seededOfferTitle}`)).toHaveValue(before.base_price);

  // A refused price is still refused for the right reason once the identity is confirmed, which is
  // what separates "you are not allowed" from "that number is not a price".
  await confirmCommercialIdentity(page);

  const confirmedForm = formOf(page, `Preço base de ${fixture.seededOfferTitle}`);
  await confirmedForm.getByLabel(`Preço base de ${fixture.seededOfferTitle}`).fill("-1");
  await confirmedForm.getByLabel(`Preço promocional de ${fixture.seededOfferTitle}`).fill("");
  await submitForm(page, confirmedForm);
  await expect(confirmedForm.locator(".catalog-feedback-invalid")).toHaveText(
    "Informe um valor decimal positivo com até 4 casas.",
  );
  await expect(confirmedForm.getByLabel(`Preço base de ${fixture.seededOfferTitle}`)).toHaveValue("-1");
  await expect(confirmedForm.getByLabel(`Preço promocional de ${fixture.seededOfferTitle}`)).toHaveValue("");

  await confirmedForm.getByLabel(`Preço base de ${fixture.seededOfferTitle}`).fill("7.5000");
  await confirmedForm.getByLabel(`Preço promocional de ${fixture.seededOfferTitle}`).fill("9.9000");
  await submitForm(page, confirmedForm);
  await expect(confirmedForm.locator(".catalog-feedback-invalid")).toHaveText(
    "O preço promocional deve ser menor que o preço base.",
  );

  // Four decimal places survive the round trip exactly: the interface edits a decimal string, so the
  // value shown back is the value that was compared and stored.
  const targetBase = movedPrice(before.base_price, 12_345);
  const targetPromo = movedPrice(targetBase, -2_345);
  await confirmedForm.getByLabel(`Preço base de ${fixture.seededOfferTitle}`).fill(targetBase);
  await confirmedForm.getByLabel(`Preço promocional de ${fixture.seededOfferTitle}`).fill(targetPromo);
  await submitForm(page, confirmedForm);
  await expect(confirmedForm.locator(".catalog-feedback-ok")).toHaveText("Preço atualizado.");

  const repriced = await fixture.readOfferState();
  expect(repriced.base_price).toBe(targetBase);
  expect(repriced.promotional_price).toBe(targetPromo);
  expect(repriced.price_revision).toBe(before.price_revision + 1);
  expect(repriced.timeline_rows).toBe(before.timeline_rows + 1);
  expect(repriced.open_revisions).toBe(1);
  expect(repriced.audit_rows).toBe(before.audit_rows + 1);

  // The prior truth is still reachable: the earlier revision keeps its own row and is closed at the
  // moment the new one opens, rather than being overwritten.
  await page.goto("/app/catalog");
  const offerCard = cardTitled(page, fixture.seededOfferTitle);
  await expect(offerCard).toContainText(`${targetBase} BRL`);
  await expect(offerCard).toContainText(`revisão ${repriced.price_revision}`);
  const timeline = offerCard.locator("details", { has: page.locator("summary", { hasText: "Histórico de preços" }) });
  await timeline.locator("summary").click();
  const rows = timeline.locator("tbody tr");
  await expect(rows).toHaveCount(repriced.timeline_rows);
  const openRows = timeline.locator("tbody tr", { hasText: "atual" });
  await expect(openRows).toHaveCount(1);
  // The revision is its own cell, so it is read as its own cell rather than as a word somewhere in
  // the row: a row that merely contained the digits would pass a looser assertion either way.
  await expect(openRows.locator("td").first()).toHaveText(String(repriced.price_revision));
  await expect(openRows).toContainText(`${targetBase} BRL`);
  await expect(openRows).toContainText(targetPromo);
  const closedRow = timeline
    .locator("tbody tr")
    .filter({ has: page.locator(`td:text-is("${repriced.price_revision - 1}")`) });
  await expect(closedRow).toHaveCount(1);
  await expect(closedRow).toContainText(`${before.base_price} BRL`);
  await expect(closedRow).not.toContainText("atual");
  const timelineInstants = await fixture.readLatestTimelineInstants();
  expect(timelineInstants).toHaveLength(2);
  await expect(openRows.locator("td").nth(5)).toHaveText(
    new Date(timelineInstants[0].effective_from).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
  );
  await expect(closedRow.locator("td").nth(6)).toHaveText(
    new Date(timelineInstants[1].effective_to!).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
  );
  await expectAccessible(page);

  // Availability and material visibility are the other two privileged commercial acts. Each one moves
  // to the value it is not already holding, for the same reason the price does.
  const nextAvailability = repriced.availability === "available" ? "unavailable" : "available";
  const nextVisibility = repriced.visibility === "visible" ? "hidden" : "visible";
  const availabilityForm = formOf(page, `Disponibilidade de ${fixture.seededOfferTitle}`);
  await availabilityForm.getByLabel(`Disponibilidade de ${fixture.seededOfferTitle}`).selectOption(nextAvailability);
  await submitForm(page, availabilityForm);
  await expect(availabilityForm.locator(".catalog-feedback-ok")).toHaveText("Disponibilidade atualizada.");

  const visibilityForm = formOf(page, `Visibilidade de ${fixture.seededOfferTitle}`);
  await visibilityForm.getByLabel(`Visibilidade de ${fixture.seededOfferTitle}`).selectOption(nextVisibility);
  await submitForm(page, visibilityForm);
  await expect(visibilityForm.locator(".catalog-feedback-ok")).toHaveText("Visibilidade atualizada.");

  const finalState = await fixture.readOfferState();
  expect(finalState.availability).toBe(nextAvailability);
  expect(finalState.visibility).toBe(nextVisibility);
  expect(finalState.price_revision).toBe(repriced.price_revision + 2);
  expect(finalState.timeline_rows).toBe(repriced.timeline_rows + 2);
  expect(finalState.open_revisions).toBe(1);
  expect(finalState.audit_rows).toBe(repriced.audit_rows + 2);

  // An offer is created with its price, so creating one follows the same confirmation. It aims at the
  // seeded variant on the channel this run created: an offer is unique per channel and target, every
  // run reconciles rather than resets, and the seeded channel has carried an offer since the first run
  // of this file. Aiming anywhere else would collide with the suite's own history instead of proving
  // a creation.
  await page.goto("/app/catalog");
  const offerCreator = await openDisclosure(page, "Nova oferta");
  const channelSelect = offerCreator.getByLabel("Canal da nova oferta");
  const initialChannel = await channelSelect.inputValue();
  await channelSelect.focus();
  await channelSelect.selectOption({ label: runChannelName });
  await expect(channelSelect).toBeFocused();
  await offerCreator.getByLabel("Variante da nova oferta").selectOption({ label: fixture.seededVariantName });
  await offerCreator.getByLabel("Produto da nova oferta").selectOption("");
  await offerCreator.getByLabel("Preço base da nova oferta").fill("-3");
  const chosen = {
    channel: await offerCreator.getByLabel("Canal da nova oferta").inputValue(),
    variant: await offerCreator.getByLabel("Variante da nova oferta").inputValue(),
  };
  await submitForm(page, offerCreator.locator("form"));
  await expect(offerCreator.locator(".catalog-feedback-invalid")).toHaveText(
    "Informe um valor decimal positivo com até 4 casas.",
  );
  // A refused submission leaves what the operator chose exactly where they left it: the browser resets
  // the form before the action runs, and a select that does not survive that reset would quietly turn
  // the next attempt into a submission with no target at all.
  await expect(offerCreator.getByLabel("Canal da nova oferta")).toHaveValue(chosen.channel);
  await expect(offerCreator.getByLabel("Variante da nova oferta")).toHaveValue(chosen.variant);
  await expect(offerCreator.getByLabel("Preço base da nova oferta")).toHaveValue("-3");
  await offerCreator.getByLabel("Preço base da nova oferta").fill("12.3400");
  await submitForm(page, offerCreator.locator("form"));
  await expect(offerCreator.locator(".catalog-feedback-ok")).toHaveText("Oferta criada.");
  await expect(channelSelect).toHaveValue(initialChannel);
  await expect(offerCreator.getByLabel("Variante da nova oferta")).toHaveValue("");
  await expectAccessible(page);
});

test("a catalog reader and a foreign tenant manager are shown no controls and no foreign rows", async ({ page, context }) => {
  // A member of the same tenant holding only catalog.read sees the catalog and nothing else: the
  // money controls are absent, not present and refused.
  await signIn(page, fixture.reader.email, fixture.reader.password);
  await page.goto("/app/catalog");
  await expect(cardHeading(page, fixture.seededProductName)).toBeVisible();
  await expect(page.getByText("Nova categoria")).toHaveCount(0);
  await expect(page.getByText("Novo produto")).toHaveCount(0);
  await expect(page.getByText("Novo canal")).toHaveCount(0);
  await expect(page.getByText("Nova oferta")).toHaveCount(0);
  await expect(page.getByLabel(/^Preço base de/)).toHaveCount(0);
  await expect(page.getByLabel(/^Disponibilidade de/)).toHaveCount(0);
  await expect(page.getByLabel(/^Visibilidade de/)).toHaveCount(0);
  await expect(page.getByLabel(/^Salvar apresentação$/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Confirme a identidade antes de alterar preço/ })).toHaveCount(0);
  await expectAccessible(page);

  // The reader's own membership carries catalog.read and nothing else, so a hand-rolled request that
  // skips the interface is refused by the contract rather than by the form.
  await context.clearCookies();
  await signIn(page, fixture.foreignManager.email, fixture.foreignManager.password);
  await page.goto("/app/catalog");
  await expect(cardHeading(page, fixture.foreignCategoryName)).toBeVisible();
  await expect(cardHeading(page, fixture.seededProductName)).toHaveCount(0);
  await expect(cardHeading(page, fixture.seededCategoryName)).toHaveCount(0);
  await expect(cardHeading(page, fixture.seededOfferTitle)).toHaveCount(0);
  await page.goto(`/app/catalog?search=${encodeURIComponent(fixture.seededProductName)}`);
  await expect(page.getByText("Nenhum item de catálogo visível")).toBeVisible();
  await expectAccessible(page);

  // An anonymous visitor is not offered the surface at all.
  await context.clearCookies();
  await page.goto("/app/catalog");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fcatalog$/);
});

test.describe("dark theme", () => {
  test.use({ colorScheme: "dark" });

  test("the catalog surface stays accessible when the theme inverts", async ({ page }) => {
    await signIn(page, fixture.manager.email, fixture.manager.password);
    await page.goto("/app/catalog");
    await expect(page.getByRole("heading", { name: "Produtos, categorias e ofertas por canal" })).toBeVisible();

    // The theme is a class on the document root, so waiting for it proves the inverted palette is
    // actually applied before anything is measured.
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectAccessible(page);

    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(canvas).not.toBe("rgb(244, 245, 240)");
  });
});
