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


test("status cards isolate malformed health responses from readiness state", async ({ page }) => {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{not-valid-json",
    });
  });
  await page.route("**/api/ready", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ready",
        dependencies: { supabase: { status: "available" } },
      }),
    });
  });

  await page.goto("/");

  const applicationCard = page.locator(".status-card").filter({ hasText: "Aplicação" });
  const supabaseCard = page.locator(".status-card").filter({ hasText: "Supabase local" });

  await expect(applicationCard).toContainText("Verificando");
  await expect(supabaseCard).toContainText("Disponível");
});


test("status cards keep the newest refresh when an older request finishes late", async ({ page }) => {
  let healthCalls = 0;
  let readyCalls = 0;

  await page.route("**/api/health", async (route) => {
    healthCalls += 1;
    if (healthCalls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 16_500));
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ status: "not_ok", environment: "local", runtime: "docker", revision: "test" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", environment: "local", runtime: "docker", revision: "test" }),
    });
  });

  await page.route("**/api/ready", async (route) => {
    readyCalls += 1;
    if (readyCalls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 16_500));
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: "not_ready",
          dependencies: { supabase: { status: "unavailable", reason: "timeout" } },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ready",
        dependencies: { supabase: { status: "available" } },
      }),
    });
  });

  await page.goto("/");

  const applicationCard = page.locator(".status-card").filter({ hasText: "Aplicação" });
  const supabaseCard = page.locator(".status-card").filter({ hasText: "Supabase local" });

  await expect(applicationCard).toContainText("Respondendo", { timeout: 16_000 });
  await expect(supabaseCard).toContainText("Disponível", { timeout: 16_000 });

  await page.waitForTimeout(2_000);

  await expect(applicationCard).toContainText("Respondendo");
  await expect(supabaseCard).toContainText("Disponível");
});
