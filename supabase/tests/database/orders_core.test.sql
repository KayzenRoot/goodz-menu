BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz009_consts AS
SELECT
  'authenticated'::text AS c_auth_role,
  'service_role'::text AS c_svc_role,
  'anon'::text AS c_anon_role,
  'active'::text AS c_active,
  'request.jwt.claims'::text AS c_jwt_setting,
  '42501'::text AS c_err_42501,
  '22023'::text AS c_err_22023,
  '55000'::text AS c_err_55000,
  'public.orders'::text AS c_rel_orders,
  'EXECUTE'::text AS c_priv_execute,
  'pickup'::text AS c_pickup,
  'own_delivery'::text AS c_own_delivery,
  'pix_in_person'::text AS c_pay_pix,
  'cash'::text AS c_pay_cash,
  'collected'::text AS c_hp_collected,
  'reversed'::text AS c_hp_reversed,
  'orders.handoff_payment.sensitive'::text AS c_perm_hp_sens,
  'idem-pickup-order-0001'::text AS c_idem_pickup,
  'idem-delivery-order-0002'::text AS c_idem_delivery,
  'Marina Cliente'::text AS c_cust_name,
  'channel_offer_id'::text AS c_key_offer_id,
  'quantity'::text AS c_key_qty,
  'pickup_1'::text AS c_slot_p1,
  'a1000000-0000-4000-8000-000000000001'::uuid AS c_user_owner_a,
  'a1000000-0000-4000-8000-000000000002'::uuid AS c_user_staff_a1,
  'a1000000-0000-4000-8000-000000000003'::uuid AS c_user_owner_b,
  'a2000000-0000-4000-8000-000000000001'::uuid AS c_org_a,
  'a2000000-0000-4000-8000-000000000002'::uuid AS c_org_b,
  'a3000000-0000-4000-8000-000000000001'::uuid AS c_est_a,
  'a3000000-0000-4000-8000-000000000002'::uuid AS c_est_b,
  'a4000000-0000-4000-8000-000000000001'::uuid AS c_br_a1,
  'a4000000-0000-4000-8000-000000000002'::uuid AS c_br_a2,
  'a4000000-0000-4000-8000-000000000003'::uuid AS c_br_b1,
  'a5000000-0000-4000-8000-000000000001'::uuid AS c_prod_a,
  'a5000000-0000-4000-8000-000000000002'::uuid AS c_offer_a1,
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}'::text AS c_jwt_owner_a,
  '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}'::text AS c_jwt_staff_a1,
  '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}'::text AS c_jwt_owner_b;
GRANT SELECT ON TABLE pg_temp.gmz009_consts TO PUBLIC;

CREATE TEMP TABLE gmz009_state (slot text PRIMARY KEY, id_val uuid NOT NULL, proof_val uuid);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz009_state TO PUBLIC;

SELECT no_plan();

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ((SELECT c_user_owner_a FROM pg_temp.gmz009_consts), (SELECT c_auth_role FROM pg_temp.gmz009_consts), (SELECT c_auth_role FROM pg_temp.gmz009_consts), 'gmz009-owner-a@example.invalid', now(), '{}', '{}', now(), now()),
  ((SELECT c_user_staff_a1 FROM pg_temp.gmz009_consts), (SELECT c_auth_role FROM pg_temp.gmz009_consts), (SELECT c_auth_role FROM pg_temp.gmz009_consts), 'gmz009-staff-a1@example.invalid', now(), '{}', '{}', now(), now()),
  ((SELECT c_user_owner_b FROM pg_temp.gmz009_consts), (SELECT c_auth_role FROM pg_temp.gmz009_consts), (SELECT c_auth_role FROM pg_temp.gmz009_consts), 'gmz009-owner-b@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name, status)
VALUES
  ((SELECT c_org_a FROM pg_temp.gmz009_consts), 'GMZ-009 Org A', (SELECT c_active FROM pg_temp.gmz009_consts)),
  ((SELECT c_org_b FROM pg_temp.gmz009_consts), 'GMZ-009 Org B', (SELECT c_active FROM pg_temp.gmz009_consts));

INSERT INTO public.establishments (id, organization_id, display_name, status)
VALUES
  ((SELECT c_est_a FROM pg_temp.gmz009_consts), (SELECT c_org_a FROM pg_temp.gmz009_consts), 'Est A', (SELECT c_active FROM pg_temp.gmz009_consts)),
  ((SELECT c_est_b FROM pg_temp.gmz009_consts), (SELECT c_org_b FROM pg_temp.gmz009_consts), 'Est B', (SELECT c_active FROM pg_temp.gmz009_consts));

INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
VALUES
  ((SELECT c_br_a1 FROM pg_temp.gmz009_consts), (SELECT c_org_a FROM pg_temp.gmz009_consts), (SELECT c_est_a FROM pg_temp.gmz009_consts), 'Branch A1', (SELECT c_active FROM pg_temp.gmz009_consts)),
  ((SELECT c_br_a2 FROM pg_temp.gmz009_consts), (SELECT c_org_a FROM pg_temp.gmz009_consts), (SELECT c_est_a FROM pg_temp.gmz009_consts), 'Branch A2', (SELECT c_active FROM pg_temp.gmz009_consts)),
  ((SELECT c_br_b1 FROM pg_temp.gmz009_consts), (SELECT c_org_b FROM pg_temp.gmz009_consts), (SELECT c_est_b FROM pg_temp.gmz009_consts), 'Branch B1', (SELECT c_active FROM pg_temp.gmz009_consts));

INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
VALUES
  ('a6000000-0000-4000-8000-000000000001', (SELECT c_org_a FROM pg_temp.gmz009_consts), 'owner', 'Owner A'),
  ('a6000000-0000-4000-8000-000000000002', (SELECT c_org_a FROM pg_temp.gmz009_consts), 'staff', 'Staff A'),
  ('a6000000-0000-4000-8000-000000000003', (SELECT c_org_b FROM pg_temp.gmz009_consts), 'owner', 'Owner B');

INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id)
VALUES
  ('a7000000-0000-4000-8000-000000000001', (SELECT c_org_a FROM pg_temp.gmz009_consts), (SELECT c_user_owner_a FROM pg_temp.gmz009_consts), (SELECT c_active FROM pg_temp.gmz009_consts), (SELECT c_est_a FROM pg_temp.gmz009_consts), (SELECT c_br_a1 FROM pg_temp.gmz009_consts)),
  ('a7000000-0000-4000-8000-000000000002', (SELECT c_org_a FROM pg_temp.gmz009_consts), (SELECT c_user_staff_a1 FROM pg_temp.gmz009_consts), (SELECT c_active FROM pg_temp.gmz009_consts), (SELECT c_est_a FROM pg_temp.gmz009_consts), (SELECT c_br_a1 FROM pg_temp.gmz009_consts)),
  ('a7000000-0000-4000-8000-000000000003', (SELECT c_org_b FROM pg_temp.gmz009_consts), (SELECT c_user_owner_b FROM pg_temp.gmz009_consts), (SELECT c_active FROM pg_temp.gmz009_consts), (SELECT c_est_b FROM pg_temp.gmz009_consts), (SELECT c_br_b1 FROM pg_temp.gmz009_consts));

INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('a8000000-0000-4000-8000-000000000001', (SELECT c_org_a FROM pg_temp.gmz009_consts), 'a7000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'organization', NULL, NULL),
  ('a8000000-0000-4000-8000-000000000002', (SELECT c_org_a FROM pg_temp.gmz009_consts), 'a7000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000002', 'branch', (SELECT c_est_a FROM pg_temp.gmz009_consts), (SELECT c_br_a1 FROM pg_temp.gmz009_consts)),
  ('a8000000-0000-4000-8000-000000000003', (SELECT c_org_b FROM pg_temp.gmz009_consts), 'a7000000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000003', 'organization', NULL, NULL);

-- Seed available Goodz Online offer in Branch A1
INSERT INTO public.products (id, organization_id, name, description, status)
VALUES ((SELECT c_prod_a FROM pg_temp.gmz009_consts), (SELECT c_org_a FROM pg_temp.gmz009_consts), 'Smash Burger Artesanal', 'Pão brioche e blend 160g', (SELECT c_active FROM pg_temp.gmz009_consts));

INSERT INTO public.channel_offers (
  id, organization_id, establishment_id, branch_id, sales_channel_id,
  target_kind, product_id, base_price, currency, availability_state, is_visible, status
) VALUES (
  (SELECT c_offer_a1 FROM pg_temp.gmz009_consts),
  (SELECT c_org_a FROM pg_temp.gmz009_consts),
  (SELECT c_est_a FROM pg_temp.gmz009_consts),
  (SELECT c_br_a1 FROM pg_temp.gmz009_consts),
  (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz009_consts) AND channel_key = 'goodz_online'),
  'product',
  (SELECT c_prod_a FROM pg_temp.gmz009_consts),
  28.50,
  'BRL',
  'available',
  true,
  (SELECT c_active FROM pg_temp.gmz009_consts)
);

-- 1. Privilege & RLS Assertions
SELECT ok(
  NOT has_table_privilege((SELECT c_anon_role FROM pg_temp.gmz009_consts), (SELECT c_rel_orders FROM pg_temp.gmz009_consts), 'SELECT')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz009_consts), (SELECT c_rel_orders FROM pg_temp.gmz009_consts), 'INSERT')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz009_consts), 'public.order_items', 'UPDATE')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz009_consts), 'public.order_handoff_payments', 'INSERT'),
  'anon has zero access and authenticated has zero direct write access to order/ledger tables'
);

-- 2. Ordering Fails Closed While storefront.ordering_enabled = false
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz009_consts), (SELECT c_jwt_staff_a1 FROM pg_temp.gmz009_consts), true);

SELECT throws_ok(
  $$SELECT public.orders_place_staff(
      (SELECT c_org_a FROM pg_temp.gmz009_consts),
      (SELECT c_est_a FROM pg_temp.gmz009_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz009_consts),
      (SELECT c_pickup FROM pg_temp.gmz009_consts),
      (SELECT c_cust_name FROM pg_temp.gmz009_consts),
      '11988887777',
      NULL,
      0,
      (SELECT c_pay_pix FROM pg_temp.gmz009_consts),
      NULL,
      '',
      jsonb_build_array(jsonb_build_object((SELECT c_key_offer_id FROM pg_temp.gmz009_consts), (SELECT c_offer_a1 FROM pg_temp.gmz009_consts)::text, (SELECT c_key_qty FROM pg_temp.gmz009_consts), 2)),
      (SELECT c_idem_pickup FROM pg_temp.gmz009_consts),
      'a9000000-0000-4000-8000-000000000001'::uuid
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz009_consts),
  NULL,
  'Order placement fails closed while storefront.ordering_enabled defaults to false'
);

-- Enable storefront.ordering_enabled on Branch A1
RESET ROLE;
INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
VALUES (
  'storefront.ordering_enabled',
  'branch',
  (SELECT c_org_a FROM pg_temp.gmz009_consts),
  (SELECT c_est_a FROM pg_temp.gmz009_consts),
  (SELECT c_br_a1 FROM pg_temp.gmz009_consts),
  to_jsonb(true)
);

-- 3. Staff Places Pickup Order + Verifies Exact Decimal Snapshot + Idempotent Replay
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz009_consts), (SELECT c_jwt_staff_a1 FROM pg_temp.gmz009_consts), true);

INSERT INTO pg_temp.gmz009_state (slot, id_val)
SELECT
  (SELECT c_slot_p1 FROM pg_temp.gmz009_consts),
  (public.orders_place_staff(
    (SELECT c_org_a FROM pg_temp.gmz009_consts),
    (SELECT c_est_a FROM pg_temp.gmz009_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz009_consts),
    (SELECT c_pickup FROM pg_temp.gmz009_consts),
    (SELECT c_cust_name FROM pg_temp.gmz009_consts),
    '(11) 98888-7777',
    NULL,
    0,
    (SELECT c_pay_pix FROM pg_temp.gmz009_consts),
    NULL,
    'Sem cebola',
    jsonb_build_array(jsonb_build_object((SELECT c_key_offer_id FROM pg_temp.gmz009_consts), (SELECT c_offer_a1 FROM pg_temp.gmz009_consts)::text, (SELECT c_key_qty FROM pg_temp.gmz009_consts), 2)),
    (SELECT c_idem_pickup FROM pg_temp.gmz009_consts),
    'a9000000-0000-4000-8000-000000000002'::uuid
  )->>'order_id')::uuid;

SELECT is(
  (SELECT total_amount FROM public.orders WHERE id = (SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts))),
  57.00::numeric(12, 2),
  'Order computes exact numeric(12,2) total (2 * 28.50 = 57.00)'
);

SELECT is(
  (public.orders_place_staff(
    (SELECT c_org_a FROM pg_temp.gmz009_consts),
    (SELECT c_est_a FROM pg_temp.gmz009_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz009_consts),
    (SELECT c_pickup FROM pg_temp.gmz009_consts),
    (SELECT c_cust_name FROM pg_temp.gmz009_consts),
    '(11) 98888-7777',
    NULL,
    0,
    (SELECT c_pay_pix FROM pg_temp.gmz009_consts),
    NULL,
    'Sem cebola',
    jsonb_build_array(jsonb_build_object((SELECT c_key_offer_id FROM pg_temp.gmz009_consts), (SELECT c_offer_a1 FROM pg_temp.gmz009_consts)::text, (SELECT c_key_qty FROM pg_temp.gmz009_consts), 2)),
    (SELECT c_idem_pickup FROM pg_temp.gmz009_consts),
    'a9000000-0000-4000-8000-000000000003'::uuid
  )->>'idempotent_replay')::boolean,
  true,
  'Duplicate idempotency_key returns idempotent_replay = true without creating a second order'
);

-- Subsequent catalog price change must not alter historical order_items snapshot
RESET ROLE;
UPDATE public.channel_offers SET base_price = 39.90 WHERE id = (SELECT c_offer_a1 FROM pg_temp.gmz009_consts);

SELECT is(
  (SELECT unit_price_snapshot FROM public.order_items WHERE order_id = (SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts))),
  28.50::numeric(12, 2),
  'Historical order_items snapshot remains immutable after catalog price change'
);

SELECT throws_ok(
  $$UPDATE public.order_items SET quantity = 5 WHERE order_id = (SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts))$$,
  (SELECT c_err_55000 FROM pg_temp.gmz009_consts),
  NULL,
  'Direct UPDATE on order_items is blocked by immutability trigger'
);

-- 4. Deterministic Lifecycle Progression & Invalid Jump Rejection
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz009_consts), (SELECT c_jwt_staff_a1 FROM pg_temp.gmz009_consts), true);

SELECT throws_ok(
  $$SELECT public.orders_transition_status(
      (SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)),
      'completed',
      '',
      'a9000000-0000-4000-8000-000000000004'::uuid
    )$$,
  (SELECT c_err_22023 FROM pg_temp.gmz009_consts),
  NULL,
  'Skipping intermediate lifecycle states (placed -> completed) is rejected'
);

SELECT lives_ok(
  $$SELECT public.orders_transition_status((SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)), 'accepted', '', 'a9000000-0000-4000-8000-000000000005'::uuid);
    SELECT public.orders_transition_status((SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)), 'preparing', '', 'a9000000-0000-4000-8000-000000000006'::uuid);
    SELECT public.orders_transition_status((SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)), 'ready_for_pickup', '', 'a9000000-0000-4000-8000-000000000007'::uuid);
    SELECT public.orders_transition_status((SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)), 'completed', '', 'a9000000-0000-4000-8000-000000000008'::uuid);$$,
  'Pickup order advances cleanly placed -> accepted -> preparing -> ready_for_pickup -> completed'
);

-- 5. Handoff Payment Collection & Admin-Guard Reversal
SELECT lives_ok(
  $$SELECT public.orders_record_handoff_payment(
      (SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)),
      (SELECT c_pay_pix FROM pg_temp.gmz009_consts),
      (SELECT c_hp_collected FROM pg_temp.gmz009_consts),
      '',
      NULL,
      'a9000000-0000-4000-8000-000000000009'::uuid
    )$$,
  'Staff records in-person handoff payment collection'
);

SELECT throws_ok(
  $$SELECT public.orders_record_handoff_payment(
      (SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)),
      (SELECT c_pay_pix FROM pg_temp.gmz009_consts),
      (SELECT c_hp_reversed FROM pg_temp.gmz009_consts),
      'Estorno indevido',
      NULL,
      'a9000000-0000-4000-8000-000000000010'::uuid
    )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz009_consts),
  NULL,
  'Staff cannot reverse handoff payment without sensitive permission and Admin Guard'
);

RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE pg_temp.gmz009_state
SET proof_val = public.append_orders_step_up_event(
  (SELECT c_user_owner_a FROM pg_temp.gmz009_consts),
  (SELECT c_org_a FROM pg_temp.gmz009_consts),
  (SELECT c_est_a FROM pg_temp.gmz009_consts),
  (SELECT c_br_a1 FROM pg_temp.gmz009_consts),
  id_val,
  ARRAY[(SELECT c_perm_hp_sens FROM pg_temp.gmz009_consts)],
  'a9000000-0000-4000-8000-000000000011'::uuid,
  'allow',
  'authorized'
)
WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz009_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz009_consts), true);

SELECT lives_ok(
  $$SELECT public.orders_record_handoff_payment(
      (SELECT id_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)),
      (SELECT c_pay_pix FROM pg_temp.gmz009_consts),
      (SELECT c_hp_reversed FROM pg_temp.gmz009_consts),
      'Estorno autorizado na maquininha',
      (SELECT proof_val FROM pg_temp.gmz009_state WHERE slot = (SELECT c_slot_p1 FROM pg_temp.gmz009_consts)),
      'a9000000-0000-4000-8000-000000000011'::uuid
    )$$,
  'Owner reverses handoff payment with valid single-use step-up proof and reason'
);

-- 6. Cross-Tenant Isolation
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz009_consts), (SELECT c_jwt_owner_b FROM pg_temp.gmz009_consts), true);

SELECT is(
  (SELECT count(*)::integer FROM public.orders WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz009_consts)),
  0,
  'Foreign tenant Owner B sees zero orders belonging to Organization A'
);

SELECT * FROM finish();
ROLLBACK;
