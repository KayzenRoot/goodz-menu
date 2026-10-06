-- GMZ-IMPL-007 — Catalog server application contracts.
--
-- Every catalog mutation in this slice is a SECURITY DEFINER function in the public schema that:
--   * resolves the actor from the caller's own verified session (auth.uid()), never from a
--     service-role credential;
--   * resolves the target tenant scope and fails closed when the scope is unknown or unauthorized;
--   * requires an explicit catalog capability through the existing membership/RBAC model;
--   * requires a fresh AAL2 step-up proof taken from the caller's own verified JWT for every
--     privileged commercial mutation (price, promotional price, availability, visibility);
--   * honours an idempotency key so a retried command cannot apply twice;
--   * writes the durable audit event and the business mutation inside one transaction, so an audit
--     failure rolls the mutation back instead of letting the mutation land unaudited;
--   * appends price history instead of rewriting it, so prior commercial truth survives later
--     price changes.
--
-- The Data API grants no INSERT/UPDATE/DELETE privilege on catalog tables, so these functions are
-- the only mutation path available to an ordinary authenticated client.

-- ---------------------------------------------------------------------------
-- 1. Contract helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.catalog_actor_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid());
$function$;

CREATE OR REPLACE FUNCTION private.catalog_require_actor()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
BEGIN
  v_actor_user_id := (SELECT private.catalog_actor_user_id());
  IF v_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated session is required for catalog operations.'
      USING ERRCODE = '42501';
  END IF;
  RETURN v_actor_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_authorize(
  p_permission_key text,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF (SELECT private.catalog_scope_grants(
    p_permission_key,
    p_organization_id,
    p_establishment_id,
    p_branch_id
  )) IS NOT TRUE THEN
    RAISE EXCEPTION 'The current session is not authorized for this catalog operation.'
      USING ERRCODE = '42501';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_assert_input(
  p_field text,
  p_is_valid boolean
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  IF p_is_valid IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid catalog input for %.', p_field
      USING ERRCODE = '22023';
  END IF;
END;
$function$;

-- Privileged commercial mutations require an aal2 session whose latest authentication method is a
-- totp proof and whose password grant is itself inside the freshness window. Both facts come from
-- the signature-verified claims PostgREST already accepted, so no unsigned app assertion is trusted.
CREATE OR REPLACE FUNCTION private.catalog_require_step_up()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now bigint := pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint;
  v_claims jsonb := (SELECT auth.jwt());
BEGIN
  IF v_claims IS NULL OR (v_claims ->> 'aal') IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'A second authentication factor is required for this catalog operation.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(
      CASE
        WHEN pg_catalog.jsonb_typeof(v_claims -> 'amr') = 'array' THEN v_claims -> 'amr'
        ELSE '[]'::jsonb
      END
    ) AS entry
    WHERE entry ->> 'method' = 'totp'
      AND entry ->> 'timestamp' ~ '^[0-9]{1,19}$'
      AND (entry ->> 'timestamp')::bigint >= v_now - 300
      AND (entry ->> 'timestamp')::bigint <= v_now + 1
  ) THEN
    RAISE EXCEPTION 'A recent two-step verification is required for this catalog operation.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(
      CASE
        WHEN pg_catalog.jsonb_typeof(v_claims -> 'amr') = 'array' THEN v_claims -> 'amr'
        ELSE '[]'::jsonb
      END
    ) AS entry
    WHERE entry ->> 'method' = 'password'
      AND entry ->> 'timestamp' ~ '^[0-9]{1,19}$'
      AND (entry ->> 'timestamp')::bigint >= v_now - 300
      AND (entry ->> 'timestamp')::bigint <= v_now + 1
  ) THEN
    RAISE EXCEPTION 'A recent password reauthentication is required for this catalog operation.'
      USING ERRCODE = '42501';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_audit_metadata(
  p_required_permission text,
  p_resource_kind text,
  p_changed_fields text[],
  p_previous_value text,
  p_next_value text
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT pg_catalog.jsonb_strip_nulls(
    pg_catalog.jsonb_build_object(
      'required_permission', p_required_permission,
      'resource_kind', p_resource_kind,
      'changed_fields', (
        CASE
          WHEN p_changed_fields IS NULL OR pg_catalog.array_length(p_changed_fields, 1) IS NULL
            THEN NULL
          ELSE pg_catalog.to_jsonb(p_changed_fields)
        END
      ),
      'previous_value', p_previous_value,
      'next_value', p_next_value
    )
  );
$function$;

CREATE OR REPLACE FUNCTION private.catalog_append_audit(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_actor_user_id uuid,
  p_correlation_id uuid,
  p_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_audit_event_id uuid;
BEGIN
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
    'allow',
    'authorized',
    p_correlation_id,
    'catalog_contract',
    p_metadata
  )
  RETURNING id INTO v_audit_event_id;

  RETURN v_audit_event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_record_receipt(
  p_organization_id uuid,
  p_idempotency_key uuid,
  p_actor_user_id uuid,
  p_correlation_id uuid,
  p_audit_event_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_resulting_price_revision integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
-- A command the caller did not give a key for is keyed by its correlation id, so a repeated
-- submission of the same request is recognised as a replay instead of repeating the mutation.
BEGIN
  INSERT INTO public.catalog_command_receipts (
    organization_id,
    idempotency_key,
    actor_user_id,
    correlation_id,
    audit_event_id,
    action,
    target_type,
    target_id,
    resulting_price_revision
  )
  VALUES (
    p_organization_id,
    COALESCE(p_idempotency_key, p_correlation_id),
    p_actor_user_id,
    p_correlation_id,
    p_audit_event_id,
    p_action,
    p_target_type,
    p_target_id,
    p_resulting_price_revision
  );
END;
$function$;

-- Replay of an already applied command returns the original result instead of mutating twice.
CREATE OR REPLACE FUNCTION private.catalog_replay(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key uuid,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_receipt public.catalog_command_receipts%ROWTYPE;
  v_effective_key uuid := COALESCE(p_idempotency_key, p_correlation_id);
BEGIN
  IF v_effective_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_receipt
  FROM public.catalog_command_receipts
  WHERE organization_id = p_organization_id
    AND idempotency_key = v_effective_key;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_receipt.actor_user_id IS DISTINCT FROM p_actor_user_id THEN
    RAISE EXCEPTION 'The idempotency key was already used by another actor.'
      USING ERRCODE = '42501';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'action', v_receipt.action,
    'audit_event_id', v_receipt.audit_event_id,
    'correlation_id', v_receipt.correlation_id,
    'price_revision', v_receipt.resulting_price_revision,
    'replayed', true,
    'target_id', v_receipt.target_id,
    'target_type', v_receipt.target_type
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_command_result(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_price_revision integer,
  p_audit_event_id uuid,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT pg_catalog.jsonb_build_object(
    'action', p_action,
    'audit_event_id', p_audit_event_id,
    'correlation_id', p_correlation_id,
    'price_revision', p_price_revision,
    'replayed', false,
    'target_id', p_target_id,
    'target_type', p_target_type
  );
$function$;

CREATE OR REPLACE FUNCTION private.catalog_price_state(p_amount numeric, p_currency text, p_promotional_amount numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT p_amount::text || '|' || p_currency
    || '|' || COALESCE(p_promotional_amount::text, 'none');
$function$;

REVOKE ALL ON FUNCTION private.catalog_actor_user_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_require_actor() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_authorize(text, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_assert_input(text, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_require_step_up() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_audit_metadata(text, text, text[], text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_append_audit(text, text, uuid, uuid, uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_record_receipt(uuid, uuid, uuid, uuid, uuid, text, text, uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_replay(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_command_result(text, text, uuid, integer, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_price_state(numeric, text, numeric) FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. ProductCategory contracts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.catalog_create_category(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_parent_category_id uuid,
  p_name text,
  p_description text,
  p_display_order integer,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_category_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_authorize('catalog.write', p_organization_id, p_establishment_id, p_branch_id);

  v_replayed := private.catalog_replay(p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('name', p_name ~ '[^[:space:]]' AND char_length(p_name) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);
  PERFORM private.catalog_assert_input('display_order', p_display_order BETWEEN -100000 AND 100000);

  INSERT INTO public.product_categories (
    organization_id, establishment_id, branch_id, parent_category_id,
    name, description, display_order
  )
  VALUES (
    p_organization_id, p_establishment_id, p_branch_id, p_parent_category_id,
    p_name, p_description, p_display_order
  )
  RETURNING id INTO v_category_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.category.created', 'product_category', v_category_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'product_category', ARRAY['name'], NULL, p_name)
  );

  PERFORM private.catalog_record_receipt(
    p_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.category.created', 'product_category', v_category_id, NULL
  );

  RETURN private.catalog_command_result(
    'catalog.category.created', 'product_category', v_category_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_category(
  p_category_id uuid,
  p_name text,
  p_description text,
  p_display_order integer,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);

  SELECT * INTO v_previous
  FROM public.product_categories
  WHERE id = p_category_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested category is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.write', v_organization_id, v_establishment_id, v_branch_id);

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('name', p_name ~ '[^[:space:]]' AND char_length(p_name) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);
  PERFORM private.catalog_assert_input('display_order', p_display_order BETWEEN -100000 AND 100000);

  UPDATE public.product_categories
  SET name = p_name,
      description = p_description,
      display_order = p_display_order,
      updated_at = pg_catalog.now()
  WHERE id = p_category_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.category.updated', 'product_category', p_category_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(
      'catalog.write', 'product_category', ARRAY['name', 'display_order'],
      v_previous.name || '|' || v_previous.display_order::text,
      p_name || '|' || p_display_order::text
    )
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.category.updated', 'product_category', p_category_id, NULL
  );

  RETURN private.catalog_command_result(
    'catalog.category.updated', 'product_category', p_category_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_set_category_archived(
  p_category_id uuid,
  p_archived boolean,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('archived', p_archived IS NOT NULL);
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);

  SELECT * INTO v_previous
  FROM public.product_categories
  WHERE id = p_category_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested category is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.write', v_organization_id, v_establishment_id, v_branch_id);

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  v_action := CASE WHEN p_archived THEN 'catalog.category.archived' ELSE 'catalog.category.reactivated' END;

  UPDATE public.product_categories
  SET status = CASE WHEN p_archived THEN 'archived' ELSE 'active' END,
      archived_at = CASE WHEN p_archived THEN pg_catalog.now() ELSE NULL END,
      updated_at = pg_catalog.now()
  WHERE id = p_category_id;

  v_audit_event_id := private.catalog_append_audit(
    v_action, 'product_category', p_category_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'product_category', ARRAY['status'], v_previous.status, CASE WHEN p_archived THEN 'archived' ELSE 'active' END)
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    v_action, 'product_category', p_category_id, NULL
  );

  RETURN private.catalog_command_result(
    v_action, 'product_category', p_category_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Product contracts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.catalog_create_product(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_product_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_authorize('catalog.write', p_organization_id, p_establishment_id, p_branch_id);

  v_replayed := private.catalog_replay(p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('name', p_name ~ '[^[:space:]]' AND char_length(p_name) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);

  INSERT INTO public.products (
    organization_id, establishment_id, branch_id, category_id, name, description
  )
  VALUES (
    p_organization_id, p_establishment_id, p_branch_id, p_category_id, p_name, p_description
  )
  RETURNING id INTO v_product_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.product.created', 'product', v_product_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'product', ARRAY['name'], NULL, p_name)
  );

  PERFORM private.catalog_record_receipt(
    p_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.product.created', 'product', v_product_id, NULL
  );

  RETURN private.catalog_command_result(
    'catalog.product.created', 'product', v_product_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);

  SELECT * INTO v_previous
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested product is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.write', v_organization_id, v_establishment_id, v_branch_id);

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('name', p_name ~ '[^[:space:]]' AND char_length(p_name) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);

  UPDATE public.products
  SET name = p_name,
      description = p_description,
      updated_at = pg_catalog.now()
  WHERE id = p_product_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.product.updated', 'product', p_product_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'product', ARRAY['name', 'description'], v_previous.name, p_name)
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.product.updated', 'product', p_product_id, NULL
  );

  RETURN private.catalog_command_result(
    'catalog.product.updated', 'product', p_product_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_set_product_archived(
  p_product_id uuid,
  p_archived boolean,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_action text;
  v_next_status text;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('archived', p_archived IS NOT NULL);
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);

  SELECT * INTO v_previous
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested product is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.write', v_organization_id, v_establishment_id, v_branch_id);

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  v_action := CASE WHEN p_archived THEN 'catalog.product.archived' ELSE 'catalog.product.reactivated' END;
  v_next_status := CASE WHEN p_archived THEN 'archived' ELSE 'active' END;

  IF v_previous.status IS DISTINCT FROM v_next_status THEN
    UPDATE public.products
    SET status = v_next_status,
        archived_at = CASE WHEN p_archived THEN pg_catalog.now() ELSE NULL END,
        updated_at = pg_catalog.now()
    WHERE id = p_product_id;
  END IF;

  v_audit_event_id := private.catalog_append_audit(
    v_action, 'product', p_product_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'product', ARRAY['status'], v_previous.status, v_next_status)
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    v_action, 'product', p_product_id, NULL
  );

  RETURN private.catalog_command_result(
    v_action, 'product', p_product_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. ProductVariant contracts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.catalog_create_variant(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_name text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_variant_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_authorize('catalog.write', p_organization_id, p_establishment_id, p_branch_id);

  v_replayed := private.catalog_replay(p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('name', p_name ~ '[^[:space:]]' AND char_length(p_name) BETWEEN 1 AND 120);

  INSERT INTO public.product_variants (
    organization_id, establishment_id, branch_id, product_id, name
  )
  VALUES (
    p_organization_id, p_establishment_id, p_branch_id, p_product_id, p_name
  )
  RETURNING id INTO v_variant_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.variant.created', 'product_variant', v_variant_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'product_variant', ARRAY['name'], NULL, p_name)
  );

  PERFORM private.catalog_record_receipt(
    p_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.variant.created', 'product_variant', v_variant_id, NULL
  );

  RETURN private.catalog_command_result(
    'catalog.variant.created', 'product_variant', v_variant_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_variant(
  p_variant_id uuid,
  p_name text,
  p_archived boolean,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_action text;
  v_next_status text;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('archived', p_archived IS NOT NULL);
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);

  SELECT * INTO v_previous
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested variant is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.write', v_organization_id, v_establishment_id, v_branch_id);

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('name', p_name ~ '[^[:space:]]' AND char_length(p_name) BETWEEN 1 AND 120);

  v_next_status := CASE WHEN p_archived THEN 'archived' ELSE 'active' END;
  v_action := CASE WHEN p_archived THEN 'catalog.variant.archived' ELSE 'catalog.variant.reactivated' END;

  UPDATE public.product_variants
  SET name = p_name,
      status = v_next_status,
      archived_at = CASE WHEN p_archived THEN pg_catalog.now() ELSE NULL END,
      updated_at = pg_catalog.now()
  WHERE id = p_variant_id;

  v_audit_event_id := private.catalog_append_audit(
    CASE WHEN p_name IS DISTINCT FROM v_previous.name THEN 'catalog.variant.updated' ELSE v_action END,
    'product_variant', p_variant_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(
      'catalog.write', 'product_variant', ARRAY['name', 'status'],
      v_previous.name || '|' || v_previous.status,
      p_name || '|' || v_next_status
    )
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    CASE WHEN p_name IS DISTINCT FROM v_previous.name THEN 'catalog.variant.updated' ELSE v_action END,
    'product_variant', p_variant_id, NULL
  );

  RETURN private.catalog_command_result(
    CASE WHEN p_name IS DISTINCT FROM v_previous.name THEN 'catalog.variant.updated' ELSE v_action END,
    'product_variant', p_variant_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. SalesChannel contracts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.catalog_create_sales_channel(
  p_organization_id uuid,
  p_channel_key text,
  p_display_name text,
  p_description text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_channel_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_authorize('catalog.write', p_organization_id, NULL, NULL);

  v_replayed := private.catalog_replay(p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('channel_key', p_channel_key ~ '^[a-z][a-z0-9_-]{0,63}$');
  PERFORM private.catalog_assert_input('display_name', p_display_name ~ '[^[:space:]]' AND char_length(p_display_name) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);

  INSERT INTO public.sales_channels (
    organization_id, channel_key, display_name, description
  )
  VALUES (
    p_organization_id, p_channel_key, p_display_name, p_description
  )
  RETURNING id INTO v_channel_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.sales_channel.created', 'sales_channel', v_channel_id,
    p_organization_id, NULL, NULL,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'sales_channel', ARRAY['channel_key'], NULL, p_channel_key)
  );

  PERFORM private.catalog_record_receipt(
    p_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.sales_channel.created', 'sales_channel', v_channel_id, NULL
  );

  RETURN private.catalog_command_result(
    'catalog.sales_channel.created', 'sales_channel', v_channel_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_sales_channel(
  p_channel_id uuid,
  p_display_name text,
  p_description text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_action text;
  v_next_status text;
  v_archived boolean;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);

  SELECT * INTO v_previous
  FROM public.sales_channels
  WHERE id = p_channel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested sales channel is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  PERFORM private.catalog_authorize('catalog.write', v_organization_id, NULL, NULL);

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  IF p_display_name IS NULL THEN
    p_display_name := v_previous.display_name;
  END IF;
  IF p_description IS NULL THEN
    p_description := v_previous.description;
  END IF;
  v_archived := v_previous.status = 'archived';

  PERFORM private.catalog_assert_input('display_name', p_display_name ~ '[^[:space:]]' AND char_length(p_display_name) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);

  v_next_status := CASE WHEN v_archived THEN 'archived' ELSE 'active' END;
  v_action := CASE WHEN v_archived THEN 'catalog.sales_channel.archived' ELSE 'catalog.sales_channel.updated' END;

  UPDATE public.sales_channels
  SET display_name = p_display_name,
      description = p_description,
      status = v_next_status,
      archived_at = CASE WHEN v_archived THEN COALESCE(archived_at, pg_catalog.now()) ELSE NULL END,
      updated_at = pg_catalog.now()
  WHERE id = p_channel_id;

  v_audit_event_id := private.catalog_append_audit(
    v_action, 'sales_channel', p_channel_id,
    v_organization_id, NULL, NULL,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'sales_channel', ARRAY['display_name', 'description'], v_previous.display_name, p_display_name)
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    v_action, 'sales_channel', p_channel_id, NULL
  );

  RETURN private.catalog_command_result(
    v_action, 'sales_channel', p_channel_id, NULL, v_audit_event_id, p_correlation_id
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. ChannelOffer contracts (privileged commercial mutations)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.catalog_create_channel_offer(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_sales_channel_id uuid,
  p_product_id uuid,
  p_product_variant_id uuid,
  p_title text,
  p_description text,
  p_base_price_amount numeric,
  p_base_price_currency text,
  p_promotional_price_amount numeric,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_offer_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_assert_input(
    'target',
    num_nonnulls(p_product_id, p_product_variant_id) = 1
  );
  PERFORM private.catalog_assert_input('title', p_title IS NULL OR char_length(p_title) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);
  PERFORM private.catalog_assert_input('base_price_amount', p_base_price_amount >= 0);
  PERFORM private.catalog_assert_input('base_price_currency', p_base_price_currency ~ '^[A-Z]{3}$');
  PERFORM private.catalog_assert_input(
    'promotional_price_amount',
    p_promotional_price_amount IS NULL
      OR (p_promotional_price_amount >= 0 AND p_promotional_price_amount < p_base_price_amount)
  );

  PERFORM private.catalog_authorize('catalog.price.manage', p_organization_id, p_establishment_id, p_branch_id);
  PERFORM private.catalog_require_step_up();

  v_replayed := private.catalog_replay(p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  INSERT INTO public.channel_offers (
    organization_id, establishment_id, branch_id, sales_channel_id,
    product_id, product_variant_id, title, description,
    base_price_amount, base_price_currency, promotional_price_amount
  )
  VALUES (
    p_organization_id, p_establishment_id, p_branch_id, p_sales_channel_id,
    p_product_id, p_product_variant_id, p_title, p_description,
    p_base_price_amount, p_base_price_currency, p_promotional_price_amount
  )
  RETURNING id INTO v_offer_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.channel_offer.created', 'channel_offer', v_offer_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(
      'catalog.price.manage', 'channel_offer', ARRAY['base_price_amount', 'promotional_price_amount'],
      NULL, private.catalog_price_state(p_base_price_amount, p_base_price_currency, p_promotional_price_amount)
    )
  );

  INSERT INTO public.channel_offer_price_history (
    organization_id, channel_offer_id, price_revision,
    base_price_amount, base_price_currency, promotional_price_amount,
    availability, visibility, effective_from,
    recorded_by_user_id, correlation_id, audit_event_id
  )
  VALUES (
    p_organization_id, v_offer_id, 1,
    p_base_price_amount, p_base_price_currency, p_promotional_price_amount,
    'available', 'visible', pg_catalog.now(),
    v_actor_user_id, p_correlation_id, v_audit_event_id
  );

  PERFORM private.catalog_record_receipt(
    p_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.channel_offer.created', 'channel_offer', v_offer_id, 1
  );

  RETURN private.catalog_command_result(
    'catalog.channel_offer.created', 'channel_offer', v_offer_id, 1, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_channel_offer_presentation(
  p_offer_id uuid,
  p_title text,
  p_description text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_assert_input('title', p_title IS NULL OR char_length(p_title) BETWEEN 1 AND 120);
  PERFORM private.catalog_assert_input('description', p_description IS NULL OR char_length(p_description) <= 1000);

  SELECT * INTO v_previous
  FROM public.channel_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested channel offer is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.write', v_organization_id, v_establishment_id, v_branch_id);

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  UPDATE public.channel_offers
  SET title = p_title,
      description = p_description,
      updated_at = pg_catalog.now()
  WHERE id = p_offer_id;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.channel_offer.updated', 'channel_offer', p_offer_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.write', 'channel_offer', ARRAY['title', 'description'], v_previous.title, p_title)
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.channel_offer.updated', 'channel_offer', p_offer_id, v_previous.price_revision
  );

  RETURN private.catalog_command_result(
    'catalog.channel_offer.updated', 'channel_offer', p_offer_id, v_previous.price_revision, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_channel_offer_price(
  p_offer_id uuid,
  p_base_price_amount numeric,
  p_promotional_price_amount numeric,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_revision integer;
  v_next_currency text;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_assert_input('base_price_amount', p_base_price_amount >= 0);
  PERFORM private.catalog_assert_input(
    'promotional_price_amount',
    p_promotional_price_amount IS NULL
      OR (p_promotional_price_amount >= 0 AND p_promotional_price_amount < p_base_price_amount)
  );

  SELECT * INTO v_previous
  FROM public.channel_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested channel offer is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;
  v_next_currency := v_previous.base_price_currency;

  PERFORM private.catalog_authorize('catalog.price.manage', v_organization_id, v_establishment_id, v_branch_id);
  PERFORM private.catalog_require_step_up();

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  IF p_base_price_amount = v_previous.base_price_amount
    AND p_promotional_price_amount IS NOT DISTINCT FROM v_previous.promotional_price_amount
  THEN
    RAISE EXCEPTION 'The requested price change does not alter the current commercial state.'
      USING ERRCODE = '22023';
  END IF;

  v_revision := v_previous.price_revision + 1;

  v_audit_event_id := private.catalog_append_audit(
    CASE
      WHEN p_base_price_amount IS DISTINCT FROM v_previous.base_price_amount
        AND p_promotional_price_amount IS DISTINCT FROM v_previous.promotional_price_amount
        THEN 'catalog.channel_offer.price_changed'
      WHEN p_promotional_price_amount IS DISTINCT FROM v_previous.promotional_price_amount
        THEN 'catalog.channel_offer.promotional_price_changed'
      ELSE 'catalog.channel_offer.price_changed'
    END,
    'channel_offer', p_offer_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(
      'catalog.price.manage', 'channel_offer', ARRAY['base_price_amount', 'promotional_price_amount'],
      private.catalog_price_state(v_previous.base_price_amount, v_next_currency, v_previous.promotional_price_amount),
      private.catalog_price_state(p_base_price_amount, v_next_currency, p_promotional_price_amount)
    )
  );

  UPDATE public.channel_offers
  SET base_price_amount = p_base_price_amount,
      promotional_price_amount = p_promotional_price_amount,
      price_revision = v_revision,
      updated_at = pg_catalog.now()
  WHERE id = p_offer_id;

  INSERT INTO public.channel_offer_price_history (
    organization_id, channel_offer_id, price_revision,
    base_price_amount, base_price_currency, promotional_price_amount,
    availability, visibility, effective_from,
    recorded_by_user_id, correlation_id, audit_event_id
  )
  VALUES (
    v_organization_id, p_offer_id, v_revision,
    p_base_price_amount, v_next_currency, p_promotional_price_amount,
    v_previous.availability, v_previous.visibility, pg_catalog.now(),
    v_actor_user_id, p_correlation_id, v_audit_event_id
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.channel_offer.price_changed', 'channel_offer', p_offer_id, v_revision
  );

  RETURN private.catalog_command_result(
    'catalog.channel_offer.price_changed', 'channel_offer', p_offer_id, v_revision, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_channel_offer_availability(
  p_offer_id uuid,
  p_availability text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_revision integer;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_assert_input('availability', p_availability IN ('available', 'unavailable'));

  SELECT * INTO v_previous
  FROM public.channel_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested channel offer is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.availability.manage', v_organization_id, v_establishment_id, v_branch_id);
  PERFORM private.catalog_require_step_up();

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  IF p_availability = v_previous.availability THEN
    RAISE EXCEPTION 'The requested availability change does not alter the current commercial state.'
      USING ERRCODE = '22023';
  END IF;

  v_revision := v_previous.price_revision + 1;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.channel_offer.availability_changed', 'channel_offer', p_offer_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.availability.manage', 'channel_offer', ARRAY['availability'], v_previous.availability, p_availability)
  );

  UPDATE public.channel_offers
  SET availability = p_availability,
      price_revision = v_revision,
      updated_at = pg_catalog.now()
  WHERE id = p_offer_id;

  INSERT INTO public.channel_offer_price_history (
    organization_id, channel_offer_id, price_revision,
    base_price_amount, base_price_currency, promotional_price_amount,
    availability, visibility, effective_from,
    recorded_by_user_id, correlation_id, audit_event_id
  )
  VALUES (
    v_organization_id, p_offer_id, v_revision,
    v_previous.base_price_amount, v_previous.base_price_currency, v_previous.promotional_price_amount,
    p_availability, v_previous.visibility, pg_catalog.now(),
    v_actor_user_id, p_correlation_id, v_audit_event_id
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.channel_offer.availability_changed', 'channel_offer', p_offer_id, v_revision
  );

  RETURN private.catalog_command_result(
    'catalog.channel_offer.availability_changed', 'channel_offer', p_offer_id, v_revision, v_audit_event_id, p_correlation_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.catalog_update_channel_offer_visibility(
  p_offer_id uuid,
  p_visibility text,
  p_correlation_id uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_previous record;
  v_organization_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_revision integer;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input('correlation_id', p_correlation_id IS NOT NULL);
  PERFORM private.catalog_assert_input('visibility', p_visibility IN ('visible', 'hidden'));

  SELECT * INTO v_previous
  FROM public.channel_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested channel offer is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  v_organization_id := v_previous.organization_id;
  v_establishment_id := v_previous.establishment_id;
  v_branch_id := v_previous.branch_id;

  PERFORM private.catalog_authorize('catalog.availability.manage', v_organization_id, v_establishment_id, v_branch_id);
  PERFORM private.catalog_require_step_up();

  v_replayed := private.catalog_replay(v_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id);
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  IF p_visibility = v_previous.visibility THEN
    RAISE EXCEPTION 'The requested visibility change does not alter the current commercial state.'
      USING ERRCODE = '22023';
  END IF;

  v_revision := v_previous.price_revision + 1;

  v_audit_event_id := private.catalog_append_audit(
    'catalog.channel_offer.visibility_changed', 'channel_offer', p_offer_id,
    v_organization_id, v_establishment_id, v_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata('catalog.availability.manage', 'channel_offer', ARRAY['visibility'], v_previous.visibility, p_visibility)
  );

  UPDATE public.channel_offers
  SET visibility = p_visibility,
      price_revision = v_revision,
      updated_at = pg_catalog.now()
  WHERE id = p_offer_id;

  INSERT INTO public.channel_offer_price_history (
    organization_id, channel_offer_id, price_revision,
    base_price_amount, base_price_currency, promotional_price_amount,
    availability, visibility, effective_from,
    recorded_by_user_id, correlation_id, audit_event_id
  )
  VALUES (
    v_organization_id, p_offer_id, v_revision,
    v_previous.base_price_amount, v_previous.base_price_currency, v_previous.promotional_price_amount,
    v_previous.availability, p_visibility, pg_catalog.now(),
    v_actor_user_id, p_correlation_id, v_audit_event_id
  );

  PERFORM private.catalog_record_receipt(
    v_organization_id, p_idempotency_key, v_actor_user_id, p_correlation_id, v_audit_event_id,
    'catalog.channel_offer.visibility_changed', 'channel_offer', p_offer_id, v_revision
  );

  RETURN private.catalog_command_result(
    'catalog.channel_offer.visibility_changed', 'channel_offer', p_offer_id, v_revision, v_audit_event_id, p_correlation_id
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Execution grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION
  public.catalog_create_category(uuid, uuid, uuid, uuid, text, text, integer, uuid, uuid),
  public.catalog_update_category(uuid, text, text, integer, uuid, uuid),
  public.catalog_set_category_archived(uuid, boolean, uuid, uuid),
  public.catalog_create_product(uuid, uuid, uuid, uuid, text, text, uuid, uuid),
  public.catalog_update_product(uuid, text, text, uuid, uuid),
  public.catalog_set_product_archived(uuid, boolean, uuid, uuid),
  public.catalog_create_variant(uuid, uuid, uuid, uuid, text, uuid, uuid),
  public.catalog_update_variant(uuid, text, boolean, uuid, uuid),
  public.catalog_create_sales_channel(uuid, text, text, text, uuid, uuid),
  public.catalog_update_sales_channel(uuid, text, text, uuid, uuid),
  public.catalog_create_channel_offer(uuid, uuid, uuid, uuid, uuid, uuid, text, text, numeric, text, numeric, uuid, uuid),
  public.catalog_update_channel_offer_presentation(uuid, text, text, uuid, uuid),
  public.catalog_update_channel_offer_price(uuid, numeric, numeric, uuid, uuid),
  public.catalog_update_channel_offer_availability(uuid, text, uuid, uuid),
  public.catalog_update_channel_offer_visibility(uuid, text, uuid, uuid)
FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION
  public.catalog_create_category(uuid, uuid, uuid, uuid, text, text, integer, uuid, uuid),
  public.catalog_update_category(uuid, text, text, integer, uuid, uuid),
  public.catalog_set_category_archived(uuid, boolean, uuid, uuid),
  public.catalog_create_product(uuid, uuid, uuid, uuid, text, text, uuid, uuid),
  public.catalog_update_product(uuid, text, text, uuid, uuid),
  public.catalog_set_product_archived(uuid, boolean, uuid, uuid),
  public.catalog_create_variant(uuid, uuid, uuid, uuid, text, uuid, uuid),
  public.catalog_update_variant(uuid, text, boolean, uuid, uuid),
  public.catalog_create_sales_channel(uuid, text, text, text, uuid, uuid),
  public.catalog_update_sales_channel(uuid, text, text, uuid, uuid),
  public.catalog_create_channel_offer(uuid, uuid, uuid, uuid, uuid, uuid, text, text, numeric, text, numeric, uuid, uuid),
  public.catalog_update_channel_offer_presentation(uuid, text, text, uuid, uuid),
  public.catalog_update_channel_offer_price(uuid, numeric, numeric, uuid, uuid),
  public.catalog_update_channel_offer_availability(uuid, text, uuid, uuid),
  public.catalog_update_channel_offer_visibility(uuid, text, uuid, uuid)
TO authenticated;