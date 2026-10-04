import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readRuntimeConfig } from "@/lib/env/runtime-env";
import type { Database } from "@/lib/supabase/database.types";
import { validateAdminGuardAuditEvent, type AdminGuardAuditEvent } from "@/lib/supabase/admin-guard-policy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The only application boundary allowed to hold the service-role credential. */
export async function persistAdminGuardAuditEvent(value: unknown): Promise<string> {
  const event = validateAdminGuardAuditEvent(value);
  const runtime = readRuntimeConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!runtime.ok || !serviceRoleKey) throw new Error("Audit persistence is unavailable.");

  try {
    const client = createClient<Database>(runtime.config.supabaseApiUrl.toString(), serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.rpc("append_audit_event", {
      p_action: event.action,
      p_target_type: event.target_type,
      p_outcome: event.outcome,
      p_reason_code: event.reason_code,
      p_correlation_id: event.correlation_id,
      p_source: event.source,
      p_metadata: event.metadata,
      ...(event.target_id ? { p_target_id: event.target_id } : {}),
      ...(event.branch_id ? { p_branch_id: event.branch_id } : {}),
      ...(event.establishment_id ? { p_establishment_id: event.establishment_id } : {}),
      ...(event.organization_id ? { p_organization_id: event.organization_id } : {}),
      ...(event.actor_user_id ? { p_actor_user_id: event.actor_user_id } : {}),
    }).abortSignal(AbortSignal.timeout(3_000));
    if (error || typeof data !== "string" || !UUID.test(data)) {
      throw new Error("Audit persistence is unavailable.");
    }
    return data;
  } catch {
    // Do not surface provider responses, credentials, or payload values to callers/logs.
    throw new Error("Audit persistence is unavailable.");
  }
}

export type { AdminGuardAuditEvent };
