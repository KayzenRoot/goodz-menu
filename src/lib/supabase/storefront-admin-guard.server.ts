import "server-only";
import type { AdminGuardDecision } from "@/lib/supabase/admin-guard-policy";
import { persistStorefrontAdminGuardEvent } from "@/lib/supabase/audit-writer.server";
import type { Database } from "@/lib/supabase/database.types";
import { executeBranchPermissionGuard } from "@/lib/supabase/scoped-admin-guard.server";
import { createStorefrontAdminGuardEvent } from "@/lib/supabase/storefront-admin-guard-policy";

export type StorefrontGuardTarget = {
  organizationId: string;
  establishmentId: string;
  branchId: string;
};

export async function runStorefrontAdminGuard(
  target: StorefrontGuardTarget,
): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  return executeBranchPermissionGuard({
    organizationId: target.organizationId,
    establishmentId: target.establishmentId,
    branchId: target.branchId,
    actionLogName: "storefront.privileged.step_up",
    async checkBranchPermission(client, scope) {
      const args = {
        p_organization_id: scope.organizationId,
        p_establishment_id: scope.establishmentId,
        p_branch_id: scope.branchId,
        p_permission_key: "storefront.write",
      } as unknown as Database["public"]["Functions"]["storefront_has_permission"]["Args"];
      const { data, error } = await client.rpc("storefront_has_permission", args);
      return !error && data === true;
    },
    async persistWithScope(decision, actorUserId, scope, correlationId) {
      return persistStorefrontAdminGuardEvent(
        createStorefrontAdminGuardEvent(decision, {
          actorUserId,
          scope,
          targetId: target.branchId,
          correlationId,
        }),
      );
    },
  });
}
