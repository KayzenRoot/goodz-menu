-- GMZ-IMPL-007 — Catalog application contracts: validation, price truth, durability.
--
-- This file proves the behaviour the Work Order requires of the privileged commercial contracts:
-- a second factor and a fresh password are required before a price or availability changes; an
-- impossible commercial state is refused before anything is written; every admitted change appends
-- an exact revision and an exact audit event instead of replacing the previous truth; a repeated
-- command is recognised as a replay; and a failure to persist the mandatory audit event aborts the
-- whole mutation rather than leaving an unaudited price behind.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT no_plan();

-- ---------------------------------------------------------------------------
-- 0. Fixture vocabulary
-- ---------------------------------------------------------------------------
-- Every identity, capability, SQLSTATE and refusal message this file repeats is written once in
-- the fixture below and named everywhere else, so a seed row and the assertion that reads it cannot
-- drift apart. The table lives in this transaction only: the file rolls back, so nothing it declares
-- outlives the run.
CREATE TABLE public.pgtap_catalog_contracts_fixture (
  contract_manager uuid NOT NULL,
  contract_peer uuid NOT NULL,
  offer_a uuid NOT NULL,
  tenant_a uuid NOT NULL,
  role_manager uuid NOT NULL,
  role_peer uuid NOT NULL,
  product_a uuid NOT NULL,
  product_b uuid NOT NULL,
  variant_a uuid NOT NULL,
  channel_a uuid NOT NULL,
  correlation_price_failure uuid NOT NULL,
  correlation_availability_failure uuid NOT NULL,
  correlation_visibility_failure uuid NOT NULL,
  key_second_price_change uuid NOT NULL,
  key_price_failure uuid NOT NULL,
  audit_source text NOT NULL,
  catalog_price_manage text NOT NULL,
  injected_failure text NOT NULL,
  insufficient_privilege text NOT NULL,
  invalid_parameter text NOT NULL,
  raise_exception text NOT NULL,
  availability_unavailable text NOT NULL,
  visibility_hidden text NOT NULL,
  empty_metadata jsonb NOT NULL,
  authenticated_role text NOT NULL
);
INSERT INTO public.pgtap_catalog_contracts_fixture VALUES (
'86000000-0000-4000-8000-000000000001',
'86000000-0000-4000-8000-000000000002',
'86000000-0000-4000-8000-000000000090',
'86000000-0000-4000-8000-000000000010',
'86000000-0000-4000-8000-000000000020',
'86000000-0000-4000-8000-000000000021',
'86000000-0000-4000-8000-000000000060',
'86000000-0000-4000-8000-000000000061',
'86000000-0000-4000-8000-000000000070',
'86000000-0000-4000-8000-000000000080',
'86000000-0000-4000-8000-000000000301',
'86000000-0000-4000-8000-000000000302',
'86000000-0000-4000-8000-000000000303',
'86000000-0000-4000-8000-000000000304',
'86000000-0000-4000-8000-000000000401',
'catalog_contract',
'catalog.price.manage',
'Injected audit storage failure.',
'42501',
'22023',
'P0001',
'unavailable',
'hidden',
'{}',
'authenticated'
);
GRANT SELECT ON public.pgtap_catalog_contracts_fixture TO authenticated;

-- The session claims are JSON, so they cannot be assembled by substituting these constants into a
-- string literal the way every other use site is. The sessions this file needs differ only in which
-- authentication factor the grant carries and how long ago it was presented, so they are described
-- by exactly those two facts here instead of being restated at every step.
CREATE FUNCTION public.pgtap_catalog_assume_session(
  p_subject uuid,
  p_two_factor boolean DEFAULT false,
  p_password_age_seconds integer DEFAULT NULL,
  p_totp_age_seconds integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $assume$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_strip_nulls(jsonb_build_object(
      'sub', p_subject::text,
      'role', (SELECT authenticated_role FROM public.pgtap_catalog_contracts_fixture),
      'aal', CASE WHEN p_two_factor THEN 'aal2' END,
      'amr', CASE WHEN p_password_age_seconds IS NOT NULL OR p_totp_age_seconds IS NOT NULL THEN (
        SELECT jsonb_agg(jsonb_build_object('method', factor.method, 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint - factor.age))
        FROM (VALUES ('password', p_password_age_seconds), ('totp', p_totp_age_seconds)) AS factor(method, age)
        WHERE factor.age IS NOT NULL
      ) END
    ))::text,
    true
  );
END;
$assume$;
GRANT EXECUTE ON FUNCTION public.pgtap_catalog_assume_session(uuid, boolean, integer, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. Fixture
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_contracts_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_contracts_fixture), 'gmz007-contract-manager@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_contracts_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_contracts_fixture), now(), now()),
  ((SELECT contract_peer FROM public.pgtap_catalog_contracts_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_contracts_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_contracts_fixture), 'gmz007-contract-peer@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_contracts_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_contracts_fixture), now(), now());

INSERT INTO public.organizations (id, display_name) VALUES
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), 'GMZ-IMPL-007 contract organization');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ((SELECT role_manager FROM public.pgtap_catalog_contracts_fixture), (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), 'gmz007-contract-manager', 'Contract manager'),
  ((SELECT role_peer FROM public.pgtap_catalog_contracts_fixture), (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), 'gmz007-contract-peer', 'Contract peer');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_manager FROM public.pgtap_catalog_contracts_fixture), 'catalog.read'),
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_manager FROM public.pgtap_catalog_contracts_fixture), 'catalog.write'),
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_manager FROM public.pgtap_catalog_contracts_fixture), (SELECT catalog_price_manage FROM public.pgtap_catalog_contracts_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_manager FROM public.pgtap_catalog_contracts_fixture), 'catalog.availability.manage'),
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_peer FROM public.pgtap_catalog_contracts_fixture), 'catalog.read'),
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_peer FROM public.pgtap_catalog_contracts_fixture), 'catalog.write'),
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_peer FROM public.pgtap_catalog_contracts_fixture), (SELECT catalog_price_manage FROM public.pgtap_catalog_contracts_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT role_peer FROM public.pgtap_catalog_contracts_fixture), 'catalog.availability.manage');
INSERT INTO public.organization_memberships (id, organization_id, user_id, status) VALUES
  ('86000000-0000-4000-8000-000000000030', (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), 'active'),
  ('86000000-0000-4000-8000-000000000031', (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT contract_peer FROM public.pgtap_catalog_contracts_fixture), 'active');
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
  ('86000000-0000-4000-8000-000000000040', (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), '86000000-0000-4000-8000-000000000030', (SELECT role_manager FROM public.pgtap_catalog_contracts_fixture), 'organization', NULL, NULL),
  ('86000000-0000-4000-8000-000000000041', (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), '86000000-0000-4000-8000-000000000031', (SELECT role_peer FROM public.pgtap_catalog_contracts_fixture), 'organization', NULL, NULL);

INSERT INTO public.product_categories (id, organization_id, name) VALUES
  ('86000000-0000-4000-8000-000000000050', (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), 'Bebidas');
INSERT INTO public.products (id, organization_id, category_id, name) VALUES
  ((SELECT product_a FROM public.pgtap_catalog_contracts_fixture), (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), '86000000-0000-4000-8000-000000000050', 'Café expresso'),
  ((SELECT product_b FROM public.pgtap_catalog_contracts_fixture), (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), '86000000-0000-4000-8000-000000000050', 'Café coado');
INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ('86000000-0000-4000-8000-000000000070', (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT product_a FROM public.pgtap_catalog_contracts_fixture), 'Copo 90 ml');
INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name, description) VALUES
  ((SELECT channel_a FROM public.pgtap_catalog_contracts_fixture), (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), 'goodz-online', 'Goodz Online', 'Descrição inicial');

-- An offer with a known starting commercial state. It is inserted directly, so it deliberately has
-- no revision 1 history row; the first admitted contract change therefore becomes revision 2, and
-- every revision this file asserts on was produced by a contract.
INSERT INTO public.channel_offers (
  id, organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount
)
VALUES (
  (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture), (SELECT channel_a FROM public.pgtap_catalog_contracts_fixture),
  (SELECT product_a FROM public.pgtap_catalog_contracts_fixture), 7.5000, 'BRL', 5.9000
);

-- ---------------------------------------------------------------------------
-- 2. The factor and the freshness are re-derived from verified claims
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture));

SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 8.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000101', p_idempotency_key => NULL)$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_contracts_fixture), 'A second authentication factor is required for this catalog operation.',
  'a single-factor session cannot change a price'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '7.5000',
  'the refused price change left the persisted price untouched'
);

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 4000);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 8.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000102', p_idempotency_key => NULL)$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_contracts_fixture), 'A recent two-step verification is required for this catalog operation.',
  'a long elapsed second factor is refused even though the session is aal2'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, NULL, 0);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 8.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000103', p_idempotency_key => NULL)$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_contracts_fixture), 'A recent password reauthentication is required for this catalog operation.',
  'a second factor alone is not enough; the password grant must also be inside the freshness window'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);

-- ---------------------------------------------------------------------------
-- 3. Impossible commercial states are refused before anything is written
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => -1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000111', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'Invalid catalog input for base_price_amount.',
  'a negative price is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 8.0000, p_promotional_price_amount => 9.0000,
    p_correlation_id => '86000000-0000-4000-8000-000000000112', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'Invalid catalog input for promotional_price_amount.',
  'a promotional price above the base price is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 8.0000, p_promotional_price_amount => 8.0000,
    p_correlation_id => '86000000-0000-4000-8000-000000000113', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'Invalid catalog input for promotional_price_amount.',
  'a promotional price equal to the base price is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 7.5000, p_promotional_price_amount => 5.9000,
    p_correlation_id => '86000000-0000-4000-8000-000000000114', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'The requested price change does not alter the current commercial state.',
  'a command that changes nothing is refused instead of writing a meaningless revision'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), p_availability => 'maybe',
    p_correlation_id => '86000000-0000-4000-8000-000000000115', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'Invalid catalog input for availability.',
  'an availability outside the admitted vocabulary is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_visibility(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), p_visibility => 'hidden-ish',
    p_correlation_id => '86000000-0000-4000-8000-000000000116', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'Invalid catalog input for visibility.',
  'a visibility outside the admitted vocabulary is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), p_availability => 'available',
    p_correlation_id => '86000000-0000-4000-8000-000000000117', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'The requested availability change does not alter the current commercial state.',
  'an availability command that changes nothing is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_channel_offer(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture),
    p_establishment_id => NULL, p_branch_id => NULL,
    p_sales_channel_id => (SELECT channel_a FROM public.pgtap_catalog_contracts_fixture),
    p_product_id => (SELECT product_a FROM public.pgtap_catalog_contracts_fixture), p_product_variant_id => '86000000-0000-4000-8000-000000000070',
    p_title => NULL, p_description => NULL,
    p_base_price_amount => 7.5000, p_base_price_currency => 'BRL', p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000118', p_idempotency_key => NULL)$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture), 'Invalid catalog input for target.',
  'an offer naming both a product and a variant is refused before any write'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  1,
  'no refused command created or destroyed an offer'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '7.5000',
  'no refused command changed the persisted price'
);
SELECT is(
  (SELECT promotional_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '5.9000',
  'no refused command changed the persisted promotional price'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  0,
  'the fixture offer starts with no history row, so the first contract change is revision 2'
);

-- ---------------------------------------------------------------------------
-- 4. An admitted price change appends exact truth and an audit event
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);

SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 8.2500, p_promotional_price_amount => 6.7500,
    p_correlation_id => '86000000-0000-4000-8000-000000000201', p_idempotency_key => (SELECT correlation_price_failure FROM public.pgtap_catalog_contracts_fixture))$$,
  'a fresh two-factor session admits a price change'
);
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '8.2500',
  'the new price is persisted as its exact decimal text'
);
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  2,
  'the offer advanced to its next price revision'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), p_availability => (SELECT availability_unavailable FROM public.pgtap_catalog_contracts_fixture),
    p_correlation_id => '86000000-0000-4000-8000-000000000202', p_idempotency_key => (SELECT correlation_availability_failure FROM public.pgtap_catalog_contracts_fixture))$$,
  'a fresh two-factor session admits an availability change'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_visibility(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), p_visibility => (SELECT visibility_hidden FROM public.pgtap_catalog_contracts_fixture),
    p_correlation_id => '86000000-0000-4000-8000-000000000203', p_idempotency_key => (SELECT correlation_visibility_failure FROM public.pgtap_catalog_contracts_fixture))$$,
  'a fresh two-factor session admits a visibility change'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 9.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000204', p_idempotency_key => (SELECT key_second_price_change FROM public.pgtap_catalog_contracts_fixture))$$,
  'a second price change is admitted'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_variant(
    p_variant_id => (SELECT variant_a FROM public.pgtap_catalog_contracts_fixture),
    p_name => 'Copo 120 ml', p_archived => false,
    p_correlation_id => '86000000-0000-4000-8000-000000000205',
    p_idempotency_key => '86000000-0000-4000-8000-000000000405')$$,
  'an authorized session updates a variant through its tenant-scoped contract'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_variant(
    p_variant_id => (SELECT variant_a FROM public.pgtap_catalog_contracts_fixture),
    p_name => 'Copo 120 ml', p_archived => true,
    p_correlation_id => '86000000-0000-4000-8000-000000000206',
    p_idempotency_key => '86000000-0000-4000-8000-000000000406')$$,
  'an authorized session archives a variant through its tenant-scoped contract'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_variant(
    p_variant_id => (SELECT variant_a FROM public.pgtap_catalog_contracts_fixture),
    p_name => 'Copo 120 ml', p_archived => false,
    p_correlation_id => '86000000-0000-4000-8000-000000000207',
    p_idempotency_key => '86000000-0000-4000-8000-000000000407')$$,
  'an authorized session reactivates a variant through its tenant-scoped contract'
);
RESET ROLE;

SELECT is(
  (SELECT name FROM public.product_variants WHERE id = (SELECT variant_a FROM public.pgtap_catalog_contracts_fixture)),
  'Copo 120 ml',
  'the admitted variant edit persists its canonical name'
);
SELECT is(
  (SELECT status FROM public.product_variants WHERE id = (SELECT variant_a FROM public.pgtap_catalog_contracts_fixture)),
  'active',
  'the admitted reactivation restores the variant to active'
);
SELECT is(
  (SELECT string_agg(action, ',' ORDER BY correlation_id)
   FROM public.audit_events
   WHERE target_id = (SELECT variant_a FROM public.pgtap_catalog_contracts_fixture)
     AND correlation_id IN (
       '86000000-0000-4000-8000-000000000205',
       '86000000-0000-4000-8000-000000000206',
       '86000000-0000-4000-8000-000000000207'
     )),
  'catalog.variant.updated,catalog.variant.archived,catalog.variant.reactivated',
  'variant edit, archive and reactivation write their matching durable audit actions'
);

-- Every admitted commercial change is reconstructable, and the revisions chain without a gap.
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  4,
  'each admitted commercial change appended exactly one history revision'
);
SELECT is(
  (SELECT string_agg(price_revision::text, ',' ORDER BY price_revision)
   FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '2,3,4,5',
  'the revisions are consecutive and none was reused'
);
SELECT is(
  (SELECT base_price_amount FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND price_revision = 2),
  '8.2500',
  'the superseded revision keeps its exact base price'
);
SELECT is(
  (SELECT promotional_price_amount FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND price_revision = 2),
  '6.7500',
  'the superseded revision keeps its exact promotional price'
);
SELECT is(
  (SELECT availability FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND price_revision = 3),
  (SELECT availability_unavailable FROM public.pgtap_catalog_contracts_fixture),
  'the availability change is preserved in its own revision'
);
SELECT is(
  (SELECT visibility FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND price_revision = 4),
  (SELECT visibility_hidden FROM public.pgtap_catalog_contracts_fixture),
  'the visibility change is preserved in its own revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND effective_to IS NOT NULL),
  3,
  'every revision but the current one is closed at the instant the next took effect'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND effective_to IS NULL),
  1,
  'exactly one revision is current'
);

-- The audit trail carries correlation, an explicit action and safe metadata only.
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND source = (SELECT audit_source FROM public.pgtap_catalog_contracts_fixture)),
  4,
  'one durable audit event per admitted commercial change'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND source = (SELECT audit_source FROM public.pgtap_catalog_contracts_fixture)
     AND correlation_id IN ('86000000-0000-4000-8000-000000000201', '86000000-0000-4000-8000-000000000202', '86000000-0000-4000-8000-000000000204')),
  3,
  'every audit event carries the correlation identifier of its own command'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND source = (SELECT audit_source FROM public.pgtap_catalog_contracts_fixture)
     AND action NOT IN ('catalog.channel_offer.price_changed', 'catalog.channel_offer.availability_changed', 'catalog.channel_offer.visibility_changed')),
  0,
  'every commercial audit event names a price, availability or visibility change'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND source = (SELECT audit_source FROM public.pgtap_catalog_contracts_fixture)
     AND (outcome <> 'allow' OR reason_code <> 'authorized' OR actor_user_id IS NULL)),
  0,
  'every catalog audit event is an authorized act by a resolved actor'
);
SELECT is(
  (SELECT metadata ->> 'required_permission' FROM public.audit_events
   WHERE target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND action = 'catalog.channel_offer.price_changed'
   ORDER BY created_at LIMIT 1),
  (SELECT catalog_price_manage FROM public.pgtap_catalog_contracts_fixture),
  'the audit event names the capability the change required'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND source = (SELECT audit_source FROM public.pgtap_catalog_contracts_fixture)
     AND (metadata ?| ARRAY['access_token', 'password', 'secret', 'token', 'authorization', 'credential'])),
  0,
  'no catalog audit event carries a credential-like metadata key'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events a
   JOIN public.channel_offer_price_history h ON h.audit_event_id = a.id
   WHERE a.target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  4,
  'every history revision points at the audit event that justified it'
);

-- ---------------------------------------------------------------------------
-- 5. A repeated command is a replay, not a second mutation
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
SELECT is(
  (public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 9.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000205',
    p_idempotency_key => (SELECT key_second_price_change FROM public.pgtap_catalog_contracts_fixture))) ->> 'replayed',
  'true',
  'a repeated submission under the same idempotency key is recognised as a replay'
);
RESET ROLE;
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  5,
  'the replay did not advance the price revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  4,
  'the replay did not append a second history revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture) AND source = (SELECT audit_source FROM public.pgtap_catalog_contracts_fixture)),
  4,
  'the replay did not write a second audit event'
);

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_availability => 'available',
    p_correlation_id => '86000000-0000-4000-8000-000000000601',
    p_idempotency_key => (SELECT key_second_price_change FROM public.pgtap_catalog_contracts_fixture))$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture),
  'The idempotency key was already used for a different command.',
  'a receipt cannot replay a different command for the same offer'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_peer FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000206',
    p_idempotency_key => (SELECT key_second_price_change FROM public.pgtap_catalog_contracts_fixture))$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_contracts_fixture), 'The idempotency key was already used by another actor.',
  'an idempotency key is bound to the actor that first used it'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '9.0000',
  'the refused key reuse left the price untouched'
);

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
SELECT lives_ok(
  $$SELECT public.catalog_update_product(
    p_product_id => (SELECT product_a FROM public.pgtap_catalog_contracts_fixture),
    p_name => 'Café expresso revisado', p_description => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000701',
    p_idempotency_key => '86000000-0000-4000-8000-000000000701')$$,
  'a product command records its expected target'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_product(
    p_product_id => (SELECT product_b FROM public.pgtap_catalog_contracts_fixture),
    p_name => 'Café coado revisado', p_description => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000702',
    p_idempotency_key => '86000000-0000-4000-8000-000000000701')$$,
  (SELECT invalid_parameter FROM public.pgtap_catalog_contracts_fixture),
  'The idempotency key was already used for a different command.',
  'a receipt cannot replay the same command family for another target'
);
RESET ROLE;
SELECT is(
  (SELECT name FROM public.products WHERE id = (SELECT product_b FROM public.pgtap_catalog_contracts_fixture)),
  'Café coado',
  'the mismatched target remained unchanged'
);

UPDATE public.sales_channels
SET status = 'archived', archived_at = pg_catalog.now()
WHERE id = (SELECT channel_a FROM public.pgtap_catalog_contracts_fixture);
SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture));
SELECT lives_ok(
  $$SELECT public.catalog_update_sales_channel(
    p_channel_id => (SELECT channel_a FROM public.pgtap_catalog_contracts_fixture),
    p_display_name => 'Goodz Online revisado', p_description => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000801',
    p_idempotency_key => '86000000-0000-4000-8000-000000000801')$$,
  'an archived channel accepts a structural edit without changing its status'
);
RESET ROLE;
SELECT is(
  (SELECT description FROM public.sales_channels WHERE id = (SELECT channel_a FROM public.pgtap_catalog_contracts_fixture)),
  NULL::text,
  'a null channel description clears the previous value'
);
SELECT is(
  (SELECT status FROM public.sales_channels WHERE id = (SELECT channel_a FROM public.pgtap_catalog_contracts_fixture)),
  'archived',
  'editing an archived channel preserves its archived state'
);
SELECT is(
  (SELECT action FROM public.audit_events WHERE correlation_id = '86000000-0000-4000-8000-000000000801'),
  'catalog.sales_channel.updated',
  'editing an archived channel records an update action, not an archive action'
);

-- ---------------------------------------------------------------------------
-- 6. Fail closed: a mandatory audit event that cannot be persisted aborts the mutation
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
RESET ROLE;

-- Fault injection: the audit table refuses writes, standing in for a storage failure, a full
-- transaction log, or an audit row that would violate its own safety constraint. The privileged
-- mutation must fail rather than leave an unaudited price behind.
CREATE FUNCTION pg_temp.reject_audit_write() RETURNS trigger
LANGUAGE plpgsql AS $inject$
BEGIN
  RAISE EXCEPTION 'Injected audit storage failure.';
END;
$inject$;
CREATE TRIGGER inject_audit_failure
  BEFORE INSERT ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_audit_write();

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 12.0000, p_promotional_price_amount => NULL,
    p_correlation_id => (SELECT correlation_price_failure FROM public.pgtap_catalog_contracts_fixture), p_idempotency_key => (SELECT key_price_failure FROM public.pgtap_catalog_contracts_fixture))$$,
  (SELECT raise_exception FROM public.pgtap_catalog_contracts_fixture), (SELECT injected_failure FROM public.pgtap_catalog_contracts_fixture),
  'a price change whose mandatory audit event cannot be persisted fails'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), p_availability => 'available',
    p_correlation_id => (SELECT correlation_availability_failure FROM public.pgtap_catalog_contracts_fixture), p_idempotency_key => '86000000-0000-4000-8000-000000000402')$$,
  (SELECT raise_exception FROM public.pgtap_catalog_contracts_fixture), (SELECT injected_failure FROM public.pgtap_catalog_contracts_fixture),
  'an availability change whose mandatory audit event cannot be persisted fails'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_visibility(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture), p_visibility => 'visible',
    p_correlation_id => (SELECT correlation_visibility_failure FROM public.pgtap_catalog_contracts_fixture), p_idempotency_key => '86000000-0000-4000-8000-000000000403')$$,
  (SELECT raise_exception FROM public.pgtap_catalog_contracts_fixture), (SELECT injected_failure FROM public.pgtap_catalog_contracts_fixture),
  'a visibility change whose mandatory audit event cannot be persisted fails'
);
RESET ROLE;
DROP TRIGGER inject_audit_failure ON public.audit_events;

SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '9.0000',
  'the audit failure left the persisted price exactly as it was'
);
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  5,
  'the audit failure did not advance the price revision'
);
SELECT is(
  (SELECT availability FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  (SELECT availability_unavailable FROM public.pgtap_catalog_contracts_fixture),
  'the audit failure left availability exactly as it was'
);
SELECT is(
  (SELECT visibility FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  (SELECT visibility_hidden FROM public.pgtap_catalog_contracts_fixture),
  'the audit failure left visibility exactly as it was'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  4,
  'the audit failure appended no history revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_command_receipts
   WHERE organization_id = (SELECT tenant_a FROM public.pgtap_catalog_contracts_fixture)
     AND idempotency_key IN ((SELECT key_price_failure FROM public.pgtap_catalog_contracts_fixture), '86000000-0000-4000-8000-000000000402', '86000000-0000-4000-8000-000000000403')),
  0,
  'the audit failure recorded no command receipt'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events WHERE correlation_id IN (
    (SELECT correlation_price_failure FROM public.pgtap_catalog_contracts_fixture), (SELECT correlation_availability_failure FROM public.pgtap_catalog_contracts_fixture), (SELECT correlation_visibility_failure FROM public.pgtap_catalog_contracts_fixture))),
  0,
  'no partial audit row survived the aborted commands'
);

-- With the fault removed the same commands are admitted, proving the refusals came from durability
-- and not from a permanently closed path.
SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 12.0000, p_promotional_price_amount => NULL,
    p_correlation_id => (SELECT key_price_failure FROM public.pgtap_catalog_contracts_fixture), p_idempotency_key => '86000000-0000-4000-8000-000000000501')$$,
  'the same price change is admitted once audit persistence is healthy again'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  '12.0000',
  'the recovered price change is persisted exactly'
);
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture)),
  6,
  'the recovered price change advanced the revision by one'
);

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
SELECT is(
  (public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 12.0000, p_promotional_price_amount => 10.0000,
    p_correlation_id => '86000000-0000-4000-8000-000000000901',
    p_idempotency_key => '86000000-0000-4000-8000-000000000901')) ->> 'action',
  'catalog.channel_offer.promotional_price_changed',
  'a promo-only change records the promotional price action'
);
RESET ROLE;
SELECT is(
  (SELECT action FROM public.audit_events WHERE correlation_id = '86000000-0000-4000-8000-000000000901'),
  'catalog.channel_offer.promotional_price_changed',
  'the audit event and command result use the same promotional price action'
);
SELECT is(
  (SELECT action FROM public.catalog_command_receipts WHERE idempotency_key = '86000000-0000-4000-8000-000000000901'),
  'catalog.channel_offer.promotional_price_changed',
  'the idempotency receipt uses the same promotional price action'
);
SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT contract_manager FROM public.pgtap_catalog_contracts_fixture), true, 0, 0);
SELECT is(
  (public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_contracts_fixture),
    p_base_price_amount => 12.0000, p_promotional_price_amount => 10.0000,
    p_correlation_id => '86000000-0000-4000-8000-000000000902',
    p_idempotency_key => '86000000-0000-4000-8000-000000000901')) ->> 'replayed',
  'true',
  'the promotional price receipt replays the same offer command'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
