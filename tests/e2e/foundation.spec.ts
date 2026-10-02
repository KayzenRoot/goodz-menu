import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("foundation shell stays responsive, themed, reduced-motion aware and accessible", async ({ page, isMobile }, testInfo) => {
  const evidencePath = path.join(process.cwd(), ".engineering", "evidence", "GMZ-IMPL-001", "screenshots");
  await mkdir(evidencePath, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Um bom começo/ })).toBeVisible();
  await expect(page.getByText("Foundation Preview")).toBeVisible();

  const healthResponse = await page.request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  const health = await healthResponse.json();
  expect(health.status).toBe("ok");
  expect(healthResponse.headers()["x-request-id"]).toBe(health.correlationId);

  const readyResponse = await page.request.get("/api/ready");
  expect(readyResponse.status()).toBe(200);
  const ready = await readyResponse.json();
  expect(ready.status).toBe("ready");
  expect(ready.dependencies.supabase.status).toBe("available");
  expect(ready).not.toHaveProperty("error");

  for (const theme of ["light", "dark"] as const) {
    const picker = page.getByRole("combobox", { name: "Tema de aparência" });
    await picker.selectOption(theme);
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^((?!dark).)*$/);
    await page.screenshot({ path: path.join(evidencePath, `${theme}-${isMobile ? "mobile" : "desktop"}.png`), fullPage: true });
  }

  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  const documentWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewport!.width);

  await expect(page.locator(".app-frame")).toHaveAttribute("data-reduced-motion", "true");
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length })))).toEqual([]);

  if (isMobile) {
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    await expect(page.getByRole("navigation", { name: "Navegação da prévia" })).toBeVisible();
  }
  expect(testInfo.project.name).toContain(isMobile ? "mobile" : "desktop");
});

test("feedback examples remain clearly labeled as previews", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exibir exemplo de Erro" }).click();
  await expect(page.getByRole("status")).toContainText("Exemplo de erro recuperável.");
  await expect(page.getByText("EXEMPLO", { exact: true })).toBeVisible();
});
