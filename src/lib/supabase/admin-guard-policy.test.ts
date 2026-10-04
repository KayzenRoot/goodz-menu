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
    persistAuditDecision: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Goodz Admin Guard policy", () => {
  it("allows verified identity, fresh canonical scope, AAL2 and a verified TOTP factor", async () => {
    await expect(evaluateAdminGuard(dependencies(), organizationId, 1_700_000_120)).resolves.toEqual({ allowed: true });
  });

  it("fails closed when durable audit persistence fails for a would-be allow", async () => {
    const persistAuditDecision = vi.fn().mockRejectedValue(new Error("database details must not escape"));
    const guardedDependencies = { ...dependencies(), persistAuditDecision } as unknown as AdminGuardDependencies;

    await expect(evaluateAdminGuard(guardedDependencies, organizationId, 1_700_000_120)).resolves.toEqual({
      allowed: false,
      reason: "audit_unavailable",
    });
    expect(persistAuditDecision).toHaveBeenCalledWith({ allowed: true }, identity, organizationId);
  });

  it("returns audit_unavailable when audit persistence aborts a would-be allow", async () => {
    const persistAuditDecision = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const guardedDependencies = { ...dependencies(), persistAuditDecision } as unknown as AdminGuardDependencies;

    await expect(evaluateAdminGuard(guardedDependencies, organizationId, 1_700_000_120)).resolves.toEqual({
      allowed: false,
      reason: "audit_unavailable",
    });
    expect(persistAuditDecision).toHaveBeenCalledWith({ allowed: true }, identity, organizationId);
  });

  it("keeps an authorization denial denied when writing its audit event fails", async () => {
    const persistAuditDecision = vi.fn().mockRejectedValue(new Error("database details must not escape"));
    const guardedDependencies = {
      ...dependencies({ authorizeResource: vi.fn().mockResolvedValue(false) }),
      persistAuditDecision,
    } as unknown as AdminGuardDependencies;

    await expect(evaluateAdminGuard(guardedDependencies, organizationId, 1_700_000_120)).resolves.toEqual({
      allowed: false,
      reason: "authorization_denied",
    });
    expect(persistAuditDecision).toHaveBeenCalledWith({ allowed: false, reason: "authorization_denied" }, identity, organizationId);
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
    const buildEvent = createAdminGuardAuditEvent as unknown as (...args: unknown[]) => unknown;
    const actorUserId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const branchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const event = buildEvent(
      { allowed: false, reason: "step_up_required" },
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      {
        actorUserId,
        resourceId: branchId,
        scope: {
          organizationId,
          establishmentId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          branchId,
        },
      },
    );
    expect(event).toEqual({
      actor_user_id: actorUserId,
      organization_id: organizationId,
      establishment_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      branch_id: branchId,
      action: "synthetic.privileged.proof",
      target_type: "branch",
      target_id: branchId,
      outcome: "deny",
      reason_code: "step_up_required",
      correlation_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      source: "admin_guard",
      metadata: { required_permission: "tenant.hierarchy.read" },
    });
    expect(JSON.stringify(event)).not.toMatch(/token|totp.?secret|password|identity|authorization/i);
  });

  it("rejects unsafe and oversized audit metadata without echoing its contents", () => {
    const buildEvent = createAdminGuardAuditEvent as unknown as (...args: unknown[]) => unknown;
    const secret = "access-token-never-log";
    const context = { metadata: { required_permission: "tenant.hierarchy.read", access_token: secret } };

    expect(() => buildEvent({ allowed: false, reason: "step_up_required" }, "cccccccc-cccc-4ccc-8ccc-cccccccccccc", context))
      .toThrow("Audit metadata is invalid.");
    expect(() => buildEvent({ allowed: false, reason: "step_up_required" }, "cccccccc-cccc-4ccc-8ccc-cccccccccccc", {
      metadata: { oversized: "x".repeat(2_000) },
    })).toThrow("Audit metadata is invalid.");
    try {
      buildEvent({ allowed: false, reason: "step_up_required" }, "cccccccc-cccc-4ccc-8ccc-cccccccccccc", context);
    } catch (error) {
      expect(error).not.toHaveProperty("message", expect.stringContaining(secret));
    }
  });

  it("rejects malformed correlation identifiers before an event can be persisted", () => {
    const buildEvent = createAdminGuardAuditEvent as unknown as (...args: unknown[]) => unknown;
    expect(() => buildEvent({ allowed: false, reason: "step_up_required" }, "client-token=secret"))
      .toThrow("Audit event is invalid.");
  });
});
