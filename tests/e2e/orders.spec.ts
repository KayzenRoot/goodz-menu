import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
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

test("orders staff queue progresses pickup order and owner reverses handoff with Admin Guard", async ({ page, context, isMobile }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInWithCredentials(page, fixture.branchStaff.email, fixture.branchStaff.password);

  await page.goto("/app/orders");
  await expect(page.getByRole("heading", { name: "Fila de pedidos" })).toBeVisible();
  await expect(page.getByText("ATIVO (monitoramento de fila obrigatório)")).toBeVisible();
  await assertWcag22AA(page);

  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  // 1. Staff registers a pickup order
  const intakeSection = page.getByRole("region", { name: /Registrar pedido assistido/ });
  const customerLabel = `Helena Fila ${testInfo.project.name}`;
  await intakeSection.getByLabel("Nome do cliente").fill(customerLabel);
  await intakeSection.getByLabel("Telefone / WhatsApp").fill("11988881234");
  await intakeSection.getByLabel("Quantidade").fill("2");
  await intakeSection.getByRole("button", { name: "Registrar pedido na fila" }).click();
  await expect(intakeSection.locator(".catalog-form-success")).toContainText("Registrado.", { timeout: 20_000 });

  const orderCard = page.locator("article.orders-card").filter({ has: page.getByRole("heading", { name: customerLabel }) });
  await expect(orderCard).toBeVisible({ timeout: 20_000 });
  await expect(orderCard).toContainText("R$ 85,80");

  // 2. Staff advances lifecycle placed -> accepted -> preparing -> ready_for_pickup -> completed
  await orderCard.getByRole("button", { name: "Aceitar pedido" }).click();
  await expect(orderCard).toContainText("Aceito", { timeout: 20_000 });

  await orderCard.getByRole("button", { name: "Iniciar preparo" }).click();
  await expect(orderCard).toContainText("Em preparo", { timeout: 20_000 });

  await orderCard.getByRole("button", { name: "Marcar pronto p/ retirada" }).click();
  await expect(orderCard).toContainText("Pronto p/ retirada", { timeout: 20_000 });

  // Staff records in-person handoff payment collection (note: reversed/disputed options hidden for staff)
  const handoffDetails = orderCard.locator("details.orders-details-box").filter({ hasText: "Registrar recebimento presencial" });
  await handoffDetails.locator("summary").click();
  await expect(handoffDetails.locator("option[value='reversed']")).toHaveCount(0);
  await handoffDetails.getByRole("button", { name: "Registrar recebimento" }).click();
  await expect(handoffDetails.locator(".catalog-form-success")).toContainText("Registrado.", { timeout: 20_000 });

  await orderCard.getByRole("button", { name: "Concluir pedido" }).click();
  await page.getByRole("tab", { name: "Concluídos" }).click();
  await expect(orderCard).toContainText("Concluído", { timeout: 20_000 });

  // 3. Owner signs in, enrolls TOTP, and reverses handoff payment with Admin Guard step-up
  await context.clearCookies();
  await signInWithCredentials(page, fixture.owner.email, fixture.owner.password);
  await enrollSessionTotpFactor(page, fixture.owner.password);

  await page.goto(`/app/orders?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  await page.getByRole("tab", { name: "Concluídos" }).click();
  const ownerOrderCard = page.locator("article.orders-card").filter({ has: page.getByRole("heading", { name: customerLabel }) });
  await expect(ownerOrderCard).toBeVisible({ timeout: 20_000 });

  const ownerHandoff = ownerOrderCard.locator("details.orders-details-box").filter({ hasText: "Registrar recebimento presencial" });
  await ownerHandoff.locator("summary").click();
  await ownerHandoff.getByLabel("Resultado do recebimento").selectOption("reversed");
  await ownerHandoff.getByLabel("Justificativa obrigatória").fill("Estorno presencial comprovado");
  await ownerHandoff.getByRole("button", { name: "Registrar com Admin Guard" }).click();
  const reversalFeedback = ownerHandoff.locator(".catalog-form-success");
  await expect(reversalFeedback).toContainText("Registrado.", { timeout: 20_000 });

  const feedbackText = (await reversalFeedback.textContent()) ?? "";
  const correlationMatch = feedbackText.match(/Código:\s*([0-9a-f-]{36})/i);
  expect(correlationMatch?.[1]).toBeTruthy();
  const auditRows = await fixture.inspectOrdersAudit(correlationMatch![1]!);
  expect(auditRows.length).toBeGreaterThanOrEqual(2);

  // 4. Visual & WCAG 2.2 AA verification in light and dark themes
  const screenshotDir = path.join(process.cwd(), "test-results", "visual", "gmz-impl-009");
  await mkdir(screenshotDir, { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => window.localStorage.setItem("theme", value), theme);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Fila de pedidos" })).toBeVisible();
    await page.getByRole("tab", { name: "Todos" }).click();
    await assertWcag22AA(page);
    await page.screenshot({ path: path.join(screenshotDir, `orders-${testInfo.project.name}-${theme}.png`), fullPage: true });
  }
});
