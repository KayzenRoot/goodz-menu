import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  assertWcag22AA,
  enrollSessionTotpFactor,
  signInWithCredentials,
} from "./e2e-auth-helpers";
import { createOrdersSessionFixture, type OrdersSessionFixture } from "./orders-session-fixture";

let fixture: OrdersSessionFixture;

test.beforeAll(async () => {
  fixture = await createOrdersSessionFixture();
});

test.afterAll(async () => {
  await fixture?.cleanup();
});

async function verifyThemeAndScreenshot(
  page: Page,
  theme: "light" | "dark",
  screenshotPath: string,
): Promise<void> {
  await page.evaluate((value) => window.localStorage.setItem("theme", value), theme);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Entrega própria e despacho" })).toBeVisible();
  await page.getByRole("tab", { name: "Todas" }).click();
  await assertWcag22AA(page);
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

test("owner creates Admin-Guard-protected delivery zone and staff completes own-delivery dispatch", async ({ page, context, isMobile }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  // 1. Owner signs in without MFA first -> saving zone triggers Admin Guard step-up prompt
  await signInWithCredentials(page, fixture.owner.email, fixture.owner.password);
  await page.goto(`/app/delivery?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  await expect(page.getByRole("heading", { name: "Entrega própria e despacho" })).toBeVisible();
  await assertWcag22AA(page);

  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  const zoneSection = page.getByRole("region", { name: /Zonas de cobertura, taxa e pedido mínimo/ });
  const zoneName = `Zona Jardins ${testInfo.project.name}`;
  await zoneSection.getByLabel("Nome da zona").fill(zoneName);
  await zoneSection.getByLabel("Bairros atendidos (separados por vírgula)").fill("Jardins, Pinheiros");
  await zoneSection.getByLabel("Taxa de entrega (BRL)").fill("7.50");
  await zoneSection.getByLabel("Pedido mínimo (BRL)").fill("60.00");
  await zoneSection.getByRole("button", { name: /Criar zona de entrega/ }).click();
  await expect(zoneSection.locator(".catalog-form-note")).toBeVisible({ timeout: 20_000 });
  await expect(zoneSection.locator(".catalog-step-up")).toBeVisible();

  // 2. Owner enrolls TOTP (AAL2 + fresh reauth) and creates the delivery zone
  await enrollSessionTotpFactor(page, fixture.owner.password);
  await page.goto(`/app/delivery?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  await zoneSection.getByLabel("Nome da zona").fill(zoneName);
  await zoneSection.getByLabel("Bairros atendidos (separados por vírgula)").fill("Jardins, Pinheiros");
  await zoneSection.getByLabel("Taxa de entrega (BRL)").fill("7.50");
  await zoneSection.getByLabel("Pedido mínimo (BRL)").fill("60.00");
  await zoneSection.getByRole("button", { name: /Criar zona de entrega/ }).click();

  const zoneSuccess = zoneSection.locator(".catalog-form-success");
  await expect(zoneSuccess).toContainText("Operação registrada e auditada com sucesso (v1)", { timeout: 20_000 });
  const zoneText = (await zoneSuccess.textContent()) ?? "";
  const zoneCorrelation = zoneText.match(/Código:\s*([0-9a-f-]{36})/i)?.[1];
  expect(zoneCorrelation).toBeTruthy();
  const zoneAudits = await fixture.inspectOrdersAudit(zoneCorrelation!);
  expect(zoneAudits.length).toBeGreaterThanOrEqual(2);

  // 3. Branch staff signs in, attempts own_delivery below minimum (1 x 42.90 < 60.00 -> rejected), then places valid order (2 x 42.90 + 7.50 = 93.30)
  await context.clearCookies();
  await signInWithCredentials(page, fixture.branchStaff.email, fixture.branchStaff.password);
  await page.goto(`/app/orders?organization=${fixture.organizationId}&branch=${fixture.branchId}`);

  const intake = page.getByRole("region", { name: /Registrar pedido assistido/ });
  const customerName = `Rafael Entrega ${testInfo.project.name}`;
  await intake.getByLabel("Nome do cliente").fill(customerName);
  await intake.getByLabel("Telefone / WhatsApp").fill("11977778888");
  await intake.getByLabel("Modalidade de atendimento").selectOption("own_delivery");
  await intake.getByLabel("Zona de entrega própria").selectOption({ label: `${zoneName} · Taxa R$ 7,50 · Mín. R$ 60,00` });
  await intake.getByLabel("Logradouro").fill("Alameda Santos");
  await intake.getByLabel("Bairro").fill("Jardins");
  await intake.getByLabel("Quantidade").fill("1");
  await intake.getByRole("button", { name: "Registrar pedido na fila" }).click();
  await expect(intake.locator(".catalog-form-error")).toContainText("pedido mínimo da zona", { timeout: 20_000 });

  await intake.getByRole("button", { name: "Nova chave de pedido" }).click();
  await intake.getByLabel("Nome do cliente").fill(customerName);
  await intake.getByLabel("Telefone / WhatsApp").fill("11977778888");
  await intake.getByLabel("Logradouro").fill("Alameda Santos");
  await intake.getByLabel("Bairro").fill("Jardins");
  await intake.getByLabel("Quantidade").fill("2");
  await intake.getByRole("button", { name: "Registrar pedido na fila" }).click();
  await expect(intake.locator(".catalog-form-success")).toContainText("Registrado.", { timeout: 20_000 });

  // 4. Staff opens /app/delivery, confirms zone-write form is hidden for staff, and advances dispatch to delivered
  await page.goto(`/app/delivery?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  await expect(page.getByText(/Somente proprietários ou administradores/)).toBeVisible();

  const dispatchCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: new RegExp(customerName) }) });
  await expect(dispatchCard).toBeVisible({ timeout: 20_000 });
  await expect(dispatchCard).toContainText("R$ 93,30");

  await dispatchCard.getByRole("button", { name: "Marcar pronto p/ despacho" }).click();
  await expect(dispatchCard).toContainText("Pronto p/ despacho", { timeout: 20_000 });

  await dispatchCard.getByLabel(/Identificação do entregador próprio/).fill("Moto 03 · Diego");
  await dispatchCard.getByRole("button", { name: "Atribuir entregador" }).click();
  await expect(dispatchCard).toContainText("Entregador atribuído", { timeout: 20_000 });

  await dispatchCard.getByRole("button", { name: "Registrar saída p/ entrega" }).click();
  await expect(dispatchCard).toContainText("Saiu p/ entrega", { timeout: 20_000 });

  await dispatchCard.getByRole("button", { name: "Confirmar entrega concluída" }).click();
  await page.getByRole("tab", { name: "Entregues" }).click();
  await expect(dispatchCard).toContainText("Entregue", { timeout: 20_000 });

  // 5. Visual & WCAG 2.2 AA verification in light and dark themes
  const screenshotDir = path.join(process.cwd(), "test-results", "visual", "gmz-impl-010");
  await mkdir(screenshotDir, { recursive: true });
  await verifyThemeAndScreenshot(page, "light", path.join(screenshotDir, `delivery-${testInfo.project.name}-light.png`));
  await verifyThemeAndScreenshot(page, "dark", path.join(screenshotDir, `delivery-${testInfo.project.name}-dark.png`));
});
