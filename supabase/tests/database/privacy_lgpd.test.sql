BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz012_consts AS
SELECT
  'authenticated'::text AS c_auth_role,
  'service_role'::text AS c_svc_role,
  'anon'::text AS c_anon_role,
  'active'::text AS c_active,
  'role'::text AS c_role_setting,
  'request.jwt.claims'::text AS c_jwt_setting,
  '42501'::text AS c_err_42501,
  '22023'::text AS c_err_22023,
  '55000'::text AS c_err_55000,
  'privacy.manage'::text AS c_perm_priv_manage,
  'bistro-lgpd-gmz012'::text AS c_slug_a,
  'pickup'::text AS c_pickup,
  'pix_in_person'::text AS c_pay_pix,
  'cust_1'::text AS c_slot_cust,
  'ord_1'::text AS c_slot_ord,
  'tok_1'::text AS c_slot_tok,
  'proof_anon_1'::text AS c_slot_proof_anon,
  '[{"channel_offer_id":"d5000000-0000-4000-8000-000000000002","quantity":2}]'::jsonb AS c_items_two,
  'd1000000-0000-4000-8000-000000000001'::uuid AS c_user_owner_a,
  'd1000000-0000-4000-8000-000000000002'::uuid AS c_user_staff_a,
  'd2000000-0000-4000-8000-000000000001'::uuid AS c_org_a,
  'd3000000-0000-4000-8000-000000000001'::uuid AS c_est_a,
  'd4000000-0000-4000-8000-000000000001'::uuid AS c_br_a1,
  'd5000000-0000-4000-8000-000000000001'::uuid AS c_prod_a,
  'd5000000-0000-4000-8000-000000000002'::uuid AS c_offer_a,
  '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}'::text AS c_jwt_owner_a,
  '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}'::text AS c_jwt_staff_a;
GRANT SELECT ON TABLE pg_temp.gmz012_consts TO PUBLIC;

CREATE TEMP TABLE gmz012_state (slot text PRIMARY KEY, id_val uuid, text_val text);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz012_state TO PUBLIC;

SELECT no_plan();

WITH c AS (SELECT * FROM pg_temp.gmz012_consts)
INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT u.uid, c.c_auth_role, c.c_auth_role, u.mail, now(), '{}', '{}', now(), now()
FROM c CROSS JOIN LATERAL (VALUES
  (c.c_user_owner_a, 'gmz012-owner@example.invalid'),
  (c.c_user_staff_a, 'gmz012-staff@example.invalid')
) AS u(uid, mail);

INSERT INTO public.organizations (id, display_name, status)
VALUES ((SELECT c_org_a FROM pg_temp.gmz012_consts), 'GMZ-012 Org LGPD', (SELECT c_active FROM pg_temp.gmz012_consts));

INSERT INTO public.establishments (id, organization_id, display_name, status)
VALUES ((SELECT c_est_a FROM pg_temp.gmz012_consts), (SELECT c_org_a FROM pg_temp.gmz012_consts), 'Bistrô LGPD', (SELECT c_active FROM pg_temp.gmz012_consts));

INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
VALUES ((SELECT c_br_a1 FROM pg_temp.gmz012_consts), (SELECT c_org_a FROM pg_temp.gmz012_consts), (SELECT c_est_a FROM pg_temp.gmz012_consts), 'Unidade Centro', (SELECT c_active FROM pg_temp.gmz012_consts));

WITH c AS (SELECT * FROM pg_temp.gmz012_consts)
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
SELECT r.rid::uuid, c.c_org_a, r.rkey, r.rname FROM c CROSS JOIN LATERAL (VALUES
  ('d6000000-0000-4000-8000-000000000001', 'owner', 'Owner'),
  ('d6000000-0000-4000-8000-000000000002', 'staff', 'Staff')
) AS r(rid, rkey, rname);

WITH c AS (SELECT * FROM pg_temp.gmz012_consts)
INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id)
SELECT m.mid::uuid, c.c_org_a, m.uid, c.c_active, c.c_est_a, c.c_br_a1 FROM c CROSS JOIN LATERAL (VALUES
  ('d7000000-0000-4000-8000-000000000001', c.c_user_owner_a),
  ('d7000000-0000-4000-8000-000000000002', c.c_user_staff_a)
) AS m(mid, uid);

WITH c AS (SELECT * FROM pg_temp.gmz012_consts)
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
SELECT a.aid::uuid, c.c_org_a, a.mid::uuid, a.rid::uuid, a.stype, a.eid, a.bid FROM c CROSS JOIN LATERAL (VALUES
  ('d8000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000001', 'd6000000-0000-4000-8000-000000000001', 'organization', NULL::uuid, NULL::uuid),
  ('d8000000-0000-4000-8000-000000000002', 'd7000000-0000-4000-8000-000000000002', 'd6000000-0000-4000-8000-000000000002', 'branch', c.c_est_a, c.c_br_a1)
) AS a(aid, mid, rid, stype, eid, bid);

INSERT INTO public.products (id, organization_id, name, description, status)
VALUES ((SELECT c_prod_a FROM pg_temp.gmz012_consts), (SELECT c_org_a FROM pg_temp.gmz012_consts), 'Torta Rústica', 'Maçã verde', (SELECT c_active FROM pg_temp.gmz012_consts));

INSERT INTO public.channel_offers (
  id, organization_id, establishment_id, branch_id, sales_channel_id,
  target_kind, product_id, base_price, currency, availability_state, is_visible, status
) VALUES (
  (SELECT c_offer_a FROM pg_temp.gmz012_consts),
  (SELECT c_org_a FROM pg_temp.gmz012_consts),
  (SELECT c_est_a FROM pg_temp.gmz012_consts),
  (SELECT c_br_a1 FROM pg_temp.gmz012_consts),
  (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz012_consts) AND channel_key = 'goodz_online'),
  'product',
  (SELECT c_prod_a FROM pg_temp.gmz012_consts),
  42.90,
  'BRL',
  'available',
  true,
  (SELECT c_active FROM pg_temp.gmz012_consts)
);

INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
VALUES ('storefront.ordering_enabled', 'branch', (SELECT c_org_a FROM pg_temp.gmz012_consts), (SELECT c_est_a FROM pg_temp.gmz012_consts), (SELECT c_br_a1 FROM pg_temp.gmz012_consts), to_jsonb(true));

INSERT INTO public.storefront_profiles (
  organization_id, establishment_id, branch_id, public_slug, headline, is_published
) VALUES (
  (SELECT c_org_a FROM pg_temp.gmz012_consts),
  (SELECT c_est_a FROM pg_temp.gmz012_consts),
  (SELECT c_br_a1 FROM pg_temp.gmz012_consts),
  (SELECT c_slug_a FROM pg_temp.gmz012_consts),
  'Bistrô LGPD Online',
  true
);

-- 1. RLS enabled on customer_consents
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.customer_consents'::regclass),
  'RLS enabled on public.customer_consents'
);

-- 2. Public checkout with marketing_opt_in = true records immutable consent row
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz012_consts), '{}', true);
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_anon_role FROM pg_temp.gmz012_consts), true);

DO $place$
DECLARE
  v_res jsonb;
BEGIN
  v_res := public.storefront_place_public_order(
    (SELECT c_slug_a FROM pg_temp.gmz012_consts),
    (SELECT c_pickup FROM pg_temp.gmz012_consts),
    'Beatriz Titular',
    '11955554444',
    NULL,
    NULL,
    (SELECT c_pay_pix FROM pg_temp.gmz012_consts),
    NULL,
    'Sem canela',
    true,
    (SELECT c_items_two FROM pg_temp.gmz012_consts),
    'gmz012-idem-checkout-1',
    'da000000-0000-4000-8000-000000000001'::uuid
  );
  INSERT INTO pg_temp.gmz012_state (slot, id_val, text_val)
  VALUES
    ((SELECT c_slot_ord FROM pg_temp.gmz012_consts), (v_res->>'order_id')::uuid, NULL),
    ((SELECT c_slot_tok FROM pg_temp.gmz012_consts), NULL, v_res->>'tracking_token');
END;
$place$;

RESET role;
INSERT INTO pg_temp.gmz012_state (slot, id_val)
SELECT (SELECT c_slot_cust FROM pg_temp.gmz012_consts), customer_id
FROM public.orders
WHERE id = (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_ord FROM pg_temp.gmz012_consts));

-- 3. Branch staff cannot read customer_consents or call privacy_list_customers
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz012_consts), (SELECT c_jwt_staff_a FROM pg_temp.gmz012_consts), true);
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_auth_role FROM pg_temp.gmz012_consts), true);

SELECT is(
  (SELECT COUNT(*)::integer FROM public.customer_consents),
  0,
  'Branch staff cannot read organization customer_consents rows'
);

SELECT throws_ok(
  $$SELECT * FROM public.privacy_list_customers((SELECT c_org_a FROM pg_temp.gmz012_consts), 365)$$,
  (SELECT c_err_42501 FROM pg_temp.gmz012_consts),
  NULL,
  'Branch staff denied on privacy_list_customers'
);

-- 4. Owner reads customer_consents and privacy_list_customers, and requires Admin Guard step-up for export
RESET role;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz012_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz012_consts), true);
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_auth_role FROM pg_temp.gmz012_consts), true);

SELECT is(
  (SELECT COUNT(*)::integer FROM public.customer_consents WHERE customer_id = (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_cust FROM pg_temp.gmz012_consts)) AND granted IS TRUE),
  1,
  'Owner sees immutable marketing consent recorded during storefront checkout'
);

SELECT throws_ok(
  $$SELECT public.privacy_export_customer_data(
    (SELECT c_org_a FROM pg_temp.gmz012_consts),
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_cust FROM pg_temp.gmz012_consts)),
    NULL,
    'da000000-0000-4000-8000-000000000002'::uuid
  )$$,
  (SELECT c_err_42501 FROM pg_temp.gmz012_consts),
  NULL,
  'privacy_export_customer_data rejects missing step-up proof'
);

RESET role;
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_svc_role FROM pg_temp.gmz012_consts), true);
INSERT INTO pg_temp.gmz012_state (slot, id_val)
VALUES (
  'proof_export',
  public.append_privacy_step_up_event(
    (SELECT c_user_owner_a FROM pg_temp.gmz012_consts),
    (SELECT c_org_a FROM pg_temp.gmz012_consts),
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_cust FROM pg_temp.gmz012_consts)),
    ARRAY[(SELECT c_perm_priv_manage FROM pg_temp.gmz012_consts)],
    'da000000-0000-4000-8000-000000000003'::uuid,
    'allow',
    'authorized'
  )
);

RESET role;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz012_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz012_consts), true);
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_auth_role FROM pg_temp.gmz012_consts), true);

SELECT is(
  (public.privacy_export_customer_data(
    (SELECT c_org_a FROM pg_temp.gmz012_consts),
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_cust FROM pg_temp.gmz012_consts)),
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = 'proof_export'),
    'da000000-0000-4000-8000-000000000003'::uuid
  )->'subject'->>'display_name'),
  'Beatriz Titular',
  'privacy_export_customer_data returns complete LGPD subject export with single-use proof'
);

-- 5. Anonymization rejected while customer order is still active ('placed')
RESET role;
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_svc_role FROM pg_temp.gmz012_consts), true);
INSERT INTO pg_temp.gmz012_state (slot, id_val)
VALUES (
  (SELECT c_slot_proof_anon FROM pg_temp.gmz012_consts),
  public.append_privacy_step_up_event(
    (SELECT c_user_owner_a FROM pg_temp.gmz012_consts),
    (SELECT c_org_a FROM pg_temp.gmz012_consts),
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_cust FROM pg_temp.gmz012_consts)),
    ARRAY[(SELECT c_perm_priv_manage FROM pg_temp.gmz012_consts)],
    'da000000-0000-4000-8000-000000000004'::uuid,
    'allow',
    'authorized'
  )
);

RESET role;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz012_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz012_consts), true);
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_auth_role FROM pg_temp.gmz012_consts), true);

SELECT throws_ok(
  $$SELECT public.privacy_anonymize_customer(
    (SELECT c_org_a FROM pg_temp.gmz012_consts),
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_cust FROM pg_temp.gmz012_consts)),
    'Solicitação Art. 18 LGPD',
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_proof_anon FROM pg_temp.gmz012_consts)),
    'da000000-0000-4000-8000-000000000004'::uuid
  )$$,
  (SELECT c_err_22023 FROM pg_temp.gmz012_consts),
  NULL,
  'privacy_anonymize_customer blocks anonymization while customer has active in-flight orders'
);

-- 6. Complete order + record handoff payment (85.80 BRL), then anonymize and verify financial preservation
DO $complete_order$
DECLARE
  v_oid uuid := (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_ord FROM pg_temp.gmz012_consts));
  v_st text;
BEGIN
  FOREACH v_st IN ARRAY ARRAY['accepted', 'preparing', 'ready_for_pickup', 'completed'] LOOP
    PERFORM public.orders_transition_status(v_oid, v_st, '', pg_catalog.gen_random_uuid());
  END LOOP;
  PERFORM public.orders_record_handoff_payment(
    v_oid,
    (SELECT c_pay_pix FROM pg_temp.gmz012_consts),
    'collected',
    'Pix presencial',
    NULL,
    'da000000-0000-4000-8000-000000000005'::uuid
  );
END;
$complete_order$;

SELECT ok(
  (public.privacy_anonymize_customer(
    (SELECT c_org_a FROM pg_temp.gmz012_consts),
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_cust FROM pg_temp.gmz012_consts)),
    'Solicitação Art. 18 LGPD após conclusão',
    (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_proof_anon FROM pg_temp.gmz012_consts)),
    'da000000-0000-4000-8000-000000000006'::uuid
  )->>'anonymized')::boolean,
  'privacy_anonymize_customer succeeds once all customer orders are terminal'
);

SELECT is(
  (SELECT total_amount FROM public.orders WHERE id = (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_ord FROM pg_temp.gmz012_consts))),
  85.80::numeric(12,2),
  'Completed order exact numeric(12,2) total_amount is preserved after LGPD anonymization'
);

SELECT is(
  (SELECT customer_name_snapshot FROM public.orders WHERE id = (SELECT id_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_ord FROM pg_temp.gmz012_consts))),
  'Titular Anonimizado (LGPD)',
  'Completed order PII snapshot is scrubbed upon LGPD anonymization'
);

-- 7. Public capability tracking token is revoked after anonymization & customer_consents is immutable
RESET role;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz012_consts), '{}', true);
SELECT pg_catalog.set_config((SELECT c_role_setting FROM pg_temp.gmz012_consts), (SELECT c_anon_role FROM pg_temp.gmz012_consts), true);

SELECT is(
  public.storefront_get_order_tracking(
    (SELECT c_slug_a FROM pg_temp.gmz012_consts),
    (SELECT text_val FROM pg_temp.gmz012_state WHERE slot = (SELECT c_slot_tok FROM pg_temp.gmz012_consts))
  ),
  NULL::jsonb,
  'Public order capability token is revoked after customer PII anonymization'
);

RESET role;
SELECT throws_ok(
  $$DELETE FROM public.customer_consents WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz012_consts)$$,
  (SELECT c_err_55000 FROM pg_temp.gmz012_consts),
  NULL,
  'customer_consents ledger rejects DELETE mutations (55000)'
);

SELECT * FROM finish();
ROLLBACK;
