BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz011_consts AS
SELECT
  'authenticated'::text AS c_auth_role,
  'service_role'::text AS c_svc_role,
  'anon'::text AS c_anon_role,
  'active'::text AS c_active,
  'request.jwt.claims'::text AS c_jwt_setting,
  '42501'::text AS c_err_42501,
  '22023'::text AS c_err_22023,
  'public.media_assets'::text AS c_rel_media,
  'public.storefront_profiles'::text AS c_rel_profiles,
  'storefront.write'::text AS c_perm_sf_write,
  'external_https'::text AS c_prov_https,
  'image/webp'::text AS c_mime_webp,
  'bistro-jardins-gmz011'::text AS c_slug_a,
  'express_grid'::text AS c_layout_express,
  'terracotta_oven'::text AS c_accent_terra,
  'elevated_glass'::text AS c_card_glass,
  'own_delivery'::text AS c_own_delivery,
  'pix_in_person'::text AS c_pay_pix,
  'Jardins'::text AS c_neigh_jardins,
  'prof_1'::text AS c_slot_prof,
  'zone_1'::text AS c_slot_zone,
  'tok_1'::text AS c_slot_tok,
  '{"street_line":"Alameda Itu","number_label":"400","neighborhood":"Jardins","city":"São Paulo"}'::jsonb AS c_addr_jardins,
  '[{"channel_offer_id":"c5000000-0000-4000-8000-000000000002","quantity":2}]'::jsonb AS c_items_valid,
  'c1000000-0000-4000-8000-000000000001'::uuid AS c_user_owner_a,
  'c1000000-0000-4000-8000-000000000002'::uuid AS c_user_staff_a,
  'c2000000-0000-4000-8000-000000000001'::uuid AS c_org_a,
  'c3000000-0000-4000-8000-000000000001'::uuid AS c_est_a,
  'c4000000-0000-4000-8000-000000000001'::uuid AS c_br_a1,
  'c5000000-0000-4000-8000-000000000001'::uuid AS c_prod_avail,
  'c5000000-0000-4000-8000-000000000002'::uuid AS c_offer_avail,
  'c5000000-0000-4000-8000-000000000003'::uuid AS c_prod_unknown,
  'c5000000-0000-4000-8000-000000000004'::uuid AS c_offer_unknown,
  '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}'::text AS c_jwt_owner_a,
  '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}'::text AS c_jwt_staff_a;
GRANT SELECT ON TABLE pg_temp.gmz011_consts TO PUBLIC;

CREATE TEMP TABLE gmz011_state (slot text PRIMARY KEY, id_val uuid, text_val text);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz011_state TO PUBLIC;

SELECT no_plan();

WITH c AS (SELECT * FROM pg_temp.gmz011_consts)
INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT u.uid, c.c_auth_role, c.c_auth_role, u.mail, now(), '{}', '{}', now(), now()
FROM c CROSS JOIN LATERAL (VALUES
  (c.c_user_owner_a, 'gmz011-owner@example.invalid'),
  (c.c_user_staff_a, 'gmz011-staff@example.invalid')
) AS u(uid, mail);

INSERT INTO public.organizations (id, display_name, status)
VALUES ((SELECT c_org_a FROM pg_temp.gmz011_consts), 'GMZ-011 Org A', (SELECT c_active FROM pg_temp.gmz011_consts));

INSERT INTO public.establishments (id, organization_id, display_name, status)
VALUES ((SELECT c_est_a FROM pg_temp.gmz011_consts), (SELECT c_org_a FROM pg_temp.gmz011_consts), 'Bistrô Matriz', (SELECT c_active FROM pg_temp.gmz011_consts));

INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
VALUES ((SELECT c_br_a1 FROM pg_temp.gmz011_consts), (SELECT c_org_a FROM pg_temp.gmz011_consts), (SELECT c_est_a FROM pg_temp.gmz011_consts), 'Unidade Jardins', (SELECT c_active FROM pg_temp.gmz011_consts));

WITH c AS (SELECT * FROM pg_temp.gmz011_consts)
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
SELECT r.rid::uuid, c.c_org_a, r.rkey, r.rname FROM c CROSS JOIN LATERAL (VALUES
  ('c6000000-0000-4000-8000-000000000001', 'owner', 'Owner'),
  ('c6000000-0000-4000-8000-000000000002', 'staff', 'Staff')
) AS r(rid, rkey, rname);

WITH c AS (SELECT * FROM pg_temp.gmz011_consts)
INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id)
SELECT m.mid::uuid, c.c_org_a, m.uid, c.c_active, c.c_est_a, c.c_br_a1 FROM c CROSS JOIN LATERAL (VALUES
  ('c7000000-0000-4000-8000-000000000001', c.c_user_owner_a),
  ('c7000000-0000-4000-8000-000000000002', c.c_user_staff_a)
) AS m(mid, uid);

WITH c AS (SELECT * FROM pg_temp.gmz011_consts)
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
SELECT a.aid::uuid, c.c_org_a, a.mid::uuid, a.rid::uuid, a.stype, a.eid, a.bid FROM c CROSS JOIN LATERAL (VALUES
  ('c8000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001', 'c6000000-0000-4000-8000-000000000001', 'organization', NULL::uuid, NULL::uuid),
  ('c8000000-0000-4000-8000-000000000002', 'c7000000-0000-4000-8000-000000000002', 'c6000000-0000-4000-8000-000000000002', 'branch', c.c_est_a, c.c_br_a1)
) AS a(aid, mid, rid, stype, eid, bid);

-- Seed 1 'available' offer and 1 'unknown' offer (fail-closed check!)
WITH c AS (SELECT * FROM pg_temp.gmz011_consts)
INSERT INTO public.products (id, organization_id, name, description, status)
SELECT p.pid, c.c_org_a, p.pname, p.pdesc, c.c_active FROM c CROSS JOIN LATERAL (VALUES
  (c.c_prod_avail, 'Nhoque Artesanal', 'Manteiga dourada'),
  (c.c_prod_unknown, 'Prato Indefinido', 'Sem confirmação de disponibilidade')
) AS p(pid, pname, pdesc);

WITH c AS (SELECT * FROM pg_temp.gmz011_consts),
     sc AS (SELECT id AS channel_id FROM public.sales_channels WHERE organization_id = (SELECT c_org_a FROM pg_temp.gmz011_consts) AND channel_key = 'goodz_online')
INSERT INTO public.channel_offers (
  id, organization_id, establishment_id, branch_id, sales_channel_id,
  target_kind, product_id, base_price, currency, availability_state, is_visible, status
)
SELECT o.oid, c.c_org_a, c.c_est_a, c.c_br_a1, sc.channel_id, 'product', o.pid, o.price, 'BRL', o.avail, o.vis, c.c_active
FROM c CROSS JOIN sc CROSS JOIN LATERAL (VALUES
  (c.c_offer_avail, c.c_prod_avail, 32.00::numeric, 'available', true),
  (c.c_offer_unknown, c.c_prod_unknown, 29.00::numeric, 'unknown', false)
) AS o(oid, pid, price, avail, vis);

INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
VALUES ('storefront.ordering_enabled', 'branch', (SELECT c_org_a FROM pg_temp.gmz011_consts), (SELECT c_est_a FROM pg_temp.gmz011_consts), (SELECT c_br_a1 FROM pg_temp.gmz011_consts), to_jsonb(true));

INSERT INTO public.delivery_zones (id, organization_id, establishment_id, branch_id, name, neighborhoods, delivery_fee_amount, minimum_order_amount, estimated_delivery_minutes)
VALUES (
  'c9000000-0000-4000-8000-000000000001',
  (SELECT c_org_a FROM pg_temp.gmz011_consts),
  (SELECT c_est_a FROM pg_temp.gmz011_consts),
  (SELECT c_br_a1 FROM pg_temp.gmz011_consts),
  'Zona Jardins',
  ARRAY[(SELECT c_neigh_jardins FROM pg_temp.gmz011_consts)],
  6.50,
  50.00,
  35
);

-- 1. Table privilege lockdown (anon cannot SELECT tables directly)
SELECT ok(
  NOT has_table_privilege((SELECT c_anon_role FROM pg_temp.gmz011_consts), (SELECT c_rel_media FROM pg_temp.gmz011_consts), 'SELECT')
  AND NOT has_table_privilege((SELECT c_anon_role FROM pg_temp.gmz011_consts), (SELECT c_rel_profiles FROM pg_temp.gmz011_consts), 'SELECT')
  AND NOT has_table_privilege((SELECT c_auth_role FROM pg_temp.gmz011_consts), (SELECT c_rel_profiles FROM pg_temp.gmz011_consts), 'INSERT'),
  'anon has zero direct table privileges on media_assets and storefront_profiles'
);

-- 2. Media abstraction rejects non-HTTPS URLs and registers valid MediaAsset + variant
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz011_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz011_consts), true);

SELECT throws_ok(
  $$
  SELECT public.catalog_register_product_media(
    (SELECT c_org_a FROM pg_temp.gmz011_consts),
    (SELECT c_est_a FROM pg_temp.gmz011_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz011_consts),
    (SELECT c_prod_avail FROM pg_temp.gmz011_consts),
    (SELECT c_prov_https FROM pg_temp.gmz011_consts),
    'catalog/unsafe.jpg',
    'http://insecure.example.com/unsafe.jpg',
    (SELECT c_mime_webp FROM pg_temp.gmz011_consts),
    'Foto insegura',
    800,
    600,
    gen_random_uuid()
  )
  $$,
  (SELECT c_err_22023 FROM pg_temp.gmz011_consts),
  NULL,
  'non-HTTPS media URL is rejected by media abstraction'
);

SELECT ok(
  (public.catalog_register_product_media(
    (SELECT c_org_a FROM pg_temp.gmz011_consts),
    (SELECT c_est_a FROM pg_temp.gmz011_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz011_consts),
    (SELECT c_prod_avail FROM pg_temp.gmz011_consts),
    (SELECT c_prov_https FROM pg_temp.gmz011_consts),
    'catalog/nhoque.webp',
    'https://cdn.example.invalid/catalog/nhoque.webp',
    (SELECT c_mime_webp FROM pg_temp.gmz011_consts),
    'Nhoque artesanal dourado na manteiga',
    800,
    600,
    gen_random_uuid()
  )->>'media_asset_id') IS NOT NULL,
  'owner registers HTTPS MediaAsset and links it to product'
);

-- 3. Storefront profile requires Admin Guard step-up and rejects unapproved theme tokens
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz011_state (slot, id_val)
VALUES (
  (SELECT c_slot_prof FROM pg_temp.gmz011_consts),
  public.append_storefront_step_up_event(
    (SELECT c_user_owner_a FROM pg_temp.gmz011_consts),
    (SELECT c_org_a FROM pg_temp.gmz011_consts),
    (SELECT c_est_a FROM pg_temp.gmz011_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz011_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz011_consts),
    ARRAY[(SELECT c_perm_sf_write FROM pg_temp.gmz011_consts)],
    gen_random_uuid(),
    'allow',
    'authorized'
  )
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_setting FROM pg_temp.gmz011_consts), (SELECT c_jwt_owner_a FROM pg_temp.gmz011_consts), true);

SELECT throws_ok(
  $$
  SELECT public.storefront_save_profile(
    (SELECT c_org_a FROM pg_temp.gmz011_consts),
    (SELECT c_est_a FROM pg_temp.gmz011_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz011_consts),
    (SELECT c_slug_a FROM pg_temp.gmz011_consts),
    'Bistrô Jardins Online',
    'Massas frescas artesanais',
    'raw_css_injection',
    (SELECT c_accent_terra FROM pg_temp.gmz011_consts),
    (SELECT c_card_glass FROM pg_temp.gmz011_consts),
    NULL,
    true,
    (SELECT id_val FROM pg_temp.gmz011_state WHERE slot = (SELECT c_slot_prof FROM pg_temp.gmz011_consts)),
    gen_random_uuid()
  )
  $$,
  (SELECT c_err_22023 FROM pg_temp.gmz011_consts),
  NULL,
  'storefront_save_profile rejects unapproved layout_family tokens'
);

SELECT ok(
  (public.storefront_save_profile(
    (SELECT c_org_a FROM pg_temp.gmz011_consts),
    (SELECT c_est_a FROM pg_temp.gmz011_consts),
    (SELECT c_br_a1 FROM pg_temp.gmz011_consts),
    (SELECT c_slug_a FROM pg_temp.gmz011_consts),
    'Bistrô Jardins Online',
    'Massas frescas artesanais',
    (SELECT c_layout_express FROM pg_temp.gmz011_consts),
    (SELECT c_accent_terra FROM pg_temp.gmz011_consts),
    (SELECT c_card_glass FROM pg_temp.gmz011_consts),
    NULL,
    true,
    (SELECT id_val FROM pg_temp.gmz011_state WHERE slot = (SELECT c_slot_prof FROM pg_temp.gmz011_consts)),
    gen_random_uuid()
  )->>'public_slug') = (SELECT c_slug_a FROM pg_temp.gmz011_consts),
  'owner publishes branch storefront profile with approved safe theme schema'
);

-- 4. Public anon menu read fails closed on unknown offers & public checkout mints SHA-256 capability token
RESET ROLE;
SET LOCAL ROLE anon;

SELECT is(
  jsonb_array_length((public.storefront_get_public_menu((SELECT c_slug_a FROM pg_temp.gmz011_consts)))->'offers'),
  1,
  'public menu exposes only explicitly available offers and hides unknown-availability offers'
);

INSERT INTO pg_temp.gmz011_state (slot, text_val)
VALUES (
  (SELECT c_slot_tok FROM pg_temp.gmz011_consts),
  (
    public.storefront_place_public_order(
      (SELECT c_slug_a FROM pg_temp.gmz011_consts),
      (SELECT c_own_delivery FROM pg_temp.gmz011_consts),
      'Beatriz Silva',
      '11966665555',
      (SELECT c_addr_jardins FROM pg_temp.gmz011_consts),
      'c9000000-0000-4000-8000-000000000001'::uuid,
      (SELECT c_pay_pix FROM pg_temp.gmz011_consts),
      NULL,
      '',
      true,
      (SELECT c_items_valid FROM pg_temp.gmz011_consts),
      'pub-idem-0001',
      gen_random_uuid()
    )->>'tracking_token'
  )
);

SELECT ok(
  (SELECT text_val FROM pg_temp.gmz011_state WHERE slot = (SELECT c_slot_tok FROM pg_temp.gmz011_consts)) ~ '^[0-9a-f]{48}$',
  'public checkout returns 48-char hex capability token'
);

SELECT is(
  (public.storefront_get_order_tracking(
    (SELECT c_slug_a FROM pg_temp.gmz011_consts),
    (SELECT text_val FROM pg_temp.gmz011_state WHERE slot = (SELECT c_slot_tok FROM pg_temp.gmz011_consts))
  )->>'customer_first_name'),
  'Beatriz',
  'valid capability token returns privacy-minimized first-name order tracking'
);

SELECT is(
  public.storefront_get_order_tracking(
    (SELECT c_slug_a FROM pg_temp.gmz011_consts),
    '000000000000000000000000000000000000000000000000'
  ),
  NULL,
  'forged capability token returns NULL (zero IDOR enumeration)'
);

RESET ROLE;
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM private.order_public_tracking_tokens
    WHERE token_sha256 = (SELECT text_val FROM pg_temp.gmz011_state WHERE slot = (SELECT c_slot_tok FROM pg_temp.gmz011_consts))
  ),
  'raw capability token is never persisted in plaintext in private.order_public_tracking_tokens'
);

SELECT * FROM finish();
ROLLBACK;
