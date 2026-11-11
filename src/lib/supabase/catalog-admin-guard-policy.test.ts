import { describe, expect, it } from "vitest";
import {
  createCatalogAdminGuardEvent,
  validateCatalogAdminGuardEvent,
  type CatalogAdminGuardEvent,
} from "@/lib/supabase/catalog-admin-guard-policy";

const actorId = "86000000-0000-4000-8000-000000000001";
const organizationId = "85000000-0000-4000-8000-000000000001";
const establishmentId = "87000000-0000-4000-8000-000000000001";
const branchId = "88000000-0000-4000-8000-000000000001";
const offerId = "8c000000-0000-4000-8000-000000000001";
const correlationId = "8d000000-0000-4000-8000-000000000001";

const allowedEvent: CatalogAdminGuardEvent = {
  actor_user_id: actorId,
  organization_id: organizationId,
  establishment_id: establishmentId,
  branch_id: branchId,
  target_id: offerId,
  required_permissions: ["catalog.price.write"],
  correlation_id: correlationId,
  outcome: "allow",
  reason_code: "authorized",
};

describe("catalog Admin Guard audit policy", () => {
  it("binds a privileged proof to its exact actor, target, scope, permission, and correlation", () => {
    expect(createCatalogAdminGuardEvent({ allowed: true }, {
      actorUserId: actorId,
      scope: { organizationId, establishmentId, branchId },
      targetId: offerId,
      requiredPermissions: ["catalog.availability.write", "catalog.price.write"],
      correlationId,
    })).toEqual({
      ...allowedEvent,
      required_permissions: ["catalog.availability.write", "catalog.price.write"],
    });
  });

  it("normalizes denied event permissions and permits only a safe unscoped denial", () => {
    expect(validateCatalogAdminGuardEvent({
      ...allowedEvent,
      organization_id: null,
      establishment_id: null,
      branch_id: null,
      actor_user_id: null,
      required_permissions: ["catalog.price.write", "catalog.availability.write"],
      outcome: "deny",
      reason_code: "unauthenticated",
    })).toMatchObject({
      required_permissions: ["catalog.availability.write", "catalog.price.write"],
      outcome: "deny",
      reason_code: "unauthenticated",
      organization_id: null,
      actor_user_id: null,
    });
  });

  it.each([
    { ...allowedEvent, extra: "unexpected" },
    { ...allowedEvent, actor_user_id: null },
    { ...allowedEvent, establishment_id: null },
    { ...allowedEvent, required_permissions: ["catalog.price.write", "catalog.price.write"] },
    { ...allowedEvent, required_permissions: ["catalog.read"] },
    { ...allowedEvent, outcome: "deny", reason_code: "authorized" },
    { ...allowedEvent, outcome: "allow", reason_code: "audit_unavailable" },
  ])("rejects malformed or authority-widening event: %o", (event) => {
    expect(() => validateCatalogAdminGuardEvent(event)).toThrow("Catalog guard audit event is invalid.");
  });
});
