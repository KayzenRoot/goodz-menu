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
-- 0. Fixture vocabulary
-- ---------------------------------------------------------------------------
-- Every identity, capability, SQLSTATE and refusal message this file repeats is written once in
-- the fixture below and named everywhere else, so a seed row and the assertion that reads it cannot
-- drift apart, and so a mistyped identifier cannot quietly become a second tenant that happens to
-- be absent from the seed. The table lives in this transaction only: the file rolls back, so
-- nothing it declares outlives the run.
CREATE TABLE public.pgtap_catalog_tenant_fixture (
  tenant_a uuid NOT NULL,
  user_org_manager uuid NOT NULL,
  establishment_a1 uuid NOT NULL,
  unauthorized_message text NOT NULL,
  branch_a1_1 uuid NOT NULL,
  insufficient_privilege text NOT NULL,
  offer_a uuid NOT NULL,
  unauthorized_label text NOT NULL,
  denied_price_history text NOT NULL,
  tenant_b uuid NOT NULL,
  denied_products text NOT NULL,
  product_a uuid NOT NULL,
  denied_product_categories text NOT NULL,
  denied_product_variants text NOT NULL,
  denied_sales_channels text NOT NULL,
  denied_channel_offers text NOT NULL,
  denied_command_receipts text NOT NULL,
  channel_a uuid NOT NULL,
  channel_b uuid NOT NULL,
  category_a uuid NOT NULL,
  category_b uuid NOT NULL,
  category_a_sibling uuid NOT NULL,
  product_b uuid NOT NULL,
  user_branch_manager uuid NOT NULL,
  user_no_capability uuid NOT NULL,
  user_foreign_manager uuid NOT NULL,
  user_readonly uuid NOT NULL,
  user_empty_tenant uuid NOT NULL,
  establishment_a2 uuid NOT NULL,
  establishment_b1 uuid NOT NULL,
  branch_a1_2 uuid NOT NULL,
  branch_a2_1 uuid NOT NULL,
  branch_b1_1 uuid NOT NULL,
  role_org_manager uuid NOT NULL,
  role_branch_manager uuid NOT NULL,
  role_foreign_manager uuid NOT NULL,
  role_readonly uuid NOT NULL,
  role_empty_tenant uuid NOT NULL,
  membership_org_manager uuid NOT NULL,
  membership_branch_manager uuid NOT NULL,
  membership_no_capability uuid NOT NULL,
  membership_foreign_manager uuid NOT NULL,
  membership_readonly uuid NOT NULL,
  membership_empty_tenant uuid NOT NULL,
  product_a_branch uuid NOT NULL,
  variant_a uuid NOT NULL,
  variant_b uuid NOT NULL,
  offer_a_branch uuid NOT NULL,
  offer_b uuid NOT NULL,
  catalog_write text NOT NULL,
  catalog_read text NOT NULL,
  catalog_price_manage text NOT NULL,
  catalog_availability_manage text NOT NULL,
  check_violation text NOT NULL,
  empty_metadata jsonb NOT NULL,
  authenticated_role text NOT NULL,
  active_status text NOT NULL,
  organization_scope text NOT NULL,
  currency_brl text NOT NULL,
  availability_available text NOT NULL,
  visibility_visible text NOT NULL,
  user_establishment_manager uuid NOT NULL,
  role_establishment_manager uuid NOT NULL,
  membership_establishment_manager uuid NOT NULL,
  membership_role_establishment_manager uuid NOT NULL
);
INSERT INTO public.pgtap_catalog_tenant_fixture VALUES (
'85000000-0000-4000-8000-000000000010',
'85000000-0000-4000-8000-000000000001',
'85000000-0000-4000-8000-000000000012',
'The current session is not authorized for this catalog operation.',
'85000000-0000-4000-8000-000000000015',
'42501',
'85000000-0000-4000-8000-000000000090',
'Unauthorized',
'permission denied for table channel_offer_price_history',
'85000000-0000-4000-8000-000000000011',
'permission denied for table products',
'85000000-0000-4000-8000-000000000060',
'permission denied for table product_categories',
'permission denied for table product_variants',
'permission denied for table sales_channels',
'permission denied for table channel_offers',
'permission denied for table catalog_command_receipts',
'85000000-0000-4000-8000-000000000080',
'85000000-0000-4000-8000-000000000081',
'85000000-0000-4000-8000-000000000050',
'85000000-0000-4000-8000-000000000052',
'85000000-0000-4000-8000-000000000053',
'85000000-0000-4000-8000-000000000062',
'85000000-0000-4000-8000-000000000002',
'85000000-0000-4000-8000-000000000003',
'85000000-0000-4000-8000-000000000004',
'85000000-0000-4000-8000-000000000005',
'85000000-0000-4000-8000-000000000006',
'85000000-0000-4000-8000-000000000013',
'85000000-0000-4000-8000-000000000014',
'85000000-0000-4000-8000-000000000016',
'85000000-0000-4000-8000-000000000017',
'85000000-0000-4000-8000-000000000018',
'85000000-0000-4000-8000-000000000020',
'85000000-0000-4000-8000-000000000021',
'85000000-0000-4000-8000-000000000023',
'85000000-0000-4000-8000-000000000024',
'85000000-0000-4000-8000-000000000025',
'85000000-0000-4000-8000-000000000030',
'85000000-0000-4000-8000-000000000031',
'85000000-0000-4000-8000-000000000032',
'85000000-0000-4000-8000-000000000033',
'85000000-0000-4000-8000-000000000034',
'85000000-0000-4000-8000-000000000035',
'85000000-0000-4000-8000-000000000061',
'85000000-0000-4000-8000-000000000070',
'85000000-0000-4000-8000-000000000071',
'85000000-0000-4000-8000-000000000091',
'85000000-0000-4000-8000-000000000092',
'catalog.write',
'catalog.read',
'catalog.price.manage',
'catalog.availability.manage',
'23514',
'{}',
'authenticated',
'active',
'organization',
'BRL',
'available',
  'visible',
  '85000000-0000-4000-8000-000000000007',
  '85000000-0000-4000-8000-000000000026',
  '85000000-0000-4000-8000-000000000036',
  '85000000-0000-4000-8000-000000000046'
);

-- The catalog assertions below run as anon and authenticated, and the claims of the session under
-- test have to be assembled from the same vocabulary.
GRANT SELECT ON public.pgtap_catalog_tenant_fixture TO anon, authenticated;

-- The session claims are JSON embedded inside a string, so they cannot be assembled by substituting
-- the constants into a literal the way every other use site is. This is the one place that knows
-- what a verified Supabase session looks like.
CREATE FUNCTION public.pgtap_catalog_assume_session(
  p_subject uuid, p_two_factor boolean DEFAULT false, p_fresh_amr boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
AS $assume$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_strip_nulls(jsonb_build_object(
      'sub', p_subject::text,
      'role', (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture),
      'aal', CASE WHEN p_two_factor THEN 'aal2' END,
      'amr', CASE WHEN p_fresh_amr THEN (
        SELECT jsonb_agg(jsonb_build_object('method', method, 'timestamp', pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint))
        FROM unnest(ARRAY['password', 'totp']) AS method
      ) END
    ))::text,
    true
  );
END;
$assume$;
GRANT EXECUTE ON FUNCTION public.pgtap_catalog_assume_session(uuid, boolean, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. Fixture: two tenants, nested scopes, four distinct authorities
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ((SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), 'gmz007-org-manager@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), now(), now()),
  ((SELECT user_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), 'gmz007-branch-manager@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), now(), now()),
  ((SELECT user_no_capability FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), 'gmz007-no-capability@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), now(), now()),
  ((SELECT user_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), 'gmz007-foreign-manager@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), now(), now()),
  ((SELECT user_readonly FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), 'gmz007-readonly@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), now(), now()),
  ((SELECT user_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), 'gmz007-establishment-manager@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), now(), now());

INSERT INTO public.organizations (id, display_name) VALUES
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'GMZ-IMPL-007 tenant A'),
  ((SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), 'GMZ-IMPL-007 tenant B');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ((SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'Establishment A1'),
  ((SELECT establishment_a2 FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'Establishment A2'),
  ((SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), 'Establishment B1');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ((SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), 'Branch A1-1'),
  ((SELECT branch_a1_2 FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), 'Branch A1-2'),
  ((SELECT branch_a2_1 FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a2 FROM public.pgtap_catalog_tenant_fixture), 'Branch A2-1'),
  ((SELECT branch_b1_1 FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), 'Branch B1-1');

INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ((SELECT role_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'gmz007-org-manager', 'Catalog manager'),
  ((SELECT role_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'gmz007-branch-manager', 'Branch catalog manager'),
  ('85000000-0000-4000-8000-000000000022', (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'gmz007-no-capability', 'Role without catalog capability'),
  ((SELECT role_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), 'gmz007-foreign-manager', 'Foreign catalog manager'),
  ((SELECT role_readonly FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'gmz007-readonly', 'Catalog reader'),
  ((SELECT role_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'gmz007-establishment-manager', 'Establishment catalog manager');

-- The capability vocabulary reuses the existing permissions model rather than introducing a parallel
-- one, and it is split so that price and availability are separately grantable.
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_price_manage FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_availability_manage FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_price_manage FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_readonly FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT role_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT role_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT role_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT role_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_price_manage FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT role_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_availability_manage FROM public.pgtap_catalog_tenant_fixture));

INSERT INTO public.organization_memberships (id, organization_id, user_id, status)
VALUES
  ((SELECT membership_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT active_status FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT membership_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT user_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT active_status FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT membership_no_capability FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT user_no_capability FROM public.pgtap_catalog_tenant_fixture), (SELECT active_status FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT membership_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT user_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT active_status FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT membership_readonly FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT user_readonly FROM public.pgtap_catalog_tenant_fixture), (SELECT active_status FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT membership_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT user_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT active_status FROM public.pgtap_catalog_tenant_fixture));
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('85000000-0000-4000-8000-000000000040', (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT membership_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT role_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT organization_scope FROM public.pgtap_catalog_tenant_fixture), NULL, NULL),
  ('85000000-0000-4000-8000-000000000041', (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT membership_branch_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT role_branch_manager FROM public.pgtap_catalog_tenant_fixture), 'branch', (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), (SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture)),
  ('85000000-0000-4000-8000-000000000042', (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT membership_no_capability FROM public.pgtap_catalog_tenant_fixture), '85000000-0000-4000-8000-000000000022', (SELECT organization_scope FROM public.pgtap_catalog_tenant_fixture), NULL, NULL),
  ('85000000-0000-4000-8000-000000000043', (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT membership_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT role_foreign_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT organization_scope FROM public.pgtap_catalog_tenant_fixture), NULL, NULL),
  ('85000000-0000-4000-8000-000000000044', (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT membership_readonly FROM public.pgtap_catalog_tenant_fixture), (SELECT role_readonly FROM public.pgtap_catalog_tenant_fixture), (SELECT organization_scope FROM public.pgtap_catalog_tenant_fixture), NULL, NULL),
  ((SELECT membership_role_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT membership_establishment_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT role_establishment_manager FROM public.pgtap_catalog_tenant_fixture), 'establishment', (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), NULL);

INSERT INTO public.product_categories (id, organization_id, name, display_order) VALUES
  ((SELECT category_a FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'Bebidas', 10),
  ((SELECT category_b FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), 'Bebidas estrangeiras', 10);
INSERT INTO public.product_categories (id, organization_id, establishment_id, branch_id, name, display_order) VALUES
  ('85000000-0000-4000-8000-000000000051', (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), (SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture), 'Bebidas da filial', 5),
  ((SELECT category_a_sibling FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), (SELECT branch_a1_2 FROM public.pgtap_catalog_tenant_fixture), 'Bebidas da filial irmã', 5),
  ('85000000-0000-4000-8000-000000000056', (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a2 FROM public.pgtap_catalog_tenant_fixture), (SELECT branch_a2_1 FROM public.pgtap_catalog_tenant_fixture), 'Bebidas de outro estabelecimento', 5),
  ('85000000-0000-4000-8000-000000000057', (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), (SELECT branch_b1_1 FROM public.pgtap_catalog_tenant_fixture), 'Bebidas de outro tenant', 5);

INSERT INTO public.products (id, organization_id, name) VALUES
  ((SELECT product_a FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'Café expresso'),
  ((SELECT product_b FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), 'Café estrangeiro');
INSERT INTO public.products (id, organization_id, establishment_id, branch_id, name)
VALUES ((SELECT product_a_branch FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), (SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture), 'Café da filial');

INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ((SELECT variant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT product_a FROM public.pgtap_catalog_tenant_fixture), 'Copo 90 ml'),
  ((SELECT variant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT product_b FROM public.pgtap_catalog_tenant_fixture), 'Copo 180 ml');

INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name) VALUES
  ((SELECT channel_a FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'goodz-online', 'Goodz Online'),
  ((SELECT channel_b FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), 'goodz-online', 'Canal estrangeiro');

INSERT INTO public.channel_offers (id, organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency) VALUES
  ((SELECT offer_a FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT channel_a FROM public.pgtap_catalog_tenant_fixture), (SELECT product_a FROM public.pgtap_catalog_tenant_fixture), 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT offer_b FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture), (SELECT channel_b FROM public.pgtap_catalog_tenant_fixture), (SELECT product_b FROM public.pgtap_catalog_tenant_fixture), 9.9000, (SELECT currency_brl FROM public.pgtap_catalog_tenant_fixture));
INSERT INTO public.channel_offers (id, organization_id, establishment_id, branch_id, sales_channel_id, product_id, base_price_amount, base_price_currency)
VALUES ((SELECT offer_a_branch FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture), (SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture), (SELECT channel_a FROM public.pgtap_catalog_tenant_fixture), (SELECT product_a_branch FROM public.pgtap_catalog_tenant_fixture), 8.0000, (SELECT currency_brl FROM public.pgtap_catalog_tenant_fixture));

INSERT INTO public.audit_events (id, actor_user_id, organization_id, action, target_type, target_id, outcome, reason_code, correlation_id, source, metadata)
VALUES
  ('85000000-0000-4000-8000-0000000000a1', (SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'catalog.channel_offer.created', 'channel_offer', (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture), 'allow', 'authorized', '85000000-0000-4000-8000-0000000000b1', 'catalog_contract', '{"required_permission":"catalog.price.manage"}'),
  ('85000000-0000-4000-8000-0000000000a2', (SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'catalog.channel_offer.created', 'channel_offer', (SELECT offer_a_branch FROM public.pgtap_catalog_tenant_fixture), 'allow', 'authorized', '85000000-0000-4000-8000-0000000000b2', 'catalog_contract', '{"required_permission":"catalog.price.manage"}');
INSERT INTO public.channel_offer_price_history (
  organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency,
  availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id
) VALUES
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture), 1, 7.5000, (SELECT currency_brl FROM public.pgtap_catalog_tenant_fixture), (SELECT availability_available FROM public.pgtap_catalog_tenant_fixture), (SELECT visibility_visible FROM public.pgtap_catalog_tenant_fixture), now(), (SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), '85000000-0000-4000-8000-0000000000b1', '85000000-0000-4000-8000-0000000000a1'),
  ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT offer_a_branch FROM public.pgtap_catalog_tenant_fixture), 1, 8.0000, (SELECT currency_brl FROM public.pgtap_catalog_tenant_fixture), (SELECT availability_available FROM public.pgtap_catalog_tenant_fixture), (SELECT visibility_visible FROM public.pgtap_catalog_tenant_fixture), now(), (SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), '85000000-0000-4000-8000-0000000000b2', '85000000-0000-4000-8000-0000000000a2');

-- ---------------------------------------------------------------------------
-- 2. anon holds nothing
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.products$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), NULL, 'anon cannot read the canonical product table');
SELECT throws_ok($$SELECT * FROM public.product_categories$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), NULL, 'anon cannot read the product category table');
SELECT throws_ok($$SELECT * FROM public.channel_offers$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), NULL, 'anon cannot read the channel offer table');
SELECT throws_ok($$SELECT * FROM public.channel_offer_pricing$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), NULL, 'anon cannot read the pricing projection');
SELECT throws_ok(
  $$SELECT public.catalog_admitted_scopes((SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture))$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), NULL, 'anon cannot discover the scopes it may write into'
);
RESET ROLE;

SELECT ok(
  NOT has_function_privilege('anon', 'private.catalog_settle(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'private.catalog_settle(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb)', 'EXECUTE')
  AND NOT has_function_privilege('service_role', 'private.catalog_settle(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb)', 'EXECUTE')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS catalog_function
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(catalog_function.proacl, pg_catalog.acldefault('f', catalog_function.proowner))
    ) AS privilege
    WHERE catalog_function.oid = 'private.catalog_settle(text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,integer,jsonb)'::regprocedure
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  ),
  'catalog_settle denies EXECUTE to PUBLIC, anon, authenticated, and service_role'
);
SELECT ok(
  NOT has_function_privilege('anon', 'private.catalog_settle_revision(uuid,integer,uuid,uuid,uuid,uuid,uuid,text,text,numeric,text,numeric,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'private.catalog_settle_revision(uuid,integer,uuid,uuid,uuid,uuid,uuid,text,text,numeric,text,numeric,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('service_role', 'private.catalog_settle_revision(uuid,integer,uuid,uuid,uuid,uuid,uuid,text,text,numeric,text,numeric,text,text)', 'EXECUTE')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS catalog_function
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(catalog_function.proacl, pg_catalog.acldefault('f', catalog_function.proowner))
    ) AS privilege
    WHERE catalog_function.oid = 'private.catalog_settle_revision(uuid,integer,uuid,uuid,uuid,uuid,uuid,text,text,numeric,text,numeric,text,text)'::regprocedure
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  ),
  'catalog_settle_revision denies EXECUTE to PUBLIC, anon, authenticated, and service_role'
);

-- ---------------------------------------------------------------------------
-- 3. Own tenant allow, sibling deny, foreign tenant deny, no enumeration
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture));
SELECT is((SELECT count(*)::integer FROM public.product_categories), 4, 'an organization manager sees its own categories across establishments and branches');
SELECT is((SELECT count(*)::integer FROM public.products), 2, 'an organization manager sees its own canonical products');
SELECT is((SELECT count(*)::integer FROM public.product_variants), 1, 'an organization manager sees its own variants');
SELECT is((SELECT count(*)::integer FROM public.sales_channels), 1, 'an organization manager sees only its own channels');
SELECT is((SELECT count(*)::integer FROM public.channel_offers), 2, 'an organization manager sees its own channel offers');
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE organization_id = (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'an organization manager cannot enumerate the categories of a foreign tenant'
);
SELECT is(
  (SELECT count(*)::integer FROM public.products WHERE organization_id = (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture)),
  2,
  'a same-tenant filter narrows the result set without changing the tenant boundary'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories c
    WHERE c.id = (SELECT category_b FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'substituting a foreign identifier into an explicit filter yields no row'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offers o
    WHERE o.sales_channel_id = (SELECT channel_b FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'an offer cannot be reached through a foreign channel identifier'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_variants v
    JOIN public.products p ON p.organization_id = v.organization_id AND p.id = v.product_id
    WHERE v.organization_id = (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'a nested relationship walk from a variant never reaches a foreign product'
);
SELECT is(
  (SELECT count(*)::integer FROM public.channel_offer_pricing),
  2,
  'the pricing projection is bounded by the same catalog policy'
);
SELECT is(
  (SELECT base_price_amount FROM public.channel_offer_pricing WHERE id = (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture)),
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

SELECT throws_ok($$INSERT INTO public.products (organization_id, name) VALUES ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture))$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_products FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot insert a canonical product');
SELECT throws_ok($$UPDATE public.products SET name = (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture) WHERE id = (SELECT product_a FROM public.pgtap_catalog_tenant_fixture)$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_products FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot update a canonical product');
SELECT throws_ok($$DELETE FROM public.products WHERE id = (SELECT product_a FROM public.pgtap_catalog_tenant_fixture)$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_products FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot delete a canonical product');
SELECT throws_ok($$INSERT INTO public.product_categories (organization_id, name) VALUES ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture))$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_product_categories FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot insert a category');
SELECT throws_ok($$UPDATE public.product_categories SET name = (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture) WHERE id = (SELECT category_a FROM public.pgtap_catalog_tenant_fixture)$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_product_categories FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot update a category');
SELECT throws_ok($$INSERT INTO public.product_variants (organization_id, product_id, name) VALUES ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT product_a FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture))$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_product_variants FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot insert a variant');
SELECT throws_ok($$INSERT INTO public.sales_channels (organization_id, channel_key, display_name) VALUES ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), 'unauthorized', (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture))$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_sales_channels FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot insert a channel');
SELECT throws_ok($$UPDATE public.channel_offers SET base_price_amount = 1.0000 WHERE id = (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture)$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_channel_offers FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot rewrite a price');
SELECT throws_ok($$DELETE FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture)$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_channel_offers FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot delete an offer');
SELECT throws_ok($$INSERT INTO public.channel_offer_price_history (organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency, availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id) VALUES ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture), 2, 1.0000, (SELECT currency_brl FROM public.pgtap_catalog_tenant_fixture), (SELECT availability_available FROM public.pgtap_catalog_tenant_fixture), (SELECT visibility_visible FROM public.pgtap_catalog_tenant_fixture), now(), (SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), gen_random_uuid(), gen_random_uuid())$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_price_history FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot forge a price history row');
SELECT throws_ok($$UPDATE public.channel_offer_price_history SET base_price_amount = 1.0000 WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture)$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_price_history FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot rewrite a price history row');
SELECT throws_ok($$DELETE FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture)$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_price_history FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot delete a price history row');
SELECT throws_ok($$INSERT INTO public.catalog_command_receipts (organization_id, idempotency_key, actor_user_id, correlation_id, audit_event_id, action, target_type, target_id) VALUES ((SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture), gen_random_uuid(), (SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), gen_random_uuid(), gen_random_uuid(), 'catalog.product.created', 'product', gen_random_uuid())$$, (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT denied_command_receipts FROM public.pgtap_catalog_tenant_fixture), 'an authenticated client cannot forge a command receipt');

-- ---------------------------------------------------------------------------
-- 5. Commands: own tenant allowed, everything else refused
-- ---------------------------------------------------------------------------

SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Sorbetes', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d1', p_idempotency_key => gen_random_uuid())$$,
  'a manager holding catalog.write creates a category inside its own tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d2', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a manager cannot create a category inside a foreign tenant'
);
-- Scope containment stops at the organization boundary: a branch identifier from another tenant
-- cannot be paired with this tenant's organization.
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => (SELECT branch_b1_1 FROM public.pgtap_catalog_tenant_fixture), p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d3', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a manager cannot pair its own organization with a branch identifier of another tenant'
);
-- An organization scoped manager is authorized for the whole of its own organization, including the
-- rows a narrower role is scoped to.
SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_a2 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => 'Bebidas de A2', p_description => NULL, p_display_order => 40,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d4', p_idempotency_key => gen_random_uuid())$$,
  'an organization manager writes into a single establishment of its own tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000e4', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'an organization manager cannot substitute an establishment of another tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => NULL, p_branch_id => NULL,
    p_parent_category_id => (SELECT category_b FROM public.pgtap_catalog_tenant_fixture),
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d5', p_idempotency_key => gen_random_uuid())$$,
  (SELECT check_violation FROM public.pgtap_catalog_tenant_fixture), 'Category scope must stay inside its parent category scope.',
  'a category cannot be created under a parent category of another tenant'
);
-- The offer contract is a privileged commercial mutation, so the session is upgraded to a fresh
-- two-factor session first. The point of the next assertions is what happens after the factor check
-- passes, so the factor check itself is satisfied rather than being the thing under test here.
SELECT public.pgtap_catalog_assume_session((SELECT user_org_manager FROM public.pgtap_catalog_tenant_fixture), true, true);
SELECT throws_ok(
  $$SELECT public.catalog_create_channel_offer(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => NULL, p_branch_id => NULL,
    p_sales_channel_id => (SELECT channel_a FROM public.pgtap_catalog_tenant_fixture),
    p_product_id => (SELECT product_b FROM public.pgtap_catalog_tenant_fixture), p_product_variant_id => NULL,
    p_title => NULL, p_description => NULL,
    p_base_price_amount => 7.5000, p_base_price_currency => (SELECT currency_brl FROM public.pgtap_catalog_tenant_fixture), p_promotional_price_amount => NULL,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d6',
    p_idempotency_key => '85000000-0000-4000-8000-0000000000e6')$$,
  (SELECT check_violation FROM public.pgtap_catalog_tenant_fixture), 'Channel offer scope must stay inside its canonical product scope.',
  'a channel offer cannot be attached to a canonical product of another tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_variant(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => NULL, p_branch_id => NULL,
    p_product_id => (SELECT product_b FROM public.pgtap_catalog_tenant_fixture), p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture),
    p_correlation_id => '85000000-0000-4000-8000-0000000000d7', p_idempotency_key => gen_random_uuid())$$,
  (SELECT check_violation FROM public.pgtap_catalog_tenant_fixture), 'Product variant scope must stay inside its canonical product scope.',
  'a variant cannot be attached to a canonical product of another tenant'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_category(
    p_category_id => (SELECT category_b FROM public.pgtap_catalog_tenant_fixture), p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture),
    p_description => NULL, p_display_order => 0,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d8', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a foreign category cannot be renamed by substituting its identifier'
);
SELECT throws_ok(
  $$SELECT public.catalog_set_product_archived(
    p_product_id => (SELECT product_b FROM public.pgtap_catalog_tenant_fixture), p_archived => true,
    p_correlation_id => '85000000-0000-4000-8000-0000000000d9', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a foreign product cannot be archived by substituting its identifier'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.products WHERE id = (SELECT product_b FROM public.pgtap_catalog_tenant_fixture)),
  (SELECT active_status FROM public.pgtap_catalog_tenant_fixture),
  'the refused archival left the foreign product untouched'
);

-- ---------------------------------------------------------------------------
-- 6. A narrower scope never sees a tenant-wide row
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT user_branch_manager FROM public.pgtap_catalog_tenant_fixture));

SELECT is((SELECT count(*)::integer FROM public.product_categories), 1, 'a branch manager sees only the categories carrying its branch');
SELECT is((SELECT count(*)::integer FROM public.products), 1, 'a branch manager sees only the products carrying its branch');
SELECT is((SELECT count(*)::integer FROM public.channel_offers), 1, 'a branch manager sees only the offers carrying its branch');
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE id = (SELECT category_a FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'a branch manager cannot see a tenant-wide category, because it cannot know which branch would sell it'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE id = (SELECT category_a_sibling FROM public.pgtap_catalog_tenant_fixture)),
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
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => (SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture), p_parent_category_id => NULL,
    p_name => 'Sorbetes da filial', p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000f1', p_idempotency_key => gen_random_uuid())$$,
  'a branch manager creates a category inside its own granted scope'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => (SELECT branch_a1_2 FROM public.pgtap_catalog_tenant_fixture), p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000f2', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a branch manager cannot substitute a sibling branch identifier'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => '85000000-0000-4000-8000-0000000000f3', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a branch manager cannot widen its scope to the whole organization'
);
SELECT is(
  (SELECT admitted FROM (SELECT count(*) = 1 AS admitted FROM public.catalog_admitted_scopes((SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture))) AS scope),
  true,
  'a branch manager is admitted exactly one write scope, and it is its own branch'
);
SELECT is(
  (SELECT establishment_id FROM public.catalog_admitted_scopes((SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture))),
  (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture),
  'the admitted write scope carries the establishment that contains the branch'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 7. An establishment scope contains every branch in that establishment only
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT user_establishment_manager FROM public.pgtap_catalog_tenant_fixture));
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE branch_id = (SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture)),
  2,
  'an establishment-scoped reader sees all catalog categories in its first branch'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE branch_id = (SELECT branch_a1_2 FROM public.pgtap_catalog_tenant_fixture)),
  1,
  'an establishment-scoped reader also sees catalog categories in its other branch'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE establishment_id = (SELECT establishment_a2 FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'an establishment-scoped reader cannot see a sibling establishment row'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE organization_id = (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'an establishment-scoped reader cannot see a foreign tenant branch row'
);
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories WHERE id = (SELECT category_a FROM public.pgtap_catalog_tenant_fixture)),
  0,
  'an establishment-scoped reader cannot widen to a tenant-wide catalog row'
);
SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => (SELECT branch_a1_1 FROM public.pgtap_catalog_tenant_fixture), p_parent_category_id => NULL,
    p_name => 'Establishment branch one write', p_description => NULL, p_display_order => 30,
    p_correlation_id => gen_random_uuid(), p_idempotency_key => gen_random_uuid())$$,
  'an establishment-scoped writer creates a row in its assigned branch'
);
SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_a1 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => (SELECT branch_a1_2 FROM public.pgtap_catalog_tenant_fixture), p_parent_category_id => NULL,
    p_name => 'Establishment branch two write', p_description => NULL, p_display_order => 30,
    p_correlation_id => gen_random_uuid(), p_idempotency_key => gen_random_uuid())$$,
  'an establishment-scoped writer creates a row in another branch of its assigned establishment'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_a2 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => (SELECT branch_a2_1 FROM public.pgtap_catalog_tenant_fixture), p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => gen_random_uuid(), p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'an establishment-scoped writer cannot create a row in a sibling establishment'
);
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_b FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture),
    p_branch_id => (SELECT branch_b1_1 FROM public.pgtap_catalog_tenant_fixture), p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 30,
    p_correlation_id => gen_random_uuid(), p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'an establishment-scoped writer cannot create a row in a foreign tenant'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 8. A tenant with an empty catalog is still able to create its first row
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ((SELECT user_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), (SELECT authenticated_role FROM public.pgtap_catalog_tenant_fixture), 'gmz007-empty-tenant@example.invalid', now(), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), (SELECT empty_metadata FROM public.pgtap_catalog_tenant_fixture), now(), now());
INSERT INTO public.organizations (id, display_name) VALUES ((SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), 'GMZ-IMPL-007 tenant C');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ((SELECT role_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), 'gmz007-empty-tenant', 'Empty tenant manager');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ((SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), (SELECT role_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), (SELECT role_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture)),
  ((SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), (SELECT role_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT catalog_price_manage FROM public.pgtap_catalog_tenant_fixture));
INSERT INTO public.organization_memberships (id, organization_id, user_id, status)
VALUES ((SELECT membership_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), (SELECT user_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT active_status FROM public.pgtap_catalog_tenant_fixture));
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES ('85000000-0000-4000-8000-000000000045', (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture), (SELECT membership_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT role_empty_tenant FROM public.pgtap_catalog_tenant_fixture), (SELECT organization_scope FROM public.pgtap_catalog_tenant_fixture), NULL, NULL);

-- An empty catalog is the bootstrap case: if the admitted scope were derived from the rows that
-- already exist, this tenant could read its console and then have nothing to write into.
SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT user_empty_tenant FROM public.pgtap_catalog_tenant_fixture));
SELECT is(
  (SELECT count(*)::integer FROM public.product_categories),
  0,
  'a manager of a brand new tenant sees an empty catalog and never enumerates another tenant'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes((SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture))),
  1,
  'a tenant with an empty catalog still has exactly one admitted write scope'
);
SELECT is(
  (SELECT organization_id FROM public.catalog_admitted_scopes((SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture))),
  (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture),
  'the admitted write scope belongs to the calling tenant'
);
SELECT lives_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT establishment_b1 FROM public.pgtap_catalog_tenant_fixture),
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
-- 9. Required capability per command class
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT user_no_capability FROM public.pgtap_catalog_tenant_fixture));
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes((SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture))),
  0,
  'an active membership without any catalog capability admits no write scope'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes((SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture))),
  0,
  'an active membership without catalog.read admits no read scope'
);
SELECT is((SELECT count(*)::integer FROM public.products), 0, 'a member without catalog.read sees no catalog row');
SELECT throws_ok(
  $$SELECT public.catalog_create_category(
    p_organization_id => (SELECT tenant_a FROM public.pgtap_catalog_tenant_fixture),
    p_establishment_id => NULL, p_branch_id => NULL, p_parent_category_id => NULL,
    p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture), p_description => NULL, p_display_order => 0,
    p_correlation_id => '85000000-0000-4000-8000-000000000102', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'an active membership without catalog.write cannot create a category'
);
RESET ROLE;

-- catalog.read is not catalog.write, and catalog.write is not catalog.price.manage: the four
-- capabilities are separately grantable, so a structural editor cannot reprice by inheritance.
SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT user_readonly FROM public.pgtap_catalog_tenant_fixture), true);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes((SELECT catalog_read FROM public.pgtap_catalog_tenant_fixture))),
  1,
  'a catalog reader holds a read scope'
);
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_admitted_scopes((SELECT catalog_write FROM public.pgtap_catalog_tenant_fixture))),
  0,
  'catalog.read alone does not admit a write scope'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_product(
    p_product_id => (SELECT product_a FROM public.pgtap_catalog_tenant_fixture), p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture),
    p_description => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000105', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a catalog reader cannot rename a product'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture),
    p_base_price_amount => 1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000106', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a catalog reader cannot reprice an offer even with a fresh two-factor session'
);
RESET ROLE;

-- A manager of another tenant reaches its own rows and only its own.
SET LOCAL ROLE authenticated;
SELECT public.pgtap_catalog_assume_session((SELECT user_foreign_manager FROM public.pgtap_catalog_tenant_fixture), true);
SELECT is(
  (SELECT count(*)::integer FROM public.products),
  1,
  'the foreign manager sees exactly its own canonical product'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_product(
    p_product_id => (SELECT product_a FROM public.pgtap_catalog_tenant_fixture), p_name => (SELECT unauthorized_label FROM public.pgtap_catalog_tenant_fixture),
    p_description => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000103', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a foreign manager cannot reach a product of another tenant through an update contract'
);
SELECT throws_ok(
  $$SELECT public.catalog_update_channel_offer_price(
    p_offer_id => (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture),
    p_base_price_amount => 1.0000, p_promotional_price_amount => NULL,
    p_correlation_id => '85000000-0000-4000-8000-000000000104', p_idempotency_key => gen_random_uuid())$$,
  (SELECT insufficient_privilege FROM public.pgtap_catalog_tenant_fixture), (SELECT unauthorized_message FROM public.pgtap_catalog_tenant_fixture),
  'a foreign manager cannot reprice an offer of another tenant'
);
RESET ROLE;
SELECT is(
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = (SELECT offer_a FROM public.pgtap_catalog_tenant_fixture)),
  '7.5000',
  'the refused repricing left the original price untouched'
);

SELECT * FROM finish();
ROLLBACK;
