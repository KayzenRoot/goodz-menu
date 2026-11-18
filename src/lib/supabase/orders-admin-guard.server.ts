import "server-only";
import type { AdminGuardDecision } from "@/lib/supabase/admin-guard-policy";
import { persistOrdersAdminGuardEvent } from "@/lib/supabase/audit-writer.server";
import type { Database } from "@/lib/supabase/database.types";
import {
  createOrdersAdminGuardEvent,
  type OrdersAdminGuardScope,
} from "@/lib/supabase/orders-admin-guard-policy";
import {
  executeScopedAdminGuard,
  readAuthorizedTenantScope,
} from "@/lib/supabase/scoped-admin-guard.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrdersGuardTarget = {
  organizationId: string;
  establishmentId: string;
  branchId: string;
  orderId: string;
};

export async function runOrdersAdminGuard(
  target: OrdersGuardTarget,
): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  let observedScope: OrdersAdminGuardScope | null = null;

  return executeScopedAdminGuard({
    resourceId: target.branchId,
    actionLogName: "orders.privileged.step_up",
    async authorizeWithClient(client, candidateResourceId) {
      if (candidateResourceId !== target.branchId || !isValidOrdersTarget(target)) return false;
      const scope = await readAuthorizedTenantScope(client, target);
      if (!scope?.branchId || !scope.establishmentId) return false;
      observedScope = scope;

      const args = {
        p_organization_id: scope.organizationId,
        p_establishment_id: scope.establishmentId,
        p_branch_id: scope.branchId,
        p_permission_key: "orders.handoff_payment.sensitive",
      } as unknown as Database["public"]["Functions"]["orders_has_permission"]["Args"];
      const { data, error } = await client.rpc("orders_has_permission", args);
      return !error && data === true;
    },
    async persistAudit(decision, identity, correlationId) {
      const event = createOrdersAdminGuardEvent(decision, {
        actorUserId: identity?.id ?? null,
        scope: observedScope,
        orderId: target.orderId,
        correlationId,
      });
      const persistedProofId = await persistOrdersAdminGuardEvent(event);
      if (decision.allowed && (!persistedProofId || !UUID.test(persistedProofId))) {
        throw new Error("Audit persistence is unavailable.");
      }
      return persistedProofId;
    },
  });
}

function isValidOrdersTarget(target: OrdersGuardTarget): boolean {
  return UUID.test(target.organizationId)
    && UUID.test(target.establishmentId)
    && UUID.test(target.branchId)
    && UUID.test(target.orderId);
}
