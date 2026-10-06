import "server-only";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/auth-session";
import { persistAdminGuardAuditEvent } from "@/lib/supabase/audit-writer.server";
import { requestCorrelationId } from "@/lib/observability/correlation";
import {
  resolveAdminGuardTestNowSeconds,
  ADMIN_GUARD_TEST_NOW_HEADER,
  ADMIN_GUARD_TEST_SIGNATURE_HEADER,
} from "@/lib/supabase/admin-guard-test-clock";
import { hasFreshReauthenticationProof } from "@/lib/supabase/reauthentication.server";
import {
  createAdminGuardAuditEvent,
  evaluateAdminGuard,
  type AdminGuardDecision,
  type AdminGuardAuditScope,
  type AdminGuardDependencies,
  type VerifiedAuthClaims,
} from "@/lib/supabase/admin-guard-policy";

const unavailableDependencies: Omit<AdminGuardDependencies, "persistAuditDecision"> = {
  readIdentity: async () => null,
  readVerifiedClaims: async () => null,
  hasVerifiedTotpFactor: async () => null,
  hasFreshReauthentication: async () => null,
  authorizeResource: async () => false,
};

export async function runSyntheticPrivilegedProof(resourceId: string): Promise<AdminGuardDecision> {
  const client = await createSupabaseServerClient();
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
  let authorizedScope: AdminGuardAuditScope | null = null;
  let auditPersisted = false;
  const persistDecision: AdminGuardDependencies["persistAuditDecision"] = async (decision, identity, targetResourceId) => {
    const event = createAdminGuardAuditEvent(decision, correlationId, {
      actorUserId: identity?.id ?? null,
      resourceId: targetResourceId,
      scope: authorizedScope,
      metadata: { required_permission: "tenant.hierarchy.read" },
    });
    await persistAdminGuardAuditEvent(event);
    auditPersisted = true;
  };
  const dependencies: AdminGuardDependencies = client
    ? {
        async readIdentity() {
          const { data, error } = await client.auth.getUser();
          return error || !data.user?.id ? null : { id: data.user.id };
        },
        async readVerifiedClaims() {
          const { data, error } = await client.auth.getClaims();
          if (error || !data?.claims || typeof data.claims !== "object") return null;
          return data.claims as VerifiedAuthClaims;
        },
        async hasVerifiedTotpFactor() {
          const { data, error } = await client.auth.mfa.listFactors();
          if (error || !data) return null;
          return data.totp.some(({ status }) => status === "verified");
        },
        async hasFreshReauthentication(identityId) {
          return hasFreshReauthenticationProof(client, identityId);
        },
        async authorizeResource(targetResourceId) {
          // This uncached Data API lookup leaves permission and branch scope enforcement to the current RLS policy.
          const { data, error } = await client
            .from("branches")
            .select("id,organization_id,establishment_id")
            .eq("id", targetResourceId)
            .maybeSingle();
          if (!error && data?.id === targetResourceId) {
            authorizedScope = {
              organizationId: data.organization_id,
              establishmentId: data.establishment_id,
              branchId: data.id,
            };
          }
          return !error && data?.id === targetResourceId;
        },
        persistAuditDecision: persistDecision,
      }
    : { ...unavailableDependencies, persistAuditDecision: persistDecision };

  const decision = await evaluateAdminGuard(
    dependencies,
    resourceId,
    testNowSeconds === null ? Math.floor(Date.now() / 1000) : testNowSeconds,
  );
  console.info(JSON.stringify({
    event: "admin_guard_decision",
    action: "synthetic.privileged.proof",
    outcome: decision.allowed ? "allow" : "deny",
    reason: decision.allowed ? "authorized" : decision.reason,
    correlation_id: correlationId,
    audit_persisted: auditPersisted,
  }));
  return decision;
}
