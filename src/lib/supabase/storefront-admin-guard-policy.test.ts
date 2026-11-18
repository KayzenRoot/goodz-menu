import { describe, expect, it } from "vitest";
import {
  createStorefrontAdminGuardEvent,
  validateStorefrontAdminGuardEvent,
} from "@/lib/supabase/storefront-admin-guard-policy";

const U1 = "11111111-1111-4111-8111-111111111111";
const ORG = "22222222-2222-4222-8222-222222222222";
const EST = "33333333-3333-4333-8333-333333333333";
const BR = "44444444-4444-4444-8444-444444444444";
const CORR = "55555555-5555-4555-8555-555555555555";

describe("storefront-admin-guard-policy", () => {
  it("validates storefront.write allow and deny step-up events", () => {
    const allow = createStorefrontAdminGuardEvent(
      { allowed: true },
      { actorUserId: U1, scope: { organizationId: ORG, establishmentId: EST, branchId: BR }, targetId: BR, correlationId: CORR },
    );
    expect(allow.outcome).toBe("allow");
    expect(allow.required_permissions).toEqual(["storefront.write"]);

    expect(() => validateStorefrontAdminGuardEvent({
      ...allow,
      branch_id: null,
    })).toThrow();
  });
});
