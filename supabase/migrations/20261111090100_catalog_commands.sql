CREATE OR REPLACE FUNCTION private.write_catalog_audit_event(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_reason_code text,
  p_correlation_id uuid,
  p_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    p_actor_user_id, p_organization_id, p_establishment_id, p_branch_id,
    p_action, p_target_type, p_target_id, 'allow', p_reason_code,
    p_correlation_id, 'catalog_command', p_metadata
  ) RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$function$;

REVOKE ALL ON FUNCTION private.write_catalog_audit_event(uuid, uuid, uuid, uuid, text, text, uuid, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.catalog_command_result(p_entity_id uuid, p_audit_event_ids uuid[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT pg_catalog.jsonb_build_object(
    'entity_id', p_entity_id,
    'audit_event_ids', pg_catalog.to_jsonb(COALESCE(p_audit_event_ids, ARRAY[]::uuid[]))
  );
$function$;

REVOKE ALL ON FUNCTION private.catalog_command_result(uuid, uuid[])
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.append_catalog_step_up_event(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_target_id uuid,
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
  v_proof_id uuid;
  v_metadata jsonb;
BEGIN
  IF p_correlation_id IS NULL
    OR p_target_id IS NULL
    OR p_establishment_id IS NULL AND p_branch_id IS NOT NULL
    OR p_outcome IS NULL
    OR (p_outcome NOT IN ('allow', 'deny'))
    OR p_required_permissions IS NULL
    OR cardinality(p_required_permissions) = 0
    OR EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p_required_permissions) AS permission(value)
      WHERE permission.value IS NULL
        OR permission.value NOT IN ('catalog.price.write', 'catalog.availability.write')
    )
    OR cardinality(p_required_permissions) <> (
      SELECT pg_catalog.count(DISTINCT permission.value)::integer
      FROM pg_catalog.unnest(p_required_permissions) AS permission(value)
    )
    OR (p_outcome = 'allow' AND (p_actor_user_id IS NULL OR p_organization_id IS NULL OR p_reason_code <> 'authorized'))
    OR (p_outcome = 'deny' AND p_reason_code = 'authorized')
    OR p_reason_code IS NULL
    OR p_reason_code NOT IN (
      'authorized', 'invalid_scope', 'unauthenticated', 'identity_unverified',
      'authorization_denied', 'aal2_required', 'factor_unverified',
      'reauthentication_required', 'step_up_required'
    )
  THEN
    RAISE EXCEPTION 'Invalid catalog step-up event.' USING ERRCODE = '22023';
  END IF;

  IF p_outcome = 'allow' THEN
    v_proof_id := pg_catalog.gen_random_uuid();
    v_metadata := pg_catalog.jsonb_build_object(
      'required_permissions', pg_catalog.to_jsonb(p_required_permissions),
      'step_up_proof_id', v_proof_id::text
    );
  ELSE
    v_metadata := pg_catalog.jsonb_build_object(
      'required_permissions', pg_catalog.to_jsonb(p_required_permissions)
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    p_actor_user_id, p_organization_id, p_establishment_id, p_branch_id,
    'catalog.privileged.step_up', 'channel_offer', p_target_id, p_outcome, p_reason_code,
    p_correlation_id, 'admin_guard', v_metadata
  );

  RETURN v_proof_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_catalog_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.append_catalog_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.consume_catalog_step_up_proof(
  p_proof_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_target_id uuid,
  p_required_permissions text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event public.audit_events%ROWTYPE;
  v_permissions text[];
  v_rows integer;
BEGIN
  IF p_proof_id IS NULL OR p_actor_user_id IS NULL OR p_actor_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT event_row.* INTO v_event
  FROM public.audit_events AS event_row
  WHERE event_row.action = 'catalog.privileged.step_up'
    AND event_row.outcome = 'allow'
    AND event_row.actor_user_id = p_actor_user_id
    AND event_row.organization_id = p_organization_id
    AND event_row.establishment_id IS NOT DISTINCT FROM p_establishment_id
    AND event_row.branch_id IS NOT DISTINCT FROM p_branch_id
    AND event_row.target_id = p_target_id
    AND event_row.created_at >= pg_catalog.now() - interval '5 minutes'
    AND event_row.metadata->>'step_up_proof_id' = p_proof_id::text
  LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT pg_catalog.array_agg(permission.value ORDER BY permission.value)
  INTO v_permissions
  FROM pg_catalog.jsonb_array_elements_text(v_event.metadata->'required_permissions') AS permission(value);

  IF p_required_permissions IS NULL OR NOT (p_required_permissions <@ COALESCE(v_permissions, ARRAY[]::text[])) THEN
    RETURN false;
  END IF;

  INSERT INTO private.catalog_step_up_consumptions (guard_event_id, consumed_by)
  VALUES (v_event.id, p_actor_user_id)
  ON CONFLICT (guard_event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_catalog_step_up_proof(uuid, uuid, uuid, uuid, uuid, uuid, text[])
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.catalog_save_category(
  p_id uuid,
  p_organization_id uuid,
  p_parent_id uuid,
  p_name text,
  p_description text,
  p_status text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_audit_event_ids uuid[] := ARRAY[]::uuid[];
  v_old public.product_categories%ROWTYPE;
  v_action text;
  v_fields text[];
BEGIN
  IF (SELECT auth.uid()) IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'Catalog request is unavailable.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.catalog_has_permission(p_organization_id, NULL, NULL, 'catalog.write') THEN
    RAISE EXCEPTION 'Catalog authorization is unavailable.' USING ERRCODE = '42501';
  END IF;
  -- Serialize hierarchy edits within an organization so concurrent reparenting cannot form a cycle.
  PERFORM 1 FROM public.organizations AS organization_row
  WHERE organization_row.id = p_organization_id FOR UPDATE;
  IF p_name IS NULL OR p_name !~ '[^[:space:]]' OR pg_catalog.char_length(p_name) > 120
    OR p_description IS NULL OR pg_catalog.char_length(p_description) > 2000
    OR p_status NOT IN ('active', 'archived')
  THEN RAISE EXCEPTION 'Catalog input is invalid.' USING ERRCODE = '22023'; END IF;
  IF p_parent_id IS NOT NULL THEN
    PERFORM 1 FROM public.product_categories AS parent_row
    WHERE parent_row.organization_id = p_organization_id AND parent_row.id = p_parent_id AND parent_row.status = 'active'
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catalog parent is unavailable.' USING ERRCODE = '23503'; END IF;
  END IF;

  IF p_id IS NULL THEN
    v_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.product_categories (id, organization_id, parent_id, name, description, status)
    VALUES (v_id, p_organization_id, p_parent_id, p_name, p_description, p_status);
    v_action := 'catalog.category.created';
    v_fields := ARRAY['name', 'parent_id', 'description', 'status'];
  ELSE
    SELECT category_row.* INTO v_old
    FROM public.product_categories AS category_row
    WHERE category_row.organization_id = p_organization_id AND category_row.id = p_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catalog item is unavailable.' USING ERRCODE = 'P0002'; END IF;

    IF EXISTS (
      WITH RECURSIVE descendants(id) AS (
        SELECT p_id
        UNION
        SELECT child.id FROM public.product_categories AS child
        JOIN descendants AS parent ON child.organization_id = p_organization_id AND child.parent_id = parent.id
      ) SELECT 1 FROM descendants WHERE id = p_parent_id
    ) THEN RAISE EXCEPTION 'Catalog category hierarchy is invalid.' USING ERRCODE = '23514'; END IF;
    IF p_status = 'archived' AND EXISTS (
      SELECT 1 FROM public.product_categories AS child
      WHERE child.organization_id = p_organization_id AND child.parent_id = p_id AND child.status = 'active'
      UNION ALL
      SELECT 1 FROM public.products AS product_row
      WHERE product_row.organization_id = p_organization_id AND product_row.category_id = p_id AND product_row.status = 'active'
    ) THEN RAISE EXCEPTION 'Archive child catalog records first.' USING ERRCODE = '23514'; END IF;

    v_id := p_id;
    v_fields := ARRAY[]::text[];
    IF v_old.name IS DISTINCT FROM p_name THEN v_fields := pg_catalog.array_append(v_fields, 'name'); END IF;
    IF v_old.parent_id IS DISTINCT FROM p_parent_id THEN v_fields := pg_catalog.array_append(v_fields, 'parent_id'); END IF;
    IF v_old.description IS DISTINCT FROM p_description THEN v_fields := pg_catalog.array_append(v_fields, 'description'); END IF;
    IF v_old.status IS DISTINCT FROM p_status THEN v_fields := pg_catalog.array_append(v_fields, 'status'); END IF;
    IF cardinality(v_fields) = 0 THEN RETURN private.catalog_command_result(v_id, v_audit_event_ids); END IF;
    UPDATE public.product_categories
    SET parent_id = p_parent_id, name = p_name, description = p_description, status = p_status, updated_at = pg_catalog.now()
    WHERE organization_id = p_organization_id AND id = p_id;
    v_action := CASE WHEN p_status = 'archived' AND v_old.status <> 'archived'
      THEN 'catalog.category.archived' ELSE 'catalog.category.updated' END;
  END IF;

  v_audit_event_ids := pg_catalog.array_append(v_audit_event_ids, private.write_catalog_audit_event(
    (SELECT auth.uid()), p_organization_id, NULL, NULL, v_action, 'product_category', v_id,
    CASE WHEN v_action LIKE '%.archived' THEN 'catalog_archived'
      WHEN v_action LIKE '%.created' THEN 'catalog_created' ELSE 'catalog_updated' END,
    p_correlation_id, pg_catalog.jsonb_build_object('changed_fields', pg_catalog.to_jsonb(v_fields))
  ));
  RETURN private.catalog_command_result(v_id, v_audit_event_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.catalog_save_category(uuid, uuid, uuid, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_save_category(uuid, uuid, uuid, text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.catalog_save_product(
  p_id uuid,
  p_organization_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_status text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_audit_event_ids uuid[] := ARRAY[]::uuid[];
  v_old public.products%ROWTYPE;
  v_action text;
  v_fields text[];
BEGIN
  IF (SELECT auth.uid()) IS NULL OR p_correlation_id IS NULL
    OR NOT public.catalog_has_permission(p_organization_id, NULL, NULL, 'catalog.write')
  THEN RAISE EXCEPTION 'Catalog authorization is unavailable.' USING ERRCODE = '42501'; END IF;
  IF p_name IS NULL OR p_name !~ '[^[:space:]]' OR pg_catalog.char_length(p_name) > 160
    OR p_description IS NULL OR pg_catalog.char_length(p_description) > 5000
    OR p_status NOT IN ('active', 'archived')
  THEN RAISE EXCEPTION 'Catalog input is invalid.' USING ERRCODE = '22023'; END IF;
  IF p_category_id IS NOT NULL THEN
    -- Keep a concurrent category archive from leaving a new product on an archived category.
    PERFORM 1 FROM public.product_categories AS category_row
    WHERE category_row.organization_id = p_organization_id AND category_row.id = p_category_id AND category_row.status = 'active'
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catalog category is unavailable.' USING ERRCODE = '23503'; END IF;
  END IF;

  IF p_id IS NULL THEN
    v_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.products (id, organization_id, category_id, name, description, status)
    VALUES (v_id, p_organization_id, p_category_id, p_name, p_description, p_status);
    v_action := 'catalog.product.created';
    v_fields := ARRAY['category_id', 'name', 'description', 'status'];
  ELSE
    SELECT product_row.* INTO v_old FROM public.products AS product_row
    WHERE product_row.organization_id = p_organization_id AND product_row.id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catalog item is unavailable.' USING ERRCODE = 'P0002'; END IF;
    IF p_status = 'archived' AND v_old.status <> 'archived' AND (
      EXISTS (SELECT 1 FROM public.product_variants WHERE organization_id = p_organization_id AND product_id = p_id AND status = 'active')
      OR EXISTS (SELECT 1 FROM public.channel_offers WHERE organization_id = p_organization_id AND product_id = p_id AND status = 'active')
    ) THEN RAISE EXCEPTION 'Archive variants and offers first.' USING ERRCODE = '23514'; END IF;
    v_id := p_id;
    v_fields := ARRAY[]::text[];
    IF v_old.category_id IS DISTINCT FROM p_category_id THEN v_fields := pg_catalog.array_append(v_fields, 'category_id'); END IF;
    IF v_old.name IS DISTINCT FROM p_name THEN v_fields := pg_catalog.array_append(v_fields, 'name'); END IF;
    IF v_old.description IS DISTINCT FROM p_description THEN v_fields := pg_catalog.array_append(v_fields, 'description'); END IF;
    IF v_old.status IS DISTINCT FROM p_status THEN v_fields := pg_catalog.array_append(v_fields, 'status'); END IF;
    IF cardinality(v_fields) = 0 THEN RETURN private.catalog_command_result(v_id, v_audit_event_ids); END IF;
    UPDATE public.products SET category_id = p_category_id, name = p_name, description = p_description,
      status = p_status, updated_at = pg_catalog.now()
    WHERE organization_id = p_organization_id AND id = p_id;
    v_action := CASE WHEN p_status = 'archived' AND v_old.status <> 'archived'
      THEN 'catalog.product.archived' ELSE 'catalog.product.updated' END;
  END IF;

  v_audit_event_ids := pg_catalog.array_append(v_audit_event_ids, private.write_catalog_audit_event(
    (SELECT auth.uid()), p_organization_id, NULL, NULL, v_action, 'product', v_id,
    CASE WHEN v_action LIKE '%.archived' THEN 'catalog_archived'
      WHEN v_action LIKE '%.created' THEN 'catalog_created' ELSE 'catalog_updated' END,
    p_correlation_id, pg_catalog.jsonb_build_object('changed_fields', pg_catalog.to_jsonb(v_fields))
  ));
  RETURN private.catalog_command_result(v_id, v_audit_event_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.catalog_save_product(uuid, uuid, uuid, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_save_product(uuid, uuid, uuid, text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.catalog_save_variant(
  p_id uuid,
  p_organization_id uuid,
  p_product_id uuid,
  p_name text,
  p_size_label text,
  p_flavor_label text,
  p_status text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_audit_event_ids uuid[] := ARRAY[]::uuid[];
  v_old public.product_variants%ROWTYPE;
  v_action text;
  v_fields text[];
BEGIN
  IF (SELECT auth.uid()) IS NULL OR p_correlation_id IS NULL
    OR NOT public.catalog_has_permission(p_organization_id, NULL, NULL, 'catalog.write')
  THEN RAISE EXCEPTION 'Catalog authorization is unavailable.' USING ERRCODE = '42501'; END IF;
  IF p_product_id IS NULL OR p_name IS NULL OR p_name !~ '[^[:space:]]' OR pg_catalog.char_length(p_name) > 120
    OR (p_size_label IS NOT NULL AND (p_size_label !~ '[^[:space:]]' OR pg_catalog.char_length(p_size_label) > 80))
    OR (p_flavor_label IS NOT NULL AND (p_flavor_label !~ '[^[:space:]]' OR pg_catalog.char_length(p_flavor_label) > 80))
    OR p_status NOT IN ('active', 'archived')
  THEN RAISE EXCEPTION 'Catalog input is invalid.' USING ERRCODE = '22023'; END IF;
  -- Product archival takes an update lock on this row; share-lock while creating or
  -- editing the variant so a concurrent archive cannot strand an active child.
  PERFORM 1 FROM public.products AS product_row
  WHERE product_row.organization_id = p_organization_id AND product_row.id = p_product_id AND product_row.status = 'active'
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Catalog product is unavailable.' USING ERRCODE = '23503'; END IF;

  IF p_id IS NULL THEN
    v_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.product_variants (id, organization_id, product_id, name, size_label, flavor_label, status)
    VALUES (v_id, p_organization_id, p_product_id, p_name, p_size_label, p_flavor_label, p_status);
    v_action := 'catalog.variant.created';
    v_fields := ARRAY['product_id', 'name', 'size_label', 'flavor_label', 'status'];
  ELSE
    SELECT variant_row.* INTO v_old FROM public.product_variants AS variant_row
    WHERE variant_row.organization_id = p_organization_id AND variant_row.id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catalog item is unavailable.' USING ERRCODE = 'P0002'; END IF;
    IF v_old.product_id IS DISTINCT FROM p_product_id THEN RAISE EXCEPTION 'Variant parent is immutable.' USING ERRCODE = '23514'; END IF;
    IF p_status = 'archived' AND v_old.status <> 'archived'
      AND EXISTS (SELECT 1 FROM public.channel_offers WHERE organization_id = p_organization_id AND variant_id = p_id AND status = 'active')
    THEN RAISE EXCEPTION 'Archive variant offers first.' USING ERRCODE = '23514'; END IF;
    v_id := p_id;
    v_fields := ARRAY[]::text[];
    IF v_old.name IS DISTINCT FROM p_name THEN v_fields := pg_catalog.array_append(v_fields, 'name'); END IF;
    IF v_old.size_label IS DISTINCT FROM p_size_label THEN v_fields := pg_catalog.array_append(v_fields, 'size_label'); END IF;
    IF v_old.flavor_label IS DISTINCT FROM p_flavor_label THEN v_fields := pg_catalog.array_append(v_fields, 'flavor_label'); END IF;
    IF v_old.status IS DISTINCT FROM p_status THEN v_fields := pg_catalog.array_append(v_fields, 'status'); END IF;
    IF cardinality(v_fields) = 0 THEN RETURN private.catalog_command_result(v_id, v_audit_event_ids); END IF;
    UPDATE public.product_variants SET name = p_name, size_label = p_size_label, flavor_label = p_flavor_label,
      status = p_status, updated_at = pg_catalog.now()
    WHERE organization_id = p_organization_id AND id = p_id;
    v_action := CASE WHEN p_status = 'archived' AND v_old.status <> 'archived'
      THEN 'catalog.variant.archived' ELSE 'catalog.variant.updated' END;
  END IF;

  v_audit_event_ids := pg_catalog.array_append(v_audit_event_ids, private.write_catalog_audit_event(
    (SELECT auth.uid()), p_organization_id, NULL, NULL, v_action, 'product_variant', v_id,
    CASE WHEN v_action LIKE '%.archived' THEN 'catalog_archived'
      WHEN v_action LIKE '%.created' THEN 'catalog_created' ELSE 'catalog_updated' END,
    p_correlation_id, pg_catalog.jsonb_build_object('changed_fields', pg_catalog.to_jsonb(v_fields))
  ));
  RETURN private.catalog_command_result(v_id, v_audit_event_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.catalog_save_variant(uuid, uuid, uuid, text, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_save_variant(uuid, uuid, uuid, text, text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.catalog_save_channel(
  p_id uuid,
  p_organization_id uuid,
  p_channel_key text,
  p_display_name text,
  p_status text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_audit_event_ids uuid[] := ARRAY[]::uuid[];
  v_old public.sales_channels%ROWTYPE;
  v_action text;
  v_fields text[];
BEGIN
  IF (SELECT auth.uid()) IS NULL OR p_correlation_id IS NULL
    OR NOT public.catalog_has_permission(p_organization_id, NULL, NULL, 'catalog.write')
  THEN RAISE EXCEPTION 'Catalog authorization is unavailable.' USING ERRCODE = '42501'; END IF;
  IF p_channel_key NOT IN ('goodz_online', 'pickup', 'delivery')
    OR p_display_name IS NULL OR p_display_name !~ '[^[:space:]]' OR pg_catalog.char_length(p_display_name) > 100
    OR p_status NOT IN ('active', 'archived')
  THEN RAISE EXCEPTION 'Catalog input is invalid.' USING ERRCODE = '22023'; END IF;

  IF p_id IS NULL THEN
    v_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name, status)
    VALUES (v_id, p_organization_id, p_channel_key, p_display_name, p_status);
    v_action := 'catalog.channel.created';
    v_fields := ARRAY['channel_key', 'display_name', 'status'];
  ELSE
    SELECT channel_row.* INTO v_old FROM public.sales_channels AS channel_row
    WHERE channel_row.organization_id = p_organization_id AND channel_row.id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catalog item is unavailable.' USING ERRCODE = 'P0002'; END IF;
    IF v_old.channel_key IS DISTINCT FROM p_channel_key THEN RAISE EXCEPTION 'Sales channel identity is immutable.' USING ERRCODE = '23514'; END IF;
    IF p_status = 'archived' AND v_old.status <> 'archived'
      AND EXISTS (SELECT 1 FROM public.channel_offers WHERE organization_id = p_organization_id AND sales_channel_id = p_id AND status = 'active')
    THEN RAISE EXCEPTION 'Archive channel offers first.' USING ERRCODE = '23514'; END IF;
    v_id := p_id;
    v_fields := ARRAY[]::text[];
    IF v_old.display_name IS DISTINCT FROM p_display_name THEN v_fields := pg_catalog.array_append(v_fields, 'display_name'); END IF;
    IF v_old.status IS DISTINCT FROM p_status THEN v_fields := pg_catalog.array_append(v_fields, 'status'); END IF;
    IF cardinality(v_fields) = 0 THEN RETURN private.catalog_command_result(v_id, v_audit_event_ids); END IF;
    UPDATE public.sales_channels SET display_name = p_display_name, status = p_status, updated_at = pg_catalog.now()
    WHERE organization_id = p_organization_id AND id = p_id;
    v_action := CASE WHEN p_status = 'archived' AND v_old.status <> 'archived'
      THEN 'catalog.channel.archived' ELSE 'catalog.channel.updated' END;
  END IF;

  v_audit_event_ids := pg_catalog.array_append(v_audit_event_ids, private.write_catalog_audit_event(
    (SELECT auth.uid()), p_organization_id, NULL, NULL, v_action, 'sales_channel', v_id,
    CASE WHEN v_action LIKE '%.archived' THEN 'catalog_archived'
      WHEN v_action LIKE '%.created' THEN 'catalog_created' ELSE 'catalog_updated' END,
    p_correlation_id, pg_catalog.jsonb_build_object('changed_fields', pg_catalog.to_jsonb(v_fields))
  ));
  RETURN private.catalog_command_result(v_id, v_audit_event_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.catalog_save_channel(uuid, uuid, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_save_channel(uuid, uuid, text, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.catalog_save_offer(
  p_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_sales_channel_id uuid,
  p_target_kind text,
  p_product_id uuid,
  p_variant_id uuid,
  p_title_override text,
  p_description_override text,
  p_base_price numeric,
  p_currency text,
  p_availability_state text,
  p_is_visible boolean,
  p_status text,
  p_step_up_proof_id uuid,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_old public.channel_offers%ROWTYPE;
  v_product_status text;
  v_variant_status text;
  v_is_create boolean := false;
  v_price_changed boolean := false;
  v_availability_changed boolean := false;
  v_sensitive_permissions text[] := ARRAY[]::text[];
  v_normal_fields text[] := ARRAY[]::text[];
  v_commercial_fields text[] := ARRAY[]::text[];
  v_price_history_version integer;
  v_audit_event_ids uuid[] := ARRAY[]::uuid[];
  v_action text;
  v_id uuid;
  v_metadata jsonb;
BEGIN
  IF v_actor IS NULL OR p_correlation_id IS NULL
    OR NOT public.catalog_has_permission(p_organization_id, p_establishment_id, p_branch_id, 'catalog.write')
  THEN RAISE EXCEPTION 'Catalog authorization is unavailable.' USING ERRCODE = '42501'; END IF;

  IF p_branch_id IS NOT NULL AND p_establishment_id IS NULL
    OR p_title_override IS NOT NULL AND (p_title_override !~ '[^[:space:]]' OR pg_catalog.char_length(p_title_override) > 160)
    OR p_description_override IS NOT NULL AND pg_catalog.char_length(p_description_override) > 2000
    OR p_base_price IS NOT NULL AND (p_base_price < 0 OR p_base_price > 9999999999.99 OR p_base_price <> pg_catalog.trunc(p_base_price, 2))
    OR p_currency IS DISTINCT FROM 'BRL'
    OR p_availability_state NOT IN ('unknown', 'available', 'unavailable')
    OR p_status NOT IN ('active', 'archived')
    OR (p_is_visible AND (p_base_price IS NULL OR p_availability_state <> 'available' OR p_status <> 'active'))
    OR (p_status = 'archived' AND p_is_visible)
  THEN RAISE EXCEPTION 'Catalog offer input is invalid.' USING ERRCODE = '22023'; END IF;

  IF p_target_kind NOT IN ('product', 'variant')
    OR (p_target_kind = 'product' AND (p_product_id IS NULL OR p_variant_id IS NOT NULL))
    OR (p_target_kind = 'variant' AND (p_variant_id IS NULL OR p_product_id IS NOT NULL))
  THEN RAISE EXCEPTION 'Catalog offer target is unavailable.' USING ERRCODE = '23503'; END IF;

  -- Serialize offer writes against canonical identity/channel archives. Product and
  -- variant archive commands use update locks on these same rows.
  IF p_target_kind = 'product' THEN
    SELECT product_row.status INTO v_product_status
    FROM public.products AS product_row
    WHERE product_row.organization_id = p_organization_id AND product_row.id = p_product_id
    FOR UPDATE;
    IF NOT FOUND OR v_product_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'Catalog offer target is unavailable.' USING ERRCODE = '23503';
    END IF;
  ELSE
    SELECT product_row.status INTO v_product_status
    FROM public.products AS product_row
    JOIN public.product_variants AS variant_row
      ON variant_row.organization_id = product_row.organization_id AND variant_row.product_id = product_row.id
    WHERE product_row.organization_id = p_organization_id AND variant_row.id = p_variant_id
    FOR UPDATE OF product_row;
    IF NOT FOUND OR v_product_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'Catalog offer target is unavailable.' USING ERRCODE = '23503';
    END IF;
    SELECT variant_row.status INTO v_variant_status
    FROM public.product_variants AS variant_row
    WHERE variant_row.organization_id = p_organization_id AND variant_row.id = p_variant_id
    FOR UPDATE;
    IF NOT FOUND OR v_variant_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'Catalog offer target is unavailable.' USING ERRCODE = '23503';
    END IF;
  END IF;

  PERFORM 1 FROM public.sales_channels AS channel_row
  WHERE channel_row.organization_id = p_organization_id AND channel_row.id = p_sales_channel_id AND channel_row.status = 'active'
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Catalog offer target is unavailable.' USING ERRCODE = '23503'; END IF;

  IF p_id IS NULL THEN
    -- A caller-chosen offer ID would expose whether a foreign ID exists. New offers
    -- therefore begin as server-generated unavailable drafts; sensitive fields are
    -- set only after the resulting offer has an authorized, auditable resource ID.
    IF p_base_price IS NOT NULL OR p_availability_state <> 'unknown' OR p_is_visible OR p_step_up_proof_id IS NOT NULL THEN
      RAISE EXCEPTION 'Create an unavailable draft before changing price or availability.' USING ERRCODE = '42501';
    END IF;
    v_is_create := true;
    v_id := pg_catalog.gen_random_uuid();
    v_price_changed := false;
    v_availability_changed := false;
    v_normal_fields := ARRAY['target', 'channel', 'scope', 'title_override', 'description_override', 'status'];
  ELSE
    SELECT offer_row.* INTO v_old
    FROM public.channel_offers AS offer_row
    WHERE offer_row.organization_id = p_organization_id AND offer_row.id = p_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catalog item is unavailable.' USING ERRCODE = 'P0002'; END IF;
    v_is_create := false;
    v_id := p_id;
    IF v_old.establishment_id IS DISTINCT FROM p_establishment_id
      OR v_old.branch_id IS DISTINCT FROM p_branch_id
      OR v_old.sales_channel_id IS DISTINCT FROM p_sales_channel_id
      OR v_old.target_kind IS DISTINCT FROM p_target_kind
      OR v_old.product_id IS DISTINCT FROM p_product_id
      OR v_old.variant_id IS DISTINCT FROM p_variant_id
    THEN RAISE EXCEPTION 'Catalog item is unavailable.' USING ERRCODE = 'P0002'; END IF;
    v_price_changed := v_old.base_price IS DISTINCT FROM p_base_price OR v_old.currency IS DISTINCT FROM p_currency;
    IF v_old.base_price IS NOT NULL AND p_base_price IS NULL THEN
      RAISE EXCEPTION 'A recorded offer price cannot be cleared.' USING ERRCODE = '23514';
    END IF;
    v_availability_changed := v_old.availability_state IS DISTINCT FROM p_availability_state
      OR v_old.is_visible IS DISTINCT FROM p_is_visible
      OR (v_old.status = 'archived' AND p_status = 'active' AND p_is_visible);
    IF v_old.title_override IS DISTINCT FROM p_title_override THEN v_normal_fields := pg_catalog.array_append(v_normal_fields, 'title_override'); END IF;
    IF v_old.description_override IS DISTINCT FROM p_description_override THEN v_normal_fields := pg_catalog.array_append(v_normal_fields, 'description_override'); END IF;
    IF v_old.status IS DISTINCT FROM p_status THEN v_normal_fields := pg_catalog.array_append(v_normal_fields, 'status'); END IF;
  END IF;

  IF v_price_changed THEN
    IF NOT public.catalog_has_permission(p_organization_id, p_establishment_id, p_branch_id, 'catalog.price.write')
    THEN RAISE EXCEPTION 'Catalog authorization is unavailable.' USING ERRCODE = '42501'; END IF;
    v_sensitive_permissions := pg_catalog.array_append(v_sensitive_permissions, 'catalog.price.write');
    v_commercial_fields := pg_catalog.array_append(v_commercial_fields, 'base_price');
    IF NOT v_is_create AND v_old.currency IS DISTINCT FROM p_currency THEN
      v_commercial_fields := pg_catalog.array_append(v_commercial_fields, 'currency');
    END IF;
  END IF;
  IF v_availability_changed THEN
    IF NOT public.catalog_has_permission(p_organization_id, p_establishment_id, p_branch_id, 'catalog.availability.write')
    THEN RAISE EXCEPTION 'Catalog authorization is unavailable.' USING ERRCODE = '42501'; END IF;
    v_sensitive_permissions := pg_catalog.array_append(v_sensitive_permissions, 'catalog.availability.write');
    IF v_is_create OR v_old.availability_state IS DISTINCT FROM p_availability_state THEN
      v_commercial_fields := pg_catalog.array_append(v_commercial_fields, 'availability_state');
    END IF;
    IF v_is_create OR v_old.is_visible IS DISTINCT FROM p_is_visible THEN
      v_commercial_fields := pg_catalog.array_append(v_commercial_fields, 'is_visible');
    END IF;
  END IF;

  IF cardinality(v_sensitive_permissions) > 0 THEN
    IF NOT private.consume_catalog_step_up_proof(
      p_step_up_proof_id, v_actor, p_organization_id, p_establishment_id, p_branch_id,
      p_id, v_sensitive_permissions
    ) THEN RAISE EXCEPTION 'Privileged catalog confirmation is unavailable.' USING ERRCODE = '42501'; END IF;
  ELSIF p_step_up_proof_id IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected privileged catalog confirmation.' USING ERRCODE = '22023';
  END IF;

  IF v_is_create THEN
    INSERT INTO public.channel_offers (
      id, organization_id, establishment_id, branch_id, sales_channel_id,
      target_kind, product_id, variant_id, title_override, description_override,
      base_price, currency, availability_state, is_visible, status
    ) VALUES (
      v_id, p_organization_id, p_establishment_id, p_branch_id, p_sales_channel_id,
      p_target_kind, p_product_id, p_variant_id, p_title_override, p_description_override,
      p_base_price, p_currency, p_availability_state, p_is_visible, p_status
    );
    IF p_base_price IS NOT NULL THEN
      INSERT INTO public.channel_offer_price_history (
        organization_id, channel_offer_id, version, amount, currency, actor_user_id, correlation_id
      ) VALUES (p_organization_id, v_id, 1, p_base_price, p_currency, v_actor, p_correlation_id);
    END IF;
    v_audit_event_ids := pg_catalog.array_append(v_audit_event_ids, private.write_catalog_audit_event(
      v_actor, p_organization_id, p_establishment_id, p_branch_id, 'catalog.offer.created', 'channel_offer', v_id,
      'catalog_created', p_correlation_id,
      pg_catalog.jsonb_build_object('changed_fields', pg_catalog.to_jsonb(v_normal_fields))
    ));
  ELSE
    IF cardinality(v_normal_fields) > 0 OR cardinality(v_commercial_fields) > 0 THEN
      UPDATE public.channel_offers
      SET title_override = p_title_override,
          description_override = p_description_override,
          base_price = p_base_price,
          currency = p_currency,
          availability_state = p_availability_state,
          is_visible = p_is_visible,
          status = p_status,
          updated_at = pg_catalog.now()
      WHERE organization_id = p_organization_id AND id = v_id;
    ELSE
      RETURN private.catalog_command_result(v_id, v_audit_event_ids);
    END IF;
  END IF;

  IF v_price_changed AND NOT v_is_create THEN
    SELECT COALESCE(pg_catalog.max(history.version), 0) + 1 INTO v_price_history_version
    FROM public.channel_offer_price_history AS history
    WHERE history.organization_id = p_organization_id AND history.channel_offer_id = v_id;
    INSERT INTO public.channel_offer_price_history (
      organization_id, channel_offer_id, version, amount, currency, actor_user_id, correlation_id
    ) VALUES (p_organization_id, v_id, v_price_history_version, p_base_price, p_currency, v_actor, p_correlation_id);
  END IF;

  IF cardinality(v_normal_fields) > 0 AND NOT v_is_create THEN
    v_action := CASE WHEN p_status = 'archived' AND v_old.status <> 'archived'
      THEN 'catalog.offer.archived' ELSE 'catalog.offer.updated' END;
    v_audit_event_ids := pg_catalog.array_append(v_audit_event_ids, private.write_catalog_audit_event(
      v_actor, p_organization_id, p_establishment_id, p_branch_id, v_action, 'channel_offer', v_id,
      CASE WHEN v_action = 'catalog.offer.archived' THEN 'catalog_archived' ELSE 'catalog_updated' END,
      p_correlation_id, pg_catalog.jsonb_build_object('changed_fields', pg_catalog.to_jsonb(v_normal_fields))
    ));
  END IF;

  IF cardinality(v_commercial_fields) > 0 THEN
    v_action := CASE WHEN v_is_create THEN 'catalog.offer.commercial_created' ELSE 'catalog.offer.commercial_updated' END;
    v_metadata := pg_catalog.jsonb_build_object(
      'changed_fields', pg_catalog.to_jsonb(v_commercial_fields),
      'old_base_price', CASE WHEN v_is_create THEN NULL ELSE v_old.base_price::text END,
      'new_base_price', p_base_price::text,
      'currency', p_currency,
      'old_availability', CASE WHEN v_is_create THEN NULL ELSE v_old.availability_state END,
      'new_availability', p_availability_state,
      'old_visibility', CASE WHEN v_is_create THEN NULL ELSE v_old.is_visible END,
      'new_visibility', p_is_visible
    );
    v_audit_event_ids := pg_catalog.array_append(v_audit_event_ids, private.write_catalog_audit_event(
      v_actor, p_organization_id, p_establishment_id, p_branch_id, v_action, 'channel_offer', v_id,
      'catalog_commercial_updated', p_correlation_id, v_metadata
    ));
  END IF;

  RETURN private.catalog_command_result(v_id, v_audit_event_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.catalog_save_offer(uuid, uuid, uuid, uuid, uuid, text, uuid, uuid, text, text, numeric, text, text, boolean, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_save_offer(uuid, uuid, uuid, uuid, uuid, text, uuid, uuid, text, text, numeric, text, text, boolean, text, uuid, uuid)
  TO authenticated;
