BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT no_plan();

SELECT ok(to_regclass('public.audit_events') IS NOT NULL, 'durable audit event table exists');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_events'::regclass),
  'audit event table has row level security enabled'
);

SELECT has_column('public', 'audit_events', 'actor_user_id', 'audit event records its actor where available');
SELECT has_column('public', 'audit_events', 'organization_id', 'audit event can preserve organization scope');
SELECT has_column('public', 'audit_events', 'establishment_id', 'audit event can preserve establishment scope');
SELECT has_column('public', 'audit_events', 'branch_id', 'audit event can preserve branch scope');
SELECT has_column('public', 'audit_events', 'action', 'audit event has an explicit action');
SELECT has_column('public', 'audit_events', 'target_type', 'audit event has an explicit target type');
SELECT has_column('public', 'audit_events', 'target_id', 'audit event has an explicit target identifier');
SELECT has_column('public', 'audit_events', 'outcome', 'audit event has an explicit outcome');
SELECT has_column('public', 'audit_events', 'reason_code', 'audit event has an explicit reason code');
SELECT has_column('public', 'audit_events', 'correlation_id', 'audit event has an explicit correlation identifier');
SELECT has_column('public', 'audit_events', 'source', 'audit event has an explicit source');
SELECT has_column('public', 'audit_events', 'metadata', 'audit event has bounded structured metadata');
SELECT has_column('public', 'audit_events', 'created_at', 'audit event timestamp is database-generated');

SELECT ok(
  NOT has_table_privilege('anon', 'public.audit_events', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.audit_events', 'INSERT')
    AND NOT has_table_privilege('anon', 'public.audit_events', 'UPDATE')
    AND NOT has_table_privilege('anon', 'public.audit_events', 'DELETE')
    AND NOT has_table_privilege('anon', 'public.audit_events', 'TRUNCATE')
    AND NOT has_table_privilege('anon', 'public.audit_events', 'REFERENCES')
    AND NOT has_table_privilege('anon', 'public.audit_events', 'TRIGGER')
    AND NOT has_any_column_privilege('anon', 'public.audit_events', 'SELECT')
    AND NOT has_any_column_privilege('anon', 'public.audit_events', 'INSERT')
    AND NOT has_any_column_privilege('anon', 'public.audit_events', 'UPDATE')
    AND NOT has_any_column_privilege('anon', 'public.audit_events', 'REFERENCES'),
  'anon has no table-level or column-level audit privileges'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.audit_events', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.audit_events', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.audit_events', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.audit_events', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'public.audit_events', 'TRUNCATE')
    AND NOT has_table_privilege('authenticated', 'public.audit_events', 'REFERENCES')
    AND NOT has_table_privilege('authenticated', 'public.audit_events', 'TRIGGER')
    AND NOT has_any_column_privilege('authenticated', 'public.audit_events', 'SELECT')
    AND NOT has_any_column_privilege('authenticated', 'public.audit_events', 'INSERT')
    AND NOT has_any_column_privilege('authenticated', 'public.audit_events', 'UPDATE')
    AND NOT has_any_column_privilege('authenticated', 'public.audit_events', 'REFERENCES'),
  'authenticated has no table-level or column-level audit privileges'
);
SELECT ok(
  NOT has_table_privilege('service_role', 'public.audit_events', 'SELECT')
    AND NOT has_table_privilege('service_role', 'public.audit_events', 'INSERT')
    AND NOT has_table_privilege('service_role', 'public.audit_events', 'UPDATE')
    AND NOT has_table_privilege('service_role', 'public.audit_events', 'DELETE')
    AND NOT has_table_privilege('service_role', 'public.audit_events', 'TRUNCATE'),
  'service_role has no direct table access and must use the narrow append function'
);

SELECT ok(NOT has_function_privilege('anon', 'public.append_audit_event(text,text,text,text,uuid,text,jsonb,uuid,uuid,uuid,uuid,uuid)', 'EXECUTE'), 'anon cannot invoke the trusted audit append function');
SELECT ok(NOT has_function_privilege('authenticated', 'public.append_audit_event(text,text,text,text,uuid,text,jsonb,uuid,uuid,uuid,uuid,uuid)', 'EXECUTE'), 'authenticated cannot invoke the trusted audit append function');
SELECT ok(has_function_privilege('service_role', 'public.append_audit_event(text,text,text,text,uuid,text,jsonb,uuid,uuid,uuid,uuid,uuid)', 'EXECUTE'), 'only the isolated server writer role can invoke the append function');
SELECT ok(
  (SELECT prosecdef AND proconfig @> ARRAY['search_path=""']
   FROM pg_proc
   WHERE oid = 'public.append_audit_event(text,text,text,text,uuid,text,jsonb,uuid,uuid,uuid,uuid,uuid)'::regprocedure),
  'append function is security-definer with an empty search path'
);

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
VALUES (
  '82000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'gmz006-audit-actor@example.invalid', now(), '{}', '{}', now(), now()
);
INSERT INTO public.organizations (id, display_name)
VALUES ('82000000-0000-4000-8000-000000000002', 'GMZ-IMPL-006 audit organization');
INSERT INTO public.establishments (id, organization_id, display_name)
VALUES ('82000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000002', 'GMZ-IMPL-006 audit establishment');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name)
VALUES ('82000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000003', 'GMZ-IMPL-006 audit branch');

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.audit_events$$, '42501', NULL, 'anon cannot read or enumerate audit events');
SELECT throws_ok($$INSERT INTO public.audit_events DEFAULT VALUES$$, '42501', NULL, 'anon cannot insert audit events');
SELECT throws_ok($$UPDATE public.audit_events SET reason_code = 'authorized'$$, '42501', NULL, 'anon cannot update audit events');
SELECT throws_ok($$DELETE FROM public.audit_events$$, '42501', NULL, 'anon cannot delete audit events');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"82000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT throws_ok($$SELECT * FROM public.audit_events WHERE organization_id = '82000000-0000-4000-8000-000000000002'$$, '42501', NULL, 'authenticated cannot enumerate own tenant audit events without an admitted viewer');
SELECT throws_ok($$SELECT * FROM public.audit_events WHERE organization_id = '82000000-0000-4000-8000-000000000099'$$, '42501', NULL, 'authenticated cannot enumerate foreign tenant audit events');
SELECT throws_ok($$INSERT INTO public.audit_events DEFAULT VALUES$$, '42501', NULL, 'authenticated cannot insert audit events');
SELECT throws_ok($$UPDATE public.audit_events SET reason_code = 'authorized'$$, '42501', NULL, 'authenticated cannot update audit events');
SELECT throws_ok($$DELETE FROM public.audit_events$$, '42501', NULL, 'authenticated cannot delete audit events');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT public.append_audit_event(
    p_action => 'synthetic.privileged.proof',
    p_target_type => 'branch',
    p_outcome => 'allow',
    p_reason_code => 'authorized',
    p_correlation_id => '82000000-0000-4000-8000-000000000005',
    p_source => 'admin_guard',
    p_metadata => '{"required_permission":"tenant.hierarchy.read"}'::jsonb,
    p_target_id => '82000000-0000-4000-8000-000000000004',
    p_branch_id => '82000000-0000-4000-8000-000000000004',
    p_establishment_id => '82000000-0000-4000-8000-000000000003',
    p_organization_id => '82000000-0000-4000-8000-000000000002',
    p_actor_user_id => '82000000-0000-4000-8000-000000000001'
  )$$,
  'trusted writer can append a valid, scoped audit event'
);
SELECT throws_ok($$INSERT INTO public.audit_events DEFAULT VALUES$$, '42501', NULL, 'service_role cannot directly insert audit events');
SELECT throws_ok($$UPDATE public.audit_events SET reason_code = 'authorization_denied'$$, '42501', NULL, 'service_role cannot directly update audit events');
SELECT throws_ok($$DELETE FROM public.audit_events$$, '42501', NULL, 'service_role cannot directly delete audit events');
SELECT throws_ok(
  $$SELECT public.append_audit_event(
    p_action => 'synthetic.privileged.proof',
    p_target_type => 'branch',
    p_outcome => 'allow',
    p_reason_code => 'authorized',
    p_correlation_id => '82000000-0000-4000-8000-000000000006',
    p_source => 'admin_guard',
    p_metadata => '{"required_permission":"tenant.hierarchy.read","access_token":"fixture-not-a-credential"}'::jsonb,
    p_target_id => '82000000-0000-4000-8000-000000000004',
    p_branch_id => '82000000-0000-4000-8000-000000000004',
    p_establishment_id => '82000000-0000-4000-8000-000000000003',
    p_organization_id => '82000000-0000-4000-8000-000000000002',
    p_actor_user_id => '82000000-0000-4000-8000-000000000001'
  )$$,
  '22023', 'Invalid audit event.', 'trusted append rejects unallowlisted sensitive metadata'
);
SELECT throws_ok(
  $$SELECT public.append_audit_event(
    p_action => 'synthetic.privileged.proof',
    p_target_type => 'branch',
    p_outcome => 'allow',
    p_reason_code => 'authorized',
    p_correlation_id => '82000000-0000-4000-8000-000000000007',
    p_source => 'admin_guard',
    p_metadata => jsonb_build_object('required_permission', 'tenant.hierarchy.read', 'extra', repeat('x', 2_000)),
    p_target_id => '82000000-0000-4000-8000-000000000004',
    p_branch_id => '82000000-0000-4000-8000-000000000004',
    p_establishment_id => '82000000-0000-4000-8000-000000000003',
    p_organization_id => '82000000-0000-4000-8000-000000000002',
    p_actor_user_id => '82000000-0000-4000-8000-000000000001'
  )$$,
  '22023', 'Invalid audit event.', 'trusted append rejects oversized metadata'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.audit_events WHERE correlation_id = '82000000-0000-4000-8000-000000000005'),
  1,
  'trusted append produces one durable row for its correlation identifier'
);

SELECT throws_ok(
  $$UPDATE public.audit_events SET reason_code = 'authorization_denied' WHERE correlation_id = '82000000-0000-4000-8000-000000000005'$$,
  '55000', 'Audit events are immutable.', 'database trigger prevents privileged audit update attempts'
);
SELECT throws_ok(
  $$DELETE FROM public.audit_events WHERE correlation_id = '82000000-0000-4000-8000-000000000005'$$,
  '55000', 'Audit events are immutable.', 'database trigger prevents privileged audit delete attempts'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events WHERE correlation_id = '82000000-0000-4000-8000-000000000005'),
  1,
  'failed mutation attempts preserve the original audit history'
);

SELECT * FROM finish();
ROLLBACK;
