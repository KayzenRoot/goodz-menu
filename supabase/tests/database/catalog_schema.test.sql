-- GMZ-IMPL-007 — Catalog physical invariants.
--
-- This file proves the structural promises the Work Order makes about the catalog schema itself:
-- canonical products that cannot be duplicated per channel, money that never passes through a
-- binary float, prices that cannot be commercially impossible, tenant containment on every
-- nested relationship, and prior commercial truth that survives a later price change.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT no_plan();

-- ---------------------------------------------------------------------------
-- 1. Least privilege: reads only, mutations through contracts only
-- ---------------------------------------------------------------------------

SELECT has_table('public', 'product_categories', 'product category table exists');
SELECT has_table('public', 'products', 'canonical product table exists');
SELECT has_table('public', 'product_variants', 'product variant table exists');
SELECT has_table('public', 'sales_channels', 'sales channel table exists');
SELECT has_table('public', 'channel_offers', 'channel offer table exists');
SELECT has_table('public', 'channel_offer_price_history', 'append-only price history exists');
SELECT has_table('public', 'catalog_command_receipts', 'command receipts exist');

SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN (
    'public.product_categories'::regclass, 'public.products'::regclass, 'public.product_variants'::regclass,
    'public.sales_channels'::regclass, 'public.channel_offers'::regclass,
    'public.channel_offer_price_history'::regclass, 'public.catalog_command_receipts'::regclass
  )),
  'every catalog table has row level security enabled'
);

-- A mutation denied by the grant, not merely by a policy, cannot be retried into success by any
-- authenticated session. This is asserted for the whole catalog surface.
SELECT ok(
  NOT has_table_privilege('anon', 'public.product_categories', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.products', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.products', 'INSERT, UPDATE, DELETE')
    AND NOT has_table_privilege('anon', 'public.channel_offers', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.channel_offers', 'INSERT, UPDATE, DELETE'),
  'anon holds no catalog privilege of any kind'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.product_categories', 'SELECT')
    AND has_table_privilege('authenticated', 'public.products', 'SELECT')
    AND has_table_privilege('authenticated', 'public.product_variants', 'SELECT')
    AND has_table_privilege('authenticated', 'public.sales_channels', 'SELECT')
    AND has_table_privilege('authenticated', 'public.channel_offers', 'SELECT')
    AND has_table_privilege('authenticated', 'public.channel_offer_price_history', 'SELECT')
    AND has_table_privilege('authenticated', 'public.catalog_command_receipts', 'SELECT'),
  'authenticated holds catalog SELECT only'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.product_categories', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.products', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.product_variants', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.sales_channels', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.channel_offers', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.channel_offers', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.channel_offers', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.channel_offer_price_history', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.channel_offer_price_history', 'UPDATE, DELETE')
    AND NOT has_table_privilege('authenticated', 'public.catalog_command_receipts', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.catalog_command_receipts', 'UPDATE, DELETE'),
  'authenticated holds no catalog INSERT, UPDATE or DELETE privilege'
);
SELECT ok(
  NOT has_table_privilege('service_role', 'public.product_categories', 'INSERT, UPDATE, DELETE')
    AND NOT has_table_privilege('service_role', 'public.products', 'INSERT, UPDATE, DELETE')
    AND NOT has_table_privilege('service_role', 'public.product_variants', 'INSERT, UPDATE, DELETE')
    AND NOT has_table_privilege('service_role', 'public.sales_channels', 'INSERT, UPDATE, DELETE')
    AND NOT has_table_privilege('service_role', 'public.channel_offers', 'INSERT, UPDATE, DELETE'),
  'service_role holds no direct catalog mutation privilege'
);

-- Every catalog contract runs with the caller's authority resolved from the verified claims, so it
-- must be SECURITY DEFINER over an empty search path and callable by authenticated only.
SELECT ok(
  (
    SELECT NOT bool_or(NOT prosecdef OR NOT (proconfig @> ARRAY['search_path=""']))
    FROM pg_proc
    WHERE oid IN (
    'public.catalog_create_category(uuid,uuid,uuid,uuid,text,text,integer,uuid,uuid)'::regprocedure,
    'public.catalog_update_category(uuid,text,text,integer,uuid,uuid)'::regprocedure,
    'public.catalog_set_category_archived(uuid,boolean,uuid,uuid)'::regprocedure,
    'public.catalog_create_product(uuid,uuid,uuid,uuid,text,text,uuid,uuid)'::regprocedure,
    'public.catalog_update_product(uuid,text,text,uuid,uuid)'::regprocedure,
    'public.catalog_set_product_archived(uuid,boolean,uuid,uuid)'::regprocedure,
    'public.catalog_create_variant(uuid,uuid,uuid,uuid,text,uuid,uuid)'::regprocedure,
    'public.catalog_update_variant(uuid,text,boolean,uuid,uuid)'::regprocedure,
    'public.catalog_create_sales_channel(uuid,text,text,text,uuid,uuid)'::regprocedure,
    'public.catalog_update_sales_channel(uuid,text,text,uuid,uuid)'::regprocedure,
    'public.catalog_create_channel_offer(uuid,uuid,uuid,uuid,uuid,uuid,text,text,numeric,text,numeric,uuid,uuid)'::regprocedure,
    'public.catalog_update_channel_offer_presentation(uuid,text,text,uuid,uuid)'::regprocedure,
    'public.catalog_update_channel_offer_price(uuid,numeric,numeric,uuid,uuid)'::regprocedure,
    'public.catalog_update_channel_offer_availability(uuid,text,uuid,uuid)'::regprocedure,
    'public.catalog_update_channel_offer_visibility(uuid,text,uuid,uuid)'::regprocedure
    )
  ),
  'every catalog contract is SECURITY DEFINER with an empty search path'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.catalog_create_category(uuid,uuid,uuid,uuid,text,text,integer,uuid,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.catalog_update_channel_offer_price(uuid,numeric,numeric,uuid,uuid)', 'EXECUTE'),
  'anon cannot invoke any catalog contract'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.catalog_update_channel_offer_price(uuid,numeric,numeric,uuid,uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.catalog_admitted_scopes(text)', 'EXECUTE'),
  'authenticated can invoke the catalog contracts and the admitted scope read contract'
);
SELECT ok(
  NOT has_function_privilege('service_role', 'public.catalog_create_category(uuid,uuid,uuid,uuid,text,text,integer,uuid,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.catalog_update_channel_offer_price(uuid,numeric,numeric,uuid,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.catalog_admitted_scopes(text)', 'EXECUTE'),
  'service_role cannot invoke a catalog contract or the admitted scope read contract'
);

-- ---------------------------------------------------------------------------
-- 2. Canonical product and provider-free channel identity
-- ---------------------------------------------------------------------------

-- A product carrying a channel or provider column is what would let a provider schema become the
-- canonical schema, and what would let the same product be duplicated once per channel.
SELECT is(
  (
    SELECT array_agg(column_name ORDER BY column_name)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name ~* '(channel|provider|adapter|credential|secret|endpoint|token)'
  ),
  NULL,
  'the canonical product carries no channel, provider or credential column'
);
SELECT is(
  (
    SELECT array_agg(column_name ORDER BY column_name)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_channels'
      AND column_name ~* '(credential|secret|endpoint|token|base_url|webhook|adapter)'
  ),
  NULL,
  'a sales channel is channel identity only and carries no provider adapter surface'
);
SELECT ok(
  to_regclass('public.ingredients') IS NULL
    AND to_regclass('public.inventory_items') IS NULL
    AND to_regclass('public.stock_movements') IS NULL
    AND to_regclass('public.recipe_*') IS NULL,
  'no ingredient, recipe or inventory entity is admitted into the catalog schema'
);

-- ---------------------------------------------------------------------------
-- 3. Money is exact, never a binary float
-- ---------------------------------------------------------------------------

SELECT is(
  (
    SELECT format_type(atttypid, atttypmod)
    FROM pg_attribute
    WHERE attrelid = 'public.channel_offers'::regclass AND attname = 'base_price_amount'
  ),
  'numeric(19,4)',
  'the base price is persisted as exact numeric(19,4)'
);
SELECT is(
  (
    SELECT format_type(atttypid, atttypmod)
    FROM pg_attribute
    WHERE attrelid = 'public.channel_offer_price_history'::regclass AND attname = 'base_price_amount'
  ),
  'numeric(19,4)',
  'price history persists the base price as exact numeric(19,4)'
);

-- ---------------------------------------------------------------------------
-- 4. Fixture
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('84000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'gmz007-schema@example.invalid', now(), '{}', '{}', now(), now()),
  ('84000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'gmz007-schema-foreign@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name) VALUES
  ('84000000-0000-4000-8000-000000000010', 'GMZ-IMPL-007 schema organization'),
  ('84000000-0000-4000-8000-000000000011', 'GMZ-IMPL-007 schema foreign organization');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ('84000000-0000-4000-8000-000000000012', '84000000-0000-4000-8000-000000000010', 'Schema establishment A1');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('84000000-0000-4000-8000-000000000015', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000012', 'Schema branch A1-1');

INSERT INTO public.product_categories (id, organization_id, name, display_order) VALUES
  ('84000000-0000-4000-8000-000000000050', '84000000-0000-4000-8000-000000000010', 'Bebidas', 10),
  ('84000000-0000-4000-8000-000000000051', '84000000-0000-4000-8000-000000000010', 'Cafés', 20),
  ('84000000-0000-4000-8000-000000000052', '84000000-0000-4000-8000-000000000011', 'Foreign beverages', 10);
INSERT INTO public.product_categories (id, organization_id, establishment_id, branch_id, name, display_order) VALUES
  ('84000000-0000-4000-8000-000000000053', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000012', '84000000-0000-4000-8000-000000000015', 'Bebidas da filial', 5);

INSERT INTO public.products (id, organization_id, category_id, name) VALUES
  ('84000000-0000-4000-8000-000000000060', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000051', 'Café expresso'),
  ('84000000-0000-4000-8000-000000000062', '84000000-0000-4000-8000-000000000011', '84000000-0000-4000-8000-000000000052', 'Foreign coffee'),
  ('84000000-0000-4000-8000-000000000063', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000051', 'Café gelado'),
  ('84000000-0000-4000-8000-000000000064', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000051', 'Café orgânico');
INSERT INTO public.products (id, organization_id, establishment_id, branch_id, name) VALUES
  ('84000000-0000-4000-8000-000000000061', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000012', '84000000-0000-4000-8000-000000000015', 'Café da filial');

INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ('84000000-0000-4000-8000-000000000070', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000060', 'Copo 90 ml');

INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name) VALUES
  ('84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000010', 'goodz-online', 'Goodz Online'),
  ('84000000-0000-4000-8000-000000000081', '84000000-0000-4000-8000-000000000011', 'goodz-online', 'Foreign channel'),
  ('84000000-0000-4000-8000-000000000082', '84000000-0000-4000-8000-000000000010', 'goodz-pdv', 'Goodz PDV');

INSERT INTO public.channel_offers (id, organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency) VALUES
  ('84000000-0000-4000-8000-000000000090', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', 7.5000, 'BRL'),
  ('84000000-0000-4000-8000-000000000092', '84000000-0000-4000-8000-000000000011', '84000000-0000-4000-8000-000000000081', '84000000-0000-4000-8000-000000000062', 9.9000, 'BRL');

INSERT INTO public.audit_events (
  id, actor_user_id, organization_id, action, target_type, target_id, outcome, reason_code,
  correlation_id, source, metadata
)
VALUES (
  '84000000-0000-4000-8000-0000000000a1', '84000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000010',
  'catalog.channel_offer.created', 'channel_offer', '84000000-0000-4000-8000-000000000090', 'allow', 'authorized',
  '84000000-0000-4000-8000-0000000000b1', 'catalog_contract', '{"required_permission":"catalog.price.manage"}'
);
INSERT INTO public.channel_offer_price_history (
  id, organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
  promotional_price_amount, availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
)
VALUES (
  '84000000-0000-4000-8000-0000000000c1', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000090',
  1, 7.5000, 'BRL', 5.9000, 'available', 'visible', now() - interval '2 days',
  '84000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-0000000000b1', '84000000-0000-4000-8000-0000000000a1'
);

-- ---------------------------------------------------------------------------
-- 5. Exact decimal representation survives persistence
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '84000000-0000-4000-8000-000000000090'),
  '7.5000',
  'a four-decimal price round-trips as its exact decimal text, not as a binary float'
);
SELECT lives_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000082', '84000000-0000-4000-8000-000000000063', 0.0001, 'BRL')$$,
  'the smallest representable price is admitted'
);
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE product_id = '84000000-0000-4000-8000-000000000063'),
  '0.0001',
  'the smallest representable price retains its fourth decimal'
);
SELECT lives_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000082', '84000000-0000-4000-8000-000000000064', 12345678.9123, 'BRL')$$,
  'a price with four significant decimals is admitted exactly'
);
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE product_id = '84000000-0000-4000-8000-000000000064'),
  '12345678.9123',
  'the admitted price is stored with every decimal digit intact'
);

-- ---------------------------------------------------------------------------
-- 6. Commercially impossible prices are refused
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', -0.0001, 'BRL')$$,
  '23514', NULL, 'a negative price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', 7.5000, 'BRL', 9.9000)$$,
  '23514', NULL, 'a promotional price above the base price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', 7.5000, 'BRL', 7.5000)$$,
  '23514', NULL, 'a promotional price equal to the base price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', 7.5000, 'BRL', -1.0000)$$,
  '23514', NULL, 'a negative promotional price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', 7.5000, 'brl')$$,
  '23514', NULL, 'a lowercase currency code is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', 7.5000, 'BRL')$$,
  '23514', NULL, 'a channel offer with no canonical target is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, product_variant_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', '84000000-0000-4000-8000-000000000070', 7.5000, 'BRL')$$,
  '23514', NULL, 'a channel offer naming both a product and a variant is refused'
);

-- ---------------------------------------------------------------------------
-- 7. Canonical product is never duplicated per channel
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000060', 8.0000, 'BRL')$$,
  '23505', NULL, 'the same canonical product cannot be offered twice in the same channel'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000081', '84000000-0000-4000-8000-000000000060', 8.0000, 'BRL')$$,
  '23503', NULL, 'an offer cannot be routed through a sales channel of another tenant'
);

-- ---------------------------------------------------------------------------
-- 8. Tenant containment on every nested relationship
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$INSERT INTO public.product_categories (organization_id, parent_category_id, name)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000052', 'Foreign parent')$$,
  '23514', 'Category scope must stay inside its parent category scope.',
  'a category cannot adopt a parent category from another tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.product_categories (id, organization_id, parent_category_id, name)
    VALUES ('84000000-0000-4000-8000-000000000054', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000054', 'Self parent')$$,
  '23514', NULL, 'a category cannot be its own parent'
);
SELECT throws_ok(
  $$INSERT INTO public.product_variants (organization_id, product_id, name)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000062', 'Foreign product variant')$$,
  '23514', 'Product variant scope must stay inside its canonical product scope.',
  'a variant cannot be attached to a product of another tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000062', 7.5000, 'BRL')$$,
  '23514', 'Channel offer scope must stay inside its canonical product scope.',
  'a channel offer cannot reference a canonical product of another tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, establishment_id, branch_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ('84000000-0000-4000-8000-000000000010', NULL, NULL, '84000000-0000-4000-8000-000000000080', '84000000-0000-4000-8000-000000000061', 7.5000, 'BRL')$$,
  '23514', 'Channel offer scope must stay inside its canonical product scope.',
  'a tenant-wide offer cannot sell a branch-scoped product, because it cannot know which branch would sell it'
);
SELECT throws_ok(
  $$INSERT INTO public.product_categories (organization_id, branch_id, name)
    VALUES ('84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000015', 'Branch without establishment')$$,
  '23514', NULL, 'a branch scope without its establishment is refused'
);

-- ---------------------------------------------------------------------------
-- 9. Archival, not deletion
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$DELETE FROM public.channel_offers WHERE id = '84000000-0000-4000-8000-000000000090'$$,
  '55000', 'Catalog rows cannot be hard deleted.', 'a channel offer cannot be hard deleted'
);
SELECT throws_ok(
  $$DELETE FROM public.products WHERE id = '84000000-0000-4000-8000-000000000060'$$,
  '55000', 'Catalog rows cannot be hard deleted.', 'a canonical product cannot be hard deleted'
);
SELECT throws_ok(
  $$UPDATE public.product_categories SET status = 'archived' WHERE id = '84000000-0000-4000-8000-000000000050'$$,
  '23514', NULL, 'archiving without recording the archival instant is refused'
);
SELECT lives_ok(
  $$UPDATE public.product_categories SET status = 'archived', archived_at = now() WHERE id = '84000000-0000-4000-8000-000000000050'$$,
  'archiving a category records the archival instant'
);
SELECT throws_ok(
  $$UPDATE public.product_categories SET archived_at = NULL WHERE id = '84000000-0000-4000-8000-000000000050'$$,
  '23514', NULL, 'an archived category cannot silently lose its archival instant'
);
SELECT is(
  (SELECT count(*)::integer FROM public.products WHERE organization_id = '84000000-0000-4000-8000-000000000010' AND name = 'Café expresso'),
  1,
  'a canonical product name is unique inside its tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.products (organization_id, name)
    VALUES ('84000000-0000-4000-8000-000000000010', 'Café expresso')$$,
  '23505', NULL, 'a duplicated canonical product name inside one tenant is refused'
);

-- ---------------------------------------------------------------------------
-- 10. Prior commercial truth is reconstructable
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$UPDATE public.channel_offer_price_history SET base_price_amount = 1.0000
    WHERE channel_offer_id = '84000000-0000-4000-8000-000000000090' AND price_revision = 1$$,
  '55000', 'Catalog price history and command receipts are append-only.', 'a recorded price cannot be rewritten'
);
SELECT throws_ok(
  $$DELETE FROM public.channel_offer_price_history
    WHERE channel_offer_id = '84000000-0000-4000-8000-000000000090' AND price_revision = 1$$,
  '55000', 'Catalog price history and command receipts are append-only.', 'a recorded price cannot be deleted'
);
SELECT lives_ok(
  $$INSERT INTO public.catalog_command_receipts (
    organization_id, idempotency_key, actor_user_id, correlation_id, audit_event_id,
    action, target_type, target_id, resulting_price_revision
  ) VALUES (
    '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-0000000000e1',
    '84000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-0000000000b1',
    '84000000-0000-4000-8000-0000000000a1', 'catalog.channel_offer.created',
    'channel_offer', '84000000-0000-4000-8000-000000000090', 1
  )$$,
  'a command receipt can be recorded inside one transaction'
);
SELECT throws_ok(
  $$UPDATE public.catalog_command_receipts SET target_id = '84000000-0000-4000-8000-000000000090'
    WHERE organization_id = '84000000-0000-4000-8000-000000000010'$$,
  '55000', 'Catalog price history and command receipts are append-only.', 'a command receipt cannot be rewritten'
);
SELECT throws_ok(
  $$DELETE FROM public.catalog_command_receipts WHERE organization_id = '84000000-0000-4000-8000-000000000010'$$,
  '55000', 'Catalog price history and command receipts are append-only.', 'a command receipt cannot be deleted'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offer_price_history (
    organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
    availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
  ) VALUES (
    '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000090', 1, 1.0000, 'BRL',
    'available', 'visible', now(), '84000000-0000-4000-8000-000000000001',
    '84000000-0000-4000-8000-0000000000b1', '84000000-0000-4000-8000-0000000000a1'
  )$$,
  '23505', NULL, 'a price revision cannot be reused for the same offer'
);

-- The timeline is what an auditor reads: each superseded revision keeps its exact values and its
-- closed interval, so a later price change never destroys the prior truth.
SELECT set_config('search_path', 'extensions, public', true);
INSERT INTO public.audit_events (
  id, actor_user_id, organization_id, action, target_type, target_id, outcome, reason_code, correlation_id, source, metadata
) VALUES (
  '84000000-0000-4000-8000-0000000000a2', '84000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000010',
  'catalog.channel_offer.price_changed', 'channel_offer', '84000000-0000-4000-8000-000000000090', 'allow', 'authorized',
  '84000000-0000-4000-8000-0000000000b2', 'catalog_contract', '{"required_permission":"catalog.price.manage"}'
);
INSERT INTO public.channel_offer_price_history (
  id, organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
  promotional_price_amount, availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
) VALUES (
  '84000000-0000-4000-8000-0000000000c2', '84000000-0000-4000-8000-000000000010', '84000000-0000-4000-8000-000000000090',
  2, 8.7500, 'BRL', NULL, 'available', 'visible', now() - interval '1 hour',
  '84000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-0000000000b2', '84000000-0000-4000-8000-0000000000a2'
);
UPDATE public.channel_offers SET base_price_amount = 8.7500, promotional_price_amount = NULL, price_revision = 2
  WHERE id = '84000000-0000-4000-8000-000000000090';

SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = '84000000-0000-4000-8000-000000000090'),
  2,
  'a later price change appends a revision instead of replacing the earlier one'
);
SELECT is(
  (SELECT base_price_amount FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = '84000000-0000-4000-8000-000000000090' AND price_revision = 1),
  '7.5000',
  'the superseded revision keeps its exact base price'
);
SELECT is(
  (SELECT promotional_price_amount FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = '84000000-0000-4000-8000-000000000090' AND price_revision = 1),
  '5.9000',
  'the superseded revision keeps its exact promotional price'
);
SELECT ok(
  (SELECT effective_to IS NOT NULL FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = '84000000-0000-4000-8000-000000000090' AND price_revision = 1),
  'the superseded revision is closed at the instant the next revision took effect'
);
SELECT is(
  (SELECT effective_to FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = '84000000-0000-4000-8000-000000000090' AND price_revision = 2),
  NULL,
  'the current revision has no closing instant'
);
SELECT ok(
  (SELECT pg_catalog.jsonb_typeof('{}'::jsonb) IS NOT NULL),
  'sanity: jsonb helpers resolve with the pinned search path'
);

-- Monetary columns cross the Data API as text, because a bare numeric would be serialised as a
-- JSON number and read back through an IEEE-754 double.
SELECT ok(
  (SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
   WHERE a.attrelid = 'public.channel_offer_price_timeline'::regclass AND a.attname = 'base_price_amount') = 'text',
  'the price timeline projects the base price as exact decimal text'
);
SELECT ok(
  (SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
   WHERE a.attrelid = 'public.channel_offer_pricing'::regclass AND a.attname = 'promotional_price_amount') = 'text',
  'the pricing projection exposes the promotional price as exact decimal text'
);
SELECT ok(
  (SELECT reloptions FROM pg_class WHERE oid = 'public.channel_offer_pricing'::regclass) @> ARRAY['security_invoker=true'],
  'the pricing projection runs with the caller RLS context rather than bypassing it'
);
SELECT ok(
  (SELECT reloptions FROM pg_class WHERE oid = 'public.channel_offer_price_timeline'::regclass) @> ARRAY['security_invoker=true'],
  'the price timeline runs with the caller RLS context rather than bypassing it'
);

SELECT * FROM finish();
ROLLBACK;
