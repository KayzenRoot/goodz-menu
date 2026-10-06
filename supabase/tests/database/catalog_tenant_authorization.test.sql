-- GMZ-IMPL-007 — Catalog tenant authorization, RBAC capabilities and direct client mutation denial.
--
-- Every assertion here runs as an authenticated role whose identity comes from verified claims,
-- never as a bypass role. The matrix covers own-tenant allow, sibling deny, foreign tenant deny,
-- identifier substitution, nested relationship IDOR, foreign parent, absence of cross-tenant
-- enumeration, and the required capability for each class of catalog command.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT no_plan();

-- ---------------------------------------------------------------------------
-- 1. Fixture: two tenants, nested scopes, four distinct authorities
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('85000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'gmz007-org-manager@example.invalid', now(), '{}', '{}', now(), now()),
  ('85000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'gmz007-branch-manager@example.invalid', now(), '{}', '{}', now(), now()),
  ('85000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'gmz007-no-capability@example.invalid', now(), '{}', '{}', now(), now()),
  ('85000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'gmz007-foreign-manager@example.invalid', now(), '{}', '{}', now(), now()),
  ('85000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'gmz007-readonly@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name) VALUES
  ('85000000-0000-4000-8000-000000000010', 'GMZ-IMPL-007 tenant A'),
  ('85000000-0000-4000-8000-000000000011', 'GMZ-IMPL-007 tenant B');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ('85000000-0000-4000-8000-000000000012', '85000000-0000-4000-8000-000000000010', 'Establishment A1'),
  ('85000000-0000-4000-8000-000000000013', '85000000-0000-4000-8000-000000000010', 'Establishment A2'),
  ('85000000-0000-4000-8000-000000000014', '85000000-0000-4000-8000-000000000011', 'Establishment B1');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('85000000-0000-4000-8000-000000000015', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000012', 'Branch A1-1'),
  ('85000000-0000-4000-8000-000000000016', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000012', 'Branch A1-2'),
  ('85000000-0000-4000-8000-000000000017', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000013', 'Branch A2-1'),
  ('85000000-0000-4000-8000-000000000018', '85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000014', 'Branch B1-1');

INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('85000000-0000-4000-8000-000000000020', '85000000-0000-4000-8000-000000000010', 'gmz007-org-manager', 'Catalog manager'),
  ('85000000-0000-4000-8000-000000000021', '85000000-0000-4000-8000-000000000010', 'gmz007-branch-manager', 'Branch catalog manager'),
  ('85000000-0000-4000-8000-000000000022', '85000000-0000-4000-8000-000000000010', 'gmz007-no-capability', 'Role without catalog capability'),
  ('85000000-0000-4000-8000-000000000023', '85000000-0000-4000-8000-000000000011', 'gmz007-foreign-manager', 'Foreign catalog manager'),
  ('85000000-0000-4000-8000-000000000024', '85000000-0000-4000-8000-000000000010', 'gmz007-readonly', 'Catalog reader');

-- The capability vocabulary reuses the existing permissions model rather than introducing a parallel
-- one, and it is split so that price and availability are separately grantable.
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000020', 'catalog.read'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000020', 'catalog.write'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000020', 'catalog.price.manage'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000020', 'catalog.availability.manage'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000021', 'catalog.read'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000021', 'catalog.write'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000021', 'catalog.price.manage'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000024', 'catalog.read'),
  ('85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000023', 'catalog.read'),
  ('85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000023', 'catalog.write'),
  ('85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000023', 'catalog.price.manage'),
  ('85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000023', 'catalog.availability.manage');

INSERT INTO public.organization_memberships (id, organization_id, user_id, status)
VALUES
  ('85000000-0000-4000-8000-000000000030', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000001', 'active'),
  ('85000000-0000-4000-8000-000000000031', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000002', 'active'),
  ('85000000-0000-4000-8000-000000000032', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000003', 'active'),
  ('85000000-0000-4000-8000-000000000033', '85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000004', 'active'),
  ('85000000-0000-4000-8000-000000000034', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000005', 'active');
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('85000000-0000-4000-8000-000000000040', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000030', '85000000-0000-4000-8000-000000000020', 'organization', NULL, NULL),
  ('85000000-0000-4000-8000-000000000041', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000031', '85000000-0000-4000-8000-000000000021', 'branch', '85000000-0000-4000-8000-000000000012', '85000000-0000-4000-8000-000000000015'),
  ('85000000-0000-4000-8000-000000000042', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000032', '85000000-0000-4000-8000-000000000022', 'organization', NULL, NULL),
  ('85000000-0000-4000-8000-000000000043', '85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000033', '85000000-0000-4000-8000-000000000023', 'organization', NULL, NULL),
  ('85000000-0000-4000-8000-000000000044', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000034', '85000000-0000-4000-8000-000000000024', 'organization', NULL, NULL);

INSERT INTO public.product_categories (id, organization_id, name, display_order) VALUES
  ('85000000-0000-4000-8000-000000000050', '85000000-0000-4000-8000-000000000010', 'Bebidas', 10),
  ('85000000-0000-4000-8000-000000000052', '85000000-0000-4000-8000-000000000011', 'Bebidas estrangeiras', 10);
INSERT INTO public.product_categories (id, organization_id, establishment_id, branch_id, name, display_order) VALUES
  ('85000000-0000-4000-8000-000000000051', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000012', '85000000-0000-4000-8000-000000000015', 'Bebidas da filial', 5),
  ('85000000-0000-4000-8000-000000000053', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000012', '85000000-0000-4000-8000-000000000016', 'Bebidas da filial irmã', 5);

INSERT INTO public.products (id, organization_id, name) VALUES
  ('85000000-0000-4000-8000-000000000060', '85000000-0000-4000-8000-000000000010', 'Café expresso'),
  ('85000000-0000-4000-8000-000000000062', '85000000-0000-4000-8000-000000000011', 'Café estrangeiro');
INSERT INTO public.products (id, organization_id, establishment_id, branch_id, name)
VALUES ('85000000-0000-4000-8000-000000000061', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000012', '85000000-0000-4000-8000-000000000015', 'Café da filial');

INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ('85000000-0000-4000-8000-000000000070', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000060', 'Copo 90 ml'),
  ('85000000-0000-4000-8000-000000000071', '85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000062', 'Copo 180 ml');

INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name) VALUES
  ('85000000-0000-4000-8000-000000000080', '85000000-0000-4000-8000-000000000010', 'goodz-online', 'Goodz Online'),
  ('85000000-0000-4000-8000-000000000081', '85000000-0000-4000-8000-000000000011', 'goodz-online', 'Canal estrangeiro');

INSERT INTO public.channel_offers (id, organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency) VALUES
  ('85000000-0000-4000-8000-000000000090', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000080', '85000000-0000-4000-8000-000000000060', 7.5000, 'BRL'),
  ('85000000-0000-4000-8000-000000000092', '85000000-0000-4000-8000-000000000011', '85000000-0000-4000-8000-000000000081', '85000000-0000-4000-8000-000000000062', 9.9000, 'BRL');
INSERT INTO public.channel_offers (id, organization_id, establishment_id, branch_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
VALUES ('85000000-0000-4000-8000-000000000091', '85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000012', '85000000-0000-4000-8000-000000000015', '85000000-0000-4000-8000-000000000080', '85000000-0000-4000-8000-000000000061', 8.0000, 'BRL');

INSERT INTO public.audit_events (id, actor_user_id, organization_id, action, target_type, target_id, outcome, reason_code, correlation_id, source, metadata)
VALUES
  ('85000000-0000-4000-8000-0000000000a1', '85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000010', 'catalog.channel_offer.created', 'channel_offer', '85000000-0000-4000-8000-000000000090', 'allow', 'authorized', '85000000-0000-4000-8000-0000000000b1', 'catalog_contract', '{"required_permission":"catalog.price.manage"}'),
  ('85000000-0000-4000-8000-0000000000a2', '85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-000000000010', 'catalog.channel_offer.created', 'channel_offer', '85000000-0000-4000-8000-000000000091', 'allow', 'authorized', '85000000-0000-4000-8000-0000000000b2', 'catalog_contract', '{"required_permission":"catalog.price.manage"}');
INSERT INTO public.channel_offer_price_history (
  organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
  availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
) VALUES
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000090', 1, 7.5000, 'BRL', 'available', 'visible', now(), '85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-0000000000b1', '85000000-0000-4000-8000-0000000000a1'),
  ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000091', 1, 8.0000, 'BRL', 'available', 'visible', now(), '85000000-0000-4000-8000-000000000001', '85000000-0000-4000-8000-0000000000b2', '85000000-0000-4000-8000-0000000000a2');

-- ---------------------------------------------------------------------------
-- 2. anon holds nothing
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.products$$, '42501', NULL, 'anon cannot read the canonical product table');
SELECT throws_ok($$SELECT * FROM public.product_categories$$, '42501', NULL, 'anon cannot read the product category table');
SELECT throws_ok($$SELECT * FROM public.channel_offers$$, '42501', NULL, 'anon cannot read the channel offer table');
SELECT throws_ok($$SELECT * FROM public.channel_offer_pricing$$, '42501', NULL, 'anon cannot read the pricing projection');
SELECT throws_ok(
  $$SELECT public.catalog_admitted_scopes('catalog.write')$$,
  '42501', NULL, 'anon cannot discover the scopes it may write into'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Own tenant allow, sibling deny, foreign tenant deny, no enumeration
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"85000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.product_categories), 3, 'an organization manager sees its own categories, including the branch-scoped ones');
SELECT is((SELECT count(*)::integer FROM public.products), 2, 'an organization manager sees its own canonical products');
SELECT is((SELECT count(*)::integer FROM public.product_variants), 1, 'an organization manager sees its own variants');
SELECT is((SELECT count(*)::integer FROM public.sales_channels), 1, 'an organization manager sees only its own channels');
SELECT is((SELECT count(*)::integer FROM public.channel_offers), 2, 'an organization manager sees its own channel offers');
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE organization_id = '85000000-0000-4000-8000-000000000011'),
  0,
  'an organization manager cannot enumerate the categories of a foreign tenant'
);
SELECT is(
  (SELECT count(*)::integer FROM public.products WHERE organization_id = '85000000-0000-4000-8000-000000000010'),
  2,
  'a same-tenant filter narrows the result set without changing the tenant boundary'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories c
    WHERE c.id = '85000000-0000-4000-8000-000000000052'),
  0,
  'substituting a foreign identifier into an explicit filter yields no row'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offers o
    WHERE o.sales_channel_id = '85000000-0000-4000-8000-000000000081'),
  0,
  'an offer cannot be reached through a foreign channel identifier'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_variants v
    JOIN public.products p ON p.organization_id = v.organization_id AND p.id = v.product_id
    WHERE v.organization_id = '85000000-0000-4000-8000-000000000011'),
  0,
  'a nested relationship walk from a variant never reaches a foreign product'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_pricing),
  2,
  'the pricing projection is bounded by the same catalog policy'
);
SELECT is(
  (SELECT base_price_amount FROM public.channel_offer_pricing WHERE id = '85000000-0000-4000-8000-000000000090'),
  '7.5000',
  'the pricing projection returns the price as exact decimal text'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline),
  2,
  'the price timeline is bounded by the same catalog policy'
);

-- ---------------------------------------------------------------------------
-- 4. Direct client mutation is denied by grant, before any policy is consulted
-- ---------------------------------------------------------------------------

SELECT throws_ok($$INSERT INTO public.products (organization_id, name) VALUES ('85000000-0000-4000-8000-000000000010', 'Unauthorized')$$, '42501', 'permission denied for table products', 'an authenticated client cannot insert a canonical product');
SELECT throws_ok($$UPDATE public.products SET name = 'Unauthorized' WHERE id = '85000000-0000-4000-8000-000000000060'$$, '42501', 'permission denied for table products', 'an authenticated client cannot update a canonical product');
SELECT throws_ok($$DELETE FROM public.products WHERE id = '85000000-0000-4000-8000-000000000060'$$, '42501', 'permission denied for table products', 'an authenticated client cannot delete a canonical product');
SELECT throws_ok($$INSERT INTO public.product_categories (organization_id, name) VALUES ('85000000-0000-4000-8000-000000000010', 'Unauthorized')$$, '42501', 'permission denied for table product_categories', 'an authenticated client cannot insert a category');
SELECT throws_ok($$UPDATE public.product_categories SET name = 'Unauthorized' WHERE id = '85000000-0000-4000-8000-000000000050'$$, '42501', 'permission denied for table product_categories', 'an authenticated client cannot update a category');
SELECT throws_ok($$INSERT INTO public.product_variants (organization_id, product_id, name) VALUES ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000060', 'Unauthorized')$$, '42501', 'permission denied for table product_variants', 'an authenticated client cannot insert a variant');
SELECT throws_ok($$INSERT INTO public.sales_channels (organization_id, channel_key, display_name) VALUES ('85000000-0000-4000-8000-000000000010', 'unauthorized', 'Unauthorized')$$, '42501', 'permission denied for table sales_channels', 'an authenticated client cannot insert a channel');
SELECT throws_ok($$UPDATE public.channel_offers SET base_price_amount = 1.0000 WHERE id = '85000000-0000-4000-8000-000000000090'$$, '42501', 'permission denied for table channel_offers', 'an authenticated client cannot rewrite a price');
SELECT throws_ok($$DELETE FROM public.channel_offers WHERE id = '85000000-0000-4000-8000-000000000090'$$, '42501', 'permission denied for table channel_offers', 'an authenticated client cannot delete an offer');
SELECT throws_ok($$INSERT INTO public.channel_offer_price_history (organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency, availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id) VALUES ('85000000-0000-4000-8000-000000000010', '85000000-0000-4000-8000-000000000090', 2, 1.0000, 'BRL', 'available', 'visible', now(), '85000000-0000-4000-8000-000000000001', gen_random_uuid(), gen_random_uuid())$$, '42501', 'permission denied for table channel_offer_price_history', 'an authenticated client cannot forge a price history row');
SELECT throws_ok($$UPDATE public.channel_offer_price_history SET base_price_amount = 1.0000 WHERE channel_offer_id = '85000000-0000-4000-8000-000000000090'$$, '42501', 'permission denied for table channel_offer_price_history', 'an authenticated client cannot rewrite a price history row');
SELECT throws_ok($$DELETE FROM public.channel_offer_price_history WHERE channel_offer_id = '85000000-0000-4000-8000-000000000090'$$, '42501', 'permission denied for table channel_offer_price_history', 'an authenticated client cannot delete a price history row');
SELECT throws_ok($$INSERT INTO public.catalog_command_receipts (organization_id, idempotency_key, actor_user_id, correlation_id, audit_event_id, action, target_type, target_id) VALUES ('85000000-0000-4000-8000-000000000010', gen_random_uuid(), '85000000-0000-4000-8000-000000000001', gen_random_uuid(), gen_random_uuid(), 'catalog.product.created', 'product', gen_random_uuid())$$, '42501', 'permission denied for table catalog_command_receipts', 'an authenticated client cannot forge a command receipt');

-- ---------------------------------------------------------------------------
-- 5. Commands: own tenant allowed, everything else refused
-- ---------------------------------------------------------------------------

SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Sorbetes', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d1', p_idempotency_key => gen_random_uuid())$$,
  'a manager holding catalog.write creates a category inside its own tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000011',
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Unauthorized', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d2', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a manager cannot create a category inside a foreign tenant'
);
-- Scope containment stops at the organization boundary: a branch identifier from another tenant
-- cannot be paired with this tenant's organization.
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => '85000000-0000-4000-8000-000000000012',
    p_branch_id => '85000000-0000-4000-8000-000000000018', p_parent_category_id => NULL,
    p_name => 'Unauthorized', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d3', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a manager cannot pair its own organization with a branch identifier of another tenant'
);
-- An organization scoped manager is authorized for the whole of its own organization, including the
-- rows a narrower role is scoped to.
SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => '85000000-0000-4000-8000-000000000013',
    p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Bebidas de A2', p_description => NULL, p_display_order => 40,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d4', p_idempotency_key => gen_random_uuid())$$,
  'an organization manager writes into a single establishment of its own tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => '85000000-0000-4000-8000-000000000014',
    p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Unauthorized', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000e4', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'an organization manager cannot substitute an establishment of another tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => NULL, p_branch_id => NULL,
    p_parent_category_id => '85000000-0000-4000-8000-000000000052',
    p_name => 'Unauthorized', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d5', p_idempotency_key => gen_random_uuid())$$,
  '23514', 'Category scope must stay inside its parent category scope.',
  'a category cannot be created under a parent category of another tenant'
);
-- The offer contract is a privileged commercial mutation, so the session is upgraded to a fresh
-- two-factor session first. The point of the next assertions is what happens after the factor check
-- passes, so the factor check itself is satisfied rather than being the thing under test here.
DO $step_up$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '85000000-0000-4000-8000-000000000001',
      'role', 'authenticated',
      'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$step_up$;
SELECT throws_ok(
  $$SELECT public.catalog_create_channel_offer(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => NULL, p_branch_id => NULL,
    p_sales_channel_id => '85000000-0000-4000-8000-000000000080',
    p_product_id => '85000000-0000-4000-8000-000000000062', p_product_variant_id => NULL,
    p_title => NULL, p_description => NULL,
    p_base_price_amount => 7.5000, p_base_price_currency => 'BRL', p_promotional_price_amount => NULL,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d6',
    p_idempotency_key => '85000000-0000-4000-8000-0000000000e6')$$,
  '23514', 'Channel offer scope must stay inside its canonical product scope.',
  'a channel offer cannot be attached to a canonical product of another tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_variant(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => NULL, p_branch_id => NULL,
    p_product_id => '85000000-0000-4000-8000-000000000062', p_name => 'Unauthorized',
    p_correlation_id => '85000000-0000-4000-8000-0000000000d7', p_idempotency_key => gen_random_uuid())$$,
  '23514', 'Product variant scope must stay inside its canonical product scope.',
  'a variant cannot be attached to a canonical product of another tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_category(
    p_category_id => '85000000-0000-4000-8000-000000000052', p_name => 'Unauthorized',
    p_description => NULL, p_display_order => 0,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d8', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a foreign category cannot be renamed by substituting its identifier'
);
SELECT throws_ok(
  $$SELECT public.catalog_set_product_archived(
    p_product_id => '85000000-0000-4000-8000-000000000062', p_archived => true,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d9', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a foreign product cannot be archived by substituting its identifier'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.products WHERE id = '85000000-0000-4000-8000-000000000062'),
  'active',
  'the refused archival left the foreign product untouched'
);

-- ---------------------------------------------------------------------------
-- 6. A narrower scope never sees a tenant-wide row
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"85000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

SELECT is((SELECT count(*)::integer FROM public.product_categories), 1, 'a branch manager sees only the categories carrying its branch');
SELECT is((SELECT count(*)::integer FROM public.products), 1, 'a branch manager sees only the products carrying its branch');
SELECT is((SELECT count(*)::integer FROM public.channel_offers), 1, 'a branch manager sees only the offers carrying its branch');
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE id = '85000000-0000-4000-8000-000000000050'),
  0,
  'a branch manager cannot see a tenant-wide category, because it cannot know which branch would sell it'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE id = '85000000-0000-4000-8000-000000000053'),
  0,
  'a branch manager cannot see a sibling branch category'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline),
  0,
  'price history is tenant-wide commercial truth and stays invisible to a narrower branch scope'
);
SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => '85000000-0000-4000-8000-000000000012',
    p_branch_id => '85000000-0000-4000-8000-000000000015', p_parent_category_id => NULL,
    p_name => 'Sorbetes da filial', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000f1', p_idempotency_key => gen_random_uuid())$$,
  'a branch manager creates a category inside its own granted scope'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => '85000000-0000-4000-8000-000000000012',
    p_branch_id => '85000000-0000-4000-8000-000000000016', p_parent_category_id => NULL,
    p_name => 'Unauthorized', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000f2', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a branch manager cannot substitute a sibling branch identifier'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Unauthorized', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000f3', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a branch manager cannot widen its scope to the whole organization'
);
SELECT is(
  (SELECT admitted FROM (SELECT count(*) = 1 AS admitted FROM public.catalog_admitted_scopes('catalog.write')) AS scope),
  true,
  'a branch manager is admitted exactly one write scope, and it is its own branch'
);
SELECT is(
  (SELECT establishment_id FROM public.catalog_admitted_scopes('catalog.write')),
  '85000000-0000-4000-8000-000000000012',
  'the admitted write scope carries the establishment that contains the branch'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 7. A tenant with an empty catalog is still able to create its first row
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('85000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'gmz007-empty-tenant@example.invalid', now(), '{}', '{}', now(), now());
INSERT INTO public.organizations (id, display_name) VALUES ('85000000-0000-4000-8000-000000000014', 'GMZ-IMPL-007 tenant C');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('85000000-0000-4000-8000-000000000025', '85000000-0000-4000-8000-000000000014', 'gmz007-empty-tenant', 'Empty tenant manager');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('85000000-0000-4000-8000-000000000014', '85000000-0000-4000-8000-000000000025', 'catalog.read'),
  ('85000000-0000-4000-8000-000000000014', '85000000-0000-4000-8000-000000000025', 'catalog.write'),
  ('85000000-0000-4000-8000-000000000014', '85000000-0000-4000-8000-000000000025', 'catalog.price.manage');
INSERT INTO public.organization_memberships (id, organization_id, user_id, status)
VALUES ('85000000-0000-4000-8000-000000000035', '85000000-0000-4000-8000-000000000014', '85000000-0000-4000-8000-000000000006', 'active');
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES ('85000000-0000-4000-8000-000000000045', '85000000-0000-4000-8000-000000000014', '85000000-0000-4000-8000-000000000035', '85000000-0000-4000-8000-000000000025', 'organization', NULL, NULL);

-- An empty catalog is the bootstrap case: if the admitted scope were derived from the rows that
-- already exist, this tenant could read its console and then have nothing to write into.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"85000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories),
  0,
  'a manager of a brand new tenant sees an empty catalog and never enumerates another tenant'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes('catalog.write')),
  1,
  'a tenant with an empty catalog still has exactly one admitted write scope'
);
SELECT is(
  (SELECT organization_id FROM public.catalog_admitted_scopes('catalog.write')),
  '85000000-0000-4000-8000-000000000014',
  'the admitted write scope belongs to the calling tenant'
);
SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000014',
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Primeira categoria', p_description => NULL, p_display_order => 1,
    p_correlation_id => '85000000-0000-4000-8000-000000000101', p_idempotency_key => gen_random_uuid())$$,
  'a tenant with an empty catalog creates its first category'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories),
  1,
  'the first category of a new tenant is immediately visible to its own manager'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 8. Required capability per command class
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"85000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes('catalog.write')),
  0,
  'an active membership without any catalog capability admits no write scope'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes('catalog.read')),
  0,
  'an active membership without catalog.read admits no read scope'
);
SELECT is((SELECT count(*)::integer FROM public.products), 0, 'a member without catalog.read sees no catalog row');
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => '85000000-0000-4000-8000-000000000010',
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Unauthorized', p_description => NULL, p_display_order => 0,
    p_correlation_id => '85000000-0000-4000-8000-000000000102', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'an active membership without catalog.write cannot create a category'
);
RESET ROLE;

-- catalog.read is not catalog.write, and catalog.write is not catalog.price.manage: the four
-- capabilities are separately grantable, so a structural editor cannot reprice by inheritance.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"85000000-0000-4000-8000-000000000005","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes('catalog.read')),
  1,
  'a catalog reader holds a read scope'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes('catalog.write')),
  0,
  'catalog.read alone does not admit a write scope'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_product(
    p_product_id => '85000000-0000-4000-8000-000000000060', p_name => 'Unauthorized',
    p_description => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000105', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a catalog reader cannot rename a product'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '85000000-0000-4000-8000-000000000090',
    p_base_price_amount => 1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000106', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a catalog reader cannot reprice an offer even with a fresh two-factor session'
);
RESET ROLE;

-- A manager of another tenant reaches its own rows and only its own.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"85000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.products),
  1,
  'the foreign manager sees exactly its own canonical product'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_product(
    p_product_id => '85000000-0000-4000-8000-000000000060', p_name => 'Unauthorized',
    p_description => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000103', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a foreign manager cannot reach a product of another tenant through an update contract'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '85000000-0000-4000-8000-000000000090',
    p_base_price_amount => 1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000104', p_idempotency_key => gen_random_uuid())$$,
  '42501', 'The current session is not authorized for this catalog operation.',
  'a foreign manager cannot reprice an offer of another tenant'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '85000000-0000-4000-8000-000000000090'),
  '7.5000',
  'the refused repricing left the original price untouched'
);

SELECT * FROM finish();
ROLLBACK;
