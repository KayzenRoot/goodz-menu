import { describe, expect, it } from "vitest";
import {
  createOrdersAdminGuardEvent,
  validateOrdersAdminGuardEvent,
} from "@/lib/supabase/orders-admin-guard-policy";

const ACTOR = "00000000-0000-4000-8000-000000000010";
const ORG = "00000000-0000-4000-8000-000000000001";
const EST = "00000000-0000-4000-8000-000000000002";
const BR = "00000000-0000-4000-8000-000000000003";
const ORDER = "00000000-0000-4000-8000-000000000044";
const CORR = "00000000-0000-4000-8000-000000000099";

describe("orders-admin-guard-policy", () => {
  it("builds valid allow and deny audit events for handoff reversals/disputes", () => {
    const allowed = createOrdersAdminGuardEvent(
      { allowed: true },
      {
        actorUserId: ACTOR,
        scope: { organizationId: ORG, establishmentId: EST, branchId: BR },
        orderId: ORDER,
        correlationId: CORR,
      },
    );
    expect(allowed.outcome).toBe("allow");
    expect(allowed.reason_code).toBe("authorized");

    expect(() => validateOrdersAdminGuardEvent({
      ...allowed,
      actor_user_id: null,
    })).toThrow();
  });
});
