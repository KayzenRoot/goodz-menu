import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function signInWithCredentials(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
}

export function computeTotpCode(secret: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = secret.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const character of normalized) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("The local TOTP fixture is unavailable.");
    bits += value.toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)?.map((part) => Number.parseInt(part, 2)) ?? []);
  const counter = Math.floor(now / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return (binary % 1_000_000).toString().padStart(6, "0");
}

export async function assertWcag22AA(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map(({ id, impact, nodes }) => ({ id, impact, count: nodes.length }))).toEqual([]);
}

export async function enrollSessionTotpFactor(page: Page, password: string): Promise<string> {
  await page.goto("/app/security");
  await expect(page.getByRole("heading", { name: "Configure o aplicativo autenticador" })).toBeVisible();
  await page.getByLabel("Senha para reautenticar").fill(password);
  await page.getByRole("button", { name: "Confirmar identidade e configurar" }).click();
  await expect(page.getByRole("img", { name: "QR code para configurar o aplicativo autenticador" })).toBeVisible();
  const secret = await page.getByTestId("mfa-manual-secret").textContent();
  if (!secret) throw new Error("The local TOTP fixture is unavailable.");

  const currentCounter = Math.floor(Date.now() / 30_000);
  await expect.poll(() => Math.floor(Date.now() / 30_000), {
    timeout: 35_000,
    intervals: [250, 500, 1_000],
  }).not.toBe(currentCounter);
  await page.getByLabel("Código do aplicativo autenticador").fill(computeTotpCode(secret));
  const verifyResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Confirmar configuração" }).click();
  const verifyResponse = await verifyResponsePromise;
  expect(verifyResponse.ok()).toBe(true);
  await expect(page).toHaveURL(/\/app\/admin-guard$/, { timeout: 15_000 });
  return secret;
}
