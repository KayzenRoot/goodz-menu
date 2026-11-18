import { describe, expect, it } from "vitest";
import {
  createSettingsAdminGuardEvent,
  validateSettingsAdminGuardEvent,
} from "@/lib/supabase/settings-admin-guard-policy";

const ACTOR = "00000000-0000-4000-8000-000000000010";
const ORG = "00000000-0000-4000-8000-000000000001";
const EST = "00000000-0000-4000-8000-000000000002";
const BR = "00000000-0000-4000-8000-000000000003";
const CORR = "00000000-0000-4000-8000-000000000099";

describe("settings-admin-guard-policy", () => {
  it("creates a bounded allow audit event for sensitive settings", () => {
    const event = createSettingsAdminGuardEvent(
      { allowed: true },
      {
        actorUserId: ACTOR,
        scope: { organizationId: ORG, establishmentId: EST, branchId: BR },
        scopeType: "branch",
        settingKey: "storefront.ordering_enabled",
        requiredPermissions: ["settings.sensitive.write"],
        correlationId: CORR,
      },
    );

    expect(event).toEqual({
      actor_user_id: ACTOR,
      organization_id: ORG,
      establishment_id: EST,
      branch_id: BR,
      scope_type: "branch",
      setting_key: "storefront.ordering_enabled",
      required_permissions: ["settings.sensitive.write"],
      correlation_id: CORR,
      outcome: "allow",
      reason_code: "authorized",
    });
  });

  it("rejects extra fields, invalid keys, or inconsistent allow/deny invariants", () => {
    expect(() => validateSettingsAdminGuardEvent({
      actor_user_id: null,
      organization_id: ORG,
      establishment_id: null,
      branch_id: null,
      scope_type: "organization",
      setting_key: "storefront.ordering_enabled",
      required_permissions: ["settings.sensitive.write"],
      correlation_id: CORR,
      outcome: "allow",
      reason_code: "authorized",
    })).toThrow();

    expect(() => validateSettingsAdminGuardEvent({
      actor_user_id: ACTOR,
      organization_id: ORG,
      establishment_id: null,
      branch_id: null,
      scope_type: "organization",
      setting_key: "INVALID_KEY",
      required_permissions: ["settings.sensitive.write"],
      correlation_id: CORR,
      outcome: "deny",
      reason_code: "aal2_required",
    })).toThrow();
  });
});
