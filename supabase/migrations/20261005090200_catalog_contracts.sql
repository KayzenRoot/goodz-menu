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
-- 0. Catalog vocabulary and shared refusals
-- ---------------------------------------------------------------------------
-- The contracts below name the same capability, resource kind, persisted field and refusal shape
-- many times over. Each of them is written once here and referenced by name afterwards, so a
-- capability cannot be authorized under one spelling and audited under another, and a reader can
-- see the entire catalog vocabulary without reading every contract.

CREATE OR REPLACE FUNCTION private.catalog_permission_read()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'catalog.read' $function$;

CREATE OR REPLACE FUNCTION private.catalog_permission_write()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'catalog.write' $function$;

CREATE OR REPLACE FUNCTION private.catalog_permission_price()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'catalog.price.manage' $function$;

CREATE OR REPLACE FUNCTION private.catalog_permission_availability()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'catalog.availability.manage' $function$;

CREATE OR REPLACE FUNCTION private.catalog_target_category()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'product_category' $function$;

CREATE OR REPLACE FUNCTION private.catalog_target_product()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'product' $function$;

CREATE OR REPLACE FUNCTION private.catalog_target_variant()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'product_variant' $function$;

CREATE OR REPLACE FUNCTION private.catalog_target_channel()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'sales_channel' $function$;

CREATE OR REPLACE FUNCTION private.catalog_target_offer()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'channel_offer' $function$;

-- The names the durable audit metadata reports as changed. These are persisted column names, and
-- naming them here keeps the audit metadata speaking the same language as the table it describes.
CREATE OR REPLACE FUNCTION private.catalog_field_name()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'name' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_description()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'description' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_display_order()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'display_order' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_title()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'title' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_display_name()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'display_name' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_status()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'status' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_availability()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'availability' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_visibility()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'visibility' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_correlation_id()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'correlation_id' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_base_price_amount()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'base_price_amount' $function$;

CREATE OR REPLACE FUNCTION private.catalog_field_promotional_price_amount()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'promotional_price_amount' $function$;

-- The previous and next value of a multi-field change are rendered into one audit string, so they
-- are joined by a separator that cannot occur inside a catalog label or a decimal amount.
CREATE OR REPLACE FUNCTION private.catalog_state_separator()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT '|' $function$;

-- Keys of the caller's own verified JWT, named so the step-up proof reads the same way everywhere.
CREATE OR REPLACE FUNCTION private.catalog_claim_amr()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'amr' $function$;

CREATE OR REPLACE FUNCTION private.catalog_claim_timestamp()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'timestamp' $function$;

CREATE OR REPLACE FUNCTION private.catalog_claim_method()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'method' $function$;

CREATE OR REPLACE FUNCTION private.catalog_authenticator_totp()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'totp' $function$;

CREATE OR REPLACE FUNCTION private.catalog_authenticator_password()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$ SELECT 'password' $function$;

CREATE OR REPLACE FUNCTION private.catalog_assert_correlation(p_correlation_id uuid)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.catalog_assert_input(
    private.catalog_field_correlation_id(),
    p_correlation_id IS NOT NULL
  );
END;
$function$;

-- A required human label is one that carries at least one character that is not whitespace.
CREATE OR REPLACE FUNCTION private.catalog_assert_label(p_field text, p_value text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.catalog_assert_input(
    p_field,
    p_value IS NOT NULL
      AND p_value ~ private.catalog_required_text_pattern()
      AND char_length(p_value) BETWEEN 1 AND 120
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_assert_description(p_description text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.catalog_assert_input(
    private.catalog_field_description(),
    p_description IS NULL OR char_length(p_description) <= 1000
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_assert_display_order(p_display_order integer)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.catalog_assert_input(
    private.catalog_field_display_order(),
    p_display_order BETWEEN -100000 AND 100000
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_assert_title(p_title text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.catalog_assert_input(
    private.catalog_field_title(),
    p_title IS NULL OR char_length(p_title) BETWEEN 1 AND 120
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_assert_display_name(p_display_name text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.catalog_assert_input(
    private.catalog_field_display_name(),
    p_display_name IS NOT NULL
      AND p_display_name ~ private.catalog_required_text_pattern()
      AND char_length(p_display_name) BETWEEN 1 AND 120
  );
END;
$function$;

-- A base price is never negative, and a promotional price is only ever a strict reduction of it.
CREATE OR REPLACE FUNCTION private.catalog_assert_price(
  p_base_price_amount numeric,
  p_promotional_price_amount numeric
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.catalog_assert_input(
    private.catalog_field_base_price_amount(),
    p_base_price_amount IS NOT NULL AND p_base_price_amount >= 0
  );
  PERFORM private.catalog_assert_input(
    private.catalog_field_promotional_price_amount(),
    p_promotional_price_amount IS NULL
      OR (p_promotional_price_amount >= 0 AND p_promotional_price_amount < p_base_price_amount)
  );
END;
$function$;

-- A step-up proof is one entry of the caller's own authentication-method list: the named method,
-- with a timestamp inside the freshness window. The claims are the ones PostgREST already verified.
CREATE OR REPLACE FUNCTION private.catalog_amr_is_fresh(
  p_amr jsonb,
  p_method text,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(
      CASE
        WHEN pg_catalog.jsonb_typeof(p_amr) = 'array' THEN p_amr
        ELSE '[]'::jsonb
      END
    ) AS entry
    WHERE entry ->> private.catalog_claim_method() = p_method
      AND entry ->> private.catalog_claim_timestamp() ~ '^[0-9]{1,19}$'
      AND (entry ->> private.catalog_claim_timestamp())::bigint
        >= pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint - p_window_seconds
      AND (entry ->> private.catalog_claim_timestamp())::bigint
        <= pg_catalog.floor(EXTRACT(epoch FROM pg_catalog.now()))::bigint + 1
  );
$function$;

REVOKE ALL ON FUNCTION
  private.catalog_permission_read(),
  private.catalog_permission_write(),
  private.catalog_permission_price(),
  private.catalog_permission_availability(),
  private.catalog_target_category(),
  private.catalog_target_product(),
  private.catalog_target_variant(),
  private.catalog_target_channel(),
  private.catalog_target_offer(),
  private.catalog_field_name(),
  private.catalog_field_description(),
  private.catalog_field_display_order(),
  private.catalog_field_title(),
  private.catalog_field_display_name(),
  private.catalog_field_status(),
  private.catalog_field_availability(),
  private.catalog_field_visibility(),
  private.catalog_field_correlation_id(),
  private.catalog_field_base_price_amount(),
  private.catalog_field_promotional_price_amount(),
  private.catalog_state_separator(),
  private.catalog_claim_amr(),
  private.catalog_claim_timestamp(),
  private.catalog_claim_method(),
  private.catalog_authenticator_totp(),
  private.catalog_authenticator_password(),
  private.catalog_assert_correlation(uuid),
  private.catalog_assert_label(text, text),
  private.catalog_assert_description(text),
  private.catalog_assert_display_order(integer),
  private.catalog_assert_title(text),
  private.catalog_assert_display_name(text),
  private.catalog_assert_price(numeric, numeric),
  private.catalog_amr_is_fresh(jsonb, text, integer)
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 0a. Row locks
-- ---------------------------------------------------------------------------
-- Every mutation of an existing row reads it under a row lock before it decides anything, so a
-- concurrent repricing cannot interleave with a decision taken from the state before it, and a row
-- the session cannot see is refused as one rather than reported as absent.

CREATE OR REPLACE FUNCTION private.catalog_lock_offer(p_offer_id uuid)
RETURNS public.channel_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_offer public.channel_offers;
BEGIN
  SELECT * INTO v_offer
  FROM public.channel_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested channel offer is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_offer;
END;
$function$;

REVOKE ALL ON FUNCTION private.catalog_lock_offer(uuid)
  FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION private.catalog_lock_category(p_category_id uuid)
RETURNS public.product_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_locked public.product_categories;
BEGIN
  SELECT * INTO v_locked
  FROM public.product_categories
  WHERE id = p_category_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested category is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_locked;
END;
$function$;

REVOKE ALL ON FUNCTION private.catalog_lock_category(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.catalog_lock_product(p_product_id uuid)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_locked public.products;
BEGIN
  SELECT * INTO v_locked
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested product is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_locked;
END;
$function$;

REVOKE ALL ON FUNCTION private.catalog_lock_product(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.catalog_lock_variant(p_variant_id uuid)
RETURNS public.product_variants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_locked public.product_variants;
BEGIN
  SELECT * INTO v_locked
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested variant is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_locked;
END;
$function$;

REVOKE ALL ON FUNCTION private.catalog_lock_variant(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.catalog_lock_sales_channel(p_channel_id uuid)
RETURNS public.sales_channels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_locked public.sales_channels;
BEGIN
  SELECT * INTO v_locked
  FROM public.sales_channels
  WHERE id = p_channel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The requested sales channel is not available to the current session.'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_locked;
END;
$function$;

REVOKE ALL ON FUNCTION private.catalog_lock_sales_channel(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

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
  v_claims jsonb := (SELECT auth.jwt());
  v_window_seconds integer := 300;
BEGIN
  IF v_claims IS NULL OR (v_claims ->> 'aal') IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'A second authentication factor is required for this catalog operation.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT private.catalog_amr_is_fresh(
    v_claims -> private.catalog_claim_amr(),
    private.catalog_authenticator_totp(),
    v_window_seconds
  ) THEN
    RAISE EXCEPTION 'A recent two-step verification is required for this catalog operation.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT private.catalog_amr_is_fresh(
    v_claims -> private.catalog_claim_amr(),
    private.catalog_authenticator_password(),
    v_window_seconds
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
    private.catalog_audit_source_contract(),
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
  p_correlation_id uuid,
  p_expected_actions text[],
  p_expected_target_type text,
  p_expected_target_id uuid
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

  IF p_expected_actions IS NULL
    OR pg_catalog.cardinality(p_expected_actions) = 0
    OR p_expected_target_type IS NULL
    OR NOT (v_receipt.action = ANY(p_expected_actions))
    OR v_receipt.target_type IS DISTINCT FROM p_expected_target_type
    OR (p_expected_target_id IS NOT NULL AND v_receipt.target_id IS DISTINCT FROM p_expected_target_id)
  THEN
    RAISE EXCEPTION 'The idempotency key was already used for a different command.'
      USING ERRCODE = '22023';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'action', v_receipt.action,
    'audit_event_id', v_receipt.audit_event_id,
    private.catalog_field_correlation_id(), v_receipt.correlation_id,
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
    private.catalog_field_correlation_id(), p_correlation_id,
    'price_revision', p_price_revision,
    'replayed', false,
    'target_id', p_target_id,
    'target_type', p_target_type
  );
$function$;

-- A contract cannot proceed without a caller it can attribute the change to and a request it can
-- correlate, and it needs both or neither, so the two facts are established by one admission step.
CREATE OR REPLACE FUNCTION private.catalog_admit_session(p_correlation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_user_id uuid;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_correlation(p_correlation_id);
  RETURN v_actor_user_id;
END;
$function$;

-- Every admitted catalog command ends the same way: the audit event that justifies it, the
-- receipt that turns a repeated submission into a replay, and the result the caller receives.
-- Spelling that spine out once keeps each contract about the commercial transition it performs,
-- which is the part that differs, instead of about bookkeeping that is identical by construction.
CREATE OR REPLACE FUNCTION private.catalog_settle(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_actor_user_id uuid,
  p_correlation_id uuid,
  p_idempotency_key uuid,
  p_price_revision integer,
  p_metadata jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_audit_event_id uuid;
BEGIN
  v_audit_event_id := private.catalog_append_audit(
    p_action, p_target_type, p_target_id,
    p_organization_id, p_establishment_id, p_branch_id,
    p_actor_user_id, p_correlation_id, p_metadata
  );

  PERFORM private.catalog_record_receipt(
    p_organization_id, p_idempotency_key, p_actor_user_id, p_correlation_id, v_audit_event_id,
    p_action, p_target_type, p_target_id, p_price_revision
  );

  RETURN private.catalog_command_result(
    p_action, p_target_type, p_target_id, p_price_revision, v_audit_event_id, p_correlation_id
  );
END;
$function$;

-- A commercial change is not settled by its audit event alone: it also has to leave the revision
-- behind. The revision is written after the audit event exists because the history row is what points
-- back at it, and the receipt is written last so a replay can never stand in front of the truth it
-- replays.
CREATE OR REPLACE FUNCTION private.catalog_settle_revision(
  p_offer_id uuid,
  p_revision integer,
  p_audit_event_id uuid,
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_correlation_id uuid,
  p_idempotency_key uuid,
  p_action text,
  p_target_type text,
  p_base_price_amount numeric,
  p_base_price_currency text,
  p_promotional_price_amount numeric,
  p_availability text,
  p_visibility text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.channel_offer_price_history (
    organization_id, channel_offer_id, price_revision,
    base_price_amount, base_price_currency, promotional_price_amount,
    availability, visibility, effective_from,
    recorded_by_user_id, correlation_id, audit_event_id
  )
  VALUES (
    p_organization_id, p_offer_id, p_revision,
    p_base_price_amount, p_base_price_currency, p_promotional_price_amount,
    p_availability, p_visibility, pg_catalog.now(),
    p_actor_user_id, p_correlation_id, p_audit_event_id
  );

  PERFORM private.catalog_record_receipt(
    p_organization_id, p_idempotency_key, p_actor_user_id, p_correlation_id, p_audit_event_id,
    p_action, p_target_type, p_offer_id, p_revision
  );

  RETURN private.catalog_command_result(
    p_action, p_target_type, p_offer_id, p_revision, p_audit_event_id, p_correlation_id
  );
END;
$function$;

-- A contract that acts on a row it did not create resolves its scope from that stored row rather
-- than from anything the caller supplied, which is what stops a caller from widening the scope it
-- is authorized for. Authorizing that scope and recognising a submission it has already applied are
-- one decision about the caller, so they are taken together here. The row arrives as jsonb because
-- the five catalog tables do not share a row type, and a table that has no establishment or branch
-- column simply has no such key, which is the organization-wide scope that table is written at.
CREATE OR REPLACE FUNCTION private.catalog_admit_stored(
  p_permission_key text,
  p_stored_row jsonb,
  p_actor_user_id uuid,
  p_idempotency_key uuid,
  p_correlation_id uuid,
  p_expected_actions text[],
  p_expected_target_type text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_organization_id uuid := (p_stored_row ->> 'organization_id')::uuid;
  v_establishment_id uuid := (p_stored_row ->> 'establishment_id')::uuid;
  v_branch_id uuid := (p_stored_row ->> 'branch_id')::uuid;
BEGIN
  PERFORM private.catalog_authorize(p_permission_key, v_organization_id, v_establishment_id, v_branch_id);
  RETURN private.catalog_replay(
    v_organization_id, p_actor_user_id, p_idempotency_key, p_correlation_id,
    p_expected_actions, p_expected_target_type, (p_stored_row ->> 'id')::uuid
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.catalog_price_state(p_amount numeric, p_currency text, p_promotional_amount numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT p_amount::text || private.catalog_state_separator() || p_currency
    || private.catalog_state_separator() || COALESCE(p_promotional_amount::text, 'none');
$function$;

REVOKE ALL ON FUNCTION private.catalog_actor_user_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_require_actor() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_admit_session(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_authorize(text, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_assert_input(text, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_require_step_up() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_audit_metadata(text, text, text[], text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_append_audit(text, text, uuid, uuid, uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_record_receipt(uuid, uuid, uuid, uuid, uuid, text, text, uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_replay(uuid, uuid, uuid, uuid, text[], text, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.catalog_admit_stored(text, jsonb, uuid, uuid, uuid, text[], text) FROM PUBLIC, anon, authenticated, service_role;
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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_authorize(private.catalog_permission_write(), p_organization_id, p_establishment_id, p_branch_id);

  v_replayed := private.catalog_replay(
    p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.category.created']::text[], private.catalog_target_category(), NULL
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_label(private.catalog_field_name(), p_name);
  PERFORM private.catalog_assert_description(p_description);
  PERFORM private.catalog_assert_display_order(p_display_order);

  INSERT INTO public.product_categories (
    organization_id, establishment_id, branch_id, parent_category_id,
    name, description, display_order
  )
  VALUES (
    p_organization_id, p_establishment_id, p_branch_id, p_parent_category_id,
    p_name, p_description, p_display_order
  )
  RETURNING id INTO v_category_id;

  v_action := 'catalog.category.created';

  RETURN private.catalog_settle(
    v_action, private.catalog_target_category(), v_category_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_category(), ARRAY[private.catalog_field_name()], NULL, p_name)
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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);

  v_previous := private.catalog_lock_category(p_category_id);

  v_replayed := private.catalog_admit_stored(
    private.catalog_permission_write(), pg_catalog.to_jsonb(v_previous),
    v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.category.updated']::text[], private.catalog_target_category()
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_label(private.catalog_field_name(), p_name);
  PERFORM private.catalog_assert_description(p_description);
  PERFORM private.catalog_assert_display_order(p_display_order);

  UPDATE public.product_categories
  SET name = p_name,
      description = p_description,
      display_order = p_display_order,
      updated_at = pg_catalog.now()
  WHERE id = p_category_id;

  v_action := 'catalog.category.updated';

  RETURN private.catalog_settle(
    v_action, private.catalog_target_category(), p_category_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(
      private.catalog_permission_write(), private.catalog_target_category(), ARRAY[private.catalog_field_name(), private.catalog_field_display_order()],
      v_previous.name || private.catalog_state_separator() || v_previous.display_order::text,
      p_name || private.catalog_state_separator() || p_display_order::text
  )

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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input(private.catalog_status_archived(), p_archived IS NOT NULL);
  PERFORM private.catalog_assert_correlation(p_correlation_id);

  v_previous := private.catalog_lock_category(p_category_id);
  v_action := CASE WHEN p_archived THEN 'catalog.category.archived' ELSE 'catalog.category.reactivated' END;

  v_replayed := private.catalog_admit_stored(
    private.catalog_permission_write(), pg_catalog.to_jsonb(v_previous),
    v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY[v_action]::text[],
    private.catalog_target_category()
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  UPDATE public.product_categories
  SET status = CASE WHEN p_archived THEN private.catalog_status_archived() ELSE private.catalog_status_active() END,
      archived_at = CASE WHEN p_archived THEN pg_catalog.now() ELSE NULL END,
      updated_at = pg_catalog.now()
  WHERE id = p_category_id;

  RETURN private.catalog_settle(
    v_action, private.catalog_target_category(), p_category_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_category(), ARRAY[private.catalog_field_status()], v_previous.status, CASE WHEN p_archived THEN private.catalog_status_archived() ELSE private.catalog_status_active() END)
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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_authorize(private.catalog_permission_write(), p_organization_id, p_establishment_id, p_branch_id);

  v_replayed := private.catalog_replay(
    p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.product.created']::text[], private.catalog_target_product(), NULL
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_label(private.catalog_field_name(), p_name);
  PERFORM private.catalog_assert_description(p_description);

  INSERT INTO public.products (
    organization_id, establishment_id, branch_id, category_id, name, description
  )
  VALUES (
    p_organization_id, p_establishment_id, p_branch_id, p_category_id, p_name, p_description
  )
  RETURNING id INTO v_product_id;

  v_action := 'catalog.product.created';

  RETURN private.catalog_settle(
    v_action, private.catalog_target_product(), v_product_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_product(), ARRAY[private.catalog_field_name()], NULL, p_name)
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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);

  v_previous := private.catalog_lock_product(p_product_id);

  v_replayed := private.catalog_admit_stored(
    private.catalog_permission_write(), pg_catalog.to_jsonb(v_previous),
    v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.product.updated']::text[], private.catalog_target_product()
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_label(private.catalog_field_name(), p_name);
  PERFORM private.catalog_assert_description(p_description);

  UPDATE public.products
  SET name = p_name,
      description = p_description,
      updated_at = pg_catalog.now()
  WHERE id = p_product_id;

  v_action := 'catalog.product.updated';

  RETURN private.catalog_settle(
    v_action, private.catalog_target_product(), p_product_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_product(), ARRAY[private.catalog_field_name(), private.catalog_field_description()], v_previous.name, p_name)
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
  v_replayed jsonb;
  v_action text;
  v_next_status text;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input(private.catalog_status_archived(), p_archived IS NOT NULL);
  PERFORM private.catalog_assert_correlation(p_correlation_id);

  v_previous := private.catalog_lock_product(p_product_id);
  v_action := CASE WHEN p_archived THEN 'catalog.product.archived' ELSE 'catalog.product.reactivated' END;

  v_replayed := private.catalog_admit_stored(
    private.catalog_permission_write(), pg_catalog.to_jsonb(v_previous),
    v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY[v_action]::text[],
    private.catalog_target_product()
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  v_next_status := CASE WHEN p_archived THEN private.catalog_status_archived() ELSE private.catalog_status_active() END;

  IF v_previous.status IS DISTINCT FROM v_next_status THEN
    UPDATE public.products
    SET status = v_next_status,
        archived_at = CASE WHEN p_archived THEN pg_catalog.now() ELSE NULL END,
        updated_at = pg_catalog.now()
    WHERE id = p_product_id;
  END IF;

  RETURN private.catalog_settle(
    v_action, private.catalog_target_product(), p_product_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_product(), ARRAY[private.catalog_field_status()], v_previous.status, v_next_status)
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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_authorize(private.catalog_permission_write(), p_organization_id, p_establishment_id, p_branch_id);

  v_replayed := private.catalog_replay(
    p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.variant.created']::text[], private.catalog_target_variant(), NULL
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_label(private.catalog_field_name(), p_name);

  INSERT INTO public.product_variants (
    organization_id, establishment_id, branch_id, product_id, name
  )
  VALUES (
    p_organization_id, p_establishment_id, p_branch_id, p_product_id, p_name
  )
  RETURNING id INTO v_variant_id;

  v_action := 'catalog.variant.created';

  RETURN private.catalog_settle(
    v_action, private.catalog_target_variant(), v_variant_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_variant(), ARRAY[private.catalog_field_name()], NULL, p_name)
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
  v_replayed jsonb;
  v_action text;
  v_next_status text;
BEGIN
  v_actor_user_id := private.catalog_require_actor();
  PERFORM private.catalog_assert_input(private.catalog_status_archived(), p_archived IS NOT NULL);
  PERFORM private.catalog_assert_correlation(p_correlation_id);

  v_previous := private.catalog_lock_variant(p_variant_id);
  PERFORM private.catalog_assert_label(private.catalog_field_name(), p_name);
  v_next_status := CASE WHEN p_archived THEN private.catalog_status_archived() ELSE private.catalog_status_active() END;
  v_action := CASE
    WHEN p_name IS DISTINCT FROM v_previous.name THEN 'catalog.variant.updated'
    WHEN p_archived THEN 'catalog.variant.archived'
    ELSE 'catalog.variant.reactivated'
  END;

  v_replayed := private.catalog_admit_stored(
    private.catalog_permission_write(), pg_catalog.to_jsonb(v_previous),
    v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.variant.updated', 'catalog.variant.archived', 'catalog.variant.reactivated']::text[],
    private.catalog_target_variant()
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  UPDATE public.product_variants
  SET name = p_name,
      status = v_next_status,
      archived_at = CASE WHEN p_archived THEN pg_catalog.now() ELSE NULL END,
      updated_at = pg_catalog.now()
  WHERE id = p_variant_id;

  RETURN private.catalog_settle(
    v_action,
    private.catalog_target_variant(), p_variant_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(
      private.catalog_permission_write(), private.catalog_target_variant(), ARRAY[private.catalog_field_name(), private.catalog_field_status()],
      v_previous.name || private.catalog_state_separator() || v_previous.status,
      p_name || private.catalog_state_separator() || v_next_status
    )
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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_authorize(private.catalog_permission_write(), p_organization_id, NULL, NULL);

  v_replayed := private.catalog_replay(
    p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.sales_channel.created']::text[], private.catalog_target_channel(), NULL
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  PERFORM private.catalog_assert_input('channel_key', p_channel_key ~ '^[a-z][a-z0-9_-]{0,63}$');
  PERFORM private.catalog_assert_display_name(p_display_name);
  PERFORM private.catalog_assert_description(p_description);

  INSERT INTO public.sales_channels (
    organization_id, channel_key, display_name, description
  )
  VALUES (
    p_organization_id, p_channel_key, p_display_name, p_description
  )
  RETURNING id INTO v_channel_id;

  v_action := 'catalog.sales_channel.created';

  RETURN private.catalog_settle(
    v_action, private.catalog_target_channel(), v_channel_id,
    p_organization_id, NULL, NULL,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_channel(), ARRAY['channel_key'], NULL, p_channel_key)
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
  v_replayed jsonb;
  v_action text;
  v_next_status text;
  v_archived boolean;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);

  v_previous := private.catalog_lock_sales_channel(p_channel_id);
  v_archived := v_previous.status = private.catalog_status_archived();
  v_next_status := CASE WHEN v_archived THEN private.catalog_status_archived() ELSE private.catalog_status_active() END;
  v_action := 'catalog.sales_channel.updated';

  v_replayed := private.catalog_admit_stored(
    private.catalog_permission_write(), pg_catalog.to_jsonb(v_previous),
    v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.sales_channel.updated']::text[], private.catalog_target_channel()
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  IF p_display_name IS NULL THEN
    p_display_name := v_previous.display_name;
  END IF;
  PERFORM private.catalog_assert_display_name(p_display_name);
  PERFORM private.catalog_assert_description(p_description);

  UPDATE public.sales_channels
  SET display_name = p_display_name,
      description = p_description,
      status = v_next_status,
      archived_at = CASE WHEN v_archived THEN COALESCE(archived_at, pg_catalog.now()) ELSE NULL END,
      updated_at = pg_catalog.now()
  WHERE id = p_channel_id;

  RETURN private.catalog_settle(
    v_action, private.catalog_target_channel(), p_channel_id,
    v_previous.organization_id, NULL, NULL,
    v_actor_user_id, p_correlation_id, p_idempotency_key, NULL,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_channel(), ARRAY[private.catalog_field_display_name(), private.catalog_field_description()], v_previous.display_name, p_display_name)
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
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_assert_input(
    'target',
    num_nonnulls(p_product_id, p_product_variant_id) = 1
  );
  PERFORM private.catalog_assert_title(p_title);
  PERFORM private.catalog_assert_description(p_description);
  PERFORM private.catalog_assert_price(p_base_price_amount, p_promotional_price_amount);
  PERFORM private.catalog_assert_input('base_price_currency', p_base_price_currency ~ '^[A-Z]{3}$');

  PERFORM private.catalog_authorize(private.catalog_permission_price(), p_organization_id, p_establishment_id, p_branch_id);
  PERFORM private.catalog_require_step_up();

  v_replayed := private.catalog_replay(
    p_organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.channel_offer.created']::text[], private.catalog_target_offer(), NULL
  );
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

  v_action := 'catalog.channel_offer.created';

  v_audit_event_id := private.catalog_append_audit(
    v_action, private.catalog_target_offer(), v_offer_id,
    p_organization_id, p_establishment_id, p_branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(
        private.catalog_permission_price(), private.catalog_target_offer(), ARRAY[private.catalog_field_base_price_amount(), private.catalog_field_promotional_price_amount()],
        NULL, private.catalog_price_state(p_base_price_amount, p_base_price_currency, p_promotional_price_amount)
  )

  );

  RETURN private.catalog_settle_revision(
    v_offer_id, 1, v_audit_event_id, p_organization_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key,
    v_action, private.catalog_target_offer(),
    p_base_price_amount, p_base_price_currency, p_promotional_price_amount, 'available', 'visible'
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
  v_replayed jsonb;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_assert_title(p_title);
  PERFORM private.catalog_assert_description(p_description);

  v_previous := private.catalog_lock_offer(p_offer_id);
  v_action := 'catalog.channel_offer.updated';

  v_replayed := private.catalog_admit_stored(
    private.catalog_permission_write(), pg_catalog.to_jsonb(v_previous),
    v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.channel_offer.updated']::text[], private.catalog_target_offer()
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  UPDATE public.channel_offers
  SET title = p_title,
      description = p_description,
      updated_at = pg_catalog.now()
  WHERE id = p_offer_id;

  RETURN private.catalog_settle(
    v_action, private.catalog_target_offer(), p_offer_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key, v_previous.price_revision,
    private.catalog_audit_metadata(private.catalog_permission_write(), private.catalog_target_offer(), ARRAY[private.catalog_field_title(), private.catalog_field_description()], v_previous.title, p_title)
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
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_revision integer;
  v_next_currency text;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_assert_price(p_base_price_amount, p_promotional_price_amount);

  v_previous := private.catalog_lock_offer(p_offer_id);

  v_next_currency := v_previous.base_price_currency;

  PERFORM private.catalog_authorize(private.catalog_permission_price(), v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id);
  PERFORM private.catalog_require_step_up();

  v_action := CASE
    WHEN p_promotional_price_amount IS DISTINCT FROM v_previous.promotional_price_amount
      AND p_base_price_amount IS NOT DISTINCT FROM v_previous.base_price_amount
      THEN 'catalog.channel_offer.promotional_price_changed'
    ELSE 'catalog.channel_offer.price_changed'
  END;

  v_replayed := private.catalog_replay(
    v_previous.organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.channel_offer.price_changed', 'catalog.channel_offer.promotional_price_changed']::text[],
    private.catalog_target_offer(), p_offer_id
  );
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
    v_action,
    private.catalog_target_offer(), p_offer_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(
        private.catalog_permission_price(), private.catalog_target_offer(), ARRAY[private.catalog_field_base_price_amount(), private.catalog_field_promotional_price_amount()],
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

  RETURN private.catalog_settle_revision(
    p_offer_id, v_revision, v_audit_event_id, v_previous.organization_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key,
    v_action, private.catalog_target_offer(),
    p_base_price_amount, v_next_currency, p_promotional_price_amount, v_previous.availability, v_previous.visibility
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
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_revision integer;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_assert_input(
    private.catalog_field_availability(),
    p_availability IN (private.catalog_availability_available(), private.catalog_availability_unavailable())
  );

  v_previous := private.catalog_lock_offer(p_offer_id);

  PERFORM private.catalog_authorize(private.catalog_permission_availability(), v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id);
  PERFORM private.catalog_require_step_up();

  v_replayed := private.catalog_replay(
    v_previous.organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.channel_offer.availability_changed']::text[],
    private.catalog_target_offer(), p_offer_id
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  IF p_availability = v_previous.availability THEN
    RAISE EXCEPTION 'The requested availability change does not alter the current commercial state.'
      USING ERRCODE = '22023';
  END IF;

  v_revision := v_previous.price_revision + 1;

  v_action := 'catalog.channel_offer.availability_changed';

  v_audit_event_id := private.catalog_append_audit(
    v_action, private.catalog_target_offer(), p_offer_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(private.catalog_permission_availability(), private.catalog_target_offer(), ARRAY[private.catalog_field_availability()], v_previous.availability, p_availability)
  );

  UPDATE public.channel_offers
  SET availability = p_availability,
      price_revision = v_revision,
      updated_at = pg_catalog.now()
  WHERE id = p_offer_id;

  RETURN private.catalog_settle_revision(
    p_offer_id, v_revision, v_audit_event_id, v_previous.organization_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key,
    v_action, private.catalog_target_offer(),
    v_previous.base_price_amount, v_previous.base_price_currency, v_previous.promotional_price_amount, p_availability, v_previous.visibility
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
  v_audit_event_id uuid;
  v_replayed jsonb;
  v_revision integer;
  v_action text;
BEGIN
  v_actor_user_id := private.catalog_admit_session(p_correlation_id);
  PERFORM private.catalog_assert_input(
    private.catalog_field_visibility(),
    p_visibility IN (private.catalog_visibility_visible(), private.catalog_visibility_hidden())
  );

  v_previous := private.catalog_lock_offer(p_offer_id);

  PERFORM private.catalog_authorize(private.catalog_permission_availability(), v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id);
  PERFORM private.catalog_require_step_up();

  v_replayed := private.catalog_replay(
    v_previous.organization_id, v_actor_user_id, p_idempotency_key, p_correlation_id,
    ARRAY['catalog.channel_offer.visibility_changed']::text[],
    private.catalog_target_offer(), p_offer_id
  );
  IF v_replayed IS NOT NULL THEN
    RETURN v_replayed;
  END IF;

  IF p_visibility = v_previous.visibility THEN
    RAISE EXCEPTION 'The requested visibility change does not alter the current commercial state.'
      USING ERRCODE = '22023';
  END IF;

  v_revision := v_previous.price_revision + 1;

  v_action := 'catalog.channel_offer.visibility_changed';

  v_audit_event_id := private.catalog_append_audit(
    v_action, private.catalog_target_offer(), p_offer_id,
    v_previous.organization_id, v_previous.establishment_id, v_previous.branch_id,
    v_actor_user_id, p_correlation_id,
    private.catalog_audit_metadata(private.catalog_permission_availability(), private.catalog_target_offer(), ARRAY[private.catalog_field_visibility()], v_previous.visibility, p_visibility)
  );

  UPDATE public.channel_offers
  SET visibility = p_visibility,
      price_revision = v_revision,
      updated_at = pg_catalog.now()
  WHERE id = p_offer_id;

  RETURN private.catalog_settle_revision(
    p_offer_id, v_revision, v_audit_event_id, v_previous.organization_id,
    v_actor_user_id, p_correlation_id, p_idempotency_key,
    v_action, private.catalog_target_offer(),
    v_previous.base_price_amount, v_previous.base_price_currency, v_previous.promotional_price_amount, v_previous.availability, p_visibility
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Read contracts
-- ---------------------------------------------------------------------------

-- The scopes this session may write catalog rows into.
--
-- A creation form has to state the scope it is writing into, and every scope-aware contract
-- authorizes exactly that triple. Deriving the candidates from the caller's own memberships, and
-- re-testing each one through private.catalog_scope_grants, keeps a single authorization model:
-- this function cannot admit a scope that the contracts would refuse, and it cannot admit a scope
-- belonging to another tenant because the whole projection is filtered by auth.uid().
CREATE OR REPLACE FUNCTION public.catalog_admitted_scopes(p_permission_key text)
RETURNS TABLE (
  organization_id uuid,
  establishment_id uuid,
  branch_id uuid,
  organization_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    membership.organization_id,
    membership_role.establishment_id,
    membership_role.branch_id,
    organization.display_name
  FROM public.organization_memberships AS membership
  JOIN public.membership_roles AS membership_role
    ON membership_role.organization_id = membership.organization_id
   AND membership_role.membership_id = membership.id
  JOIN public.role_permissions AS role_permission
    ON role_permission.organization_id = membership_role.organization_id
   AND role_permission.role_id = membership_role.role_id
  JOIN public.organizations AS organization
    ON organization.id = membership.organization_id
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = private.active_membership_status()
    AND role_permission.permission_key = p_permission_key
    AND (SELECT private.catalog_scope_grants(
      p_permission_key,
      membership.organization_id,
      membership_role.establishment_id,
      membership_role.branch_id
    ))
  ORDER BY
    organization.display_name,
    membership_role.establishment_id NULLS FIRST,
    membership_role.branch_id NULLS FIRST;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Execution grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION
  public.catalog_admitted_scopes(text)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.catalog_admitted_scopes(text)
TO authenticated;

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
