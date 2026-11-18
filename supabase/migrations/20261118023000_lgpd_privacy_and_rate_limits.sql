CREATE TYPE private.privacy_literal_constants AS (
  perm_privacy_read text,
  perm_privacy_manage text,
  status_active text,
  role_owner text,
  role_admin text,
  purpose_marketing text,
  purpose_fulfillment text,
  src_checkout text,
  src_console text,
  action_privacy_step_up text,
  action_customer_exported text,
  action_customer_anonymized text,
  target_customer text,
  source_admin_guard text,
  source_privacy_command text,
  outcome_allow text,
  outcome_deny text,
  reason_authorized text,
  reason_exported text,
  reason_anonymized text,
  meta_required_permissions text,
  meta_step_up_proof_id text,
  meta_order_count text,
  meta_reason_length text,
  key_customer_id text,
  key_audit_event_ids text,
  key_neighborhood text,
  key_city text,
  key_state_code text,
  anon_display_name text,
  anon_phone text,
  anon_street text,
  json_object text,
  json_array text,
  json_number text,
  uuid_regex text,
  sqlstate_22023 text,
  sqlstate_42501 text,
  msg_privacy_auth_unavailable text,
  msg_privacy_input_invalid text,
  msg_privacy_step_up_required text,
  msg_privacy_active_orders text
);

CREATE FUNCTION private.get_privacy_literal_constants()
RETURNS private.privacy_literal_constants
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT ROW(
    'privacy.read'::text,
    'privacy.manage'::text,
    'active'::text,
    'owner'::text,
    'admin'::text,
    'marketing_communications'::text,
    'order_fulfillment'::text,
    'storefront_checkout'::text,
    'privacy_console'::text,
    'privacy.privileged.step_up'::text,
    'privacy.customer.exported'::text,
    'privacy.customer.anonymized'::text,
    'customer'::text,
    'admin_guard'::text,
    'privacy_command'::text,
    'allow'::text,
    'deny'::text,
    'authorized'::text,
    'privacy_customer_exported'::text,
    'privacy_customer_anonymized'::text,
    'required_permissions'::text,
    'step_up_proof_id'::text,
    'order_count'::text,
    'reason_length'::text,
    'customer_id'::text,
    'audit_event_ids'::text,
    'neighborhood'::text,
    'city'::text,
    'state_code'::text,
    'Titular Anonimizado (LGPD)'::text,
    '0000000000'::text,
    '[anonimizado-lgpd]'::text,
    'object'::text,
    'array'::text,
    'number'::text,
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text,
    '22023'::text,
    '42501'::text,
    'Privacy authorization is unavailable.'::text,
    'Privacy input is invalid.'::text,
    'Privacy step-up verification is required.'::text,
    'Cannot anonymize customer with active in-flight orders.'::text
  )::private.privacy_literal_constants;
$function$;

REVOKE ALL ON TYPE private.privacy_literal_constants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_privacy_literal_constants() FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON TYPE private.privacy_literal_constants TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_privacy_literal_constants() TO authenticated;

-- RBAC Permissions for LGPD & Privacy Governance (owner & admin only)
INSERT INTO public.permissions (permission_key, display_name)
VALUES
  ((private.get_privacy_literal_constants()).perm_privacy_read, 'Read organization customer privacy and retention status'),
  ((private.get_privacy_literal_constants()).perm_privacy_manage, 'Export or anonymize customer personal data under LGPD')
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_privacy_role_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
BEGIN
  IF NEW.role_key IN (v_c.role_owner, v_c.role_admin) THEN
    INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
    VALUES
      (NEW.organization_id, NEW.id, v_c.perm_privacy_read),
      (NEW.organization_id, NEW.id, v_c.perm_privacy_manage)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_privacy_role_permissions() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER tenant_roles_seed_privacy_permissions
AFTER INSERT ON public.tenant_roles
FOR EACH ROW
EXECUTE FUNCTION private.seed_privacy_role_permissions();

WITH c AS (SELECT (private.get_privacy_literal_constants()).*)
INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, perm.permission_key
FROM public.tenant_roles AS role
CROSS JOIN c
CROSS JOIN LATERAL unnest(
  CASE
    WHEN role.role_key IN (c.role_owner, c.role_admin) THEN ARRAY[c.perm_privacy_read, c.perm_privacy_manage]::text[]
    ELSE ARRAY[]::text[]
  END
) AS perm(permission_key)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.privacy_has_permission(
  p_organization_id uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND p_organization_id IS NOT NULL
    AND p_permission_key IN (
      (private.get_privacy_literal_constants()).perm_privacy_read,
      (private.get_privacy_literal_constants()).perm_privacy_manage
    )
    AND EXISTS (
      SELECT 1 FROM public.organizations AS org_row
      WHERE org_row.id = p_organization_id
        AND org_row.status = (private.get_privacy_literal_constants()).status_active
    )
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships AS m
      JOIN public.membership_roles AS mr
        ON mr.organization_id = m.organization_id AND mr.membership_id = m.id
      JOIN public.role_permissions AS rp
        ON rp.organization_id = mr.organization_id AND rp.role_id = mr.role_id
      WHERE m.user_id = (SELECT auth.uid())
        AND m.organization_id = p_organization_id
        AND m.status = (private.get_privacy_literal_constants()).status_active
        AND mr.scope_type = (private.get_settings_literal_constants()).scope_organization
        AND rp.permission_key = p_permission_key
    );
$function$;

REVOKE ALL ON FUNCTION public.privacy_has_permission(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.privacy_has_permission(uuid, text)
  TO authenticated;

-- 1. Immutable Customer Consents Ledger (D-0023 §6 & GMZ-REQ-MKT-002)
CREATE TABLE public.customer_consents (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  purpose text NOT NULL,
  granted boolean NOT NULL,
  source text NOT NULL,
  actor_user_id uuid,
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT customer_consents_customer_fkey
    FOREIGN KEY (organization_id, customer_id)
    REFERENCES public.customers (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT customer_consents_actor_fkey
    FOREIGN KEY (actor_user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT customer_consents_purpose_check
    CHECK (purpose IN (
      (private.get_privacy_literal_constants()).purpose_marketing,
      (private.get_privacy_literal_constants()).purpose_fulfillment
    )),
  CONSTRAINT customer_consents_source_check
    CHECK (source IN (
      (private.get_privacy_literal_constants()).src_checkout,
      (private.get_privacy_literal_constants()).src_console
    ))
);

CREATE INDEX customer_consents_customer_idx
  ON public.customer_consents (organization_id, customer_id, created_at DESC);

CREATE TRIGGER customer_consents_immutable
BEFORE UPDATE OR DELETE ON public.customer_consents
FOR EACH ROW EXECUTE FUNCTION private.reject_order_ledger_mutation();

ALTER TABLE public.customer_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.customer_consents FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.customer_consents TO authenticated;

CREATE POLICY customer_consents_org_select ON public.customer_consents
FOR SELECT TO authenticated
USING ((SELECT public.privacy_has_permission(
  organization_id,
  (private.get_privacy_literal_constants()).perm_privacy_read
)));

-- Automatically record immutable consent row when checkout sets marketing_opt_in = true
CREATE OR REPLACE FUNCTION private.record_checkout_marketing_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
BEGIN
  IF NEW.marketing_opt_in IS TRUE AND (TG_OP = 'INSERT' OR OLD.marketing_opt_in IS DISTINCT FROM TRUE) THEN
    INSERT INTO public.customer_consents (
      organization_id, customer_id, purpose, granted, source, actor_user_id, correlation_id
    ) VALUES (
      NEW.organization_id, NEW.id, v_c.purpose_marketing, true, v_c.src_checkout, NULL, pg_catalog.gen_random_uuid()
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.record_checkout_marketing_consent() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER customers_record_marketing_consent
AFTER INSERT OR UPDATE OF marketing_opt_in ON public.customers
FOR EACH ROW EXECUTE FUNCTION private.record_checkout_marketing_consent();

-- 2. Audit & Step-Up Extension for LGPD Privacy Operations
CREATE TABLE private.privacy_step_up_consumptions (
  guard_event_id uuid PRIMARY KEY REFERENCES public.audit_events (id) ON DELETE RESTRICT,
  consumed_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  consumed_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

REVOKE ALL PRIVILEGES ON TABLE private.privacy_step_up_consumptions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_valid_privacy_audit_metadata(
  p_action text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
  v_proof text;
BEGIN
  IF p_metadata IS NULL OR pg_catalog.jsonb_typeof(p_metadata) <> v_c.json_object THEN
    RETURN false;
  END IF;

  IF p_action = v_c.action_privacy_step_up THEN
    IF NOT (p_metadata ? v_c.meta_required_permissions)
      OR pg_catalog.jsonb_typeof(p_metadata->v_c.meta_required_permissions) <> v_c.json_array
      OR pg_catalog.jsonb_array_length(p_metadata->v_c.meta_required_permissions) <> 1
      OR (p_metadata->v_c.meta_required_permissions->>0) IS DISTINCT FROM v_c.perm_privacy_manage
      OR (p_metadata - ARRAY[v_c.meta_required_permissions, v_c.meta_step_up_proof_id]::text[]) <> '{}'::jsonb
    THEN
      RETURN false;
    END IF;
    IF p_metadata ? v_c.meta_step_up_proof_id THEN
      v_proof := p_metadata->>v_c.meta_step_up_proof_id;
      IF v_proof IS NULL OR v_proof !~ v_c.uuid_regex THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  IF p_action = v_c.action_customer_exported THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_order_count
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_order_count) = v_c.json_number
      AND (p_metadata - ARRAY[v_c.meta_order_count]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  IF p_action = v_c.action_customer_anonymized THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_reason_length
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_reason_length) = v_c.json_number
      AND (p_metadata - ARRAY[v_c.meta_reason_length]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION private.is_valid_privacy_audit_metadata(text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admitted_privacy_audit_shape(
  p_action text,
  p_target_type text,
  p_source text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT (
    p_action = (private.get_privacy_literal_constants()).action_privacy_step_up
    AND p_target_type = (private.get_privacy_literal_constants()).target_customer
    AND p_source = (private.get_privacy_literal_constants()).source_admin_guard
  )
  OR (
    p_action IN (
      (private.get_privacy_literal_constants()).action_customer_exported,
      (private.get_privacy_literal_constants()).action_customer_anonymized
    )
    AND p_target_type = (private.get_privacy_literal_constants()).target_customer
    AND p_source = (private.get_privacy_literal_constants()).source_privacy_command
  );
$function$;

REVOKE ALL ON FUNCTION private.is_admitted_privacy_audit_shape(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (
  private.is_admitted_audit_action_key(action) IS TRUE
  OR action IN (
    (private.get_privacy_literal_constants()).action_privacy_step_up,
    (private.get_privacy_literal_constants()).action_customer_exported,
    (private.get_privacy_literal_constants()).action_customer_anonymized
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_type_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_type_check CHECK (
  target_type = (private.get_privacy_literal_constants()).target_customer
  OR target_type IN (
    (private.get_storefront_literal_constants()).target_storefront_profile,
    (private.get_storefront_literal_constants()).target_media_asset,
    (private.get_delivery_literal_constants()).target_delivery_zone,
    (private.get_delivery_literal_constants()).target_delivery,
    (private.get_orders_literal_constants()).target_order,
    (private.get_settings_literal_constants()).target_setting_value,
    (private.get_catalog_literal_constants()).scope_branch,
    (private.get_catalog_literal_constants()).target_product,
    (private.get_catalog_literal_constants()).target_channel_offer
  )
  OR target_type ~ '^(product_category|product_variant|sales_channel)$'
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_reason_code_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_reason_code_check CHECK (
  reason_code IN (
    (private.get_privacy_literal_constants()).reason_exported,
    (private.get_privacy_literal_constants()).reason_anonymized,
    (private.get_storefront_literal_constants()).reason_profile_created,
    (private.get_storefront_literal_constants()).reason_profile_updated,
    (private.get_storefront_literal_constants()).reason_media_registered,
    (private.get_delivery_literal_constants()).reason_zone_created,
    (private.get_delivery_literal_constants()).reason_zone_updated,
    (private.get_delivery_literal_constants()).reason_zone_archived,
    (private.get_delivery_literal_constants()).reason_dispatch_transitioned,
    (private.get_delivery_literal_constants()).reason_dispatch_cancelled,
    (private.get_orders_literal_constants()).reason_authorized,
    (private.get_orders_literal_constants()).reason_order_placed,
    (private.get_orders_literal_constants()).reason_order_transitioned,
    (private.get_orders_literal_constants()).reason_order_cancelled,
    (private.get_orders_literal_constants()).reason_handoff_recorded,
    (private.get_settings_literal_constants()).reason_settings_created,
    (private.get_settings_literal_constants()).reason_settings_updated
  )
  OR reason_code ~ '^(invalid_scope|unauthenticated|identity_unverified|authorization_denied|aal2_required|factor_unverified|reauthentication_required|step_up_required)$'
  OR reason_code ~ '^catalog_(created|updated|archived|commercial_updated)$'
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_source_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_source_check CHECK (
  source IN (
    (private.get_privacy_literal_constants()).source_privacy_command,
    (private.get_storefront_literal_constants()).source_storefront_command,
    (private.get_delivery_literal_constants()).source_delivery_command,
    (private.get_orders_literal_constants()).source_orders_command,
    (private.get_settings_literal_constants()).source_settings_command,
    (private.get_catalog_literal_constants()).source_catalog_command,
    (private.get_catalog_literal_constants()).source_admin_guard
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_metadata_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_metadata_check CHECK (
  pg_catalog.jsonb_typeof(metadata) = (private.get_privacy_literal_constants()).json_object
  AND pg_catalog.octet_length(metadata::text) <= 1024
  AND (
    (action LIKE 'privacy.%' AND private.is_valid_privacy_audit_metadata(action, metadata) IS TRUE)
    OR ((action LIKE 'storefront.%' OR action = (private.get_storefront_literal_constants()).action_media_registered)
      AND private.is_valid_storefront_audit_metadata(action, metadata) IS TRUE)
    OR (action LIKE 'delivery.%' AND private.is_valid_delivery_audit_metadata(action, metadata) IS TRUE)
    OR ((action LIKE 'order.%' OR action = (private.get_orders_literal_constants()).action_orders_step_up)
      AND private.is_valid_orders_audit_metadata(action, metadata) IS TRUE)
    OR (action LIKE 'settings.%' AND private.is_valid_settings_audit_metadata(action, metadata) IS TRUE)
    OR (action LIKE 'catalog.%' AND action <> (private.get_storefront_literal_constants()).action_media_registered
      AND private.is_valid_catalog_audit_metadata(action, metadata) IS TRUE)
    OR (action = (private.get_catalog_literal_constants()).proof_source
      AND metadata = '{"required_permission":"tenant.hierarchy.read"}'::jsonb)
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_action_shape_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_action_shape_check CHECK (
  private.is_admitted_audit_shape(action, target_type, source) IS TRUE
  OR private.is_admitted_delivery_audit_shape(action, target_type, source) IS TRUE
  OR private.is_admitted_storefront_audit_shape(action, target_type, source) IS TRUE
  OR private.is_admitted_privacy_audit_shape(action, target_type, source) IS TRUE
);

-- 3. Privacy Step-Up, Retention Listing, LGPD Export & Anonymization RPCs
CREATE OR REPLACE FUNCTION public.append_privacy_step_up_event(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_customer_id uuid,
  p_required_permissions text[],
  p_correlation_id uuid,
  p_outcome text,
  p_reason_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
  v_proof_id uuid;
  v_metadata jsonb;
BEGIN
  IF p_correlation_id IS NULL
    OR p_customer_id IS NULL
    OR p_outcome IS NULL
    OR p_outcome NOT IN (v_c.outcome_allow, v_c.outcome_deny)
    OR p_required_permissions IS NULL
    OR cardinality(p_required_permissions) <> 1
    OR p_required_permissions[1] IS DISTINCT FROM v_c.perm_privacy_manage
    OR (p_outcome = v_c.outcome_allow AND (
      p_actor_user_id IS NULL
      OR p_organization_id IS NULL
      OR p_reason_code IS DISTINCT FROM v_c.reason_authorized
    ))
    OR (p_outcome = v_c.outcome_deny AND p_reason_code = v_c.reason_authorized)
    OR p_reason_code IS NULL
  THEN
    RAISE EXCEPTION 'Invalid privacy step-up event.' USING ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF p_outcome = v_c.outcome_allow THEN
    v_proof_id := pg_catalog.gen_random_uuid();
    v_metadata := pg_catalog.jsonb_build_object(
      v_c.meta_required_permissions, pg_catalog.to_jsonb(p_required_permissions),
      v_c.meta_step_up_proof_id, v_proof_id::text
    );
  ELSE
    v_metadata := pg_catalog.jsonb_build_object(
      v_c.meta_required_permissions, pg_catalog.to_jsonb(p_required_permissions)
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    p_actor_user_id, p_organization_id, NULL, NULL,
    v_c.action_privacy_step_up, v_c.target_customer, p_customer_id,
    p_outcome, p_reason_code, p_correlation_id, v_c.source_admin_guard, v_metadata
  );

  RETURN v_proof_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_privacy_step_up_event(uuid, uuid, uuid, text[], uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_privacy_step_up_event(uuid, uuid, uuid, text[], uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.consume_privacy_step_up_proof(
  p_proof_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_customer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
  v_event public.audit_events%ROWTYPE;
  v_rows integer;
BEGIN
  IF p_proof_id IS NULL OR p_actor_user_id IS NULL OR p_actor_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT ev.* INTO v_event
  FROM public.audit_events AS ev
  WHERE ev.action = v_c.action_privacy_step_up
    AND ev.outcome = v_c.outcome_allow
    AND ev.actor_user_id = p_actor_user_id
    AND ev.organization_id = p_organization_id
    AND ev.target_id = p_customer_id
    AND ev.metadata->>v_c.meta_step_up_proof_id = p_proof_id::text
    AND ev.created_at >= pg_catalog.now() - interval '5 minutes'
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO private.privacy_step_up_consumptions (guard_event_id, consumed_by)
  VALUES (v_event.id, p_actor_user_id)
  ON CONFLICT (guard_event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_privacy_step_up_proof(uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.privacy_list_customers(
  p_organization_id uuid,
  p_retention_days integer DEFAULT 365
)
RETURNS TABLE (
  customer_id uuid,
  display_name text,
  phone text,
  marketing_opt_in boolean,
  last_order_at timestamptz,
  anonymized_at timestamptz,
  is_retention_expired boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
  v_days integer := GREATEST(30, LEAST(COALESCE(p_retention_days, 365), 3650));
BEGIN
  IF NOT public.privacy_has_permission(p_organization_id, v_c.perm_privacy_read) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  RETURN QUERY
  SELECT
    cu.id AS customer_id,
    cu.display_name,
    cu.phone,
    cu.marketing_opt_in,
    cu.last_order_at,
    cu.anonymized_at,
    (
      cu.anonymized_at IS NULL
      AND COALESCE(cu.last_order_at, cu.created_at) < pg_catalog.now() - pg_catalog.make_interval(days => v_days)
    ) AS is_retention_expired
  FROM public.customers AS cu
  WHERE cu.organization_id = p_organization_id
  ORDER BY cu.anonymized_at IS NOT NULL ASC, COALESCE(cu.last_order_at, cu.created_at) DESC
  LIMIT 200;
END;
$function$;

REVOKE ALL ON FUNCTION public.privacy_list_customers(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.privacy_list_customers(uuid, integer)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.privacy_export_customer_data(
  p_organization_id uuid,
  p_customer_id uuid,
  p_step_up_proof_id uuid,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_cust public.customers%ROWTYPE;
  v_addresses jsonb;
  v_consents jsonb;
  v_orders jsonb;
  v_order_count integer;
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_organization_id IS NULL OR p_customer_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT public.privacy_has_permission(p_organization_id, v_c.perm_privacy_manage) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  SELECT cu.* INTO v_cust
  FROM public.customers AS cu
  WHERE cu.organization_id = p_organization_id AND cu.id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF NOT private.consume_privacy_step_up_proof(
    p_step_up_proof_id, v_actor_id, p_organization_id, p_customer_id
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_step_up_required, ERRCODE = v_c.sqlstate_42501;
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'street_line', ad.street_line,
    'number_label', ad.number_label,
    v_c.key_neighborhood, ad.neighborhood,
    v_c.key_city, ad.city,
    v_c.key_state_code, ad.state_code
  ) ORDER BY ad.created_at DESC), '[]'::jsonb)
  INTO v_addresses
  FROM public.customer_addresses AS ad
  WHERE ad.organization_id = p_organization_id AND ad.customer_id = p_customer_id;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'purpose', cc.purpose,
    'granted', cc.granted,
    'source', cc.source,
    'created_at', cc.created_at
  ) ORDER BY cc.created_at DESC), '[]'::jsonb)
  INTO v_consents
  FROM public.customer_consents AS cc
  WHERE cc.organization_id = p_organization_id AND cc.customer_id = p_customer_id;

  SELECT
    COUNT(*)::integer,
    COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'order_number', ord.order_number,
      'status', ord.status,
      'fulfillment_mode', ord.fulfillment_mode,
      'total_amount', ord.total_amount,
      'placed_at', ord.placed_at
    ) ORDER BY ord.placed_at DESC), '[]'::jsonb)
  INTO v_order_count, v_orders
  FROM public.orders AS ord
  WHERE ord.organization_id = p_organization_id AND ord.customer_id = p_customer_id;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, p_organization_id, NULL, NULL,
    v_c.action_customer_exported, v_c.target_customer, p_customer_id,
    v_c.outcome_allow, v_c.reason_exported, p_correlation_id, v_c.source_privacy_command,
    pg_catalog.jsonb_build_object(v_c.meta_order_count, v_order_count)
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_customer_id, v_cust.id,
    'exported_at', pg_catalog.now(),
    'subject', pg_catalog.jsonb_build_object(
      'display_name', v_cust.display_name,
      'phone', v_cust.phone,
      'marketing_opt_in', v_cust.marketing_opt_in,
      'last_order_at', v_cust.last_order_at,
      'anonymized_at', v_cust.anonymized_at
    ),
    'addresses', v_addresses,
    'consents', v_consents,
    'orders', v_orders,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.privacy_export_customer_data(uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.privacy_export_customer_data(uuid, uuid, uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.privacy_anonymize_customer(
  p_organization_id uuid,
  p_customer_id uuid,
  p_reason text,
  p_step_up_proof_id uuid,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.privacy_literal_constants := private.get_privacy_literal_constants();
  v_oc private.orders_literal_constants := private.get_orders_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_clean_reason text := pg_catalog.btrim(COALESCE(p_reason, ''));
  v_cust public.customers%ROWTYPE;
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_organization_id IS NULL OR p_customer_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT public.privacy_has_permission(p_organization_id, v_c.perm_privacy_manage) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT private.catalog_has_non_whitespace(v_clean_reason) OR pg_catalog.char_length(v_clean_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  SELECT cu.* INTO v_cust
  FROM public.customers AS cu
  WHERE cu.organization_id = p_organization_id AND cu.id = p_customer_id
  FOR UPDATE;
  IF NOT FOUND OR v_cust.anonymized_at IS NOT NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders AS ord
    WHERE ord.organization_id = p_organization_id
      AND ord.customer_id = p_customer_id
      AND ord.status NOT IN (v_oc.st_completed, v_oc.st_cancelled)
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_active_orders, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF NOT private.consume_privacy_step_up_proof(
    p_step_up_proof_id, v_actor_id, p_organization_id, p_customer_id
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_privacy_step_up_required, ERRCODE = v_c.sqlstate_42501;
  END IF;

  -- Scrub PII on terminal orders while keeping exact numeric(12,2) financial totals intact
  UPDATE public.orders
  SET
    delivery_address_id = NULL,
    customer_name_snapshot = v_c.anon_display_name,
    customer_phone_snapshot = v_c.anon_phone,
    customer_notes = '',
    delivery_address_snapshot = CASE
      WHEN delivery_address_snapshot IS NOT NULL THEN pg_catalog.jsonb_build_object(
        'street_line', v_c.anon_street,
        'number_label', 'S/N',
        v_c.key_neighborhood, COALESCE(delivery_address_snapshot->>v_c.key_neighborhood, ''),
        v_c.key_city, COALESCE(delivery_address_snapshot->>v_c.key_city, ''),
        v_c.key_state_code, COALESCE(delivery_address_snapshot->>v_c.key_state_code, 'SP')
      )
      ELSE NULL
    END,
    updated_at = pg_catalog.now()
  WHERE organization_id = p_organization_id AND customer_id = p_customer_id;

  DELETE FROM public.customer_addresses
  WHERE organization_id = p_organization_id AND customer_id = p_customer_id;

  DELETE FROM private.order_public_tracking_tokens
  WHERE organization_id = p_organization_id
    AND order_id IN (SELECT id FROM public.orders WHERE organization_id = p_organization_id AND customer_id = p_customer_id);

  UPDATE public.customers
  SET
    display_name = v_c.anon_display_name,
    phone = v_c.anon_phone,
    phone_normalized = v_c.anon_phone,
    marketing_opt_in = false,
    marketing_opt_in_updated_at = pg_catalog.now(),
    anonymized_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  WHERE id = p_customer_id;

  INSERT INTO public.customer_consents (
    organization_id, customer_id, purpose, granted, source, actor_user_id, correlation_id
  ) VALUES (
    p_organization_id, p_customer_id, v_c.purpose_marketing, false, v_c.src_console, v_actor_id, p_correlation_id
  );

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, p_organization_id, NULL, NULL,
    v_c.action_customer_anonymized, v_c.target_customer, p_customer_id,
    v_c.outcome_allow, v_c.reason_anonymized, p_correlation_id, v_c.source_privacy_command,
    pg_catalog.jsonb_build_object(v_c.meta_reason_length, pg_catalog.char_length(v_clean_reason))
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_customer_id, p_customer_id,
    'anonymized', true,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.privacy_anonymize_customer(uuid, uuid, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.privacy_anonymize_customer(uuid, uuid, text, uuid, uuid)
  TO authenticated;
