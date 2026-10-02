BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

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
  (SELECT a.atttypid = 'uuid'::regtype AND a.attnotnull
          AND EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = a.attrelid AND c.contype = 'p' AND cardinality(c.conkey) = 1 AND a.attnum = ANY (c.conkey))
          AND pg_get_expr(d.adbin, d.adrelid) LIKE '%gen_random_uuid%'
   FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE a.attrelid = 'public.organizations'::regclass AND a.attname = 'id' AND NOT a.attisdropped),
  'organizations id is a non-null UUID primary key with a generated default'
);
SELECT ok(
  (SELECT a.atttypid = 'uuid'::regtype AND a.attnotnull
          AND EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = a.attrelid AND c.contype = 'p' AND cardinality(c.conkey) = 1 AND a.attnum = ANY (c.conkey))
          AND pg_get_expr(d.adbin, d.adrelid) LIKE '%gen_random_uuid%'
   FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE a.attrelid = 'public.establishments'::regclass AND a.attname = 'id' AND NOT a.attisdropped),
  'establishments id is a non-null UUID primary key with a generated default'
);
SELECT ok(
  (SELECT a.atttypid = 'uuid'::regtype AND a.attnotnull
          AND EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = a.attrelid AND c.contype = 'p' AND cardinality(c.conkey) = 1 AND a.attnum = ANY (c.conkey))
          AND pg_get_expr(d.adbin, d.adrelid) LIKE '%gen_random_uuid%'
   FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE a.attrelid = 'public.branches'::regclass AND a.attname = 'id' AND NOT a.attisdropped),
  'branches id is a non-null UUID primary key with a generated default'
);

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
  EXISTS (SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.establishments'::regclass AND c.confrelid = 'public.organizations'::regclass
      AND c.contype = 'f' AND c.confdeltype = 'r'
      AND ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = key.attnum ORDER BY key.ord) = ARRAY['organization_id']::name[]
      AND ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = key.attnum ORDER BY key.ord) = ARRAY['id']::name[]),
  'establishments reference organizations with RESTRICT delete behavior'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.branches'::regclass AND c.confrelid = 'public.organizations'::regclass
      AND c.contype = 'f' AND c.confdeltype = 'r'
      AND ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = key.attnum ORDER BY key.ord) = ARRAY['organization_id']::name[]
      AND ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = key.attnum ORDER BY key.ord) = ARRAY['id']::name[]),
  'branches reference organizations with RESTRICT delete behavior'
);
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
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations'), 'organizations have no tenant policy before GMZ-M02');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'establishments'), 'establishments have no tenant policy before GMZ-M02');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'branches'), 'branches have no tenant policy before GMZ-M02');

SELECT ok(
  NOT has_table_privilege('anon', 'public.organizations', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.organizations', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.organizations', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.organizations', 'DELETE'),
  'anon has no direct CRUD privileges on organizations'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.organizations', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.organizations', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.organizations', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.organizations', 'DELETE'),
  'authenticated has no direct CRUD privileges on organizations'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.establishments', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.establishments', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.establishments', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.establishments', 'DELETE'),
  'anon has no direct CRUD privileges on establishments'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.establishments', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.establishments', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.establishments', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.establishments', 'DELETE'),
  'authenticated has no direct CRUD privileges on establishments'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.branches', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.branches', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.branches', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.branches', 'DELETE'),
  'anon has no direct CRUD privileges on branches'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.branches', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.branches', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.branches', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.branches', 'DELETE'),
  'authenticated has no direct CRUD privileges on branches'
);

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
