import { describe, expect, it } from "vitest";
import {
  ADMIN_GUARD_TEST_NOW_HEADER,
  ADMIN_GUARD_TEST_SIGNATURE_HEADER,
  resolveAdminGuardTestNowSeconds,
  signAdminGuardTestTimestamp,
} from "@/lib/supabase/admin-guard-test-clock";

const secret = "a-local-e2e-secret-that-is-never-persisted";
const timestamp = "1791086400";

function input(overrides: Record<string, unknown> = {}) {
  return {
    nodeEnvironment: "development",
    goodzEnvironment: "local",
    host: "127.0.0.1:3100",
    secret,
    timestampHeader: timestamp,
    signatureHeader: signAdminGuardTestTimestamp(secret, timestamp),
    ...overrides,
  };
}

describe("local Admin Guard E2E clock seam", () => {
  it("accepts only the test runner's signed timestamp on a local non-production server", () => {
    expect(resolveAdminGuardTestNowSeconds(input())).toBe(Number(timestamp));
    expect(ADMIN_GUARD_TEST_NOW_HEADER).toBe("x-goodz-e2e-now");
    expect(ADMIN_GUARD_TEST_SIGNATURE_HEADER).toBe("x-goodz-e2e-signature");
  });

  it("ignores all clock input in production and outside the local host", () => {
    expect(resolveAdminGuardTestNowSeconds(input({ nodeEnvironment: "production" }))).toBeNull();
    expect(resolveAdminGuardTestNowSeconds(input({ goodzEnvironment: "production" }))).toBeNull();
    expect(resolveAdminGuardTestNowSeconds(input({ host: "example.com" }))).toBeNull();
  });

  it("fails closed on missing or invalid test signatures", () => {
    expect(Number.isNaN(resolveAdminGuardTestNowSeconds(input({ signatureHeader: "00" })))).toBe(true);
    expect(Number.isNaN(resolveAdminGuardTestNowSeconds(input({ timestampHeader: "1791086401" })))).toBe(true);
    expect(Number.isNaN(resolveAdminGuardTestNowSeconds(input({ signatureHeader: null })))).toBe(true);
  });
});
