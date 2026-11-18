import "server-only";
import { headers } from "next/headers";
import {
  evaluateAdminGuard,
  type AdminGuardDecision,
  type AdminGuardDependencies,
  type VerifiedAuthClaims,
} from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { emitStructuredInfoLog } from "@/lib/observability/log-redactor";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { hasFreshReauthenticationProof } from "@/lib/supabase/reauthentication.server";
import {
  ADMIN_GUARD_TEST_NOW_HEADER,
  ADMIN_GUARD_TEST_SIGNATURE_HEADER,
  resolveAdminGuardTestNowSeconds,
} from "@/lib/supabase/admin-guard-test-clock";

export type TenantScopeIds = {
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
};

export async function executeScopedAdminGuard(options: Readonly<{
  resourceId: string;
  actionLogName: string;
  authorizeWithClient: (client: ServerSupabaseClient, candidateResourceId: string) => Promise<boolean>;
  persistAudit: (
    decision: AdminGuardDecision,
    identity: Readonly<{ id: string }> | null,
    correlationId: string,
  ) => Promise<string | null>;
}>): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id");
  const correlationId = requestCorrelationId(new Request("http://localhost", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
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
  let proofId: string | null = null;
  let auditPersisted = false;

  const persistAuditDecision: AdminGuardDependencies["persistAuditDecision"] = async (decision, identity) => {
    const persisted = await options.persistAudit(decision, identity, correlationId);
    auditPersisted = true;
    if (decision.allowed) {
      proofId = persisted;
    }
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
          return options.authorizeWithClient(auth.client, candidateResourceId);
        },
        persistAuditDecision,
      }
    : {
        readIdentity: async () => null,
        readVerifiedClaims: async () => null,
        hasVerifiedTotpFactor: async () => null,
        hasFreshReauthentication: async () => null,
        authorizeResource: async () => false,
        persistAuditDecision,
      };

  const decision = await evaluateAdminGuard(
    dependencies,
    options.resourceId,
    testNowSeconds ?? Math.floor(Date.now() / 1000),
  );
  emitStructuredInfoLog({
    event: "admin_guard_decision",
    action: options.actionLogName,
    outcome: decision.allowed ? "allow" : "deny",
    reason: decision.allowed ? "authorized" : decision.reason,
    correlation_id: correlationId,
    audit_persisted: auditPersisted,
  });
  return { decision, proofId: decision.allowed ? proofId : null, correlationId };
}

export async function readAuthorizedTenantScope(
  client: ServerSupabaseClient,
  target: TenantScopeIds,
): Promise<TenantScopeIds | null> {
  if (target.branchId) {
    const { data, error } = await client.from("branches")
      .select("id,organization_id,establishment_id,status")
      .eq("id", target.branchId)
      .maybeSingle();
    if (
      error
      || data?.status !== "active"
      || data.organization_id !== target.organizationId
      || data.establishment_id !== target.establishmentId
    ) {
      return null;
    }
    return { organizationId: data.organization_id, establishmentId: data.establishment_id, branchId: data.id };
  }

  if (target.establishmentId) {
    const { data, error } = await client.from("establishments")
      .select("id,organization_id,status")
      .eq("id", target.establishmentId)
      .maybeSingle();
    if (error || data?.status !== "active" || data.organization_id !== target.organizationId) {
      return null;
    }
    return { organizationId: data.organization_id, establishmentId: data.id, branchId: null };
  }

  const { data, error } = await client.from("organizations")
    .select("id,status")
    .eq("id", target.organizationId)
    .maybeSingle();
  if (error || data?.status !== "active") {
    return null;
  }
  return { organizationId: data.id, establishmentId: null, branchId: null };
}

export async function executeBranchPermissionGuard(options: Readonly<{
  organizationId: string;
  establishmentId: string;
  branchId: string;
  isValidExtraTarget?: boolean;
  actionLogName: string;
  checkBranchPermission: (
    client: ServerSupabaseClient,
    scope: { organizationId: string; establishmentId: string; branchId: string },
  ) => Promise<boolean>;
  persistWithScope: (
    decision: AdminGuardDecision,
    actorUserId: string | null,
    scope: TenantScopeIds | null,
    correlationId: string,
  ) => Promise<string | null>;
}>): Promise<Readonly<{ decision: AdminGuardDecision; proofId: string | null; correlationId: string }>> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let observedScope: TenantScopeIds | null = null;
  const validIds = uuidPattern.test(options.organizationId)
    && uuidPattern.test(options.establishmentId)
    && uuidPattern.test(options.branchId)
    && (options.isValidExtraTarget ?? true);

  return executeScopedAdminGuard({
    resourceId: options.branchId,
    actionLogName: options.actionLogName,
    async authorizeWithClient(client, candidateResourceId) {
      if (candidateResourceId !== options.branchId || !validIds) return false;
      const scope = await readAuthorizedTenantScope(client, {
        organizationId: options.organizationId,
        establishmentId: options.establishmentId,
        branchId: options.branchId,
      });
      if (!scope?.branchId || !scope.establishmentId) return false;
      observedScope = scope;
      return options.checkBranchPermission(client, {
        organizationId: scope.organizationId,
        establishmentId: scope.establishmentId,
        branchId: scope.branchId,
      });
    },
    async persistAudit(decision, identity, correlationId) {
      const persistedProofId = await options.persistWithScope(
        decision,
        identity?.id ?? null,
        observedScope,
        correlationId,
      );
      if (decision.allowed && (!persistedProofId || !uuidPattern.test(persistedProofId))) {
        throw new Error("Audit persistence is unavailable.");
      }
      return persistedProofId;
    },
  });
}
