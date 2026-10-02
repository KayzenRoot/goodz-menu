BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT no_plan();

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'gmz003-org@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'gmz003-branch@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'gmz003-nomembership@example.invalid', now(), '{}', '{"organization_id":"10000000-0000-4000-8000-000000000001","role":"owner","permissions":["tenant.hierarchy.read"]}', now(), now()),
  ('20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'gmz003-nopermission@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'gmz003-suspended@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'gmz003-revoked@example.invalid', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'gmz003-foreign@example.invalid', now(), '{}', '{}', now(), now());

INSERT INTO public.organizations (id, display_name)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Authorization Organization A'),
  ('10000000-0000-4000-8000-000000000002', 'Authorization Organization B');

INSERT INTO public.establishments (id, organization_id, display_name)
VALUES
  ('10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Authorization Establishment A1'),
  ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Authorization Establishment A2'),
  ('10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Authorization Establishment B1');

INSERT INTO public.branches (id, organization_id, establishment_id, display_name)
VALUES
  ('10000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Authorization Branch A1-1'),
  ('10000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Authorization Branch A1-2'),
  ('10000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'Authorization Branch A2-1'),
  ('10000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', 'Authorization Branch B1-1');

SELECT has_table('public', 'organization_memberships', 'organization memberships table exists');
SELECT has_table('public', 'tenant_roles', 'tenant roles table exists');
SELECT has_table('public', 'permissions', 'canonical permissions table exists');
SELECT has_table('public', 'role_permissions', 'role permission mapping table exists');
SELECT has_table('public', 'membership_roles', 'membership role scope table exists');

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.organization_memberships'::regclass
      AND confrelid = 'auth.users'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%user_id%auth.users%id%'
  ),
  'organization membership references Supabase Auth identity without local credentials'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('organization_memberships', 'tenant_roles', 'permissions', 'role_permissions', 'membership_roles')
      AND column_name IN ('password', 'encrypted_password', 'credential', 'secret')
  ),
  'authorization model does not duplicate Auth credentials'
);
SELECT ok(
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_memberships' AND column_name = 'default_establishment_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_memberships' AND column_name = 'default_branch_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_memberships' AND column_name = 'accepted_at')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_memberships' AND column_name = 'revoked_at'),
  'membership keeps optional tenant-bound defaults and acceptance/revocation lifecycle data'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.permissions'::regclass
      AND contype = 'p'
      AND cardinality(conkey) = 1
      AND conkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.permissions'::regclass AND attname = 'permission_key'
      )
  ),
  'stable permission key is the permission identity'
);
SELECT is(
  (SELECT array_agg(permission_key ORDER BY permission_key) FROM public.permissions),
  ARRAY['tenant.hierarchy.read']::text[],
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
     'public.organizations'::regclass,
     'public.establishments'::regclass,
     'public.branches'::regclass,
     'public.organization_memberships'::regclass,
     'public.tenant_roles'::regclass,
     'public.permissions'::regclass,
     'public.role_permissions'::regclass,
     'public.membership_roles'::regclass
   ])),
  'all tenant and authorization tables retain row level security'
);
SELECT ok(
  bool_and(
    NOT has_table_privilege(access.role_name, access.table_name, privilege.privilege_name)
    AND (
      privilege.privilege_name NOT IN ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
      OR NOT has_any_column_privilege(access.role_name, access.table_name, privilege.privilege_name)
    )
  ),
  'anon and authenticated have no privilege on membership and RBAC tables'
)
FROM (VALUES
  ('anon', 'public.organization_memberships'),
  ('authenticated', 'public.organization_memberships'),
  ('anon', 'public.tenant_roles'),
  ('authenticated', 'public.tenant_roles'),
  ('anon', 'public.permissions'),
  ('authenticated', 'public.permissions'),
  ('anon', 'public.role_permissions'),
  ('authenticated', 'public.role_permissions'),
  ('anon', 'public.membership_roles'),
  ('authenticated', 'public.membership_roles')
) AS access(role_name, table_name)
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS privilege(privilege_name);

SELECT ok(
  bool_and(has_table_privilege('authenticated', hierarchy.table_name, 'SELECT'))
    AND bool_and(NOT has_table_privilege('anon', hierarchy.table_name, 'SELECT')),
  'only authenticated receives the hierarchy SELECT grant'
)
FROM (VALUES
  ('public.organizations'),
  ('public.establishments'),
  ('public.branches')
) AS hierarchy(table_name);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.organizations', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.organizations', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.organizations', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.establishments', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.establishments', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.establishments', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.branches', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.branches', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.branches', 'DELETE'),
  'authenticated cannot write the tenant hierarchy'
);
SELECT is(
  (SELECT count(*)::integer FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('organizations', 'establishments', 'branches')
     AND cmd = 'SELECT'
     AND roles = ARRAY['authenticated']::name[]),
  3,
  'hierarchy has exactly one authenticated SELECT policy per table'
);
SELECT is(
  (SELECT count(*)::integer FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('organizations', 'establishments', 'branches')
     AND cmd <> 'SELECT'),
  0,
  'hierarchy has no authenticated write policy'
);
SELECT ok(
  NOT has_schema_privilege('anon', 'private', 'USAGE')
    AND has_schema_privilege('authenticated', 'private', 'USAGE'),
  'private authorization helper schema is closed to anon and available only to authenticated policies'
);
SELECT ok(
  has_function_privilege('authenticated', 'private.can_read_tenant_hierarchy(uuid,uuid,uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'private.can_read_tenant_hierarchy(uuid,uuid,uuid)', 'EXECUTE'),
  'only authenticated can execute the narrowly scoped private RLS helper'
);
SELECT ok(
  (SELECT prosecdef
     AND proconfig @> ARRAY['search_path=""']::text[]
     AND owner.rolbypassrls
   FROM pg_proc AS function_row
   JOIN pg_namespace AS function_schema ON function_schema.oid = function_row.pronamespace
   JOIN pg_roles AS owner ON owner.oid = function_row.proowner
   WHERE function_schema.nspname = 'private'
     AND function_row.proname = 'can_read_tenant_hierarchy'
     AND pg_get_function_identity_arguments(function_row.oid) = 'p_organization_id uuid, p_establishment_id uuid, p_branch_id uuid'),
  'RLS helper is security definer with empty search path and a bypass-RLS owner'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_proc AS function_row
    JOIN pg_namespace AS function_schema ON function_schema.oid = function_row.pronamespace
    WHERE function_schema.nspname = 'private'
      AND function_row.proname = 'can_read_tenant_hierarchy'
      AND pg_get_functiondef(function_row.oid) ILIKE '%user_metadata%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('organizations', 'establishments', 'branches')
      AND coalesce(qual, '') || coalesce(with_check, '') ILIKE '%user_metadata%'
  ),
  'authorization helper and hierarchy policies do not trust user metadata'
);

INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name)
VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'hierarchy-reader', 'Hierarchy Reader'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'branch-reader', 'Branch Reader'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'empty-role', 'No Permission'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'foreign-reader', 'Foreign Hierarchy Reader');

INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
VALUES
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'tenant.hierarchy.read'),
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'tenant.hierarchy.read'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'tenant.hierarchy.read');

SELECT throws_ok(
  $$UPDATE public.permissions SET permission_key = 'tenant.hierarchy.enumerate' WHERE permission_key = 'tenant.hierarchy.read'$$,
  '23514', NULL,
  'permission key identity cannot be updated'
);
SELECT throws_ok(
  $$DELETE FROM public.permissions WHERE permission_key = 'tenant.hierarchy.read'$$,
  '23514', NULL,
  'permission catalog entries cannot be deleted'
);

INSERT INTO public.organization_memberships (
  id, organization_id, user_id, status,
  default_establishment_id, default_branch_id, revoked_at
)
VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'active', NULL, NULL, NULL),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'active', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000006', NULL),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'active', NULL, NULL, NULL),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'suspended', NULL, NULL, NULL),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 'revoked', NULL, NULL, now()),
  ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000007', 'active', NULL, NULL, NULL);

SELECT throws_ok(
  $$INSERT INTO public.organization_memberships (organization_id, user_id, default_establishment_id)
    VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005')$$,
  '23503', NULL,
  'membership default establishment cannot cross organizations'
);
SELECT throws_ok(
  $$INSERT INTO public.organization_memberships (organization_id, user_id, default_branch_id)
    VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000006')$$,
  '23514', NULL,
  'membership default branch requires its containing establishment'
);
SELECT throws_ok(
  $$INSERT INTO public.organization_memberships (organization_id, user_id, status)
    VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'pending')$$,
  '23514', NULL,
  'membership rejects lifecycle states outside the admitted active suspended revoked set'
);

INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
VALUES
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'organization', NULL, NULL),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'branch', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000006'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'organization', NULL, NULL),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'organization', NULL, NULL),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'organization', NULL, NULL),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'organization', NULL, NULL),
  ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000004', 'organization', NULL, NULL);

SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'establishment', '10000000-0000-4000-8000-000000000005', NULL)$$,
  '23503', NULL,
  'membership role cannot be scoped to another organization establishment'
);
SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'branch', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000009')$$,
  '23503', NULL,
  'membership role cannot substitute a foreign organization branch'
);
SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ('10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'organization', NULL, NULL)$$,
  '23503', NULL,
  'membership role cannot combine a membership and role from different organizations'
);
SELECT throws_ok(
  $$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type, establishment_id, branch_id)
    VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'organization', '10000000-0000-4000-8000-000000000003', NULL)$$,
  '23514', NULL,
  'organization scope rejects narrower resource identifiers'
);
SELECT throws_ok(
  $$INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
    VALUES ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'tenant.hierarchy.read')$$,
  '23503', NULL,
  'role permission mapping cannot move a tenant role to another organization'
);

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.organizations$$, '42501', NULL, 'anon cannot query organizations');
SELECT throws_ok($$SELECT * FROM public.establishments$$, '42501', NULL, 'anon cannot query establishments');
SELECT throws_ok($$SELECT * FROM public.branches$$, '42501', NULL, 'anon cannot query branches');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::integer FROM public.organizations), 0, 'authenticated request without identity is denied');

SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated","user_metadata":{"organization_id":"10000000-0000-4000-8000-000000000001","role":"owner","permissions":["tenant.hierarchy.read"]}}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000001'), 0, 'user-editable metadata without canonical membership grants nothing');

SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000001'), 1, 'active organization-scoped role reads its organization');
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000002'), 0, 'organization-scoped role cannot read a foreign tenant');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE organization_id = '10000000-0000-4000-8000-000000000001'), 2, 'organization-scoped role reads its establishments');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE organization_id = '10000000-0000-4000-8000-000000000001'), 3, 'organization-scoped role reads every admitted descendant branch');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000009'), 0, 'organization-scoped role cannot substitute a foreign branch id');
SELECT throws_ok($$INSERT INTO public.organization_memberships (organization_id, user_id, status) VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'active')$$, '42501', NULL, 'authenticated cannot insert membership');
SELECT throws_ok($$UPDATE public.organization_memberships SET status = 'suspended' WHERE id = '40000000-0000-4000-8000-000000000001'$$, '42501', NULL, 'authenticated cannot update membership');
SELECT throws_ok($$DELETE FROM public.organization_memberships WHERE id = '40000000-0000-4000-8000-000000000001'$$, '42501', NULL, 'authenticated cannot delete membership');
SELECT throws_ok($$INSERT INTO public.tenant_roles (organization_id, role_key, display_name) VALUES ('10000000-0000-4000-8000-000000000001', 'self-grant', 'Self Grant')$$, '42501', NULL, 'authenticated cannot create tenant roles');
SELECT throws_ok($$UPDATE public.permissions SET display_name = 'Escalated' WHERE permission_key = 'tenant.hierarchy.read'$$, '42501', NULL, 'authenticated cannot modify permissions');
SELECT throws_ok($$INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'tenant.hierarchy.read')$$, '42501', NULL, 'authenticated cannot assign permissions to roles');
SELECT throws_ok($$INSERT INTO public.membership_roles (organization_id, membership_id, role_id, scope_type) VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'organization')$$, '42501', NULL, 'authenticated cannot self-assign a role');
SELECT throws_ok($$INSERT INTO public.organizations (display_name) VALUES ('Unauthorized')$$, '42501', NULL, 'authenticated cannot insert organizations');
SELECT throws_ok($$UPDATE public.establishments SET display_name = 'Unauthorized' WHERE id = '10000000-0000-4000-8000-000000000003'$$, '42501', NULL, 'authenticated cannot update establishments');
SELECT throws_ok($$DELETE FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000006'$$, '42501', NULL, 'authenticated cannot delete branches');

SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000001'), 1, 'branch-scoped role may read containing organization context');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE id = '10000000-0000-4000-8000-000000000003'), 1, 'branch-scoped role may read containing establishment context');
SELECT is((SELECT count(*)::integer FROM public.establishments WHERE id = '10000000-0000-4000-8000-000000000004'), 0, 'branch-scoped role cannot read a sibling establishment');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000006'), 1, 'branch-scoped role reads its assigned branch');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000007'), 0, 'branch-scoped role cannot read a sibling branch');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000008'), 0, 'branch-scoped role cannot read a branch in another establishment');
SELECT is((SELECT count(*)::integer FROM public.branches WHERE id = '10000000-0000-4000-8000-000000000009'), 0, 'branch-scoped role cannot read a foreign tenant branch');

SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000001'), 0, 'active membership and assigned role without permission remain denied');
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000001'), 0, 'suspended membership is denied on current authorization evaluation');
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000001'), 0, 'revoked membership is denied on current authorization evaluation');
SELECT set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000002'), 1, 'foreign tenant positive control can read its own organization');
SELECT is((SELECT count(*)::integer FROM public.organizations WHERE id = '10000000-0000-4000-8000-000000000001'), 0, 'foreign tenant cannot read another organization');

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
