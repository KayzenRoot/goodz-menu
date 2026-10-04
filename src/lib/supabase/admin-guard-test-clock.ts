import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_GUARD_TEST_NOW_HEADER = "x-goodz-e2e-now";
export const ADMIN_GUARD_TEST_SIGNATURE_HEADER = "x-goodz-e2e-signature";
const TEST_CLOCK_PURPOSE = "goodz-admin-guard-e2e-clock-v1:";

export type AdminGuardTestClockInput = {
  nodeEnvironment: string | undefined;
  goodzEnvironment: string | undefined;
  host: string | null;
  secret: string | undefined;
  timestampHeader: string | null;
  signatureHeader: string | null;
};

export function signAdminGuardTestTimestamp(secret: string, timestamp: string): string {
  return createHmac("sha256", secret).update(`${TEST_CLOCK_PURPOSE}${timestamp}`).digest("hex");
}

export function resolveAdminGuardTestNowSeconds(input: AdminGuardTestClockInput): number | null {
  if (
    input.nodeEnvironment === "production"
    || input.goodzEnvironment !== "local"
    || !input.secret
    || !input.host
    || !/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/.test(input.host)
  ) return null;

  if (input.timestampHeader === null && input.signatureHeader === null) return null;
  if (
    !input.timestampHeader
    || !/^\d{10}$/.test(input.timestampHeader)
    || !input.signatureHeader
    || !/^[0-9a-f]{64}$/.test(input.signatureHeader)
  ) return Number.NaN;

  const expected = Buffer.from(signAdminGuardTestTimestamp(input.secret, input.timestampHeader), "hex");
  const received = Buffer.from(input.signatureHeader, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return Number.NaN;

  const timestamp = Number(input.timestampHeader);
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : Number.NaN;
}
