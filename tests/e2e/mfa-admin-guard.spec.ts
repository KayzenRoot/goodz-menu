import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  ADMIN_GUARD_TEST_NOW_HEADER,
  ADMIN_GUARD_TEST_SIGNATURE_HEADER,
  signAdminGuardTestTimestamp,
} from "@/lib/supabase/admin-guard-test-clock";
import { invalidTotp, totp } from "./totp";
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

async function enterFreshCode(page: Page, secret: string) {
  const currentCounter = Math.floor(Date.now() / 30_000);
  await expect.poll(() => Math.floor(Date.now() / 30_000), { timeout: 35_000, intervals: [250, 500, 1_000] }).not.toBe(currentCounter);
  return enterCode(page, secret);
}

async function submitProof(page: Page) {
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]));
  await page.getByRole("button", { name: "Executar ação sintética protegida" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
}

const allowedStatus = "A proteção foi validada. Nenhum dado de negócio foi alterado.";
const stepUpStatus = "Verificação adicional necessária para continuar.";
const factorSetupStatus = "Configure novamente o aplicativo autenticador para continuar.";

/**
 * The allowed state renders exactly one success element. Selecting it by its own state class keeps
 * the assertion unambiguous even while the step-up reauthentication status is still mounted, and it
 * proves the allowed state is exclusive rather than merely present.
 */
async function expectAllowed(page: Page) {
  await expect(page.locator(".mfa-status-success")).toHaveText(allowedStatus);
  await expect(page.locator(".mfa-status-success")).toHaveCount(1);
  await expect(page.locator(".mfa-step-up")).toHaveCount(0);
}

async function expectStepUpRequired(page: Page) {
  await expect(page.locator(".mfa-step-up > p.mfa-status:not(.reauth-status)")).toHaveText(stepUpStatus);
  await expect(page.locator(".mfa-status-success")).toHaveCount(0);
}

async function expectNoCredentialQuery(page: Page) {
  const url = new URL(page.url());
  expect(url.searchParams.has("reauth-password")).toBe(false);
  expect(url.searchParams.has("totp-code")).toBe(false);
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

function readVerifiedJwtClaims(accessToken: string): { sub?: unknown; aal?: unknown } {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) throw new Error("payload missing");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; aal?: unknown };
  } catch {
    throw new Error("Local Auth session fixture is unavailable.");
  }
}

async function installServerTrustedClock(page: Page) {
  const secret = process.env.GOODZ_E2E_TEST_SEAM_SECRET;
  if (!secret) throw new Error("Local E2E test clock fixture is unavailable.");

  let timestamp: string | null = null;
  const handler = async (route: Route) => {
    const requestHeaders = { ...route.request().headers() };
    delete requestHeaders[ADMIN_GUARD_TEST_NOW_HEADER];
    delete requestHeaders[ADMIN_GUARD_TEST_SIGNATURE_HEADER];
    if (timestamp) {
      requestHeaders[ADMIN_GUARD_TEST_NOW_HEADER] = timestamp;
      requestHeaders[ADMIN_GUARD_TEST_SIGNATURE_HEADER] = signAdminGuardTestTimestamp(secret, timestamp);
    }
    await route.continue({ headers: requestHeaders });
  };
  await page.route("http://127.0.0.1:3100/**", handler);

  return {
    setNow(nowSeconds: number) {
      timestamp = String(nowSeconds);
    },
    clear() {
      timestamp = null;
    },
    async dispose() {
      await page.unroute("http://127.0.0.1:3100/**", handler);
    },
  };
}

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length }))).toEqual([]);
}

test("local TOTP enrollment, AAL1 denial, verified step-up, branch scope, and live authorization revocation", async ({ page, context }) => {
  test.setTimeout(120_000);
  let secret = "";
  const guardClock = await installServerTrustedClock(page);
  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await submitProof(page);
  await expectStepUpRequired(page);
  await expectAccessible(page);
  await expect.poll(async () => (await context.cookies()).some(({ name }) => name === "goodz-privileged-reauth")).toBe(false);

  await page.goto("/app/security");
  await expect(page.getByRole("heading", { name: "Configure o aplicativo autenticador" })).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Senha para reautenticar").fill("invalid-local-reauthentication");
  await page.getByRole("button", { name: "Confirmar identidade e configurar" }).click();
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Não foi possível configurar a verificação. Tente novamente.");
  await expect(page.getByTestId("mfa-manual-secret")).toHaveCount(0);
  await page.getByLabel("Senha para reautenticar").fill(fixture.authorizedUser.password);
  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await submitProof(page);
  await expectStepUpRequired(page);
  await expect.poll(async () => (await context.cookies()).some(({ name }) => name === "goodz-privileged-reauth")).toBe(false);
  await page.goto("/app/security");
  await expect(page.getByRole("heading", { name: "Configure o aplicativo autenticador" })).toBeVisible();
  await expect(page.getByTestId("mfa-manual-secret")).toHaveCount(0);

  await context.clearCookies();
  await signIn(page, fixture.cancellationUser.email, fixture.cancellationUser.password);
  await page.goto("/app/security");
  await page.getByLabel("Senha para reautenticar").fill(fixture.cancellationUser.password);
  await page.getByRole("button", { name: "Confirmar identidade e configurar" }).click();
  await expect(page.getByRole("img", { name: "QR code para configurar o aplicativo autenticador" })).toBeVisible();
  await expectNoCredentialQuery(page);
  await page.getByLabel("Senha para descartar a configuração").fill(fixture.cancellationUser.password);
  const discardNavigationPromise = page.waitForNavigation({ waitUntil: "domcontentloaded" });
  const discardActionResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]),
  );
  await page.getByRole("button", { name: "Descartar configuração pendente" }).click();
  const discardActionResponse = await discardActionResponsePromise;
  expect(discardActionResponse.ok()).toBe(true);
  await discardNavigationPromise;
  await expect(page.getByRole("heading", { name: "Configure o aplicativo autenticador" })).toBeVisible();
  await expectNoCredentialQuery(page);
  await expect.poll(async () => (await context.cookies()).some(({ name }) => name === "goodz-privileged-reauth")).toBe(false);
  const canceledSession = await readSession(context);
  const canceledProfileResponse = await page.request.get(`${fixture.apiUrl}/auth/v1/user`, {
    headers: { apikey: fixture.anonKey, authorization: `Bearer ${canceledSession.accessToken}` },
  });
  expect(canceledProfileResponse.status()).toBe(200);
  const canceledProfile = await canceledProfileResponse.json() as { factors?: { factor_type?: string; status?: string }[] };
  expect(canceledProfile.factors?.filter(({ factor_type, status }) => factor_type === "totp" && status === "unverified") ?? []).toHaveLength(0);

  await context.clearCookies();
  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await page.goto("/app/security");
  await page.getByLabel("Senha para reautenticar").fill(fixture.authorizedUser.password);
  await page.getByRole("button", { name: "Confirmar identidade e configurar" }).click();
  await expect(page.getByRole("img", { name: "QR code para configurar o aplicativo autenticador" })).toBeVisible();
  await expectNoCredentialQuery(page);
  await expectAccessible(page);
  secret = await readEnrollmentSecret(page);
  await enterFreshCode(page, secret);
  const enrollmentVerifyResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return request.method() === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname);
  });
  await page.getByRole("button", { name: "Confirmar configuração" }).click();
  const enrollmentVerifyResponse = await enrollmentVerifyResponsePromise;
  expect(enrollmentVerifyResponse.ok()).toBe(true);
  await expect(page).toHaveURL(/\/app\/admin-guard$/, { timeout: 15_000 });

  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await expectAccessible(page);
  const auditCorrelationId = randomUUID();
  await page.setExtraHTTPHeaders({ "x-request-id": auditCorrelationId });
  await submitProof(page);
  await expectAllowed(page);
  const durableDecision = await fixture.inspectAdminGuardAudit(auditCorrelationId);
  expect(durableDecision).toEqual({
    event_count: 1,
    event: {
      actor_user_id: fixture.authorizedUser.id,
      organization_id: fixture.organizationId,
      establishment_id: fixture.establishmentId,
      branch_id: fixture.branchId,
      action: "synthetic.privileged.proof",
      target_type: "branch",
      target_id: fixture.branchId,
      outcome: "allow",
      reason_code: "authorized",
      correlation_id: auditCorrelationId,
      source: "admin_guard",
      metadata: { required_permission: "tenant.hierarchy.read" },
    },
  });
  expect(JSON.stringify(durableDecision)).not.toMatch(/access.?token|refresh.?token|authorization|password|totp.?secret|totp.?code/i);
  await page.setExtraHTTPHeaders({});

  await context.clearCookies();
  await signIn(page, fixture.authorizedUser.email, fixture.authorizedUser.password);
  await page.goto(`/app/admin-guard?branch=${fixture.branchId}`);
  await submitProof(page);
  await expectStepUpRequired(page);
  await page.getByLabel("Código do aplicativo autenticador").fill(invalidTotp(secret));
  await page.getByRole("button", { name: "Confirmar etapa adicional" }).click();
  await expect(page.locator("#totp-code-error")).toHaveText("Não foi possível confirmar a verificação. Confira o código e tente novamente.");
  await expectAccessible(page);
  await enterFreshCode(page, secret);
  const verifyResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return request.method() === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname);
  });
  const reloadPromise = page.waitForEvent("load");
  await page.getByRole("button", { name: "Confirmar etapa adicional" }).click();
  const [verifyResponse] = await Promise.all([verifyResponsePromise, reloadPromise]);
  expect(verifyResponse.ok()).toBe(true);
  await expectNoCredentialQuery(page);
  const steppedUpSession = await readSession(context);
  const verifiedClaims = readVerifiedJwtClaims(steppedUpSession.accessToken);
  expect(verifiedClaims.sub).toBe(fixture.authorizedUser.id);
  expect(verifiedClaims.aal).toBe("aal2");
  const branchLookup = await page.request.get(`${fixture.apiUrl}/rest/v1/branches?select=id&id=eq.${fixture.branchId}`, {
    headers: { apikey: fixture.anonKey, authorization: `Bearer ${steppedUpSession.accessToken}` },
  });
  expect(branchLookup.status()).toBe(200);
  expect(await branchLookup.json()).toContainEqual({ id: fixture.branchId });
  await submitProof(page);
  await expectStepUpRequired(page);
  await expect(page.getByLabel("Senha para reautenticar")).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Senha para reautenticar").fill(fixture.authorizedUser.password);
  await page.getByRole("button", { name: "Confirmar identidade" }).click();
  await expect(page.locator(".reauth-status")).toHaveText("Identidade confirmada. Conclua a verificação em duas etapas.");
  await expectNoCredentialQuery(page);
  await submitProof(page);
  await expectAllowed(page);

  await fixture.scopeAuthorizedRoleToBranch();
  await page.locator("#proof-branch").selectOption(fixture.branchId);
  await submitProof(page);
  await expectAllowed(page);
  await page.locator("#proof-branch").selectOption(fixture.siblingBranchId);
  await expect(page.locator("#proof-branch")).toHaveValue(fixture.siblingBranchId);
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await fixture.restoreAuthorizedOrganizationScope();
  await page.locator("#proof-branch").selectOption(fixture.branchId);
  await submitProof(page);
  await expectAllowed(page);

  await fixture.removeHierarchyPermission();
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await fixture.restoreHierarchyPermission();
  await submitProof(page);
  await expectAllowed(page);

  await fixture.suspendAuthorizedMembership();
  await submitProof(page);
  await expect(page.locator("p.auth-error[role='alert']")).toHaveText("Esta unidade não está autorizada para a ação solicitada.");
  await fixture.restoreMembership();
  await submitProof(page);
  await expectAllowed(page);

  guardClock.setNow(Math.floor(Date.now() / 1000) + 301);
  await submitProof(page);
  await expectStepUpRequired(page);
  guardClock.clear();
  await page.getByLabel("Senha para reautenticar").fill(fixture.authorizedUser.password);
  await page.getByRole("button", { name: "Confirmar identidade" }).click();
  await expect(page.locator(".reauth-status")).toHaveText("Identidade confirmada. Conclua a verificação em duas etapas.");
  await enterFreshCode(page, secret);
  const renewedVerifyResponsePromise = page.waitForResponse((response) => {
    const request = response.request();
    return request.method() === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname);
  });
  const renewedReloadPromise = page.waitForEvent("load");
  await page.getByRole("button", { name: "Confirmar etapa adicional" }).click();
  const [renewedVerifyResponse] = await Promise.all([renewedVerifyResponsePromise, renewedReloadPromise]);
  expect(renewedVerifyResponse.ok()).toBe(true);
  await submitProof(page);
  await expectAllowed(page);

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
  await expect(page.locator(".mfa-step-up > p.mfa-status:not(.reauth-status)")).toHaveText(factorSetupStatus);
  await expect(page.locator(".mfa-status-success")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Configurar aplicativo autenticador" })).toBeVisible();
  await expect(page.locator(".mfa-status-success")).toHaveCount(0);
  await expectAccessible(page);
  await guardClock.dispose();
});

test("a real user_metadata tenant, role, AAL, and privilege spoof still cannot pass Admin Guard", async ({ page, context }) => {
  await page.goto("/app/admin-guard");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fadmin-guard$/);

  await signIn(page, fixture.noMembershipUser.email, fixture.noMembershipUser.password);
  const { accessToken } = await readSession(context);
  const response = await page.request.get(`${fixture.apiUrl}/auth/v1/user`, {
    headers: { apikey: fixture.anonKey, authorization: `Bearer ${accessToken}` },
  });
  expect(response.status()).toBe(200);
  const profile = await response.json() as { user_metadata?: Record<string, unknown> };
  expect(profile.user_metadata).toMatchObject({
    tenant_id: fixture.organizationId,
    organization_id: fixture.organizationId,
    role: "owner",
    permissions: ["tenant.hierarchy.read"],
    aal: "aal2",
    privilege: "platform_admin",
    is_admin: true,
  });
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
