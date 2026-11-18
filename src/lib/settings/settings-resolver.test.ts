import { describe, expect, it } from "vitest";
import {
  isTargetScopeBlockedByHigherLock,
  isValidSettingKey,
  resolveEffectiveSettings,
  resolvePlanAndEntitlementOverrides,
  resolveSingleSetting,
  validateSettingValue,
  type EntitlementDefinitionRecord,
  type ScopedSettingRecord,
  type SettingDefinitionRecord,
} from "@/lib/settings/settings-resolver";

const ORG_A = "00000000-0000-4000-8000-000000000001";
const EST_A = "00000000-0000-4000-8000-000000000002";
const BR_A = "00000000-0000-4000-8000-000000000003";
const ROLE_STAFF = "00000000-0000-4000-8000-000000000011";
const ROLE_ADMIN = "00000000-0000-4000-8000-000000000012";
const USER_1 = "00000000-0000-4000-8000-000000000021";

const ORDERING_DEF: SettingDefinitionRecord = {
  key: "storefront.ordering_enabled",
  displayName: "Pedidos online ativos",
  description: "Fail-closed master switch",
  valueType: "boolean",
  allowedScopes: ["platform", "organization", "establishment", "branch"],
  defaultValue: false,
  validationRules: {},
  sensitivity: "sensitive",
  auditRequired: true,
  lockableScopes: ["platform", "organization", "establishment"],
  schemaVersion: 1,
};

const DENSITY_DEF: SettingDefinitionRecord = {
  key: "ui.density_mode",
  displayName: "Densidade visual",
  description: "UI density",
  valueType: "enum",
  allowedScopes: ["platform", "organization", "role", "user", "device_session"],
  defaultValue: "comfortable",
  validationRules: { allowedValues: ["comfortable", "compact"] },
  sensitivity: "standard",
  auditRequired: true,
  lockableScopes: ["platform", "organization", "role"],
  schemaVersion: 1,
};

describe("settings-resolver", () => {
  it("validates dotted keys and typed setting values strictly", () => {
    expect(isValidSettingKey("storefront.ordering_enabled")).toBe(true);
    expect(isValidSettingKey("Invalid.Key")).toBe(false);
    expect(isValidSettingKey("singlesegment")).toBe(false);

    expect(validateSettingValue("boolean", {}, true)).toBe(true);
    expect(validateSettingValue("boolean", {}, "true")).toBe(false);
    expect(validateSettingValue("integer", { min: 5, max: 240 }, 25)).toBe(true);
    expect(validateSettingValue("integer", { min: 5, max: 240 }, 3)).toBe(false);
    expect(validateSettingValue("integer", { min: 5, max: 240 }, 12.5)).toBe(false);
    expect(validateSettingValue("text", { allowEmpty: false, maxLength: 10 }, "   ")).toBe(false);
    expect(validateSettingValue("text", { allowEmpty: false, maxLength: 10 }, "11h-23h")).toBe(true);
    expect(validateSettingValue("enum", { allowedValues: ["comfortable", "compact"] }, "compact")).toBe(true);
    expect(validateSettingValue("enum", { allowedValues: ["comfortable", "compact"] }, "dense")).toBe(false);
    expect(validateSettingValue("string_array", {
      allowedValues: ["cash", "pix_in_person"],
      minItems: 1,
      maxItems: 2,
    }, ["cash", "pix_in_person"])).toBe(true);
    expect(validateSettingValue("string_array", {
      allowedValues: ["cash", "pix_in_person"],
      minItems: 1,
      maxItems: 2,
    }, ["cash", "cash"])).toBe(false);
    expect(validateSettingValue("string_array", {
      allowedValues: ["cash", "pix_in_person"],
      minItems: 1,
      maxItems: 2,
    }, [])).toBe(false);
  });

  it("resolves Platform -> Organization -> Establishment -> Branch in order when unlocked", () => {
    const values: ScopedSettingRecord[] = [
      {
        settingKey: "storefront.ordering_enabled",
        scopeType: "platform",
        organizationId: null,
        establishmentId: null,
        branchId: null,
        roleId: null,
        userId: null,
        value: false,
        isLocked: false,
        version: 1,
      },
      {
        settingKey: "storefront.ordering_enabled",
        scopeType: "organization",
        organizationId: ORG_A,
        establishmentId: null,
        branchId: null,
        roleId: null,
        userId: null,
        value: true,
        isLocked: false,
        version: 2,
      },
      {
        settingKey: "storefront.ordering_enabled",
        scopeType: "establishment",
        organizationId: ORG_A,
        establishmentId: EST_A,
        branchId: null,
        roleId: null,
        userId: null,
        value: false,
        isLocked: false,
        version: 3,
      },
      {
        settingKey: "storefront.ordering_enabled",
        scopeType: "branch",
        organizationId: ORG_A,
        establishmentId: EST_A,
        branchId: BR_A,
        roleId: null,
        userId: null,
        value: true,
        isLocked: false,
        version: 4,
      },
    ];

    const resolved = resolveSingleSetting(ORDERING_DEF, values, {
      organizationId: ORG_A,
      establishmentId: EST_A,
      branchId: BR_A,
    });
    expect(resolved.effectiveValue).toBe(true);
    expect(resolved.effectiveSource).toBe("branch");
    expect(resolved.lockedByScope).toBeNull();
    expect(resolved.version).toBe(4);
  });

  it("halts override inheritance when a higher scope policy is locked", () => {
    const values: ScopedSettingRecord[] = [
      {
        settingKey: "storefront.ordering_enabled",
        scopeType: "organization",
        organizationId: ORG_A,
        establishmentId: null,
        branchId: null,
        roleId: null,
        userId: null,
        value: false,
        isLocked: true,
        version: 2,
      },
      {
        settingKey: "storefront.ordering_enabled",
        scopeType: "branch",
        organizationId: ORG_A,
        establishmentId: EST_A,
        branchId: BR_A,
        roleId: null,
        userId: null,
        value: true,
        isLocked: false,
        version: 5,
      },
    ];

    const resolved = resolveSingleSetting(ORDERING_DEF, values, {
      organizationId: ORG_A,
      establishmentId: EST_A,
      branchId: BR_A,
    });
    expect(resolved.effectiveValue).toBe(false);
    expect(resolved.effectiveSource).toBe("organization");
    expect(resolved.lockedByScope).toBe("organization");
    expect(isTargetScopeBlockedByHigherLock("branch", resolved.lockedByScope)).toBe(true);
    expect(isTargetScopeBlockedByHigherLock("organization", resolved.lockedByScope)).toBe(false);
  });

  it("resolves Role -> User -> Device/Session and honors locked Role policies", () => {
    const baseRows: ScopedSettingRecord[] = [
      {
        settingKey: "ui.density_mode",
        scopeType: "role",
        organizationId: ORG_A,
        establishmentId: null,
        branchId: null,
        roleId: ROLE_STAFF,
        userId: null,
        value: "compact",
        isLocked: false,
        version: 1,
      },
      {
        settingKey: "ui.density_mode",
        scopeType: "user",
        organizationId: ORG_A,
        establishmentId: null,
        branchId: null,
        roleId: null,
        userId: USER_1,
        value: "comfortable",
        isLocked: false,
        version: 2,
      },
    ];

    const withDevice = resolveEffectiveSettings([DENSITY_DEF], baseRows, {
      organizationId: ORG_A,
      activeRoles: [{ roleId: ROLE_STAFF, roleKey: "staff" }],
      userId: USER_1,
      deviceOverrides: { "ui.density_mode": "compact" },
    });
    expect(withDevice[0]?.effectiveValue).toBe("compact");
    expect(withDevice[0]?.effectiveSource).toBe("device_session");

    const lockedRoleRows: ScopedSettingRecord[] = [
      ...baseRows,
      {
        settingKey: "ui.density_mode",
        scopeType: "role",
        organizationId: ORG_A,
        establishmentId: null,
        branchId: null,
        roleId: ROLE_ADMIN,
        userId: null,
        value: "compact",
        isLocked: true,
        version: 3,
      },
    ];

    const lockedResult = resolveSingleSetting(DENSITY_DEF, lockedRoleRows, {
      organizationId: ORG_A,
      activeRoles: [
        { roleId: ROLE_STAFF, roleKey: "staff" },
        { roleId: ROLE_ADMIN, roleKey: "admin" },
      ],
      userId: USER_1,
      deviceOverrides: { "ui.density_mode": "comfortable" },
    });
    expect(lockedResult.effectiveValue).toBe("compact");
    expect(lockedResult.effectiveSource).toBe("role");
    expect(lockedResult.lockedByScope).toBe("role");
    expect(isTargetScopeBlockedByHigherLock("user", lockedResult.lockedByScope)).toBe(true);
  });

  it("separates commercial plan grants from tenant-specific entitlement overrides", () => {
    const defs: EntitlementDefinitionRecord[] = [
      {
        key: "storefront.online_orders",
        displayName: "Pedidos online",
        description: "Online orders",
        valueType: "boolean",
        defaultValue: false,
      },
      {
        key: "catalog.max_active_products",
        displayName: "Limite de produtos",
        description: "Max products",
        valueType: "integer",
        defaultValue: 100,
      },
    ];

    const resolved = resolvePlanAndEntitlementOverrides({
      entitlements: defs,
      subscription: {
        planCode: "pilot_mvp",
        status: "active",
        planValues: {
          "storefront.online_orders": true,
          "catalog.max_active_products": 250,
        },
      },
      overrides: [
        {
          entitlementKey: "catalog.max_active_products",
          value: 500,
          reason: "Expansão piloto autorizada",
          expiresAtIso: "2027-06-01T00:00:00Z",
        },
      ],
      nowEpochMs: Date.parse("2026-11-18T00:00:00Z"),
    });

    expect(resolved).toEqual([
      expect.objectContaining({
        key: "catalog.max_active_products",
        effectiveValue: 500,
        source: "tenant_override",
        planCode: "pilot_mvp",
        overrideReason: "Expansão piloto autorizada",
      }),
      expect.objectContaining({
        key: "storefront.online_orders",
        effectiveValue: true,
        source: "plan",
        planCode: "pilot_mvp",
        overrideReason: null,
      }),
    ]);
  });
});
