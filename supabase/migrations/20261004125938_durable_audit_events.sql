CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  actor_user_id uuid,
  organization_id uuid,
  establishment_id uuid,
  branch_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  outcome text NOT NULL,
  reason_code text NOT NULL,
  correlation_id uuid NOT NULL,
  source text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT audit_events_scope_shape_check
    CHECK (
      (establishment_id IS NULL OR organization_id IS NOT NULL)
      AND (branch_id IS NULL OR (organization_id IS NOT NULL AND establishment_id IS NOT NULL))
    ),
  CONSTRAINT audit_events_action_check
    CHECK (action = 'synthetic.privileged.proof'),
  CONSTRAINT audit_events_target_type_check
    CHECK (target_type = 'branch'),
  CONSTRAINT audit_events_outcome_check
    CHECK (outcome IN ('allow', 'deny')),
  CONSTRAINT audit_events_reason_code_check
    CHECK (reason_code IN (
      'authorized',
      'invalid_scope',
      'unauthenticated',
      'identity_unverified',
      'authorization_denied',
      'aal2_required',
      'factor_unverified',
      'reauthentication_required',
      'step_up_required'
    )),
  CONSTRAINT audit_events_source_check
    CHECK (source = 'admin_guard'),
  CONSTRAINT audit_events_metadata_check
    CHECK (
      pg_catalog.jsonb_typeof(metadata) = 'object'
      AND pg_catalog.octet_length(metadata::text) <= 1024
      AND metadata = '{"required_permission":"tenant.hierarchy.read"}'::jsonb
    ),
  CONSTRAINT audit_events_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT audit_events_establishment_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT audit_events_branch_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX audit_events_correlation_id_idx
  ON public.audit_events (correlation_id);

CREATE INDEX audit_events_organization_created_at_idx
  ON public.audit_events (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.audit_events
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.reject_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable.'
    USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.reject_audit_event_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER audit_events_immutable
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION private.reject_audit_event_mutation();

CREATE OR REPLACE FUNCTION public.append_audit_event(
  p_action text,
  p_target_type text,
  p_outcome text,
  p_reason_code text,
  p_correlation_id uuid,
  p_source text,
  p_metadata jsonb,
  p_target_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_establishment_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  IF p_action IS DISTINCT FROM 'synthetic.privileged.proof'
    OR p_target_type IS DISTINCT FROM 'branch'
    OR p_outcome IS NULL
    OR p_outcome NOT IN ('allow', 'deny')
    OR p_reason_code IS NULL
    OR p_reason_code NOT IN (
      'authorized',
      'invalid_scope',
      'unauthenticated',
      'identity_unverified',
      'authorization_denied',
      'aal2_required',
      'factor_unverified',
      'reauthentication_required',
      'step_up_required'
    )
    OR p_source IS DISTINCT FROM 'admin_guard'
    OR p_correlation_id IS NULL
  THEN
    RAISE EXCEPTION 'Invalid audit event.'
      USING ERRCODE = '22023';
  END IF;

  IF p_metadata IS NULL
    OR pg_catalog.jsonb_typeof(p_metadata) IS DISTINCT FROM 'object'
    OR pg_catalog.octet_length(p_metadata::text) > 1024
    OR p_metadata IS DISTINCT FROM '{"required_permission":"tenant.hierarchy.read"}'::jsonb
  THEN
    RAISE EXCEPTION 'Invalid audit event.'
      USING ERRCODE = '22023';
  END IF;

  IF p_establishment_id IS NOT NULL AND p_organization_id IS NULL
    OR p_branch_id IS NOT NULL AND (p_organization_id IS NULL OR p_establishment_id IS NULL)
  THEN
    RAISE EXCEPTION 'Invalid audit event.'
      USING ERRCODE = '22023';
  END IF;

  IF p_outcome = 'allow'
    AND (
      p_actor_user_id IS NULL
      OR p_organization_id IS NULL
      OR p_establishment_id IS NULL
      OR p_branch_id IS NULL
      OR p_target_id IS DISTINCT FROM p_branch_id
      OR p_reason_code IS DISTINCT FROM 'authorized'
    )
  THEN
    RAISE EXCEPTION 'Invalid audit event.'
      USING ERRCODE = '22023';
  END IF;

  IF p_outcome = 'deny' AND p_reason_code = 'authorized' THEN
    RAISE EXCEPTION 'Invalid audit event.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id,
    organization_id,
    establishment_id,
    branch_id,
    action,
    target_type,
    target_id,
    outcome,
    reason_code,
    correlation_id,
    source,
    metadata
  )
  VALUES (
    p_actor_user_id,
    p_organization_id,
    p_establishment_id,
    p_branch_id,
    p_action,
    p_target_type,
    p_target_id,
    p_outcome,
    p_reason_code,
    p_correlation_id,
    p_source,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_audit_event(text, text, text, text, uuid, text, jsonb, uuid, uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.append_audit_event(text, text, text, text, uuid, text, jsonb, uuid, uuid, uuid, uuid, uuid)
  TO service_role;
