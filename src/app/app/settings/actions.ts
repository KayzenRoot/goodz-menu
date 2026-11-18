"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  isValidSettingKey,
  validateSettingValue,
  type PersistedSettingScope,
  type SettingValidationRules,
  type SettingValueType,
} from "@/lib/settings/settings-resolver";
import { runSettingsAdminGuard } from "@/lib/supabase/settings-admin-guard.server";
import type { SettingsStepUpScopeType } from "@/lib/supabase/settings-admin-guard-policy";
import { parseEnumEntry, parseUuidEntry } from "@/lib/supabase/catalog-input-policy";

export type SettingsActionState =
  | null
  | { kind: "saved"; correlationId: string; version: number; auditEventIds: string[] }
  | { kind: "invalid"; correlationId: string }
  | { kind: "denied"; correlationId: string }
  | { kind: "policy_locked"; correlationId: string }
  | { kind: "entitlement_denied"; correlationId: string }
  | { kind: "failed"; correlationId: string }
  | { kind: "step_up_required"; correlationId: string }
  | { kind: "reauthentication_required"; correlationId: string }
  | { kind: "factor_setup_required"; correlationId: string };

const WRITABLE_SCOPES = ["organization", "establishment", "branch", "role", "user"] as const;
const STEP_UP_SCOPES: readonly SettingsStepUpScopeType[] = ["organization", "establishment", "branch", "role"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SettingsRpcError = Readonly<{ code?: string; message?: string }>;

export async function saveSettingValueAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const correlationId = await createCorrelationId();
  const rawKey = formData.get("settingKey");
  if (typeof rawKey !== "string" || !isValidSettingKey(rawKey.trim())) {
    return { kind: "invalid", correlationId };
  }
  const settingKey = rawKey.trim();

  const scopeEntry = parseEnumEntry(formData.get("scopeType"), WRITABLE_SCOPES);
  const orgEntry = parseUuidEntry(formData.get("organizationId"), true);
  const estEntry = parseUuidEntry(formData.get("establishmentId"), false);
  const branchEntry = parseUuidEntry(formData.get("branchId"), false);
  const roleEntry = parseUuidEntry(formData.get("roleId"), false);
  if (
    !scopeEntry.ok || !orgEntry.ok || !orgEntry.value
    || !estEntry.ok || !branchEntry.ok || !roleEntry.ok
  ) {
    return { kind: "invalid", correlationId };
  }

  const scopeType: PersistedSettingScope = scopeEntry.value;
  const organizationId = orgEntry.value;
  const establishmentId = scopeType === "establishment" || scopeType === "branch" ? estEntry.value : null;
  const branchId = scopeType === "branch" ? branchEntry.value : null;
  const roleId = scopeType === "role" ? roleEntry.value : null;

  if (
    (scopeType === "establishment" && !establishmentId)
    || (scopeType === "branch" && (!establishmentId || !branchId))
    || (scopeType === "role" && !roleId)
  ) {
    return { kind: "invalid", correlationId };
  }

  const isLockedRaw = formData.get("isLocked");
  const isLocked = isLockedRaw === "on" || isLockedRaw === "true";
  if ((scopeType === "branch" || scopeType === "user") && isLocked) {
    return { kind: "invalid", correlationId };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  const { data: definition, error: defError } = await auth.client
    .from("setting_definitions")
    .select("key,value_type,allowed_scopes,validation_rules,sensitivity,lockable_scopes,status")
    .eq("key", settingKey)
    .eq("status", "active")
    .maybeSingle();

  if (defError || !definition || !definition.allowed_scopes.includes(scopeType)) {
    return { kind: "invalid", correlationId };
  }
  if (isLocked && !definition.lockable_scopes.includes(scopeType)) {
    return { kind: "invalid", correlationId };
  }

  const parsedValue = parseSubmittedSettingValue(
    definition.value_type as SettingValueType,
    (definition.validation_rules ?? {}) as SettingValidationRules,
    formData,
  );
  if (!parsedValue.ok) {
    return { kind: "invalid", correlationId };
  }

  // Check whether an existing scoped row had is_locked = true (unlocking also requires step-up)
  let previousLocked = false;
  if (scopeType !== "user") {
    let existingQuery = auth.client
      .from("setting_values")
      .select("id,is_locked")
      .eq("setting_key", settingKey)
      .eq("scope_type", scopeType)
      .eq("organization_id", organizationId);
    existingQuery = establishmentId ? existingQuery.eq("establishment_id", establishmentId) : existingQuery.is("establishment_id", null);
    existingQuery = branchId ? existingQuery.eq("branch_id", branchId) : existingQuery.is("branch_id", null);
    existingQuery = roleId ? existingQuery.eq("role_id", roleId) : existingQuery.is("role_id", null);
    const { data: existingRow } = await existingQuery.maybeSingle();
    previousLocked = existingRow?.is_locked ?? false;
  }

  const needsStepUp = definition.sensitivity === "sensitive" || isLocked || previousLocked !== isLocked;
  let stepUpProofId: string | null = null;
  let activeCorrelationId = correlationId;

  if (needsStepUp) {
    if (!(STEP_UP_SCOPES as readonly string[]).includes(scopeType)) {
      return { kind: "denied", correlationId };
    }
    try {
      const guard = await runSettingsAdminGuard({
        organizationId,
        establishmentId,
        branchId,
        scopeType: scopeType as SettingsStepUpScopeType,
        settingKey,
      });
      activeCorrelationId = guard.correlationId;
      if (!guard.decision.allowed) {
        return mapGuardDenial(guard.decision.reason, guard.correlationId);
      }
      if (!guard.proofId) {
        return { kind: "failed", correlationId: guard.correlationId };
      }
      stepUpProofId = guard.proofId;
    } catch {
      return { kind: "failed", correlationId };
    }
  }

  const args = {
    p_setting_key: settingKey,
    p_scope_type: scopeType,
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
    p_role_id: roleId,
    p_value_json: parsedValue.value as Json,
    p_is_locked: isLocked,
    p_step_up_proof_id: stepUpProofId,
    p_correlation_id: activeCorrelationId,
  } as unknown as Database["public"]["Functions"]["settings_save_value"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("settings_save_value", args);
    return finishSettingsCommand(error, activeCorrelationId, data);
  } catch {
    return { kind: "failed", correlationId: activeCorrelationId };
  }
}

function parseSubmittedSettingValue(
  valueType: SettingValueType,
  rules: SettingValidationRules,
  formData: FormData,
): Readonly<{ ok: true; value: unknown } | { ok: false }> {
  let candidate: unknown;
  switch (valueType) {
    case "boolean": {
      const raw = formData.get("booleanValue");
      candidate = raw === "on" || raw === "true";
      break;
    }
    case "integer": {
      const raw = formData.get("integerValue");
      if (typeof raw !== "string" || !/^-?[0-9]+$/.test(raw.trim())) return { ok: false };
      candidate = Number.parseInt(raw.trim(), 10);
      break;
    }
    case "text": {
      const raw = formData.get("textValue");
      if (raw !== null && typeof raw !== "string") return { ok: false };
      candidate = (raw ?? "").trim();
      break;
    }
    case "enum": {
      const raw = formData.get("enumValue");
      if (typeof raw !== "string") return { ok: false };
      candidate = raw.trim();
      break;
    }
    case "string_array": {
      const items = formData.getAll("arrayValues")
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      candidate = items;
      break;
    }
  }

  if (!validateSettingValue(valueType, rules, candidate)) {
    return { ok: false };
  }
  return { ok: true, value: candidate };
}

function mapGuardDenial(reason: AdminGuardReason, correlationId: string): SettingsActionState {
  if (reason === "aal2_required" || reason === "step_up_required") {
    return { kind: "step_up_required", correlationId };
  }
  if (reason === "reauthentication_required") {
    return { kind: "reauthentication_required", correlationId };
  }
  if (reason === "factor_unverified") {
    return { kind: "factor_setup_required", correlationId };
  }
  if (reason === "audit_unavailable") {
    return { kind: "failed", correlationId };
  }
  return { kind: "denied", correlationId };
}

function finishSettingsCommand(
  error: SettingsRpcError | null,
  correlationId: string,
  data: Json | null,
): SettingsActionState {
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("locked by a higher policy scope")) {
      return { kind: "policy_locked", correlationId };
    }
    if (msg.includes("entitlement")) {
      return { kind: "entitlement_denied", correlationId };
    }
    if (error.code === "42501") {
      return { kind: "denied", correlationId };
    }
    if (error.code === "22023" || error.code === "23514" || error.code === "23503") {
      return { kind: "invalid", correlationId };
    }
    return { kind: "failed", correlationId };
  }

  const parsed = parseCommandResult(data);
  if (!parsed) return { kind: "failed", correlationId };
  revalidatePath("/app/settings");
  return {
    kind: "saved",
    correlationId,
    version: parsed.version,
    auditEventIds: parsed.auditEventIds,
  };
}

function parseCommandResult(
  data: Json | null,
): Readonly<{ version: number; auditEventIds: string[] }> | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const entityId = data.entity_id;
  const version = data.version;
  const auditIds = data.audit_event_ids;
  if (
    typeof entityId !== "string"
    || !UUID.test(entityId)
    || typeof version !== "number"
    || !Array.isArray(auditIds)
    || auditIds.some((id) => typeof id !== "string" || !UUID.test(id))
  ) {
    return null;
  }
  return { version, auditEventIds: auditIds as string[] };
}

async function createCorrelationId(): Promise<string> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id");
  return requestCorrelationId(new Request("http://localhost", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
  }));
}
