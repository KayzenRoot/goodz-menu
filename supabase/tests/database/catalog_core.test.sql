BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;
SELECT no_plan();

CREATE TEMP TABLE gmz_catalog_proofs (name text PRIMARY KEY, proof_id uuid NOT NULL);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz_catalog_proofs TO PUBLIC;
CREATE TEMP TABLE gmz_catalog_offers (offer_key text PRIMARY KEY, offer_id uuid UNIQUE NOT NULL);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz_catalog_offers TO PUBLIC;

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
VALUES
  ('86000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'gmz007-owner@example.invalid', now(), '{}', '{}', now(), now()),
  ('86000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'gmz007-staff@example.invalid', now(), '{}', '{}', now(), now()),
  ('86000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'gmz007-branch@example.invalid', now(), '{}', '{}', now(), now()),
  ('86000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'gmz007-foreign@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name, status)
VALUES
  ('85000000-0000-4000-8000-000000000001', 'GMZ-IMPL-007 Catalog A', 'active'),
  ('85000000-0000-4000-8000-000000000002', 'GMZ-IMPL-007 Catalog B', 'active'),
  ('85000000-0000-4000-8000-000000000003', 'GMZ-IMPL-007 Suspended', 'suspended');

INSERT INTO public.establishments (id, organization_id, display_name, status)
VALUES
  ('87000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', 'Catalog A1', 'active'),
  ('87000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000001', 'Catalog A2', 'active'),
  ('87000000-0000-4000-8000-000000000003', '85000000-0000-4000-8000-000000000002', 'Catalog B1', 'active'),
  ('87000000-0000-4000-8000-000000000004', '85000000-0000-4000-8000-000000000003', 'Suspended Establishment', 'active');

INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
VALUES
  ('88000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', 'Catalog A1-1', 'active'),
  ('88000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', 'Catalog A1-2', 'active'),
  ('88000000-0000-4000-8000-000000000003', '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000002', 'Catalog A2-1', 'active'),
  ('88000000-0000-4000-8000-000000000004', '85000000-0000-4000-8000-000000000002', '87000000-0000-4000-8000-000000000003', 'Catalog B1-1', 'active'),
  ('88000000-0000-4000-8000-000000000005', '85000000-0000-4000-8000-000000000003', '87000000-0000-4000-8000-000000000004', 'Suspended branch', 'active');

INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
VALUES
  ('89000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', 'owner', 'Catalog Owner'),
  ('89000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000001', 'staff', 'Catalog Staff'),
  ('89000000-0000-4000-8000-000000000004', '85000000-0000-4000-8000-000000000002', 'owner', 'Foreign Catalog Owner');

INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, permission.permission_key
FROM public.tenant_roles AS role
CROSS JOIN LATERAL unnest(ARRAY[
  'catalog.read', 'catalog.write', 'catalog.price.write', 'catalog.availability.write'
]::text[]) AS permission(permission_key)
WHERE role.role_key = 'owner'
ON CONFLICT DO NOTHING;

INSERT INTO public.organization_memberships (id, organization_id, user_id, status)
VALUES
  ('8a000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000001', 'active'),
  ('8a000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000002', 'active'),
  ('8a000000-0000-4000-8000-000000000003', '85000000-0000-4000-8000-000000000001', '86000000-0000-4000-8000-000000000003', 'active'),
  ('8a000000-0000-4000-8000-000000000004', '85000000-0000-4000-8000-000000000002', '86000000-0000-4000-8000-000000000004', 'active');

INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('8b000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '8a000000-0000-4000-8000-000000000001', '89000000-0000-4000-8000-000000000001', 'organization', NULL, NULL),
  ('8b000000-0000-4000-8000-000000000002', '85000000-0000-4000-8000-000000000001', '8a000000-0000-4000-8000-000000000002', '89000000-0000-4000-8000-000000000002', 'organization', NULL, NULL),
  ('8b000000-0000-4000-8000-000000000003', '85000000-0000-4000-8000-000000000001', '8a000000-0000-4000-8000-000000000003', '89000000-0000-4000-8000-000000000002', 'branch', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001'),
  ('8b000000-0000-4000-8000-000000000004', '85000000-0000-4000-8000-000000000002', '8a000000-0000-4000-8000-000000000004', '89000000-0000-4000-8000-000000000004', 'organization', NULL, NULL);

INSERT INTO public.product_categories (id, organization_id, name, description, status)
VALUES ('8c000000-0000-4000-8000-000000000003', '85000000-0000-4000-8000-000000000002', 'Foreign Category', '', 'active');
INSERT INTO public.products (id, organization_id, name, description, status)
VALUES ('8c000000-0000-4000-8000-000000000004', '85000000-0000-4000-8000-000000000002', 'Foreign Product', 'Foreign tenant fixture.', 'active');
INSERT INTO public.channel_offers (
  id, organization_id, establishment_id, branch_id, sales_channel_id,
  target_kind, product_id, currency, availability_state, is_visible, status
) VALUES (
  '8c000000-0000-4000-8000-000000000099', '85000000-0000-4000-8000-000000000002',
  '87000000-0000-4000-8000-000000000003', '88000000-0000-4000-8000-000000000004',
  (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000002' AND channel_key = 'pickup'),
  'product', '8c000000-0000-4000-8000-000000000004', 'BRL', 'unknown', false, 'active'
);

SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN (
    'product_categories', 'products', 'product_variants', 'sales_channels', 'channel_offers', 'channel_offer_price_history'
  )),
  'all exposed catalog tables enforce row-level security'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.products', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.products', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.products', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.products', 'DELETE')
    AND NOT has_table_privilege('service_role', 'public.channel_offers', 'SELECT')
    AND NOT has_table_privilege('service_role', 'public.channel_offers', 'INSERT'),
  'ordinary clients receive read-only catalog grants and service role receives no catalog table access'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.catalog_save_product(uuid,uuid,uuid,text,text,text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.catalog_save_product(uuid,uuid,uuid,text,text,text,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.catalog_save_product(uuid,uuid,uuid,text,text,text,uuid)', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.append_catalog_step_up_event(uuid,uuid,uuid,uuid,uuid,text[],uuid,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.append_catalog_step_up_event(uuid,uuid,uuid,uuid,uuid,text[],uuid,text,text)', 'EXECUTE'),
  'authenticated user commands and the narrow privileged audit append have separate grants'
);
SELECT ok(
  (SELECT prosecdef AND proconfig @> ARRAY['search_path=""']::text[]
   FROM pg_proc WHERE oid = 'public.catalog_save_offer(uuid,uuid,uuid,uuid,uuid,text,uuid,uuid,text,text,numeric,text,text,boolean,text,uuid,uuid)'::regprocedure),
  'offer command is security definer with an empty search path'
);
SELECT is(
  (SELECT array_agg(channel_key ORDER BY channel_key) FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001'),
  ARRAY['delivery', 'goodz_online', 'pickup']::text[],
  'each organization receives only the admitted default channel identities'
);
SELECT is(
  (SELECT count(*)::integer FROM public.role_permissions WHERE role_id = '89000000-0000-4000-8000-000000000001'),
  4,
  'owner role receives the four admitted catalog capabilities'
);
SELECT is(
  (SELECT array_agg(permission_key ORDER BY permission_key) FROM public.role_permissions WHERE role_id = '89000000-0000-4000-8000-000000000002'),
  ARRAY['catalog.read', 'catalog.write']::text[],
  'staff role can manage catalog metadata without price or availability authority'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"86000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT ok(public.catalog_has_permission('85000000-0000-4000-8000-000000000001', NULL, NULL, 'catalog.read'), 'organization owner can read own catalog');
SELECT ok(public.catalog_has_permission('85000000-0000-4000-8000-000000000001', NULL, NULL, 'catalog.write'), 'organization owner can manage own catalog metadata');
SELECT ok(public.catalog_has_permission('85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001', 'catalog.price.write'), 'organization owner can authorize an active branch price mutation');
SELECT ok(NOT public.catalog_has_permission('85000000-0000-4000-8000-000000000002', NULL, NULL, 'catalog.read'), 'organization owner cannot enumerate a foreign tenant');
SELECT ok(NOT public.catalog_has_permission('85000000-0000-4000-8000-000000000003', NULL, NULL, 'catalog.read'), 'suspended organization cannot authorize catalog access');
SELECT is((SELECT count(*)::integer FROM public.sales_channels WHERE organization_id IN ('85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000002')), 3, 'RLS hides foreign-tenant channels from organization owner');
SELECT throws_ok(
  $$INSERT INTO public.products (organization_id, name, description) VALUES ('85000000-0000-4000-8000-000000000001', 'Direct Write', '')$$,
  '42501', NULL, 'authenticated cannot insert catalog truth through the Data API'
);
SELECT throws_ok(
  $$UPDATE public.products SET name = 'Direct Update' WHERE organization_id = '85000000-0000-4000-8000-000000000001'$$,
  '42501', NULL, 'authenticated cannot update catalog truth through the Data API'
);
SELECT throws_ok(
  $$DELETE FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001'$$,
  '42501', NULL, 'authenticated cannot delete catalog truth through the Data API'
);
SELECT ok(public.catalog_save_category(NULL, '85000000-0000-4000-8000-000000000001', NULL, 'Menu', '', 'active', '8d000000-0000-4000-8000-000000000001') IS NOT NULL, 'owner creates a canonical category through an audited command');
SELECT ok(public.catalog_save_category(NULL, '85000000-0000-4000-8000-000000000001', (SELECT id FROM public.product_categories WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Menu'), 'Burgers', '', 'active', '8d000000-0000-4000-8000-000000000002') IS NOT NULL, 'owner creates a child category through an audited command');
SELECT throws_ok(
  $$SELECT public.catalog_save_category(NULL, '85000000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000003', 'Foreign Parent', '', 'active', '8d000000-0000-4000-8000-000000000003')$$,
  '23503', 'Catalog parent is unavailable.', 'category parent cannot cross tenant scope'
);
SELECT ok(public.catalog_save_product(NULL, '85000000-0000-4000-8000-000000000001', (SELECT id FROM public.product_categories WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Burgers'), 'Classic Burger', 'Canonical product description.', 'active', '8d000000-0000-4000-8000-000000000004') IS NOT NULL, 'owner creates canonical product name and description');
SELECT throws_ok(
  $$SELECT public.catalog_save_product(NULL, '85000000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000003', 'Cross Tenant Product', '', 'active', '8d000000-0000-4000-8000-000000000005')$$,
  '23503', 'Catalog category is unavailable.', 'product cannot reference a foreign tenant category'
);
SELECT ok(public.catalog_save_variant(NULL, '85000000-0000-4000-8000-000000000001', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'), 'Large Classic', 'Large', 'Classic', 'active', '8d000000-0000-4000-8000-000000000006') IS NOT NULL, 'owner creates a text-labeled product variant');
SELECT throws_ok(
  $$SELECT public.catalog_save_variant(NULL, '85000000-0000-4000-8000-000000000001', '8c000000-0000-4000-8000-000000000004', 'Foreign Variant', NULL, NULL, 'active', '8d000000-0000-4000-8000-000000000007')$$,
  '23503', 'Catalog product is unavailable.', 'variant cannot reference a foreign tenant product'
);
SELECT lives_ok(
  $$INSERT INTO pg_temp.gmz_catalog_offers (offer_key, offer_id)
  SELECT 'branch-one', public.catalog_save_offer(
    NULL, '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, 'Channel title', 'Channel description', NULL, 'BRL', 'unknown', false, 'active', NULL,
    '8d000000-0000-4000-8000-000000000008'
  )$$,
  'owner creates a branch-scoped offer through the authenticated command'
);
SELECT lives_ok(
  $$INSERT INTO pg_temp.gmz_catalog_offers (offer_key, offer_id)
  SELECT 'branch-two', public.catalog_save_offer(
    NULL, '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000002',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, NULL, NULL, NULL, 'BRL', 'unknown', false, 'active', NULL,
    '8d000000-0000-4000-8000-000000000009'
  )$$,
  'one canonical product supports a separate offer at another branch'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000099', '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, NULL, NULL, NULL, 'BRL', 'unknown', false, 'active', NULL, '8d000000-0000-4000-8000-000000000012'
  )$$,
  'P0002', 'Catalog item is unavailable.', 'foreign offer ID cannot be substituted into another tenant command'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000098', '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, NULL, NULL, NULL, 'BRL', 'unknown', false, 'active', NULL, '8d000000-0000-4000-8000-000000000013'
  )$$,
  'P0002', 'Catalog item is unavailable.', 'unused offer ID receives the same unavailable response as a foreign ID'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    NULL, '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, NULL, NULL, 12.50, 'BRL', 'unknown', false, 'active', NULL, '8d000000-0000-4000-8000-000000000014'
  )$$,
  '42501', 'Create an unavailable draft before changing price or availability.', 'offer creation cannot bypass privileged price and availability confirmation'
);
SELECT is(
  (SELECT product.name || '|' || product.description || '|' || offer.title_override || '|' || offer.description_override
   FROM public.products AS product JOIN public.channel_offers AS offer ON offer.product_id = product.id
   WHERE product.organization_id = '85000000-0000-4000-8000-000000000001' AND offer.id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')),
  'Classic Burger|Canonical product description.|Channel title|Channel description',
  'channel presentation overrides remain independent from canonical product name and description'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000005', '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', '8c000000-0000-4000-8000-000000000004', NULL, NULL, NULL, NULL, 'BRL', 'unknown', false, 'active', NULL,
    '8d000000-0000-4000-8000-000000000010'
  )$$,
  '23503', 'Catalog offer target is unavailable.', 'offer cannot target a foreign tenant product'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000006', '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, NULL, NULL, NULL, 'BRL', 'unknown', true, 'active', NULL, '8d000000-0000-4000-8000-000000000011'
  )$$,
  '22023', 'Catalog offer input is invalid.', 'unknown availability and missing price cannot be made visible'
);

SELECT set_config('request.jwt.claims', '{"sub":"86000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT ok(public.catalog_has_permission('85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001', 'catalog.read'), 'branch member can read offers in the assigned branch');
SELECT ok(NOT public.catalog_has_permission('85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000002', 'catalog.read'), 'branch member cannot read sibling-branch offers');
SELECT ok(NOT public.catalog_has_permission('85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', NULL, 'catalog.read'), 'branch permission cannot widen to the entire establishment');
SELECT ok(NOT public.catalog_has_permission('85000000-0000-4000-8000-000000000001', NULL, NULL, 'catalog.read'), 'branch permission cannot widen to unscoped organization data');
SELECT is((SELECT count(*)::integer FROM public.channel_offers WHERE organization_id = '85000000-0000-4000-8000-000000000001'), 1, 'branch-scoped RLS returns only the assigned branch offer');
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-two'),
    '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT sales_channel_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')),
    'product', (SELECT product_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')),
    NULL, NULL, NULL, NULL, 'BRL', 'unknown', false, 'active', NULL, '8d000000-0000-4000-8000-000000000015'
  )$$,
  'P0002', 'Catalog item is unavailable.', 'sibling-branch offer substitution returns the generic unavailable response'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000098',
    '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT sales_channel_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')),
    'product', (SELECT product_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')),
    NULL, NULL, NULL, NULL, 'BRL', 'unknown', false, 'active', NULL, '8d000000-0000-4000-8000-000000000016'
  )$$,
  'P0002', 'Catalog item is unavailable.', 'unknown offer ID returns the same response as the sibling-branch ID'
);

SELECT set_config('request.jwt.claims', '{"sub":"86000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT ok(public.catalog_has_permission('85000000-0000-4000-8000-000000000001', NULL, NULL, 'catalog.read'), 'staff can read its organization catalog');
SELECT ok(public.catalog_has_permission('85000000-0000-4000-8000-000000000001', NULL, NULL, 'catalog.write'), 'staff can manage catalog metadata');
SELECT ok(NOT public.catalog_has_permission('85000000-0000-4000-8000-000000000001', NULL, NULL, 'catalog.price.write'), 'staff cannot authorize base-price changes');
SELECT ok(NOT public.catalog_has_permission('85000000-0000-4000-8000-000000000001', NULL, NULL, 'catalog.availability.write'), 'staff cannot authorize availability changes');
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, 'Channel title', 'Channel description', 12.50, 'BRL', 'unknown', false, 'active', NULL,
    '8d000000-0000-4000-8000-000000000012'
  )$$,
  '42501', 'Catalog authorization is unavailable.', 'staff price mutation is denied even when metadata write is allowed'
);

SET LOCAL ROLE service_role;
SELECT throws_ok(
  $$SELECT public.append_catalog_step_up_event('86000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001', (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), ARRAY['catalog.price.write'], '8e000000-0000-4000-8000-000000000001', NULL, 'authorized')$$,
  '22023', 'Invalid catalog step-up event.', 'privileged proof rejects a null outcome'
);
SELECT throws_ok(
  $$SELECT public.append_catalog_step_up_event('86000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001', (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), ARRAY['catalog.price.write'], '8e000000-0000-4000-8000-000000000001', 'allow', NULL)$$,
  '22023', 'Invalid catalog step-up event.', 'privileged proof rejects a null reason code'
);
SELECT throws_ok(
  $$SELECT public.append_catalog_step_up_event('86000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001', '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001', (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), ARRAY[NULL::text], '8e000000-0000-4000-8000-000000000001', 'allow', 'authorized')$$,
  '22023', 'Invalid catalog step-up event.', 'privileged proof rejects null permission elements'
);
INSERT INTO pg_temp.gmz_catalog_proofs (name, proof_id)
SELECT 'price-one', public.append_catalog_step_up_event(
  '86000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001',
  '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), ARRAY['catalog.price.write'],
  '8e000000-0000-4000-8000-000000000001', 'allow', 'authorized'
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"86000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, 'Channel title', 'Channel description', 12.50, 'BRL', 'unknown', false, 'active', NULL,
    '8d000000-0000-4000-8000-000000000013'
  )$$,
  '42501', 'Privileged catalog confirmation is unavailable.', 'price mutation requires a one-use Admin Guard proof'
);
SELECT public.catalog_save_offer(
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), '85000000-0000-4000-8000-000000000001',
  '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
  (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
  'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
  NULL, 'Channel title', 'Channel description', 12.50, 'BRL', 'unknown', false, 'active',
  (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = 'price-one'), '8d000000-0000-4000-8000-000000000014'
);
SELECT is((SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')), 1, 'first price update writes exactly one history version');
SELECT is((SELECT amount FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one') AND version = 1), 12.50::numeric, 'history version one stores the exact initial price');
RESET ROLE;
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, 'Channel title', 'Channel description', 15.00, 'BRL', 'unknown', false, 'active',
    (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = 'price-one'), '8d000000-0000-4000-8000-000000000015'
  )$$,
  '42501', 'Privileged catalog confirmation is unavailable.', 'one privileged proof cannot be replayed'
);
SELECT is((SELECT base_price FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')), 12.50::numeric, 'failed proof replay does not change the offer price');
SELECT throws_ok(
  $$UPDATE public.channel_offer_price_history SET amount = 99.00 WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')$$,
  '55000', 'Catalog price history is immutable.', 'price history rows cannot be rewritten'
);
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz_catalog_proofs (name, proof_id)
SELECT 'price-two', public.append_catalog_step_up_event(
  '86000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001',
  '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), ARRAY['catalog.price.write'],
  '8e000000-0000-4000-8000-000000000002', 'allow', 'authorized'
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT public.catalog_save_offer(
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), '85000000-0000-4000-8000-000000000001',
  '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
  (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
  'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
  NULL, 'Channel title', 'Channel description', 15.00, 'BRL', 'unknown', false, 'active',
  (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = 'price-two'), '8d000000-0000-4000-8000-000000000016'
);
SELECT is(
  (SELECT array_agg(amount ORDER BY version) FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')),
  ARRAY[12.50::numeric, 15.00::numeric],
  'price changes append a reconstructable exact history'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, 'Channel title', 'Channel description', NULL, 'BRL', 'unknown', false, 'active', NULL,
    '8d000000-0000-4000-8000-000000000017'
  )$$,
  '23514', 'A recorded offer price cannot be cleared.', 'price history cannot be erased by clearing the current price'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_product(
    (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    '85000000-0000-4000-8000-000000000001', (SELECT category_id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    'Classic Burger', 'Canonical product description.', 'archived', '8d000000-0000-4000-8000-000000000018'
  )$$,
  '23514', 'Archive variants and offers first.', 'product archive cannot strand active child identity or offers'
);
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.audit_events WHERE action = 'catalog.offer.commercial_updated' AND target_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')), 2, 'successful price changes each append one material audit event');
SELECT is((SELECT count(*)::integer FROM public.audit_events WHERE action = 'catalog.offer.created' AND target_id IN ((SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-two'))), 2, 'both branch-specific offers have durable creation audit events');

RESET ROLE;
CREATE FUNCTION public.gmz007_fail_commercial_audit_for_test() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $function$
BEGIN
  IF NEW.action LIKE 'catalog.offer.commercial%' THEN
    RAISE EXCEPTION 'Injected catalog audit failure.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER gmz007_fail_commercial_audit_for_test
BEFORE INSERT ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.gmz007_fail_commercial_audit_for_test();
SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz_catalog_proofs (name, proof_id)
SELECT 'price-audit-failure', public.append_catalog_step_up_event(
  '86000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000001',
  '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), ARRAY['catalog.price.write'],
  '8e000000-0000-4000-8000-000000000003', 'allow', 'authorized'
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"86000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one'), '85000000-0000-4000-8000-000000000001',
    '87000000-0000-4000-8000-000000000001', '88000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_channels WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND channel_key = 'pickup'),
    'product', (SELECT id FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000001' AND name = 'Classic Burger'),
    NULL, 'Channel title', 'Channel description', 18.00, 'BRL', 'unknown', false, 'active',
    (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = 'price-audit-failure'), '8d000000-0000-4000-8000-000000000019'
  )$$,
  'P0001', 'Injected catalog audit failure.', 'failed required audit prevents the privileged price mutation'
);
SELECT is((SELECT base_price FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')), 15.00::numeric, 'audit failure rolls back the offer price update');
SELECT is((SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = 'branch-one')), 2, 'audit failure rolls back the price-history append');
RESET ROLE;
SELECT is(
  (SELECT count(*)::integer FROM private.catalog_step_up_consumptions AS consumption
   JOIN public.audit_events AS event_row ON event_row.id = consumption.guard_event_id
   WHERE event_row.metadata->>'step_up_proof_id' = (SELECT proof_id::text FROM pg_temp.gmz_catalog_proofs WHERE name = 'price-audit-failure')),
  0,
  'audit failure rolls back one-use proof consumption'
);

SELECT * FROM finish();
ROLLBACK;
