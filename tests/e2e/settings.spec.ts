import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  assertWcag22AA,
  enrollSessionTotpFactor,
  signInWithCredentials,
} from "./e2e-auth-helpers";
import { createSettingsSessionFixture, type SettingsSessionFixture } from "./settings-session-fixture";

let fixture: SettingsSessionFixture;

test.beforeAll(async () => {
  fixture = await createSettingsSessionFixture();
});

test.afterAll(async () => {
  await fixture?.cleanup();
});

test("settings owner flow enforces step-up on sensitive switches and policy locks across hierarchy", async ({ page, isMobile }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInWithCredentials(page, fixture.owner.email, fixture.owner.password);

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Configurações e políticas" })).toBeVisible();
  await expect(page.getByLabel("Organização")).toHaveValue(fixture.organizationId);
  await expect(page.locator("#settings-branch")).toHaveValue(fixture.branchId);
  await expect(page.getByText("Plano ativo: pilot_mvp")).toBeVisible();
  await assertWcag22AA(page);

  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  const prepCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Tempo médio de preparo (min)" }) });
  await prepCard.getByLabel("Valor em minutos").fill("35");
  await prepCard.getByRole("button", { name: "Salvar configuração" }).click();
  await expect(prepCard.locator(".catalog-form-success")).toContainText("Configuração salva", { timeout: 20_000 });

  const orderingCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Pedidos online ativos" }) });
  await orderingCard.getByLabel("Pedidos online ativos habilitado neste escopo").check();
  await orderingCard.getByRole("button", { name: "Salvar política protegida" }).click();
  await expect(orderingCard.locator(".catalog-form-note")).toContainText("Confirmação em duas etapas necessária", { timeout: 20_000 });
  await expect(orderingCard.locator(".catalog-step-up")).toContainText("Configure um fator autenticador");

  await enrollSessionTotpFactor(page, fixture.owner.password);
  await page.goto(`/app/settings?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  const orderingCardAfterMfa = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Pedidos online ativos" }) });
  await orderingCardAfterMfa.getByLabel("Pedidos online ativos habilitado neste escopo").check();
  await orderingCardAfterMfa.getByRole("button", { name: "Salvar política protegida" }).click();
  const savedFeedback = orderingCardAfterMfa.locator(".catalog-form-success");
  await expect(savedFeedback).toContainText("Configuração salva", { timeout: 20_000 });

  const feedbackText = (await savedFeedback.textContent()) ?? "";
  const correlationMatch = feedbackText.match(/Código:\s*([0-9a-f-]{36})/i);
  expect(correlationMatch?.[1]).toBeTruthy();
  const auditRows = await fixture.inspectSettingsAudit(correlationMatch![1]!);
  expect(auditRows.length).toBeGreaterThanOrEqual(2);

  await page.goto(`/app/settings?organization=${fixture.organizationId}&branch=${fixture.branchId}&scope=organization`);
  const orgPrepCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Tempo médio de preparo (min)" }) });
  await orgPrepCard.getByLabel("Valor em minutos").fill("22");
  await orgPrepCard.getByLabel(/Travar política na organização/).check();
  await orgPrepCard.getByRole("button", { name: "Salvar política protegida" }).click();
  await expect(orgPrepCard.locator(".catalog-form-success")).toContainText("Configuração salva", { timeout: 20_000 });

  await page.goto(`/app/settings?organization=${fixture.organizationId}&branch=${fixture.branchId}&scope=branch`);
  const lockedBranchPrepCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Tempo médio de preparo (min)" }) });
  await expect(lockedBranchPrepCard.locator(".settings-lock-badge")).toContainText("Travado por: Organização");
  await expect(lockedBranchPrepCard.getByRole("button", { name: "Salvar configuração" })).toHaveCount(0);

  const screenshotDir = path.join(process.cwd(), "test-results", "visual", "gmz-impl-008");
  await mkdir(screenshotDir, { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => window.localStorage.setItem("theme", value), theme);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Configurações e políticas" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^((?!dark).)*$/);
    await assertWcag22AA(page);
    await page.screenshot({ path: path.join(screenshotDir, `settings-${testInfo.project.name}-${theme}.png`), fullPage: true });
  }
});

test("settings staff flow enforces read-only operational controls while allowing personal density preference", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInWithCredentials(page, fixture.branchStaff.email, fixture.branchStaff.password);

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Configurações e políticas" })).toBeVisible();

  const orderingCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Pedidos online ativos" }) });
  await expect(orderingCard).toContainText("Somente leitura para o seu papel atual neste escopo.");
  await expect(orderingCard.getByRole("button")).toHaveCount(0);

  const densitySelect = page.getByLabel("Modo salvo na sua conta");
  await densitySelect.selectOption("compact");
  await page.getByRole("button", { name: "Salvar minha preferência" }).click();
  await expect(page.getByRole("region", { name: /Preferência do operador/ }).locator(".catalog-form-success")).toContainText("Configuração salva", { timeout: 20_000 });
  await expect(page.locator(".settings-page")).toHaveAttribute("data-density", "compact");
  await assertWcag22AA(page);
});
