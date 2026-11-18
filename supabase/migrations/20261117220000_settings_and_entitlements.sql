CREATE TYPE private.settings_literal_constants AS (
  permission_settings_read text,
  permission_settings_write text,
  permission_settings_sensitive_write text,
  status_active text,
  status_archived text,
  scope_platform text,
  scope_organization text,
  scope_establishment text,
  scope_branch text,
  scope_role text,
  scope_user text,
  scope_device_session text,
  type_boolean text,
  type_integer text,
  type_text text,
  type_string_array text,
  type_enum text,
  sensitivity_standard text,
  sensitivity_sensitive text,
  key_ordering_enabled text,
  key_accepted_payment_methods text,
  key_online_orders_entitlement text,
  key_delivery_own_fleet text,
  key_max_active_products text,
  key_pos_counter_operations text,
  status_trialing text,
  dotted_key_regex text,
  action_settings_step_up text,
  action_settings_upserted text,
  target_setting_value text,
  source_admin_guard text,
  source_settings_command text,
  outcome_allow text,
  outcome_deny text,
  reason_authorized text,
  reason_settings_created text,
  reason_settings_updated text,
  metadata_step_up_proof_id text,
  metadata_required_permissions text,
  metadata_setting_key text,
  metadata_scope_type text,
  metadata_changed_fields text,
  metadata_is_locked text,
  metadata_version text,
  json_type_object text,
  json_type_array text,
  json_type_string text,
  json_type_boolean text,
  json_type_number text,
  sqlstate_22023 text,
  sqlstate_42501 text,
  sqlstate_p0002 text,
  zero_uuid uuid,
  plan_pilot_mvp_id uuid,
  plan_growth_id uuid,
  msg_settings_auth_unavailable text,
  msg_settings_input_invalid text,
  msg_settings_policy_locked text,
  msg_settings_step_up_required text,
  msg_settings_entitlement_denied text
);

CREATE FUNCTION private.get_settings_literal_constants()
RETURNS private.settings_literal_constants
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT ROW(
    'settings.read'::text,
    'settings.write'::text,
    'settings.sensitive.write'::text,
    'active'::text,
    'archived'::text,
    'platform'::text,
    'organization'::text,
    'establishment'::text,
    'branch'::text,
    'role'::text,
    'user'::text,
    'device_session'::text,
    'boolean'::text,
    'integer'::text,
    'text'::text,
    'string_array'::text,
    'enum'::text,
    'standard'::text,
    'sensitive'::text,
    'storefront.ordering_enabled'::text,
    'handoff.accepted_payment_methods'::text,
    'storefront.online_orders'::text,
    'delivery.own_fleet'::text,
    'catalog.max_active_products'::text,
    'pos.counter_operations'::text,
    'trialing'::text,
    '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'::text,
    'settings.privileged.step_up'::text,
    'settings.value.upserted'::text,
    'setting_value'::text,
    'admin_guard'::text,
    'settings_command'::text,
    'allow'::text,
    'deny'::text,
    'authorized'::text,
    'settings_created'::text,
    'settings_updated'::text,
    'step_up_proof_id'::text,
    'required_permissions'::text,
    'setting_key'::text,
    'scope_type'::text,
    'changed_fields'::text,
    'is_locked'::text,
    'version'::text,
    'object'::text,
    'array'::text,
    'string'::text,
    'boolean'::text,
    'number'::text,
    '22023'::text,
    '42501'::text,
    'P0002'::text,
    '00000000-0000-4000-8000-000000000000'::uuid,
    '00000000-0000-4000-8000-000000000301'::uuid,
    '00000000-0000-4000-8000-000000000302'::uuid,
    'Settings authorization is unavailable.'::text,
    'Settings input is invalid.'::text,
    'Setting is locked by a higher policy scope.'::text,
    'Settings step-up verification is required.'::text,
    'Tenant entitlement does not allow this setting.'::text
  )::private.settings_literal_constants;
$function$;

REVOKE ALL ON TYPE private.settings_literal_constants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_settings_literal_constants() FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON TYPE private.settings_literal_constants TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_settings_literal_constants() TO authenticated;

INSERT INTO public.permissions (permission_key, display_name)
VALUES
  ((private.get_settings_literal_constants()).permission_settings_read, 'Read settings and entitlements'),
  ((private.get_settings_literal_constants()).permission_settings_write, 'Manage standard operational settings'),
  ((private.get_settings_literal_constants()).permission_settings_sensitive_write, 'Manage sensitive settings and policy locks')
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_settings_role_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_permission text;
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
BEGIN
  IF NEW.role_key IN ('owner', 'admin') THEN
    FOREACH v_permission IN ARRAY ARRAY[
      v_consts.permission_settings_read,
      v_consts.permission_settings_write,
      v_consts.permission_settings_sensitive_write
    ] LOOP
      INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
      VALUES (NEW.organization_id, NEW.id, v_permission)
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF NEW.role_key = 'staff' THEN
    INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
    VALUES (NEW.organization_id, NEW.id, v_consts.permission_settings_read)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_settings_role_permissions() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER tenant_roles_seed_settings_permissions
AFTER INSERT ON public.tenant_roles
FOR EACH ROW
EXECUTE FUNCTION private.seed_settings_role_permissions();

INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, permission.permission_key
FROM public.tenant_roles AS role
CROSS JOIN LATERAL unnest(
  CASE
    WHEN role.role_key IN ('owner', 'admin') THEN ARRAY[
      (private.get_settings_literal_constants()).permission_settings_read,
      (private.get_settings_literal_constants()).permission_settings_write,
      (private.get_settings_literal_constants()).permission_settings_sensitive_write
    ]::text[]
    WHEN role.role_key = 'staff' THEN ARRAY[
      (private.get_settings_literal_constants()).permission_settings_read
    ]::text[]
    ELSE ARRAY[]::text[]
  END
) AS permission(permission_key)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.settings_has_permission(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND p_permission_key IN (
      (private.get_settings_literal_constants()).permission_settings_read,
      (private.get_settings_literal_constants()).permission_settings_write,
      (private.get_settings_literal_constants()).permission_settings_sensitive_write
    )
    AND (p_branch_id IS NULL OR p_establishment_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.organizations AS organization_row
      WHERE organization_row.id = p_organization_id
        AND organization_row.status = (private.get_settings_literal_constants()).status_active
    )
    AND (
      p_establishment_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.establishments AS establishment_row
        WHERE establishment_row.organization_id = p_organization_id
          AND establishment_row.id = p_establishment_id
          AND establishment_row.status = (private.get_settings_literal_constants()).status_active
      )
    )
    AND (
      p_branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches AS branch_row
        WHERE branch_row.organization_id = p_organization_id
          AND branch_row.establishment_id = p_establishment_id
          AND branch_row.id = p_branch_id
          AND branch_row.status = (private.get_settings_literal_constants()).status_active
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships AS membership
      JOIN public.membership_roles AS assignment
        ON assignment.organization_id = membership.organization_id
        AND assignment.membership_id = membership.id
      JOIN public.role_permissions AS role_permission
        ON role_permission.organization_id = assignment.organization_id
        AND role_permission.role_id = assignment.role_id
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.organization_id = p_organization_id
        AND membership.status = (private.get_settings_literal_constants()).status_active
        AND role_permission.permission_key = p_permission_key
        AND CASE
          WHEN p_branch_id IS NOT NULL THEN
            assignment.scope_type = (private.get_settings_literal_constants()).scope_organization
            OR (
              assignment.scope_type = (private.get_settings_literal_constants()).scope_establishment
              AND assignment.establishment_id = p_establishment_id
            )
            OR (
              assignment.scope_type = (private.get_settings_literal_constants()).scope_branch
              AND assignment.establishment_id = p_establishment_id
              AND assignment.branch_id = p_branch_id
            )
          WHEN p_establishment_id IS NOT NULL THEN
            assignment.scope_type = (private.get_settings_literal_constants()).scope_organization
            OR (
              assignment.scope_type = (private.get_settings_literal_constants()).scope_establishment
              AND assignment.establishment_id = p_establishment_id
            )
          ELSE assignment.scope_type = (private.get_settings_literal_constants()).scope_organization
        END
    );
$function$;

REVOKE ALL ON FUNCTION public.settings_has_permission(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.settings_has_permission(uuid, uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.settings_can_read_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations AS organization_row
      WHERE organization_row.id = p_organization_id
        AND organization_row.status = (private.get_settings_literal_constants()).status_active
    )
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships AS membership
      JOIN public.membership_roles AS assignment
        ON assignment.organization_id = membership.organization_id
        AND assignment.membership_id = membership.id
      JOIN public.role_permissions AS role_permission
        ON role_permission.organization_id = assignment.organization_id
        AND role_permission.role_id = assignment.role_id
      LEFT JOIN public.establishments AS est
        ON est.organization_id = assignment.organization_id
        AND est.id = assignment.establishment_id
      LEFT JOIN public.branches AS br
        ON br.organization_id = assignment.organization_id
        AND br.establishment_id = assignment.establishment_id
        AND br.id = assignment.branch_id
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.organization_id = p_organization_id
        AND membership.status = (private.get_settings_literal_constants()).status_active
        AND role_permission.permission_key = (private.get_settings_literal_constants()).permission_settings_read
        AND (
          assignment.scope_type = (private.get_settings_literal_constants()).scope_organization
          OR (
            assignment.scope_type = (private.get_settings_literal_constants()).scope_establishment
            AND est.status = (private.get_settings_literal_constants()).status_active
          )
          OR (
            assignment.scope_type = (private.get_settings_literal_constants()).scope_branch
            AND est.status = (private.get_settings_literal_constants()).status_active
            AND br.status = (private.get_settings_literal_constants()).status_active
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.settings_can_read_organization(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.settings_can_read_organization(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.settings_can_read_establishment(p_organization_id uuid, p_establishment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations AS organization_row
      WHERE organization_row.id = p_organization_id
        AND organization_row.status = (private.get_settings_literal_constants()).status_active
    )
    AND EXISTS (
      SELECT 1 FROM public.establishments AS establishment_row
      WHERE establishment_row.organization_id = p_organization_id
        AND establishment_row.id = p_establishment_id
        AND establishment_row.status = (private.get_settings_literal_constants()).status_active
    )
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships AS membership
      JOIN public.membership_roles AS assignment
        ON assignment.organization_id = membership.organization_id
        AND assignment.membership_id = membership.id
      JOIN public.role_permissions AS role_permission
        ON role_permission.organization_id = assignment.organization_id
        AND role_permission.role_id = assignment.role_id
      LEFT JOIN public.branches AS br
        ON br.organization_id = assignment.organization_id
        AND br.establishment_id = assignment.establishment_id
        AND br.id = assignment.branch_id
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.organization_id = p_organization_id
        AND membership.status = (private.get_settings_literal_constants()).status_active
        AND role_permission.permission_key = (private.get_settings_literal_constants()).permission_settings_read
        AND (
          assignment.scope_type = (private.get_settings_literal_constants()).scope_organization
          OR (
            assignment.scope_type = (private.get_settings_literal_constants()).scope_establishment
            AND assignment.establishment_id = p_establishment_id
          )
          OR (
            assignment.scope_type = (private.get_settings_literal_constants()).scope_branch
            AND assignment.establishment_id = p_establishment_id
            AND br.status = (private.get_settings_literal_constants()).status_active
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.settings_can_read_establishment(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.settings_can_read_establishment(uuid, uuid) TO authenticated;

CREATE TABLE public.setting_definitions (
  key text PRIMARY KEY,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  value_type text NOT NULL,
  allowed_scopes text[] NOT NULL,
  default_value jsonb NOT NULL,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity text NOT NULL,
  audit_required boolean NOT NULL DEFAULT true,
  lockable_scopes text[] NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT (private.get_settings_literal_constants()).status_active,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT setting_definitions_key_check
    CHECK (key ~ (private.get_settings_literal_constants()).dotted_key_regex AND pg_catalog.char_length(key) <= 120),
  CONSTRAINT setting_definitions_display_name_check
    CHECK (private.catalog_has_non_whitespace(display_name) AND pg_catalog.char_length(display_name) <= 120),
  CONSTRAINT setting_definitions_description_check
    CHECK (pg_catalog.char_length(description) <= 1000),
  CONSTRAINT setting_definitions_value_type_check
    CHECK (value_type IN (
      (private.get_settings_literal_constants()).type_boolean,
      (private.get_settings_literal_constants()).type_integer,
      (private.get_settings_literal_constants()).type_text,
      (private.get_settings_literal_constants()).type_string_array,
      (private.get_settings_literal_constants()).type_enum
    )),
  CONSTRAINT setting_definitions_allowed_scopes_check
    CHECK (
      cardinality(allowed_scopes) >= 1
      AND allowed_scopes <@ ARRAY[
        (private.get_settings_literal_constants()).scope_platform,
        (private.get_settings_literal_constants()).scope_organization,
        (private.get_settings_literal_constants()).scope_establishment,
        (private.get_settings_literal_constants()).scope_branch,
        (private.get_settings_literal_constants()).scope_role,
        (private.get_settings_literal_constants()).scope_user,
        (private.get_settings_literal_constants()).scope_device_session
      ]::text[]
    ),
  CONSTRAINT setting_definitions_validation_rules_check
    CHECK (pg_catalog.jsonb_typeof(validation_rules) = (private.get_settings_literal_constants()).json_type_object),
  CONSTRAINT setting_definitions_sensitivity_check
    CHECK (sensitivity IN (
      (private.get_settings_literal_constants()).sensitivity_standard,
      (private.get_settings_literal_constants()).sensitivity_sensitive
    )),
  CONSTRAINT setting_definitions_lockable_scopes_check
    CHECK (
      lockable_scopes <@ ARRAY[
        (private.get_settings_literal_constants()).scope_platform,
        (private.get_settings_literal_constants()).scope_organization,
        (private.get_settings_literal_constants()).scope_establishment,
        (private.get_settings_literal_constants()).scope_role
      ]::text[]
    ),
  CONSTRAINT setting_definitions_schema_version_check
    CHECK (schema_version >= 1),
  CONSTRAINT setting_definitions_status_check
    CHECK (status IN (
      (private.get_settings_literal_constants()).status_active,
      (private.get_settings_literal_constants()).status_archived
    ))
);

CREATE OR REPLACE FUNCTION private.is_valid_setting_value(
  p_value_type text,
  p_validation_rules jsonb,
  p_value jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
  v_text text;
  v_int bigint;
  v_min bigint;
  v_max bigint;
  v_max_length integer;
  v_allow_empty boolean;
  v_pattern text;
  v_allowed text[];
  v_items text[];
  v_min_items integer;
  v_max_items integer;
BEGIN
  IF p_value IS NULL OR p_value = 'null'::jsonb THEN
    RETURN false;
  END IF;

  IF p_value_type = v_consts.type_boolean THEN
    RETURN pg_catalog.jsonb_typeof(p_value) = v_consts.json_type_boolean;
  END IF;

  IF p_value_type = v_consts.type_integer THEN
    IF pg_catalog.jsonb_typeof(p_value) <> v_consts.json_type_number OR (p_value::text !~ '^-?[0-9]+$') THEN
      RETURN false;
    END IF;
    v_int := (p_value::text)::bigint;
    IF p_validation_rules ? 'min' THEN
      v_min := (p_validation_rules->>'min')::bigint;
      IF v_int < v_min THEN RETURN false; END IF;
    END IF;
    IF p_validation_rules ? 'max' THEN
      v_max := (p_validation_rules->>'max')::bigint;
      IF v_int > v_max THEN RETURN false; END IF;
    END IF;
    RETURN true;
  END IF;

  IF p_value_type = v_consts.type_text THEN
    IF pg_catalog.jsonb_typeof(p_value) <> v_consts.json_type_string THEN
      RETURN false;
    END IF;
    v_text := p_value #>> '{}';
    v_allow_empty := COALESCE((p_validation_rules->>'allowEmpty')::boolean, true);
    IF NOT v_allow_empty AND NOT private.catalog_has_non_whitespace(v_text) THEN
      RETURN false;
    END IF;
    IF p_validation_rules ? 'maxLength' THEN
      v_max_length := (p_validation_rules->>'maxLength')::integer;
      IF pg_catalog.char_length(v_text) > v_max_length THEN
        RETURN false;
      END IF;
    END IF;
    IF p_validation_rules ? 'pattern' THEN
      v_pattern := p_validation_rules->>'pattern';
      IF v_text !~ v_pattern THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  IF p_value_type = v_consts.type_enum THEN
    IF pg_catalog.jsonb_typeof(p_value) <> v_consts.json_type_string THEN
      RETURN false;
    END IF;
    v_text := p_value #>> '{}';
    SELECT COALESCE(pg_catalog.array_agg(elem.val), ARRAY[]::text[])
    INTO v_allowed
    FROM pg_catalog.jsonb_array_elements_text(COALESCE(p_validation_rules->'allowedValues', '[]'::jsonb)) AS elem(val);
    RETURN v_text = ANY(v_allowed);
  END IF;

  IF p_value_type = v_consts.type_string_array THEN
    IF pg_catalog.jsonb_typeof(p_value) <> v_consts.json_type_array THEN
      RETURN false;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements(p_value) AS elem(val)
      WHERE pg_catalog.jsonb_typeof(elem.val) <> v_consts.json_type_string
    ) THEN
      RETURN false;
    END IF;
    SELECT COALESCE(pg_catalog.array_agg(elem.val), ARRAY[]::text[])
    INTO v_items
    FROM pg_catalog.jsonb_array_elements_text(p_value) AS elem(val);

    IF cardinality(v_items) <> (
      SELECT pg_catalog.count(DISTINCT item.val)::integer
      FROM pg_catalog.unnest(v_items) AS item(val)
    ) THEN
      RETURN false;
    END IF;

    v_min_items := COALESCE((p_validation_rules->>'minItems')::integer, 0);
    v_max_items := COALESCE((p_validation_rules->>'maxItems')::integer, 100);
    IF cardinality(v_items) < v_min_items OR cardinality(v_items) > v_max_items THEN
      RETURN false;
    END IF;

    SELECT COALESCE(pg_catalog.array_agg(elem.val), ARRAY[]::text[])
    INTO v_allowed
    FROM pg_catalog.jsonb_array_elements_text(COALESCE(p_validation_rules->'allowedValues', '[]'::jsonb)) AS elem(val);
    RETURN v_items <@ v_allowed;
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION private.is_valid_setting_value(text, jsonb, jsonb) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.setting_definitions
  ADD CONSTRAINT setting_definitions_default_value_valid_check
  CHECK (private.is_valid_setting_value(value_type, validation_rules, default_value));

INSERT INTO public.setting_definitions (
  key, display_name, description, value_type, allowed_scopes, default_value, validation_rules, sensitivity, audit_required, lockable_scopes
)
SELECT
  seed.key,
  seed.display_name,
  seed.description,
  seed.value_type,
  seed.allowed_scopes,
  seed.default_value,
  seed.validation_rules,
  seed.sensitivity,
  true,
  seed.lockable_scopes
FROM (
  SELECT
    (private.get_settings_literal_constants()).key_ordering_enabled AS key,
    'Pedidos online ativos'::text AS display_name,
    'Chave geral fail-closed da vitrine online Goodz na unidade.'::text AS description,
    (private.get_settings_literal_constants()).type_boolean AS value_type,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[] AS allowed_scopes,
    pg_catalog.to_jsonb(false) AS default_value,
    '{}'::jsonb AS validation_rules,
    (private.get_settings_literal_constants()).sensitivity_sensitive AS sensitivity,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[] AS lockable_scopes
  UNION ALL SELECT
    'storefront.pickup_enabled',
    'Retirada no local',
    'Permite pedidos para retirada presencial pelo cliente.',
    (private.get_settings_literal_constants()).type_boolean,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    pg_catalog.to_jsonb(true),
    '{}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'storefront.delivery_enabled',
    'Entrega própria',
    'Permite pedidos com entrega própria da unidade dentro das zonas ativas.',
    (private.get_settings_literal_constants()).type_boolean,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    pg_catalog.to_jsonb(true),
    '{}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'storefront.operating_hours',
    'Horário de funcionamento exibido',
    'Resumo público do horário de atendimento do cardápio online.',
    (private.get_settings_literal_constants()).type_text,
    ARRAY[
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    '"Seg–Dom · 11:00 às 23:00"'::jsonb,
    '{"maxLength":240,"allowEmpty":false}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'storefront.estimated_prep_minutes',
    'Tempo médio de preparo (min)',
    'Estimativa padrão em minutos para pedidos de retirada.',
    (private.get_settings_literal_constants()).type_integer,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    '25'::jsonb,
    '{"min":5,"max":240}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'storefront.estimated_delivery_minutes',
    'Tempo médio de entrega (min)',
    'Estimativa padrão em minutos para pedidos com entrega própria.',
    (private.get_settings_literal_constants()).type_integer,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    '45'::jsonb,
    '{"min":10,"max":300}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'storefront.support_whatsapp',
    'Contato de suporte (WhatsApp/Telefone)',
    'Canal público de atendimento exibido ao cliente no acompanhamento do pedido.',
    (private.get_settings_literal_constants()).type_text,
    ARRAY[
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    '""'::jsonb,
    '{"maxLength":40,"allowEmpty":true,"pattern":"^(\\+?[0-9() -]{8,30})?$"}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'storefront.public_notice',
    'Aviso operacional na vitrine',
    'Mensagem curta opcional exibida no topo do cardápio público.',
    (private.get_settings_literal_constants()).type_text,
    ARRAY[
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    '""'::jsonb,
    '{"maxLength":500,"allowEmpty":true}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    (private.get_settings_literal_constants()).key_accepted_payment_methods,
    'Meios aceitos no pagamento na entrega/retirada',
    'Formas presenciais aceitas no recebimento (sem gateway online no MVP).',
    (private.get_settings_literal_constants()).type_string_array,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    '["pix_in_person","debit_card_pos","credit_card_pos","cash"]'::jsonb,
    '{"allowedValues":["cash","pix_in_person","debit_card_pos","credit_card_pos"],"minItems":1,"maxItems":4}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_sensitive,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'handoff.cash_change_enabled',
    'Permitir solicitação de troco em dinheiro',
    'Exibe campo de troco quando dinheiro estiver habilitado.',
    (private.get_settings_literal_constants()).type_boolean,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment,
      (private.get_settings_literal_constants()).scope_branch
    ]::text[],
    pg_catalog.to_jsonb(true),
    '{}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_establishment
    ]::text[]
  UNION ALL SELECT
    'ui.density_mode',
    'Densidade visual do painel',
    'Preferência de densidade visual para telas operacionais densas e uso diário.',
    (private.get_settings_literal_constants()).type_enum,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_role,
      (private.get_settings_literal_constants()).scope_user,
      (private.get_settings_literal_constants()).scope_device_session
    ]::text[],
    '"comfortable"'::jsonb,
    '{"allowedValues":["comfortable","compact"]}'::jsonb,
    (private.get_settings_literal_constants()).sensitivity_standard,
    ARRAY[
      (private.get_settings_literal_constants()).scope_platform,
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_role
    ]::text[]
) AS seed
ON CONFLICT (key) DO NOTHING;

CREATE TABLE public.setting_values (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  setting_key text NOT NULL,
  scope_type text NOT NULL,
  organization_id uuid,
  establishment_id uuid,
  branch_id uuid,
  role_id uuid,
  user_id uuid,
  value_json jsonb NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT setting_values_setting_key_fkey
    FOREIGN KEY (setting_key)
    REFERENCES public.setting_definitions (key)
    ON DELETE RESTRICT,
  CONSTRAINT setting_values_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE CASCADE,
  CONSTRAINT setting_values_establishment_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE CASCADE,
  CONSTRAINT setting_values_branch_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE CASCADE,
  CONSTRAINT setting_values_role_tenant_fkey
    FOREIGN KEY (organization_id, role_id)
    REFERENCES public.tenant_roles (organization_id, id)
    ON DELETE CASCADE,
  CONSTRAINT setting_values_user_membership_fkey
    FOREIGN KEY (organization_id, user_id)
    REFERENCES public.organization_memberships (organization_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT setting_values_updated_by_fkey
    FOREIGN KEY (updated_by)
    REFERENCES auth.users (id)
    ON DELETE SET NULL,
  CONSTRAINT setting_values_version_check
    CHECK (version >= 1),
  CONSTRAINT setting_values_scope_shape_check
    CHECK (
      (
        scope_type = (private.get_settings_literal_constants()).scope_platform
        AND organization_id IS NULL
        AND establishment_id IS NULL
        AND branch_id IS NULL
        AND role_id IS NULL
        AND user_id IS NULL
      )
      OR (
        scope_type = (private.get_settings_literal_constants()).scope_organization
        AND organization_id IS NOT NULL
        AND establishment_id IS NULL
        AND branch_id IS NULL
        AND role_id IS NULL
        AND user_id IS NULL
      )
      OR (
        scope_type = (private.get_settings_literal_constants()).scope_establishment
        AND organization_id IS NOT NULL
        AND establishment_id IS NOT NULL
        AND branch_id IS NULL
        AND role_id IS NULL
        AND user_id IS NULL
      )
      OR (
        scope_type = (private.get_settings_literal_constants()).scope_branch
        AND organization_id IS NOT NULL
        AND establishment_id IS NOT NULL
        AND branch_id IS NOT NULL
        AND role_id IS NULL
        AND user_id IS NULL
        AND is_locked = false
      )
      OR (
        scope_type = (private.get_settings_literal_constants()).scope_role
        AND organization_id IS NOT NULL
        AND establishment_id IS NULL
        AND branch_id IS NULL
        AND role_id IS NOT NULL
        AND user_id IS NULL
      )
      OR (
        scope_type = (private.get_settings_literal_constants()).scope_user
        AND organization_id IS NOT NULL
        AND establishment_id IS NULL
        AND branch_id IS NULL
        AND role_id IS NULL
        AND user_id IS NOT NULL
        AND is_locked = false
      )
    )
);

CREATE UNIQUE INDEX setting_values_unique_scope_key_idx ON public.setting_values (
  setting_key,
  scope_type,
  COALESCE(organization_id, (private.get_settings_literal_constants()).zero_uuid),
  COALESCE(establishment_id, (private.get_settings_literal_constants()).zero_uuid),
  COALESCE(branch_id, (private.get_settings_literal_constants()).zero_uuid),
  COALESCE(role_id, (private.get_settings_literal_constants()).zero_uuid),
  COALESCE(user_id, (private.get_settings_literal_constants()).zero_uuid)
);

CREATE INDEX setting_values_organization_scope_idx
  ON public.setting_values (organization_id, scope_type, setting_key)
  WHERE organization_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.validate_setting_value_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_def public.setting_definitions%ROWTYPE;
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
BEGIN
  SELECT def_row.* INTO v_def
  FROM public.setting_definitions AS def_row
  WHERE def_row.key = NEW.setting_key
    AND def_row.status = v_consts.status_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  IF NOT (NEW.scope_type = ANY(v_def.allowed_scopes)) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  IF NEW.is_locked AND NOT (NEW.scope_type = ANY(v_def.lockable_scopes)) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  IF NOT private.is_valid_setting_value(v_def.value_type, v_def.validation_rules, NEW.value_json) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.validate_setting_value_row() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER setting_values_validate_before_write
BEFORE INSERT OR UPDATE ON public.setting_values
FOR EACH ROW
EXECUTE FUNCTION private.validate_setting_value_row();

-- Plans & Entitlements (GMZ-REQ-PLAT-005)
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  plan_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT (private.get_settings_literal_constants()).status_active,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT plans_code_check
    CHECK (plan_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  CONSTRAINT plans_display_name_check
    CHECK (private.catalog_has_non_whitespace(display_name) AND pg_catalog.char_length(display_name) <= 120),
  CONSTRAINT plans_description_check
    CHECK (pg_catalog.char_length(description) <= 1000),
  CONSTRAINT plans_status_check
    CHECK (status IN (
      (private.get_settings_literal_constants()).status_active,
      (private.get_settings_literal_constants()).status_archived
    ))
);

CREATE TABLE public.entitlements (
  key text PRIMARY KEY,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  value_type text NOT NULL,
  default_value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT entitlements_key_check
    CHECK (key ~ (private.get_settings_literal_constants()).dotted_key_regex AND pg_catalog.char_length(key) <= 120),
  CONSTRAINT entitlements_display_name_check
    CHECK (private.catalog_has_non_whitespace(display_name) AND pg_catalog.char_length(display_name) <= 120),
  CONSTRAINT entitlements_description_check
    CHECK (pg_catalog.char_length(description) <= 1000),
  CONSTRAINT entitlements_value_type_check
    CHECK (value_type IN (
      (private.get_settings_literal_constants()).type_boolean,
      (private.get_settings_literal_constants()).type_integer
    )),
  CONSTRAINT entitlements_default_value_valid_check
    CHECK (private.is_valid_setting_value(value_type, '{}'::jsonb, default_value))
);

CREATE TABLE public.plan_entitlements (
  plan_id uuid NOT NULL,
  entitlement_key text NOT NULL,
  value_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT plan_entitlements_pkey
    PRIMARY KEY (plan_id, entitlement_key),
  CONSTRAINT plan_entitlements_plan_fkey
    FOREIGN KEY (plan_id)
    REFERENCES public.plans (id)
    ON DELETE CASCADE,
  CONSTRAINT plan_entitlements_entitlement_fkey
    FOREIGN KEY (entitlement_key)
    REFERENCES public.entitlements (key)
    ON DELETE RESTRICT
);

CREATE TABLE public.organization_plan_subscriptions (
  organization_id uuid PRIMARY KEY,
  plan_id uuid NOT NULL,
  status text NOT NULL DEFAULT (private.get_settings_literal_constants()).status_active,
  assigned_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT organization_plan_subscriptions_org_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE CASCADE,
  CONSTRAINT organization_plan_subscriptions_plan_fkey
    FOREIGN KEY (plan_id)
    REFERENCES public.plans (id)
    ON DELETE RESTRICT,
  CONSTRAINT organization_plan_subscriptions_status_check
    CHECK (status IN (
      (private.get_settings_literal_constants()).status_active,
      (private.get_settings_literal_constants()).status_trialing,
      'past_due',
      'suspended'
    ))
);

CREATE TABLE public.tenant_entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  entitlement_key text NOT NULL,
  value_json jsonb NOT NULL,
  reason text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT tenant_entitlement_overrides_org_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE CASCADE,
  CONSTRAINT tenant_entitlement_overrides_entitlement_fkey
    FOREIGN KEY (entitlement_key)
    REFERENCES public.entitlements (key)
    ON DELETE RESTRICT,
  CONSTRAINT tenant_entitlement_overrides_org_key_unique
    UNIQUE (organization_id, entitlement_key),
  CONSTRAINT tenant_entitlement_overrides_reason_check
    CHECK (private.catalog_has_non_whitespace(reason) AND pg_catalog.char_length(reason) BETWEEN 3 AND 500)
);

CREATE OR REPLACE FUNCTION private.validate_entitlement_grant_value()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_value_type text;
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
BEGIN
  SELECT ent.value_type INTO v_value_type
  FROM public.entitlements AS ent
  WHERE ent.key = NEW.entitlement_key;
  IF NOT FOUND OR NOT private.is_valid_setting_value(v_value_type, '{}'::jsonb, NEW.value_json) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.validate_entitlement_grant_value() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER plan_entitlements_validate_value
BEFORE INSERT OR UPDATE ON public.plan_entitlements
FOR EACH ROW EXECUTE FUNCTION private.validate_entitlement_grant_value();

CREATE TRIGGER tenant_entitlement_overrides_validate_value
BEFORE INSERT OR UPDATE ON public.tenant_entitlement_overrides
FOR EACH ROW EXECUTE FUNCTION private.validate_entitlement_grant_value();

INSERT INTO public.plans (id, plan_code, display_name, description)
VALUES
  (
    (private.get_settings_literal_constants()).plan_pilot_mvp_id,
    'pilot_mvp',
    'Goodz Pilot MVP',
    'Cardápio online próprio, retirada, entrega própria e pagamento presencial na entrega.'
  ),
  (
    (private.get_settings_literal_constants()).plan_growth_id,
    'growth_preview',
    'Goodz Growth',
    'Plano comercial expandido desacoplado de overrides operacionais por organização.'
  )
ON CONFLICT (plan_code) DO NOTHING;

INSERT INTO public.entitlements (key, display_name, description, value_type, default_value)
VALUES
  (
    (private.get_settings_literal_constants()).key_online_orders_entitlement,
    'Pedidos online próprios',
    'Habilita operação de cardápio e pedidos online Goodz.',
    (private.get_settings_literal_constants()).type_boolean,
    pg_catalog.to_jsonb(false)
  ),
  (
    (private.get_settings_literal_constants()).key_delivery_own_fleet,
    'Entrega própria por zonas',
    'Habilita configuração e operação de entrega própria.',
    (private.get_settings_literal_constants()).type_boolean,
    pg_catalog.to_jsonb(false)
  ),
  (
    (private.get_settings_literal_constants()).key_max_active_products,
    'Limite de produtos ativos no catálogo',
    'Quantidade máxima de produtos ativos permitida para a organização.',
    (private.get_settings_literal_constants()).type_integer,
    pg_catalog.to_jsonb(100)
  ),
  (
    (private.get_settings_literal_constants()).key_pos_counter_operations,
    'PDV e frente de caixa (futuro)',
    'Capacidade comercial separada para frente de caixa quando liberada.',
    (private.get_settings_literal_constants()).type_boolean,
    pg_catalog.to_jsonb(false)
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value_json)
VALUES
  ((private.get_settings_literal_constants()).plan_pilot_mvp_id, (private.get_settings_literal_constants()).key_online_orders_entitlement, pg_catalog.to_jsonb(true)),
  ((private.get_settings_literal_constants()).plan_pilot_mvp_id, (private.get_settings_literal_constants()).key_delivery_own_fleet, pg_catalog.to_jsonb(true)),
  ((private.get_settings_literal_constants()).plan_pilot_mvp_id, (private.get_settings_literal_constants()).key_max_active_products, pg_catalog.to_jsonb(250)),
  ((private.get_settings_literal_constants()).plan_pilot_mvp_id, (private.get_settings_literal_constants()).key_pos_counter_operations, pg_catalog.to_jsonb(false)),
  ((private.get_settings_literal_constants()).plan_growth_id, (private.get_settings_literal_constants()).key_online_orders_entitlement, pg_catalog.to_jsonb(true)),
  ((private.get_settings_literal_constants()).plan_growth_id, (private.get_settings_literal_constants()).key_delivery_own_fleet, pg_catalog.to_jsonb(true)),
  ((private.get_settings_literal_constants()).plan_growth_id, (private.get_settings_literal_constants()).key_max_active_products, pg_catalog.to_jsonb(2000)),
  ((private.get_settings_literal_constants()).plan_growth_id, (private.get_settings_literal_constants()).key_pos_counter_operations, pg_catalog.to_jsonb(true))
ON CONFLICT (plan_id, entitlement_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_organization_default_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.organization_plan_subscriptions (organization_id, plan_id)
  VALUES (NEW.id, (private.get_settings_literal_constants()).plan_pilot_mvp_id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_organization_default_plan() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER organizations_seed_default_plan
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION private.seed_organization_default_plan();

INSERT INTO public.organization_plan_subscriptions (organization_id, plan_id)
SELECT org.id, (private.get_settings_literal_constants()).plan_pilot_mvp_id
FROM public.organizations AS org
ON CONFLICT (organization_id) DO NOTHING;

-- Audit extension & step-up consumption
CREATE TABLE private.settings_step_up_consumptions (
  guard_event_id uuid PRIMARY KEY,
  consumed_by uuid NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT settings_step_up_consumptions_event_fkey
    FOREIGN KEY (guard_event_id)
    REFERENCES public.audit_events (id)
    ON DELETE RESTRICT,
  CONSTRAINT settings_step_up_consumptions_actor_fkey
    FOREIGN KEY (consumed_by)
    REFERENCES auth.users (id)
    ON DELETE RESTRICT
);

REVOKE ALL PRIVILEGES ON TABLE private.settings_step_up_consumptions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_valid_settings_audit_metadata(
  p_action text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
  v_proof text;
  v_key text;
  v_scope text;
BEGIN
  IF p_metadata IS NULL OR pg_catalog.jsonb_typeof(p_metadata) <> v_consts.json_type_object THEN
    RETURN false;
  END IF;

  v_key := p_metadata->>v_consts.metadata_setting_key;
  v_scope := p_metadata->>v_consts.metadata_scope_type;
  IF v_key IS NULL OR v_key !~ v_consts.dotted_key_regex
    OR v_scope IS NULL OR v_scope NOT IN (
      v_consts.scope_platform,
      v_consts.scope_organization,
      v_consts.scope_establishment,
      v_consts.scope_branch,
      v_consts.scope_role,
      v_consts.scope_user
    )
  THEN
    RETURN false;
  END IF;

  IF p_action = v_consts.action_settings_step_up THEN
    IF NOT (p_metadata ? v_consts.metadata_required_permissions)
      OR pg_catalog.jsonb_typeof(p_metadata->v_consts.metadata_required_permissions) <> v_consts.json_type_array
      OR pg_catalog.jsonb_array_length(p_metadata->v_consts.metadata_required_permissions) < 1
      OR (p_metadata - ARRAY[
        v_consts.metadata_required_permissions,
        v_consts.metadata_setting_key,
        v_consts.metadata_scope_type,
        v_consts.metadata_step_up_proof_id
      ]::text[]) <> '{}'::jsonb
    THEN
      RETURN false;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements(p_metadata->v_consts.metadata_required_permissions) AS perm(val)
      WHERE pg_catalog.jsonb_typeof(perm.val) <> v_consts.json_type_string
        OR (perm.val #>> '{}') <> v_consts.permission_settings_sensitive_write
    ) THEN
      RETURN false;
    END IF;
    IF p_metadata ? v_consts.metadata_step_up_proof_id THEN
      v_proof := p_metadata->>v_consts.metadata_step_up_proof_id;
      IF v_proof IS NULL OR v_proof !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  IF p_action = v_consts.action_settings_upserted THEN
    RETURN COALESCE(
      p_metadata ? v_consts.metadata_changed_fields
      AND pg_catalog.jsonb_typeof(p_metadata->v_consts.metadata_changed_fields) = v_consts.json_type_array
      AND p_metadata ? v_consts.metadata_is_locked
      AND pg_catalog.jsonb_typeof(p_metadata->v_consts.metadata_is_locked) = v_consts.json_type_boolean
      AND p_metadata ? v_consts.metadata_version
      AND pg_catalog.jsonb_typeof(p_metadata->v_consts.metadata_version) = v_consts.json_type_number
      AND (p_metadata - ARRAY[
        v_consts.metadata_setting_key,
        v_consts.metadata_scope_type,
        v_consts.metadata_is_locked,
        v_consts.metadata_version,
        v_consts.metadata_changed_fields
      ]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION private.is_valid_settings_audit_metadata(text, jsonb) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (action IN (
  (private.get_catalog_literal_constants()).proof_source,
  (private.get_catalog_literal_constants()).action_catalog_privileged_step_up,
  'catalog.category.created', 'catalog.category.updated', 'catalog.category.archived',
  'catalog.product.created', 'catalog.product.updated', 'catalog.product.archived',
  'catalog.variant.created', 'catalog.variant.updated', 'catalog.variant.archived',
  'catalog.channel.created', 'catalog.channel.updated', 'catalog.channel.archived',
  'catalog.offer.created', 'catalog.offer.updated', 'catalog.offer.archived',
  'catalog.offer.commercial_created', 'catalog.offer.commercial_updated',
  (private.get_settings_literal_constants()).action_settings_step_up,
  (private.get_settings_literal_constants()).action_settings_upserted
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_type_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_type_check CHECK (target_type IN (
  (private.get_catalog_literal_constants()).scope_branch,
  'product_category',
  (private.get_catalog_literal_constants()).target_product,
  'product_variant',
  'sales_channel',
  (private.get_catalog_literal_constants()).target_channel_offer,
  (private.get_settings_literal_constants()).target_setting_value
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_reason_code_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_reason_code_check CHECK (reason_code IN (
  (private.get_settings_literal_constants()).reason_authorized,
  'invalid_scope', 'unauthenticated', 'identity_unverified', 'authorization_denied',
  'aal2_required', 'factor_unverified', 'reauthentication_required', 'step_up_required',
  'catalog_created', 'catalog_updated', 'catalog_archived', 'catalog_commercial_updated',
  (private.get_settings_literal_constants()).reason_settings_created,
  (private.get_settings_literal_constants()).reason_settings_updated
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_source_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_source_check CHECK (source IN (
  (private.get_catalog_literal_constants()).source_admin_guard,
  (private.get_catalog_literal_constants()).source_catalog_command,
  (private.get_settings_literal_constants()).source_settings_command
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_metadata_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_metadata_check CHECK (
  pg_catalog.jsonb_typeof(metadata) = (private.get_settings_literal_constants()).json_type_object
  AND pg_catalog.octet_length(metadata::text) <= 1024
  AND (
    (action = (private.get_catalog_literal_constants()).proof_source
      AND metadata = '{"required_permission":"tenant.hierarchy.read"}'::jsonb)
    OR (action LIKE 'catalog.%' AND private.is_valid_catalog_audit_metadata(action, metadata) IS TRUE)
    OR (action LIKE 'settings.%' AND private.is_valid_settings_audit_metadata(action, metadata) IS TRUE)
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_action_shape_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_action_shape_check CHECK (
  (action = (private.get_catalog_literal_constants()).proof_source AND target_type = (private.get_catalog_literal_constants()).scope_branch AND source = (private.get_catalog_literal_constants()).source_admin_guard)
  OR (action = (private.get_catalog_literal_constants()).action_catalog_privileged_step_up AND target_type = (private.get_catalog_literal_constants()).target_channel_offer AND source = (private.get_catalog_literal_constants()).source_admin_guard)
  OR (action LIKE 'catalog.category.%' AND target_type = 'product_category' AND source = (private.get_catalog_literal_constants()).source_catalog_command)
  OR (action LIKE 'catalog.product.%' AND target_type = (private.get_catalog_literal_constants()).target_product AND source = (private.get_catalog_literal_constants()).source_catalog_command)
  OR (action LIKE 'catalog.variant.%' AND target_type = 'product_variant' AND source = (private.get_catalog_literal_constants()).source_catalog_command)
  OR (action LIKE 'catalog.channel.%' AND target_type = 'sales_channel' AND source = (private.get_catalog_literal_constants()).source_catalog_command)
  OR (action LIKE 'catalog.offer.%' AND target_type = (private.get_catalog_literal_constants()).target_channel_offer AND source = (private.get_catalog_literal_constants()).source_catalog_command)
  OR (action = (private.get_settings_literal_constants()).action_settings_step_up AND target_type = (private.get_settings_literal_constants()).target_setting_value AND source = (private.get_settings_literal_constants()).source_admin_guard)
  OR (action = (private.get_settings_literal_constants()).action_settings_upserted AND target_type = (private.get_settings_literal_constants()).target_setting_value AND source = (private.get_settings_literal_constants()).source_settings_command)
);

-- RLS & Least Privilege
ALTER TABLE public.setting_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setting_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_entitlement_overrides ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.setting_definitions,
  public.setting_values,
  public.plans,
  public.entitlements,
  public.plan_entitlements,
  public.organization_plan_subscriptions,
  public.tenant_entitlement_overrides
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.setting_definitions,
  public.setting_values,
  public.plans,
  public.entitlements,
  public.plan_entitlements,
  public.organization_plan_subscriptions,
  public.tenant_entitlement_overrides
TO authenticated;

CREATE POLICY setting_definitions_authenticated_select ON public.setting_definitions
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY plans_authenticated_select ON public.plans
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY entitlements_authenticated_select ON public.entitlements
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY plan_entitlements_authenticated_select ON public.plan_entitlements
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY organization_plan_subscriptions_tenant_select ON public.organization_plan_subscriptions
FOR SELECT TO authenticated
USING ((SELECT public.settings_can_read_organization(organization_id)));

CREATE POLICY tenant_entitlement_overrides_tenant_select ON public.tenant_entitlement_overrides
FOR SELECT TO authenticated
USING ((SELECT public.settings_can_read_organization(organization_id)));

CREATE POLICY setting_values_scoped_select ON public.setting_values
FOR SELECT TO authenticated
USING (
  (
    scope_type = (private.get_settings_literal_constants()).scope_platform
    AND (SELECT auth.uid()) IS NOT NULL
  )
  OR (
    scope_type IN (
      (private.get_settings_literal_constants()).scope_organization,
      (private.get_settings_literal_constants()).scope_role
    )
    AND (SELECT public.settings_can_read_organization(organization_id))
  )
  OR (
    scope_type = (private.get_settings_literal_constants()).scope_establishment
    AND (SELECT public.settings_can_read_establishment(organization_id, establishment_id))
  )
  OR (
    scope_type = (private.get_settings_literal_constants()).scope_branch
    AND (SELECT public.settings_has_permission(
      organization_id,
      establishment_id,
      branch_id,
      (private.get_settings_literal_constants()).permission_settings_read
    ))
  )
  OR (
    scope_type = (private.get_settings_literal_constants()).scope_user
    AND user_id = (SELECT auth.uid())
    AND (SELECT public.settings_can_read_organization(organization_id))
  )
);

-- Step-up proof RPC (service_role only, identical trust boundary to catalog)
CREATE OR REPLACE FUNCTION public.append_settings_step_up_event(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_scope_type text,
  p_setting_key text,
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
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
  v_proof_id uuid;
  v_target_id uuid;
  v_metadata jsonb;
BEGIN
  IF p_correlation_id IS NULL
    OR p_setting_key IS NULL
    OR p_setting_key !~ v_consts.dotted_key_regex
    OR p_scope_type IS NULL
    OR p_scope_type NOT IN (
      v_consts.scope_organization,
      v_consts.scope_establishment,
      v_consts.scope_branch,
      v_consts.scope_role
    )
    OR (p_establishment_id IS NULL AND p_branch_id IS NOT NULL)
    OR (p_organization_id IS NULL AND p_establishment_id IS NOT NULL)
    OR p_outcome IS NULL
    OR p_outcome NOT IN (v_consts.outcome_allow, v_consts.outcome_deny)
    OR p_required_permissions IS NULL
    OR cardinality(p_required_permissions) <> 1
    OR p_required_permissions[1] IS DISTINCT FROM v_consts.permission_settings_sensitive_write
    OR (
      p_outcome = v_consts.outcome_allow
      AND (
        p_actor_user_id IS NULL
        OR p_organization_id IS NULL
        OR p_reason_code IS DISTINCT FROM v_consts.reason_authorized
      )
    )
    OR (p_outcome = v_consts.outcome_deny AND p_reason_code = v_consts.reason_authorized)
    OR p_reason_code IS NULL
    OR p_reason_code NOT IN (
      v_consts.reason_authorized,
      'invalid_scope', 'unauthenticated', 'identity_unverified',
      'authorization_denied', 'aal2_required', 'factor_unverified',
      'reauthentication_required', 'step_up_required'
    )
  THEN
    RAISE EXCEPTION 'Invalid settings step-up event.' USING ERRCODE = v_consts.sqlstate_22023;
  END IF;

  v_target_id := COALESCE(p_branch_id, p_establishment_id, p_organization_id);

  IF p_outcome = v_consts.outcome_allow THEN
    v_proof_id := pg_catalog.gen_random_uuid();
    v_metadata := pg_catalog.jsonb_build_object(
      v_consts.metadata_required_permissions, pg_catalog.to_jsonb(p_required_permissions),
      v_consts.metadata_setting_key, p_setting_key,
      v_consts.metadata_scope_type, p_scope_type,
      v_consts.metadata_step_up_proof_id, v_proof_id::text
    );
  ELSE
    v_metadata := pg_catalog.jsonb_build_object(
      v_consts.metadata_required_permissions, pg_catalog.to_jsonb(p_required_permissions),
      v_consts.metadata_setting_key, p_setting_key,
      v_consts.metadata_scope_type, p_scope_type
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    p_actor_user_id, p_organization_id, p_establishment_id, p_branch_id,
    v_consts.action_settings_step_up, v_consts.target_setting_value, v_target_id,
    p_outcome, p_reason_code, p_correlation_id, v_consts.source_admin_guard, v_metadata
  );

  RETURN v_proof_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_settings_step_up_event(uuid, uuid, uuid, uuid, text, text, text[], uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_settings_step_up_event(uuid, uuid, uuid, uuid, text, text, text[], uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.consume_settings_step_up_proof(
  p_proof_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_scope_type text,
  p_setting_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
  v_event public.audit_events%ROWTYPE;
  v_rows integer;
BEGIN
  IF p_proof_id IS NULL OR p_actor_user_id IS NULL OR p_actor_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT event_row.* INTO v_event
  FROM public.audit_events AS event_row
  WHERE event_row.action = v_consts.action_settings_step_up
    AND event_row.outcome = v_consts.outcome_allow
    AND event_row.actor_user_id = p_actor_user_id
    AND event_row.organization_id = p_organization_id
    AND event_row.establishment_id IS NOT DISTINCT FROM p_establishment_id
    AND event_row.branch_id IS NOT DISTINCT FROM p_branch_id
    AND event_row.metadata->>v_consts.metadata_setting_key = p_setting_key
    AND event_row.metadata->>v_consts.metadata_scope_type = p_scope_type
    AND event_row.metadata->>v_consts.metadata_step_up_proof_id = p_proof_id::text
    AND event_row.created_at >= pg_catalog.now() - interval '5 minutes'
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO private.settings_step_up_consumptions (guard_event_id, consumed_by)
  VALUES (v_event.id, p_actor_user_id)
  ON CONFLICT (guard_event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_settings_step_up_proof(uuid, uuid, uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

-- Entitlement Resolution RPC
CREATE OR REPLACE FUNCTION public.resolve_tenant_entitlements(p_organization_id uuid)
RETURNS TABLE (
  entitlement_key text,
  display_name text,
  description text,
  value_type text,
  effective_value jsonb,
  source text,
  plan_code text,
  override_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
BEGIN
  IF p_organization_id IS NULL OR NOT public.settings_can_read_organization(p_organization_id) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
  END IF;

  RETURN QUERY
  SELECT
    ent.key AS entitlement_key,
    ent.display_name,
    ent.description,
    ent.value_type,
    CASE
      WHEN ovr.id IS NOT NULL THEN ovr.value_json
      WHEN sub.status IN (v_consts.status_active, v_consts.status_trialing) AND pe.plan_id IS NOT NULL THEN pe.value_json
      ELSE ent.default_value
    END AS effective_value,
    CASE
      WHEN ovr.id IS NOT NULL THEN 'tenant_override'::text
      WHEN sub.status IN (v_consts.status_active, v_consts.status_trialing) AND pe.plan_id IS NOT NULL THEN 'plan'::text
      ELSE 'default'::text
    END AS source,
    pl.plan_code,
    ovr.reason AS override_reason
  FROM public.entitlements AS ent
  LEFT JOIN public.organization_plan_subscriptions AS sub
    ON sub.organization_id = p_organization_id
  LEFT JOIN public.plans AS pl
    ON pl.id = sub.plan_id
    AND pl.status = v_consts.status_active
  LEFT JOIN public.plan_entitlements AS pe
    ON pe.plan_id = pl.id
    AND pe.entitlement_key = ent.key
  LEFT JOIN public.tenant_entitlement_overrides AS ovr
    ON ovr.organization_id = p_organization_id
    AND ovr.entitlement_key = ent.key
    AND (ovr.expires_at IS NULL OR ovr.expires_at > pg_catalog.now())
  ORDER BY ent.key;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_tenant_entitlements(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_entitlements(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.is_higher_setting_scope_locked(
  p_setting_key text,
  p_scope_type text,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.setting_values AS sv
    WHERE sv.setting_key = p_setting_key
      AND sv.is_locked IS TRUE
      AND (
        sv.scope_type = (private.get_settings_literal_constants()).scope_platform
        OR (
          p_scope_type IN (
            (private.get_settings_literal_constants()).scope_establishment,
            (private.get_settings_literal_constants()).scope_branch,
            (private.get_settings_literal_constants()).scope_role,
            (private.get_settings_literal_constants()).scope_user
          )
          AND sv.scope_type = (private.get_settings_literal_constants()).scope_organization
          AND sv.organization_id = p_organization_id
        )
        OR (
          p_scope_type = (private.get_settings_literal_constants()).scope_branch
          AND sv.scope_type = (private.get_settings_literal_constants()).scope_establishment
          AND sv.organization_id = p_organization_id
          AND sv.establishment_id = p_establishment_id
        )
        OR (
          p_scope_type = (private.get_settings_literal_constants()).scope_user
          AND sv.scope_type = (private.get_settings_literal_constants()).scope_role
          AND sv.organization_id = p_organization_id
          AND EXISTS (
            SELECT 1
            FROM public.organization_memberships AS m
            JOIN public.membership_roles AS mr
              ON mr.organization_id = m.organization_id
              AND mr.membership_id = m.id
            WHERE m.organization_id = p_organization_id
              AND m.user_id = p_user_id
              AND m.status = (private.get_settings_literal_constants()).status_active
              AND mr.role_id = sv.role_id
          )
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION private.is_higher_setting_scope_locked(text, text, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- Settings Command RPC (authenticated only; enforces RBAC, locks, entitlements, step-up & atomic audit)
CREATE OR REPLACE FUNCTION public.settings_save_value(
  p_setting_key text,
  p_scope_type text,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_role_id uuid,
  p_value_json jsonb,
  p_is_locked boolean,
  p_step_up_proof_id uuid,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_def public.setting_definitions%ROWTYPE;
  v_old public.setting_values%ROWTYPE;
  v_has_old boolean := false;
  v_user_id uuid := NULL;
  v_requires_sensitive boolean := false;
  v_online_entitled jsonb;
  v_id uuid;
  v_version integer;
  v_reason_code text;
  v_changed_fields text[];
  v_audit_establishment_id uuid := NULL;
  v_audit_branch_id uuid := NULL;
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
  END IF;

  -- Tenant callers may never mutate platform-scope policies.
  IF p_scope_type IS NULL OR p_scope_type = v_consts.scope_platform OR p_organization_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
  END IF;

  SELECT def_row.* INTO v_def
  FROM public.setting_definitions AS def_row
  WHERE def_row.key = p_setting_key
    AND def_row.status = v_consts.status_active;
  IF NOT FOUND OR NOT (p_scope_type = ANY(v_def.allowed_scopes)) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  IF COALESCE(p_is_locked, false) AND NOT (p_scope_type = ANY(v_def.lockable_scopes)) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  IF NOT private.is_valid_setting_value(v_def.value_type, v_def.validation_rules, p_value_json) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  -- Validate exact scope shape & authorize caller
  IF p_scope_type = v_consts.scope_organization THEN
    IF p_establishment_id IS NOT NULL OR p_branch_id IS NOT NULL OR p_role_id IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
    END IF;
    IF NOT public.settings_has_permission(p_organization_id, NULL, NULL, v_consts.permission_settings_write) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
  ELSIF p_scope_type = v_consts.scope_establishment THEN
    IF p_establishment_id IS NULL OR p_branch_id IS NOT NULL OR p_role_id IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
    END IF;
    IF NOT public.settings_has_permission(p_organization_id, p_establishment_id, NULL, v_consts.permission_settings_write) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
    v_audit_establishment_id := p_establishment_id;
  ELSIF p_scope_type = v_consts.scope_branch THEN
    IF p_establishment_id IS NULL OR p_branch_id IS NULL OR p_role_id IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
    END IF;
    IF NOT public.settings_has_permission(p_organization_id, p_establishment_id, p_branch_id, v_consts.permission_settings_write) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
    v_audit_establishment_id := p_establishment_id;
    v_audit_branch_id := p_branch_id;
  ELSIF p_scope_type = v_consts.scope_role THEN
    IF p_role_id IS NULL OR p_establishment_id IS NOT NULL OR p_branch_id IS NOT NULL THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
    END IF;
    IF NOT public.settings_has_permission(p_organization_id, NULL, NULL, v_consts.permission_settings_write) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_roles AS tr
      WHERE tr.organization_id = p_organization_id AND tr.id = p_role_id
    ) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
    END IF;
  ELSIF p_scope_type = v_consts.scope_user THEN
    IF p_establishment_id IS NOT NULL OR p_branch_id IS NOT NULL OR p_role_id IS NOT NULL OR COALESCE(p_is_locked, false) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
    END IF;
    IF v_def.sensitivity <> v_consts.sensitivity_standard OR NOT public.settings_can_read_organization(p_organization_id) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
    v_user_id := v_actor_id;
  ELSE
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  -- Serialize per organization to prevent race conditions with concurrent locks
  PERFORM 1 FROM public.organizations AS org_row
  WHERE org_row.id = p_organization_id FOR UPDATE;

  IF private.is_higher_setting_scope_locked(p_setting_key, p_scope_type, p_organization_id, p_establishment_id, v_user_id) THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_policy_locked, ERRCODE = v_consts.sqlstate_42501;
  END IF;

  -- Enforce entitlement gate before enabling online ordering
  IF p_setting_key = v_consts.key_ordering_enabled AND p_value_json = pg_catalog.to_jsonb(true) THEN
    SELECT ent.effective_value INTO v_online_entitled
    FROM public.resolve_tenant_entitlements(p_organization_id) AS ent
    WHERE ent.entitlement_key = v_consts.key_online_orders_entitlement;
    IF v_online_entitled IS DISTINCT FROM pg_catalog.to_jsonb(true) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_entitlement_denied, ERRCODE = v_consts.sqlstate_42501;
    END IF;
  END IF;

  SELECT sv.* INTO v_old
  FROM public.setting_values AS sv
  WHERE sv.setting_key = p_setting_key
    AND sv.scope_type = p_scope_type
    AND COALESCE(sv.organization_id, v_consts.zero_uuid) = COALESCE(p_organization_id, v_consts.zero_uuid)
    AND COALESCE(sv.establishment_id, v_consts.zero_uuid) = COALESCE(p_establishment_id, v_consts.zero_uuid)
    AND COALESCE(sv.branch_id, v_consts.zero_uuid) = COALESCE(p_branch_id, v_consts.zero_uuid)
    AND COALESCE(sv.role_id, v_consts.zero_uuid) = COALESCE(p_role_id, v_consts.zero_uuid)
    AND COALESCE(sv.user_id, v_consts.zero_uuid) = COALESCE(v_user_id, v_consts.zero_uuid)
  FOR UPDATE;
  v_has_old := FOUND;

  v_requires_sensitive := (v_def.sensitivity = v_consts.sensitivity_sensitive)
    OR COALESCE(p_is_locked, false)
    OR (v_has_old AND v_old.is_locked IS DISTINCT FROM COALESCE(p_is_locked, false));

  IF v_requires_sensitive THEN
    IF NOT public.settings_has_permission(
      p_organization_id,
      v_audit_establishment_id,
      v_audit_branch_id,
      v_consts.permission_settings_sensitive_write
    ) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;

    IF NOT private.consume_settings_step_up_proof(
      p_step_up_proof_id,
      v_actor_id,
      p_organization_id,
      v_audit_establishment_id,
      v_audit_branch_id,
      p_scope_type,
      p_setting_key
    ) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_step_up_required, ERRCODE = v_consts.sqlstate_42501;
    END IF;
  END IF;

  IF NOT v_has_old THEN
    INSERT INTO public.setting_values (
      setting_key, scope_type, organization_id, establishment_id, branch_id, role_id, user_id,
      value_json, is_locked, version, updated_by
    ) VALUES (
      p_setting_key, p_scope_type, p_organization_id, p_establishment_id, p_branch_id, p_role_id, v_user_id,
      p_value_json, COALESCE(p_is_locked, false), 1, v_actor_id
    )
    RETURNING id, version INTO v_id, v_version;
    v_reason_code := v_consts.reason_settings_created;
    v_changed_fields := ARRAY['value_json', v_consts.metadata_is_locked]::text[];
  ELSE
    v_id := v_old.id;
    v_changed_fields := pg_catalog.array_remove(ARRAY[
      CASE WHEN v_old.value_json IS DISTINCT FROM p_value_json THEN 'value_json' END,
      CASE WHEN v_old.is_locked IS DISTINCT FROM COALESCE(p_is_locked, false) THEN v_consts.metadata_is_locked END
    ]::text[], NULL);

    IF cardinality(v_changed_fields) = 0 THEN
      RETURN pg_catalog.jsonb_build_object(
        'entity_id', v_id,
        v_consts.metadata_version, v_old.version,
        'audit_event_ids', '[]'::jsonb
      );
    END IF;

    UPDATE public.setting_values AS sv
    SET
      value_json = p_value_json,
      is_locked = COALESCE(p_is_locked, false),
      version = sv.version + 1,
      updated_by = v_actor_id
    WHERE sv.id = v_id
    RETURNING version INTO v_version;
    v_reason_code := v_consts.reason_settings_updated;
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, p_organization_id, v_audit_establishment_id, v_audit_branch_id,
    v_consts.action_settings_upserted, v_consts.target_setting_value, v_id,
    v_consts.outcome_allow, v_reason_code, p_correlation_id, v_consts.source_settings_command,
    pg_catalog.jsonb_build_object(
      v_consts.metadata_setting_key, p_setting_key,
      v_consts.metadata_scope_type, p_scope_type,
      v_consts.metadata_is_locked, COALESCE(p_is_locked, false),
      v_consts.metadata_version, v_version,
      v_consts.metadata_changed_fields, pg_catalog.to_jsonb(v_changed_fields)
    )
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    'entity_id', v_id,
    v_consts.metadata_version, v_version,
    'audit_event_ids', pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.settings_save_value(text, text, uuid, uuid, uuid, uuid, jsonb, boolean, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.settings_save_value(text, text, uuid, uuid, uuid, uuid, jsonb, boolean, uuid, uuid)
  TO authenticated;

-- Effective Hierarchy Resolver RPC (Platform -> Organization -> Establishment -> Branch -> Role -> User -> Device/Session)
CREATE OR REPLACE FUNCTION public.resolve_effective_settings(
  p_organization_id uuid,
  p_establishment_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_device_overrides jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  setting_key text,
  display_name text,
  value_type text,
  sensitivity text,
  effective_value jsonb,
  effective_source text,
  locked_by_scope text,
  version integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_consts private.settings_literal_constants := private.get_settings_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_def public.setting_definitions%ROWTYPE;
  v_plat public.setting_values%ROWTYPE;
  v_org public.setting_values%ROWTYPE;
  v_est public.setting_values%ROWTYPE;
  v_br public.setting_values%ROWTYPE;
  v_role public.setting_values%ROWTYPE;
  v_usr public.setting_values%ROWTYPE;
  v_eff_val jsonb;
  v_eff_src text;
  v_lock_scope text;
  v_ver integer;
  v_dev_val jsonb;
BEGIN
  IF v_actor_id IS NULL OR p_organization_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
  END IF;

  IF (p_branch_id IS NOT NULL AND p_establishment_id IS NULL)
    OR (p_device_overrides IS NOT NULL AND pg_catalog.jsonb_typeof(p_device_overrides) <> v_consts.json_type_object)
  THEN
    RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_input_invalid, ERRCODE = v_consts.sqlstate_22023;
  END IF;

  IF p_branch_id IS NOT NULL THEN
    IF NOT public.settings_has_permission(p_organization_id, p_establishment_id, p_branch_id, v_consts.permission_settings_read) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
  ELSIF p_establishment_id IS NOT NULL THEN
    IF NOT public.settings_can_read_establishment(p_organization_id, p_establishment_id) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
  ELSE
    IF NOT public.settings_can_read_organization(p_organization_id) THEN
      RAISE EXCEPTION USING MESSAGE = v_consts.msg_settings_auth_unavailable, ERRCODE = v_consts.sqlstate_42501;
    END IF;
  END IF;

  FOR v_def IN
    SELECT def_row.*
    FROM public.setting_definitions AS def_row
    WHERE def_row.status = v_consts.status_active
    ORDER BY def_row.key
  LOOP
    v_eff_val := v_def.default_value;
    v_eff_src := 'default';
    v_lock_scope := NULL;
    v_ver := 0;

    -- 1. Platform
    SELECT sv.* INTO v_plat
    FROM public.setting_values AS sv
    WHERE sv.setting_key = v_def.key AND sv.scope_type = v_consts.scope_platform;
    IF FOUND THEN
      v_eff_val := v_plat.value_json;
      v_eff_src := v_consts.scope_platform;
      v_ver := v_plat.version;
      IF v_plat.is_locked THEN v_lock_scope := v_consts.scope_platform; END IF;
    END IF;

    -- 2. Organization
    IF v_lock_scope IS NULL THEN
      SELECT sv.* INTO v_org
      FROM public.setting_values AS sv
      WHERE sv.setting_key = v_def.key
        AND sv.scope_type = v_consts.scope_organization
        AND sv.organization_id = p_organization_id;
      IF FOUND THEN
        v_eff_val := v_org.value_json;
        v_eff_src := v_consts.scope_organization;
        v_ver := v_org.version;
        IF v_org.is_locked THEN v_lock_scope := v_consts.scope_organization; END IF;
      END IF;
    END IF;

    -- 3. Establishment
    IF v_lock_scope IS NULL AND p_establishment_id IS NOT NULL THEN
      SELECT sv.* INTO v_est
      FROM public.setting_values AS sv
      WHERE sv.setting_key = v_def.key
        AND sv.scope_type = v_consts.scope_establishment
        AND sv.organization_id = p_organization_id
        AND sv.establishment_id = p_establishment_id;
      IF FOUND THEN
        v_eff_val := v_est.value_json;
        v_eff_src := v_consts.scope_establishment;
        v_ver := v_est.version;
        IF v_est.is_locked THEN v_lock_scope := v_consts.scope_establishment; END IF;
      END IF;
    END IF;

    -- 4. Branch
    IF v_lock_scope IS NULL AND p_branch_id IS NOT NULL THEN
      SELECT sv.* INTO v_br
      FROM public.setting_values AS sv
      WHERE sv.setting_key = v_def.key
        AND sv.scope_type = v_consts.scope_branch
        AND sv.organization_id = p_organization_id
        AND sv.establishment_id = p_establishment_id
        AND sv.branch_id = p_branch_id;
      IF FOUND THEN
        v_eff_val := v_br.value_json;
        v_eff_src := v_consts.scope_branch;
        v_ver := v_br.version;
      END IF;
    END IF;

    -- 5. Role (deterministic precedence: locked role first, then role_key lexical)
    IF v_lock_scope IS NULL AND (v_consts.scope_role = ANY(v_def.allowed_scopes)) THEN
      SELECT sv.* INTO v_role
      FROM public.setting_values AS sv
      JOIN public.tenant_roles AS tr
        ON tr.organization_id = sv.organization_id AND tr.id = sv.role_id
      JOIN public.membership_roles AS mr
        ON mr.organization_id = tr.organization_id AND mr.role_id = tr.id
      JOIN public.organization_memberships AS m
        ON m.organization_id = mr.organization_id AND m.id = mr.membership_id
      WHERE sv.setting_key = v_def.key
        AND sv.scope_type = v_consts.scope_role
        AND sv.organization_id = p_organization_id
        AND m.user_id = v_actor_id
        AND m.status = v_consts.status_active
      ORDER BY sv.is_locked DESC, tr.role_key ASC
      LIMIT 1;
      IF FOUND THEN
        v_eff_val := v_role.value_json;
        v_eff_src := v_consts.scope_role;
        v_ver := v_role.version;
        IF v_role.is_locked THEN v_lock_scope := v_consts.scope_role; END IF;
      END IF;
    END IF;

    -- 6. User
    IF v_lock_scope IS NULL AND (v_consts.scope_user = ANY(v_def.allowed_scopes)) THEN
      SELECT sv.* INTO v_usr
      FROM public.setting_values AS sv
      WHERE sv.setting_key = v_def.key
        AND sv.scope_type = v_consts.scope_user
        AND sv.organization_id = p_organization_id
        AND sv.user_id = v_actor_id;
      IF FOUND THEN
        v_eff_val := v_usr.value_json;
        v_eff_src := v_consts.scope_user;
        v_ver := v_usr.version;
      END IF;
    END IF;

    -- 7. Device / Session ephemeral override
    IF v_lock_scope IS NULL
      AND (v_consts.scope_device_session = ANY(v_def.allowed_scopes))
      AND COALESCE(p_device_overrides, '{}'::jsonb) ? v_def.key
    THEN
      v_dev_val := p_device_overrides->v_def.key;
      IF private.is_valid_setting_value(v_def.value_type, v_def.validation_rules, v_dev_val) THEN
        v_eff_val := v_dev_val;
        v_eff_src := v_consts.scope_device_session;
      END IF;
    END IF;

    setting_key := v_def.key;
    display_name := v_def.display_name;
    value_type := v_def.value_type;
    sensitivity := v_def.sensitivity;
    effective_value := v_eff_val;
    effective_source := v_eff_src;
    locked_by_scope := v_lock_scope;
    version := v_ver;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_effective_settings(uuid, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_effective_settings(uuid, uuid, uuid, jsonb)
  TO authenticated;
