import { describe, expect, it, vi } from "vitest";
import {
  evaluateAdminGuard,
  createAdminGuardAuditEvent,
  hasFreshTotpProof,
  PRIVILEGED_FRESHNESS_WINDOW_SECONDS,
  type AdminGuardDependencies,
} from "@/lib/supabase/admin-guard-policy";

const organizationId = "11111111-1111-4111-8111-111111111111";
const identity = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
const freshClaims = {
  sub: identity.id,
  aal: "aal2",
  amr: [{ method: "password", timestamp: 1_700_000_000 }, { method: "totp", timestamp: 1_700_000_100 }],
};

function dependencies(overrides: Partial<AdminGuardDependencies> = {}): AdminGuardDependencies {
  return {
    readIdentity: vi.fn().mockResolvedValue(identity),
    readVerifiedClaims: vi.fn().mockResolvedValue(freshClaims),
    hasVerifiedTotpFactor: vi.fn().mockResolvedValue(true),
    hasFreshReauthentication: vi.fn().mockResolvedValue(true),
    authorizeResource: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("Goodz Admin Guard policy", () => {
  it("allows verified identity, fresh canonical scope, AAL2 and a verified TOTP factor", async () => {
    await expect(evaluateAdminGuard(dependencies(), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: true });
  });

  it("denies unauthenticated and unverified or mismatched identities", async () => {
    await expect(evaluateAdminGuard(dependencies({ readIdentity: vi.fn().mockResolvedValue(null) }), organizationId)).resolves.toEqual({ allowed: false, reason: "unauthenticated" });
    await expect(evaluateAdminGuard(dependencies({ readVerifiedClaims: vi.fn().mockResolvedValue(null) }), organizationId)).resolves.toEqual({ allowed: false, reason: "identity_unverified" });
    await expect(evaluateAdminGuard(dependencies({ readVerifiedClaims: vi.fn().mockResolvedValue({ ...freshClaims, sub: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }) }), organizationId)).resolves.toEqual({ allowed: false, reason: "identity_unverified" });
  });

  it("denies a client-selected branch unless the fresh canonical RLS query authorizes it", async () => {
    const authorizeResource = vi.fn().mockResolvedValue(false);
    await expect(evaluateAdminGuard(dependencies({ authorizeResource }), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: false, reason: "authorization_denied" });
    expect(authorizeResource).toHaveBeenCalledWith(organizationId);
    await expect(evaluateAdminGuard(dependencies(), "not-a-tenant", 1_700_000_120)).resolves.toEqual({ allowed: false, reason: "invalid_scope" });
  });

  it("denies AAL1, missing or invalidated factors, and factor lookup errors", async () => {
    await expect(evaluateAdminGuard(dependencies({ readVerifiedClaims: vi.fn().mockResolvedValue({ ...freshClaims, aal: "aal1" }) }), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: false, reason: "aal2_required" });
    await expect(evaluateAdminGuard(dependencies({ hasVerifiedTotpFactor: vi.fn().mockResolvedValue(false) }), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: false, reason: "factor_unverified" });
    await expect(evaluateAdminGuard(dependencies({ hasVerifiedTotpFactor: vi.fn().mockResolvedValue(null) }), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: false, reason: "factor_unverified" });
  });

  it("denies AAL2 and a verified factor without a recent independent Auth reauthentication", async () => {
    await expect(evaluateAdminGuard(dependencies({ hasFreshReauthentication: vi.fn().mockResolvedValue(false) }), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: false, reason: "reauthentication_required" });
    await expect(evaluateAdminGuard(dependencies({ hasFreshReauthentication: vi.fn().mockResolvedValue(null) }), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: false, reason: "reauthentication_required" });
  });

  it("requires a recent TOTP AMR timestamp that is the latest authentication method", () => {
    expect(hasFreshTotpProof([{ method: "password", timestamp: 100 }, { method: "totp", timestamp: 200 }], 200)).toBe(true);
    expect(hasFreshTotpProof([{ method: "password", timestamp: 100 }, { method: "totp", timestamp: 200 }], 200 + PRIVILEGED_FRESHNESS_WINDOW_SECONDS)).toBe(true);
    expect(hasFreshTotpProof([{ method: "password", timestamp: 100 }, { method: "totp", timestamp: 200 }], 201 + PRIVILEGED_FRESHNESS_WINDOW_SECONDS)).toBe(false);
    expect(hasFreshTotpProof([{ method: "totp", timestamp: 201 }], 200)).toBe(false);
    expect(hasFreshTotpProof([{ method: "totp", timestamp: 100 }, { method: "password", timestamp: 101 }], 101)).toBe(false);
    expect(hasFreshTotpProof(["totp"], 200)).toBe(false);
    expect(hasFreshTotpProof([{ method: "totp", timestamp: "200" }], 200)).toBe(false);
  });

  it("returns step-up denial for a stale TOTP proof", async () => {
    const claims = { ...freshClaims, amr: [{ method: "password", timestamp: 1_700_000_000 }, { method: "totp", timestamp: 1_700_000_100 }] };
    await expect(evaluateAdminGuard(dependencies({ readVerifiedClaims: vi.fn().mockResolvedValue(claims) }), organizationId, 1_700_000_100 + PRIVILEGED_FRESHNESS_WINDOW_SECONDS + 1)).resolves.toEqual({ allowed: false, reason: "step_up_required" });
    await expect(evaluateAdminGuard(dependencies({
      readVerifiedClaims: vi.fn().mockResolvedValue(claims),
      hasFreshReauthentication: vi.fn().mockResolvedValue(false),
    }), organizationId, 1_700_000_100 + PRIVILEGED_FRESHNESS_WINDOW_SECONDS + 1)).resolves.toEqual({ allowed: false, reason: "step_up_required" });
  });

  it("emits only bounded audit fields and never accepts credential material as audit input", () => {
    const event = createAdminGuardAuditEvent({ allowed: false, reason: "step_up_required" }, "correlation-1");
    expect(event).toEqual({
      event: "goodz.admin_guard.decision",
      action: "synthetic.privileged.proof",
      requiredPermission: "tenant.hierarchy.read",
      outcome: "deny",
      reason: "step_up_required",
      correlationId: "correlation-1",
    });
    expect(JSON.stringify(event)).not.toMatch(/token|totp.?secret|password|identity/i);
  });
});
