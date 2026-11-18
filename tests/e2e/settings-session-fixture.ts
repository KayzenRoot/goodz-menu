import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  createSyntheticUser,
  getLocalSupabaseApi,
  sanitizeLocalSupabaseOutput,
  type SyntheticUser,
} from "./local-auth-fixture";

export type SettingsSessionFixture = {
  apiUrl: string;
  anonKey: string;
  owner: SyntheticUser;
  branchStaff: SyntheticUser;
  organizationId: string;
  organizationName: string;
  establishmentId: string;
  branchId: string;
  inspectSettingsAudit(correlationId: string): Promise<unknown[]>;
  cleanup(): Promise<void>;
};

const repositoryRoot = process.cwd();
const supabaseCli = path.join(repositoryRoot, "node_modules", "supabase", "dist", "supabase.js");
const requestedWorkdir = process.env.GOODZ_SUPABASE_WORKDIR?.trim();

function runSupabase(args: string[]): Promise<string> {
  return new Promise((resolveRun, reject) => {
    const cliArgs = requestedWorkdir
      ? [supabaseCli, "--workdir", path.resolve(requestedWorkdir), ...args]
      : [supabaseCli, ...args];
    const child = spawn(process.execPath, cliArgs, {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolveRun(stdout);
      else reject(new Error(`Local Supabase command failed (${signal || `exit ${code}`}). ${sanitizeLocalSupabaseOutput(`${stderr}\n${stdout}`)}`));
    });
  });
}

async function executeSql(sql: string) {
  for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await runSupabase(["db", "query", "--local", statement]);
  }
}

async function queryJson(sql: string): Promise<unknown[]> {
  const output = await runSupabase(["db", "query", "--local", "--output-format", "json", sql]);
  const jsonStart = output.search(/[[{]/);
  if (jsonStart < 0) throw new Error("Settings E2E local database returned no readable JSON evidence.");
  const result = JSON.parse(output.slice(jsonStart)) as unknown;
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] } | null)?.rows;
  if (!Array.isArray(rows)) throw new Error("Settings E2E local database returned an unexpected result shape.");
  return rows;
}

export async function createSettingsSessionFixture(): Promise<SettingsSessionFixture> {
  const api = getLocalSupabaseApi(
    await runSupabase(["status", "--output", "json"]),
    "Settings E2E requires a loopback API and public anon key from the local Supabase stack.",
  );
  const organizationId = randomUUID();
  const establishmentId = randomUUID();
  const branchId = randomUUID();
  const ownerRoleId = randomUUID();
  const staffRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const staffMembershipId = randomUUID();
  const ownerAssignmentId = randomUUID();
  const staffAssignmentId = randomUUID();
  const organizationName = `GMZ-IMPL-008 Settings E2E ${randomUUID().slice(0, 8)}`;

  let owner: SyntheticUser | null = null;
  let branchStaff: SyntheticUser | null = null;

  try {
    owner = await createSyntheticUser(api, "owner", "gmz-impl-008-settings-e2e");
    branchStaff = await createSyntheticUser(api, "branch-staff", "gmz-impl-008-settings-e2e");

    await executeSql(`
      INSERT INTO public.organizations (id, display_name) VALUES ('${organizationId}', '${organizationName}');
      INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('${establishmentId}', '${organizationId}', 'Matriz Piloto');
      INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('${branchId}', '${organizationId}', '${establishmentId}', 'Unidade Centro');
      INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
        ('${ownerRoleId}', '${organizationId}', 'owner', 'Owner Settings E2E'),
        ('${staffRoleId}', '${organizationId}', 'staff', 'Staff Settings E2E');
      INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
        ('${organizationId}', '${ownerRoleId}', 'tenant.hierarchy.read'),
        ('${organizationId}', '${staffRoleId}', 'tenant.hierarchy.read')
      ON CONFLICT DO NOTHING;
      INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id) VALUES
        ('${ownerMembershipId}', '${organizationId}', '${owner.id}', 'active', '${establishmentId}', '${branchId}'),
        ('${staffMembershipId}', '${organizationId}', '${branchStaff.id}', 'active', '${establishmentId}', '${branchId}');
      INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
        ('${ownerAssignmentId}', '${organizationId}', '${ownerMembershipId}', '${ownerRoleId}', 'organization', NULL, NULL),
        ('${staffAssignmentId}', '${organizationId}', '${staffMembershipId}', '${staffRoleId}', 'branch', '${establishmentId}', '${branchId}')
    `);
  } catch (error) {
    if (owner || branchStaff) {
      const userIds = [owner?.id, branchStaff?.id].filter(Boolean).map((id) => `'${id}'`).join(", ");
      if (userIds) {
        await executeSql(`DELETE FROM auth.users WHERE id IN (${userIds})`).catch(() => undefined);
      }
    }
    throw error;
  }

  return {
    apiUrl: api.apiUrl,
    anonKey: api.anonKey,
    owner,
    branchStaff,
    organizationId,
    organizationName,
    establishmentId,
    branchId,
    async inspectSettingsAudit(correlationId: string) {
      if (!/^[0-9a-f-]{36}$/i.test(correlationId)) throw new Error("Invalid correlation UUID.");
      return queryJson(
        `SELECT action, outcome, reason_code, source, metadata FROM public.audit_events WHERE correlation_id = '${correlationId}' ORDER BY created_at ASC`,
      );
    },
    async cleanup() {
      await executeSql(`
        DELETE FROM private.settings_step_up_consumptions
        WHERE guard_event_id IN (SELECT id FROM public.audit_events WHERE organization_id = '${organizationId}');
        ALTER TABLE public.audit_events DISABLE TRIGGER audit_events_immutable;
        DELETE FROM public.audit_events WHERE organization_id = '${organizationId}';
        ALTER TABLE public.audit_events ENABLE TRIGGER audit_events_immutable;
        DELETE FROM public.setting_values WHERE organization_id = '${organizationId}';
        DELETE FROM public.organization_plan_subscriptions WHERE organization_id = '${organizationId}';
        DELETE FROM public.membership_roles WHERE organization_id = '${organizationId}';
        DELETE FROM public.organization_memberships WHERE organization_id = '${organizationId}';
        DELETE FROM public.role_permissions WHERE organization_id = '${organizationId}';
        DELETE FROM public.tenant_roles WHERE organization_id = '${organizationId}';
        DELETE FROM public.sales_channels WHERE organization_id = '${organizationId}';
        DELETE FROM public.branches WHERE organization_id = '${organizationId}';
        DELETE FROM public.establishments WHERE organization_id = '${organizationId}';
        DELETE FROM public.organizations WHERE id = '${organizationId}';
        DELETE FROM auth.users WHERE id IN ('${owner.id}', '${branchStaff.id}')
      `).catch(() => undefined);
    },
  };
}
