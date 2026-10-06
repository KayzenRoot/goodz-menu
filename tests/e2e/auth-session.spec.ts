import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAuthSessionFixture, type AuthSessionFixture } from "./auth-session-fixture";

const genericCredentialError = "Não foi possível entrar. Confira os dados e tente novamente.";
let fixture: AuthSessionFixture;

test.beforeAll(async () => {
  fixture = await createAuthSessionFixture();
});

test.afterAll(async () => {
  await fixture?.cleanup();
});

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/**
 * The logout control is a client component: its handler only exists once React has hydrated the
 * server-rendered markup. Clicking before that point is a silent no-op, so the click must be gated
 * on the handler actually being bound rather than on the element merely being visible.
 */
async function waitForHydratedLogoutControl(page: Page) {
  await page.waitForFunction(
    () => {
      const control = document.querySelector("button.auth-logout");
      return control instanceof HTMLButtonElement && Object.keys(control).some((key) => key.startsWith("__reactProps$"));
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function expectAccessible(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations, JSON.stringify(accessibility.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length })))).toEqual([]);
}

test("unauthenticated tenant entry fails closed and login has responsive accessible states", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app?next=https://attacker.invalid");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  await expect(page.getByRole("heading", { name: "Acesse seu espaço de trabalho" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expectAccessible(page);

  const screenshotDirectory = path.join(process.cwd(), ".engineering", "evidence", "GMZ-IMPL-004", "screenshots");
  await mkdir(screenshotDirectory, { recursive: true });
  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(isMobile ? 390 : 1440);
  expect(await page.locator("body").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  for (const theme of ["light", "dark"] as const) {
    await page.getByRole("combobox", { name: "Tema de aparência" }).selectOption(theme);
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^((?!dark).)*$/);
    await page.screenshot({ path: path.join(screenshotDirectory, `login-${theme}-${isMobile ? "mobile" : "desktop"}.png`), fullPage: true });
  }
});

test("credential errors are generic and successful login shows only RLS-authorized memberships", async ({ page }) => {
  await page.goto("/login?next=%2F%2Fattacker.invalid");
  await signIn(page, fixture.authorizedUser.email, "incorrect-password");
  await expect(page.locator(".auth-error[role='alert']")).toHaveText(genericCredentialError);
  const knownUserError = await page.locator(".auth-error[role='alert']").textContent();

  await page.getByLabel("E-mail").fill(`unknown-${fixture.authorizedUser.email}`);
  await page.getByLabel("Senha").fill("incorrect-password");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator(".auth-error[role='alert']")).toHaveText(genericCredentialError);
  await expect(page.locator(".auth-error[role='alert']")).toHaveText(knownUserError!);

  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText(fixture.organizationName, { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.secondaryOrganizationName, { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.foreignOrganizationName, { exact: true })).toHaveCount(0);
  await expectAccessible(page);

  const screenshotDirectory = path.join(process.cwd(), ".engineering", "evidence", "GMZ-IMPL-004", "screenshots");
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDirectory, `tenant-entry-${test.info().project.name}.png`), fullPage: true });
});

test("a signed-in identity without membership sees the safe no-access state", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, fixture.noMembershipUser.email, fixture.noMembershipUser.password);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Ainda não há um espaço de trabalho disponível" })).toBeVisible();
  await expect(page.getByText(fixture.organizationName, { exact: true })).toHaveCount(0);
  await expect(page.getByText(fixture.secondaryOrganizationName, { exact: true })).toHaveCount(0);
  await expect(page.getByText(fixture.foreignOrganizationName, { exact: true })).toHaveCount(0);
  await expectAccessible(page);
});

test("membership suspension removes tenant visibility on the next server evaluation", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, fixture.suspendedUser.email, fixture.suspendedUser.password);
  await expect(page.getByText(fixture.organizationName, { exact: true })).toBeVisible();

  await fixture.suspendMembership();
  await page.reload();

  await expect(page.getByRole("heading", { name: "Ainda não há um espaço de trabalho disponível" })).toBeVisible();
  await expect(page.getByText(fixture.organizationName, { exact: true })).toHaveCount(0);
});

test("logout and malformed session cookies cannot retain protected tenant access", async ({ page, context }) => {
  await page.goto("/login");
  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await expect(page.getByText(fixture.organizationName, { exact: true })).toBeVisible();

  const sessionCookie = (await context.cookies()).find(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
  expect(sessionCookie).toBeDefined();
  await context.clearCookies();
  await context.addCookies([{ ...sessionCookie!, value: "malformed-session-cookie" }]);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  await expect.poll(async () => (await context.cookies()).some(({ name }) => name.includes("-auth-token"))).toBe(false);

  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await expect(page.getByText(fixture.organizationName, { exact: true })).toBeVisible();
  await waitForHydratedLogoutControl(page);

  const logoutResponsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/auth/v1/logout",
    { timeout: 15_000 },
  );
  await page.getByRole("button", { name: "Sair" }).click();
  const logoutResponse = await logoutResponsePromise;
  expect(logoutResponse.ok(), "The real Supabase logout request must succeed.").toBe(true);

  await expect(page.locator(".auth-logout-error")).toHaveCount(0);
  await expect(page).toHaveURL(/\/login$/);
  await expect.poll(async () => (await context.cookies()).some(({ name }) => name.includes("-auth-token"))).toBe(false);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  await expect(page.getByText(fixture.organizationName, { exact: true })).toHaveCount(0);
});

test("an Auth-revoked session cannot retain protected tenant access", async ({ page, context }) => {
  await page.goto("/login");
  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await expect(page.getByText(fixture.organizationName, { exact: true })).toBeVisible();

  const authCookies = (await context.cookies()).filter(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  const cookieBaseName = authCookies[0]?.name.replace(/\.\d+$/, "");
  const sessionCookieValue = authCookies
    .filter(({ name }) => name === cookieBaseName || name.startsWith(`${cookieBaseName}.`))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map(({ value }) => value)
    .join("");
  const encodedSession = sessionCookieValue.startsWith("base64-") ? sessionCookieValue.slice(7) : sessionCookieValue;

  let session: { access_token?: unknown };
  try {
    const base64 = encodedSession.replace(/-/g, "+").replace(/_/g, "/");
    session = JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as { access_token?: unknown };
  } catch {
    throw new Error("The local Auth session cookie could not be decoded.");
  }
  expect(typeof session.access_token).toBe("string");

  const revoked = await page.request.post(`${fixture.apiUrl}/auth/v1/logout?scope=global`, {
    headers: { apikey: fixture.anonKey, authorization: `Bearer ${session.access_token as string}` },
    timeout: 10_000,
  });
  expect(revoked.status()).toBe(204);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  await expect(page.getByText(fixture.organizationName, { exact: true })).toHaveCount(0);
});
