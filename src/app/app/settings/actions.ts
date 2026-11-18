"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
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

type ParsedSettingSubmission = Readonly<{
  settingKey: string;
  scopeType: PersistedSettingScope;
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
  roleId: string | null;
  isLocked: boolean;
}>;

export async function saveSettingValueAction(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const correlationId = await createCorrelationId();
  const submission = parseSettingTarget(formData);
  if (!submission) return { kind: "invalid", correlationId };

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId };

  const { data: definition, error: defError } = await auth.client
    .from("setting_definitions")
    .select("key,value_type,allowed_scopes,validation_rules,sensitivity,lockable_scopes,status")
    .eq("key", submission.settingKey)
    .eq("status", "active")
    .maybeSingle();

  if (defError || !definition?.allowed_scopes.includes(submission.scopeType)) {
    return { kind: "invalid", correlationId };
  }
  if (submission.isLocked && !definition.lockable_scopes.includes(submission.scopeType)) {
    return { kind: "invalid", correlationId };
  }

  const parsedValue = parseSubmittedSettingValue(
    definition.value_type as SettingValueType,
    (definition.validation_rules ?? {}) as SettingValidationRules,
    formData,
  );
  if (!parsedValue.ok) return { kind: "invalid", correlationId };

  const previousLocked = await readPreviousLockState(auth.client, submission);
  const needsStepUp = definition.sensitivity === "sensitive"
    || submission.isLocked
    || previousLocked !== submission.isLocked;

  const stepUp = await acquireStepUpIfNeeded(needsStepUp, submission, correlationId);
  if (!stepUp.ok) return stepUp.failureState;

  const args = {
    p_setting_key: submission.settingKey,
    p_scope_type: submission.scopeType,
    p_organization_id: submission.organizationId,
    p_establishment_id: submission.establishmentId,
    p_branch_id: submission.branchId,
    p_role_id: submission.roleId,
    p_value_json: parsedValue.value as Json,
    p_is_locked: submission.isLocked,
    p_step_up_proof_id: stepUp.proofId,
    p_correlation_id: stepUp.correlationId,
  } as unknown as Database["public"]["Functions"]["settings_save_value"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("settings_save_value", args);
    return finishSettingsCommand(error, stepUp.correlationId, data);
  } catch {
    return { kind: "failed", correlationId: stepUp.correlationId };
  }
}

function parseSettingTarget(formData: FormData): ParsedSettingSubmission | null {
  const rawKey = formData.get("settingKey");
  if (typeof rawKey !== "string" || !isValidSettingKey(rawKey.trim())) return null;

  const scopeEntry = parseEnumEntry(formData.get("scopeType"), WRITABLE_SCOPES);
  const orgEntry = parseUuidEntry(formData.get("organizationId"), true);
  const estEntry = parseUuidEntry(formData.get("establishmentId"), false);
  const branchEntry = parseUuidEntry(formData.get("branchId"), false);
  const roleEntry = parseUuidEntry(formData.get("roleId"), false);
  if (!scopeEntry.ok || !orgEntry.ok || !orgEntry.value || !estEntry.ok || !branchEntry.ok || !roleEntry.ok) {
    return null;
  }

  const scopeType: PersistedSettingScope = scopeEntry.value;
  const establishmentId = scopeType === "establishment" || scopeType === "branch" ? estEntry.value : null;
  const branchId = scopeType === "branch" ? branchEntry.value : null;
  const roleId = scopeType === "role" ? roleEntry.value : null;
  const isLockedRaw = formData.get("isLocked");
  const isLocked = isLockedRaw === "on" || isLockedRaw === "true";

  if (!isValidScopeShape(scopeType, establishmentId, branchId, roleId, isLocked)) {
    return null;
  }

  return {
    settingKey: rawKey.trim(),
    scopeType,
    organizationId: orgEntry.value,
    establishmentId,
    branchId,
    roleId,
    isLocked,
  };
}

function isValidScopeShape(
  scopeType: PersistedSettingScope,
  establishmentId: string | null,
  branchId: string | null,
  roleId: string | null,
  isLocked: boolean,
): boolean {
  if ((scopeType === "branch" || scopeType === "user") && isLocked) return false;
  if (scopeType === "establishment") return Boolean(establishmentId);
  if (scopeType === "branch") return Boolean(establishmentId && branchId);
  if (scopeType === "role") return Boolean(roleId);
  return true;
}

async function readPreviousLockState(
  client: ServerSupabaseClient,
  submission: ParsedSettingSubmission,
): Promise<boolean> {
  if (submission.scopeType === "user") return false;
  let query = client
    .from("setting_values")
    .select("id,is_locked")
    .eq("setting_key", submission.settingKey)
    .eq("scope_type", submission.scopeType)
    .eq("organization_id", submission.organizationId);
  query = submission.establishmentId ? query.eq("establishment_id", submission.establishmentId) : query.is("establishment_id", null);
  query = submission.branchId ? query.eq("branch_id", submission.branchId) : query.is("branch_id", null);
  query = submission.roleId ? query.eq("role_id", submission.roleId) : query.is("role_id", null);
  const { data } = await query.maybeSingle();
  return data?.is_locked ?? false;
}

async function acquireStepUpIfNeeded(
  needsStepUp: boolean,
  submission: ParsedSettingSubmission,
  correlationId: string,
): Promise<
  | Readonly<{ ok: true; proofId: string | null; correlationId: string }>
  | Readonly<{ ok: false; failureState: SettingsActionState }>
> {
  if (!needsStepUp) {
    return { ok: true, proofId: null, correlationId };
  }
  if (!(STEP_UP_SCOPES as readonly string[]).includes(submission.scopeType)) {
    return { ok: false, failureState: { kind: "denied", correlationId } };
  }
  try {
    const guard = await runSettingsAdminGuard({
      organizationId: submission.organizationId,
      establishmentId: submission.establishmentId,
      branchId: submission.branchId,
      scopeType: submission.scopeType as SettingsStepUpScopeType,
      settingKey: submission.settingKey,
    });
    if (!guard.decision.allowed) {
      return { ok: false, failureState: mapGuardDenial(guard.decision.reason, guard.correlationId) };
    }
    if (!guard.proofId) {
      return { ok: false, failureState: { kind: "failed", correlationId: guard.correlationId } };
    }
    return { ok: true, proofId: guard.proofId, correlationId: guard.correlationId };
  } catch {
    return { ok: false, failureState: { kind: "failed", correlationId } };
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
      if (typeof raw !== "string" || !/^-?\d+$/.test(raw.trim())) return { ok: false };
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
      candidate = formData.getAll("arrayValues")
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      break;
    }
  }

  if (!validateSettingValue(valueType, rules, candidate)) return { ok: false };
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
    if (msg.includes("locked by a higher policy scope")) return { kind: "policy_locked", correlationId };
    if (msg.includes("entitlement")) return { kind: "entitlement_denied", correlationId };
    if (error.code === "42501") return { kind: "denied", correlationId };
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
