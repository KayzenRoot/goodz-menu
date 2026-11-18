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

export type OrdersSessionFixture = {
  apiUrl: string;
  anonKey: string;
  owner: SyntheticUser;
  branchStaff: SyntheticUser;
  organizationId: string;
  establishmentId: string;
  branchId: string;
  offerId: string;
  inspectOrdersAudit(correlationId: string): Promise<unknown[]>;
  cleanup(): Promise<void>;
};

export async function createOrdersSessionFixture(): Promise<OrdersSessionFixture> {
  const api = getLocalSupabaseApi(
    await runLocalDbCommand(["status", "--output", "json"]),
    "Orders E2E requires a loopback API and public anon key from the local Supabase stack.",
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
  const productId = randomUUID();
  const offerId = randomUUID();
  const organizationName = `GMZ-IMPL-009 Orders E2E ${randomUUID().slice(0, 8)}`;

  let owner: SyntheticUser | null = null;
  let branchStaff: SyntheticUser | null = null;

  try {
    owner = await createSyntheticUser(api, "owner", "gmz-impl-009-orders-e2e");
    branchStaff = await createSyntheticUser(api, "staff", "gmz-impl-009-orders-e2e");

    await runBatchSql(`
      INSERT INTO public.organizations (id, display_name) VALUES ('${organizationId}', '${organizationName}');
      INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('${establishmentId}', '${organizationId}', 'Matriz Operacional');
      INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('${branchId}', '${organizationId}', '${establishmentId}', 'Unidade Jardins');
      INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
        ('${ownerRoleId}', '${organizationId}', 'owner', 'Owner Orders E2E'),
        ('${staffRoleId}', '${organizationId}', 'staff', 'Staff Orders E2E');
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
      INSERT INTO public.products (id, organization_id, name, description, status)
        VALUES ('${productId}', '${organizationId}', 'Combo Artesanal Duplo', 'Burger duplo + fritas rústicas', 'active');
      INSERT INTO public.channel_offers (
        id, organization_id, establishment_id, branch_id, sales_channel_id,
        target_kind, product_id, base_price, currency, availability_state, is_visible, status
      ) VALUES (
        '${offerId}', '${organizationId}', '${establishmentId}', '${branchId}',
        (SELECT id FROM public.sales_channels WHERE organization_id = '${organizationId}' AND channel_key = 'goodz_online'),
        'product', '${productId}', 42.90, 'BRL', 'available', true, 'active'
      );
      INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
        VALUES ('storefront.ordering_enabled', 'branch', '${organizationId}', '${establishmentId}', '${branchId}', to_jsonb(true));
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
    establishmentId,
    branchId,
    offerId,
    inspectOrdersAudit: queryAuditEventsByCorrelation,
    async cleanup() {
      await runBatchSql(`
        DELETE FROM private.orders_step_up_consumptions
        WHERE guard_event_id IN (SELECT id FROM public.audit_events WHERE organization_id = '${organizationId}');
        ALTER TABLE public.audit_events DISABLE TRIGGER audit_events_immutable;
        DELETE FROM public.audit_events WHERE organization_id = '${organizationId}';
        ALTER TABLE public.audit_events ENABLE TRIGGER audit_events_immutable;
        ALTER TABLE public.order_handoff_payments DISABLE TRIGGER order_handoff_payments_immutable;
        ALTER TABLE public.order_status_transitions DISABLE TRIGGER order_status_transitions_immutable;
        ALTER TABLE public.order_items DISABLE TRIGGER order_items_immutable;
        DELETE FROM public.orders WHERE organization_id = '${organizationId}';
        ALTER TABLE public.order_handoff_payments ENABLE TRIGGER order_handoff_payments_immutable;
        ALTER TABLE public.order_status_transitions ENABLE TRIGGER order_status_transitions_immutable;
        ALTER TABLE public.order_items ENABLE TRIGGER order_items_immutable;
        DELETE FROM public.customers WHERE organization_id = '${organizationId}';
        DELETE FROM public.channel_offers WHERE organization_id = '${organizationId}';
        DELETE FROM public.products WHERE organization_id = '${organizationId}';
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
