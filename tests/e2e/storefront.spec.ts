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

async function captureStorefrontTheme(
  page: Page,
  theme: "light" | "dark",
  headingName: string | RegExp,
  outFile: string,
): Promise<void> {
  await page.evaluate((val) => window.localStorage.setItem("theme", val), theme);
  await page.reload();
  await expect(page.getByRole("heading", { name: headingName })).toBeVisible();
  await assertWcag22AA(page);
  await page.screenshot({ path: outFile, fullPage: true });
}

test("owner publishes storefront and anonymous customer completes online checkout and capability-token tracking", async ({ page, context, isMobile }, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Install Core Web Vitals observers (LCP & CLS)
  await page.addInitScript(() => {
    const win = window as unknown as { __goodzLcpMs?: number; __goodzCls?: number };
    win.__goodzLcpMs = 0;
    win.__goodzCls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          win.__goodzLcpMs = Math.max(win.__goodzLcpMs ?? 0, entry.startTime);
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
          if (!entry.hadRecentInput) {
            win.__goodzCls = (win.__goodzCls ?? 0) + entry.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // Supported in Chromium
    }
  });

  // 1. Owner signs in, enrolls TOTP, configures delivery zone & publishes storefront profile
  await signInWithCredentials(page, fixture.owner.email, fixture.owner.password);
  await enrollSessionTotpFactor(page, fixture.owner.password);

  await page.goto(`/app/delivery?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  const zoneSection = page.getByRole("region", { name: /Zonas de cobertura, taxa e pedido mínimo/ });
  await zoneSection.getByLabel("Nome da zona").fill("Raio Jardins");
  await zoneSection.getByLabel("Bairros atendidos (separados por vírgula)").fill("Jardins, Pinheiros");
  await zoneSection.getByLabel("Taxa de entrega (BRL)").fill("6.50");
  await zoneSection.getByLabel("Pedido mínimo (BRL)").fill("50.00");
  await zoneSection.getByRole("button", { name: /Criar zona de entrega/ }).click();
  await expect(zoneSection.locator(".catalog-form-success")).toBeVisible({ timeout: 20_000 });

  const slug = `bistro-${testInfo.project.name}-${Date.now().toString(36)}`;
  await page.goto(`/app/storefront?organization=${fixture.organizationId}&branch=${fixture.branchId}`);
  await expect(page.getByRole("heading", { name: "Vitrine online e acervo de mídia" })).toBeVisible();
  await assertWcag22AA(page);

  const profileSection = page.getByRole("region", { name: /Perfil público e schema seguro de tema/ });
  await profileSection.getByLabel("Slug público (/menu/slug)").fill(slug);
  await profileSection.getByLabel("Título principal da vitrine").fill("Bistrô Artesanal Jardins");
  await profileSection.getByLabel("Subtítulo / aviso curto").fill("Ingredientes frescos selecionados diariamente");
  await profileSection.getByLabel("Paleta aprovada de tokens").selectOption("terracotta_oven");
  await profileSection.getByRole("button", { name: /Salvar vitrine pública/ }).click();
  await expect(profileSection.locator(".catalog-form-success")).toContainText(`/menu/${slug}`, { timeout: 20_000 });

  // 2. Anonymous customer visits /menu/[slug], warms dev route compile, then verifies CWV budgets (LCP <= 2500ms, CLS <= 0.1) + WCAG 2.2 AA
  await context.clearCookies();
  await page.goto(`/menu/${slug}`);
  await expect(page.getByRole("heading", { name: "Bistrô Artesanal Jardins" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bistrô Artesanal Jardins" })).toBeVisible();
  await assertWcag22AA(page);

  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  const vitals = await page.evaluate(() => {
    const win = window as unknown as { __goodzLcpMs?: number; __goodzCls?: number };
    return { lcpMs: win.__goodzLcpMs ?? 0, cls: win.__goodzCls ?? 0 };
  });
  expect(vitals.lcpMs).toBeLessThanOrEqual(2500);
  expect(vitals.cls).toBeLessThanOrEqual(0.1);

  const screenshotDir = path.join(process.cwd(), "test-results", "visual", "gmz-impl-011");
  await mkdir(screenshotDir, { recursive: true });
  await captureStorefrontTheme(
    page,
    "light",
    "Bistrô Artesanal Jardins",
    path.join(screenshotDir, `storefront-${testInfo.project.name}-light.png`),
  );
  await captureStorefrontTheme(
    page,
    "dark",
    "Bistrô Artesanal Jardins",
    path.join(screenshotDir, `storefront-${testInfo.project.name}-dark.png`),
  );

  // 3. Customer adds 1 item (42.90 < 50.00 min order), sees shortfall gate, adds 2nd item (85.80 + 6.50 = 92.30), and checks out
  await page.getByRole("button", { name: /Adicionar Combo Artesanal Duplo à sacola/ }).click();
  await page.getByLabel("Como deseja receber?").selectOption("own_delivery");
  await expect(page.getByText(/Faltam/)).toContainText("R$ 7,10");
  await expect(page.getByRole("button", { name: /Confirmar pedido/ })).toBeDisabled();

  await page.getByRole("button", { name: /Adicionar Combo Artesanal Duplo à sacola/ }).click();
  await page.getByLabel("Logradouro").fill("Alameda Campinas");
  await page.getByLabel("Seu nome").fill("Mariana Oliveira");
  await page.getByLabel("WhatsApp / Telefone").fill("11966667777");
  await page.getByLabel(/Quero receber novidades/).check();

  const submitBtn = page.getByRole("button", { name: /Confirmar pedido · R\$ 92,30/ });
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  // 4. Redirected to capability-token public tracking URL (/menu/[slug]/orders/[48-hex-token])
  await expect(page).toHaveURL(new RegExp(`/menu/${slug}/orders/[0-9a-f]{48}$`), { timeout: 25_000 });
  await expect(page.getByRole("heading", { name: /Pedido #1001/ })).toBeVisible();
  await expect(page.getByText("Mariana")).toBeVisible();
  await expect(page.getByText("Mariana Oliveira")).toHaveCount(0);
  await expect(page.getByText("11966667777")).toHaveCount(0);
  await expect(page.getByText("R$ 92,30")).toBeVisible();
  await assertWcag22AA(page);

  // 5. Forged capability token fails closed (Zero IDOR)
  await page.goto(`/menu/${slug}/orders/${"0".repeat(48)}`);
  await expect(page.getByRole("heading", { name: "Acompanhamento indisponível" })).toBeVisible();
  await assertWcag22AA(page);
});
