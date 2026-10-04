import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/auth-session";
import {
  createAdminGuardAuditEvent,
  evaluateAdminGuard,
  type AdminGuardDecision,
  type AdminGuardDependencies,
  type VerifiedAuthClaims,
} from "@/lib/supabase/admin-guard-policy";

const unavailableDependencies: AdminGuardDependencies = {
  readIdentity: async () => null,
  readVerifiedClaims: async () => null,
  hasVerifiedTotpFactor: async () => null,
  authorizeResource: async () => false,
};

export async function runSyntheticPrivilegedProof(resourceId: string): Promise<AdminGuardDecision> {
  const client = await createSupabaseServerClient();
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
        async authorizeResource(targetResourceId) {
          // This uncached Data API lookup leaves permission and branch scope enforcement to the current RLS policy.
          const { data, error } = await client
            .from("branches")
            .select("id")
            .eq("id", targetResourceId)
            .maybeSingle();
          return !error && data?.id === targetResourceId;
        },
      }
    : unavailableDependencies;

  const decision = await evaluateAdminGuard(dependencies, resourceId);
  const event = createAdminGuardAuditEvent(decision, randomUUID());
  console.info(JSON.stringify(event));
  return decision;
}
