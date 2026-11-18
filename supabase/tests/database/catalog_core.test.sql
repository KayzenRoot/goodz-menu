BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz007_catalog_constants AS
SELECT
  'authenticated'::text AS c_authenticated_role,
  '86000000-0000-4000-8000-000000000001'::uuid AS c_actor_user,
  'active'::text AS c_active_status,
  '85000000-0000-4000-8000-000000000001'::uuid AS c_organization_a,
  '85000000-0000-4000-8000-000000000002'::uuid AS c_organization_b,
  '85000000-0000-4000-8000-000000000003'::uuid AS c_organization_suspended,
  '87000000-0000-4000-8000-000000000001'::uuid AS c_establishment_a1,
  '87000000-0000-4000-8000-000000000003'::uuid AS c_establishment_b1,
  '88000000-0000-4000-8000-000000000001'::uuid AS c_branch_a11,
  '88000000-0000-4000-8000-000000000002'::uuid AS c_branch_a12,
  '89000000-0000-4000-8000-000000000001'::uuid AS c_role_owner,
  'owner'::text AS c_owner_role,
  '89000000-0000-4000-8000-000000000002'::uuid AS c_role_staff,
  'catalog.read'::text AS c_permission_catalog_read,
  'catalog.write'::text AS c_permission_catalog_write,
  'catalog.price.write'::text AS c_permission_catalog_price_write,
  'organization'::text AS c_scope_organization,
  '8c000000-0000-4000-8000-000000000003'::uuid AS c_foreign_category,
  '8c000000-0000-4000-8000-000000000004'::uuid AS c_foreign_product,
  'pickup'::text AS c_channel_pickup,
  'product'::text AS c_target_product,
  'unknown'::text AS c_availability_unknown,
  'public.products'::text AS c_public_products_relation,
  'service_role'::text AS c_service_role,
  'public.catalog_save_product(uuid,uuid,uuid,text,text,text,uuid)'::text AS c_catalog_save_product_signature,
  'EXECUTE'::text AS c_execute_privilege,
  'request.jwt.claims'::text AS c_jwt_claims_setting,
  '{"sub":"86000000-0000-4000-8000-000000000001","role":"authenticated"}'::text AS c_authenticated_jwt_claims,
  '42501'::text AS c_insufficient_privilege,
  'Classic Burger'::text AS c_canonical_product_name,
  'Channel title'::text AS c_channel_title,
  'Channel description'::text AS c_channel_description,
  'branch-one'::text AS c_branch_one_offer_key,
  'audit_event_ids'::text AS c_audit_event_ids_key,
  'branch-two'::text AS c_branch_two_offer_key,
  'P0002'::text AS c_no_data_found,
  '23503'::text AS c_foreign_key_violation,
  '22023'::text AS c_invalid_parameter,
  '8d000000-0000-4000-8000-000000000014'::uuid AS c_price_two_correlation,
  'authorized'::text AS c_reason_authorized,
  '8e000000-0000-4000-8000-000000000001'::uuid AS c_guard_audit_correlation,
  'Catalog item is unavailable.'::text AS c_message_catalog_item_unavailable,
  'Invalid catalog step-up event.'::text AS c_invalid_step_up_message,
  'allow'::text AS c_outcome_allow,
  'price-one'::text AS c_price_one_proof_name,
  'price-audit-failure'::text AS c_price_audit_failure_proof_name;
GRANT SELECT ON TABLE pg_temp.gmz007_catalog_constants TO PUBLIC;
SELECT no_plan();

CREATE TEMP TABLE gmz_catalog_proofs (name text PRIMARY KEY, proof_id uuid NOT NULL);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz_catalog_proofs TO PUBLIC;
CREATE TEMP TABLE gmz_catalog_offers (offer_key text PRIMARY KEY, offer_id uuid UNIQUE NOT NULL, receipt jsonb NOT NULL);
GRANT SELECT, INSERT, UPDATE ON TABLE pg_temp.gmz_catalog_offers TO PUBLIC;

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
VALUES
  ((SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), 'gmz007-owner@example.invalid', now(), '{}', '{}', now(), now()),
  ('86000000-0000-4000-8000-000000000002', (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), 'gmz007-staff@example.invalid', now(), '{}', '{}', now(), now()),
  ('86000000-0000-4000-8000-000000000003', (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), 'gmz007-branch@example.invalid', now(), '{}', '{}', now(), now()),
  ('86000000-0000-4000-8000-000000000004', (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), 'gmz007-foreign@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name, status)
VALUES
  ((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), 'GMZ-IMPL-007 Catalog A', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ((SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), 'GMZ-IMPL-007 Catalog B', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ((SELECT c_organization_suspended FROM pg_temp.gmz007_catalog_constants), 'GMZ-IMPL-007 Suspended', 'suspended');

INSERT INTO public.establishments (id, organization_id, display_name, status)
VALUES
  ((SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), 'Catalog A1', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('87000000-0000-4000-8000-000000000002', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), 'Catalog A2', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ((SELECT c_establishment_b1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), 'Catalog B1', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('87000000-0000-4000-8000-000000000004', (SELECT c_organization_suspended FROM pg_temp.gmz007_catalog_constants), 'Suspended Establishment', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants));

INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
VALUES
  ((SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), 'Catalog A1-1', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ((SELECT c_branch_a12 FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), 'Catalog A1-2', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('88000000-0000-4000-8000-000000000003', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), '87000000-0000-4000-8000-000000000002', 'Catalog A2-1', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('88000000-0000-4000-8000-000000000004', (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_b1 FROM pg_temp.gmz007_catalog_constants), 'Catalog B1-1', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('88000000-0000-4000-8000-000000000005', (SELECT c_organization_suspended FROM pg_temp.gmz007_catalog_constants), '87000000-0000-4000-8000-000000000004', 'Suspended branch', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants));

INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
VALUES
  ((SELECT c_role_owner FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_owner_role FROM pg_temp.gmz007_catalog_constants), 'Catalog Owner'),
  ((SELECT c_role_staff FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), 'staff', 'Catalog Staff'),
  ('89000000-0000-4000-8000-000000000004', (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), (SELECT c_owner_role FROM pg_temp.gmz007_catalog_constants), 'Foreign Catalog Owner');

INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, permission.permission_key
FROM public.tenant_roles AS role
CROSS JOIN LATERAL unnest(ARRAY[
  (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants), (SELECT c_permission_catalog_write FROM pg_temp.gmz007_catalog_constants), (SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants), 'catalog.availability.write'
]::text[]) AS permission(permission_key)
WHERE role.role_key = (SELECT c_owner_role FROM pg_temp.gmz007_catalog_constants)
ON CONFLICT DO NOTHING;

INSERT INTO public.organization_memberships (id, organization_id, user_id, status)
VALUES
  ('8a000000-0000-4000-8000-000000000001', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('8a000000-0000-4000-8000-000000000002', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), '86000000-0000-4000-8000-000000000002', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('8a000000-0000-4000-8000-000000000003', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), '86000000-0000-4000-8000-000000000003', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)),
  ('8a000000-0000-4000-8000-000000000004', (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), '86000000-0000-4000-8000-000000000004', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants));

INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('8b000000-0000-4000-8000-000000000001', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), '8a000000-0000-4000-8000-000000000001', (SELECT c_role_owner FROM pg_temp.gmz007_catalog_constants), (SELECT c_scope_organization FROM pg_temp.gmz007_catalog_constants), NULL, NULL),
  ('8b000000-0000-4000-8000-000000000002', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), '8a000000-0000-4000-8000-000000000002', (SELECT c_role_staff FROM pg_temp.gmz007_catalog_constants), (SELECT c_scope_organization FROM pg_temp.gmz007_catalog_constants), NULL, NULL),
  ('8b000000-0000-4000-8000-000000000003', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), '8a000000-0000-4000-8000-000000000003', (SELECT c_role_staff FROM pg_temp.gmz007_catalog_constants), 'branch', (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants)),
  ('8b000000-0000-4000-8000-000000000004', (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), '8a000000-0000-4000-8000-000000000004', '89000000-0000-4000-8000-000000000004', (SELECT c_scope_organization FROM pg_temp.gmz007_catalog_constants), NULL, NULL);

INSERT INTO public.product_categories (id, organization_id, name, description, status)
VALUES ((SELECT c_foreign_category FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), 'Foreign Category', '', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants));
INSERT INTO public.products (id, organization_id, name, description, status)
VALUES ((SELECT c_foreign_product FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), 'Foreign Product', 'Foreign tenant fixture.', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants));
INSERT INTO public.channel_offers (
  id, organization_id, establishment_id, branch_id, sales_channel_id,
  target_kind, product_id, currency, availability_state, is_visible, status
) VALUES (
  '8c000000-0000-4000-8000-000000000099', (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants),
  (SELECT c_establishment_b1 FROM pg_temp.gmz007_catalog_constants), '88000000-0000-4000-8000-000000000004',
  (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
  (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT c_foreign_product FROM pg_temp.gmz007_catalog_constants), 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants)
);

SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN (
    'product_categories', 'products', 'product_variants', 'sales_channels', 'channel_offers', 'channel_offer_price_history'
  )),
  'all exposed catalog tables enforce row-level security'
);
SELECT ok(
  has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_public_products_relation FROM pg_temp.gmz007_catalog_constants), 'SELECT')
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_public_products_relation FROM pg_temp.gmz007_catalog_constants), 'INSERT')
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_public_products_relation FROM pg_temp.gmz007_catalog_constants), 'UPDATE')
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_public_products_relation FROM pg_temp.gmz007_catalog_constants), 'DELETE')
    AND NOT has_table_privilege((SELECT c_service_role FROM pg_temp.gmz007_catalog_constants), 'public.channel_offers', 'SELECT')
    AND NOT has_table_privilege((SELECT c_service_role FROM pg_temp.gmz007_catalog_constants), 'public.channel_offers', 'INSERT'),
  'ordinary clients receive read-only catalog grants and service role receives no catalog table access'
);
SELECT ok(
  has_function_privilege((SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_catalog_save_product_signature FROM pg_temp.gmz007_catalog_constants), (SELECT c_execute_privilege FROM pg_temp.gmz007_catalog_constants))
    AND NOT has_function_privilege('anon', (SELECT c_catalog_save_product_signature FROM pg_temp.gmz007_catalog_constants), (SELECT c_execute_privilege FROM pg_temp.gmz007_catalog_constants))
    AND NOT has_function_privilege((SELECT c_service_role FROM pg_temp.gmz007_catalog_constants), (SELECT c_catalog_save_product_signature FROM pg_temp.gmz007_catalog_constants), (SELECT c_execute_privilege FROM pg_temp.gmz007_catalog_constants))
    AND has_function_privilege((SELECT c_service_role FROM pg_temp.gmz007_catalog_constants), 'public.append_catalog_step_up_event(uuid,uuid,uuid,uuid,uuid,text[],uuid,text,text)', (SELECT c_execute_privilege FROM pg_temp.gmz007_catalog_constants))
    AND NOT has_function_privilege((SELECT c_authenticated_role FROM pg_temp.gmz007_catalog_constants), 'public.append_catalog_step_up_event(uuid,uuid,uuid,uuid,uuid,text[],uuid,text,text)', (SELECT c_execute_privilege FROM pg_temp.gmz007_catalog_constants)),
  'authenticated user commands and the narrow privileged audit append have separate grants'
);
SELECT ok(
  (SELECT prosecdef AND proconfig @> ARRAY['search_path=""']::text[]
   FROM pg_proc WHERE oid = 'public.catalog_save_offer(uuid,uuid,uuid,uuid,uuid,text,uuid,uuid,text,text,numeric,text,text,boolean,text,uuid,uuid)'::regprocedure),
  'offer command is security definer with an empty search path'
);
SELECT is(
  (SELECT array_agg(channel_key ORDER BY channel_key) FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants)),
  ARRAY['delivery', 'goodz_online', (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)]::text[],
  'each organization receives only the admitted default channel identities'
);
SELECT is(
  (SELECT count(*)::integer FROM public.role_permissions WHERE role_id = (SELECT c_role_owner FROM pg_temp.gmz007_catalog_constants)),
  4,
  'owner role receives the four admitted catalog capabilities'
);
SELECT is(
  (SELECT array_agg(permission_key ORDER BY permission_key) FROM public.role_permissions WHERE role_id = (SELECT c_role_staff FROM pg_temp.gmz007_catalog_constants)),
  ARRAY[(SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants), (SELECT c_permission_catalog_write FROM pg_temp.gmz007_catalog_constants)]::text[],
  'staff role can manage catalog metadata without price or availability authority'
);

SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_jwt_claims FROM pg_temp.gmz007_catalog_constants), true);
SELECT ok(public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'organization owner can read own catalog');
SELECT ok(public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_write FROM pg_temp.gmz007_catalog_constants)), 'organization owner can manage own catalog metadata');
SELECT ok(public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants), (SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants)), 'organization owner can authorize an active branch price mutation');
SELECT ok(NOT public.catalog_has_permission((SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'organization owner cannot enumerate a foreign tenant');
SELECT ok(NOT public.catalog_has_permission((SELECT c_organization_suspended FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'suspended organization cannot authorize catalog access');
SELECT is((SELECT count(*)::integer FROM public.sales_channels WHERE organization_id IN ((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_b FROM pg_temp.gmz007_catalog_constants))), 3, 'RLS hides foreign-tenant channels from organization owner');
SELECT throws_ok(
  $$INSERT INTO public.products (organization_id, name, description) VALUES ((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), 'Direct Write', '')$$,
  (SELECT c_insufficient_privilege FROM pg_temp.gmz007_catalog_constants), NULL, 'authenticated cannot insert catalog truth through the Data API'
);
SELECT throws_ok(
  $$UPDATE public.products SET name = 'Direct Update' WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants)$$,
  (SELECT c_insufficient_privilege FROM pg_temp.gmz007_catalog_constants), NULL, 'authenticated cannot update catalog truth through the Data API'
);
SELECT throws_ok(
  $$DELETE FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants)$$,
  (SELECT c_insufficient_privilege FROM pg_temp.gmz007_catalog_constants), NULL, 'authenticated cannot delete catalog truth through the Data API'
);
SELECT ok(public.catalog_save_category(NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, 'Menu', '', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), '8d000000-0000-4000-8000-000000000001') IS NOT NULL, 'owner creates a canonical category through an audited command');
SELECT ok(public.catalog_save_category(NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.product_categories WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = 'Menu'), 'Burgers', '', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), '8d000000-0000-4000-8000-000000000002') IS NOT NULL, 'owner creates a child category through an audited command');
SELECT throws_ok(
  $$SELECT public.catalog_save_category(NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_foreign_category FROM pg_temp.gmz007_catalog_constants), 'Foreign Parent', '', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), '8d000000-0000-4000-8000-000000000003')$$,
  (SELECT c_foreign_key_violation FROM pg_temp.gmz007_catalog_constants), 'Catalog parent is unavailable.', 'category parent cannot cross tenant scope'
);
SELECT ok(public.catalog_save_product(NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.product_categories WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = 'Burgers'), (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants), 'Canonical product description.', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), '8d000000-0000-4000-8000-000000000004') IS NOT NULL, 'owner creates canonical product name and description');
SELECT throws_ok(
  $$SELECT public.catalog_save_product(NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_foreign_category FROM pg_temp.gmz007_catalog_constants), 'Cross Tenant Product', '', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), '8d000000-0000-4000-8000-000000000005')$$,
  (SELECT c_foreign_key_violation FROM pg_temp.gmz007_catalog_constants), 'Catalog category is unavailable.', 'product cannot reference a foreign tenant category'
);
SELECT ok(public.catalog_save_variant(NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)), 'Large Classic', 'Large', 'Classic', (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), '8d000000-0000-4000-8000-000000000006') IS NOT NULL, 'owner creates a text-labeled product variant');
SELECT throws_ok(
  $$SELECT public.catalog_save_variant(NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_foreign_product FROM pg_temp.gmz007_catalog_constants), 'Foreign Variant', NULL, NULL, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), '8d000000-0000-4000-8000-000000000007')$$,
  (SELECT c_foreign_key_violation FROM pg_temp.gmz007_catalog_constants), 'Catalog product is unavailable.', 'variant cannot reference a foreign tenant product'
);
SELECT lives_ok(
  $$INSERT INTO pg_temp.gmz_catalog_offers (offer_key, offer_id, receipt)
  SELECT (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants), (command.receipt->>'entity_id')::uuid, command.receipt
  FROM (SELECT public.catalog_save_offer(
    NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL,
    '8d000000-0000-4000-8000-000000000008'
  ) AS receipt) AS command$$,
  'owner creates a branch-scoped offer through the authenticated command'
);
RESET ROLE;
SELECT ok(
  jsonb_array_length((SELECT receipt->(SELECT c_audit_event_ids_key FROM pg_temp.gmz007_catalog_constants) FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))) = 1
    AND EXISTS (
      SELECT 1 FROM public.audit_events AS audit
      WHERE audit.id = ((SELECT receipt->(SELECT c_audit_event_ids_key FROM pg_temp.gmz007_catalog_constants)->>0 FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)))::uuid
        AND audit.correlation_id = '8d000000-0000-4000-8000-000000000008'
    ),
  'offer creation returns the persisted audit-event reference'
);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$INSERT INTO pg_temp.gmz_catalog_offers (offer_key, offer_id, receipt)
  SELECT (SELECT c_branch_two_offer_key FROM pg_temp.gmz007_catalog_constants), (command.receipt->>'entity_id')::uuid, command.receipt
  FROM (SELECT public.catalog_save_offer(
    NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a12 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, NULL, NULL, NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL,
    '8d000000-0000-4000-8000-000000000009'
  ) AS receipt) AS command$$,
  'one canonical product supports a separate offer at another branch'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000099', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, NULL, NULL, NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL, '8d000000-0000-4000-8000-000000000012'
  )$$,
  (SELECT c_no_data_found FROM pg_temp.gmz007_catalog_constants), (SELECT c_message_catalog_item_unavailable FROM pg_temp.gmz007_catalog_constants), 'foreign offer ID cannot be substituted into another tenant command'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000098', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, NULL, NULL, NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL, '8d000000-0000-4000-8000-000000000013'
  )$$,
  (SELECT c_no_data_found FROM pg_temp.gmz007_catalog_constants), (SELECT c_message_catalog_item_unavailable FROM pg_temp.gmz007_catalog_constants), 'unused offer ID receives the same unavailable response as a foreign ID'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    NULL, (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, NULL, NULL, 12.50, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL, (SELECT c_price_two_correlation FROM pg_temp.gmz007_catalog_constants)
  )$$,
  (SELECT c_insufficient_privilege FROM pg_temp.gmz007_catalog_constants), 'Create an unavailable draft before changing price or availability.', 'offer creation cannot bypass privileged price and availability confirmation'
);
SELECT is(
  (SELECT product.name || '|' || product.description || '|' || offer.title_override || '|' || offer.description_override
   FROM public.products AS product JOIN public.channel_offers AS offer ON offer.product_id = product.id
   WHERE product.organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND offer.id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))),
  'Classic Burger|Canonical product description.|Channel title|Channel description',
  'channel presentation overrides remain independent from canonical product name and description'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000005', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT c_foreign_product FROM pg_temp.gmz007_catalog_constants), NULL, NULL, NULL, NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL,
    '8d000000-0000-4000-8000-000000000010'
  )$$,
  (SELECT c_foreign_key_violation FROM pg_temp.gmz007_catalog_constants), 'Catalog offer target is unavailable.', 'offer cannot target a foreign tenant product'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000006', (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, NULL, NULL, NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), true, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL, '8d000000-0000-4000-8000-000000000011'
  )$$,
  (SELECT c_invalid_parameter FROM pg_temp.gmz007_catalog_constants), 'Catalog offer input is invalid.', 'unknown availability and missing price cannot be made visible'
);

SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz007_catalog_constants), '{"sub":"86000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT ok(public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants), (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'branch member can read offers in the assigned branch');
SELECT ok(NOT public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a12 FROM pg_temp.gmz007_catalog_constants), (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'branch member cannot read sibling-branch offers');
SELECT ok(NOT public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), NULL, (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'branch permission cannot widen to the entire establishment');
SELECT ok(NOT public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'branch permission cannot widen to unscoped organization data');
SELECT is((SELECT count(*)::integer FROM public.channel_offers WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants)), 1, 'branch-scoped RLS returns only the assigned branch offer');
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_two_offer_key FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT sales_channel_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT product_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))),
    NULL, NULL, NULL, NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL, '8d000000-0000-4000-8000-000000000015'
  )$$,
  (SELECT c_no_data_found FROM pg_temp.gmz007_catalog_constants), (SELECT c_message_catalog_item_unavailable FROM pg_temp.gmz007_catalog_constants), 'sibling-branch offer substitution returns the generic unavailable response'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    '8c000000-0000-4000-8000-000000000098',
    (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT sales_channel_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT product_id FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))),
    NULL, NULL, NULL, NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL, '8d000000-0000-4000-8000-000000000016'
  )$$,
  (SELECT c_no_data_found FROM pg_temp.gmz007_catalog_constants), (SELECT c_message_catalog_item_unavailable FROM pg_temp.gmz007_catalog_constants), 'unknown offer ID returns the same response as the sibling-branch ID'
);

SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz007_catalog_constants), '{"sub":"86000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT ok(public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_read FROM pg_temp.gmz007_catalog_constants)), 'staff can read its organization catalog');
SELECT ok(public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_write FROM pg_temp.gmz007_catalog_constants)), 'staff can manage catalog metadata');
SELECT ok(NOT public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, NULL, (SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants)), 'staff cannot authorize base-price changes');
SELECT ok(NOT public.catalog_has_permission((SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), NULL, NULL, 'catalog.availability.write'), 'staff cannot authorize availability changes');
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), 12.50, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL,
    '8d000000-0000-4000-8000-000000000012'
  )$$,
  (SELECT c_insufficient_privilege FROM pg_temp.gmz007_catalog_constants), 'Catalog authorization is unavailable.', 'staff price mutation is denied even when metadata write is allowed'
);

SET LOCAL ROLE service_role;
SELECT throws_ok(
  $$SELECT public.append_catalog_step_up_event((SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants), (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), ARRAY[(SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants)], (SELECT c_guard_audit_correlation FROM pg_temp.gmz007_catalog_constants), NULL, (SELECT c_reason_authorized FROM pg_temp.gmz007_catalog_constants))$$,
  (SELECT c_invalid_parameter FROM pg_temp.gmz007_catalog_constants), (SELECT c_invalid_step_up_message FROM pg_temp.gmz007_catalog_constants), 'privileged proof rejects a null outcome'
);
SELECT throws_ok(
  $$SELECT public.append_catalog_step_up_event((SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants), (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), ARRAY[(SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants)], (SELECT c_guard_audit_correlation FROM pg_temp.gmz007_catalog_constants), (SELECT c_outcome_allow FROM pg_temp.gmz007_catalog_constants), NULL)$$,
  (SELECT c_invalid_parameter FROM pg_temp.gmz007_catalog_constants), (SELECT c_invalid_step_up_message FROM pg_temp.gmz007_catalog_constants), 'privileged proof rejects a null reason code'
);
SELECT throws_ok(
  $$SELECT public.append_catalog_step_up_event((SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants), (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), ARRAY[NULL::text], (SELECT c_guard_audit_correlation FROM pg_temp.gmz007_catalog_constants), (SELECT c_outcome_allow FROM pg_temp.gmz007_catalog_constants), (SELECT c_reason_authorized FROM pg_temp.gmz007_catalog_constants))$$,
  (SELECT c_invalid_parameter FROM pg_temp.gmz007_catalog_constants), (SELECT c_invalid_step_up_message FROM pg_temp.gmz007_catalog_constants), 'privileged proof rejects null permission elements'
);
INSERT INTO pg_temp.gmz_catalog_proofs (name, proof_id)
SELECT (SELECT c_price_one_proof_name FROM pg_temp.gmz007_catalog_constants), public.append_catalog_step_up_event(
  (SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
  (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), ARRAY[(SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants)],
  (SELECT c_guard_audit_correlation FROM pg_temp.gmz007_catalog_constants), (SELECT c_outcome_allow FROM pg_temp.gmz007_catalog_constants), (SELECT c_reason_authorized FROM pg_temp.gmz007_catalog_constants)
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_jwt_claims FROM pg_temp.gmz007_catalog_constants), true);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), 12.50, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL,
    '8d000000-0000-4000-8000-000000000013'
  )$$,
  (SELECT c_insufficient_privilege FROM pg_temp.gmz007_catalog_constants), 'Privileged catalog confirmation is unavailable.', 'price mutation requires a one-use Admin Guard proof'
);
UPDATE pg_temp.gmz_catalog_offers
SET receipt = public.catalog_save_offer(
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
  (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
  (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
  (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
  NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), 12.50, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants),
  (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = (SELECT c_price_one_proof_name FROM pg_temp.gmz007_catalog_constants)), (SELECT c_price_two_correlation FROM pg_temp.gmz007_catalog_constants)
)
WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants);
RESET ROLE;
SELECT ok(
  jsonb_array_length((SELECT receipt->(SELECT c_audit_event_ids_key FROM pg_temp.gmz007_catalog_constants) FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))) = 1
    AND EXISTS (
      SELECT 1 FROM public.audit_events AS audit
      WHERE audit.id = ((SELECT receipt->(SELECT c_audit_event_ids_key FROM pg_temp.gmz007_catalog_constants)->>0 FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)))::uuid
        AND audit.correlation_id = (SELECT c_price_two_correlation FROM pg_temp.gmz007_catalog_constants)
    ),
  'price update returns the persisted material audit-event reference'
);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))), 1, 'first price update writes exactly one history version');
SELECT is((SELECT amount FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)) AND version = 1), 12.50::numeric, 'history version one stores the exact initial price');
RESET ROLE;
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), 15.00, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants),
    (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = (SELECT c_price_one_proof_name FROM pg_temp.gmz007_catalog_constants)), '8d000000-0000-4000-8000-000000000015'
  )$$,
  (SELECT c_insufficient_privilege FROM pg_temp.gmz007_catalog_constants), 'Privileged catalog confirmation is unavailable.', 'one privileged proof cannot be replayed'
);
SELECT is((SELECT base_price FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))), 12.50::numeric, 'failed proof replay does not change the offer price');
SELECT throws_ok(
  $$UPDATE public.channel_offer_price_history SET amount = 99.00 WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))$$,
  '55000', 'Catalog price history is immutable.', 'price history rows cannot be rewritten'
);
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO pg_temp.gmz_catalog_proofs (name, proof_id)
SELECT 'price-two', public.append_catalog_step_up_event(
  (SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
  (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), ARRAY[(SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants)],
  '8e000000-0000-4000-8000-000000000002', (SELECT c_outcome_allow FROM pg_temp.gmz007_catalog_constants), (SELECT c_reason_authorized FROM pg_temp.gmz007_catalog_constants)
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT public.catalog_save_offer(
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
  (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
  (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
  (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
  NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), 15.00, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants),
  (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = 'price-two'), '8d000000-0000-4000-8000-000000000016'
);
SELECT is(
  (SELECT array_agg(amount ORDER BY version) FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))),
  ARRAY[12.50::numeric, 15.00::numeric],
  'price changes append a reconstructable exact history'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), NULL, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants), NULL,
    '8d000000-0000-4000-8000-000000000017'
  )$$,
  '23514', 'A recorded offer price cannot be cleared.', 'price history cannot be erased by clearing the current price'
);
SELECT throws_ok(
  $$SELECT public.catalog_save_product(
    (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants), (SELECT category_id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants), 'Canonical product description.', 'archived', '8d000000-0000-4000-8000-000000000018'
  )$$,
  '23514', 'Archive variants and offers first.', 'product archive cannot strand active child identity or offers'
);
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.audit_events WHERE action = 'catalog.offer.commercial_updated' AND target_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))), 2, 'successful price changes each append one material audit event');
SELECT is((SELECT count(*)::integer FROM public.audit_events WHERE action = 'catalog.offer.created' AND target_id IN ((SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_two_offer_key FROM pg_temp.gmz007_catalog_constants)))), 2, 'both branch-specific offers have durable creation audit events');

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
SELECT (SELECT c_price_audit_failure_proof_name FROM pg_temp.gmz007_catalog_constants), public.append_catalog_step_up_event(
  (SELECT c_actor_user FROM pg_temp.gmz007_catalog_constants), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
  (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
  (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), ARRAY[(SELECT c_permission_catalog_price_write FROM pg_temp.gmz007_catalog_constants)],
  '8e000000-0000-4000-8000-000000000003', (SELECT c_outcome_allow FROM pg_temp.gmz007_catalog_constants), (SELECT c_reason_authorized FROM pg_temp.gmz007_catalog_constants)
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz007_catalog_constants), (SELECT c_authenticated_jwt_claims FROM pg_temp.gmz007_catalog_constants), true);
SELECT throws_ok(
  $$SELECT public.catalog_save_offer(
    (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants)), (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants),
    (SELECT c_establishment_a1 FROM pg_temp.gmz007_catalog_constants), (SELECT c_branch_a11 FROM pg_temp.gmz007_catalog_constants),
    (SELECT id FROM public.sales_channels WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND channel_key = (SELECT c_channel_pickup FROM pg_temp.gmz007_catalog_constants)),
    (SELECT c_target_product FROM pg_temp.gmz007_catalog_constants), (SELECT id FROM public.products WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz007_catalog_constants) AND name = (SELECT c_canonical_product_name FROM pg_temp.gmz007_catalog_constants)),
    NULL, (SELECT c_channel_title FROM pg_temp.gmz007_catalog_constants), (SELECT c_channel_description FROM pg_temp.gmz007_catalog_constants), 18.00, 'BRL', (SELECT c_availability_unknown FROM pg_temp.gmz007_catalog_constants), false, (SELECT c_active_status FROM pg_temp.gmz007_catalog_constants),
    (SELECT proof_id FROM pg_temp.gmz_catalog_proofs WHERE name = (SELECT c_price_audit_failure_proof_name FROM pg_temp.gmz007_catalog_constants)), '8d000000-0000-4000-8000-000000000019'
  )$$,
  'P0001', 'Injected catalog audit failure.', 'failed required audit prevents the privileged price mutation'
);
SELECT is((SELECT base_price FROM public.channel_offers WHERE id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))), 15.00::numeric, 'audit failure rolls back the offer price update');
SELECT is((SELECT count(*)::integer FROM public.channel_offer_price_history WHERE channel_offer_id = (SELECT offer_id FROM pg_temp.gmz_catalog_offers WHERE offer_key = (SELECT c_branch_one_offer_key FROM pg_temp.gmz007_catalog_constants))), 2, 'audit failure rolls back the price-history append');
RESET ROLE;
SELECT is(
  (SELECT count(*)::integer FROM private.catalog_step_up_consumptions AS consumption
   JOIN public.audit_events AS event_row ON event_row.id = consumption.guard_event_id
   WHERE event_row.metadata->>'step_up_proof_id' = (SELECT proof_id::text FROM pg_temp.gmz_catalog_proofs WHERE name = (SELECT c_price_audit_failure_proof_name FROM pg_temp.gmz007_catalog_constants))),
  0,
  'audit failure rolls back one-use proof consumption'
);

SELECT * FROM finish();
ROLLBACK;
