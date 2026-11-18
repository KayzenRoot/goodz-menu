import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createSettingsSessionFixture, type SettingsSessionFixture } from "./settings-session-fixture";

let fixture: SettingsSessionFixture;

test.beforeAll(async () => {
  fixture = await createSettingsSessionFixture();
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

test("settings owner flow enforces step-up on sensitive switches and policy locks across hierarchy", async ({ page, isMobile }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, fixture.owner.email, fixture.owner.password);

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Configurações e políticas" })).toBeVisible();
  await expect(page.getByLabel("Organização")).toHaveValue(fixture.organizationId);
  await expect(page.locator("#settings-branch")).toHaveValue(fixture.branchId);
  await expect(page.getByText("Plano ativo: pilot_mvp")).toBeVisible();
  await expectAccessible(page);

  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  // 1. Save standard setting without step-up
  const prepCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Tempo médio de preparo (min)" }) });
  await prepCard.getByLabel("Valor em minutos").fill("35");
  await prepCard.getByRole("button", { name: "Salvar configuração" }).click();
  await expect(prepCard.locator(".catalog-form-success")).toContainText("Configuração salva", { timeout: 20_000 });

  // 2. Sensitive setting without MFA factor demands step-up & factor setup
  const orderingCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Pedidos online ativos" }) });
  await orderingCard.getByLabel("Pedidos online ativos habilitado neste escopo").check();
  await orderingCard.getByRole("button", { name: "Salvar política protegida" }).click();
  await expect(orderingCard.locator(".catalog-form-note")).toContainText("Confirmação em duas etapas necessária", { timeout: 20_000 });
  await expect(orderingCard.locator(".catalog-step-up")).toContainText("Configure um fator autenticador");

  // 3. Enroll TOTP -> save sensitive setting cleanly with fresh AAL2 + reauth proof
  await enrollTotp(page, fixture.owner.password);
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

  // 4. Switch to organization scope and lock prep minutes policy -> verify branch displays lock badge
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

  // Visual screenshot capture & WCAG 2.2 AA verification in light & dark themes
  const screenshotDir = path.join(process.cwd(), "test-results", "visual", "gmz-impl-008");
  await mkdir(screenshotDir, { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => window.localStorage.setItem("theme", value), theme);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Configurações e políticas" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^((?!dark).)*$/);
    await expectAccessible(page);
    await page.screenshot({ path: path.join(screenshotDir, `settings-${testInfo.project.name}-${theme}.png`), fullPage: true });
  }
});

test("settings staff flow enforces read-only operational controls while allowing personal density preference", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signIn(page, fixture.branchStaff.email, fixture.branchStaff.password);

  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Configurações e políticas" })).toBeVisible();

  const orderingCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Pedidos online ativos" }) });
  await expect(orderingCard).toContainText("Somente leitura para o seu papel atual neste escopo.");
  await expect(orderingCard.getByRole("button")).toHaveCount(0);

  // Staff can still save their own user-scoped ui.density_mode preference
  const densitySelect = page.getByLabel("Modo salvo na sua conta");
  await densitySelect.selectOption("compact");
  await page.getByRole("button", { name: "Salvar minha preferência" }).click();
  await expect(page.getByRole("region", { name: /Preferência do operador/ }).locator(".catalog-form-success")).toContainText("Configuração salva", { timeout: 20_000 });
  await expect(page.locator(".settings-page")).toHaveAttribute("data-density", "compact");
  await expectAccessible(page);
});
