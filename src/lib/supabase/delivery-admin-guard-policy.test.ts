import { describe, expect, it } from "vitest";
import {
  createDeliveryAdminGuardEvent,
  validateDeliveryAdminGuardEvent,
} from "@/lib/supabase/delivery-admin-guard-policy";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const EST_ID = "33333333-3333-4333-8333-333333333333";
const BRANCH_ID = "44444444-4444-4444-8444-444444444444";
const ZONE_ID = "55555555-5555-4555-8555-555555555555";
const CORR_ID = "66666666-6666-4666-8666-666666666666";

describe("delivery-admin-guard-policy", () => {
  it("builds valid allow and deny audit events for delivery.zone.write", () => {
    const allow = createDeliveryAdminGuardEvent(
      { allowed: true },
      {
        actorUserId: ACTOR_ID,
        scope: { organizationId: ORG_ID, establishmentId: EST_ID, branchId: BRANCH_ID },
        targetId: ZONE_ID,
        correlationId: CORR_ID,
      },
    );
    expect(allow.outcome).toBe("allow");
    expect(allow.required_permissions).toEqual(["delivery.zone.write"]);

    const deny = createDeliveryAdminGuardEvent(
      { allowed: false, reason: "step_up_required" },
      {
        actorUserId: ACTOR_ID,
        scope: null,
        targetId: BRANCH_ID,
        correlationId: CORR_ID,
      },
    );
    expect(deny.outcome).toBe("deny");
    expect(deny.reason_code).toBe("step_up_required");
  });

  it("rejects allow events missing branch scope or wrong permissions", () => {
    expect(() => validateDeliveryAdminGuardEvent({
      actor_user_id: ACTOR_ID,
      organization_id: ORG_ID,
      establishment_id: null,
      branch_id: null,
      target_id: ZONE_ID,
      required_permissions: ["delivery.zone.write"],
      correlation_id: CORR_ID,
      outcome: "allow",
      reason_code: "authorized",
    })).toThrow();
  });
});
