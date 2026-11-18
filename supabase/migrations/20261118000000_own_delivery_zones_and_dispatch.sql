CREATE TYPE private.delivery_literal_constants AS (
  perm_delivery_read text,
  perm_delivery_write text,
  perm_delivery_zone_write text,
  status_active text,
  status_archived text,
  currency_brl text,
  actor_staff text,
  actor_customer text,
  role_owner text,
  role_admin text,
  st_preparing text,
  st_ready_dispatch text,
  st_assigned text,
  st_out_for_delivery text,
  st_delivered text,
  st_cancelled text,
  action_delivery_step_up text,
  action_zone_upserted text,
  action_dispatch_transitioned text,
  target_delivery_zone text,
  target_delivery text,
  source_admin_guard text,
  source_delivery_command text,
  outcome_allow text,
  outcome_deny text,
  reason_authorized text,
  reason_zone_created text,
  reason_zone_updated text,
  reason_zone_archived text,
  reason_dispatch_transitioned text,
  reason_dispatch_cancelled text,
  meta_required_permissions text,
  meta_step_up_proof_id text,
  meta_zone_name text,
  meta_delivery_fee text,
  meta_minimum_order text,
  meta_version text,
  meta_order_id text,
  meta_from_status text,
  meta_to_status text,
  meta_courier_label text,
  key_zone_id text,
  key_delivery_id text,
  key_audit_event_ids text,
  sync_guc_key text,
  sync_guc_on text,
  json_object text,
  json_array text,
  json_string text,
  json_number text,
  uuid_regex text,
  sqlstate_22023 text,
  sqlstate_42501 text,
  msg_delivery_auth_unavailable text,
  msg_delivery_input_invalid text,
  msg_delivery_entitlement_denied text,
  msg_delivery_step_up_required text,
  msg_delivery_zone_unavailable text,
  msg_delivery_outside_zone text,
  msg_delivery_below_minimum text,
  msg_delivery_invalid_transition text
);

CREATE FUNCTION private.get_delivery_literal_constants()
RETURNS private.delivery_literal_constants
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT ROW(
    'delivery.read'::text,
    'delivery.write'::text,
    'delivery.zone.write'::text,
    'active'::text,
    'archived'::text,
    'BRL'::text,
    'staff'::text,
    'customer_checkout'::text,
    'owner'::text,
    'admin'::text,
    'preparing'::text,
    'ready_for_dispatch'::text,
    'assigned'::text,
    'out_for_delivery'::text,
    'delivered'::text,
    'cancelled'::text,
    'delivery.privileged.step_up'::text,
    'delivery.zone.upserted'::text,
    'delivery.dispatch.transitioned'::text,
    'delivery_zone'::text,
    'delivery'::text,
    'admin_guard'::text,
    'delivery_command'::text,
    'allow'::text,
    'deny'::text,
    'authorized'::text,
    'delivery_zone_created'::text,
    'delivery_zone_updated'::text,
    'delivery_zone_archived'::text,
    'delivery_dispatch_transitioned'::text,
    'delivery_dispatch_cancelled'::text,
    'required_permissions'::text,
    'step_up_proof_id'::text,
    'zone_name'::text,
    'delivery_fee_amount'::text,
    'minimum_order_amount'::text,
    'version'::text,
    'order_id'::text,
    'from_status'::text,
    'to_status'::text,
    'courier_label'::text,
    'zone_id'::text,
    'delivery_id'::text,
    'audit_event_ids'::text,
    'goodz.syncing_delivery'::text,
    '1'::text,
    'object'::text,
    'array'::text,
    'string'::text,
    'number'::text,
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text,
    '22023'::text,
    '42501'::text,
    'Delivery authorization is unavailable.'::text,
    'Delivery input is invalid.'::text,
    'Own delivery entitlement is not active for this organization.'::text,
    'Delivery step-up verification is required.'::text,
    'Selected delivery zone is unavailable for this branch.'::text,
    'Address neighborhood is outside configured delivery zones.'::text,
    'Order subtotal does not meet the delivery zone minimum order amount.'::text,
    'Requested delivery dispatch transition is invalid.'::text
  )::private.delivery_literal_constants;
$function$;

REVOKE ALL ON TYPE private.delivery_literal_constants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_delivery_literal_constants() FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON TYPE private.delivery_literal_constants TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_delivery_literal_constants() TO authenticated;

-- RBAC Permissions for Own Delivery Zones & Dispatch (GMZ-M12)
INSERT INTO public.permissions (permission_key, display_name)
VALUES
  ((private.get_delivery_literal_constants()).perm_delivery_read, 'Read branch delivery zones and dispatch queue'),
  ((private.get_delivery_literal_constants()).perm_delivery_write, 'Advance operational own-delivery dispatch lifecycle'),
  ((private.get_delivery_literal_constants()).perm_delivery_zone_write, 'Configure branch delivery zones, fees and minimum order')
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_delivery_role_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_perm text;
  v_c private.delivery_literal_constants := private.get_delivery_literal_constants();
BEGIN
  IF NEW.role_key IN (v_c.role_owner, v_c.role_admin) THEN
    FOREACH v_perm IN ARRAY ARRAY[
      v_c.perm_delivery_read, v_c.perm_delivery_write, v_c.perm_delivery_zone_write
    ] LOOP
      INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
      VALUES (NEW.organization_id, NEW.id, v_perm)
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF NEW.role_key = v_c.actor_staff THEN
    FOREACH v_perm IN ARRAY ARRAY[
      v_c.perm_delivery_read, v_c.perm_delivery_write
    ] LOOP
      INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
      VALUES (NEW.organization_id, NEW.id, v_perm)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_delivery_role_permissions() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER tenant_roles_seed_delivery_permissions
AFTER INSERT ON public.tenant_roles
FOR EACH ROW
EXECUTE FUNCTION private.seed_delivery_role_permissions();

WITH c AS (SELECT (private.get_delivery_literal_constants()).*)
INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, perm.permission_key
FROM public.tenant_roles AS role
CROSS JOIN c
CROSS JOIN LATERAL unnest(
  CASE
    WHEN role.role_key IN (c.role_owner, c.role_admin) THEN ARRAY[
      c.perm_delivery_read, c.perm_delivery_write, c.perm_delivery_zone_write
    ]::text[]
    WHEN role.role_key = c.actor_staff THEN ARRAY[
      c.perm_delivery_read, c.perm_delivery_write
    ]::text[]
    ELSE ARRAY[]::text[]
  END
) AS perm(permission_key)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.delivery_has_permission(
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
      (private.get_delivery_literal_constants()).perm_delivery_read,
      (private.get_delivery_literal_constants()).perm_delivery_write,
      (private.get_delivery_literal_constants()).perm_delivery_zone_write
    )
    AND p_organization_id IS NOT NULL
    AND p_establishment_id IS NOT NULL
    AND p_branch_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.branches AS br_row
      JOIN public.establishments AS est_row
        ON est_row.organization_id = br_row.organization_id AND est_row.id = br_row.establishment_id
      JOIN public.organizations AS org_row
        ON org_row.id = br_row.organization_id
      WHERE br_row.organization_id = p_organization_id
        AND br_row.establishment_id = p_establishment_id
        AND br_row.id = p_branch_id
        AND br_row.status = (private.get_delivery_literal_constants()).status_active
        AND est_row.status = (private.get_delivery_literal_constants()).status_active
        AND org_row.status = (private.get_delivery_literal_constants()).status_active
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
        AND m.status = (private.get_delivery_literal_constants()).status_active
        AND rp.permission_key = p_permission_key
        AND (
          mr.scope_type = (private.get_settings_literal_constants()).scope_organization
          OR (
            mr.scope_type = (private.get_settings_literal_constants()).scope_establishment
            AND mr.establishment_id = p_establishment_id
          )
          OR (
            mr.scope_type = (private.get_settings_literal_constants()).scope_branch
            AND mr.establishment_id = p_establishment_id
            AND mr.branch_id = p_branch_id
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.delivery_has_permission(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delivery_has_permission(uuid, uuid, uuid, text)
  TO authenticated;

-- Internal boolean entitlement helper (safe for branch staff & Phase 6 Storefront RPCs)
CREATE OR REPLACE FUNCTION private.organization_has_boolean_entitlement(
  p_organization_id uuid,
  p_entitlement_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE((
    SELECT (
      CASE
        WHEN ovr.id IS NOT NULL THEN ovr.value_json
        WHEN sub.status IN (
          (private.get_settings_literal_constants()).status_active,
          (private.get_settings_literal_constants()).status_trialing
        ) AND pe.plan_id IS NOT NULL THEN pe.value_json
        ELSE ent.default_value
      END
    ) = pg_catalog.to_jsonb(true)
    FROM public.entitlements AS ent
    LEFT JOIN public.organization_plan_subscriptions AS sub
      ON sub.organization_id = p_organization_id
    LEFT JOIN public.plans AS pl
      ON pl.id = sub.plan_id
      AND pl.status = (private.get_settings_literal_constants()).status_active
    LEFT JOIN public.plan_entitlements AS pe
      ON pe.plan_id = pl.id
      AND pe.entitlement_key = ent.key
    LEFT JOIN public.tenant_entitlement_overrides AS ovr
      ON ovr.organization_id = p_organization_id
      AND ovr.entitlement_key = ent.key
      AND (ovr.expires_at IS NULL OR ovr.expires_at > pg_catalog.now())
    WHERE ent.key = p_entitlement_key
  ), false);
$function$;

REVOKE ALL ON FUNCTION private.organization_has_boolean_entitlement(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

-- Canonical Delivery Zones & Dispatch Tables (GMZ-REQ-DEL-001..003)
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  name text NOT NULL,
  neighborhoods text[] NOT NULL,
  currency text NOT NULL DEFAULT (private.get_delivery_literal_constants()).currency_brl,
  delivery_fee_amount numeric(12, 2) NOT NULL,
  minimum_order_amount numeric(12, 2) NOT NULL DEFAULT 0,
  estimated_delivery_minutes integer NOT NULL DEFAULT 45,
  status text NOT NULL DEFAULT (private.get_delivery_literal_constants()).status_active,
  version integer NOT NULL DEFAULT 1,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT delivery_zones_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT delivery_zones_branch_id_id_key UNIQUE (organization_id, branch_id, id),
  CONSTRAINT delivery_zones_branch_scope_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id) ON DELETE RESTRICT,
  CONSTRAINT delivery_zones_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT delivery_zones_name_check
    CHECK (private.catalog_has_non_whitespace(name) AND pg_catalog.char_length(name) <= 120),
  CONSTRAINT delivery_zones_neighborhoods_check
    CHECK (cardinality(neighborhoods) BETWEEN 1 AND 50),
  CONSTRAINT delivery_zones_currency_check
    CHECK (currency = (private.get_delivery_literal_constants()).currency_brl),
  CONSTRAINT delivery_zones_fee_check
    CHECK (delivery_fee_amount >= 0 AND delivery_fee_amount <= 500),
  CONSTRAINT delivery_zones_minimum_order_check
    CHECK (minimum_order_amount >= 0 AND minimum_order_amount <= 10000),
  CONSTRAINT delivery_zones_estimated_minutes_check
    CHECK (estimated_delivery_minutes BETWEEN 5 AND 240),
  CONSTRAINT delivery_zones_status_check
    CHECK (status IN (
      (private.get_delivery_literal_constants()).status_active,
      (private.get_delivery_literal_constants()).status_archived
    )),
  CONSTRAINT delivery_zones_version_check
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX delivery_zones_branch_active_name_idx
  ON public.delivery_zones (organization_id, branch_id, pg_catalog.lower(name))
  WHERE status = 'active';

CREATE INDEX delivery_zones_branch_status_idx
  ON public.delivery_zones (organization_id, branch_id, status, name ASC);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_zone_tenant_fkey
  FOREIGN KEY (organization_id, delivery_zone_id)
  REFERENCES public.delivery_zones (organization_id, id) ON DELETE RESTRICT;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_pickup_zone_null_check
  CHECK (
    fulfillment_mode <> (private.get_orders_literal_constants()).mode_pickup
    OR delivery_zone_id IS NULL
  );

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  order_id uuid NOT NULL,
  delivery_zone_id uuid,
  zone_name_snapshot text NOT NULL DEFAULT '',
  status text NOT NULL,
  courier_label text NOT NULL DEFAULT '',
  courier_user_id uuid,
  route_reference text NOT NULL DEFAULT '',
  tracking_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT (private.get_delivery_literal_constants()).currency_brl,
  delivery_fee_snapshot numeric(12, 2) NOT NULL,
  minimum_order_snapshot numeric(12, 2) NOT NULL DEFAULT 0,
  estimated_delivery_minutes integer NOT NULL DEFAULT 45,
  assigned_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT deliveries_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT deliveries_order_unique UNIQUE (organization_id, order_id),
  CONSTRAINT deliveries_branch_scope_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id) ON DELETE RESTRICT,
  CONSTRAINT deliveries_order_tenant_fkey
    FOREIGN KEY (organization_id, order_id)
    REFERENCES public.orders (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT deliveries_zone_tenant_fkey
    FOREIGN KEY (organization_id, delivery_zone_id)
    REFERENCES public.delivery_zones (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT deliveries_courier_user_fkey
    FOREIGN KEY (courier_user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT deliveries_status_check
    CHECK (status IN (
      (private.get_delivery_literal_constants()).st_preparing,
      (private.get_delivery_literal_constants()).st_ready_dispatch,
      (private.get_delivery_literal_constants()).st_assigned,
      (private.get_delivery_literal_constants()).st_out_for_delivery,
      (private.get_delivery_literal_constants()).st_delivered,
      (private.get_delivery_literal_constants()).st_cancelled
    )),
  CONSTRAINT deliveries_zone_name_snapshot_check
    CHECK (pg_catalog.char_length(zone_name_snapshot) <= 120),
  CONSTRAINT deliveries_courier_label_check
    CHECK (pg_catalog.char_length(courier_label) <= 120),
  CONSTRAINT deliveries_route_ref_check
    CHECK (pg_catalog.char_length(route_reference) <= 120),
  CONSTRAINT deliveries_tracking_metadata_check
    CHECK (
      pg_catalog.jsonb_typeof(tracking_metadata) = (private.get_delivery_literal_constants()).json_object
      AND pg_catalog.octet_length(tracking_metadata::text) <= 2048
    ),
  CONSTRAINT deliveries_currency_check
    CHECK (currency = (private.get_delivery_literal_constants()).currency_brl),
  CONSTRAINT deliveries_snapshots_check
    CHECK (delivery_fee_snapshot >= 0 AND minimum_order_snapshot >= 0),
  CONSTRAINT deliveries_estimated_minutes_check
    CHECK (estimated_delivery_minutes BETWEEN 5 AND 240),
  CONSTRAINT deliveries_cancellation_reason_check
    CHECK (
      (status = (private.get_delivery_literal_constants()).st_cancelled) = (
        cancellation_reason IS NOT NULL
        AND private.catalog_has_non_whitespace(cancellation_reason)
        AND pg_catalog.char_length(cancellation_reason) BETWEEN 3 AND 500
      )
    )
);

CREATE INDEX deliveries_branch_queue_idx
  ON public.deliveries (organization_id, branch_id, status, created_at DESC);

CREATE TABLE public.delivery_status_transitions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  delivery_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  courier_label text NOT NULL DEFAULT '',
  actor_user_id uuid,
  actor_kind text NOT NULL,
  reason text NOT NULL DEFAULT '',
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT delivery_status_transitions_delivery_fkey
    FOREIGN KEY (organization_id, delivery_id)
    REFERENCES public.deliveries (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT delivery_status_transitions_actor_fkey
    FOREIGN KEY (actor_user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT delivery_status_transitions_actor_kind_check
    CHECK (actor_kind IN (
      (private.get_delivery_literal_constants()).actor_staff,
      (private.get_delivery_literal_constants()).actor_customer
    )),
  CONSTRAINT delivery_status_transitions_courier_check
    CHECK (pg_catalog.char_length(courier_label) <= 120),
  CONSTRAINT delivery_status_transitions_reason_check
    CHECK (pg_catalog.char_length(reason) <= 500)
);

CREATE INDEX delivery_status_transitions_delivery_idx
  ON public.delivery_status_transitions (organization_id, delivery_id, created_at ASC);

CREATE TRIGGER delivery_status_transitions_immutable
BEFORE UPDATE OR DELETE ON public.delivery_status_transitions
FOR EACH ROW EXECUTE FUNCTION private.reject_order_ledger_mutation();

-- Audit & Admin Guard Step-Up Extension for Delivery Zones & Dispatch
CREATE TABLE private.delivery_step_up_consumptions (
  guard_event_id uuid PRIMARY KEY REFERENCES public.audit_events (id) ON DELETE RESTRICT,
  consumed_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  consumed_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

REVOKE ALL PRIVILEGES ON TABLE private.delivery_step_up_consumptions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_valid_delivery_audit_metadata(
  p_action text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_c private.delivery_literal_constants := private.get_delivery_literal_constants();
  v_proof text;
BEGIN
  IF p_metadata IS NULL OR pg_catalog.jsonb_typeof(p_metadata) <> v_c.json_object THEN
    RETURN false;
  END IF;

  IF p_action = v_c.action_delivery_step_up THEN
    IF NOT (p_metadata ? v_c.meta_required_permissions)
      OR pg_catalog.jsonb_typeof(p_metadata->v_c.meta_required_permissions) <> v_c.json_array
      OR pg_catalog.jsonb_array_length(p_metadata->v_c.meta_required_permissions) <> 1
      OR (p_metadata->v_c.meta_required_permissions->>0) IS DISTINCT FROM v_c.perm_delivery_zone_write
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

  IF p_action = v_c.action_zone_upserted THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_zone_name
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_zone_name) = v_c.json_string
      AND p_metadata ? v_c.meta_delivery_fee
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_delivery_fee) = v_c.json_string
      AND p_metadata ? v_c.meta_minimum_order
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_minimum_order) = v_c.json_string
      AND p_metadata ? v_c.meta_version
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_version) = v_c.json_number
      AND (p_metadata - ARRAY[
        v_c.meta_zone_name, v_c.meta_delivery_fee, v_c.meta_minimum_order, v_c.meta_version
      ]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  IF p_action = v_c.action_dispatch_transitioned THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_order_id
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_order_id) = v_c.json_string
      AND p_metadata ? v_c.meta_from_status
      AND p_metadata ? v_c.meta_to_status
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_to_status) = v_c.json_string
      AND (p_metadata - ARRAY[
        v_c.meta_order_id, v_c.meta_from_status, v_c.meta_to_status, v_c.meta_courier_label
      ]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION private.is_valid_delivery_audit_metadata(text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admitted_delivery_audit_shape(
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
    p_action = (private.get_delivery_literal_constants()).action_delivery_step_up
    AND p_target_type = (private.get_delivery_literal_constants()).target_delivery_zone
    AND p_source = (private.get_delivery_literal_constants()).source_admin_guard
  )
  OR (
    p_action = (private.get_delivery_literal_constants()).action_zone_upserted
    AND p_target_type = (private.get_delivery_literal_constants()).target_delivery_zone
    AND p_source = (private.get_delivery_literal_constants()).source_delivery_command
  )
  OR (
    p_action = (private.get_delivery_literal_constants()).action_dispatch_transitioned
    AND p_target_type = (private.get_delivery_literal_constants()).target_delivery
    AND p_source = (private.get_delivery_literal_constants()).source_delivery_command
  );
$function$;

REVOKE ALL ON FUNCTION private.is_admitted_delivery_audit_shape(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

-- Extend audit_events CHECK constraints to admit delivery.* actions cleanly
ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (
  action IN (
    (private.get_delivery_literal_constants()).action_delivery_step_up,
    (private.get_delivery_literal_constants()).action_zone_upserted,
    (private.get_delivery_literal_constants()).action_dispatch_transitioned,
    (private.get_orders_literal_constants()).action_orders_step_up,
    (private.get_orders_literal_constants()).action_order_placed,
    (private.get_orders_literal_constants()).action_order_transitioned,
    (private.get_orders_literal_constants()).action_order_cancelled,
    (private.get_orders_literal_constants()).action_handoff_recorded,
    (private.get_settings_literal_constants()).action_settings_step_up,
    (private.get_settings_literal_constants()).action_settings_upserted,
    (private.get_catalog_literal_constants()).proof_source,
    (private.get_catalog_literal_constants()).action_catalog_privileged_step_up
  )
  OR action ~ '^catalog\.(category|product|variant|channel)\.(created|updated|archived)$'
  OR action ~ '^catalog\.offer\.(created|updated|archived|commercial_created|commercial_updated)$'
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_type_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_type_check CHECK (
  target_type IN (
    (private.get_delivery_literal_constants()).target_delivery_zone,
    (private.get_delivery_literal_constants()).target_delivery,
    (private.get_orders_literal_constants()).target_order,
    (private.get_settings_literal_constants()).target_setting_value,
    (private.get_catalog_literal_constants()).scope_branch,
    (private.get_catalog_literal_constants()).target_product,
    (private.get_catalog_literal_constants()).target_channel_offer,
    'product_category',
    'product_variant',
    'sales_channel'
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_reason_code_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_reason_code_check CHECK (
  reason_code IN (
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
    (private.get_delivery_literal_constants()).source_delivery_command,
    (private.get_orders_literal_constants()).source_orders_command,
    (private.get_settings_literal_constants()).source_settings_command,
    (private.get_catalog_literal_constants()).source_catalog_command,
    (private.get_catalog_literal_constants()).source_admin_guard
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_metadata_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_metadata_check CHECK (
  pg_catalog.jsonb_typeof(metadata) = (private.get_delivery_literal_constants()).json_object
  AND pg_catalog.octet_length(metadata::text) <= 1024
  AND (
    (action LIKE 'delivery.%' AND private.is_valid_delivery_audit_metadata(action, metadata) IS TRUE)
    OR ((action LIKE 'order.%' OR action = (private.get_orders_literal_constants()).action_orders_step_up)
      AND private.is_valid_orders_audit_metadata(action, metadata) IS TRUE)
    OR (action LIKE 'settings.%' AND private.is_valid_settings_audit_metadata(action, metadata) IS TRUE)
    OR (action LIKE 'catalog.%' AND private.is_valid_catalog_audit_metadata(action, metadata) IS TRUE)
    OR (action = (private.get_catalog_literal_constants()).proof_source
      AND metadata = '{"required_permission":"tenant.hierarchy.read"}'::jsonb)
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_action_shape_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_action_shape_check CHECK (
  private.is_admitted_audit_shape(action, target_type, source) IS TRUE
  OR private.is_admitted_delivery_audit_shape(action, target_type, source) IS TRUE
);

-- RLS & Least Privilege on Delivery Zones, Deliveries & Status Transitions
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status_transitions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.delivery_zones,
  public.deliveries,
  public.delivery_status_transitions
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.delivery_zones,
  public.deliveries,
  public.delivery_status_transitions
TO authenticated;

CREATE POLICY delivery_zones_branch_select ON public.delivery_zones
FOR SELECT TO authenticated
USING (
  (SELECT public.delivery_has_permission(
    organization_id, establishment_id, branch_id,
    (private.get_delivery_literal_constants()).perm_delivery_read
  ))
  OR (SELECT public.orders_has_permission(
    organization_id, establishment_id, branch_id,
    (private.get_orders_literal_constants()).perm_orders_read
  ))
);

CREATE POLICY deliveries_branch_select ON public.deliveries
FOR SELECT TO authenticated
USING ((SELECT public.delivery_has_permission(
  organization_id, establishment_id, branch_id,
  (private.get_delivery_literal_constants()).perm_delivery_read
)));

CREATE POLICY delivery_status_transitions_branch_select ON public.delivery_status_transitions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deliveries AS del
    WHERE del.organization_id = delivery_status_transitions.organization_id
      AND del.id = delivery_status_transitions.delivery_id
      AND public.delivery_has_permission(
        del.organization_id, del.establishment_id, del.branch_id,
        (private.get_delivery_literal_constants()).perm_delivery_read
      )
  )
);

-- Step-Up Proof RPC for Delivery Zone Mutations (service_role only)
CREATE OR REPLACE FUNCTION public.append_delivery_step_up_event(
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
  v_c private.delivery_literal_constants := private.get_delivery_literal_constants();
  v_proof_id uuid;
  v_metadata jsonb;
BEGIN
  IF p_correlation_id IS NULL
    OR p_target_id IS NULL
    OR (p_establishment_id IS NULL AND p_branch_id IS NOT NULL)
    OR (p_organization_id IS NULL AND p_establishment_id IS NOT NULL)
    OR p_outcome IS NULL
    OR p_outcome NOT IN (v_c.outcome_allow, v_c.outcome_deny)
    OR p_required_permissions IS NULL
    OR cardinality(p_required_permissions) <> 1
    OR p_required_permissions[1] IS DISTINCT FROM v_c.perm_delivery_zone_write
    OR (p_outcome = v_c.outcome_allow AND (
      p_actor_user_id IS NULL
      OR p_organization_id IS NULL
      OR p_branch_id IS NULL
      OR p_reason_code IS DISTINCT FROM v_c.reason_authorized
    ))
    OR (p_outcome = v_c.outcome_deny AND p_reason_code = v_c.reason_authorized)
    OR p_reason_code IS NULL
  THEN
    RAISE EXCEPTION 'Invalid delivery step-up event.' USING ERRCODE = v_c.sqlstate_22023;
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
    p_actor_user_id, p_organization_id, p_establishment_id, p_branch_id,
    v_c.action_delivery_step_up, v_c.target_delivery_zone, p_target_id,
    p_outcome, p_reason_code, p_correlation_id, v_c.source_admin_guard, v_metadata
  );

  RETURN v_proof_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_delivery_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_delivery_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.consume_delivery_step_up_proof(
  p_proof_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_target_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.delivery_literal_constants := private.get_delivery_literal_constants();
  v_event public.audit_events%ROWTYPE;
  v_rows integer;
BEGIN
  IF p_proof_id IS NULL OR p_actor_user_id IS NULL OR p_actor_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT ev.* INTO v_event
  FROM public.audit_events AS ev
  WHERE ev.action = v_c.action_delivery_step_up
    AND ev.outcome = v_c.outcome_allow
    AND ev.actor_user_id = p_actor_user_id
    AND ev.organization_id = p_organization_id
    AND ev.establishment_id = p_establishment_id
    AND ev.branch_id = p_branch_id
    AND ev.target_id = p_target_id
    AND ev.metadata->>v_c.meta_step_up_proof_id = p_proof_id::text
    AND ev.created_at >= pg_catalog.now() - interval '5 minutes'
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO private.delivery_step_up_consumptions (guard_event_id, consumed_by)
  VALUES (v_event.id, p_actor_user_id)
  ON CONFLICT (guard_event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_delivery_step_up_proof(uuid, uuid, uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- Delivery Zone Save Command RPC (authenticated; requires RBAC + delivery.own_fleet entitlement + step-up)
CREATE OR REPLACE FUNCTION public.delivery_save_zone(
  p_zone_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_name text,
  p_neighborhoods text[],
  p_delivery_fee_amount numeric,
  p_minimum_order_amount numeric,
  p_estimated_delivery_minutes integer,
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
  v_c private.delivery_literal_constants := private.get_delivery_literal_constants();
  v_sc private.settings_literal_constants := private.get_settings_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_clean_name text := pg_catalog.btrim(COALESCE(p_name, ''));
  v_clean_neighborhoods text[];
  v_old public.delivery_zones%ROWTYPE;
  v_zone_id uuid;
  v_version integer;
  v_reason_code text;
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL
    OR p_organization_id IS NULL
    OR p_establishment_id IS NULL
    OR p_branch_id IS NULL
    OR p_correlation_id IS NULL
  THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT public.delivery_has_permission(
    p_organization_id, p_establishment_id, p_branch_id, v_c.perm_delivery_zone_write
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT private.organization_has_boolean_entitlement(p_organization_id, v_sc.key_delivery_own_fleet) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_entitlement_denied, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT private.catalog_has_non_whitespace(v_clean_name)
    OR pg_catalog.char_length(v_clean_name) > 120
    OR p_neighborhoods IS NULL
    OR p_delivery_fee_amount IS NULL
    OR p_delivery_fee_amount < 0
    OR p_delivery_fee_amount > 500
    OR p_minimum_order_amount IS NULL
    OR p_minimum_order_amount < 0
    OR p_minimum_order_amount > 10000
    OR p_estimated_delivery_minutes IS NULL
    OR p_estimated_delivery_minutes NOT BETWEEN 5 AND 240
    OR p_status IS NULL
    OR p_status NOT IN (v_c.status_active, v_c.status_archived)
  THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(dedup.val ORDER BY dedup.first_idx), ARRAY[]::text[])
  INTO v_clean_neighborhoods
  FROM (
    SELECT
      MIN(raw.idx) AS first_idx,
      (pg_catalog.array_agg(pg_catalog.btrim(raw.val) ORDER BY raw.idx))[1] AS val
    FROM unnest(p_neighborhoods) WITH ORDINALITY AS raw(val, idx)
    WHERE raw.val IS NOT NULL
      AND private.catalog_has_non_whitespace(raw.val)
      AND pg_catalog.char_length(pg_catalog.btrim(raw.val)) <= 120
    GROUP BY pg_catalog.lower(pg_catalog.btrim(raw.val))
  ) AS dedup;

  IF cardinality(v_clean_neighborhoods) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  PERFORM 1 FROM public.branches AS br
  WHERE br.organization_id = p_organization_id
    AND br.establishment_id = p_establishment_id
    AND br.id = p_branch_id
    AND br.status = v_c.status_active
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT private.consume_delivery_step_up_proof(
    p_step_up_proof_id,
    v_actor_id,
    p_organization_id,
    p_establishment_id,
    p_branch_id,
    COALESCE(p_zone_id, p_branch_id)
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_step_up_required, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF p_zone_id IS NULL THEN
    IF p_status <> v_c.status_active THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_input_invalid, ERRCODE = v_c.sqlstate_22023;
    END IF;
    v_version := 1;
    v_reason_code := v_c.reason_zone_created;
    INSERT INTO public.delivery_zones (
      organization_id, establishment_id, branch_id, name, neighborhoods,
      delivery_fee_amount, minimum_order_amount, estimated_delivery_minutes,
      status, version, updated_by
    ) VALUES (
      p_organization_id, p_establishment_id, p_branch_id, v_clean_name, v_clean_neighborhoods,
      p_delivery_fee_amount, p_minimum_order_amount, p_estimated_delivery_minutes,
      p_status, v_version, v_actor_id
    ) RETURNING id INTO v_zone_id;
  ELSE
    SELECT dz.* INTO v_old
    FROM public.delivery_zones AS dz
    WHERE dz.organization_id = p_organization_id
      AND dz.establishment_id = p_establishment_id
      AND dz.branch_id = p_branch_id
      AND dz.id = p_zone_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_delivery_zone_unavailable, ERRCODE = v_c.sqlstate_22023;
    END IF;

    v_zone_id := v_old.id;
    v_version := v_old.version + 1;
    v_reason_code := CASE
      WHEN p_status = v_c.status_archived THEN v_c.reason_zone_archived
      ELSE v_c.reason_zone_updated
    END;

    UPDATE public.delivery_zones
    SET
      name = v_clean_name,
      neighborhoods = v_clean_neighborhoods,
      delivery_fee_amount = p_delivery_fee_amount,
      minimum_order_amount = p_minimum_order_amount,
      estimated_delivery_minutes = p_estimated_delivery_minutes,
      status = p_status,
      version = v_version,
      updated_by = v_actor_id,
      updated_at = pg_catalog.now()
    WHERE id = v_zone_id;
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, p_organization_id, p_establishment_id, p_branch_id,
    v_c.action_zone_upserted, v_c.target_delivery_zone, v_zone_id,
    v_c.outcome_allow, v_reason_code, p_correlation_id, v_c.source_delivery_command,
    pg_catalog.jsonb_build_object(
      v_c.meta_zone_name, v_clean_name,
      v_c.meta_delivery_fee, p_delivery_fee_amount::text,
      v_c.meta_minimum_order, p_minimum_order_amount::text,
      v_c.meta_version, v_version
    )
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_zone_id, v_zone_id,
    v_c.meta_version, v_version,
    'status', p_status,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delivery_save_zone(
  uuid, uuid, uuid, uuid, text, text[], numeric, numeric, integer, text, uuid, uuid
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delivery_save_zone(
  uuid, uuid, uuid, uuid, text, text[], numeric, numeric, integer, text, uuid, uuid
) TO authenticated;

-- Composable Order + Delivery Intake Wrapper (reuses private.create_canonical_order with zero duplication)
CREATE OR REPLACE FUNCTION private.create_order_with_delivery(
  p_actor_user_id uuid,
  p_actor_kind text,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_fulfillment_mode text,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_delivery_fee_amount numeric,
  p_declared_payment_method text,
  p_cash_change_for numeric,
  p_customer_notes text,
  p_items jsonb,
  p_idempotency_key text,
  p_correlation_id uuid,
  p_delivery_zone_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_oc private.orders_literal_constants := private.get_orders_literal_constants();
  v_dc private.delivery_literal_constants := private.get_delivery_literal_constants();
  v_sc private.settings_literal_constants := private.get_settings_literal_constants();
  v_zone public.delivery_zones%ROWTYPE;
  v_has_active_zones boolean := false;
  v_resolved_zone_id uuid := NULL;
  v_zone_name_snap text := '';
  v_effective_fee numeric(12, 2) := COALESCE(p_delivery_fee_amount, 0);
  v_min_order_snap numeric(12, 2) := 0;
  v_est_minutes integer := 45;
  v_neigh text;
  v_receipt jsonb;
  v_order_id uuid;
  v_ord public.orders%ROWTYPE;
  v_delivery_id uuid;
BEGIN
  IF p_fulfillment_mode = v_oc.mode_pickup AND p_delivery_zone_id IS NOT NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_oc.msg_orders_input_invalid, ERRCODE = v_oc.sqlstate_22023;
  END IF;

  IF p_fulfillment_mode = v_oc.mode_own_delivery THEN
    IF NOT private.organization_has_boolean_entitlement(p_organization_id, v_sc.key_delivery_own_fleet) THEN
      RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_entitlement_denied, ERRCODE = v_dc.sqlstate_42501;
    END IF;

    v_neigh := CASE
      WHEN p_delivery_address IS NOT NULL AND pg_catalog.jsonb_typeof(p_delivery_address) = v_dc.json_object
        THEN pg_catalog.btrim(COALESCE(p_delivery_address->>'neighborhood', ''))
      ELSE ''
    END;

    IF p_delivery_zone_id IS NOT NULL THEN
      SELECT dz.* INTO v_zone
      FROM public.delivery_zones AS dz
      WHERE dz.organization_id = p_organization_id
        AND dz.branch_id = p_branch_id
        AND dz.id = p_delivery_zone_id
        AND dz.status = v_dc.status_active;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_zone_unavailable, ERRCODE = v_dc.sqlstate_22023;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_zone.neighborhoods) AS zn
        WHERE pg_catalog.lower(pg_catalog.btrim(zn)) = pg_catalog.lower(v_neigh)
      ) THEN
        RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_outside_zone, ERRCODE = v_dc.sqlstate_22023;
      END IF;
      v_resolved_zone_id := v_zone.id;
      v_zone_name_snap := v_zone.name;
      v_effective_fee := v_zone.delivery_fee_amount;
      v_min_order_snap := v_zone.minimum_order_amount;
      v_est_minutes := v_zone.estimated_delivery_minutes;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.delivery_zones AS dz
        WHERE dz.organization_id = p_organization_id
          AND dz.branch_id = p_branch_id
          AND dz.status = v_dc.status_active
      ) INTO v_has_active_zones;

      IF v_has_active_zones AND private.catalog_has_non_whitespace(v_neigh) THEN
        SELECT dz.* INTO v_zone
        FROM public.delivery_zones AS dz
        WHERE dz.organization_id = p_organization_id
          AND dz.branch_id = p_branch_id
          AND dz.status = v_dc.status_active
          AND EXISTS (
            SELECT 1 FROM unnest(dz.neighborhoods) AS zn
            WHERE pg_catalog.lower(pg_catalog.btrim(zn)) = pg_catalog.lower(v_neigh)
          )
        ORDER BY dz.delivery_fee_amount ASC, dz.name ASC
        LIMIT 1;
        IF NOT FOUND THEN
          RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_outside_zone, ERRCODE = v_dc.sqlstate_22023;
        END IF;
        v_resolved_zone_id := v_zone.id;
        v_zone_name_snap := v_zone.name;
        v_effective_fee := v_zone.delivery_fee_amount;
        v_min_order_snap := v_zone.minimum_order_amount;
        v_est_minutes := v_zone.estimated_delivery_minutes;
      END IF;
    END IF;
  END IF;

  v_receipt := private.create_canonical_order(
    p_actor_user_id,
    p_actor_kind,
    p_organization_id,
    p_establishment_id,
    p_branch_id,
    p_fulfillment_mode,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    v_effective_fee,
    p_declared_payment_method,
    p_cash_change_for,
    p_customer_notes,
    p_items,
    p_idempotency_key,
    p_correlation_id
  );

  IF COALESCE((v_receipt->>'idempotent_replay')::boolean, false) IS FALSE
    AND p_fulfillment_mode = v_oc.mode_own_delivery
  THEN
    v_order_id := (v_receipt->>v_oc.key_order_id)::uuid;
    SELECT ord.* INTO v_ord FROM public.orders AS ord WHERE ord.id = v_order_id;

    IF v_ord.subtotal_amount < v_min_order_snap THEN
      RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_below_minimum, ERRCODE = v_dc.sqlstate_22023;
    END IF;

    IF v_resolved_zone_id IS NOT NULL THEN
      UPDATE public.orders SET delivery_zone_id = v_resolved_zone_id WHERE id = v_order_id;
    END IF;

    INSERT INTO public.deliveries (
      organization_id, establishment_id, branch_id, order_id, delivery_zone_id,
      zone_name_snapshot, status, delivery_fee_snapshot, minimum_order_snapshot, estimated_delivery_minutes
    ) VALUES (
      p_organization_id, p_establishment_id, p_branch_id, v_order_id, v_resolved_zone_id,
      v_zone_name_snap, v_dc.st_preparing, v_effective_fee, v_min_order_snap, v_est_minutes
    ) RETURNING id INTO v_delivery_id;

    INSERT INTO public.delivery_status_transitions (
      organization_id, delivery_id, from_status, to_status, courier_label, actor_user_id, actor_kind, reason, correlation_id
    ) VALUES (
      p_organization_id, v_delivery_id, NULL, v_dc.st_preparing, '', p_actor_user_id, p_actor_kind, '', p_correlation_id
    );
  END IF;

  RETURN v_receipt;
END;
$function$;

REVOKE ALL ON FUNCTION private.create_order_with_delivery(
  uuid, text, uuid, uuid, uuid, text, text, text, jsonb, numeric, text, numeric, text, jsonb, text, uuid, uuid
) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION public.orders_place_staff(
  uuid, uuid, uuid, text, text, text, jsonb, numeric, text, numeric, text, jsonb, text, uuid
);

CREATE OR REPLACE FUNCTION public.orders_place_staff(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_fulfillment_mode text,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_delivery_fee_amount numeric,
  p_declared_payment_method text,
  p_cash_change_for numeric,
  p_customer_notes text,
  p_items jsonb,
  p_idempotency_key text,
  p_correlation_id uuid,
  p_delivery_zone_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_oc private.orders_literal_constants := private.get_orders_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
BEGIN
  IF v_actor_id IS NULL OR NOT public.orders_has_permission(
    p_organization_id, p_establishment_id, p_branch_id, v_oc.perm_orders_write
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_oc.msg_orders_auth_unavailable, ERRCODE = v_oc.sqlstate_42501;
  END IF;

  RETURN private.create_order_with_delivery(
    v_actor_id,
    v_oc.actor_staff,
    p_organization_id,
    p_establishment_id,
    p_branch_id,
    p_fulfillment_mode,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    p_delivery_fee_amount,
    p_declared_payment_method,
    p_cash_change_for,
    p_customer_notes,
    p_items,
    p_idempotency_key,
    p_correlation_id,
    p_delivery_zone_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_place_staff(
  uuid, uuid, uuid, text, text, text, jsonb, numeric, text, numeric, text, jsonb, text, uuid, uuid
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_place_staff(
  uuid, uuid, uuid, text, text, text, jsonb, numeric, text, numeric, text, jsonb, text, uuid, uuid
) TO authenticated;

-- Trigger keeping public.deliveries synchronized when orders_transition_status advances an own_delivery order
CREATE OR REPLACE FUNCTION private.sync_delivery_on_order_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_oc private.orders_literal_constants := private.get_orders_literal_constants();
  v_dc private.delivery_literal_constants := private.get_delivery_literal_constants();
  v_del public.deliveries%ROWTYPE;
  v_target_del_status text := NULL;
BEGIN
  IF NEW.from_status IS NULL
    OR pg_catalog.current_setting(v_dc.sync_guc_key, true) = v_dc.sync_guc_on
  THEN
    RETURN NEW;
  END IF;

  SELECT del.* INTO v_del
  FROM public.deliveries AS del
  WHERE del.organization_id = NEW.organization_id AND del.order_id = NEW.order_id
  FOR UPDATE;

  IF NOT FOUND OR v_del.status IN (v_dc.st_delivered, v_dc.st_cancelled) THEN
    RETURN NEW;
  END IF;

  IF NEW.to_status = v_oc.st_ready_dispatch AND v_del.status = v_dc.st_preparing THEN
    v_target_del_status := v_dc.st_ready_dispatch;
  ELSIF NEW.to_status = v_oc.st_out_for_delivery AND v_del.status IN (v_dc.st_preparing, v_dc.st_ready_dispatch, v_dc.st_assigned) THEN
    v_target_del_status := v_dc.st_out_for_delivery;
  ELSIF NEW.to_status = v_oc.st_completed THEN
    v_target_del_status := v_dc.st_delivered;
  ELSIF NEW.to_status = v_oc.st_cancelled THEN
    v_target_del_status := v_dc.st_cancelled;
  END IF;

  IF v_target_del_status IS NOT NULL THEN
    UPDATE public.deliveries
    SET
      status = v_target_del_status,
      out_for_delivery_at = CASE WHEN v_target_del_status = v_dc.st_out_for_delivery THEN pg_catalog.now() ELSE out_for_delivery_at END,
      delivered_at = CASE WHEN v_target_del_status = v_dc.st_delivered THEN pg_catalog.now() ELSE delivered_at END,
      cancelled_at = CASE WHEN v_target_del_status = v_dc.st_cancelled THEN pg_catalog.now() ELSE cancelled_at END,
      cancellation_reason = CASE WHEN v_target_del_status = v_dc.st_cancelled THEN NEW.reason ELSE cancellation_reason END,
      updated_at = pg_catalog.now()
    WHERE id = v_del.id;

    INSERT INTO public.delivery_status_transitions (
      organization_id, delivery_id, from_status, to_status, courier_label,
      actor_user_id, actor_kind, reason, correlation_id
    ) VALUES (
      NEW.organization_id, v_del.id, v_del.status, v_target_del_status, v_del.courier_label,
      NEW.actor_user_id, NEW.actor_kind, NEW.reason, NEW.correlation_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.sync_delivery_on_order_transition()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER order_status_transitions_sync_delivery
AFTER INSERT ON public.order_status_transitions
FOR EACH ROW EXECUTE FUNCTION private.sync_delivery_on_order_transition();

-- Dedicated Own-Delivery Dispatch Command RPC (GMZ-REQ-DEL-002)
CREATE OR REPLACE FUNCTION private.is_valid_delivery_dispatch_transition(
  p_from_status text,
  p_to_status text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT (
    p_from_status = (private.get_delivery_literal_constants()).st_preparing
    AND p_to_status = (private.get_delivery_literal_constants()).st_ready_dispatch
  )
  OR (
    p_from_status = (private.get_delivery_literal_constants()).st_ready_dispatch
    AND p_to_status IN (
      (private.get_delivery_literal_constants()).st_assigned,
      (private.get_delivery_literal_constants()).st_out_for_delivery
    )
  )
  OR (
    p_from_status = (private.get_delivery_literal_constants()).st_assigned
    AND p_to_status = (private.get_delivery_literal_constants()).st_out_for_delivery
  )
  OR (
    p_from_status = (private.get_delivery_literal_constants()).st_out_for_delivery
    AND p_to_status = (private.get_delivery_literal_constants()).st_delivered
  );
$function$;

REVOKE ALL ON FUNCTION private.is_valid_delivery_dispatch_transition(text, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delivery_advance_dispatch(
  p_delivery_id uuid,
  p_to_status text,
  p_courier_label text,
  p_reason text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_dc private.delivery_literal_constants := private.get_delivery_literal_constants();
  v_oc private.orders_literal_constants := private.get_orders_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_del public.deliveries%ROWTYPE;
  v_ord public.orders%ROWTYPE;
  v_is_cancel boolean;
  v_clean_courier text := pg_catalog.btrim(COALESCE(p_courier_label, ''));
  v_clean_reason text := pg_catalog.btrim(COALESCE(p_reason, ''));
  v_next_courier text;
  v_target_order_status text := NULL;
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_delivery_id IS NULL OR p_to_status IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_auth_unavailable, ERRCODE = v_dc.sqlstate_42501;
  END IF;

  SELECT del.* INTO v_del
  FROM public.deliveries AS del
  WHERE del.id = p_delivery_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_auth_unavailable, ERRCODE = v_dc.sqlstate_42501;
  END IF;

  SELECT ord.* INTO v_ord
  FROM public.orders AS ord
  WHERE ord.organization_id = v_del.organization_id AND ord.id = v_del.order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_auth_unavailable, ERRCODE = v_dc.sqlstate_42501;
  END IF;

  v_is_cancel := (p_to_status = v_dc.st_cancelled);

  IF NOT public.delivery_has_permission(
    v_del.organization_id, v_del.establishment_id, v_del.branch_id, v_dc.perm_delivery_write
  ) OR (
    v_is_cancel AND NOT public.orders_has_permission(
      v_del.organization_id, v_del.establishment_id, v_del.branch_id, v_oc.perm_orders_cancel
    )
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_auth_unavailable, ERRCODE = v_dc.sqlstate_42501;
  END IF;

  IF v_del.status IN (v_dc.st_delivered, v_dc.st_cancelled) THEN
    RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_invalid_transition, ERRCODE = v_dc.sqlstate_22023;
  END IF;

  IF pg_catalog.char_length(v_clean_courier) > 120 OR pg_catalog.char_length(v_clean_reason) > 500 THEN
    RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_input_invalid, ERRCODE = v_dc.sqlstate_22023;
  END IF;

  v_next_courier := CASE
    WHEN private.catalog_has_non_whitespace(v_clean_courier) THEN v_clean_courier
    ELSE v_del.courier_label
  END;

  IF v_is_cancel THEN
    IF NOT private.catalog_has_non_whitespace(v_clean_reason) OR pg_catalog.char_length(v_clean_reason) < 3 THEN
      RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_input_invalid, ERRCODE = v_dc.sqlstate_22023;
    END IF;
  ELSE
    IF NOT private.is_valid_delivery_dispatch_transition(v_del.status, p_to_status) THEN
      RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_invalid_transition, ERRCODE = v_dc.sqlstate_22023;
    END IF;
    IF p_to_status IN (v_dc.st_assigned, v_dc.st_out_for_delivery) AND NOT private.catalog_has_non_whitespace(v_next_courier) THEN
      RAISE EXCEPTION USING MESSAGE = v_dc.msg_delivery_input_invalid, ERRCODE = v_dc.sqlstate_22023;
    END IF;
  END IF;

  UPDATE public.deliveries
  SET
    status = p_to_status,
    courier_label = v_next_courier,
    assigned_at = CASE
      WHEN p_to_status IN (v_dc.st_assigned, v_dc.st_out_for_delivery) AND assigned_at IS NULL THEN pg_catalog.now()
      ELSE assigned_at
    END,
    out_for_delivery_at = CASE WHEN p_to_status = v_dc.st_out_for_delivery THEN pg_catalog.now() ELSE out_for_delivery_at END,
    delivered_at = CASE WHEN p_to_status = v_dc.st_delivered THEN pg_catalog.now() ELSE delivered_at END,
    cancelled_at = CASE WHEN v_is_cancel THEN pg_catalog.now() ELSE cancelled_at END,
    cancellation_reason = CASE WHEN v_is_cancel THEN v_clean_reason ELSE cancellation_reason END,
    updated_at = pg_catalog.now()
  WHERE id = v_del.id;

  INSERT INTO public.delivery_status_transitions (
    organization_id, delivery_id, from_status, to_status, courier_label, actor_user_id, actor_kind, reason, correlation_id
  ) VALUES (
    v_del.organization_id, v_del.id, v_del.status, p_to_status, v_next_courier,
    v_actor_id, v_dc.actor_staff, v_clean_reason, p_correlation_id
  );

  IF v_ord.status NOT IN (v_oc.st_completed, v_oc.st_cancelled) THEN
    IF p_to_status = v_dc.st_ready_dispatch AND v_ord.status IN (v_oc.st_placed, v_oc.st_accepted, v_oc.st_preparing) THEN
      v_target_order_status := v_oc.st_ready_dispatch;
    ELSIF p_to_status = v_dc.st_out_for_delivery AND v_ord.status <> v_oc.st_out_for_delivery THEN
      v_target_order_status := v_oc.st_out_for_delivery;
    ELSIF p_to_status = v_dc.st_delivered THEN
      v_target_order_status := v_oc.st_completed;
    ELSIF v_is_cancel THEN
      v_target_order_status := v_oc.st_cancelled;
    END IF;

    IF v_target_order_status IS NOT NULL THEN
      PERFORM pg_catalog.set_config(v_dc.sync_guc_key, v_dc.sync_guc_on, true);

      UPDATE public.orders
      SET
        status = v_target_order_status,
        cancellation_reason = CASE WHEN v_is_cancel THEN v_clean_reason ELSE cancellation_reason END,
        accepted_at = COALESCE(accepted_at, pg_catalog.now()),
        ready_at = CASE
          WHEN v_target_order_status IN (v_oc.st_ready_dispatch, v_oc.st_out_for_delivery, v_oc.st_completed) THEN COALESCE(ready_at, pg_catalog.now())
          ELSE ready_at
        END,
        dispatched_at = CASE
          WHEN v_target_order_status IN (v_oc.st_out_for_delivery, v_oc.st_completed) THEN COALESCE(dispatched_at, pg_catalog.now())
          ELSE dispatched_at
        END,
        completed_at = CASE WHEN v_target_order_status = v_oc.st_completed THEN pg_catalog.now() ELSE completed_at END,
        cancelled_at = CASE WHEN v_is_cancel THEN pg_catalog.now() ELSE cancelled_at END,
        updated_at = pg_catalog.now()
      WHERE id = v_ord.id;

      INSERT INTO public.order_status_transitions (
        organization_id, order_id, from_status, to_status, actor_user_id, actor_kind, reason, correlation_id
      ) VALUES (
        v_ord.organization_id, v_ord.id, v_ord.status, v_target_order_status,
        v_actor_id, v_oc.actor_staff, v_clean_reason, p_correlation_id
      );

      PERFORM pg_catalog.set_config(v_dc.sync_guc_key, '', true);
    END IF;
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, v_del.organization_id, v_del.establishment_id, v_del.branch_id,
    v_dc.action_dispatch_transitioned, v_dc.target_delivery, v_del.id,
    v_dc.outcome_allow,
    CASE WHEN v_is_cancel THEN v_dc.reason_dispatch_cancelled ELSE v_dc.reason_dispatch_transitioned END,
    p_correlation_id, v_dc.source_delivery_command,
    pg_catalog.jsonb_build_object(
      v_dc.meta_order_id, v_ord.id::text,
      v_dc.meta_from_status, v_del.status,
      v_dc.meta_to_status, p_to_status,
      v_dc.meta_courier_label, v_next_courier
    )
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_dc.key_delivery_id, v_del.id,
    v_oc.key_order_id, v_ord.id,
    'status', p_to_status,
    v_dc.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delivery_advance_dispatch(uuid, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delivery_advance_dispatch(uuid, text, text, text, uuid)
  TO authenticated;
