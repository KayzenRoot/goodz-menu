import { randomUUID } from "node:crypto";
import {
  createDataApiUser,
  executeBatchSql as executeSql,
  getVerifiedLocalDataApi as getLocalApi,
  sendRestRequest as restRequest,
} from "./local-supabase-cli.mjs";

const createdUserIds = new Set();
const checks = [];

const ids = {
  organizations: { a: randomUUID(), b: randomUUID() },
  establishments: { a: randomUUID(), b: randomUUID() },
  branches: { a1: randomUUID(), a2: randomUUID(), b1: randomUUID() },
  roles: { ownerA: randomUUID(), staffA: randomUUID(), ownerB: randomUUID() },
  memberships: { ownerA: randomUUID(), staffA: randomUUID(), ownerB: randomUUID() },
  assignments: { ownerA: randomUUID(), staffA: randomUUID(), ownerB: randomUUID() },
};

function record(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}

async function main() {
  const api = await getLocalApi(record);
  try {
    const ownerA = await createDataApiUser(api, "gmz-impl-008-settings", "owner-a", createdUserIds);
    const staffA = await createDataApiUser(api, "gmz-impl-008-settings", "staff-a", createdUserIds);
    const ownerB = await createDataApiUser(api, "gmz-impl-008-settings", "owner-b", createdUserIds);
    record("Synthetic local Auth identities minted");

    await executeSql(`
      INSERT INTO public.organizations (id, display_name) VALUES
        ('${ids.organizations.a}', 'GMZ-008 Integration Org A'),
        ('${ids.organizations.b}', 'GMZ-008 Integration Org B');
      INSERT INTO public.establishments (id, organization_id, display_name) VALUES
        ('${ids.establishments.a}', '${ids.organizations.a}', 'GMZ-008 Est A'),
        ('${ids.establishments.b}', '${ids.organizations.b}', 'GMZ-008 Est B');
      INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
        ('${ids.branches.a1}', '${ids.organizations.a}', '${ids.establishments.a}', 'GMZ-008 Branch A1'),
        ('${ids.branches.a2}', '${ids.organizations.a}', '${ids.establishments.a}', 'GMZ-008 Branch A2'),
        ('${ids.branches.b1}', '${ids.organizations.b}', '${ids.establishments.b}', 'GMZ-008 Branch B1');
      INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
        ('${ids.roles.ownerA}', '${ids.organizations.a}', 'owner', 'Owner A'),
        ('${ids.roles.staffA}', '${ids.organizations.a}', 'staff', 'Staff A'),
        ('${ids.roles.ownerB}', '${ids.organizations.b}', 'owner', 'Owner B');
      INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id) VALUES
        ('${ids.memberships.ownerA}', '${ids.organizations.a}', '${ownerA.id}', 'active', '${ids.establishments.a}', '${ids.branches.a1}'),
        ('${ids.memberships.staffA}', '${ids.organizations.a}', '${staffA.id}', 'active', '${ids.establishments.a}', '${ids.branches.a1}'),
        ('${ids.memberships.ownerB}', '${ids.organizations.b}', '${ownerB.id}', 'active', '${ids.establishments.b}', '${ids.branches.b1}');
      INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
        ('${ids.assignments.ownerA}', '${ids.organizations.a}', '${ids.memberships.ownerA}', '${ids.roles.ownerA}', 'organization', NULL, NULL),
        ('${ids.assignments.staffA}', '${ids.organizations.a}', '${ids.memberships.staffA}', '${ids.roles.staffA}', 'branch', '${ids.establishments.a}', '${ids.branches.a1}'),
        ('${ids.assignments.ownerB}', '${ids.organizations.b}', '${ids.memberships.ownerB}', '${ids.roles.ownerB}', 'organization', NULL, NULL)
    `);
    record("Tenant fixtures and automatic role/plan seeds applied");

    // 1. Anon denial
    const anonRead = await restRequest(api, "setting_values?select=id");
    if (anonRead.ok) throw new Error("Anon read on setting_values must be denied.");
    record("Anon Data API access to setting_values denied");

    // 2. Direct table mutation denial even for Owner
    const directInsert = await restRequest(api, "setting_values", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        setting_key: "storefront.pickup_enabled",
        scope_type: "organization",
        organization_id: ids.organizations.a,
        value_json: false,
      },
    });
    if (directInsert.ok) throw new Error("Direct POST to setting_values must be denied.");
    record("Direct table write to setting_values denied for authenticated owner");

    const directEntitlementInsert = await restRequest(api, "tenant_entitlement_overrides", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        organization_id: ids.organizations.a,
        entitlement_key: "catalog.max_active_products",
        value_json: 99999,
        reason: "Self-escalation attempt",
      },
    });
    if (directEntitlementInsert.ok) throw new Error("Direct POST to tenant_entitlement_overrides must be denied.");
    record("Direct self-grant to tenant_entitlement_overrides denied");

    // 3. Standard setting write & resolution via RPC
    const saveStandard = await restRequest(api, "rpc/settings_save_value", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_setting_key: "storefront.estimated_prep_minutes",
        p_scope_type: "branch",
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_role_id: null,
        p_value_json: 32,
        p_is_locked: false,
        p_step_up_proof_id: null,
        p_correlation_id: randomUUID(),
      },
    });
    if (!saveStandard.ok || !Array.isArray(saveStandard.payload?.audit_event_ids) || saveStandard.payload.audit_event_ids.length !== 1) {
      throw new Error(`Expected standard branch setting save receipt, got HTTP ${saveStandard.status}.`);
    }
    record("Owner saved standard branch setting with durable audit receipt");

    // 4. Sensitive setting fails without step-up proof, succeeds with service-role proof, rejects replay
    const deniedSensitive = await restRequest(api, "rpc/settings_save_value", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_setting_key: "storefront.ordering_enabled",
        p_scope_type: "branch",
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_role_id: null,
        p_value_json: true,
        p_is_locked: false,
        p_step_up_proof_id: null,
        p_correlation_id: randomUUID(),
      },
    });
    if (deniedSensitive.ok) throw new Error("Sensitive setting without step-up proof must fail closed.");
    record("Sensitive setting without step-up proof denied over Data API");

    const stepUpCorr = randomUUID();
    const mintProof = await restRequest(api, "rpc/append_settings_step_up_event", {
      method: "POST",
      token: api.serviceRoleKey,
      body: {
        p_actor_user_id: ownerA.id,
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_scope_type: "branch",
        p_setting_key: "storefront.ordering_enabled",
        p_required_permissions: ["settings.sensitive.write"],
        p_correlation_id: stepUpCorr,
        p_outcome: "allow",
        p_reason_code: "authorized",
      },
    });
    if (!mintProof.ok || typeof mintProof.payload !== "string") {
      throw new Error("Expected single-use step-up proof UUID from service_role RPC.");
    }

    const saveSensitive = await restRequest(api, "rpc/settings_save_value", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_setting_key: "storefront.ordering_enabled",
        p_scope_type: "branch",
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_role_id: null,
        p_value_json: true,
        p_is_locked: false,
        p_step_up_proof_id: mintProof.payload,
        p_correlation_id: stepUpCorr,
      },
    });
    if (!saveSensitive.ok) throw new Error("Sensitive setting with valid proof must succeed.");
    record("Sensitive setting saved with single-use step-up proof");

    const replaySensitive = await restRequest(api, "rpc/settings_save_value", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_setting_key: "storefront.ordering_enabled",
        p_scope_type: "branch",
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_role_id: null,
        p_value_json: false,
        p_is_locked: false,
        p_step_up_proof_id: mintProof.payload,
        p_correlation_id: randomUUID(),
      },
    });
    if (replaySensitive.ok) throw new Error("Replayed step-up proof must be rejected.");
    record("Replayed settings step-up proof rejected");

    // 5. Cross-tenant & sibling-branch isolation over Data API
    const crossTenantRead = await restRequest(
      api,
      `setting_values?organization_id=eq.${ids.organizations.a}&select=id`,
      { token: ownerB.accessToken },
    );
    if (!crossTenantRead.ok || !Array.isArray(crossTenantRead.payload) || crossTenantRead.payload.length !== 0) {
      throw new Error("Cross-tenant setting_values query must return 0 rows.");
    }
    record("Cross-tenant Data API SELECT returns zero rows");

    const crossTenantEntitlements = await restRequest(api, "rpc/resolve_tenant_entitlements", {
      method: "POST",
      token: ownerB.accessToken,
      body: { p_organization_id: ids.organizations.a },
    });
    if (crossTenantEntitlements.ok) {
      throw new Error("Cross-tenant resolve_tenant_entitlements must be denied.");
    }
    record("Cross-tenant resolve_tenant_entitlements denied");

    const siblingResolve = await restRequest(api, "rpc/resolve_effective_settings", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a2,
      },
    });
    if (siblingResolve.ok) {
      throw new Error("Branch A1 staff must be denied resolving sibling Branch A2 settings.");
    }
    record("Sibling-branch isolation enforced in resolve_effective_settings");

    console.log(`ALL ${checks.length} SETTINGS DATA API CHECKS PASSED.`);
  } finally {
    const orgList = `'${ids.organizations.a}', '${ids.organizations.b}'`;
    const userList = [...createdUserIds].map((id) => `'${id}'`).join(", ");
    await executeSql(`
      DELETE FROM private.settings_step_up_consumptions
      WHERE guard_event_id IN (SELECT id FROM public.audit_events WHERE organization_id IN (${orgList}));
      ALTER TABLE public.audit_events DISABLE TRIGGER audit_events_immutable;
      DELETE FROM public.audit_events WHERE organization_id IN (${orgList});
      ALTER TABLE public.audit_events ENABLE TRIGGER audit_events_immutable;
      DELETE FROM public.setting_values WHERE organization_id IN (${orgList});
      DELETE FROM public.organization_plan_subscriptions WHERE organization_id IN (${orgList});
      DELETE FROM public.membership_roles WHERE organization_id IN (${orgList});
      DELETE FROM public.organization_memberships WHERE organization_id IN (${orgList});
      DELETE FROM public.role_permissions WHERE organization_id IN (${orgList});
      DELETE FROM public.tenant_roles WHERE organization_id IN (${orgList});
      DELETE FROM public.sales_channels WHERE organization_id IN (${orgList});
      DELETE FROM public.branches WHERE organization_id IN (${orgList});
      DELETE FROM public.establishments WHERE organization_id IN (${orgList});
      DELETE FROM public.organizations WHERE id IN (${orgList});
      ${userList ? `DELETE FROM auth.users WHERE id IN (${userList});` : ""}
    `).catch(() => undefined);
  }
}

await main();
