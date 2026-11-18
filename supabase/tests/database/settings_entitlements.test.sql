BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz008_consts AS
SELECT
  'authenticated'::text AS c_auth_role,
  'service_role'::text AS c_svc_role,
  'anon'::text AS c_anon_role,
  'active'::text AS c_active,
  'request.jwt.claims'::text AS c_jwt_setting,
  '42501'::text AS c_err_42501,
  '22023'::text AS c_err_22023,
  'storefront.ordering_enabled'::text AS c_key_ordering,
  'storefront.estimated_prep_minutes'::text AS c_key_prep,
  'handoff.accepted_payment_methods'::text AS c_key_payments,
  'ui.density_mode'::text AS c_key_density,
  'storefront.online_orders'::text AS c_ent_online,
  'catalog.max_active_products'::text AS c_ent_max_prod,
  'organization'::text AS c_scope_org,
  'establishment'::text AS c_scope_est,
  'branch'::text AS c_scope_branch,
  'role'::text AS c_scope_role,
  'user'::text AS c_scope_user,
  'settings.sensitive.write'::text AS c_perm_sens,
  'allow'::text AS c_allow,
  'authorized'::text AS c_authorized,
  'public.setting_values'::text AS c_rel_setting_values,
  'EXECUTE'::text AS c_priv_execute,
  'ordering_br_a1'::text AS c_slot_ordering_br_a1,
  '91000000-0000-4000-8000-000000000001'::uuid AS c_user_owner_a,
  '91000000-0000-4000-8000-000000000002'::uuid AS c_user_staff_a1,
  '91000000-0000-4000-8000-000000000003'::uuid AS c_user_owner_b,
  '92000000-0000-4000-8000-000000000001'::uuid AS c_org_a,
  '92000000-0000-4000-8000-000000000002'::uuid AS c_org_b,
  '93000000-0000-4000-8000-000000000001'::uuid AS c_est_a,
  '93000000-0000-4000-8000-000000000002'::uuid AS c_est_b,
  '94000000-0000-4000-8000-000000000001'::uuid AS c_br_a1,
  '94000000-0000-4000-8000-000000000002'::uuid AS c_br_a2,
  '94000000-0000-4000-8000-000000000003'::uuid AS c_br_b1,
  '95000000-0000-4000-8000-000000000001'::uuid AS c_role_owner_a,
  '95000000-0000-4000-8000-000000000002'::uuid AS c_role_staff_a,
  '95000000-0000-4000-8000-000000000003'::uuid AS c_role_owner_b,
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}'::text AS c_jwt_owner_a,
  '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}'::text AS c_jwt_staff_a1,
  '{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}'::text AS c_jwt_owner_b;
GRANT SELECT ON TABLE pg_temp.gmz008_consts TO PUBLIC;

CREATE TEMP TABLE gmz008_proofs (slot text PRIMARY KEY, proof_id uuid NOT NULL);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz008_proofs TO PUBLIC;

SELECT no_plan();

-- Seed synthetic test identities & multi-tenant hierarchy
INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ((SELECT c_user_owner_a FROM pg_temp.gmz008_consts), (SELECT c_auth_role FROM pg_temp.gmz008_consts), (SELECT c_auth_role FROM pg_temp.gmz008_consts), 'gmz008-owner-a@example.invalid', now(), '{}', '{}', now(), now()),
  ((SELECT c_user_staff_a1 FROM pg_temp.gmz008_consts), (SELECT c_auth_role FROM pg_temp.gmz008_consts), (SELECT c_auth_role FROM pg_temp.gmz008_consts), 'gmz008-staff-a1@example.invalid', now(), '{}', '{}', now(), now()),
  ((SELECT c_user_owner_b FROM pg_temp.gmz008_consts), (SELECT c_auth_role FROM pg_temp.gmz008_consts), (SELECT c_auth_role FROM pg_temp.gmz008_consts), 'gmz008-owner-b@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name, status)
VALUES
  ((SELECT c_org_a FROM pg_temp.gmz008_consts), 'GMZ-008 Org A', (SELECT c_active FROM pg_temp.gmz008_consts)),
  ((SELECT c_org_b FROM pg_temp.gmz008_consts), 'GMZ-008 Org B', (SELECT c_active FROM pg_temp.gmz008_consts));

INSERT INTO public.establishments (id, organization_id, display_name, status)
VALUES
  ((SELECT c_est_a FROM pg_temp.gmz008_consts), (SELECT c_org_a FROM pg_temp.gmz008_consts), 'Est A', (SELECT c_active FROM pg_temp.gmz008_consts)),
  ((SELECT c_est_b FROM pg_temp.gmz008_consts), (SELECT c_org_b FROM pg_temp.gmz008_consts), 'Est B', (SELECT c_active FROM pg_temp.gmz008_consts));

INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
VALUES
  ((SELECT c_br_a1 FROM pg_temp.gmz008_consts), (SELECT c_org_a FROM pg_temp.gmz008_consts), (SELECT c_est_a FROM pg_temp.gmz008_consts), 'Branch A1', (SELECT c_active FROM pg_temp.gmz008_consts)),
  ((SELECT c_br_a2 FROM pg_temp.gmz008_consts), (SELECT c_org_a FROM pg_temp.gmz008_consts), (SELECT c_est_a FROM pg_temp.gmz008_consts), 'Branch A2', (SELECT c_active FROM pg_temp.gmz008_consts)),
  ((SELECT c_br_b1 FROM pg_temp.gmz008_consts), (SELECT c_org_b FROM pg_temp.gmz008_consts), (SELECT c_est_b FROM pg_temp.gmz008_consts), 'Branch B1', (SELECT c_active FROM pg_temp.gmz008_consts));

-- Trigger on tenant_roles automatically seeds settings.* permissions according to role_key
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
VALUES
  ((SELECT c_role_owner_a FROM pg_temp.gmz008_consts), (SELECT c_org_a FROM pg_temp.gmz008_consts), 'owner', 'Owner A'),
  ((SELECT c_role_staff_a FROM pg_temp.gmz008_consts), (SELECT c_org_a FROM pg_temp.gmz008_consts), 'staff', 'Staff A'),
  ((SELECT c_role_owner_b FROM pg_temp.gmz008_consts), (SELECT c_org_b FROM pg_temp.gmz008_consts), 'owner', 'Owner B');

INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id)
VALUES
  ('96000000-0000-4000-8000-000000000001', (SELECT c_org_a FROM pg_temp.gmz008_consts), (SELECT c_user_owner_a FROM pg_temp.gmz008_consts), (SELECT c_active FROM pg_temp.gmz008_consts), (SELECT c_est_a FROM pg_temp.gmz008_consts), (SELECT c_br_a1 FROM pg_temp.gmz008_consts)),
  ('96000000-0000-4000-8000-000000000002', (SELECT c_org_a FROM pg_temp.gmz008_consts), (SELECT c_user_staff_a1 FROM pg_temp.gmz008_consts), (SELECT c_active FROM pg_temp.gmz008_consts), (SELECT c_est_a FROM pg_temp.gmz008_consts), (SELECT c_br_a1 FROM pg_temp.gmz008_consts)),
  ('96000000-0000-4000-8000-000000000003', (SELECT c_org_b FROM pg_temp.gmz008_consts), (SELECT c_user_owner_b FROM pg_temp.gmz008_consts), (SELECT c_active FROM pg_temp.gmz008_consts), (SELECT c_est_b FROM pg_temp.gmz008_consts), (SELECT c_br_b1 FROM pg_temp.gmz008_consts));

INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('97000000-0000-4000-8000-000000000001', (SELECT c_org_a FROM pg_temp.gmz008_consts), '96000000-0000-4000-8000-000000000001', (SELECT c_role_owner_a FROM pg_temp.gmz008_consts), (SELECT c_scope_org FROM pg_temp.gmz008_consts), NULL, NULL),
  ('97000000-0000-4000-8000-000000000002', (SELECT c_org_a FROM pg_temp.gmz008_consts), '96000000-0000-4000-8000-000000000002', (SELECT c_role_staff_a FROM pg_temp.gmz008_consts), (SELECT c_scope_branch FROM pg_temp.gmz008_consts), (SELECT c_est_a FROM pg_temp.gmz008_consts), (SELECT c_br_a1 FROM pg_temp.gmz008_consts)),
  ('97000000-0000-4000-8000-000000000003', (SELECT c_org_b FROM pg_temp.gmz008_consts), '96000000-0000-4000-8000-000000000003', (SELECT c_role_owner_b FROM pg_temp.gmz008_consts), (SELECT c_scope_org FROM pg_temp.gmz008_consts), NULL, NULL);

-- 1. Registry & Plan Seed Assertions
SELECT is(
  (SELECT count(*)::integer FROM public.setting_definitions WHERE status = (SELECT c_active FROM pg_temp.gmz008_consts)),
  11,
  'Settings registry seeds all 10 D-0023 pilot keys plus ui.density_mode'
);

SELECT is(
  (SELECT default_value FROM public.setting_definitions WHERE key = (SELECT c_key_ordering FROM pg_temp.gmz008_consts)),
  to_jsonb(false),
  'storefront.ordering_enabled defaults fail-closed to false'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_plan_subscriptions WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz008_consts)),
  1,
  'New organizations automatically receive default pilot_mvp plan subscription'
);

-- 2. Privilege & RLS Surface Assertions
SELECT ok(
  NOT has_table_privilege((SELECT c_anon_role FROM pg_temp.gmz008_consts), (SELECT c_rel_setting_values FROM pg_temp.gmz008_consts), 'SELECT'),
  'anon has zero read privilege on setting_values'
);

SELECT ok(
  NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz008_consts), (SELECT c_rel_setting_values FROM pg_temp.gmz008_consts), 'INSERT')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz008_consts), (SELECT c_rel_setting_values FROM pg_temp.gmz008_consts), 'UPDATE')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz008_consts), 'public.tenant_entitlement_overrides', 'INSERT'),
  'authenticated cannot directly insert/update setting_values or self-grant entitlement overrides'
);

SELECT ok(
  has_function_privilege(
    (SELECT c_svc_role FROM pg_temp.gmz008_consts),
    'public.append_settings_step_up_event(uuid,uuid,uuid,uuid,text,text,text[],uuid,text,text)',
    (SELECT c_priv_execute FROM pg_temp.gmz008_consts)
  )
  AND NOT has_function_privilege(
    (SELECT c_auth_role FROM pg_temp.gmz008_consts),
    'public.append_settings_step_up_event(uuid,uuid,uuid,uuid,text,text,text[],uuid,text,text)',
    (SELECT c_priv_execute FROM pg_temp.gmz008_consts)
  ),
  'append_settings_step_up_event is restricted exclusively to service_role'
);

SELECT ok(
  NOT has_function_privilege(
    (SELECT c_svc_role FROM pg_temp.gmz008_consts),
    'public.settings_save_value(text,text,uuid,uuid,uuid,uuid,jsonb,boolean,uuid,uuid)',
    (SELECT c_priv_execute FROM pg_temp.gmz008_consts)
  ),
  'service_role cannot execute business settings_save_value RPC'
);

-- 3. Authenticated Owner A: Standard Hierarchy Resolution & Saving
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz008_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz008_consts), true);

SELECT lives_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_prep FROM pg_temp.gmz008_consts),
      (SELECT c_scope_org FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      NULL, NULL, NULL,
      to_jsonb(30),
      false,
      NULL,
      '98000000-0000-4000-8000-000000000001'::uuid
    )$$,
  'Owner A saves organization-level prep minutes without step-up when unlocked'
);

SELECT lives_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_prep FROM pg_temp.gmz008_consts),
      (SELECT c_scope_est FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      NULL, NULL,
      to_jsonb(35),
      false,
      NULL,
      '98000000-0000-4000-8000-000000000002'::uuid
    )$$,
  'Owner A overrides prep minutes at establishment level'
);

SELECT lives_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_prep FROM pg_temp.gmz008_consts),
      (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
      NULL,
      to_jsonb(40),
      false,
      NULL,
      '98000000-0000-4000-8000-000000000003'::uuid
    )$$,
  'Owner A overrides prep minutes at Branch A1 level'
);

SELECT is(
  (SELECT effective_value FROM public.resolve_effective_settings(
    (SELECT c_org_a FROM pg_temp.gmz008_consts),
    (SELECT c_est_a FROM pg_temp.gmz008_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz008_consts)
  ) WHERE setting_key = (SELECT c_key_prep FROM pg_temp.gmz008_consts)),
  to_jsonb(40),
  'Branch A1 resolves to branch override (40 min)'
);

SELECT is(
  (SELECT effective_value FROM public.resolve_effective_settings(
    (SELECT c_org_a FROM pg_temp.gmz008_consts),
    (SELECT c_est_a FROM pg_temp.gmz008_consts),
    (SELECT c_br_a2 FROM pg_temp.gmz008_consts)
  ) WHERE setting_key = (SELECT c_key_prep FROM pg_temp.gmz008_consts)),
  to_jsonb(35),
  'Sibling Branch A2 inherits establishment value (35 min)'
);

-- 4. Sensitive Setting Fails Closed Without Step-Up Proof
SELECT throws_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_ordering FROM pg_temp.gmz008_consts),
      (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
      NULL,
      to_jsonb(true),
      false,
      NULL,
      '98000000-0000-4000-8000-000000000004'::uuid
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz008_consts),
  NULL,
  'storefront.ordering_enabled fails closed without Admin Guard step-up proof'
);

-- Mint step-up proof via service_role and verify single-use consumption
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz008_proofs (slot, proof_id)
VALUES (
  (SELECT c_slot_ordering_br_a1 FROM pg_temp.gmz008_consts),
  public.append_settings_step_up_event(
    (SELECT c_user_owner_a FROM pg_temp.gmz008_consts),
    (SELECT c_org_a FROM pg_temp.gmz008_consts),
    (SELECT c_est_a FROM pg_temp.gmz008_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
    (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
    (SELECT c_key_ordering FROM pg_temp.gmz008_consts),
    ARRAY[(SELECT c_perm_sens FROM pg_temp.gmz008_consts)],
    '98000000-0000-4000-8000-000000000005'::uuid,
    (SELECT c_allow FROM pg_temp.gmz008_consts),
    (SELECT c_authorized FROM pg_temp.gmz008_consts)
  )
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz008_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz008_consts), true);

SELECT lives_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_ordering FROM pg_temp.gmz008_consts),
      (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
      NULL,
      to_jsonb(true),
      false,
      (SELECT proof_id FROM pg_temp.gmz008_proofs WHERE slot = (SELECT c_slot_ordering_br_a1 FROM pg_temp.gmz008_consts)),
      '98000000-0000-4000-8000-000000000005'::uuid
    )$$,
  'Valid single-use step-up proof enables storefront.ordering_enabled on Branch A1'
);

SELECT throws_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_ordering FROM pg_temp.gmz008_consts),
      (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
      NULL,
      to_jsonb(false),
      false,
      (SELECT proof_id FROM pg_temp.gmz008_proofs WHERE slot = (SELECT c_slot_ordering_br_a1 FROM pg_temp.gmz008_consts)),
      '98000000-0000-4000-8000-000000000006'::uuid
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz008_consts),
  NULL,
  'Replaying an already-consumed step-up proof is rejected'
);

-- 5. Organization Policy Lock Blocks Branch Override & Halts Inheritance
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz008_proofs (slot, proof_id)
VALUES (
  'lock_prep_org_a',
  public.append_settings_step_up_event(
    (SELECT c_user_owner_a FROM pg_temp.gmz008_consts),
    (SELECT c_org_a FROM pg_temp.gmz008_consts),
    NULL,
    NULL,
    (SELECT c_scope_org FROM pg_temp.gmz008_consts),
    (SELECT c_key_prep FROM pg_temp.gmz008_consts),
    ARRAY[(SELECT c_perm_sens FROM pg_temp.gmz008_consts)],
    '98000000-0000-4000-8000-000000000007'::uuid,
    (SELECT c_allow FROM pg_temp.gmz008_consts),
    (SELECT c_authorized FROM pg_temp.gmz008_consts)
  )
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz008_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz008_consts), true);

SELECT lives_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_prep FROM pg_temp.gmz008_consts),
      (SELECT c_scope_org FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      NULL, NULL, NULL,
      to_jsonb(20),
      true,
      (SELECT proof_id FROM pg_temp.gmz008_proofs WHERE slot = 'lock_prep_org_a'),
      '98000000-0000-4000-8000-000000000007'::uuid
    )$$,
  'Owner A locks prep minutes at Organization A to 20 min with step-up proof'
);

SELECT is(
  (SELECT effective_value FROM public.resolve_effective_settings(
    (SELECT c_org_a FROM pg_temp.gmz008_consts),
    (SELECT c_est_a FROM pg_temp.gmz008_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz008_consts)
  ) WHERE setting_key = (SELECT c_key_prep FROM pg_temp.gmz008_consts)),
  to_jsonb(20),
  'Locked organization policy overrides previously saved establishment and branch values'
);

SELECT throws_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_prep FROM pg_temp.gmz008_consts),
      (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
      NULL,
      to_jsonb(50),
      false,
      NULL,
      '98000000-0000-4000-8000-000000000008'::uuid
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz008_consts),
  NULL,
  'Attempting to save a branch override while organization policy is locked fails closed'
);

-- 6. Staff Branch Isolation + Role/User/Device-Session Density Hierarchy
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz008_consts), (SELECT c_jwt_staff_a1 FROM pg_temp.gmz008_consts), true);

SELECT throws_ok(
  $$SELECT public.settings_save_value(
      'storefront.public_notice',
      (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
      NULL,
      to_jsonb('Aviso indevido'::text),
      false,
      NULL,
      '98000000-0000-4000-8000-000000000009'::uuid
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz008_consts),
  NULL,
  'Staff without settings.write cannot mutate branch operational settings'
);

SELECT throws_ok(
  $$SELECT * FROM public.resolve_effective_settings(
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      (SELECT c_est_a FROM pg_temp.gmz008_consts),
      (SELECT c_br_a2 FROM pg_temp.gmz008_consts)
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz008_consts),
  NULL,
  'Branch A1 staff cannot resolve settings for sibling Branch A2'
);

SELECT lives_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_density FROM pg_temp.gmz008_consts),
      (SELECT c_scope_user FROM pg_temp.gmz008_consts),
      (SELECT c_org_a FROM pg_temp.gmz008_consts),
      NULL, NULL, NULL,
      to_jsonb('compact'::text),
      false,
      NULL,
      '98000000-0000-4000-8000-000000000010'::uuid
    )$$,
  'Staff can save their own user-scoped ui.density_mode preference'
);

SELECT is(
  (SELECT effective_source FROM public.resolve_effective_settings(
    (SELECT c_org_a FROM pg_temp.gmz008_consts),
    (SELECT c_est_a FROM pg_temp.gmz008_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz008_consts),
    '{"ui.density_mode":"comfortable"}'::jsonb
  ) WHERE setting_key = (SELECT c_key_density FROM pg_temp.gmz008_consts)),
  'device_session',
  'Ephemeral device_session override takes precedence over user preference when unlocked'
);

-- 7. Plans & Entitlements Separation + Cross-Tenant Isolation
RESET ROLE;
INSERT INTO public.tenant_entitlement_overrides (organization_id, entitlement_key, value_json, reason)
VALUES (
  (SELECT c_org_b FROM pg_temp.gmz008_consts),
  (SELECT c_ent_online FROM pg_temp.gmz008_consts),
  to_jsonb(false),
  'Suspensão operacional temporária'
);

SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz008_proofs (slot, proof_id)
VALUES (
  'ordering_org_b',
  public.append_settings_step_up_event(
    (SELECT c_user_owner_b FROM pg_temp.gmz008_consts),
    (SELECT c_org_b FROM pg_temp.gmz008_consts),
    (SELECT c_est_b FROM pg_temp.gmz008_consts),
    (SELECT c_br_b1 FROM pg_temp.gmz008_consts),
    (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
    (SELECT c_key_ordering FROM pg_temp.gmz008_consts),
    ARRAY[(SELECT c_perm_sens FROM pg_temp.gmz008_consts)],
    '98000000-0000-4000-8000-000000000011'::uuid,
    (SELECT c_allow FROM pg_temp.gmz008_consts),
    (SELECT c_authorized FROM pg_temp.gmz008_consts)
  )
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz008_consts), (SELECT c_jwt_owner_b FROM pg_temp.gmz008_consts), true);

SELECT is(
  (SELECT count(*)::integer FROM public.setting_values WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz008_consts)),
  0,
  'Cross-tenant Owner B sees zero setting_values rows belonging to Organization A'
);

SELECT is(
  (SELECT source FROM public.resolve_tenant_entitlements((SELECT c_org_b FROM pg_temp.gmz008_consts))
   WHERE entitlement_key = (SELECT c_ent_online FROM pg_temp.gmz008_consts)),
  'tenant_override',
  'Tenant entitlement override supersedes plan entitlement grant'
);

SELECT throws_ok(
  $$SELECT public.settings_save_value(
      (SELECT c_key_ordering FROM pg_temp.gmz008_consts),
      (SELECT c_scope_branch FROM pg_temp.gmz008_consts),
      (SELECT c_org_b FROM pg_temp.gmz008_consts),
      (SELECT c_est_b FROM pg_temp.gmz008_consts),
      (SELECT c_br_b1 FROM pg_temp.gmz008_consts),
      NULL,
      to_jsonb(true),
      false,
      (SELECT proof_id FROM pg_temp.gmz008_proofs WHERE slot = 'ordering_org_b'),
      '98000000-0000-4000-8000-000000000011'::uuid
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz008_consts),
  NULL,
  'storefront.ordering_enabled cannot be enabled when storefront.online_orders entitlement is overridden to false'
);

SELECT * FROM finish();
ROLLBACK;
