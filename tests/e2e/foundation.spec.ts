import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

test("foundation shell, runtime health, themes, responsive layout and reduced motion", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Uma base clara para o que vem a seguir." })).toBeVisible();
  await expect(page.getByText("Operacional").first()).toBeVisible();
  await expect(page.locator(".status-card").filter({ hasText: "Supabase local" })).toContainText("Operacional");
  await expect(page.getByText("Sem conexão remota")).toBeVisible();
  await expect(page.getByText("Ainda não iniciado")).toBeVisible();

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
});

async function expectA11y(page: import("@playwright/test").Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}
