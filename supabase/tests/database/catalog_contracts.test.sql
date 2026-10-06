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
-- 1. Fixture
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('86000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'gmz007-contract-manager@example.invalid', now(), '{}', '{}', now(), now()),
  ('86000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'gmz007-contract-peer@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name) VALUES
  ('86000000-0000-4000-8000-000000000010', 'GMZ-IMPL-007 contract organization');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('86000000-0000-4000-8000-000000000020', '86000000-0000-4000-8000-000000000010', 'gmz007-contract-manager', 'Contract manager'),
  ('86000000-0000-4000-8000-000000000021', '86000000-0000-4000-8000-000000000010', 'gmz007-contract-peer', 'Contract peer');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000020', 'catalog.read'),
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000020', 'catalog.write'),
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000020', 'catalog.price.manage'),
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000020', 'catalog.availability.manage'),
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000021', 'catalog.read'),
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000021', 'catalog.write'),
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000021', 'catalog.price.manage'),
  ('86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000021', 'catalog.availability.manage');
INSERT INTO public.organization_memberships (id, organization_id, user_id, status) VALUES
  ('86000000-0000-4000-8000-000000000030', '86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000001', 'active'),
  ('86000000-0000-4000-8000-000000000031', '86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000002', 'active');
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
  ('86000000-0000-4000-8000-000000000040', '86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000030', '86000000-0000-4000-8000-000000000020', 'organization', NULL, NULL),
  ('86000000-0000-4000-8000-000000000041', '86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000031', '86000000-0000-4000-8000-000000000021', 'organization', NULL, NULL);

INSERT INTO public.product_categories (id, organization_id, name) VALUES
  ('86000000-0000-4000-8000-000000000050', '86000000-0000-4000-8000-000000000010', 'Bebidas');
INSERT INTO public.products (id, organization_id, category_id, name) VALUES
  ('86000000-0000-4000-8000-000000000060', '86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000050', 'Café expresso');
INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ('86000000-0000-4000-8000-000000000070', '86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000060', 'Copo 90 ml');
INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name) VALUES
  ('86000000-0000-4000-8000-000000000080', '86000000-0000-4000-8000-000000000010', 'goodz-online', 'Goodz Online');

-- An offer with a known starting commercial state. It is inserted directly, so it deliberately has
-- no revision 1 history row; the first admitted contract change therefore becomes revision 2, and
-- every revision this file asserts on was produced by a contract.
INSERT INTO public.channel_offers (
  id, organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount
)
VALUES (
  '86000000-0000-4000-8000-000000000090', '86000000-0000-4000-8000-000000000010', '86000000-0000-4000-8000-000000000080',
  '86000000-0000-4000-8000-000000000060', 7.5000, 'BRL', 5.9000
);

-- ---------------------------------------------------------------------------
-- 2. The factor and the freshness are re-derived from verified claims
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
DO $single_factor$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text,
    true
  );
END;
$single_factor$;

SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 8.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000101', p_idempotency_key => NULL)$$,
  '42501', 'A second authentication factor is required for this catalog operation.',
  'a single-factor session cannot change a price'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  '7.5000',
  'the refused price change left the persisted price untouched'
);

SET LOCAL ROLE authenticated;
DO $stale_factor$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint - 4000)
      )
    )::text,
    true
  );
END;
$stale_factor$;
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 8.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000102', p_idempotency_key => NULL)$$,
  '42501', 'A recent two-step verification is required for this catalog operation.',
  'a long elapsed second factor is refused even though the session is aal2'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $missing_password$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$missing_password$;
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 8.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000103', p_idempotency_key => NULL)$$,
  '42501', 'A recent password reauthentication is required for this catalog operation.',
  'a second factor alone is not enough; the password grant must also be inside the freshness window'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $fresh$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$fresh$;

-- ---------------------------------------------------------------------------
-- 3. Impossible commercial states are refused before anything is written
-- ---------------------------------------------------------------------------

SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => -1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000111', p_idempotency_key => NULL)$$,
  '22023', 'Invalid catalog input for base_price_amount.',
  'a negative price is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 8.0000, p_promotional_price_amount => 9.0000,
    p_correlation_id => '86000000-0000-4000-8000-000000000112', p_idempotency_key => NULL)$$,
  '22023', 'Invalid catalog input for promotional_price_amount.',
  'a promotional price above the base price is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 8.0000, p_promotional_price_amount => 8.0000,
    p_correlation_id => '86000000-0000-4000-8000-000000000113', p_idempotency_key => NULL)$$,
  '22023', 'Invalid catalog input for promotional_price_amount.',
  'a promotional price equal to the base price is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 7.5000, p_promotional_price_amount => 5.9000,
    p_correlation_id => '86000000-0000-4000-8000-000000000114', p_idempotency_key => NULL)$$,
  '22023', 'The requested price change does not alter the current commercial state.',
  'a command that changes nothing is refused instead of writing a meaningless revision'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => '86000000-0000-4000-8000-000000000090', p_availability => 'maybe',
    p_correlation_id => '86000000-0000-4000-8000-000000000115', p_idempotency_key => NULL)$$,
  '22023', 'Invalid catalog input for availability.',
  'an availability outside the admitted vocabulary is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_visibility(
    p_offer_id => '86000000-0000-4000-8000-000000000090', p_visibility => 'hidden-ish',
    p_correlation_id => '86000000-0000-4000-8000-000000000116', p_idempotency_key => NULL)$$,
  '22023', 'Invalid catalog input for visibility.',
  'a visibility outside the admitted vocabulary is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => '86000000-0000-4000-8000-000000000090', p_availability => 'available',
    p_correlation_id => '86000000-0000-4000-8000-000000000117', p_idempotency_key => NULL)$$,
  '22023', 'The requested availability change does not alter the current commercial state.',
  'an availability command that changes nothing is refused'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_channel_offer(
    p_organization_id => '86000000-0000-4000-8000-000000000010',
    p_establishment_id => NULL, p_branch_id => NULL,
    p_sales_channel_id => '86000000-0000-4000-8000-000000000080',
    p_product_id => '86000000-0000-4000-8000-000000000060', p_product_variant_id => '86000000-0000-4000-8000-000000000070',
    p_title => NULL, p_description => NULL,
    p_base_price_amount => 7.5000, p_base_price_currency => 'BRL', p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000118', p_idempotency_key => NULL)$$,
  '22023', 'Invalid catalog input for target.',
  'an offer naming both a product and a variant is refused before any write'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  1,
  'no refused command created or destroyed an offer'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  '7.5000',
  'no refused command changed the persisted price'
);
SELECT is(
  (SELECT promotional_price_amount::text FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  '5.9000',
  'no refused command changed the persisted promotional price'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090'),
  0,
  'the fixture offer starts with no history row, so the first contract change is revision 2'
);

-- ---------------------------------------------------------------------------
-- 4. An admitted price change appends exact truth and an audit event
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
DO $fresh$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$fresh$;

SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 8.2500, p_promotional_price_amount => 6.7500,
    p_correlation_id => '86000000-0000-4000-8000-000000000201', p_idempotency_key => '86000000-0000-4000-8000-000000000301')$$,
  'a fresh two-factor session admits a price change'
);
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  '8.2500',
  'the new price is persisted as its exact decimal text'
);
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  2,
  'the offer advanced to its next price revision'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => '86000000-0000-4000-8000-000000000090', p_availability => 'unavailable',
    p_correlation_id => '86000000-0000-4000-8000-000000000202', p_idempotency_key => '86000000-0000-4000-8000-000000000302')$$,
  'a fresh two-factor session admits an availability change'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_visibility(
    p_offer_id => '86000000-0000-4000-8000-000000000090', p_visibility => 'hidden',
    p_correlation_id => '86000000-0000-4000-8000-000000000203', p_idempotency_key => '86000000-0000-4000-8000-000000000303')$$,
  'a fresh two-factor session admits a visibility change'
);
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 9.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000204', p_idempotency_key => '86000000-0000-4000-8000-000000000304')$$,
  'a second price change is admitted'
);
RESET ROLE;

-- Every admitted commercial change is reconstructable, and the revisions chain without a gap.
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090'),
  4,
  'each admitted commercial change appended exactly one history revision'
);
SELECT is(
  (SELECT string_agg(price_revision::text, ',' ORDER BY price_revision)
   FROM public.channel_offer_price_history WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090'),
  '2,3,4,5',
  'the revisions are consecutive and none was reused'
);
SELECT is(
  (SELECT base_price_amount FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090' AND price_revision = 2),
  '8.2500',
  'the superseded revision keeps its exact base price'
);
SELECT is(
  (SELECT promotional_price_amount FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090' AND price_revision = 2),
  '6.7500',
  'the superseded revision keeps its exact promotional price'
);
SELECT is(
  (SELECT availability FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090' AND price_revision = 3),
  'unavailable',
  'the availability change is preserved in its own revision'
);
SELECT is(
  (SELECT visibility FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090' AND price_revision = 4),
  'hidden',
  'the visibility change is preserved in its own revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090' AND effective_to IS NOT NULL),
  3,
  'every revision but the current one is closed at the instant the next took effect'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline
   WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090' AND effective_to IS NULL),
  1,
  'exactly one revision is current'
);

-- The audit trail carries correlation, an explicit action and safe metadata only.
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = '86000000-0000-4000-8000-000000000090' AND source = 'catalog_contract'),
  4,
  'one durable audit event per admitted commercial change'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = '86000000-0000-4000-8000-000000000090' AND source = 'catalog_contract'
     AND correlation_id IN ('86000000-0000-4000-8000-000000000201', '86000000-0000-4000-8000-000000000202', '86000000-0000-4000-8000-000000000204')),
  3,
  'every audit event carries the correlation identifier of its own command'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = '86000000-0000-4000-8000-000000000090' AND source = 'catalog_contract'
     AND action NOT IN ('catalog.channel_offer.price_changed', 'catalog.channel_offer.availability_changed', 'catalog.channel_offer.visibility_changed')),
  0,
  'every commercial audit event names a price, availability or visibility change'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = '86000000-0000-4000-8000-000000000090' AND source = 'catalog_contract'
     AND (outcome <> 'allow' OR reason_code <> 'authorized' OR actor_user_id IS NULL)),
  0,
  'every catalog audit event is an authorized act by a resolved actor'
);
SELECT is(
  (SELECT metadata ->> 'required_permission' FROM public.audit_events
   WHERE target_id = '86000000-0000-4000-8000-000000000090' AND action = 'catalog.channel_offer.price_changed'
   ORDER BY created_at LIMIT 1),
  'catalog.price.manage',
  'the audit event names the capability the change required'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = '86000000-0000-4000-8000-000000000090' AND source = 'catalog_contract'
     AND (metadata ?| ARRAY['access_token', 'password', 'secret', 'token', 'authorization', 'credential'])),
  0,
  'no catalog audit event carries a credential-like metadata key'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events a
   JOIN public.channel_offer_price_history h ON h.audit_event_id = a.id
   WHERE a.target_id = '86000000-0000-4000-8000-000000000090'),
  4,
  'every history revision points at the audit event that justified it'
);

-- ---------------------------------------------------------------------------
-- 5. A repeated command is a replay, not a second mutation
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
DO $fresh$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$fresh$;
SELECT is(
  (public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 9.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000205',
    p_idempotency_key => '86000000-0000-4000-8000-000000000304')) ->> 'replayed',
  'true',
  'a repeated submission under the same idempotency key is recognised as a replay'
);
RESET ROLE;
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  5,
  'the replay did not advance the price revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090'),
  4,
  'the replay did not append a second history revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE target_id = '86000000-0000-4000-8000-000000000090' AND source = 'catalog_contract'),
  4,
  'the replay did not write a second audit event'
);

SET LOCAL ROLE authenticated;
DO $peer$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000002', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$peer$;
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000206',
    p_idempotency_key => '86000000-0000-4000-8000-000000000304')$$,
  '42501', 'The idempotency key was already used by another actor.',
  'an idempotency key is bound to the actor that first used it'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  '9.0000',
  'the refused key reuse left the price untouched'
);

-- ---------------------------------------------------------------------------
-- 6. Fail closed: a mandatory audit event that cannot be persisted aborts the mutation
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
DO $fresh$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$fresh$;
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
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 12.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000301', p_idempotency_key => '86000000-0000-4000-8000-000000000401')$$,
  'P0001', 'Injected audit storage failure.',
  'a price change whose mandatory audit event cannot be persisted fails'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_availability(
    p_offer_id => '86000000-0000-4000-8000-000000000090', p_availability => 'available',
    p_correlation_id => '86000000-0000-4000-8000-000000000302', p_idempotency_key => '86000000-0000-4000-8000-000000000402')$$,
  'P0001', 'Injected audit storage failure.',
  'an availability change whose mandatory audit event cannot be persisted fails'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_visibility(
    p_offer_id => '86000000-0000-4000-8000-000000000090', p_visibility => 'visible',
    p_correlation_id => '86000000-0000-4000-8000-000000000303', p_idempotency_key => '86000000-0000-4000-8000-000000000403')$$,
  'P0001', 'Injected audit storage failure.',
  'a visibility change whose mandatory audit event cannot be persisted fails'
);
RESET ROLE;
DROP TRIGGER inject_audit_failure ON public.audit_events;

SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  '9.0000',
  'the audit failure left the persisted price exactly as it was'
);
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  5,
  'the audit failure did not advance the price revision'
);
SELECT is(
  (SELECT availability FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  'unavailable',
  'the audit failure left availability exactly as it was'
);
SELECT is(
  (SELECT visibility FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  'hidden',
  'the audit failure left visibility exactly as it was'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = '86000000-0000-4000-8000-000000000090'),
  4,
  'the audit failure appended no history revision'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_command_receipts
   WHERE organization_id = '86000000-0000-4000-8000-000000000010'
     AND idempotency_key IN ('86000000-0000-4000-8000-000000000401', '86000000-0000-4000-8000-000000000402', '86000000-0000-4000-8000-000000000403')),
  0,
  'the audit failure recorded no command receipt'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events WHERE correlation_id IN (
    '86000000-0000-4000-8000-000000000301', '86000000-0000-4000-8000-000000000302', '86000000-0000-4000-8000-000000000303')),
  0,
  'no partial audit row survived the aborted commands'
);

-- With the fault removed the same commands are admitted, proving the refusals came from durability
-- and not from a permanently closed path.
SET LOCAL ROLE authenticated;
DO $fresh$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '86000000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal2',
      'amr', json_build_array(
        json_build_object('method', 'password', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint),
        json_build_object('method', 'totp', 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint)
      )
    )::text,
    true
  );
END;
$fresh$;
SELECT lives_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => '86000000-0000-4000-8000-000000000090',
    p_base_price_amount => 12.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '86000000-0000-4000-8000-000000000401', p_idempotency_key => '86000000-0000-4000-8000-000000000501')$$,
  'the same price change is admitted once audit persistence is healthy again'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  '12.0000',
  'the recovered price change is persisted exactly'
);
SELECT is(
  (SELECT price_revision FROM public.channel_offers WHERE id = '86000000-0000-4000-8000-000000000090'),
  6,
  'the recovered price change advanced the revision by one'
);

SELECT * FROM finish();
ROLLBACK;
