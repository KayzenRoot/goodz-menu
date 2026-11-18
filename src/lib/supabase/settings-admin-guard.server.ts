import "server-only";
import type { AdminGuardDecision } from "@/lib/supabase/admin-guard-policy";
import { persistSettingsAdminGuardEvent } from "@/lib/supabase/audit-writer.server";
import type { Database } from "@/lib/supabase/database.types";
import {
  createSettingsAdminGuardEvent,
  type SettingsAdminGuardScope,
  type SettingsStepUpScopeType,
} from "@/lib/supabase/settings-admin-guard-policy";
import {
  executeScopedAdminGuard,
  readAuthorizedTenantScope,
} from "@/lib/supabase/scoped-admin-guard.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOTTED_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export type SettingsGuardTarget = SettingsAdminGuardScope & {
  scopeType: SettingsStepUpScopeType;
  settingKey: string;
};

export async function runSettingsAdminGuard(
  target: SettingsGuardTarget,
): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  let observedScope: SettingsAdminGuardScope | null = null;
  const resourceId = target.branchId ?? target.establishmentId ?? target.organizationId;

  return executeScopedAdminGuard({
    resourceId,
    actionLogName: "settings.privileged.step_up",
    async authorizeWithClient(client, candidateResourceId) {
      if (candidateResourceId !== resourceId || !isValidSettingsTarget(target)) return false;
      const scope = await readAuthorizedTenantScope(client, target);
      if (!scope) return false;
      observedScope = scope;

      const args = {
        p_organization_id: scope.organizationId,
        p_establishment_id: scope.establishmentId,
        p_branch_id: scope.branchId,
        p_permission_key: "settings.sensitive.write",
      } as unknown as Database["public"]["Functions"]["settings_has_permission"]["Args"];
      const { data, error } = await client.rpc("settings_has_permission", args);
      return !error && data === true;
    },
    async persistAudit(decision, identity, correlationId) {
      const event = createSettingsAdminGuardEvent(decision, {
        actorUserId: identity?.id ?? null,
        scope: observedScope,
        scopeType: target.scopeType,
        settingKey: target.settingKey,
        requiredPermissions: ["settings.sensitive.write"],
        correlationId,
      });
      const persistedProofId = await persistSettingsAdminGuardEvent(event);
      if (decision.allowed && (!persistedProofId || !UUID.test(persistedProofId))) {
        throw new Error("Audit persistence is unavailable.");
      }
      return persistedProofId;
    },
  });
}

function isValidSettingsTarget(target: SettingsGuardTarget): boolean {
  if (!DOTTED_KEY.test(target.settingKey) || target.settingKey.length > 120) return false;
  if (!UUID.test(target.organizationId)) return false;
  if (target.scopeType === "organization" || target.scopeType === "role") {
    return target.establishmentId === null && target.branchId === null;
  }
  if (target.scopeType === "establishment") {
    return target.establishmentId !== null && UUID.test(target.establishmentId) && target.branchId === null;
  }
  if (target.scopeType === "branch") {
    return target.establishmentId !== null && UUID.test(target.establishmentId)
      && target.branchId !== null && UUID.test(target.branchId);
  }
  return false;
}
