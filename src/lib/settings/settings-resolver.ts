export const SETTING_SCOPES = [
  "platform",
  "organization",
  "establishment",
  "branch",
  "role",
  "user",
  "device_session",
] as const;

export type SettingScope = typeof SETTING_SCOPES[number];
export type PersistedSettingScope = Exclude<SettingScope, "device_session">;

export const SETTING_VALUE_TYPES = [
  "boolean",
  "integer",
  "text",
  "string_array",
  "enum",
] as const;

export type SettingValueType = typeof SETTING_VALUE_TYPES[number];
export type SettingSensitivity = "standard" | "sensitive";

export const HANDOFF_PAYMENT_METHODS = [
  "pix_in_person",
  "debit_card_pos",
  "credit_card_pos",
  "cash",
] as const;

export type HandoffPaymentMethod = typeof HANDOFF_PAYMENT_METHODS[number];
export type UiDensityMode = "comfortable" | "compact";

export const PILOT_SETTING_KEYS = [
  "storefront.ordering_enabled",
  "storefront.pickup_enabled",
  "storefront.delivery_enabled",
  "storefront.operating_hours",
  "storefront.estimated_prep_minutes",
  "storefront.estimated_delivery_minutes",
  "storefront.support_whatsapp",
  "storefront.public_notice",
  "handoff.accepted_payment_methods",
  "handoff.cash_change_enabled",
  "ui.density_mode",
] as const;

export type PilotSettingKey = typeof PILOT_SETTING_KEYS[number];

export type SettingValidationRules = Readonly<{
  min?: number;
  max?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  pattern?: string;
  allowedValues?: readonly string[];
  minItems?: number;
  maxItems?: number;
}>;

export type SettingDefinitionRecord = Readonly<{
  key: string;
  displayName: string;
  description: string;
  valueType: SettingValueType;
  allowedScopes: readonly SettingScope[];
  defaultValue: unknown;
  validationRules: SettingValidationRules;
  sensitivity: SettingSensitivity;
  auditRequired: boolean;
  lockableScopes: readonly PersistedSettingScope[];
  schemaVersion: number;
}>;

export type ScopedSettingRecord = Readonly<{
  id?: string;
  settingKey: string;
  scopeType: PersistedSettingScope;
  organizationId: string | null;
  establishmentId: string | null;
  branchId: string | null;
  roleId: string | null;
  userId: string | null;
  value: unknown;
  isLocked: boolean;
  version: number;
}>;

export type SettingResolutionContext = Readonly<{
  organizationId: string;
  establishmentId?: string | null;
  branchId?: string | null;
  activeRoles?: readonly Readonly<{ roleId: string; roleKey: string }>[];
  userId?: string | null;
  deviceOverrides?: Readonly<Record<string, unknown>>;
}>;

export type ResolvedSettingResult = Readonly<{
  key: string;
  displayName: string;
  valueType: SettingValueType;
  sensitivity: SettingSensitivity;
  effectiveValue: unknown;
  effectiveSource: "default" | SettingScope;
  lockedByScope: PersistedSettingScope | null;
  version: number;
}>;

export type EntitlementDefinitionRecord = Readonly<{
  key: string;
  displayName: string;
  description: string;
  valueType: "boolean" | "integer";
  defaultValue: boolean | number;
}>;

export type ResolvedEntitlementResult = Readonly<{
  key: string;
  displayName: string;
  description: string;
  valueType: "boolean" | "integer";
  effectiveValue: boolean | number;
  source: "default" | "plan" | "tenant_override";
  planCode: string | null;
  overrideReason: string | null;
}>;

const DOTTED_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

function compareAscii(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isValidSettingKey(key: string): boolean {
  return key.length <= 120 && DOTTED_KEY.test(key);
}

function validateIntegerValue(rules: SettingValidationRules, value: unknown): boolean {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    return false;
  }
  if (rules.min !== undefined && value < rules.min) return false;
  if (rules.max !== undefined && value > rules.max) return false;
  return true;
}

function validateTextValue(rules: SettingValidationRules, value: unknown): boolean {
  if (typeof value !== "string") return false;
  const allowEmpty = rules.allowEmpty ?? true;
  if (!allowEmpty && value.trim().length === 0) return false;
  if (rules.maxLength !== undefined && value.length > rules.maxLength) return false;
  if (rules.pattern !== undefined && !new RegExp(rules.pattern).test(value)) return false;
  return true;
}

function validateStringArrayValue(rules: SettingValidationRules, value: unknown): boolean {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return false;
  if (new Set(value).size !== value.length) return false;
  const minItems = rules.minItems ?? 0;
  const maxItems = rules.maxItems ?? 100;
  if (value.length < minItems || value.length > maxItems) return false;
  if (!Array.isArray(rules.allowedValues)) return false;
  return value.every((item) => rules.allowedValues!.includes(item));
}

export function validateSettingValue(
  valueType: SettingValueType,
  rules: SettingValidationRules,
  value: unknown,
): boolean {
  if (value === null || value === undefined) return false;
  switch (valueType) {
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return validateIntegerValue(rules, value);
    case "text":
      return validateTextValue(rules, value);
    case "enum":
      return typeof value === "string" && Boolean(rules.allowedValues?.includes(value));
    case "string_array":
      return validateStringArrayValue(rules, value);
  }
}

export function resolveEffectiveSettings(
  definitions: readonly SettingDefinitionRecord[],
  values: readonly ScopedSettingRecord[],
  context: SettingResolutionContext,
): ResolvedSettingResult[] {
  const orderedDefinitions = [...definitions].sort((left, right) => compareAscii(left.key, right.key));
  return orderedDefinitions.map((definition) => resolveSingleSetting(definition, values, context));
}

function selectRoleCandidate(
  matching: readonly ScopedSettingRecord[],
  organizationId: string,
  activeRoles: readonly Readonly<{ roleId: string; roleKey: string }>[],
): ScopedSettingRecord | undefined {
  const roleMap = new Map(activeRoles.map((role) => [role.roleId, role.roleKey]));
  const candidates = matching
    .filter((row) => (
      row.scopeType === "role"
      && row.organizationId === organizationId
      && row.roleId !== null
      && roleMap.has(row.roleId)
    ))
    .sort((left, right) => {
      if (left.isLocked !== right.isLocked) return left.isLocked ? -1 : 1;
      return compareAscii(roleMap.get(left.roleId!) ?? "", roleMap.get(right.roleId!) ?? "");
    });
  return candidates[0];
}

export function resolveSingleSetting(
  definition: SettingDefinitionRecord,
  values: readonly ScopedSettingRecord[],
  context: SettingResolutionContext,
): ResolvedSettingResult {
  const matching = values.filter((row) => row.settingKey === definition.key);
  let effectiveValue = definition.defaultValue;
  let effectiveSource: "default" | SettingScope = "default";
  let lockedByScope: PersistedSettingScope | null = null;
  let version = 0;

  const applyCandidate = (candidate: ScopedSettingRecord | undefined) => {
    if (!candidate || lockedByScope !== null) return;
    if (!definition.allowedScopes.includes(candidate.scopeType)) return;
    effectiveValue = candidate.value;
    effectiveSource = candidate.scopeType;
    version = candidate.version;
    if (candidate.isLocked && definition.lockableScopes.includes(candidate.scopeType)) {
      lockedByScope = candidate.scopeType;
    }
  };

  applyCandidate(matching.find((row) => row.scopeType === "platform"));
  applyCandidate(matching.find((row) => (
    row.scopeType === "organization" && row.organizationId === context.organizationId
  )));

  if (context.establishmentId) {
    applyCandidate(matching.find((row) => (
      row.scopeType === "establishment"
      && row.organizationId === context.organizationId
      && row.establishmentId === context.establishmentId
    )));
  }

  if (context.establishmentId && context.branchId) {
    applyCandidate(matching.find((row) => (
      row.scopeType === "branch"
      && row.organizationId === context.organizationId
      && row.establishmentId === context.establishmentId
      && row.branchId === context.branchId
    )));
  }

  if (lockedByScope === null && definition.allowedScopes.includes("role") && context.activeRoles?.length) {
    applyCandidate(selectRoleCandidate(matching, context.organizationId, context.activeRoles));
  }

  if (context.userId) {
    applyCandidate(matching.find((row) => (
      row.scopeType === "user"
      && row.organizationId === context.organizationId
      && row.userId === context.userId
    )));
  }

  if (
    lockedByScope === null
    && definition.allowedScopes.includes("device_session")
    && context.deviceOverrides
    && Object.hasOwn(context.deviceOverrides, definition.key)
  ) {
    const candidateValue = context.deviceOverrides[definition.key];
    if (validateSettingValue(definition.valueType, definition.validationRules, candidateValue)) {
      effectiveValue = candidateValue;
      effectiveSource = "device_session";
    }
  }

  return {
    key: definition.key,
    displayName: definition.displayName,
    valueType: definition.valueType,
    sensitivity: definition.sensitivity,
    effectiveValue,
    effectiveSource,
    lockedByScope,
    version,
  };
}

export function isTargetScopeBlockedByHigherLock(
  targetScope: PersistedSettingScope,
  lockedByScope: PersistedSettingScope | null,
): boolean {
  if (lockedByScope === null) return false;
  if (lockedByScope === "platform") return targetScope !== "platform";
  if (lockedByScope === "organization") {
    return targetScope === "establishment"
      || targetScope === "branch"
      || targetScope === "role"
      || targetScope === "user";
  }
  if (lockedByScope === "establishment") return targetScope === "branch";
  if (lockedByScope === "role") return targetScope === "user";
  return false;
}

export function resolvePlanAndEntitlementOverrides(params: Readonly<{
  entitlements: readonly EntitlementDefinitionRecord[];
  subscription: Readonly<{
    planCode: string;
    status: "active" | "trialing" | "past_due" | "suspended";
    planValues: Readonly<Record<string, boolean | number>>;
  }> | null;
  overrides: readonly Readonly<{
    entitlementKey: string;
    value: boolean | number;
    reason: string;
    expiresAtIso: string | null;
  }>[];
  nowEpochMs?: number;
}>): ResolvedEntitlementResult[] {
  const nowMs = params.nowEpochMs ?? Date.now();
  const ordered = [...params.entitlements].sort((left, right) => compareAscii(left.key, right.key));

  return ordered.map((entitlement) => {
    const activeOverride = params.overrides.find((override) => (
      override.entitlementKey === entitlement.key
      && (override.expiresAtIso === null || Date.parse(override.expiresAtIso) > nowMs)
    ));
    if (activeOverride) {
      return {
        key: entitlement.key,
        displayName: entitlement.displayName,
        description: entitlement.description,
        valueType: entitlement.valueType,
        effectiveValue: activeOverride.value,
        source: "tenant_override",
        planCode: params.subscription?.planCode ?? null,
        overrideReason: activeOverride.reason,
      };
    }

    const planActive = params.subscription
      && (params.subscription.status === "active" || params.subscription.status === "trialing")
      && Object.hasOwn(params.subscription.planValues, entitlement.key);
    if (planActive && params.subscription) {
      return {
        key: entitlement.key,
        displayName: entitlement.displayName,
        description: entitlement.description,
        valueType: entitlement.valueType,
        effectiveValue: params.subscription.planValues[entitlement.key]!,
        source: "plan",
        planCode: params.subscription.planCode,
        overrideReason: null,
      };
    }

    return {
      key: entitlement.key,
      displayName: entitlement.displayName,
      description: entitlement.description,
      valueType: entitlement.valueType,
      effectiveValue: entitlement.defaultValue,
      source: "default",
      planCode: params.subscription?.planCode ?? null,
      overrideReason: null,
    };
  });
}
