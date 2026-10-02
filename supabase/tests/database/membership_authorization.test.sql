BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz003_test_constants AS
SELECT
  '20000000-0000-4000-8000-000000000001'::uuid AS c_user_org,
  '20000000-0000-4000-8000-000000000008'::uuid AS c_user_establishment,
  '20000000-0000-4000-8000-000000000003'::uuid AS c_user_no_membership,
  '10000000-0000-4000-8000-000000000001'::uuid AS c_organization_a,
  '10000000-0000-4000-8000-000000000002'::uuid AS c_organization_b,
  '10000000-0000-4000-8000-000000000003'::uuid AS c_establishment_a1,
  '10000000-0000-4000-8000-000000000004'::uuid AS c_establishment_a2,
  '10000000-0000-4000-8000-000000000005'::uuid AS c_establishment_b1,
  '10000000-0000-4000-8000-000000000006'::uuid AS c_branch_a11,
  '10000000-0000-4000-8000-000000000008'::uuid AS c_branch_a21,
  '10000000-0000-4000-8000-000000000009'::uuid AS c_branch_b11,
  '30000000-0000-4000-8000-000000000001'::uuid AS c_role_org,
  '30000000-0000-4000-8000-000000000002'::uuid AS c_role_branch,
  '30000000-0000-4000-8000-000000000003'::uuid AS c_role_empty,
  '30000000-0000-4000-8000-000000000004'::uuid AS c_role_foreign,
  '30000000-0000-4000-8000-000000000005'::uuid AS c_role_establishment,
  '40000000-0000-4000-8000-000000000001'::uuid AS c_membership_org,
  '40000000-0000-4000-8000-000000000002'::uuid AS c_membership_branch,
  '40000000-0000-4000-8000-000000000003'::uuid AS c_membership_empty,
  '40000000-0000-4000-8000-000000000007'::uuid AS c_membership_establishment,
  '23503'::text AS c_fk_violation,
  '23514'::text AS c_check_violation,
  '42501'::text AS c_insufficient_privilege,
  'active'::text AS c_active_status,
  'anon'::text AS c_anon_role,
  'authenticated'::text AS c_authenticated_role,
  'DELETE'::text AS c_delete_privilege,
  'INSERT'::text AS c_insert_privilege,
  'SELECT'::text AS c_select_privilege,
  'UPDATE'::text AS c_update_privilege,
  'organization'::text AS c_organization_scope,
  'establishment'::text AS c_establishment_scope,
  'organization_memberships'::text AS c_membership_table_name,
  'organizations'::text AS c_organizations_table_name,
  'establishments'::text AS c_establishments_table_name,
  'branches'::text AS c_branches_table_name,
  'private'::text AS c_private_schema_name,
  'public'::text AS c_public_schema_name,
  'public.branches'::regclass AS c_branches_relation,
  'public.establishments'::regclass AS c_establishments_relation,
  'public.membership_roles'::regclass AS c_membership_roles_relation,
  'public.organization_memberships'::regclass AS c_memberships_relation,
  'public.organizations'::regclass AS c_organizations_relation,
  'public.permissions'::regclass AS c_permissions_relation,
  'public.role_permissions'::regclass AS c_role_permissions_relation,
  'public.tenant_roles'::regclass AS c_tenant_roles_relation,
  'request.jwt.claims'::text AS c_jwt_claims_setting,
  'tenant.hierarchy.read'::text AS c_hierarchy_read_permission;

GRANT SELECT ON TABLE pg_temp.gmz003_test_constants TO PUBLIC;

SELECT no_plan();

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
VALUES
  ((SELECT c_user_org FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-org@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-branch@example.invalid', now(), '{}', '{}', now(), now()),
  ((SELECT c_user_establishment FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-establishment@example.invalid', now(), '{}', '{}', now(), now()),
  ((SELECT c_user_no_membership FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-nomembership@example.invalid', now(), '{}', '{"organization_id":"10000000-0000-4000-8000-000000000001","role":"owner","permissions":["tenant.hierarchy.read"]}', now(), now()),
  ('20000000-0000-4000-8000-000000000004', (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-nopermission@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000005', (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-suspended@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000006', (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-revoked@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000007', (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'gmz003-foreign@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name)
VALUES
  ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'Authorization Organization A'),
  ((SELECT c_organization_b FROM pg_temp.gmz003_test_constants), 'Authorization Organization B');

INSERT INTO public.establishments (id, organization_id, display_name)
VALUES
  ((SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'Authorization Establishment A1'),
  ((SELECT c_establishment_a2 FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'Authorization Establishment A2'),
  ((SELECT c_establishment_b1 FROM pg_temp.gmz003_test_constants), (SELECT c_organization_b FROM pg_temp.gmz003_test_constants), 'Authorization Establishment B1');

INSERT INTO public.branches (id, organization_id, establishment_id, display_name)
VALUES
  ((SELECT c_branch_a11 FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), 'Authorization Branch A1-1'),
  ('10000000-0000-4000-8000-000000000007', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), 'Authorization Branch A1-2'),
  ('10000000-0000-4000-8000-000000000008', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_a2 FROM pg_temp.gmz003_test_constants), 'Authorization Branch A2-1'),
  ((SELECT c_branch_b11 FROM pg_temp.gmz003_test_constants), (SELECT c_organization_b FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_b1 FROM pg_temp.gmz003_test_constants), 'Authorization Branch B1-1');

SELECT has_table((SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants), (SELECT c_membership_table_name FROM pg_temp.gmz003_test_constants), 'organization memberships table exists');
SELECT has_table((SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants), 'tenant_roles', 'tenant roles table exists');
SELECT has_table((SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants), 'permissions', 'canonical permissions table exists');
SELECT has_table((SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants), 'role_permissions', 'role permission mapping table exists');
SELECT has_table((SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants), 'membership_roles', 'membership role scope table exists');

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = (SELECT c_memberships_relation FROM pg_temp.gmz003_test_constants)::regclass
      AND confrelid = 'auth.users'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%user_id%auth.users%id%'
  ),
  'organization membership references Supabase Auth identity without local credentials'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants)
      AND table_name IN ((SELECT c_membership_table_name FROM pg_temp.gmz003_test_constants), 'tenant_roles', 'permissions', 'role_permissions', 'membership_roles')
      AND column_name IN ('password', 'encrypted_password', 'credential', 'secret')
  ),
  'authorization model does not duplicate Auth credentials'
);
SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants) AND table_name = (SELECT c_membership_table_name FROM pg_temp.gmz003_test_constants) AND column_name = 'default_establishment_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants) AND table_name = (SELECT c_membership_table_name FROM pg_temp.gmz003_test_constants) AND column_name = 'default_branch_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants) AND table_name = (SELECT c_membership_table_name FROM pg_temp.gmz003_test_constants) AND column_name = 'accepted_at')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants) AND table_name = (SELECT c_membership_table_name FROM pg_temp.gmz003_test_constants) AND column_name = 'revoked_at'),
  'membership keeps optional tenant-bound defaults and acceptance/revocation lifecycle data'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = (SELECT c_permissions_relation FROM pg_temp.gmz003_test_constants)::regclass
      AND contype = 'p'
      AND cardinality(conkey) = 1
      AND conkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = (SELECT c_permissions_relation FROM pg_temp.gmz003_test_constants)::regclass AND attname = 'permission_key'
      )
  ),
  'stable permission key is the permission identity'
);
SELECT is(
  (SELECT array_agg(permission_key ORDER BY permission_key) FROM public.permissions),
  ARRAY[(SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants)]::text[],
  'only the admitted tenant hierarchy read permission is catalogued'
);
SELECT ok(
  to_regclass('public.platform_admin_memberships') IS NULL
    AND to_regclass('public.platform_roles') IS NULL,
  'tenant RBAC does not add a platform authority plane'
);

SELECT ok(
  (SELECT bool_and(relrowsecurity)
   FROM pg_class
   WHERE oid = ANY(ARRAY[
     (SELECT c_organizations_relation FROM pg_temp.gmz003_test_constants)::regclass,
     (SELECT c_establishments_relation FROM pg_temp.gmz003_test_constants)::regclass,
     (SELECT c_branches_relation FROM pg_temp.gmz003_test_constants)::regclass,
     (SELECT c_memberships_relation FROM pg_temp.gmz003_test_constants)::regclass,
     (SELECT c_tenant_roles_relation FROM pg_temp.gmz003_test_constants)::regclass,
     (SELECT c_permissions_relation FROM pg_temp.gmz003_test_constants)::regclass,
     (SELECT c_role_permissions_relation FROM pg_temp.gmz003_test_constants)::regclass,
     (SELECT c_membership_roles_relation FROM pg_temp.gmz003_test_constants)::regclass
   ])),
  'all tenant and authorization tables retain row level security'
);
SELECT ok(
  bool_and(
    NOT has_table_privilege(access.role_name, access.table_name, privilege.privilege_name)
    AND (
      privilege.privilege_name NOT IN ((SELECT c_select_privilege FROM pg_temp.gmz003_test_constants), (SELECT c_insert_privilege FROM pg_temp.gmz003_test_constants), (SELECT c_update_privilege FROM pg_temp.gmz003_test_constants), 'REFERENCES')
      OR NOT has_any_column_privilege(access.role_name, access.table_name, privilege.privilege_name)
    )
  ),
  'anon and authenticated have no privilege on membership and RBAC tables'
)
FROM (VALUES
  ((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), (SELECT c_memberships_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_memberships_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), (SELECT c_tenant_roles_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_tenant_roles_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), (SELECT c_permissions_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_permissions_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), (SELECT c_role_permissions_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_role_permissions_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), (SELECT c_membership_roles_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_membership_roles_relation FROM pg_temp.gmz003_test_constants))
) AS access(role_name, table_name)
CROSS JOIN (VALUES ((SELECT c_select_privilege FROM pg_temp.gmz003_test_constants)), ((SELECT c_insert_privilege FROM pg_temp.gmz003_test_constants)), ((SELECT c_update_privilege FROM pg_temp.gmz003_test_constants)), ((SELECT c_delete_privilege FROM pg_temp.gmz003_test_constants)), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS privilege(privilege_name);

SELECT ok(
  bool_and(has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), hierarchy.table_name, (SELECT c_select_privilege FROM pg_temp.gmz003_test_constants)))
    AND bool_and(NOT has_table_privilege((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), hierarchy.table_name, (SELECT c_select_privilege FROM pg_temp.gmz003_test_constants))),
  'only authenticated receives the hierarchy SELECT grant'
)
FROM (VALUES
  ((SELECT c_organizations_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_establishments_relation FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_branches_relation FROM pg_temp.gmz003_test_constants))
) AS hierarchy(table_name);
SELECT ok(
  NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_organizations_relation FROM pg_temp.gmz003_test_constants), (SELECT c_insert_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_organizations_relation FROM pg_temp.gmz003_test_constants), (SELECT c_update_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_organizations_relation FROM pg_temp.gmz003_test_constants), (SELECT c_delete_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_establishments_relation FROM pg_temp.gmz003_test_constants), (SELECT c_insert_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_establishments_relation FROM pg_temp.gmz003_test_constants), (SELECT c_update_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_establishments_relation FROM pg_temp.gmz003_test_constants), (SELECT c_delete_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_branches_relation FROM pg_temp.gmz003_test_constants), (SELECT c_insert_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_branches_relation FROM pg_temp.gmz003_test_constants), (SELECT c_update_privilege FROM pg_temp.gmz003_test_constants))
    AND NOT has_table_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_branches_relation FROM pg_temp.gmz003_test_constants), (SELECT c_delete_privilege FROM pg_temp.gmz003_test_constants)),
  'authenticated cannot write the tenant hierarchy'
);
SELECT is(
  (SELECT count(*)::integer
   FROM (
     SELECT tablename FROM pg_policies
     WHERE schemaname = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants)
       AND tablename IN ((SELECT c_organizations_table_name FROM pg_temp.gmz003_test_constants), (SELECT c_establishments_table_name FROM pg_temp.gmz003_test_constants), (SELECT c_branches_table_name FROM pg_temp.gmz003_test_constants))
       AND cmd = (SELECT c_select_privilege FROM pg_temp.gmz003_test_constants)
       AND roles = ARRAY[(SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants)]::name[]
     GROUP BY tablename
     HAVING count(*) = 1
   ) AS one_policy_per_table),
  3,
  'hierarchy has exactly one authenticated SELECT policy per table'
);
SELECT is(
  (SELECT count(*)::integer FROM pg_policies
   WHERE schemaname = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants)
     AND tablename IN ((SELECT c_organizations_table_name FROM pg_temp.gmz003_test_constants), (SELECT c_establishments_table_name FROM pg_temp.gmz003_test_constants), (SELECT c_branches_table_name FROM pg_temp.gmz003_test_constants))
     AND cmd <> (SELECT c_select_privilege FROM pg_temp.gmz003_test_constants)),
  0,
  'hierarchy has no authenticated write policy'
);
SELECT ok(
  NOT has_schema_privilege((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), (SELECT c_private_schema_name FROM pg_temp.gmz003_test_constants), 'USAGE')
    AND has_schema_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), (SELECT c_private_schema_name FROM pg_temp.gmz003_test_constants), 'USAGE'),
  'private authorization helper schema is closed to anon and available only to authenticated policies'
);
SELECT ok(
  has_function_privilege((SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants), 'private.can_read_tenant_hierarchy(uuid,uuid,uuid)', 'EXECUTE')
    AND NOT has_function_privilege((SELECT c_anon_role FROM pg_temp.gmz003_test_constants), 'private.can_read_tenant_hierarchy(uuid,uuid,uuid)', 'EXECUTE'),
  'only authenticated can execute the narrowly scoped private RLS helper'
);
SELECT ok(
  (SELECT prosecdef
     AND proconfig @> ARRAY['search_path=""']::text[]
     AND owner.rolbypassrls
   FROM pg_proc AS function_row
   JOIN pg_namespace AS function_schema ON function_schema.oid = function_row.pronamespace
   JOIN pg_roles AS owner ON owner.oid = function_row.proowner
   WHERE function_schema.nspname = (SELECT c_private_schema_name FROM pg_temp.gmz003_test_constants)
     AND function_row.proname = 'can_read_tenant_hierarchy'
     AND pg_get_function_identity_arguments(function_row.oid) = 'p_organization_id uuid, p_establishment_id uuid, p_branch_id uuid'),
  'RLS helper is security definer with empty search path and a bypass-RLS owner'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_proc AS function_row
    JOIN pg_namespace AS function_schema ON function_schema.oid = function_row.pronamespace
    WHERE function_schema.nspname = (SELECT c_private_schema_name FROM pg_temp.gmz003_test_constants)
      AND function_row.proname = 'can_read_tenant_hierarchy'
      AND pg_get_functiondef(function_row.oid) ILIKE '%user_metadata%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = (SELECT c_public_schema_name FROM pg_temp.gmz003_test_constants)
      AND tablename IN ((SELECT c_organizations_table_name FROM pg_temp.gmz003_test_constants), (SELECT c_establishments_table_name FROM pg_temp.gmz003_test_constants), (SELECT c_branches_table_name FROM pg_temp.gmz003_test_constants))
      AND coalesce(qual, '') || coalesce(with_check, '') ILIKE '%user_metadata%'
  ),
  'authorization helper and hierarchy policies do not trust user metadata'
);

INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
VALUES
  ((SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'hierarchy-reader', 'Hierarchy Reader'),
  ((SELECT c_role_branch FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'branch-reader', 'Branch Reader'),
  ((SELECT c_role_establishment FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'establishment-reader', 'Establishment Reader'),
  ((SELECT c_role_empty FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'empty-role', 'No Permission'),
  ((SELECT c_role_foreign FROM pg_temp.gmz003_test_constants), (SELECT c_organization_b FROM pg_temp.gmz003_test_constants), 'foreign-reader', 'Foreign Hierarchy Reader');

INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
VALUES
  ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_role_branch FROM pg_temp.gmz003_test_constants), (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_role_establishment FROM pg_temp.gmz003_test_constants), (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants)),
  ((SELECT c_organization_b FROM pg_temp.gmz003_test_constants), (SELECT c_role_foreign FROM pg_temp.gmz003_test_constants), (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants));

SELECT throws_ok(
  $$UPDATE public.permissions SET permission_key = 'tenant.hierarchy.enumerate' WHERE permission_key = (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants)$$,
  (SELECT c_check_violation FROM pg_temp.gmz003_test_constants), NULL,
  'permission key identity cannot be updated'
);
SELECT throws_ok(
  $$DELETE FROM public.permissions WHERE permission_key = (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants)$$,
  (SELECT c_check_violation FROM pg_temp.gmz003_test_constants), NULL,
  'permission catalog entries cannot be deleted'
);

INSERT INTO public.organization_memberships (
  id, organization_id, user_id, status,
  default_establishment_id, default_branch_id, revoked_at
)
VALUES
  ((SELECT c_membership_org FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_user_org FROM pg_temp.gmz003_test_constants), (SELECT c_active_status FROM pg_temp.gmz003_test_constants), NULL, NULL, NULL),
  ((SELECT c_membership_branch FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), '20000000-0000-4000-8000-000000000002', (SELECT c_active_status FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), (SELECT c_branch_a11 FROM pg_temp.gmz003_test_constants), NULL),
  ((SELECT c_membership_establishment FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_user_establishment FROM pg_temp.gmz003_test_constants), (SELECT c_active_status FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), NULL, NULL),
  ((SELECT c_membership_empty FROM pg_temp.gmz003_test_constants), (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), '20000000-0000-4000-8000-000000000004', (SELECT c_active_status FROM pg_temp.gmz003_test_constants), NULL, NULL, NULL),
  ('40000000-0000-4000-8000-000000000004', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), '20000000-0000-4000-8000-000000000005', 'suspended', NULL, NULL, NULL),
  ('40000000-0000-4000-8000-000000000005', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), '20000000-0000-4000-8000-000000000006', 'revoked', NULL, NULL, now()),
  ('40000000-0000-4000-8000-000000000006', (SELECT c_organization_b FROM pg_temp.gmz003_test_constants), '20000000-0000-4000-8000-000000000007', (SELECT c_active_status FROM pg_temp.gmz003_test_constants), NULL, NULL, NULL);

SELECT throws_ok(
  $$INSERT INTO public.organization_memberships (organization_id, user_id, default_establishment_id)
    VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_user_no_membership FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_b1 FROM pg_temp.gmz003_test_constants))$$,
  (SELECT c_fk_violation FROM pg_temp.gmz003_test_constants), NULL,
  'membership default establishment cannot cross organizations'
);
SELECT throws_ok(
  $$INSERT INTO public.organization_memberships (organization_id, user_id, default_branch_id)
    VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_user_no_membership FROM pg_temp.gmz003_test_constants), (SELECT c_branch_a11 FROM pg_temp.gmz003_test_constants))$$,
  (SELECT c_check_violation FROM pg_temp.gmz003_test_constants), NULL,
  'membership default branch requires its containing establishment'
);
SELECT throws_ok(
  $$INSERT INTO public.organization_memberships (organization_id, user_id, status)
    VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_user_no_membership FROM pg_temp.gmz003_test_constants), 'pending')$$,
  (SELECT c_check_violation FROM pg_temp.gmz003_test_constants), NULL,
  'membership rejects lifecycle states outside the admitted active suspended revoked set'
);

INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('50000000-0000-4000-8000-000000000001', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_org FROM pg_temp.gmz003_test_constants), (SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), NULL, NULL),
  ('50000000-0000-4000-8000-000000000002', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_branch FROM pg_temp.gmz003_test_constants), (SELECT c_role_branch FROM pg_temp.gmz003_test_constants), 'branch', (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), (SELECT c_branch_a11 FROM pg_temp.gmz003_test_constants)),
  ('50000000-0000-4000-8000-000000000008', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_establishment FROM pg_temp.gmz003_test_constants), (SELECT c_role_establishment FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_scope FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), NULL),
  ('50000000-0000-4000-8000-000000000003', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_branch FROM pg_temp.gmz003_test_constants), (SELECT c_role_empty FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), NULL, NULL),
  ('50000000-0000-4000-8000-000000000004', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_empty FROM pg_temp.gmz003_test_constants), (SELECT c_role_empty FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), NULL, NULL),
  ('50000000-0000-4000-8000-000000000005', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), '40000000-0000-4000-8000-000000000004', (SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), NULL, NULL),
  ('50000000-0000-4000-8000-000000000006', (SELECT c_organization_a FROM pg_temp.gmz003_test_constants), '40000000-0000-4000-8000-000000000005', (SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), NULL, NULL),
  ('50000000-0000-4000-8000-000000000007', (SELECT c_organization_b FROM pg_temp.gmz003_test_constants), '40000000-0000-4000-8000-000000000006', (SELECT c_role_foreign FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), NULL, NULL);

SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_org FROM pg_temp.gmz003_test_constants), (SELECT c_role_org FROM pg_temp.gmz003_test_constants), 'establishment', (SELECT c_establishment_b1 FROM pg_temp.gmz003_test_constants), NULL)$$,
  (SELECT c_fk_violation FROM pg_temp.gmz003_test_constants), NULL,
  'membership role cannot be scoped to another organization establishment'
);
SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_org FROM pg_temp.gmz003_test_constants), (SELECT c_role_org FROM pg_temp.gmz003_test_constants), 'branch', (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), (SELECT c_branch_b11 FROM pg_temp.gmz003_test_constants))$$,
  (SELECT c_fk_violation FROM pg_temp.gmz003_test_constants), NULL,
  'membership role cannot substitute a foreign organization branch'
);
SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ((SELECT c_organization_b FROM pg_temp.gmz003_test_constants), (SELECT c_membership_org FROM pg_temp.gmz003_test_constants), (SELECT c_role_foreign FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), NULL, NULL)$$,
  (SELECT c_fk_violation FROM pg_temp.gmz003_test_constants), NULL,
  'membership role cannot combine a membership and role from different organizations'
);
SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_org FROM pg_temp.gmz003_test_constants), (SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants), (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants), NULL)$$,
  (SELECT c_check_violation FROM pg_temp.gmz003_test_constants), NULL,
  'organization scope rejects narrower resource identifiers'
);
SELECT throws_ok(
  $$INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
    VALUES ((SELECT c_organization_b FROM pg_temp.gmz003_test_constants), (SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants))$$,
  (SELECT c_fk_violation FROM pg_temp.gmz003_test_constants), NULL,
  'role permission mapping cannot move a tenant role to another organization'
);

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.organizations$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'anon cannot query organizations');
SELECT throws_ok($$SELECT * FROM public.establishments$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'anon cannot query establishments');
SELECT throws_ok($$SELECT * FROM public.branches$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'anon cannot query branches');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '', true);
SELECT is((SELECT count(*)::integer FROM public.organizations), 0, 'authenticated request without identity is denied');

SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated","user_metadata":{"organization_id":"10000000-0000-4000-8000-000000000001","role":"owner","permissions":["tenant.hierarchy.read"]}}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 0, 'user-editable metadata without canonical membership grants nothing');

SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 1, 'active organization-scoped role reads its organization');
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_b FROM pg_temp.gmz003_test_constants)), 0, 'organization-scoped role cannot read a foreign tenant');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 2, 'organization-scoped role reads its establishments');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE organization_id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 3, 'organization-scoped role reads every admitted descendant branch');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = (SELECT c_branch_b11 FROM pg_temp.gmz003_test_constants)), 0, 'organization-scoped role cannot substitute a foreign branch id');
SELECT throws_ok($$INSERT INTO public.organization_memberships (organization_id, user_id, status) VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_user_org FROM pg_temp.gmz003_test_constants), (SELECT c_active_status FROM pg_temp.gmz003_test_constants))$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot insert membership');
SELECT throws_ok($$UPDATE public.organization_memberships SET status = 'suspended' WHERE id = (SELECT c_membership_org FROM pg_temp.gmz003_test_constants)$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot update membership');
SELECT throws_ok($$DELETE FROM public.organization_memberships WHERE id = (SELECT c_membership_org FROM pg_temp.gmz003_test_constants)$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot delete membership');
SELECT throws_ok($$INSERT INTO public.tenant_roles (organization_id, role_key, display_name) VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), 'self-grant', 'Self Grant')$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot create tenant roles');
SELECT throws_ok($$UPDATE public.permissions SET display_name = 'Escalated' WHERE permission_key = (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants)$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot modify permissions');
SELECT throws_ok($$INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_role_empty FROM pg_temp.gmz003_test_constants), (SELECT c_hierarchy_read_permission FROM pg_temp.gmz003_test_constants))$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot assign permissions to roles');
SELECT throws_ok($$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type) VALUES ((SELECT c_organization_a FROM pg_temp.gmz003_test_constants), (SELECT c_membership_empty FROM pg_temp.gmz003_test_constants), (SELECT c_role_org FROM pg_temp.gmz003_test_constants), (SELECT c_organization_scope FROM pg_temp.gmz003_test_constants))$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot self-assign a role');
SELECT throws_ok($$INSERT INTO public.organizations (display_name) VALUES ('Unauthorized')$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot insert organizations');
SELECT throws_ok($$UPDATE public.establishments SET display_name = 'Unauthorized' WHERE id = (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants)$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot update establishments');
SELECT throws_ok($$DELETE FROM public.branches WHERE id = (SELECT c_branch_a11 FROM pg_temp.gmz003_test_constants)$$, (SELECT c_insufficient_privilege FROM pg_temp.gmz003_test_constants), NULL, 'authenticated cannot delete branches');

SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 1, 'branch-scoped role may read containing organization context');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE id = (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants)), 1, 'branch-scoped role may read containing establishment context');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE id = (SELECT c_establishment_a2 FROM pg_temp.gmz003_test_constants)), 0, 'branch-scoped role cannot read a sibling establishment');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = (SELECT c_branch_a11 FROM pg_temp.gmz003_test_constants)), 1, 'branch-scoped role reads its assigned branch');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000007'), 0, 'branch-scoped role cannot read a sibling branch');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000008'), 0, 'branch-scoped role cannot read a branch in another establishment');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = (SELECT c_branch_b11 FROM pg_temp.gmz003_test_constants)), 0, 'branch-scoped role cannot read a foreign tenant branch');

SELECT set_config(
  (SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants),
  jsonb_build_object(
    'sub', (SELECT c_user_establishment FROM pg_temp.gmz003_test_constants)::text,
    'role', (SELECT c_authenticated_role FROM pg_temp.gmz003_test_constants)
  )::text,
  true
);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 1, 'establishment-scoped role reads the parent organization context allowed by the current policy');
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_b FROM pg_temp.gmz003_test_constants)), 0, 'establishment-scoped role cannot read a foreign parent organization');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE id = (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants)), 1, 'establishment-scoped role reads its assigned establishment');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE establishment_id = (SELECT c_establishment_a1 FROM pg_temp.gmz003_test_constants)), 2, 'establishment-scoped role reads every branch in its assigned establishment');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE id = (SELECT c_establishment_a2 FROM pg_temp.gmz003_test_constants)), 0, 'establishment-scoped role cannot read a sibling establishment');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = (SELECT c_branch_a21 FROM pg_temp.gmz003_test_constants)), 0, 'establishment-scoped role cannot read a branch in a sibling establishment');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE id = (SELECT c_establishment_b1 FROM pg_temp.gmz003_test_constants)), 0, 'establishment-scoped role cannot read an establishment in another tenant');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = (SELECT c_branch_b11 FROM pg_temp.gmz003_test_constants)), 0, 'establishment-scoped role cannot read a branch in another tenant');

SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '{"sub":"20000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 0, 'active membership and assigned role without permission remain denied');
SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '{"sub":"20000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 0, 'suspended membership is denied on current authorization evaluation');
SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '{"sub":"20000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 0, 'revoked membership is denied on current authorization evaluation');
SELECT set_config((SELECT c_jwt_claims_setting FROM pg_temp.gmz003_test_constants), '{"sub":"20000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_b FROM pg_temp.gmz003_test_constants)), 1, 'foreign tenant positive control can read its own organization');
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = (SELECT c_organization_a FROM pg_temp.gmz003_test_constants)), 0, 'foreign tenant cannot read another organization');

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
