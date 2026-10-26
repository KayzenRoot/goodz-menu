import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test("foundation shell, runtime health, themes, responsive layout and reduced motion", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Uma base clara para o que vem a seguir." })).toBeVisible();
  await expect(page.getByText("Operacional").first()).toBeVisible();
  await expect(page.locator(".status-card").filter({ hasText: "Supabase local" })).toContainText("Operacional");
  const appStatus = page.locator(".status-card").filter({ hasText: "Aplicação web" }).locator('[role="status"]');
  await expect(appStatus).toHaveAttribute("aria-live", "polite");
  await expect(appStatus).toHaveAttribute("aria-atomic", "true");
  await expect(appStatus).toContainText("Aplicação web: Operacional");
  await expect(page.getByText("Sem conexão remota")).toBeVisible();
  await expect(page.getByText("Ainda não iniciado")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Localização atual" })).toBeVisible();

  const healthResponse = await page.request.get("/api/health");
  const health = await healthResponse.json() as { correlationId: string; environment: string };
  expect(healthResponse.status()).toBe(200);
  expect(health.environment).toBe("test");
  expect(healthResponse.headers()["x-correlation-id"]).toBe(health.correlationId);

  const readyResponse = await page.request.get("/api/ready");
  const readyText = await readyResponse.text();
  expect(readyResponse.status()).toBe(200);
  expect(readyText).toContain('"status":"ready"');
  expect(readyText).not.toContain("goodz-e2e-public-key");

  const theme = page.getByRole("combobox", { name: "Tema da interface" });
  await theme.selectOption("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expectA11y(page);

  const evidenceDirectory = path.join(process.cwd(), ".engineering", "evidence", "GMZ-REBOOT-001", "screenshots");
  await mkdir(evidenceDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDirectory, `foundation-${testInfo.project.name}-light.png`),
    fullPage: true,
  });

  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expectA11y(page);
  await page.screenshot({
    path: path.join(evidenceDirectory, `foundation-${testInfo.project.name}-dark.png`),
    fullPage: true,
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedMotionAnimation = await page.locator(".welcome-copy").evaluate((element) => getComputedStyle(element).animationName);
  expect(reducedMotionAnimation).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const viewport = await page.evaluate(() => ({ width: window.innerWidth, bodyWidth: document.body.scrollWidth }));
  expect(viewport.bodyWidth).toBeLessThanOrEqual(viewport.width);

  await page.setViewportSize({ width: 700, height: 900 });
  const tabletViewport = await page.evaluate(() => ({ width: window.innerWidth, bodyWidth: document.body.scrollWidth }));
  expect(tabletViewport.bodyWidth).toBeLessThanOrEqual(tabletViewport.width);
  await expect(page.getByRole("link", { name: "goodz MENU PLATFORM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visão geral" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cardápio.*Em breve/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Pedidos.*Em breve/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Equipe.*Em breve/ })).toBeDisabled();
  await expectA11y(page);
});

test("keyboard users can skip navigation and move focus to the main content", async ({ page }) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-style", "solid");
  await expect(skipLink).toHaveCSS("outline-width", "3px");

  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("theme control keeps a visible focus indicator in keyboard navigation", async ({ page }) => {
  await page.goto("/");

  const theme = page.getByRole("combobox", { name: "Tema da interface" });
  let themeFocused = false;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.keyboard.press("Tab");
    if (await theme.evaluate((element) => element === document.activeElement)) {
      themeFocused = true;
      break;
    }
  }

  expect(themeFocused).toBe(true);
  await expect(theme).toBeFocused();
  await expect(theme).toHaveCSS("outline-style", "solid");
  await expect(theme).toHaveCSS("outline-width", "3px");
});

test("foundation reflows at a 320 CSS pixel viewport without page-level overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");

  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    pageScrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  const overflowSources = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: String(element.getAttribute("class") ?? ""),
          left: Math.round(bounds.left),
          right: Math.round(bounds.right),
          width: Math.round(bounds.width),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflowX: style.overflowX,
          position: style.position,
        };
      })
      .filter((element) => element.right > viewportWidth + 1)
      .sort((left, right) => right.right - left.right)
      .slice(0, 12);
  });

  expect(
    dimensions.pageScrollWidth,
    `Horizontal overflow sources: ${JSON.stringify(overflowSources)}`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth);
  await expect(page.getByRole("heading", { name: "Uma base clara para o que vem a seguir." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Localização atual" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Tema da interface" })).toBeVisible();
  await expectA11y(page);
});

async function expectA11y(page: import("@playwright/test").Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}
