-- GMZ-IMPL-002 keeps local fixtures synthetic and limited to tenant hierarchy.
INSERT INTO public.organizations (id, display_name, legal_name, status)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Goodz Local Demo Organization',
  NULL,
  'active'
);

INSERT INTO public.establishments (id, organization_id, display_name, status)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Goodz Local Demo Establishment',
  'active'
);

INSERT INTO public.branches (id, organization_id, establishment_id, display_name, status)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Goodz Local Demo Branch',
  'active'
);
