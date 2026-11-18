import { describe, expect, it } from "vitest";
import {
  createPrivacyAdminGuardEvent,
  validatePrivacyAdminGuardEvent,
} from "@/lib/supabase/privacy-admin-guard-policy";

const U1 = "11111111-1111-4111-8111-111111111111";
const ORG = "22222222-2222-4222-8222-222222222222";
const CUST = "33333333-3333-4333-8333-333333333333";
const CORR = "44444444-4444-4444-8444-444444444444";

describe("privacy-admin-guard-policy", () => {
  it("validates privacy.manage step-up events", () => {
    const allow = createPrivacyAdminGuardEvent(
      { allowed: true },
      { actorUserId: U1, organizationId: ORG, customerId: CUST, correlationId: CORR },
    );
    expect(allow.outcome).toBe("allow");
    expect(allow.required_permissions).toEqual(["privacy.manage"]);

    expect(() => validatePrivacyAdminGuardEvent({
      ...allow,
      organization_id: null,
    })).toThrow();
  });
});
