import "server-only";
import { headers } from "next/headers";
import {
  evaluateAdminGuard,
  type AdminGuardDecision,
  type AdminGuardDependencies,
  type VerifiedAuthClaims,
} from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { hasFreshReauthenticationProof } from "@/lib/supabase/reauthentication.server";
import { persistCatalogAdminGuardEvent } from "@/lib/supabase/audit-writer.server";
import type { Database } from "@/lib/supabase/database.types";
import {
  ADMIN_GUARD_TEST_NOW_HEADER,
  ADMIN_GUARD_TEST_SIGNATURE_HEADER,
  resolveAdminGuardTestNowSeconds,
} from "@/lib/supabase/admin-guard-test-clock";
import {
  createCatalogAdminGuardEvent,
  type CatalogAdminGuardScope,
  type CatalogPrivilegedPermission,
} from "@/lib/supabase/catalog-admin-guard-policy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CatalogGuardTarget = CatalogAdminGuardScope & { offerId: string };

export async function runCatalogAdminGuard(
  target: CatalogGuardTarget,
  requiredPermissions: readonly CatalogPrivilegedPermission[],
): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  const requestHeaders = await headers();
  const correlationId = requestCorrelationId(new Request("http://localhost", {
    headers: requestHeaders.get("x-request-id")
      ? { "x-request-id": requestHeaders.get("x-request-id")! }
      : undefined,
  }));
  const testNowSeconds = resolveAdminGuardTestNowSeconds({
    nodeEnvironment: process.env.NODE_ENV,
    goodzEnvironment: process.env.GOODZ_ENVIRONMENT,
    host: requestHeaders.get("host"),
    secret: process.env.GOODZ_E2E_TEST_SEAM_SECRET,
    timestampHeader: requestHeaders.get(ADMIN_GUARD_TEST_NOW_HEADER),
    signatureHeader: requestHeaders.get(ADMIN_GUARD_TEST_SIGNATURE_HEADER),
  });
  const auth = await getCurrentAuthContext();
  let observedScope: CatalogAdminGuardScope | null = null;
  let proofId: string | null = null;
  let auditPersisted = false;
  const resourceId = target.branchId ?? target.establishmentId ?? target.organizationId;

  const persistDecision: AdminGuardDependencies["persistAuditDecision"] = async (decision, identity) => {
    const event = createCatalogAdminGuardEvent(decision, {
      actorUserId: identity?.id ?? null,
      scope: observedScope,
      targetId: target.offerId,
      requiredPermissions,
      correlationId,
    });
    const persistedProofId = await persistCatalogAdminGuardEvent(event);
    auditPersisted = true;
    if (decision.allowed) {
      if (!persistedProofId || !UUID.test(persistedProofId)) throw new Error("Audit persistence is unavailable.");
      proofId = persistedProofId;
    }
  };

  const unavailable: Omit<AdminGuardDependencies, "persistAuditDecision"> = {
    readIdentity: async () => null,
    readVerifiedClaims: async () => null,
    hasVerifiedTotpFactor: async () => null,
    hasFreshReauthentication: async () => null,
    authorizeResource: async () => false,
  };

  const dependencies: AdminGuardDependencies = auth
    ? {
        async readIdentity() {
          const { data, error } = await auth.client.auth.getUser();
          return error || !data.user?.id ? null : { id: data.user.id };
        },
        async readVerifiedClaims() {
          const { data, error } = await auth.client.auth.getClaims();
          if (error || !data?.claims || typeof data.claims !== "object") return null;
          return data.claims as VerifiedAuthClaims;
        },
        async hasVerifiedTotpFactor() {
          const { data, error } = await auth.client.auth.mfa.listFactors();
          if (error || !data) return null;
          return data.totp.some(({ status }) => status === "verified");
        },
        async hasFreshReauthentication(identityId) {
          return hasFreshReauthenticationProof(auth.client, identityId);
        },
        async authorizeResource(candidateResourceId) {
          if (candidateResourceId !== resourceId || !isValidTarget(target)) return false;
          const scope = await readAuthorizedScope(auth.client, target);
          if (!scope) return false;
          observedScope = scope;

          const decisions = await Promise.all(requiredPermissions.map(async (permission) => {
            const args = {
              p_organization_id: scope.organizationId,
              p_establishment_id: scope.establishmentId,
              p_branch_id: scope.branchId,
              p_permission_key: permission,
            } as unknown as Database["public"]["Functions"]["catalog_has_permission"]["Args"];
            const { data, error } = await auth.client.rpc("catalog_has_permission", args);
            return !error && data === true;
          }));
          return decisions.length === requiredPermissions.length && decisions.every(Boolean);
        },
        persistAuditDecision: persistDecision,
      }
    : { ...unavailable, persistAuditDecision: persistDecision };

  const decision = await evaluateAdminGuard(
    dependencies,
    resourceId,
    testNowSeconds ?? Math.floor(Date.now() / 1000),
  );
  console.info(JSON.stringify({
    event: "admin_guard_decision",
    action: "catalog.privileged.step_up",
    outcome: decision.allowed ? "allow" : "deny",
    reason: decision.allowed ? "authorized" : decision.reason,
    correlation_id: correlationId,
    audit_persisted: auditPersisted,
  }));
  return { decision, proofId: decision.allowed ? proofId : null, correlationId };
}

async function readAuthorizedScope(
  client: ServerSupabaseClient,
  target: CatalogGuardTarget,
): Promise<CatalogAdminGuardScope | null> {
  if (target.branchId) {
    const { data, error } = await client.from("branches")
      .select("id,organization_id,establishment_id,status")
      .eq("id", target.branchId)
      .maybeSingle();
    if (
      error || !data || data.status !== "active"
      || data.organization_id !== target.organizationId
      || data.establishment_id !== target.establishmentId
    ) return null;
    return { organizationId: data.organization_id, establishmentId: data.establishment_id, branchId: data.id };
  }

  if (target.establishmentId) {
    const { data, error } = await client.from("establishments")
      .select("id,organization_id,status")
      .eq("id", target.establishmentId)
      .maybeSingle();
    if (error || !data || data.status !== "active" || data.organization_id !== target.organizationId) return null;
    return { organizationId: data.organization_id, establishmentId: data.id, branchId: null };
  }

  const { data, error } = await client.from("organizations")
    .select("id,status")
    .eq("id", target.organizationId)
    .maybeSingle();
  if (error || !data || data.status !== "active") return null;
  return { organizationId: data.id, establishmentId: null, branchId: null };
}

function isValidTarget(target: CatalogGuardTarget): boolean {
  return UUID.test(target.offerId)
    && UUID.test(target.organizationId)
    && (target.establishmentId === null || UUID.test(target.establishmentId))
    && (target.branchId === null || UUID.test(target.branchId))
    && (target.establishmentId !== null || target.branchId === null);
}
