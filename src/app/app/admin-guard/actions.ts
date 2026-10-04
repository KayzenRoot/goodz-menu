"use server";

import { runSyntheticPrivilegedProof } from "@/lib/supabase/admin-guard.server";

export type AdminGuardActionState =
  | null
  | { kind: "allowed" }
  | { kind: "step_up_required" }
  | { kind: "factor_setup_required" }
  | { kind: "denied" };

export async function runSyntheticPrivilegedProofAction(
  _previousState: AdminGuardActionState,
  formData: FormData,
): Promise<AdminGuardActionState> {
  const resourceId = formData.get("resourceId");

  const decision = await runSyntheticPrivilegedProof(typeof resourceId === "string" ? resourceId : "");
  if (decision.allowed) return { kind: "allowed" };
  if (decision.reason === "factor_unverified") return { kind: "factor_setup_required" };
  if (
    decision.reason === "aal2_required"
    || decision.reason === "reauthentication_required"
    || decision.reason === "step_up_required"
  ) {
    return { kind: "step_up_required" };
  }
  return { kind: "denied" };
}
