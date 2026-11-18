import "server-only";
import type { AdminGuardDecision } from "@/lib/supabase/admin-guard-policy";
import { persistCatalogAdminGuardEvent } from "@/lib/supabase/audit-writer.server";
import type { Database } from "@/lib/supabase/database.types";
import {
  createCatalogAdminGuardEvent,
  type CatalogAdminGuardScope,
  type CatalogPrivilegedPermission,
} from "@/lib/supabase/catalog-admin-guard-policy";
import {
  executeScopedAdminGuard,
  readAuthorizedTenantScope,
} from "@/lib/supabase/scoped-admin-guard.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CatalogGuardTarget = CatalogAdminGuardScope & { offerId: string };

export async function runCatalogAdminGuard(
  target: CatalogGuardTarget,
  requiredPermissions: readonly CatalogPrivilegedPermission[],
): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  let observedScope: CatalogAdminGuardScope | null = null;
  const resourceId = target.branchId ?? target.establishmentId ?? target.organizationId;

  return executeScopedAdminGuard({
    resourceId,
    actionLogName: "catalog.privileged.step_up",
    async authorizeWithClient(client, candidateResourceId) {
      if (candidateResourceId !== resourceId || !isValidTarget(target)) return false;
      const scope = await readAuthorizedTenantScope(client, target);
      if (!scope) return false;
      observedScope = scope;

      const decisions = await Promise.all(requiredPermissions.map(async (permission) => {
        const args = {
          p_organization_id: scope.organizationId,
          p_establishment_id: scope.establishmentId,
          p_branch_id: scope.branchId,
          p_permission_key: permission,
        } as unknown as Database["public"]["Functions"]["catalog_has_permission"]["Args"];
        const { data, error } = await client.rpc("catalog_has_permission", args);
        return !error && data === true;
      }));
      return decisions.length === requiredPermissions.length && decisions.every(Boolean);
    },
    async persistAudit(decision, identity, correlationId) {
      const event = createCatalogAdminGuardEvent(decision, {
        actorUserId: identity?.id ?? null,
        scope: observedScope,
        targetId: target.offerId,
        requiredPermissions,
        correlationId,
      });
      const persistedProofId = await persistCatalogAdminGuardEvent(event);
      if (decision.allowed && (!persistedProofId || !UUID.test(persistedProofId))) {
        throw new Error("Audit persistence is unavailable.");
      }
      return persistedProofId;
    },
  });
}

function isValidTarget(target: CatalogGuardTarget): boolean {
  return UUID.test(target.offerId)
    && UUID.test(target.organizationId)
    && (target.establishmentId === null || UUID.test(target.establishmentId))
    && (target.branchId === null || UUID.test(target.branchId))
    && (target.establishmentId !== null || target.branchId === null);
}
