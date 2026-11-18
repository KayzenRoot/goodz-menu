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

async function capturePrivacyTheme(
  page: Page,
  theme: "light" | "dark",
  outFile: string,
): Promise<void> {
  await page.evaluate((val) => window.localStorage.setItem("theme", val), theme);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Privacidade, retenção e direitos do titular" })).toBeVisible();
  await assertWcag22AA(page);
  await page.screenshot({ path: outFile, fullPage: true });
}

test("pilot onboarding smoke: storefront checkout consent, staff order completion, and Admin-Guard LGPD export & anonymization", async ({ page, browser, isMobile }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  // 1. Owner signs in, enrolls TOTP (AAL2 + fresh reauth), and publishes online storefront
  await signInWithCredentials(page, fixture.owner.email, fixture.owner.password);
  await enrollSessionTotpFactor(page, fixture.owner.password);

  const slug = `pilot-${testInfo.project.name}-${Date.now().toString(36)}`;
  await page.goto(`/app/storefront?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  const profileSection = page.getByRole("region", { name: /Perfil público e schema seguro de tema/ });
  await profileSection.getByLabel("Slug público (/menu/slug)").fill(slug);
  await profileSection.getByLabel("Título principal da vitrine").fill("Bistrô Piloto Produção");
  await profileSection.getByRole("button", { name: /Salvar vitrine pública/ }).click();
  await expect(profileSection.locator(".catalog-form-success")).toContainText(`/menu/${slug}`, { timeout: 20_000 });

  // 2. Separate browser context for Anonymous Customer -> places order with marketing opt-in
  const peerContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const peerPage = await peerContext.newPage();
  try {
    await peerPage.goto(`/menu/${slug}`);
    await expect(peerPage.getByRole("heading", { name: "Bistrô Piloto Produção" })).toBeVisible();
    await peerPage.reload();
    await expect(peerPage.getByRole("heading", { name: "Bistrô Piloto Produção" })).toBeVisible();

    await peerPage.getByRole("button", { name: /Adicionar Combo Artesanal Duplo à sacola/ }).click();
    await expect(peerPage.getByRole("heading", { name: "Sua sacola (1)" })).toBeVisible();
    await peerPage.getByRole("button", { name: /Adicionar Combo Artesanal Duplo à sacola/ }).click();
    await expect(peerPage.getByRole("heading", { name: "Sua sacola (2)" })).toBeVisible();

    const customerName = `Carolina LGPD ${testInfo.project.name}`;
    await peerPage.getByLabel("Seu nome").fill(customerName);
    await peerPage.getByLabel("WhatsApp / Telefone").fill("11944443333");
    await peerPage.getByLabel(/Quero receber novidades e ofertas/).check();
    await peerPage.getByRole("button", { name: /Confirmar pedido/ }).click();

    await expect(peerPage).toHaveURL(new RegExp(`/menu/${slug}/orders/[0-9a-f]{48}$`), { timeout: 30_000 });
    const trackingUrl = peerPage.url();

    // 3. Owner opens /app/privacy -> verifies active-order guard blocks premature anonymization
    await page.goto(`/app/privacy?organization=${fixture.organizationId}`);
    await expect(page.getByRole("heading", { name: "Privacidade, retenção e direitos do titular" })).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(isMobile ? 390 : 1440);
    expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

    const subjectCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: customerName }) });
    await expect(subjectCard).toBeVisible({ timeout: 20_000 });
    await expect(subjectCard).toContainText("Opt-in ativo");
    await expect(subjectCard).toContainText("Concedido (marketing_communications) via storefront_checkout");

    await subjectCard.getByRole("button", { name: "Anonimizar dados pessoais" }).click();
    await expect(subjectCard.locator(".catalog-form-error")).toContainText("pedido em andamento", { timeout: 20_000 });

    // 4. Branch staff signs in on peerPage -> denied on /app/privacy, then completes order + handoff payment on /app/orders
    await signInWithCredentials(peerPage, fixture.branchStaff.email, fixture.branchStaff.password);
    await peerPage.goto(`/app/privacy?organization=${fixture.organizationId}`);
    await expect(peerPage.getByRole("heading", { name: "Permissão de privacidade necessária" })).toBeVisible();

    await peerPage.goto(`/app/orders?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
    const orderCard = peerPage.locator("article.orders-card").filter({ has: peerPage.getByRole("heading", { name: customerName }) });
    await expect(orderCard).toBeVisible({ timeout: 20_000 });

    await orderCard.getByRole("button", { name: "Aceitar pedido" }).click();
    await expect(orderCard).toContainText("Aceito", { timeout: 20_000 });
    await orderCard.getByRole("button", { name: "Iniciar preparo" }).click();
    await expect(orderCard).toContainText("Em preparo", { timeout: 20_000 });
    await orderCard.getByRole("button", { name: "Marcar pronto p/ retirada" }).click();
    await expect(orderCard).toContainText("Pronto p/ retirada", { timeout: 20_000 });

    const handoffBox = orderCard.locator("details.orders-details-box").filter({ hasText: "Registrar recebimento presencial" });
    await handoffBox.locator("summary").click();
    await handoffBox.getByRole("button", { name: "Registrar recebimento" }).click();
    await expect(handoffBox.locator(".catalog-form-success")).toContainText("Registrado.", { timeout: 20_000 });

    await orderCard.getByRole("button", { name: "Concluir pedido" }).click();
    await peerPage.getByRole("tab", { name: "Concluídos" }).click();
    await expect(orderCard).toContainText("Concluído", { timeout: 20_000 });

    // 5. Visual & WCAG 2.2 AA verification on /app/privacy (Light & Dark, Desktop & Mobile)
    const screenshotDir = path.join(process.cwd(), "test-results", "visual", "gmz-impl-012");
    await mkdir(screenshotDir, { recursive: true });
    await capturePrivacyTheme(
      page,
      "light",
      path.join(screenshotDir, `privacy-${testInfo.project.name}-light.png`),
    );
    await capturePrivacyTheme(
      page,
      "dark",
      path.join(screenshotDir, `privacy-${testInfo.project.name}-dark.png`),
    );

    // 6. Owner exports LGPD JSON package, then anonymizes customer PII while preserving financial total
    const refreshedCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: customerName }) });
    await refreshedCard.getByRole("button", { name: "Exportar pacote LGPD (JSON)" }).click();
    const exportPre = refreshedCard.locator(".privacy-export-pre");
    await expect(exportPre).toContainText(customerName, { timeout: 20_000 });
    await expect(exportPre).toContainText("marketing_communications");

    await refreshedCard.getByLabel("Motivo da anonimização LGPD").fill("Solicitação formal Art. 18 LGPD");
    await refreshedCard.getByRole("button", { name: "Anonimizar dados pessoais" }).click();

    const anonCard = page.locator("article.catalog-card").filter({ has: page.getByRole("heading", { name: "Titular Anonimizado (LGPD)" }) });
    await expect(anonCard).toBeVisible({ timeout: 20_000 });
    await expect(anonCard).toContainText("Anonimizado LGPD");
    await expect(anonCard).toContainText("Revogado (marketing_communications) via privacy_console");

    // 7. Verify completed order retains exact R$ 85,80 financial total with scrubbed PII, and public capability token is revoked
    await page.goto(`/app/orders?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
    await page.getByRole("tab", { name: "Concluídos" }).click();
    const completedAnonOrder = page.locator("article.orders-card").filter({ has: page.getByRole("heading", { name: "Titular Anonimizado (LGPD)" }) });
    await expect(completedAnonOrder).toBeVisible({ timeout: 20_000 });
    await expect(completedAnonOrder).toContainText("R$ 85,80");

    await peerContext.clearCookies();
    await peerPage.goto(trackingUrl);
    await expect(peerPage.getByRole("heading", { name: "Acompanhamento indisponível" })).toBeVisible();
  } finally {
    await peerContext.close();
  }
});
