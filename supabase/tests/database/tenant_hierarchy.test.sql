BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

CREATE TEMP TABLE gmz003_hierarchy_constants AS
SELECT
  'authenticated'::text AS authenticated_role,
  'SELECT'::text AS select_privilege;
GRANT SELECT ON TABLE pg_temp.gmz003_hierarchy_constants TO PUBLIC;

SELECT no_plan();

SELECT ok(to_regclass('public.organizations') IS NOT NULL, 'organizations table exists');
SELECT ok(to_regclass('public.establishments') IS NOT NULL, 'establishments table exists');
SELECT ok(to_regclass('public.branches') IS NOT NULL, 'branches table exists');

SELECT ok(
  (SELECT array_agg(column_name::text ORDER BY ordinal_position) = ARRAY['id', 'display_name', 'legal_name', 'status', 'created_at']::text[]
   FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations'),
  'organizations has only the admitted columns'
);
SELECT ok(
  (SELECT array_agg(column_name::text ORDER BY ordinal_position) = ARRAY['id', 'organization_id', 'display_name', 'status', 'created_at']::text[]
   FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'establishments'),
  'establishments has only the admitted columns'
);
SELECT ok(
  (SELECT array_agg(column_name::text ORDER BY ordinal_position) = ARRAY['id', 'organization_id', 'establishment_id', 'display_name', 'status', 'created_at']::text[]
   FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branches'),
  'branches has only the admitted columns'
);

SELECT ok(
  COALESCE(
    id_column.atttypid = 'uuid'::regtype
      AND id_column.attnotnull
      AND primary_key.oid IS NOT NULL
      AND pg_get_expr(id_default.adbin, id_default.adrelid) LIKE '%gen_random_uuid%',
    FALSE
  ),
  format('%s id is a non-null UUID primary key with a generated default', tenancy.table_name)
)
FROM (VALUES ('organizations'), ('establishments'), ('branches')) AS tenancy(table_name)
LEFT JOIN pg_class AS relation
  ON relation.oid = to_regclass('public.' || tenancy.table_name)
LEFT JOIN pg_attribute AS id_column
  ON id_column.attrelid = relation.oid
  AND id_column.attname = 'id'
  AND NOT id_column.attisdropped
LEFT JOIN pg_attrdef AS id_default
  ON id_default.adrelid = id_column.attrelid
  AND id_default.adnum = id_column.attnum
LEFT JOIN pg_constraint AS primary_key
  ON primary_key.conrelid = relation.oid
  AND primary_key.contype = 'p'
  AND cardinality(primary_key.conkey) = 1
  AND id_column.attnum = ANY(primary_key.conkey)
ORDER BY CASE tenancy.table_name
  WHEN 'organizations' THEN 1
  WHEN 'establishments' THEN 2
  ELSE 3
END;

SELECT ok(
  (SELECT is_nullable = 'YES' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'legal_name'),
  'organization legal_name is optional'
);
SELECT ok((SELECT column_default LIKE '%active%' AND is_nullable = 'NO' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'status'), 'organization status defaults to active and is required');
SELECT ok((SELECT data_type = 'timestamp with time zone' AND is_nullable = 'NO' AND column_default ILIKE '%now()%' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'created_at'), 'organization created_at is required and defaults to now');
SELECT ok((SELECT column_default LIKE '%active%' AND is_nullable = 'NO' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'establishments' AND column_name = 'status'), 'establishment status defaults to active and is required');
SELECT ok((SELECT data_type = 'timestamp with time zone' AND is_nullable = 'NO' AND column_default ILIKE '%now()%' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'establishments' AND column_name = 'created_at'), 'establishment created_at is required and defaults to now');
SELECT ok((SELECT column_default LIKE '%active%' AND is_nullable = 'NO' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'status'), 'branch status defaults to active and is required');
SELECT ok((SELECT data_type = 'timestamp with time zone' AND is_nullable = 'NO' AND column_default ILIKE '%now()%' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'created_at'), 'branch created_at is required and defaults to now');

SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND conname = 'organizations_status_check' AND contype = 'c'), 'organization lifecycle constraint exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.establishments'::regclass AND conname = 'establishments_status_check' AND contype = 'c'), 'establishment lifecycle constraint exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.branches'::regclass AND conname = 'branches_status_check' AND contype = 'c'), 'branch lifecycle constraint exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.organizations'::regclass AND conname = 'organizations_display_name_check' AND contype = 'c'), 'organization bounded nonblank name constraint exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.establishments'::regclass AND conname = 'establishments_display_name_check' AND contype = 'c'), 'establishment bounded nonblank name constraint exists');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.branches'::regclass AND conname = 'branches_display_name_check' AND contype = 'c'), 'branch bounded nonblank name constraint exists');

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = to_regclass('public.' || tenancy.child_table)
      AND constraint_row.confrelid = 'public.organizations'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confdeltype = 'r'
      AND ARRAY(
        SELECT attribute.attname
        FROM unnest(constraint_row.conkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_row.conrelid
          AND attribute.attnum = key.attnum
        ORDER BY key.ord
      ) = ARRAY[tenancy.child_column]::name[]
      AND ARRAY(
        SELECT attribute.attname
        FROM unnest(constraint_row.confkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = constraint_row.confrelid
          AND attribute.attnum = key.attnum
        ORDER BY key.ord
      ) = ARRAY[tenancy.parent_column]::name[]
  ),
  format('%s reference organizations with RESTRICT delete behavior', tenancy.child_table)
)
FROM (VALUES
  ('establishments', 'organization_id', 'id'),
  ('branches', 'organization_id', 'id')
) AS tenancy(child_table, child_column, parent_column)
ORDER BY tenancy.child_table;
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.establishments'::regclass AND c.contype = 'u'
      AND ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = key.attnum ORDER BY key.ord) = ARRAY['organization_id', 'id']::name[]),
  'establishments expose the composite candidate key required by branch integrity'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.branches'::regclass AND c.confrelid = 'public.establishments'::regclass
      AND c.contype = 'f' AND c.confdeltype = 'r'
      AND ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = key.attnum ORDER BY key.ord) = ARRAY['organization_id', 'establishment_id']::name[]
      AND ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = key.attnum ORDER BY key.ord) = ARRAY['organization_id', 'id']::name[]),
  'branch composite foreign key binds the establishment through the same organization'
);

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.organizations'::regclass), 'organizations have RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.establishments'::regclass), 'establishments have RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.branches'::regclass), 'branches have RLS enabled');

SELECT ok(
  bool_and(
    CASE
      WHEN access.role_name = (SELECT authenticated_role FROM pg_temp.gmz003_hierarchy_constants) AND privilege.privilege_name = (SELECT select_privilege FROM pg_temp.gmz003_hierarchy_constants)
        THEN has_table_privilege(access.role_name, access.table_name, privilege.privilege_name)
      ELSE NOT has_table_privilege(access.role_name, access.table_name, privilege.privilege_name)
        AND (
          privilege.privilege_name NOT IN ((SELECT select_privilege FROM pg_temp.gmz003_hierarchy_constants), 'INSERT', 'UPDATE', 'REFERENCES')
          OR NOT has_any_column_privilege(access.role_name, access.table_name, privilege.privilege_name)
        )
    END
  ),
  format('%s has only the admitted table-level SELECT privilege on %s', access.role_name, access.table_name)
)
FROM (VALUES
  ('anon', 'public.organizations'),
  ((SELECT authenticated_role FROM pg_temp.gmz003_hierarchy_constants), 'public.organizations'),
  ('anon', 'public.establishments'),
  ((SELECT authenticated_role FROM pg_temp.gmz003_hierarchy_constants), 'public.establishments'),
  ('anon', 'public.branches'),
  ((SELECT authenticated_role FROM pg_temp.gmz003_hierarchy_constants), 'public.branches')
) AS access(role_name, table_name)
CROSS JOIN (VALUES ((SELECT select_privilege FROM pg_temp.gmz003_hierarchy_constants)), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS privilege(privilege_name)
GROUP BY access.role_name, access.table_name
ORDER BY access.role_name, access.table_name;

SELECT ok((SELECT count(*) = 1 FROM public.organizations) AND EXISTS (SELECT 1 FROM public.organizations WHERE id = '00000000-0000-4000-8000-000000000001' AND display_name = 'Goodz Local Demo Organization' AND status = 'active'), 'reset seeds only one deterministic synthetic organization');
SELECT ok((SELECT count(*) = 1 FROM public.establishments) AND EXISTS (SELECT 1 FROM public.establishments WHERE id = '00000000-0000-4000-8000-000000000002' AND organization_id = '00000000-0000-4000-8000-000000000001' AND display_name = 'Goodz Local Demo Establishment' AND status = 'active'), 'reset seeds only one deterministic establishment under the organization');
SELECT ok((SELECT count(*) = 1 FROM public.branches) AND EXISTS (SELECT 1 FROM public.branches WHERE id = '00000000-0000-4000-8000-000000000003' AND organization_id = '00000000-0000-4000-8000-000000000001' AND establishment_id = '00000000-0000-4000-8000-000000000002' AND display_name = 'Goodz Local Demo Branch' AND status = 'active'), 'reset seeds only one deterministic branch under the same organization and establishment');
SELECT ok(
  (SELECT count(*) = 1
   FROM public.branches b
   JOIN public.establishments e ON e.organization_id = b.organization_id AND e.id = b.establishment_id
   JOIN public.organizations o ON o.id = e.organization_id
   WHERE o.id = '00000000-0000-4000-8000-000000000001'),
  'seed hierarchy joins through organization-safe parent keys'
);

SELECT lives_ok($$INSERT INTO public.organizations (id, display_name) VALUES ('10000000-0000-4000-8000-000000000001', 'Test Organization A')$$, 'valid organization insert succeeds');
SELECT lives_ok($$INSERT INTO public.organizations (id, display_name) VALUES ('10000000-0000-4000-8000-000000000002', 'Test Organization B')$$, 'second organization insert succeeds for isolation test');
SELECT lives_ok($$INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Test Establishment A')$$, 'valid establishment insert succeeds under its organization');
SELECT lives_ok($$INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Test Branch A')$$, 'valid branch insert succeeds under its organization and establishment');
SELECT throws_ok($$INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'Cross Organization Branch')$$, '23503', NULL, 'cross-organization establishment substitution is rejected');

SELECT throws_ok($$INSERT INTO public.organizations (id, display_name, status) VALUES ('10000000-0000-4000-8000-000000000006', 'Invalid Organization', 'deleted')$$, '23514', NULL, 'organization rejects an invalid lifecycle status');
SELECT throws_ok($$INSERT INTO public.establishments (id, organization_id, display_name, status) VALUES ('10000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Invalid Establishment', 'deleted')$$, '23514', NULL, 'establishment rejects an invalid lifecycle status');
SELECT throws_ok($$INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status) VALUES ('10000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Invalid Branch', 'deleted')$$, '23514', NULL, 'branch rejects an invalid lifecycle status');

SELECT throws_ok($$INSERT INTO public.organizations (id, display_name) VALUES ('10000000-0000-4000-8000-000000000009', E' \t\n ')$$, '23514', NULL, 'organization rejects a blank display name');
SELECT throws_ok($$INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', E' \t\n ')$$, '23514', NULL, 'establishment rejects a blank display name');
SELECT throws_ok($$INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', E' \t\n ')$$, '23514', NULL, 'branch rejects a blank display name');

SELECT throws_ok($$INSERT INTO public.organizations (id, display_name) VALUES ('10000000-0000-4000-8000-000000000012', repeat('x', 121))$$, '23514', NULL, 'organization rejects a display name beyond the length bound');
SELECT throws_ok($$INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', repeat('x', 121))$$, '23514', NULL, 'establishment rejects a display name beyond the length bound');
SELECT throws_ok($$INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', repeat('x', 121))$$, '23514', NULL, 'branch rejects a display name beyond the length bound');


SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class idx ON idx.oid = i.indexrelid
    WHERE i.indrelid = 'public.branches'::regclass
      AND idx.relname = 'branches_organization_establishment_idx'
      AND ARRAY(
        SELECT a.attname
        FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid
         AND a.attnum = key.attnum
        WHERE key.attnum > 0
        ORDER BY key.ord
      ) = ARRAY['organization_id', 'establishment_id']::name[]
  ),
  'branches has a tenant-parent index on organization_id and establishment_id'
);

SELECT * FROM finish();
ROLLBACK;
