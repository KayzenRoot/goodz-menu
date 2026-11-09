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
-- 0. Fixture vocabulary
-- ---------------------------------------------------------------------------
-- Every catalog object, role, privilege, SQLSTATE and fixture row this file repeats is written once
-- in the fixture below and named everywhere else, so a privilege assertion and the object it asserts
-- about cannot drift apart. The table lives in this transaction only: the file rolls back, so
-- nothing it declares outlives the run.
CREATE TABLE public.pgtap_catalog_schema_fixture (
  contract_update_price text NOT NULL,
  contract_create_category text NOT NULL,
  catalog_price_history text NOT NULL,
  catalog_command_receipts text NOT NULL,
  catalog_product_categories text NOT NULL,
  catalog_product_variants text NOT NULL,
  catalog_sales_channels text NOT NULL,
  catalog_channel_offers text NOT NULL,
  catalog_products text NOT NULL,
  privilege_write text NOT NULL,
  append_only_message text NOT NULL,
  offer_a uuid NOT NULL,
  tenant_a uuid NOT NULL,
  channel_a uuid NOT NULL,
  product_a uuid NOT NULL,
  schema_manager uuid NOT NULL,
  tenant_b uuid NOT NULL,
  establishment_a1 uuid NOT NULL,
  branch_a1_1 uuid NOT NULL,
  category_a uuid NOT NULL,
  category_a_alt uuid NOT NULL,
  category_b uuid NOT NULL,
  product_b uuid NOT NULL,
  product_a_ice uuid NOT NULL,
  product_a_organic uuid NOT NULL,
  channel_b uuid NOT NULL,
  channel_pdv uuid NOT NULL,
  audit_event_offer uuid NOT NULL,
  correlation_offer uuid NOT NULL,
  check_violation text NOT NULL,
  object_not_in_prerequisite_state text NOT NULL,
  unique_violation text NOT NULL,
  currency_brl text NOT NULL,
  service_role_name text NOT NULL,
  authenticated_role text NOT NULL,
  anon_role text NOT NULL,
  privilege_execute text NOT NULL,
  privilege_select text NOT NULL,
  privilege_insert text NOT NULL,
  product_name_a text NOT NULL,
  base_price_column text NOT NULL,
  target_offer text NOT NULL,
  availability_available text NOT NULL,
  visibility_visible text NOT NULL,
  empty_metadata jsonb NOT NULL,
  catalog_schema text NOT NULL
);
INSERT INTO public.pgtap_catalog_schema_fixture VALUES (
'public.catalog_update_channel_offer_price(uuid,numeric,numeric,uuid,uuid)',
'public.catalog_create_category(uuid,uuid,uuid,uuid,text,text,integer,uuid,uuid)',
'public.channel_offer_price_history',
'public.catalog_command_receipts',
'public.product_categories',
'public.product_variants',
'public.sales_channels',
'public.channel_offers',
'public.products',
'INSERT, UPDATE, DELETE',
'Catalog price history and command receipts are append-only.',
'84000000-0000-4000-8000-000000000090',
'84000000-0000-4000-8000-000000000010',
'84000000-0000-4000-8000-000000000080',
'84000000-0000-4000-8000-000000000060',
'84000000-0000-4000-8000-000000000001',
'84000000-0000-4000-8000-000000000011',
'84000000-0000-4000-8000-000000000012',
'84000000-0000-4000-8000-000000000015',
'84000000-0000-4000-8000-000000000050',
'84000000-0000-4000-8000-000000000051',
'84000000-0000-4000-8000-000000000052',
'84000000-0000-4000-8000-000000000062',
'84000000-0000-4000-8000-000000000063',
'84000000-0000-4000-8000-000000000064',
'84000000-0000-4000-8000-000000000081',
'84000000-0000-4000-8000-000000000082',
'84000000-0000-4000-8000-0000000000a1',
'84000000-0000-4000-8000-0000000000b1',
'23514',
'55000',
'23505',
'BRL',
'service_role',
'authenticated',
'anon',
'EXECUTE',
'SELECT',
'INSERT',
'Café expresso',
'base_price_amount',
'channel_offer',
'available',
'visible',
'{}',
'public'
);

-- ---------------------------------------------------------------------------
-- 1. Least privilege: reads only, mutations through contracts only
-- ---------------------------------------------------------------------------

SELECT has_table((SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture), 'product_categories', 'product category table exists');
SELECT has_table((SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture), 'products', 'canonical product table exists');
SELECT has_table((SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture), 'product_variants', 'product variant table exists');
SELECT has_table((SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture), 'sales_channels', 'sales channel table exists');
SELECT has_table((SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture), 'channel_offers', 'channel offer table exists');
SELECT has_table((SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture), 'channel_offer_price_history', 'append-only price history exists');
SELECT has_table((SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture), 'catalog_command_receipts', 'command receipts exist');

SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN (
    (SELECT catalog_product_categories FROM public.pgtap_catalog_schema_fixture)::regclass, (SELECT catalog_products FROM public.pgtap_catalog_schema_fixture)::regclass, (SELECT catalog_product_variants FROM public.pgtap_catalog_schema_fixture)::regclass,
    (SELECT catalog_sales_channels FROM public.pgtap_catalog_schema_fixture)::regclass, (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture)::regclass,
    (SELECT catalog_price_history FROM public.pgtap_catalog_schema_fixture)::regclass, (SELECT catalog_command_receipts FROM public.pgtap_catalog_schema_fixture)::regclass
  )),
  'every catalog table has row level security enabled'
);

-- A mutation denied by the grant, not merely by a policy, cannot be retried into success by any
-- authenticated session. This is asserted for the whole catalog surface.
SELECT ok(
  NOT has_table_privilege((SELECT anon_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_product_categories FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT anon_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_products FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT anon_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_products FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_write FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT anon_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT anon_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_write FROM public.pgtap_catalog_schema_fixture)),
  'anon holds no catalog privilege of any kind'
);
SELECT ok(
  has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_product_categories FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_products FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_product_variants FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_sales_channels FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_price_history FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture))
    AND has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_command_receipts FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_select FROM public.pgtap_catalog_schema_fixture)),
  'authenticated holds catalog SELECT only'
);
SELECT ok(
  NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_product_categories FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_insert FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_products FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_insert FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_product_variants FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_insert FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_sales_channels FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_insert FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_insert FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture), 'UPDATE')
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture), 'DELETE')
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_price_history FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_insert FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_price_history FROM public.pgtap_catalog_schema_fixture), 'UPDATE, DELETE')
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_command_receipts FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_insert FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_command_receipts FROM public.pgtap_catalog_schema_fixture), 'UPDATE, DELETE'),
  'authenticated holds no catalog INSERT, UPDATE or DELETE privilege'
);
SELECT ok(
  NOT has_table_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_product_categories FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_write FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_products FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_write FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_product_variants FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_write FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_sales_channels FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_write FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_table_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_write FROM public.pgtap_catalog_schema_fixture)),
  'service_role holds no direct catalog mutation privilege'
);

-- Every catalog contract runs with the caller's authority resolved from the verified claims, so it
-- must be SECURITY DEFINER over an empty search path and callable by authenticated only.
SELECT ok(
  (
    SELECT NOT bool_or(NOT prosecdef OR NOT (proconfig @> ARRAY['search_path=""']))
    FROM pg_proc
    WHERE oid IN (
    (SELECT contract_create_category FROM public.pgtap_catalog_schema_fixture)::regprocedure,
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
    (SELECT contract_update_price FROM public.pgtap_catalog_schema_fixture)::regprocedure,
    'public.catalog_update_channel_offer_availability(uuid,text,uuid,uuid)'::regprocedure,
    'public.catalog_update_channel_offer_visibility(uuid,text,uuid,uuid)'::regprocedure
    )
  ),
  'every catalog contract is SECURITY DEFINER with an empty search path'
);
SELECT ok(
  NOT has_function_privilege((SELECT anon_role FROM public.pgtap_catalog_schema_fixture), (SELECT contract_create_category FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_execute FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_function_privilege((SELECT anon_role FROM public.pgtap_catalog_schema_fixture), (SELECT contract_update_price FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_execute FROM public.pgtap_catalog_schema_fixture)),
  'anon cannot invoke any catalog contract'
);
SELECT ok(
  has_function_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT contract_update_price FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_execute FROM public.pgtap_catalog_schema_fixture))
    AND has_function_privilege((SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), 'public.catalog_admitted_scopes(text)', (SELECT privilege_execute FROM public.pgtap_catalog_schema_fixture)),
  'authenticated can invoke the catalog contracts and the admitted scope read contract'
);
SELECT ok(
  NOT has_function_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), (SELECT contract_create_category FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_execute FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_function_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), (SELECT contract_update_price FROM public.pgtap_catalog_schema_fixture), (SELECT privilege_execute FROM public.pgtap_catalog_schema_fixture))
    AND NOT has_function_privilege((SELECT service_role_name FROM public.pgtap_catalog_schema_fixture), 'public.catalog_admitted_scopes(text)', (SELECT privilege_execute FROM public.pgtap_catalog_schema_fixture)),
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
    WHERE table_schema = (SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture) AND table_name = 'products'
      AND column_name ~* '(channel|provider|adapter|credential|secret|endpoint|token)'
  ),
  NULL,
  'the canonical product carries no channel, provider or credential column'
);
SELECT is(
  (
    SELECT array_agg(column_name ORDER BY column_name)
    FROM information_schema.columns
    WHERE table_schema = (SELECT catalog_schema FROM public.pgtap_catalog_schema_fixture) AND table_name = 'sales_channels'
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
    WHERE attrelid = (SELECT catalog_channel_offers FROM public.pgtap_catalog_schema_fixture)::regclass AND attname = (SELECT base_price_column FROM public.pgtap_catalog_schema_fixture)
  ),
  'numeric(19,4)',
  'the base price is persisted as exact numeric(19,4)'
);
SELECT is(
  (
    SELECT format_type(atttypid, atttypmod)
    FROM pg_attribute
    WHERE attrelid = (SELECT catalog_price_history FROM public.pgtap_catalog_schema_fixture)::regclass AND attname = (SELECT base_price_column FROM public.pgtap_catalog_schema_fixture)
  ),
  'numeric(19,4)',
  'price history persists the base price as exact numeric(19,4)'
);

-- ---------------------------------------------------------------------------
-- 4. Fixture
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ((SELECT schema_manager FROM public.pgtap_catalog_schema_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), 'gmz007-schema@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_schema_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_schema_fixture), now(), now()),
  ('84000000-0000-4000-8000-000000000002', (SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_schema_fixture), 'gmz007-schema-foreign@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_schema_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_schema_fixture), now(), now());

INSERT INTO public.organizations (id, display_name) VALUES
  ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), 'GMZ-IMPL-007 schema organization'),
  ((SELECT tenant_b FROM public.pgtap_catalog_schema_fixture), 'GMZ-IMPL-007 schema foreign organization');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ((SELECT establishment_a1 FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), 'Schema establishment A1');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ((SELECT branch_a1_1 FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_schema_fixture), 'Schema branch A1-1');

INSERT INTO public.product_categories (id, organization_id, name, display_order) VALUES
  ((SELECT category_a FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), 'Bebidas', 10),
  ((SELECT category_a_alt FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), 'Cafés', 20),
  ((SELECT category_b FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_b FROM public.pgtap_catalog_schema_fixture), 'Foreign beverages', 10);
INSERT INTO public.product_categories (id, organization_id, establishment_id, branch_id, name, display_order) VALUES
  ('84000000-0000-4000-8000-000000000053', (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_schema_fixture), (SELECT branch_a1_1 FROM public.pgtap_catalog_schema_fixture), 'Bebidas da filial', 5);

INSERT INTO public.products (id, organization_id, category_id, name) VALUES
  ((SELECT product_a FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT category_a_alt FROM public.pgtap_catalog_schema_fixture), (SELECT product_name_a FROM public.pgtap_catalog_schema_fixture)),
  ((SELECT product_b FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_b FROM public.pgtap_catalog_schema_fixture), (SELECT category_b FROM public.pgtap_catalog_schema_fixture), 'Foreign coffee'),
  ((SELECT product_a_ice FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT category_a_alt FROM public.pgtap_catalog_schema_fixture), 'Café gelado'),
  ((SELECT product_a_organic FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT category_a_alt FROM public.pgtap_catalog_schema_fixture), 'Café orgânico');
INSERT INTO public.products (id, organization_id, establishment_id, branch_id, name) VALUES
  ('84000000-0000-4000-8000-000000000061', (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_schema_fixture), (SELECT branch_a1_1 FROM public.pgtap_catalog_schema_fixture), 'Café da filial');

INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ('84000000-0000-4000-8000-000000000070', (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 'Copo 90 ml');

INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name) VALUES
  ((SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), 'goodz-online', 'Goodz Online'),
  ((SELECT channel_b FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_b FROM public.pgtap_catalog_schema_fixture), 'goodz-online', 'Foreign channel'),
  ((SELECT channel_pdv FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), 'goodz-pdv', 'Goodz PDV');

INSERT INTO public.channel_offers (id, organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency) VALUES
  ((SELECT offer_a FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture)),
  ('84000000-0000-4000-8000-000000000092', (SELECT tenant_b FROM public.pgtap_catalog_schema_fixture), (SELECT channel_b FROM public.pgtap_catalog_schema_fixture), (SELECT product_b FROM public.pgtap_catalog_schema_fixture), 9.9000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture));

INSERT INTO public.audit_events (
  id, actor_user_id, organization_id, action, target_type, target_id, outcome, reason_code,
  correlation_id, source, metadata
)
VALUES (
  (SELECT audit_event_offer FROM public.pgtap_catalog_schema_fixture), (SELECT schema_manager FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture),
  'catalog.channel_offer.created', (SELECT target_offer FROM public.pgtap_catalog_schema_fixture), (SELECT offer_a FROM public.pgtap_catalog_schema_fixture), 'allow', 'authorized',
  (SELECT correlation_offer FROM public.pgtap_catalog_schema_fixture), 'catalog_contract', '{"required_permission":"catalog.price.manage"}'
);
INSERT INTO public.channel_offer_price_history (
  id, organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
  promotional_price_amount, availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
)
VALUES (
  '84000000-0000-4000-8000-0000000000c1', (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT offer_a FROM public.pgtap_catalog_schema_fixture),
  1, 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture), 5.9000, (SELECT availability_available FROM public.pgtap_catalog_schema_fixture), (SELECT visibility_visible FROM public.pgtap_catalog_schema_fixture), now() - interval '2 days',
  (SELECT schema_manager FROM public.pgtap_catalog_schema_fixture), (SELECT correlation_offer FROM public.pgtap_catalog_schema_fixture), (SELECT audit_event_offer FROM public.pgtap_catalog_schema_fixture)
);

-- ---------------------------------------------------------------------------
-- 5. Exact decimal representation survives persistence
-- ---------------------------------------------------------------------------

SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture)),
  '7.5000',
  'a four-decimal price round-trips as its exact decimal text, not as a binary float'
);
SELECT lives_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_pdv FROM public.pgtap_catalog_schema_fixture), (SELECT product_a_ice FROM public.pgtap_catalog_schema_fixture), 0.0001, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  'the smallest representable price is admitted'
);
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE product_id = (SELECT product_a_ice FROM public.pgtap_catalog_schema_fixture)),
  '0.0001',
  'the smallest representable price retains its fourth decimal'
);
SELECT lives_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_pdv FROM public.pgtap_catalog_schema_fixture), (SELECT product_a_organic FROM public.pgtap_catalog_schema_fixture), 12345678.9123, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  'a price with four significant decimals is admitted exactly'
);
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE product_id = (SELECT product_a_organic FROM public.pgtap_catalog_schema_fixture)),
  '12345678.9123',
  'the admitted price is stored with every decimal digit intact'
);

-- ---------------------------------------------------------------------------
-- 6. Commercially impossible prices are refused
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), -0.0001, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a negative price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture), 9.9000)$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a promotional price above the base price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture), 7.5000)$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a promotional price equal to the base price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture), -1.0000)$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a negative promotional price is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 7.5000, 'brl')$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a lowercase currency code is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a channel offer with no canonical target is refused'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, product_variant_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), '84000000-0000-4000-8000-000000000070', 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a channel offer naming both a product and a variant is refused'
);

-- ---------------------------------------------------------------------------
-- 7. Canonical product is never duplicated per channel
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 8.0000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  (SELECT unique_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'the same canonical product cannot be offered twice in the same channel'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_b FROM public.pgtap_catalog_schema_fixture), (SELECT product_a FROM public.pgtap_catalog_schema_fixture), 8.0000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  '23503', NULL, 'an offer cannot be routed through a sales channel of another tenant'
);

-- ---------------------------------------------------------------------------
-- 8. Tenant containment on every nested relationship
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$INSERT INTO public.product_categories (organization_id, parent_category_id, name)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT category_b FROM public.pgtap_catalog_schema_fixture), 'Foreign parent')$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), 'Category scope must stay inside its parent category scope.',
  'a category cannot adopt a parent category from another tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.product_categories (id, organization_id, parent_category_id, name)
    VALUES ('84000000-0000-4000-8000-000000000054', (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), '84000000-0000-4000-8000-000000000054', 'Self parent')$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a category cannot be its own parent'
);
SELECT throws_ok(
  $$INSERT INTO public.product_variants (organization_id, product_id, name)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_b FROM public.pgtap_catalog_schema_fixture), 'Foreign product variant')$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), 'Product variant scope must stay inside its canonical product scope.',
  'a variant cannot be attached to a product of another tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_b FROM public.pgtap_catalog_schema_fixture), 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), 'Channel offer scope must stay inside its canonical product scope.',
  'a channel offer cannot reference a canonical product of another tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offers (organization_id, establishment_id, branch_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), NULL, NULL, (SELECT channel_a FROM public.pgtap_catalog_schema_fixture), '84000000-0000-4000-8000-000000000061', 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture))$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), 'Channel offer scope must stay inside its canonical product scope.',
  'a tenant-wide offer cannot sell a branch-scoped product, because it cannot know which branch would sell it'
);
SELECT throws_ok(
  $$INSERT INTO public.product_categories (organization_id, branch_id, name)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT branch_a1_1 FROM public.pgtap_catalog_schema_fixture), 'Branch without establishment')$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a branch scope without its establishment is refused'
);

-- ---------------------------------------------------------------------------
-- 9. Archival, not deletion
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$DELETE FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture)$$,
  (SELECT object_not_in_prerequisite_state FROM public.pgtap_catalog_schema_fixture), 'Catalog rows cannot be hard deleted.', 'a channel offer cannot be hard deleted'
);
SELECT throws_ok(
  $$DELETE FROM public.products WHERE id = (SELECT product_a FROM public.pgtap_catalog_schema_fixture)$$,
  (SELECT object_not_in_prerequisite_state FROM public.pgtap_catalog_schema_fixture), 'Catalog rows cannot be hard deleted.', 'a canonical product cannot be hard deleted'
);
SELECT throws_ok(
  $$UPDATE public.product_categories SET status = 'archived' WHERE id = (SELECT category_a FROM public.pgtap_catalog_schema_fixture)$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'archiving without recording the archival instant is refused'
);
SELECT lives_ok(
  $$UPDATE public.product_categories SET status = 'archived', archived_at = now() WHERE id = (SELECT category_a FROM public.pgtap_catalog_schema_fixture)$$,
  'archiving a category records the archival instant'
);
SELECT throws_ok(
  $$UPDATE public.product_categories SET archived_at = NULL WHERE id = (SELECT category_a FROM public.pgtap_catalog_schema_fixture)$$,
  (SELECT check_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'an archived category cannot silently lose its archival instant'
);
SELECT is(
  (SELECT count(*)::integer FROM public.products WHERE organization_id = (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture) AND name = (SELECT product_name_a FROM public.pgtap_catalog_schema_fixture)),
  1,
  'a canonical product name is unique inside its tenant'
);
SELECT throws_ok(
  $$INSERT INTO public.products (organization_id, name)
    VALUES ((SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT product_name_a FROM public.pgtap_catalog_schema_fixture))$$,
  (SELECT unique_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a duplicated canonical product name inside one tenant is refused'
);

-- ---------------------------------------------------------------------------
-- 10. Prior commercial truth is reconstructable
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$UPDATE public.channel_offer_price_history SET base_price_amount = 1.0000
    WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture) AND price_revision = 1$$,
  (SELECT object_not_in_prerequisite_state FROM public.pgtap_catalog_schema_fixture), (SELECT append_only_message FROM public.pgtap_catalog_schema_fixture), 'a recorded price cannot be rewritten'
);
SELECT throws_ok(
  $$DELETE FROM public.channel_offer_price_history
    WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture) AND price_revision = 1$$,
  (SELECT object_not_in_prerequisite_state FROM public.pgtap_catalog_schema_fixture), (SELECT append_only_message FROM public.pgtap_catalog_schema_fixture), 'a recorded price cannot be deleted'
);
SELECT lives_ok(
  $$INSERT INTO public.catalog_command_receipts (
    organization_id, idempotency_key, actor_user_id, correlation_id, audit_event_id,
    action, target_type, target_id, resulting_price_revision
  ) VALUES (
    (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), '84000000-0000-4000-8000-0000000000e1',
    (SELECT schema_manager FROM public.pgtap_catalog_schema_fixture), (SELECT correlation_offer FROM public.pgtap_catalog_schema_fixture),
    (SELECT audit_event_offer FROM public.pgtap_catalog_schema_fixture), 'catalog.channel_offer.created',
    (SELECT target_offer FROM public.pgtap_catalog_schema_fixture), (SELECT offer_a FROM public.pgtap_catalog_schema_fixture), 1
  )$$,
  'a command receipt can be recorded inside one transaction'
);
SELECT throws_ok(
  $$UPDATE public.catalog_command_receipts SET target_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture)
    WHERE organization_id = (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture)$$,
  (SELECT object_not_in_prerequisite_state FROM public.pgtap_catalog_schema_fixture), (SELECT append_only_message FROM public.pgtap_catalog_schema_fixture), 'a command receipt cannot be rewritten'
);
SELECT throws_ok(
  $$DELETE FROM public.catalog_command_receipts WHERE organization_id = (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture)$$,
  (SELECT object_not_in_prerequisite_state FROM public.pgtap_catalog_schema_fixture), (SELECT append_only_message FROM public.pgtap_catalog_schema_fixture), 'a command receipt cannot be deleted'
);
SELECT throws_ok(
  $$INSERT INTO public.channel_offer_price_history (
    organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
    availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
  ) VALUES (
    (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT offer_a FROM public.pgtap_catalog_schema_fixture), 1, 1.0000, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture),
    (SELECT availability_available FROM public.pgtap_catalog_schema_fixture), (SELECT visibility_visible FROM public.pgtap_catalog_schema_fixture), now(), (SELECT schema_manager FROM public.pgtap_catalog_schema_fixture),
    (SELECT correlation_offer FROM public.pgtap_catalog_schema_fixture), (SELECT audit_event_offer FROM public.pgtap_catalog_schema_fixture)
  )$$,
  (SELECT unique_violation FROM public.pgtap_catalog_schema_fixture), NULL, 'a price revision cannot be reused for the same offer'
);

-- The timeline is what an auditor reads: each superseded revision keeps its exact values and its
-- closed interval, so a later price change never destroys the prior truth.
SELECT set_config('search_path', 'extensions, public', true);
INSERT INTO public.audit_events (
  id, actor_user_id, organization_id, action, target_type, target_id, outcome, reason_code, correlation_id, source, metadata
) VALUES (
  '84000000-0000-4000-8000-0000000000a2', (SELECT schema_manager FROM public.pgtap_catalog_schema_fixture), (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture),
  'catalog.channel_offer.price_changed', (SELECT target_offer FROM public.pgtap_catalog_schema_fixture), (SELECT offer_a FROM public.pgtap_catalog_schema_fixture), 'allow', 'authorized',
  '84000000-0000-4000-8000-0000000000b2', 'catalog_contract', '{"required_permission":"catalog.price.manage"}'
);
INSERT INTO public.channel_offer_price_history (
  id, organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
  promotional_price_amount, availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
) VALUES (
  '84000000-0000-4000-8000-0000000000c2', (SELECT tenant_a FROM public.pgtap_catalog_schema_fixture), (SELECT offer_a FROM public.pgtap_catalog_schema_fixture),
  2, 8.7500, (SELECT currency_brl FROM public.pgtap_catalog_schema_fixture), NULL, (SELECT availability_available FROM public.pgtap_catalog_schema_fixture), (SELECT visibility_visible FROM public.pgtap_catalog_schema_fixture), now() - interval '1 hour',
  (SELECT schema_manager FROM public.pgtap_catalog_schema_fixture), '84000000-0000-4000-8000-0000000000b2', '84000000-0000-4000-8000-0000000000a2'
);
UPDATE public.channel_offers SET base_price_amount = 8.7500, promotional_price_amount = NULL, price_revision = 2
  WHERE id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture);

SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture)),
  2,
  'a later price change appends a revision instead of replacing the earlier one'
);
SELECT is(
  (SELECT base_price_amount FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture) AND price_revision = 1),
  '7.5000',
  'the superseded revision keeps its exact base price'
);
SELECT is(
  (SELECT promotional_price_amount FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture) AND price_revision = 1),
  '5.9000',
  'the superseded revision keeps its exact promotional price'
);
SELECT ok(
  (SELECT effective_to IS NOT NULL FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture) AND price_revision = 1),
  'the superseded revision is closed at the instant the next revision took effect'
);
SELECT is(
  (SELECT effective_to FROM public.channel_offer_price_timeline
    WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_schema_fixture) AND price_revision = 2),
  NULL,
  'the current revision has no closing instant'
);
SELECT ok(
  (SELECT pg_catalog.jsonb_typeof((SELECT empty_metadata FROM public.pgtap_catalog_schema_fixture)::jsonb) IS NOT NULL),
  'sanity: jsonb helpers resolve with the pinned search path'
);

-- Monetary columns cross the Data API as text, because a bare numeric would be serialised as a
-- JSON number and read back through an IEEE-754 double.
SELECT ok(
  (SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
   WHERE a.attrelid = 'public.channel_offer_price_timeline'::regclass AND a.attname = (SELECT base_price_column FROM public.pgtap_catalog_schema_fixture)) = 'text',
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
