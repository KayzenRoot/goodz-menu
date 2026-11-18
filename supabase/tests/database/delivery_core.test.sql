BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz010_consts AS
SELECT
  'authenticated'::text AS c_auth_role,
  'service_role'::text AS c_svc_role,
  'anon'::text AS c_anon_role,
  'active'::text AS c_active,
  'request.jwt.claims'::text AS c_jwt_setting,
  '42501'::text AS c_err_42501,
  '22023'::text AS c_err_22023,
  '55000'::text AS c_err_55000,
  'public.delivery_zones'::text AS c_rel_zones,
  'public.deliveries'::text AS c_rel_deliveries,
  'public.delivery_status_transitions'::text AS c_rel_del_trans,
  'own_delivery'::text AS c_own_delivery,
  'pix_in_person'::text AS c_pay_pix,
  'delivery.zone.write'::text AS c_perm_zone_write,
  'delivery.own_fleet'::text AS c_ent_own_fleet,
  'Pinheiros'::text AS c_neigh_pinheiros,
  'Zona Central'::text AS c_zone_central,
  'Entregador Carlos · Moto 01'::text AS c_courier_carlos,
  'ready_for_dispatch'::text AS c_st_ready,
  'assigned'::text AS c_st_assigned,
  'out_for_delivery'::text AS c_st_out,
  'delivered'::text AS c_st_delivered,
  'zone_1'::text AS c_slot_z1,
  'order_1'::text AS c_slot_o1,
  'del_1'::text AS c_slot_d1,
  '11988887777'::text AS c_phone,
  'status'::text AS c_key_status,
  '{"street_line":"Rua dos Pinheiros","number_label":"500","neighborhood":"Pinheiros","city":"São Paulo"}'::jsonb AS c_addr_pinheiros,
  '{"street_line":"Rua Tatuapé","number_label":"50","neighborhood":"Tatuapé","city":"São Paulo"}'::jsonb AS c_addr_tatuape,
  '[{"channel_offer_id":"b5000000-0000-4000-8000-000000000002","quantity":1}]'::jsonb AS c_items_1,
  '[{"channel_offer_id":"b5000000-0000-4000-8000-000000000002","quantity":2}]'::jsonb AS c_items_2,
  'b1000000-0000-4000-8000-000000000001'::uuid AS c_user_owner_a,
  'b1000000-0000-4000-8000-000000000002'::uuid AS c_user_staff_a1,
  'b1000000-0000-4000-8000-000000000003'::uuid AS c_user_owner_b,
  'b2000000-0000-4000-8000-000000000001'::uuid AS c_org_a,
  'b2000000-0000-4000-8000-000000000002'::uuid AS c_org_b,
  'b3000000-0000-4000-8000-000000000001'::uuid AS c_est_a,
  'b3000000-0000-4000-8000-000000000002'::uuid AS c_est_b,
  'b4000000-0000-4000-8000-000000000001'::uuid AS c_br_a1,
  'b4000000-0000-4000-8000-000000000002'::uuid AS c_br_b1,
  'b5000000-0000-4000-8000-000000000001'::uuid AS c_prod_a,
  'b5000000-0000-4000-8000-000000000002'::uuid AS c_offer_a1,
  '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}'::text AS c_jwt_owner_a,
  '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}'::text AS c_jwt_staff_a1,
  '{"sub":"b1000000-0000-4000-8000-000000000003","role":"authenticated"}'::text AS c_jwt_owner_b;
GRANT SELECT ON TABLE pg_temp.gmz010_consts TO PUBLIC;

CREATE TEMP TABLE gmz010_state (slot text PRIMARY KEY, id_val uuid NOT NULL, proof_val uuid);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz010_state TO PUBLIC;

SELECT no_plan();

WITH c AS (SELECT * FROM pg_temp.gmz010_consts)
INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT u.uid, c.c_auth_role, c.c_auth_role, u.mail, now(), '{}', '{}', now(), now()
FROM c
CROSS JOIN LATERAL (VALUES
  (c.c_user_owner_a, 'gmz010-owner-a@example.invalid'),
  (c.c_user_staff_a1, 'gmz010-staff-a1@example.invalid'),
  (c.c_user_owner_b, 'gmz010-owner-b@example.invalid')
) AS u(uid, mail);

WITH c AS (SELECT * FROM pg_temp.gmz010_consts)
INSERT INTO public.organizations (id, display_name, status)
SELECT o.oid, o.name, c.c_active FROM c CROSS JOIN LATERAL (VALUES
  (c.c_org_a, 'GMZ-010 Org A'),
  (c.c_org_b, 'GMZ-010 Org B')
) AS o(oid, name);

WITH c AS (SELECT * FROM pg_temp.gmz010_consts)
INSERT INTO public.establishments (id, organization_id, display_name, status)
SELECT e.eid, e.oid, e.name, c.c_active FROM c CROSS JOIN LATERAL (VALUES
  (c.c_est_a, c.c_org_a, 'GMZ-010 Est A'),
  (c.c_est_b, c.c_org_b, 'GMZ-010 Est B')
) AS e(eid, oid, name);

WITH c AS (SELECT * FROM pg_temp.gmz010_consts)
INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
SELECT b.bid, b.oid, b.eid, b.name, c.c_active FROM c CROSS JOIN LATERAL (VALUES
  (c.c_br_a1, c.c_org_a, c.c_est_a, 'GMZ-010 Br A1'),
  (c.c_br_b1, c.c_org_b, c.c_est_b, 'GMZ-010 Br B1')
) AS b(bid, oid, eid, name);

WITH c AS (SELECT * FROM pg_temp.gmz010_consts)
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
SELECT r.rid::uuid, r.oid, r.rkey, r.rname FROM c CROSS JOIN LATERAL (VALUES
  ('b6000000-0000-4000-8000-000000000001', c.c_org_a, 'owner', 'Owner A'),
  ('b6000000-0000-4000-8000-000000000002', c.c_org_a, 'staff', 'Staff A'),
  ('b6000000-0000-4000-8000-000000000003', c.c_org_b, 'owner', 'Owner B')
) AS r(rid, oid, rkey, rname);

WITH c AS (SELECT * FROM pg_temp.gmz010_consts)
INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id)
SELECT m.mid::uuid, m.oid, m.uid, c.c_active, m.eid, m.bid FROM c CROSS JOIN LATERAL (VALUES
  ('b7000000-0000-4000-8000-000000000001', c.c_org_a, c.c_user_owner_a, c.c_est_a, c.c_br_a1),
  ('b7000000-0000-4000-8000-000000000002', c.c_org_a, c.c_user_staff_a1, c.c_est_a, c.c_br_a1),
  ('b7000000-0000-4000-8000-000000000003', c.c_org_b, c.c_user_owner_b, c.c_est_b, c.c_br_b1)
) AS m(mid, oid, uid, eid, bid);

WITH c AS (SELECT * FROM pg_temp.gmz010_consts)
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
SELECT a.aid::uuid, a.oid, a.mid::uuid, a.rid::uuid, a.stype, a.eid, a.bid FROM c CROSS JOIN LATERAL (VALUES
  ('b8000000-0000-4000-8000-000000000001', c.c_org_a, 'b7000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'organization', NULL::uuid, NULL::uuid),
  ('b8000000-0000-4000-8000-000000000002', c.c_org_a, 'b7000000-0000-4000-8000-000000000002', 'b6000000-0000-4000-8000-000000000002', 'branch', c.c_est_a, c.c_br_a1),
  ('b8000000-0000-4000-8000-000000000003', c.c_org_b, 'b7000000-0000-4000-8000-000000000003', 'b6000000-0000-4000-8000-000000000003', 'organization', NULL::uuid, NULL::uuid)
) AS a(aid, oid, mid, rid, stype, eid, bid);

INSERT INTO public.products (id, organization_id, name, description, status)
VALUES ((SELECT c_prod_a FROM pg_temp.gmz010_consts), (SELECT c_org_a FROM pg_temp.gmz010_consts), 'Bowl Executivo', 'Bowl grelhado', (SELECT c_active FROM pg_temp.gmz010_consts));

INSERT INTO public.channel_offers (
  id, organization_id, establishment_id, branch_id, sales_channel_id,
  target_kind, product_id, base_price, currency, availability_state, is_visible, status
) VALUES (
  (SELECT c_offer_a1 FROM pg_temp.gmz010_consts),
  (SELECT c_org_a FROM pg_temp.gmz010_consts),
  (SELECT c_est_a FROM pg_temp.gmz010_consts),
  (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
  (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz010_consts) AND channel_key = 'goodz_online'),
  'product',
  (SELECT c_prod_a FROM pg_temp.gmz010_consts),
  20.00,
  'BRL',
  'available',
  true,
  (SELECT c_active FROM pg_temp.gmz010_consts)
);

INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
VALUES ('storefront.ordering_enabled', 'branch', (SELECT c_org_a FROM pg_temp.gmz010_consts), (SELECT c_est_a FROM pg_temp.gmz010_consts), (SELECT c_br_a1 FROM pg_temp.gmz010_consts), to_jsonb(true));

-- 1. Least-privilege & RLS assertions
SELECT ok(
  NOT has_table_privilege((SELECT c_anon_role FROM pg_temp.gmz010_consts), (SELECT c_rel_zones FROM pg_temp.gmz010_consts), 'SELECT')
  AND NOT has_table_privilege((SELECT c_anon_role FROM pg_temp.gmz010_consts), (SELECT c_rel_deliveries FROM pg_temp.gmz010_consts), 'SELECT')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz010_consts), (SELECT c_rel_zones FROM pg_temp.gmz010_consts), 'INSERT')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz010_consts), (SELECT c_rel_deliveries FROM pg_temp.gmz010_consts), 'UPDATE'),
  'anon has zero access and authenticated cannot directly mutate delivery tables'
);

-- 2. Zone write requires delivery.zone.write and single-use step-up proof
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz010_consts), (SELECT c_jwt_staff_a1 FROM pg_temp.gmz010_consts), true);

SELECT throws_ok(
  $$
  SELECT public.delivery_save_zone(
    NULL,
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    (SELECT c_zone_central FROM pg_temp.gmz010_consts),
    ARRAY[(SELECT c_neigh_pinheiros FROM pg_temp.gmz010_consts)],
    7.90,
    30.00,
    35,
    (SELECT c_active FROM pg_temp.gmz010_consts),
    gen_random_uuid(),
    gen_random_uuid()
  )
  $$,
  (SELECT c_err_42501 FROM pg_temp.gmz010_consts),
  NULL,
  'branch staff without delivery.zone.write cannot create delivery zones'
);

SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz010_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz010_consts), true);

SELECT throws_ok(
  $$
  SELECT public.delivery_save_zone(
    NULL,
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    (SELECT c_zone_central FROM pg_temp.gmz010_consts),
    ARRAY[(SELECT c_neigh_pinheiros FROM pg_temp.gmz010_consts)],
    7.90,
    30.00,
    35,
    (SELECT c_active FROM pg_temp.gmz010_consts),
    NULL,
    gen_random_uuid()
  )
  $$,
  (SELECT c_err_42501 FROM pg_temp.gmz010_consts),
  NULL,
  'owner cannot create delivery zone without Admin Guard step-up proof'
);

-- Mint step-up proof via service_role and create Zona Central (fee 7.90, min order 30.00)
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz010_state (slot, id_val, proof_val)
VALUES (
  (SELECT c_slot_z1 FROM pg_temp.gmz010_consts),
  gen_random_uuid(),
  public.append_delivery_step_up_event(
    (SELECT c_user_owner_a FROM pg_temp.gmz010_consts),
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    ARRAY[(SELECT c_perm_zone_write FROM pg_temp.gmz010_consts)],
    gen_random_uuid(),
    'allow',
    'authorized'
  )
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz010_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz010_consts), true);

UPDATE pg_temp.gmz010_state
SET id_val = (
  public.delivery_save_zone(
    NULL,
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    (SELECT c_zone_central FROM pg_temp.gmz010_consts),
    ARRAY[(SELECT c_neigh_pinheiros FROM pg_temp.gmz010_consts), 'Jardim Paulista'],
    7.90,
    30.00,
    35,
    (SELECT c_active FROM pg_temp.gmz010_consts),
    (SELECT proof_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_z1 FROM pg_temp.gmz010_consts)),
    gen_random_uuid()
  )->>'zone_id'
)::uuid
WHERE slot = (SELECT c_slot_z1 FROM pg_temp.gmz010_consts);

SELECT is(
  (SELECT delivery_fee_amount FROM public.delivery_zones WHERE id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_z1 FROM pg_temp.gmz010_consts))),
  7.90::numeric(12,2),
  'delivery zone stores exact numeric(12,2) fee'
);

-- Single-use proof replay is rejected
SELECT throws_ok(
  $$
  SELECT public.delivery_save_zone(
    NULL,
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    'Zona Replay',
    ARRAY['Itaim'],
    5.00,
    15.00,
    30,
    (SELECT c_active FROM pg_temp.gmz010_consts),
    (SELECT proof_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_z1 FROM pg_temp.gmz010_consts)),
    gen_random_uuid()
  )
  $$,
  (SELECT c_err_42501 FROM pg_temp.gmz010_consts),
  NULL,
  'replaying a consumed delivery step-up proof is rejected'
);

-- Cross-tenant isolation on delivery_zones
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz010_consts), (SELECT c_jwt_owner_b FROM pg_temp.gmz010_consts), true);
SELECT is(
  (SELECT count(*)::int FROM public.delivery_zones),
  0,
  'tenant B cannot read tenant A delivery zones'
);

-- 3. Own-delivery order enforces neighborhood coverage, minimum order (30.00), and authoritative zone fee (7.90)
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz010_consts), (SELECT c_jwt_staff_a1 FROM pg_temp.gmz010_consts), true);

SELECT throws_ok(
  $$
  SELECT public.orders_place_staff(
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    (SELECT c_own_delivery FROM pg_temp.gmz010_consts),
    'Lucas Abaixo Minimo',
    (SELECT c_phone FROM pg_temp.gmz010_consts),
    (SELECT c_addr_pinheiros FROM pg_temp.gmz010_consts),
    1.00,
    (SELECT c_pay_pix FROM pg_temp.gmz010_consts),
    NULL,
    '',
    (SELECT c_items_1 FROM pg_temp.gmz010_consts),
    'idem-below-min-0001',
    gen_random_uuid(),
    (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_z1 FROM pg_temp.gmz010_consts))
  )
  $$,
  (SELECT c_err_22023 FROM pg_temp.gmz010_consts),
  NULL,
  'own_delivery order below zone minimum_order_amount is rejected'
);

SELECT throws_ok(
  $$
  SELECT public.orders_place_staff(
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    (SELECT c_own_delivery FROM pg_temp.gmz010_consts),
    'Lucas Fora Zona',
    (SELECT c_phone FROM pg_temp.gmz010_consts),
    (SELECT c_addr_tatuape FROM pg_temp.gmz010_consts),
    7.90,
    (SELECT c_pay_pix FROM pg_temp.gmz010_consts),
    NULL,
    '',
    (SELECT c_items_2 FROM pg_temp.gmz010_consts),
    'idem-outside-zone-0002',
    gen_random_uuid(),
    NULL
  )
  $$,
  (SELECT c_err_22023 FROM pg_temp.gmz010_consts),
  NULL,
  'own_delivery order in uncovered neighborhood is rejected when active zones exist'
);

INSERT INTO pg_temp.gmz010_state (slot, id_val)
VALUES (
  (SELECT c_slot_o1 FROM pg_temp.gmz010_consts),
  (
    public.orders_place_staff(
      (SELECT c_org_a FROM pg_temp.gmz010_consts),
      (SELECT c_est_a FROM pg_temp.gmz010_consts),
      (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
      (SELECT c_own_delivery FROM pg_temp.gmz010_consts),
      'Helena Pinheiros',
      (SELECT c_phone FROM pg_temp.gmz010_consts),
      (SELECT c_addr_pinheiros FROM pg_temp.gmz010_consts),
      0.50,
      (SELECT c_pay_pix FROM pg_temp.gmz010_consts),
      NULL,
      '',
      (SELECT c_items_2 FROM pg_temp.gmz010_consts),
      'idem-valid-zone-0003',
      gen_random_uuid(),
      (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_z1 FROM pg_temp.gmz010_consts))
    )->>'order_id'
  )::uuid
);

SELECT is(
  (SELECT total_amount FROM public.orders WHERE id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_o1 FROM pg_temp.gmz010_consts))),
  47.90::numeric(12,2),
  'server overrides client fee with authoritative zone fee (40.00 + 7.90 = 47.90)'
);

INSERT INTO pg_temp.gmz010_state (slot, id_val)
VALUES (
  (SELECT c_slot_d1 FROM pg_temp.gmz010_consts),
  (SELECT id FROM public.deliveries WHERE order_id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_o1 FROM pg_temp.gmz010_consts)))
);

SELECT is(
  (SELECT status FROM public.deliveries WHERE id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts))),
  'preparing',
  'own_delivery order automatically creates deliveries record in preparing state'
);

-- 4. Full Dispatch Lifecycle & Parent Order Synchronization
SELECT ok(
  (public.delivery_advance_dispatch(
    (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts)),
    (SELECT c_st_ready FROM pg_temp.gmz010_consts),
    '',
    '',
    gen_random_uuid()
  )->>(SELECT c_key_status FROM pg_temp.gmz010_consts)) = (SELECT c_st_ready FROM pg_temp.gmz010_consts),
  'dispatch advances from preparing to ready_for_dispatch'
);

SELECT throws_ok(
  $$
  SELECT public.delivery_advance_dispatch(
    (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts)),
    (SELECT c_st_assigned FROM pg_temp.gmz010_consts),
    '   ',
    '',
    gen_random_uuid()
  )
  $$,
  (SELECT c_err_22023 FROM pg_temp.gmz010_consts),
  NULL,
  'assigning dispatch without courier label is rejected'
);

SELECT ok(
  (public.delivery_advance_dispatch(
    (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts)),
    (SELECT c_st_assigned FROM pg_temp.gmz010_consts),
    (SELECT c_courier_carlos FROM pg_temp.gmz010_consts),
    '',
    gen_random_uuid()
  )->>(SELECT c_key_status FROM pg_temp.gmz010_consts)) = (SELECT c_st_assigned FROM pg_temp.gmz010_consts),
  'dispatch assigns own courier label'
);

SELECT ok(
  (public.delivery_advance_dispatch(
    (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts)),
    (SELECT c_st_out FROM pg_temp.gmz010_consts),
    '',
    '',
    gen_random_uuid()
  )->>(SELECT c_key_status FROM pg_temp.gmz010_consts)) = (SELECT c_st_out FROM pg_temp.gmz010_consts),
  'dispatch advances from assigned to out_for_delivery'
);

SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_o1 FROM pg_temp.gmz010_consts))),
  (SELECT c_st_out FROM pg_temp.gmz010_consts),
  'dispatch out_for_delivery synchronizes parent order status to out_for_delivery'
);

SELECT ok(
  (public.delivery_advance_dispatch(
    (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts)),
    (SELECT c_st_delivered FROM pg_temp.gmz010_consts),
    '',
    '',
    gen_random_uuid()
  )->>(SELECT c_key_status FROM pg_temp.gmz010_consts)) = (SELECT c_st_delivered FROM pg_temp.gmz010_consts),
  'dispatch advances from out_for_delivery to delivered'
);

SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_o1 FROM pg_temp.gmz010_consts))),
  'completed',
  'dispatch delivered synchronizes parent order status to completed'
);

SELECT is(
  (SELECT count(*)::int FROM public.delivery_status_transitions WHERE delivery_id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts))),
  5,
  'all 5 delivery status transitions are recorded in append-only ledger'
);

-- 5. Immutability of delivery_status_transitions & entitlement denial check
RESET ROLE;
SELECT throws_ok(
  $$
  DELETE FROM public.delivery_status_transitions
  WHERE delivery_id = (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_d1 FROM pg_temp.gmz010_consts))
  $$,
  (SELECT c_err_55000 FROM pg_temp.gmz010_consts),
  NULL,
  'delivery_status_transitions ledger is immutable against deletion'
);

INSERT INTO public.tenant_entitlement_overrides (organization_id, entitlement_key, value_json, reason)
VALUES ((SELECT c_org_a FROM pg_temp.gmz010_consts), (SELECT c_ent_own_fleet FROM pg_temp.gmz010_consts), to_jsonb(false), 'Teste suspensão frota própria');

SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz010_consts), (SELECT c_jwt_staff_a1 FROM pg_temp.gmz010_consts), true);

SELECT throws_ok(
  $$
  SELECT public.orders_place_staff(
    (SELECT c_org_a FROM pg_temp.gmz010_consts),
    (SELECT c_est_a FROM pg_temp.gmz010_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz010_consts),
    (SELECT c_own_delivery FROM pg_temp.gmz010_consts),
    'Cliente Sem Entitlement',
    (SELECT c_phone FROM pg_temp.gmz010_consts),
    (SELECT c_addr_pinheiros FROM pg_temp.gmz010_consts),
    7.90,
    (SELECT c_pay_pix FROM pg_temp.gmz010_consts),
    NULL,
    '',
    (SELECT c_items_2 FROM pg_temp.gmz010_consts),
    'idem-entitlement-off-0004',
    gen_random_uuid(),
    (SELECT id_val FROM pg_temp.gmz010_state WHERE slot = (SELECT c_slot_z1 FROM pg_temp.gmz010_consts))
  )
  $$,
  (SELECT c_err_42501 FROM pg_temp.gmz010_consts),
  NULL,
  'own_delivery order fails closed when delivery.own_fleet entitlement is false'
);

SELECT * FROM finish();
ROLLBACK;
