import { randomUUID } from "node:crypto";
import {
  createSyntheticUser,
  getLocalSupabaseApi,
  type SyntheticUser,
} from "./local-auth-fixture";
import {
  queryAuditEventsByCorrelation,
  runBatchSql,
  runLocalDbCommand,
} from "./local-db-runner";

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

export async function createSettingsSessionFixture(): Promise<SettingsSessionFixture> {
  const api = getLocalSupabaseApi(
    await runLocalDbCommand(["status", "--output", "json"]),
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

    await runBatchSql(`
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
        ('${staffAssignmentId}', '${organizationId}', '${staffMembershipId}', '${staffRoleId}', 'branch', '${establishmentId}', '${branchId}');
    `);
  } catch (error) {
    const userIds = [owner?.id, branchStaff?.id].filter(Boolean).map((id) => `'${id}'`).join(", ");
    if (userIds) {
      await runBatchSql(`DELETE FROM auth.users WHERE id IN (${userIds});`).catch(() => undefined);
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
    inspectSettingsAudit: queryAuditEventsByCorrelation,
    async cleanup() {
      await runBatchSql(`
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
        DELETE FROM auth.users WHERE id IN ('${owner.id}', '${branchStaff.id}');
      `).catch(() => undefined);
    },
  };
}
