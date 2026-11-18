import "server-only";
import type { AdminGuardDecision } from "@/lib/supabase/admin-guard-policy";
import { persistDeliveryAdminGuardEvent } from "@/lib/supabase/audit-writer.server";
import type { Database } from "@/lib/supabase/database.types";
import {
  createDeliveryAdminGuardEvent,
  type DeliveryAdminGuardScope,
} from "@/lib/supabase/delivery-admin-guard-policy";
import { isUuid } from "@/lib/supabase/step-up-guard-event-base";
import {
  executeScopedAdminGuard,
  readAuthorizedTenantScope,
} from "@/lib/supabase/scoped-admin-guard.server";

export type DeliveryGuardTarget = {
  organizationId: string;
  establishmentId: string;
  branchId: string;
  zoneId: string | null;
};

export async function runDeliveryAdminGuard(
  target: DeliveryGuardTarget,
): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  let observedScope: DeliveryAdminGuardScope | null = null;
  const effectiveTargetId = target.zoneId ?? target.branchId;

  return executeScopedAdminGuard({
    resourceId: target.branchId,
    actionLogName: "delivery.privileged.step_up",
    async authorizeWithClient(client, candidateResourceId) {
      if (candidateResourceId !== target.branchId || !isValidDeliveryTarget(target)) return false;
      const scope = await readAuthorizedTenantScope(client, target);
      if (!scope?.branchId || !scope.establishmentId) return false;
      observedScope = scope;

      const args = {
        p_organization_id: scope.organizationId,
        p_establishment_id: scope.establishmentId,
        p_branch_id: scope.branchId,
        p_permission_key: "delivery.zone.write",
      } as unknown as Database["public"]["Functions"]["delivery_has_permission"]["Args"];
      const { data, error } = await client.rpc("delivery_has_permission", args);
      return !error && data === true;
    },
    async persistAudit(decision, identity, correlationId) {
      const event = createDeliveryAdminGuardEvent(decision, {
        actorUserId: identity?.id ?? null,
        scope: observedScope,
        targetId: effectiveTargetId,
        correlationId,
      });
      const persistedProofId = await persistDeliveryAdminGuardEvent(event);
      if (decision.allowed && (!persistedProofId || !isUuid(persistedProofId))) {
        throw new Error("Audit persistence is unavailable.");
      }
      return persistedProofId;
    },
  });
}

function isValidDeliveryTarget(target: DeliveryGuardTarget): boolean {
  return isUuid(target.organizationId)
    && isUuid(target.establishmentId)
    && isUuid(target.branchId)
    && (target.zoneId === null || isUuid(target.zoneId));
}
