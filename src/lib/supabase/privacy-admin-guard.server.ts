import "server-only";
import type { AdminGuardDecision } from "@/lib/supabase/admin-guard-policy";
import { persistPrivacyAdminGuardEvent } from "@/lib/supabase/audit-writer.server";
import type { Database } from "@/lib/supabase/database.types";
import { createPrivacyAdminGuardEvent } from "@/lib/supabase/privacy-admin-guard-policy";
import {
  executeScopedAdminGuard,
  readAuthorizedTenantScope,
} from "@/lib/supabase/scoped-admin-guard.server";
import { isUuid } from "@/lib/supabase/step-up-guard-event-base";

export type PrivacyGuardTarget = {
  organizationId: string;
  customerId: string;
};

export async function runPrivacyAdminGuard(
  target: PrivacyGuardTarget,
): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  let observedOrgId: string | null = null;

  return executeScopedAdminGuard({
    resourceId: target.organizationId,
    actionLogName: "privacy.privileged.step_up",
    async authorizeWithClient(client, candidateResourceId) {
      if (candidateResourceId !== target.organizationId || !isUuid(target.organizationId) || !isUuid(target.customerId)) {
        return false;
      }
      const scope = await readAuthorizedTenantScope(client, {
        organizationId: target.organizationId,
        establishmentId: null,
        branchId: null,
      });
      if (!scope) return false;
      observedOrgId = scope.organizationId;

      const args = {
        p_organization_id: scope.organizationId,
        p_permission_key: "privacy.manage",
      } as unknown as Database["public"]["Functions"]["privacy_has_permission"]["Args"];
      const { data, error } = await client.rpc("privacy_has_permission", args);
      return !error && data === true;
    },
    async persistAudit(decision, identity, correlationId) {
      const persistedProofId = await persistPrivacyAdminGuardEvent(
        createPrivacyAdminGuardEvent(decision, {
          actorUserId: identity?.id ?? null,
          organizationId: observedOrgId,
          customerId: target.customerId,
          correlationId,
        }),
      );
      if (decision.allowed && (!persistedProofId || !isUuid(persistedProofId))) {
        throw new Error("Audit persistence is unavailable.");
      }
      return persistedProofId;
    },
  });
}
