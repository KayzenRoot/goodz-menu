"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { AdminGuardReason } from "@/lib/supabase/admin-guard-policy";
import { requestCorrelationId } from "@/lib/observability/correlation";
import { emitStructuredInfoLog } from "@/lib/observability/log-redactor";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import { parseTextEntry, parseUuidEntry } from "@/lib/supabase/catalog-input-policy";
import type { Database, Json } from "@/lib/supabase/database.types";
import { runPrivacyAdminGuard } from "@/lib/supabase/privacy-admin-guard.server";
import { isUuid } from "@/lib/supabase/step-up-guard-event-base";

export type PrivacyActionState =
  | null
  | {
      kind: "exported";
      correlationId: string;
      customerId: string;
      payloadJson: string;
      auditEventIds: string[];
    }
  | {
      kind: "anonymized";
      correlationId: string;
      customerId: string;
      auditEventIds: string[];
    }
  | { kind: "active_orders"; correlationId: string }
  | { kind: "invalid"; correlationId: string }
  | { kind: "denied"; correlationId: string }
  | { kind: "failed"; correlationId: string }
  | { kind: "step_up_required"; correlationId: string }
  | { kind: "reauthentication_required"; correlationId: string }
  | { kind: "factor_setup_required"; correlationId: string };

type RpcErrorShape = Readonly<{ code?: string; message?: string }>;

export async function exportCustomerPrivacyDataAction(
  _prev: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  const initialCorrelation = await createPrivacyCorrelation();
  const orgEntry = parseUuidEntry(formData.get("organizationId"), true);
  const custEntry = parseUuidEntry(formData.get("customerId"), true);
  if (!orgEntry.ok || !orgEntry.value || !custEntry.ok || !custEntry.value) {
    return { kind: "invalid", correlationId: initialCorrelation };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId: initialCorrelation };

  const stepUp = await acquirePrivacyStepUp(orgEntry.value, custEntry.value, initialCorrelation);
  if (!stepUp.ok) return stepUp.state;

  const args = {
    p_organization_id: orgEntry.value,
    p_customer_id: custEntry.value,
    p_step_up_proof_id: stepUp.proofId,
    p_correlation_id: stepUp.correlationId,
  } as unknown as Database["public"]["Functions"]["privacy_export_customer_data"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("privacy_export_customer_data", args);
    if (error) return mapPrivacyRpcError(error, stepUp.correlationId);
    const auditIds = extractAuditIds(data);
    if (!auditIds) return { kind: "failed", correlationId: stepUp.correlationId };

    emitStructuredInfoLog({
      event: "privacy_customer_export",
      organization_id: orgEntry.value,
      customer_id: custEntry.value,
      outcome: "exported",
      correlation_id: stepUp.correlationId,
    });
    return {
      kind: "exported",
      correlationId: stepUp.correlationId,
      customerId: custEntry.value,
      payloadJson: JSON.stringify(data, null, 2),
      auditEventIds: auditIds,
    };
  } catch {
    return { kind: "failed", correlationId: stepUp.correlationId };
  }
}

export async function anonymizeCustomerPrivacyAction(
  _prev: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  const initialCorrelation = await createPrivacyCorrelation();
  const orgEntry = parseUuidEntry(formData.get("organizationId"), true);
  const custEntry = parseUuidEntry(formData.get("customerId"), true);
  const reasonEntry = parseTextEntry(formData.get("reason"), 500, true);
  if (
    !orgEntry.ok || !orgEntry.value
    || !custEntry.ok || !custEntry.value
    || !reasonEntry.ok || !reasonEntry.value || reasonEntry.value.length < 3
  ) {
    return { kind: "invalid", correlationId: initialCorrelation };
  }

  const auth = await getCurrentAuthContext();
  if (!auth) return { kind: "denied", correlationId: initialCorrelation };

  const stepUp = await acquirePrivacyStepUp(orgEntry.value, custEntry.value, initialCorrelation);
  if (!stepUp.ok) return stepUp.state;

  const args = {
    p_organization_id: orgEntry.value,
    p_customer_id: custEntry.value,
    p_reason: reasonEntry.value,
    p_step_up_proof_id: stepUp.proofId,
    p_correlation_id: stepUp.correlationId,
  } as unknown as Database["public"]["Functions"]["privacy_anonymize_customer"]["Args"];

  try {
    const { data, error } = await auth.client.rpc("privacy_anonymize_customer", args);
    if (error) return mapPrivacyRpcError(error, stepUp.correlationId);
    const auditIds = extractAuditIds(data);
    if (!auditIds) return { kind: "failed", correlationId: stepUp.correlationId };

    revalidatePath("/app/privacy");
    revalidatePath("/app/orders");
    emitStructuredInfoLog({
      event: "privacy_customer_anonymize",
      organization_id: orgEntry.value,
      customer_id: custEntry.value,
      outcome: "anonymized",
      correlation_id: stepUp.correlationId,
    });
    return {
      kind: "anonymized",
      correlationId: stepUp.correlationId,
      customerId: custEntry.value,
      auditEventIds: auditIds,
    };
  } catch {
    return { kind: "failed", correlationId: stepUp.correlationId };
  }
}

async function acquirePrivacyStepUp(
  organizationId: string,
  customerId: string,
  fallbackCorrelation: string,
): Promise<
  | Readonly<{ ok: true; proofId: string; correlationId: string }>
  | Readonly<{ ok: false; state: PrivacyActionState }>
> {
  try {
    const guard = await runPrivacyAdminGuard({ organizationId, customerId });
    if (!guard.decision.allowed) {
      return { ok: false, state: mapPrivacyGuardReason(guard.decision.reason, guard.correlationId) };
    }
    if (!guard.proofId) {
      return { ok: false, state: { kind: "failed", correlationId: guard.correlationId } };
    }
    return { ok: true, proofId: guard.proofId, correlationId: guard.correlationId };
  } catch {
    return { ok: false, state: { kind: "failed", correlationId: fallbackCorrelation } };
  }
}

function mapPrivacyGuardReason(reason: AdminGuardReason, correlationId: string): PrivacyActionState {
  if (reason === "aal2_required" || reason === "step_up_required") {
    return { kind: "step_up_required", correlationId };
  }
  if (reason === "reauthentication_required") {
    return { kind: "reauthentication_required", correlationId };
  }
  if (reason === "factor_unverified") {
    return { kind: "factor_setup_required", correlationId };
  }
  if (reason === "audit_unavailable") {
    return { kind: "failed", correlationId };
  }
  return { kind: "denied", correlationId };
}

function mapPrivacyRpcError(error: RpcErrorShape, correlationId: string): PrivacyActionState {
  const msg = error.message ?? "";
  if (msg.includes("active in-flight orders")) {
    return { kind: "active_orders", correlationId };
  }
  if (msg.includes("step-up")) {
    return { kind: "step_up_required", correlationId };
  }
  if (error.code === "42501") {
    return { kind: "denied", correlationId };
  }
  if (error.code === "22023") {
    return { kind: "invalid", correlationId };
  }
  return { kind: "failed", correlationId };
}

function extractAuditIds(data: Json | null): string[] | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const ids = data.audit_event_ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !isUuid(id))) {
    return null;
  }
  return ids as string[];
}

async function createPrivacyCorrelation(): Promise<string> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id");
  return requestCorrelationId(new Request("http://localhost", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
  }));
}
