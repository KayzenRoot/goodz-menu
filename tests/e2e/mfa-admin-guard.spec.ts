import { createHmac } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createAuthSessionFixture, type AuthSessionFixture } from "./auth-session-fixture";

test.use({ screenshot: "off", trace: "off" });

let fixture: AuthSessionFixture;

test.beforeAll(async () => {
  fixture = await createAuthSessionFixture();
});

test.afterAll(async () => {
  await fixture?.cleanup();
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app$/);
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

function invalidTotp(secret: string): string {
  const now = Date.now();
  const validWindowCodes = new Set([-90, -60, -30, 0, 30, 60, 90].map((offset) => totp(secret, now + offset)));
  for (let candidate = 0; candidate < 1_000_000; candidate += 1) {
    const code = candidate.toString().padStart(6, "0");
    if (!validWindowCodes.has(code)) return code;
  }
  throw new Error("Local TOTP fixture is unavailable.");
}

async function readEnrollmentSecret(page: Page) {
  const secret = await page.getByTestId("mfa-manual-secret").textContent();
  if (!secret) throw new Error("The local TOTP fixture is unavailable.");
  return secret;
}

async function enterCode(page: Page, secret: string) {
  const code = totp(secret);
  await page.getByLabel("Código do aplicativo autenticador").fill(code);
  return code;
}

async function enterFreshCode(page: Page, secret: string, previousCode: string) {
  await expect.poll(() => totp(secret), { timeout: 35_000, intervals: [250, 500, 1_000] }).not.toBe(previousCode);
  return enterCode(page, secret);
}

async function submitProof(page: Page) {
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]));
  await page.getByRole("button", { name: "Executar ação sintética protegida" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
}

async function readSession(context: BrowserContext) {
  const authCookies = (await context.cookies()).filter(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  const cookieName = authCookies[0]?.name.replace(/\.\d+$/, "");
  if (!cookieName) throw new Error("Local Auth session fixture is unavailable.");
  const encoded = authCookies
    .filter(({ name }) => name === cookieName || name.startsWith(`${cookieName}.`))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map(({ value }) => value)
    .join("");
  try {
    const sessionValue = encoded.startsWith("base64-") ? encoded.slice(7) : encoded;
    const session = JSON.parse(Buffer.from(sessionValue, "base64url").toString("utf8")) as { access_token?: string };
    if (typeof session.access_token !== "string") throw new Error("missing token");
    return { accessToken: session.access_token };
  } catch {
    throw new Error("Local Auth session fixture is unavailable.");
  }
}

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length }))).toEqual([]);
}

test("local TOTP enrollment, AAL1 denial, verified step-up, branch scope, and live authorization revocation", async ({ page, context }) => {
  let secret = "";
  let lastTotpCode = "";
  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("Verificação adicional necessária");
  await expectAccessible(page);

  await page.goto("/app/security");
  await expect(page.getByRole("heading", { name: "Configure o aplicativo autenticador" })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Configurar aplicativo autenticador" }).click();
  await expect(page.getByRole("img", { name: "QR code para configurar o aplicativo autenticador" })).toBeVisible();
  await expectAccessible(page);
  secret = await readEnrollmentSecret(page);
  lastTotpCode = await enterCode(page, secret);
  await page.getByRole("button", { name: "Confirmar configuração" }).click();
  await expect(page).toHaveURL(/\/app\/admin-guard$/);

  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await expectAccessible(page);
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("A proteção foi validada");

  await context.clearCookies();
  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("Verificação adicional necessária");
  await page.getByLabel("Código do aplicativo autenticador").fill(invalidTotp(secret));
  await page.getByRole("button", { name: "Confirmar etapa adicional" }).click();
  await expect(page.locator("#totp-code-error")).toHaveText("Não foi possível confirmar a verificação. Confira o código e tente novamente.");
  await expectAccessible(page);
  await enterFreshCode(page, secret, lastTotpCode);
  const verifyResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return request.method() === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname);
  });
  const reloadPromise = page.waitForEvent("load");
  await page.getByRole("button", { name: "Confirmar etapa adicional" }).click();
  const [verifyResponse] = await Promise.all([verifyResponsePromise, reloadPromise]);
  expect(verifyResponse.ok()).toBe(true);
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("A proteção foi validada");

  await fixture.scopeAuthorizedRoleToBranch();
  await page.locator("#proof-branch").selectOption(fixture.branchId);
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("A proteção foi validada");
  await page.locator("#proof-branch").selectOption(fixture.siblingBranchId);
  await expect(page.locator("#proof-branch")).toHaveValue(fixture.siblingBranchId);
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await fixture.restoreAuthorizedOrganizationScope();
  await page.locator("#proof-branch").selectOption(fixture.branchId);
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("A proteção foi validada");

  await fixture.removeHierarchyPermission();
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await fixture.restoreHierarchyPermission();
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("A proteção foi validada");

  await fixture.suspendAuthorizedMembership();
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await fixture.restoreMembership();
  await submitProof(page);
  await expect(page.getByRole("status")).toContainText("A proteção foi validada");

  await fixture.revokeMembership();
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await fixture.restoreMembership();

  const { accessToken } = await readSession(context);
  const authUserResponse = await page.request.get(`${fixture.apiUrl}/auth/v1/user`, {
    headers: { apikey: fixture.anonKey, authorization: `Bearer ${accessToken}` },
  });
  expect(authUserResponse.status(), "Local Auth user profile must remain available for the signed-in user.").toBe(200);
  const authUser = await authUserResponse.json() as { factors?: { id?: string; factor_type?: string; status?: string }[] };
  const factorId = authUser.factors?.find(({ factor_type, status }) => factor_type === "totp" && status === "verified")?.id;
  expect(typeof factorId).toBe("string");
  const removal = await page.request.delete(`${fixture.apiUrl}/auth/v1/factors/${factorId}`, {
    headers: { apikey: fixture.anonKey, authorization: `Bearer ${accessToken}` },
  });
  expect(removal.ok()).toBe(true);
  await submitProof(page);
  await expect(page.getByRole("status")).toHaveText("Configure novamente o aplicativo autenticador para continuar.");
  await expect(page.getByRole("link", { name: "Configurar aplicativo autenticador" })).toBeVisible();
  await expect(page.locator(".mfa-status-success")).toHaveCount(0);
  await expectAccessible(page);
});

test("membership and permission negatives cannot be supplied by user metadata or page input", async ({ page }) => {
  await page.goto("/app/admin-guard");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fadmin-guard$/);

  await signIn(page, fixture.noMembershipUser.email, fixture.noMembershipUser.password);
  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(fixture.noPermissionUser.email);
  await page.getByLabel("Senha").fill(fixture.noPermissionUser.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await expectAccessible(page);
});
