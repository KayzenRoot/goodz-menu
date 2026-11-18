CREATE TYPE private.orders_literal_constants AS (
  perm_orders_read text,
  perm_orders_write text,
  perm_orders_cancel text,
  perm_handoff_write text,
  perm_handoff_sensitive text,
  status_active text,
  channel_goodz_online text,
  mode_pickup text,
  mode_own_delivery text,
  st_placed text,
  st_accepted text,
  st_preparing text,
  st_ready_pickup text,
  st_ready_dispatch text,
  st_out_for_delivery text,
  st_completed text,
  st_cancelled text,
  pay_pix text,
  pay_debit text,
  pay_credit text,
  pay_cash text,
  hp_pending text,
  hp_collected text,
  hp_failed text,
  hp_cancelled text,
  hp_reversed text,
  hp_disputed text,
  currency_brl text,
  actor_staff text,
  actor_customer text,
  action_orders_step_up text,
  action_order_placed text,
  action_order_transitioned text,
  action_order_cancelled text,
  action_handoff_recorded text,
  target_order text,
  source_admin_guard text,
  source_orders_command text,
  outcome_allow text,
  outcome_deny text,
  reason_authorized text,
  reason_order_placed text,
  reason_order_transitioned text,
  reason_order_cancelled text,
  reason_handoff_recorded text,
  meta_step_up_proof_id text,
  meta_required_permissions text,
  meta_order_number text,
  meta_fulfillment_mode text,
  meta_from_status text,
  meta_to_status text,
  meta_handoff_status text,
  meta_payment_method text,
  meta_amount text,
  key_order_id text,
  key_audit_event_ids text,
  key_channel_offer_id text,
  json_object text,
  json_array text,
  json_string text,
  json_number text,
  sqlstate_22023 text,
  sqlstate_42501 text,
  sqlstate_55000 text,
  sqlstate_p0002 text,
  msg_orders_auth_unavailable text,
  msg_orders_input_invalid text,
  msg_orders_storefront_paused text,
  msg_orders_offer_unavailable text,
  msg_orders_invalid_transition text,
  msg_orders_step_up_required text,
  msg_orders_immutable text
);

CREATE FUNCTION private.get_orders_literal_constants()
RETURNS private.orders_literal_constants
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT ROW(
    'orders.read'::text,
    'orders.write'::text,
    'orders.cancel'::text,
    'orders.handoff_payment.write'::text,
    'orders.handoff_payment.sensitive'::text,
    'active'::text,
    'goodz_online'::text,
    'pickup'::text,
    'own_delivery'::text,
    'placed'::text,
    'accepted'::text,
    'preparing'::text,
    'ready_for_pickup'::text,
    'ready_for_dispatch'::text,
    'out_for_delivery'::text,
    'completed'::text,
    'cancelled'::text,
    'pix_in_person'::text,
    'debit_card_pos'::text,
    'credit_card_pos'::text,
    'cash'::text,
    'pending'::text,
    'collected'::text,
    'failed'::text,
    'cancelled'::text,
    'reversed'::text,
    'disputed'::text,
    'BRL'::text,
    'staff'::text,
    'customer_checkout'::text,
    'orders.privileged.step_up'::text,
    'order.lifecycle.placed'::text,
    'order.lifecycle.transitioned'::text,
    'order.lifecycle.cancelled'::text,
    'order.handoff_payment.recorded'::text,
    'order'::text,
    'admin_guard'::text,
    'orders_command'::text,
    'allow'::text,
    'deny'::text,
    'authorized'::text,
    'order_placed'::text,
    'order_transitioned'::text,
    'order_cancelled'::text,
    'order_handoff_recorded'::text,
    'step_up_proof_id'::text,
    'required_permissions'::text,
    'order_number'::text,
    'fulfillment_mode'::text,
    'from_status'::text,
    'to_status'::text,
    'handoff_status'::text,
    'payment_method'::text,
    'amount'::text,
    'order_id'::text,
    'audit_event_ids'::text,
    'channel_offer_id'::text,
    'object'::text,
    'array'::text,
    'string'::text,
    'number'::text,
    '22023'::text,
    '42501'::text,
    '55000'::text,
    'P0002'::text,
    'Orders authorization is unavailable.'::text,
    'Orders input is invalid.'::text,
    'Online ordering is paused or disabled for this branch.'::text,
    'Selected catalog offer is unavailable for ordering.'::text,
    'Requested order status transition is invalid.'::text,
    'Orders step-up verification is required.'::text,
    'Historical order ledger rows are immutable.'::text
  )::private.orders_literal_constants;
$function$;

REVOKE ALL ON TYPE private.orders_literal_constants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_orders_literal_constants() FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON TYPE private.orders_literal_constants TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_orders_literal_constants() TO authenticated;

INSERT INTO public.permissions (permission_key, display_name)
VALUES
  ((private.get_orders_literal_constants()).perm_orders_read, 'Read branch orders and queue'),
  ((private.get_orders_literal_constants()).perm_orders_write, 'Create and advance operational orders'),
  ((private.get_orders_literal_constants()).perm_orders_cancel, 'Cancel orders with mandatory reason'),
  ((private.get_orders_literal_constants()).perm_handoff_write, 'Record in-person handoff payment status'),
  ((private.get_orders_literal_constants()).perm_handoff_sensitive, 'Reverse or dispute handoff payment')
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_orders_role_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_perm text;
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
BEGIN
  IF NEW.role_key IN ('owner', 'admin') THEN
    FOREACH v_perm IN ARRAY ARRAY[
      v_c.perm_orders_read, v_c.perm_orders_write, v_c.perm_orders_cancel,
      v_c.perm_handoff_write, v_c.perm_handoff_sensitive
    ] LOOP
      INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
      VALUES (NEW.organization_id, NEW.id, v_perm)
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF NEW.role_key = v_c.actor_staff THEN
    FOREACH v_perm IN ARRAY ARRAY[
      v_c.perm_orders_read, v_c.perm_orders_write, v_c.perm_orders_cancel, v_c.perm_handoff_write
    ] LOOP
      INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
      VALUES (NEW.organization_id, NEW.id, v_perm)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_orders_role_permissions() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER tenant_roles_seed_orders_permissions
AFTER INSERT ON public.tenant_roles
FOR EACH ROW
EXECUTE FUNCTION private.seed_orders_role_permissions();

WITH c AS (SELECT (private.get_orders_literal_constants()).*)
INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, perm.permission_key
FROM public.tenant_roles AS role
CROSS JOIN c
CROSS JOIN LATERAL unnest(
  CASE
    WHEN role.role_key IN ('owner', 'admin') THEN ARRAY[
      c.perm_orders_read, c.perm_orders_write, c.perm_orders_cancel, c.perm_handoff_write, c.perm_handoff_sensitive
    ]::text[]
    WHEN role.role_key = c.actor_staff THEN ARRAY[
      c.perm_orders_read, c.perm_orders_write, c.perm_orders_cancel, c.perm_handoff_write
    ]::text[]
    ELSE ARRAY[]::text[]
  END
) AS perm(permission_key)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.orders_has_permission(
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
      (private.get_orders_literal_constants()).perm_orders_read,
      (private.get_orders_literal_constants()).perm_orders_write,
      (private.get_orders_literal_constants()).perm_orders_cancel,
      (private.get_orders_literal_constants()).perm_handoff_write,
      (private.get_orders_literal_constants()).perm_handoff_sensitive
    )
    AND p_organization_id IS NOT NULL
    AND p_establishment_id IS NOT NULL
    AND p_branch_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations AS org_row
      WHERE org_row.id = p_organization_id
        AND org_row.status = (private.get_orders_literal_constants()).status_active
    )
    AND EXISTS (
      SELECT 1 FROM public.establishments AS est_row
      WHERE est_row.organization_id = p_organization_id
        AND est_row.id = p_establishment_id
        AND est_row.status = (private.get_orders_literal_constants()).status_active
    )
    AND EXISTS (
      SELECT 1 FROM public.branches AS br_row
      WHERE br_row.organization_id = p_organization_id
        AND br_row.establishment_id = p_establishment_id
        AND br_row.id = p_branch_id
        AND br_row.status = (private.get_orders_literal_constants()).status_active
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
        AND m.status = (private.get_orders_literal_constants()).status_active
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

REVOKE ALL ON FUNCTION public.orders_has_permission(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_has_permission(uuid, uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.orders_can_read_organization_customers(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.branches AS br
    WHERE br.organization_id = p_organization_id
      AND public.orders_has_permission(
        p_organization_id,
        br.establishment_id,
        br.id,
        (private.get_orders_literal_constants()).perm_orders_read
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.orders_can_read_organization_customers(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_can_read_organization_customers(uuid) TO authenticated;

-- Customer & Address Tables (minimal checkout PII per D-0023 §6)
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  display_name text NOT NULL,
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  last_order_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT customers_organization_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE RESTRICT,
  CONSTRAINT customers_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT customers_display_name_check
    CHECK (private.catalog_has_non_whitespace(display_name) AND pg_catalog.char_length(display_name) <= 120),
  CONSTRAINT customers_phone_check
    CHECK (pg_catalog.char_length(phone) BETWEEN 8 AND 40),
  CONSTRAINT customers_phone_normalized_check
    CHECK (phone_normalized ~ '^[0-9]{8,20}$')
);

CREATE UNIQUE INDEX customers_org_phone_active_key
  ON public.customers (organization_id, phone_normalized)
  WHERE anonymized_at IS NULL;

CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  street_line text NOT NULL,
  number_label text NOT NULL DEFAULT 'S/N',
  complement text NOT NULL DEFAULT '',
  neighborhood text NOT NULL,
  city text NOT NULL,
  state_code text NOT NULL DEFAULT 'SP',
  postal_code text NOT NULL DEFAULT '',
  reference_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT customer_addresses_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT customer_addresses_customer_tenant_fkey
    FOREIGN KEY (organization_id, customer_id) REFERENCES public.customers (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT customer_addresses_street_check
    CHECK (private.catalog_has_non_whitespace(street_line) AND pg_catalog.char_length(street_line) <= 200),
  CONSTRAINT customer_addresses_number_check
    CHECK (pg_catalog.char_length(number_label) <= 40),
  CONSTRAINT customer_addresses_complement_check
    CHECK (pg_catalog.char_length(complement) <= 120),
  CONSTRAINT customer_addresses_neighborhood_check
    CHECK (private.catalog_has_non_whitespace(neighborhood) AND pg_catalog.char_length(neighborhood) <= 120),
  CONSTRAINT customer_addresses_city_check
    CHECK (private.catalog_has_non_whitespace(city) AND pg_catalog.char_length(city) <= 120),
  CONSTRAINT customer_addresses_state_check
    CHECK (state_code ~ '^[A-Z]{2}$'),
  CONSTRAINT customer_addresses_postal_check
    CHECK (postal_code = '' OR postal_code ~ '^[0-9]{5}-?[0-9]{3}$'),
  CONSTRAINT customer_addresses_notes_check
    CHECK (pg_catalog.char_length(reference_notes) <= 240)
);

CREATE INDEX customer_addresses_customer_idx
  ON public.customer_addresses (organization_id, customer_id);

-- Per-branch monotonic order counter
CREATE TABLE private.branch_order_counters (
  branch_id uuid PRIMARY KEY REFERENCES public.branches (id) ON DELETE CASCADE,
  last_order_number bigint NOT NULL DEFAULT 1000
);

REVOKE ALL PRIVILEGES ON TABLE private.branch_order_counters FROM PUBLIC, anon, authenticated, service_role;

-- Canonical Orders & Immutable Ledgers
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  order_number bigint NOT NULL,
  sales_channel_id uuid NOT NULL,
  channel_key text NOT NULL,
  customer_id uuid,
  delivery_address_id uuid,
  delivery_zone_id uuid,
  customer_name_snapshot text NOT NULL,
  customer_phone_snapshot text NOT NULL,
  delivery_address_snapshot jsonb,
  fulfillment_mode text NOT NULL,
  status text NOT NULL,
  currency text NOT NULL DEFAULT (private.get_orders_literal_constants()).currency_brl,
  subtotal_amount numeric(12, 2) NOT NULL,
  delivery_fee_amount numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL,
  declared_payment_method text NOT NULL,
  cash_change_for_amount numeric(12, 2),
  handoff_payment_status text NOT NULL DEFAULT (private.get_orders_literal_constants()).hp_pending,
  customer_notes text NOT NULL DEFAULT '',
  cancellation_reason text,
  idempotency_key text NOT NULL,
  placed_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT orders_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT orders_branch_number_unique UNIQUE (organization_id, branch_id, order_number),
  CONSTRAINT orders_branch_idempotency_unique UNIQUE (organization_id, branch_id, idempotency_key),
  CONSTRAINT orders_branch_scope_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id) ON DELETE RESTRICT,
  CONSTRAINT orders_channel_tenant_fkey
    FOREIGN KEY (organization_id, sales_channel_id)
    REFERENCES public.sales_channels (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT orders_customer_tenant_fkey
    FOREIGN KEY (organization_id, customer_id)
    REFERENCES public.customers (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT orders_address_tenant_fkey
    FOREIGN KEY (organization_id, delivery_address_id)
    REFERENCES public.customer_addresses (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT orders_channel_key_check
    CHECK (channel_key = (private.get_orders_literal_constants()).channel_goodz_online),
  CONSTRAINT orders_customer_name_check
    CHECK (private.catalog_has_non_whitespace(customer_name_snapshot) AND pg_catalog.char_length(customer_name_snapshot) <= 120),
  CONSTRAINT orders_customer_phone_check
    CHECK (pg_catalog.char_length(customer_phone_snapshot) BETWEEN 8 AND 40),
  CONSTRAINT orders_fulfillment_mode_check
    CHECK (fulfillment_mode IN (
      (private.get_orders_literal_constants()).mode_pickup,
      (private.get_orders_literal_constants()).mode_own_delivery
    )),
  CONSTRAINT orders_delivery_address_shape_check
    CHECK (
      (
        fulfillment_mode = (private.get_orders_literal_constants()).mode_pickup
        AND delivery_address_snapshot IS NULL
        AND delivery_fee_amount = 0
      )
      OR (
        fulfillment_mode = (private.get_orders_literal_constants()).mode_own_delivery
        AND delivery_address_snapshot IS NOT NULL
        AND pg_catalog.jsonb_typeof(delivery_address_snapshot) = (private.get_orders_literal_constants()).json_object
      )
    ),
  CONSTRAINT orders_status_check
    CHECK (status IN (
      (private.get_orders_literal_constants()).st_placed,
      (private.get_orders_literal_constants()).st_accepted,
      (private.get_orders_literal_constants()).st_preparing,
      (private.get_orders_literal_constants()).st_ready_pickup,
      (private.get_orders_literal_constants()).st_ready_dispatch,
      (private.get_orders_literal_constants()).st_out_for_delivery,
      (private.get_orders_literal_constants()).st_completed,
      (private.get_orders_literal_constants()).st_cancelled
    )),
  CONSTRAINT orders_mode_status_compat_check
    CHECK (
      (
        fulfillment_mode = (private.get_orders_literal_constants()).mode_pickup
        AND status NOT IN (
          (private.get_orders_literal_constants()).st_ready_dispatch,
          (private.get_orders_literal_constants()).st_out_for_delivery
        )
      )
      OR (
        fulfillment_mode = (private.get_orders_literal_constants()).mode_own_delivery
        AND status <> (private.get_orders_literal_constants()).st_ready_pickup
      )
    ),
  CONSTRAINT orders_currency_check
    CHECK (currency = (private.get_orders_literal_constants()).currency_brl),
  CONSTRAINT orders_totals_check
    CHECK (subtotal_amount >= 0 AND delivery_fee_amount >= 0 AND total_amount = subtotal_amount + delivery_fee_amount),
  CONSTRAINT orders_payment_method_check
    CHECK (declared_payment_method IN (
      (private.get_orders_literal_constants()).pay_pix,
      (private.get_orders_literal_constants()).pay_debit,
      (private.get_orders_literal_constants()).pay_credit,
      (private.get_orders_literal_constants()).pay_cash
    )),
  CONSTRAINT orders_cash_change_check
    CHECK (
      cash_change_for_amount IS NULL
      OR (
        declared_payment_method = (private.get_orders_literal_constants()).pay_cash
        AND cash_change_for_amount >= total_amount
      )
    ),
  CONSTRAINT orders_handoff_status_check
    CHECK (handoff_payment_status IN (
      (private.get_orders_literal_constants()).hp_pending,
      (private.get_orders_literal_constants()).hp_collected,
      (private.get_orders_literal_constants()).hp_failed,
      (private.get_orders_literal_constants()).hp_cancelled,
      (private.get_orders_literal_constants()).hp_reversed,
      (private.get_orders_literal_constants()).hp_disputed
    )),
  CONSTRAINT orders_notes_check
    CHECK (pg_catalog.char_length(customer_notes) <= 500),
  CONSTRAINT orders_cancellation_reason_check
    CHECK (
      (status = (private.get_orders_literal_constants()).st_cancelled) = (
        cancellation_reason IS NOT NULL
        AND private.catalog_has_non_whitespace(cancellation_reason)
        AND pg_catalog.char_length(cancellation_reason) BETWEEN 3 AND 500
      )
    ),
  CONSTRAINT orders_idempotency_key_check
    CHECK (private.catalog_has_non_whitespace(idempotency_key) AND pg_catalog.char_length(idempotency_key) BETWEEN 8 AND 128)
);

CREATE INDEX orders_branch_queue_idx
  ON public.orders (organization_id, branch_id, status, placed_at DESC);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid NOT NULL,
  line_number integer NOT NULL,
  channel_offer_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  display_name_snapshot text NOT NULL,
  quantity integer NOT NULL,
  unit_price_snapshot numeric(12, 2) NOT NULL,
  line_total_amount numeric(12, 2) NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT order_items_order_line_unique UNIQUE (order_id, line_number),
  CONSTRAINT order_items_order_tenant_fkey
    FOREIGN KEY (organization_id, order_id) REFERENCES public.orders (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT order_items_offer_tenant_fkey
    FOREIGN KEY (organization_id, channel_offer_id) REFERENCES public.channel_offers (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT order_items_product_tenant_fkey
    FOREIGN KEY (organization_id, product_id) REFERENCES public.products (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT order_items_variant_tenant_fkey
    FOREIGN KEY (organization_id, variant_id) REFERENCES public.product_variants (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT order_items_line_check CHECK (line_number >= 1),
  CONSTRAINT order_items_name_check CHECK (private.catalog_has_non_whitespace(display_name_snapshot) AND pg_catalog.char_length(display_name_snapshot) <= 240),
  CONSTRAINT order_items_quantity_check CHECK (quantity BETWEEN 1 AND 99),
  CONSTRAINT order_items_amounts_check CHECK (unit_price_snapshot >= 0 AND line_total_amount = unit_price_snapshot * quantity),
  CONSTRAINT order_items_notes_check CHECK (pg_catalog.char_length(notes) <= 240)
);

CREATE INDEX order_items_order_idx ON public.order_items (organization_id, order_id, line_number);

CREATE TABLE public.order_status_transitions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  actor_user_id uuid,
  actor_kind text NOT NULL,
  reason text NOT NULL DEFAULT '',
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT order_status_transitions_order_tenant_fkey
    FOREIGN KEY (organization_id, order_id) REFERENCES public.orders (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT order_status_transitions_actor_fkey
    FOREIGN KEY (actor_user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT order_status_transitions_actor_kind_check
    CHECK (actor_kind IN (
      (private.get_orders_literal_constants()).actor_staff,
      (private.get_orders_literal_constants()).actor_customer
    )),
  CONSTRAINT order_status_transitions_reason_check
    CHECK (pg_catalog.char_length(reason) <= 500)
);

CREATE INDEX order_status_transitions_order_idx
  ON public.order_status_transitions (organization_id, order_id, created_at ASC);

CREATE TABLE public.order_handoff_payments (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid NOT NULL,
  payment_method text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT (private.get_orders_literal_constants()).currency_brl,
  status text NOT NULL,
  reason text NOT NULL DEFAULT '',
  actor_user_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT order_handoff_payments_order_tenant_fkey
    FOREIGN KEY (organization_id, order_id) REFERENCES public.orders (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT order_handoff_payments_actor_fkey
    FOREIGN KEY (actor_user_id) REFERENCES auth.users (id) ON DELETE RESTRICT,
  CONSTRAINT order_handoff_payments_method_check
    CHECK (payment_method IN (
      (private.get_orders_literal_constants()).pay_pix,
      (private.get_orders_literal_constants()).pay_debit,
      (private.get_orders_literal_constants()).pay_credit,
      (private.get_orders_literal_constants()).pay_cash
    )),
  CONSTRAINT order_handoff_payments_amount_check CHECK (amount >= 0),
  CONSTRAINT order_handoff_payments_currency_check
    CHECK (currency = (private.get_orders_literal_constants()).currency_brl),
  CONSTRAINT order_handoff_payments_status_check
    CHECK (status IN (
      (private.get_orders_literal_constants()).hp_collected,
      (private.get_orders_literal_constants()).hp_failed,
      (private.get_orders_literal_constants()).hp_cancelled,
      (private.get_orders_literal_constants()).hp_reversed,
      (private.get_orders_literal_constants()).hp_disputed
    )),
  CONSTRAINT order_handoff_payments_reason_check
    CHECK (
      pg_catalog.char_length(reason) <= 500
      AND (
        status = (private.get_orders_literal_constants()).hp_collected
        OR (private.catalog_has_non_whitespace(reason) AND pg_catalog.char_length(reason) >= 3)
      )
    )
);

CREATE INDEX order_handoff_payments_order_idx
  ON public.order_handoff_payments (organization_id, order_id, created_at ASC);

CREATE OR REPLACE FUNCTION private.reject_order_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = (private.get_orders_literal_constants()).msg_orders_immutable,
    ERRCODE = (private.get_orders_literal_constants()).sqlstate_55000;
END;
$function$;

REVOKE ALL ON FUNCTION private.reject_order_ledger_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER order_items_immutable
BEFORE UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION private.reject_order_ledger_mutation();

CREATE TRIGGER order_status_transitions_immutable
BEFORE UPDATE OR DELETE ON public.order_status_transitions
FOR EACH ROW EXECUTE FUNCTION private.reject_order_ledger_mutation();

CREATE TRIGGER order_handoff_payments_immutable
BEFORE UPDATE OR DELETE ON public.order_handoff_payments
FOR EACH ROW EXECUTE FUNCTION private.reject_order_ledger_mutation();

-- Audit extension & step-up consumption for reversed/disputed handoff payments
CREATE TABLE private.orders_step_up_consumptions (
  guard_event_id uuid PRIMARY KEY REFERENCES public.audit_events (id) ON DELETE RESTRICT,
  consumed_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  consumed_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

REVOKE ALL PRIVILEGES ON TABLE private.orders_step_up_consumptions FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_valid_orders_audit_metadata(
  p_action text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
  v_proof text;
BEGIN
  IF p_metadata IS NULL OR pg_catalog.jsonb_typeof(p_metadata) <> v_c.json_object THEN
    RETURN false;
  END IF;

  IF p_action = v_c.action_orders_step_up THEN
    IF NOT (p_metadata ? v_c.meta_required_permissions)
      OR pg_catalog.jsonb_typeof(p_metadata->v_c.meta_required_permissions) <> v_c.json_array
      OR pg_catalog.jsonb_array_length(p_metadata->v_c.meta_required_permissions) <> 1
      OR (p_metadata->v_c.meta_required_permissions->>0) IS DISTINCT FROM v_c.perm_handoff_sensitive
      OR (p_metadata - ARRAY[v_c.meta_required_permissions, v_c.meta_step_up_proof_id]::text[]) <> '{}'::jsonb
    THEN
      RETURN false;
    END IF;
    IF p_metadata ? v_c.meta_step_up_proof_id THEN
      v_proof := p_metadata->>v_c.meta_step_up_proof_id;
      IF v_proof IS NULL OR v_proof !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  IF p_action = v_c.action_order_placed THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_order_number
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_order_number) = v_c.json_number
      AND p_metadata ? v_c.meta_fulfillment_mode
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_fulfillment_mode) = v_c.json_string
      AND (p_metadata - ARRAY[v_c.meta_order_number, v_c.meta_fulfillment_mode, v_c.meta_amount]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  IF p_action IN (v_c.action_order_transitioned, v_c.action_order_cancelled) THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_from_status
      AND p_metadata ? v_c.meta_to_status
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_to_status) = v_c.json_string
      AND (p_metadata - ARRAY[v_c.meta_order_number, v_c.meta_from_status, v_c.meta_to_status]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  IF p_action = v_c.action_handoff_recorded THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_handoff_status
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_handoff_status) = v_c.json_string
      AND p_metadata ? v_c.meta_payment_method
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_payment_method) = v_c.json_string
      AND (p_metadata - ARRAY[
        v_c.meta_order_number, v_c.meta_handoff_status, v_c.meta_payment_method, v_c.meta_amount
      ]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION private.is_valid_orders_audit_metadata(text, jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admitted_audit_shape(
  p_action text,
  p_target_type text,
  p_source text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT CASE
    WHEN p_action = (private.get_catalog_literal_constants()).proof_source THEN
      p_target_type = (private.get_catalog_literal_constants()).scope_branch
      AND p_source = (private.get_catalog_literal_constants()).source_admin_guard
    WHEN p_action = (private.get_catalog_literal_constants()).action_catalog_privileged_step_up THEN
      p_target_type = (private.get_catalog_literal_constants()).target_channel_offer
      AND p_source = (private.get_catalog_literal_constants()).source_admin_guard
    WHEN p_action LIKE 'catalog.%' THEN
      p_source = (private.get_catalog_literal_constants()).source_catalog_command
      AND (
        (p_action LIKE 'catalog.category.%' AND p_target_type = 'product_category')
        OR (p_action LIKE 'catalog.product.%' AND p_target_type = (private.get_catalog_literal_constants()).target_product)
        OR (p_action LIKE 'catalog.variant.%' AND p_target_type = 'product_variant')
        OR (p_action LIKE 'catalog.channel.%' AND p_target_type = 'sales_channel')
        OR (p_action LIKE 'catalog.offer.%' AND p_target_type = (private.get_catalog_literal_constants()).target_channel_offer)
      )
    WHEN p_action = (private.get_settings_literal_constants()).action_settings_step_up THEN
      p_target_type = (private.get_settings_literal_constants()).target_setting_value
      AND p_source = (private.get_settings_literal_constants()).source_admin_guard
    WHEN p_action = (private.get_settings_literal_constants()).action_settings_upserted THEN
      p_target_type = (private.get_settings_literal_constants()).target_setting_value
      AND p_source = (private.get_settings_literal_constants()).source_settings_command
    WHEN p_action = (private.get_orders_literal_constants()).action_orders_step_up THEN
      p_target_type = (private.get_orders_literal_constants()).target_order
      AND p_source = (private.get_orders_literal_constants()).source_admin_guard
    WHEN p_action LIKE 'order.%' THEN
      p_target_type = (private.get_orders_literal_constants()).target_order
      AND p_source = (private.get_orders_literal_constants()).source_orders_command
    ELSE false
  END;
$function$;

REVOKE ALL ON FUNCTION private.is_admitted_audit_shape(text, text, text) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (
  action = ANY(ARRAY[
    (private.get_catalog_literal_constants()).proof_source,
    (private.get_catalog_literal_constants()).action_catalog_privileged_step_up,
    'catalog.category.created', 'catalog.category.updated', 'catalog.category.archived',
    'catalog.product.created', 'catalog.product.updated', 'catalog.product.archived',
    'catalog.variant.created', 'catalog.variant.updated', 'catalog.variant.archived',
    'catalog.channel.created', 'catalog.channel.updated', 'catalog.channel.archived',
    'catalog.offer.created', 'catalog.offer.updated', 'catalog.offer.archived',
    'catalog.offer.commercial_created', 'catalog.offer.commercial_updated',
    (private.get_settings_literal_constants()).action_settings_step_up,
    (private.get_settings_literal_constants()).action_settings_upserted,
    (private.get_orders_literal_constants()).action_orders_step_up,
    (private.get_orders_literal_constants()).action_order_placed,
    (private.get_orders_literal_constants()).action_order_transitioned,
    (private.get_orders_literal_constants()).action_order_cancelled,
    (private.get_orders_literal_constants()).action_handoff_recorded
  ]::text[])
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_type_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_type_check CHECK (
  target_type = ANY(ARRAY[
    (private.get_catalog_literal_constants()).scope_branch,
    'product_category',
    (private.get_catalog_literal_constants()).target_product,
    'product_variant',
    'sales_channel',
    (private.get_catalog_literal_constants()).target_channel_offer,
    (private.get_settings_literal_constants()).target_setting_value,
    (private.get_orders_literal_constants()).target_order
  ]::text[])
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_reason_code_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_reason_code_check CHECK (
  reason_code = ANY(ARRAY[
    (private.get_orders_literal_constants()).reason_authorized,
    'invalid_scope', 'unauthenticated', 'identity_unverified', 'authorization_denied',
    'aal2_required', 'factor_unverified', 'reauthentication_required', 'step_up_required',
    'catalog_created', 'catalog_updated', 'catalog_archived', 'catalog_commercial_updated',
    (private.get_settings_literal_constants()).reason_settings_created,
    (private.get_settings_literal_constants()).reason_settings_updated,
    (private.get_orders_literal_constants()).reason_order_placed,
    (private.get_orders_literal_constants()).reason_order_transitioned,
    (private.get_orders_literal_constants()).reason_order_cancelled,
    (private.get_orders_literal_constants()).reason_handoff_recorded
  ]::text[])
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_source_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_source_check CHECK (
  source = ANY(ARRAY[
    (private.get_catalog_literal_constants()).source_admin_guard,
    (private.get_catalog_literal_constants()).source_catalog_command,
    (private.get_settings_literal_constants()).source_settings_command,
    (private.get_orders_literal_constants()).source_orders_command
  ]::text[])
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_metadata_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_metadata_check CHECK (
  pg_catalog.jsonb_typeof(metadata) = (private.get_orders_literal_constants()).json_object
  AND pg_catalog.octet_length(metadata::text) <= 1024
  AND (
    (action = (private.get_catalog_literal_constants()).proof_source
      AND metadata = '{"required_permission":"tenant.hierarchy.read"}'::jsonb)
    OR (action LIKE 'catalog.%' AND private.is_valid_catalog_audit_metadata(action, metadata) IS TRUE)
    OR (action LIKE 'settings.%' AND private.is_valid_settings_audit_metadata(action, metadata) IS TRUE)
    OR (
      (action LIKE 'order.%' OR action = (private.get_orders_literal_constants()).action_orders_step_up)
      AND private.is_valid_orders_audit_metadata(action, metadata) IS TRUE
    )
  )
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_action_shape_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_action_shape_check CHECK (
  private.is_admitted_audit_shape(action, target_type, source) IS TRUE
);

-- RLS & Least Privilege on Customer and Order tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_handoff_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.customers,
  public.customer_addresses,
  public.orders,
  public.order_items,
  public.order_status_transitions,
  public.order_handoff_payments
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.customers,
  public.customer_addresses,
  public.orders,
  public.order_items,
  public.order_status_transitions,
  public.order_handoff_payments
TO authenticated;

CREATE POLICY customers_orders_select ON public.customers
FOR SELECT TO authenticated
USING ((SELECT public.orders_can_read_organization_customers(organization_id)));

CREATE POLICY customer_addresses_orders_select ON public.customer_addresses
FOR SELECT TO authenticated
USING ((SELECT public.orders_can_read_organization_customers(organization_id)));

CREATE POLICY orders_branch_select ON public.orders
FOR SELECT TO authenticated
USING ((SELECT public.orders_has_permission(
  organization_id,
  establishment_id,
  branch_id,
  (private.get_orders_literal_constants()).perm_orders_read
)));

CREATE POLICY order_items_branch_select ON public.order_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders AS ord
    WHERE ord.organization_id = order_items.organization_id
      AND ord.id = order_items.order_id
      AND public.orders_has_permission(
        ord.organization_id, ord.establishment_id, ord.branch_id,
        (private.get_orders_literal_constants()).perm_orders_read
      )
  )
);

CREATE POLICY order_status_transitions_branch_select ON public.order_status_transitions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders AS ord
    WHERE ord.organization_id = order_status_transitions.organization_id
      AND ord.id = order_status_transitions.order_id
      AND public.orders_has_permission(
        ord.organization_id, ord.establishment_id, ord.branch_id,
        (private.get_orders_literal_constants()).perm_orders_read
      )
  )
);

CREATE POLICY order_handoff_payments_branch_select ON public.order_handoff_payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders AS ord
    WHERE ord.organization_id = order_handoff_payments.organization_id
      AND ord.id = order_handoff_payments.order_id
      AND public.orders_has_permission(
        ord.organization_id, ord.establishment_id, ord.branch_id,
        (private.get_orders_literal_constants()).perm_orders_read
      )
  )
);

-- Step-up proof RPC for sensitive handoff reversals/disputes (service_role only)
CREATE OR REPLACE FUNCTION public.append_orders_step_up_event(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_order_id uuid,
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
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
  v_proof_id uuid;
  v_metadata jsonb;
BEGIN
  IF p_correlation_id IS NULL
    OR p_order_id IS NULL
    OR (p_establishment_id IS NULL AND p_branch_id IS NOT NULL)
    OR (p_organization_id IS NULL AND p_establishment_id IS NOT NULL)
    OR p_outcome IS NULL
    OR p_outcome NOT IN (v_c.outcome_allow, v_c.outcome_deny)
    OR p_required_permissions IS NULL
    OR cardinality(p_required_permissions) <> 1
    OR p_required_permissions[1] IS DISTINCT FROM v_c.perm_handoff_sensitive
    OR (p_outcome = v_c.outcome_allow AND (p_actor_user_id IS NULL OR p_organization_id IS NULL OR p_reason_code IS DISTINCT FROM v_c.reason_authorized))
    OR (p_outcome = v_c.outcome_deny AND p_reason_code = v_c.reason_authorized)
    OR p_reason_code IS NULL
  THEN
    RAISE EXCEPTION 'Invalid orders step-up event.' USING ERRCODE = v_c.sqlstate_22023;
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
    v_c.action_orders_step_up, v_c.target_order, p_order_id,
    p_outcome, p_reason_code, p_correlation_id, v_c.source_admin_guard, v_metadata
  );

  RETURN v_proof_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_orders_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_orders_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.consume_orders_step_up_proof(
  p_proof_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
  v_event public.audit_events%ROWTYPE;
  v_rows integer;
BEGIN
  IF p_proof_id IS NULL OR p_actor_user_id IS NULL OR p_actor_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT ev.* INTO v_event
  FROM public.audit_events AS ev
  WHERE ev.action = v_c.action_orders_step_up
    AND ev.outcome = v_c.outcome_allow
    AND ev.actor_user_id = p_actor_user_id
    AND ev.organization_id = p_organization_id
    AND ev.establishment_id IS NOT DISTINCT FROM p_establishment_id
    AND ev.branch_id IS NOT DISTINCT FROM p_branch_id
    AND ev.target_id = p_order_id
    AND ev.metadata->>v_c.meta_step_up_proof_id = p_proof_id::text
    AND ev.created_at >= pg_catalog.now() - interval '5 minutes'
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO private.orders_step_up_consumptions (guard_event_id, consumed_by)
  VALUES (v_event.id, p_actor_user_id)
  ON CONFLICT (guard_event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_orders_step_up_proof(uuid, uuid, uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- Internal deterministic branch operational setting resolver (reusable by Phase 6 Storefront)
CREATE OR REPLACE FUNCTION private.resolve_branch_setting_json(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_setting_key text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_sc private.settings_literal_constants := private.get_settings_literal_constants();
  v_def public.setting_definitions%ROWTYPE;
  v_row public.setting_values%ROWTYPE;
  v_val jsonb;
BEGIN
  SELECT d.* INTO v_def
  FROM public.setting_definitions AS d
  WHERE d.key = p_setting_key AND d.status = v_sc.status_active;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_val := v_def.default_value;

  SELECT sv.* INTO v_row
  FROM public.setting_values AS sv
  WHERE sv.setting_key = p_setting_key AND sv.scope_type = v_sc.scope_platform;
  IF FOUND THEN
    v_val := v_row.value_json;
    IF v_row.is_locked THEN RETURN v_val; END IF;
  END IF;

  SELECT sv.* INTO v_row
  FROM public.setting_values AS sv
  WHERE sv.setting_key = p_setting_key
    AND sv.scope_type = v_sc.scope_organization
    AND sv.organization_id = p_organization_id;
  IF FOUND THEN
    v_val := v_row.value_json;
    IF v_row.is_locked THEN RETURN v_val; END IF;
  END IF;

  SELECT sv.* INTO v_row
  FROM public.setting_values AS sv
  WHERE sv.setting_key = p_setting_key
    AND sv.scope_type = v_sc.scope_establishment
    AND sv.organization_id = p_organization_id
    AND sv.establishment_id = p_establishment_id;
  IF FOUND THEN
    v_val := v_row.value_json;
    IF v_row.is_locked THEN RETURN v_val; END IF;
  END IF;

  SELECT sv.* INTO v_row
  FROM public.setting_values AS sv
  WHERE sv.setting_key = p_setting_key
    AND sv.scope_type = v_sc.scope_branch
    AND sv.organization_id = p_organization_id
    AND sv.establishment_id = p_establishment_id
    AND sv.branch_id = p_branch_id;
  IF FOUND THEN
    v_val := v_row.value_json;
  END IF;

  RETURN v_val;
END;
$function$;

REVOKE ALL ON FUNCTION private.resolve_branch_setting_json(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_valid_order_transition(
  p_fulfillment_mode text,
  p_from_status text,
  p_to_status text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT (
    p_from_status = (private.get_orders_literal_constants()).st_placed
    AND p_to_status = (private.get_orders_literal_constants()).st_accepted
  )
  OR (
    p_from_status = (private.get_orders_literal_constants()).st_accepted
    AND p_to_status = (private.get_orders_literal_constants()).st_preparing
  )
  OR (
    p_from_status = (private.get_orders_literal_constants()).st_preparing
    AND p_fulfillment_mode = (private.get_orders_literal_constants()).mode_pickup
    AND p_to_status = (private.get_orders_literal_constants()).st_ready_pickup
  )
  OR (
    p_from_status = (private.get_orders_literal_constants()).st_preparing
    AND p_fulfillment_mode = (private.get_orders_literal_constants()).mode_own_delivery
    AND p_to_status = (private.get_orders_literal_constants()).st_ready_dispatch
  )
  OR (
    p_from_status = (private.get_orders_literal_constants()).st_ready_dispatch
    AND p_fulfillment_mode = (private.get_orders_literal_constants()).mode_own_delivery
    AND p_to_status = (private.get_orders_literal_constants()).st_out_for_delivery
  )
  OR (
    p_from_status = (private.get_orders_literal_constants()).st_ready_pickup
    AND p_fulfillment_mode = (private.get_orders_literal_constants()).mode_pickup
    AND p_to_status = (private.get_orders_literal_constants()).st_completed
  )
  OR (
    p_from_status = (private.get_orders_literal_constants()).st_out_for_delivery
    AND p_fulfillment_mode = (private.get_orders_literal_constants()).mode_own_delivery
    AND p_to_status = (private.get_orders_literal_constants()).st_completed
  );
$function$;

REVOKE ALL ON FUNCTION private.is_valid_order_transition(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

-- Core internal order creation helper (shared by staff intake now & Storefront checkout in Phase 6)
CREATE OR REPLACE FUNCTION private.create_canonical_order(
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
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
  v_sc private.settings_literal_constants := private.get_settings_literal_constants();
  v_existing public.orders%ROWTYPE;
  v_ordering_on jsonb;
  v_mode_on jsonb;
  v_accepted_methods jsonb;
  v_change_on jsonb;
  v_phone_digits text;
  v_channel_id uuid;
  v_customer_id uuid;
  v_address_id uuid := NULL;
  v_address_snapshot jsonb := NULL;
  v_order_number bigint;
  v_order_id uuid;
  v_subtotal numeric(12, 2) := 0;
  v_delivery_fee numeric(12, 2) := COALESCE(p_delivery_fee_amount, 0);
  v_total numeric(12, 2);
  v_line integer := 0;
  v_item jsonb;
  v_offer_id uuid;
  v_qty integer;
  v_item_notes text;
  v_offer public.channel_offers%ROWTYPE;
  v_prod public.products%ROWTYPE;
  v_var public.product_variants%ROWTYPE;
  v_prod_id uuid;
  v_var_id uuid;
  v_display_name text;
  v_street text;
  v_num text;
  v_comp text;
  v_neigh text;
  v_city text;
  v_state text;
  v_postal text;
  v_ref_notes text;
  v_audit_id uuid;
BEGIN
  IF p_correlation_id IS NULL
    OR p_idempotency_key IS NULL
    OR NOT private.catalog_has_non_whitespace(p_idempotency_key)
    OR pg_catalog.char_length(p_idempotency_key) NOT BETWEEN 8 AND 128
    OR p_fulfillment_mode IS NULL
    OR p_fulfillment_mode NOT IN (v_c.mode_pickup, v_c.mode_own_delivery)
    OR p_customer_name IS NULL
    OR NOT private.catalog_has_non_whitespace(p_customer_name)
    OR pg_catalog.char_length(p_customer_name) > 120
    OR p_customer_phone IS NULL
    OR pg_catalog.char_length(p_customer_phone) NOT BETWEEN 8 AND 40
    OR p_declared_payment_method IS NULL
    OR p_declared_payment_method NOT IN (v_c.pay_pix, v_c.pay_debit, v_c.pay_credit, v_c.pay_cash)
    OR p_items IS NULL
    OR pg_catalog.jsonb_typeof(p_items) <> v_c.json_array
    OR pg_catalog.jsonb_array_length(p_items) NOT BETWEEN 1 AND 50
  THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  v_phone_digits := pg_catalog.regexp_replace(p_customer_phone, '[^0-9]', '', 'g');
  IF pg_catalog.char_length(v_phone_digits) NOT BETWEEN 8 AND 20 THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  -- Serialize order intake on branch row so idempotency & order_number are race-free
  PERFORM 1 FROM public.branches AS br
  WHERE br.organization_id = p_organization_id
    AND br.establishment_id = p_establishment_id
    AND br.id = p_branch_id
    AND br.status = v_c.status_active
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  -- Idempotent replay check before policy/stock checks
  SELECT ord.* INTO v_existing
  FROM public.orders AS ord
  WHERE ord.organization_id = p_organization_id
    AND ord.branch_id = p_branch_id
    AND ord.idempotency_key = pg_catalog.btrim(p_idempotency_key);
  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      v_c.key_order_id, v_existing.id,
      v_c.meta_order_number, v_existing.order_number,
      'idempotent_replay', true,
      v_c.key_audit_event_ids, '[]'::jsonb
    );
  END IF;

  -- Verify branch settings & fail-closed ordering gate
  v_ordering_on := private.resolve_branch_setting_json(
    p_organization_id, p_establishment_id, p_branch_id, v_sc.key_ordering_enabled
  );
  IF v_ordering_on IS DISTINCT FROM pg_catalog.to_jsonb(true) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_storefront_paused, ERRCODE = v_c.sqlstate_42501;
  END IF;

  v_mode_on := private.resolve_branch_setting_json(
    p_organization_id,
    p_establishment_id,
    p_branch_id,
    CASE WHEN p_fulfillment_mode = v_c.mode_pickup THEN 'storefront.pickup_enabled' ELSE 'storefront.delivery_enabled' END
  );
  IF v_mode_on IS DISTINCT FROM pg_catalog.to_jsonb(true) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_storefront_paused, ERRCODE = v_c.sqlstate_42501;
  END IF;

  v_accepted_methods := private.resolve_branch_setting_json(
    p_organization_id, p_establishment_id, p_branch_id, v_sc.key_accepted_payment_methods
  );
  IF v_accepted_methods IS NULL OR NOT (v_accepted_methods ? p_declared_payment_method) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF p_cash_change_for IS NOT NULL THEN
    v_change_on := private.resolve_branch_setting_json(
      p_organization_id, p_establishment_id, p_branch_id, 'handoff.cash_change_enabled'
    );
    IF p_declared_payment_method <> v_c.pay_cash OR v_change_on IS DISTINCT FROM pg_catalog.to_jsonb(true) THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
    END IF;
  END IF;

  IF p_fulfillment_mode = v_c.mode_pickup THEN
    IF p_delivery_address IS NOT NULL OR v_delivery_fee <> 0 THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
    END IF;
  ELSE
    IF p_delivery_address IS NULL OR pg_catalog.jsonb_typeof(p_delivery_address) <> v_c.json_object OR v_delivery_fee < 0 THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
    END IF;
    v_street := pg_catalog.btrim(COALESCE(p_delivery_address->>'street_line', ''));
    v_num := COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_delivery_address->>'number_label', '')), ''), 'S/N');
    v_comp := pg_catalog.btrim(COALESCE(p_delivery_address->>'complement', ''));
    v_neigh := pg_catalog.btrim(COALESCE(p_delivery_address->>'neighborhood', ''));
    v_city := pg_catalog.btrim(COALESCE(p_delivery_address->>'city', ''));
    v_state := UPPER(COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_delivery_address->>'state_code', '')), ''), 'SP'));
    v_postal := pg_catalog.btrim(COALESCE(p_delivery_address->>'postal_code', ''));
    v_ref_notes := pg_catalog.btrim(COALESCE(p_delivery_address->>'reference_notes', ''));

    IF NOT private.catalog_has_non_whitespace(v_street)
      OR NOT private.catalog_has_non_whitespace(v_neigh)
      OR NOT private.catalog_has_non_whitespace(v_city)
    THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
    END IF;
  END IF;

  SELECT sc.id INTO v_channel_id
  FROM public.sales_channels AS sc
  WHERE sc.organization_id = p_organization_id
    AND sc.channel_key = v_c.channel_goodz_online
    AND sc.status = v_c.status_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_storefront_paused, ERRCODE = v_c.sqlstate_42501;
  END IF;

  -- Upsert customer by normalized phone within organization
  INSERT INTO public.customers (organization_id, display_name, phone, phone_normalized, last_order_at)
  VALUES (p_organization_id, pg_catalog.btrim(p_customer_name), pg_catalog.btrim(p_customer_phone), v_phone_digits, pg_catalog.now())
  ON CONFLICT (organization_id, phone_normalized) WHERE anonymized_at IS NULL
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    last_order_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  RETURNING id INTO v_customer_id;

  IF p_fulfillment_mode = v_c.mode_own_delivery THEN
    INSERT INTO public.customer_addresses (
      organization_id, customer_id, street_line, number_label, complement, neighborhood, city, state_code, postal_code, reference_notes
    ) VALUES (
      p_organization_id, v_customer_id, v_street, v_num, v_comp, v_neigh, v_city, v_state, v_postal, v_ref_notes
    ) RETURNING id INTO v_address_id;

    v_address_snapshot := pg_catalog.jsonb_build_object(
      'street_line', v_street,
      'number_label', v_num,
      'complement', v_comp,
      'neighborhood', v_neigh,
      'city', v_city,
      'state_code', v_state,
      'postal_code', v_postal,
      'reference_notes', v_ref_notes
    );
  END IF;

  INSERT INTO private.branch_order_counters (branch_id, last_order_number)
  VALUES (p_branch_id, 1001)
  ON CONFLICT (branch_id) DO UPDATE
    SET last_order_number = private.branch_order_counters.last_order_number + 1
  RETURNING last_order_number INTO v_order_number;

  -- Pre-insert order with 0 totals, then compute exact item snapshots & update header
  v_order_id := pg_catalog.gen_random_uuid();
  INSERT INTO public.orders (
    id, organization_id, establishment_id, branch_id, order_number, sales_channel_id, channel_key,
    customer_id, delivery_address_id, customer_name_snapshot, customer_phone_snapshot, delivery_address_snapshot,
    fulfillment_mode, status, subtotal_amount, delivery_fee_amount, total_amount,
    declared_payment_method, cash_change_for_amount, customer_notes, idempotency_key
  ) VALUES (
    v_order_id, p_organization_id, p_establishment_id, p_branch_id, v_order_number, v_channel_id, v_c.channel_goodz_online,
    v_customer_id, v_address_id, pg_catalog.btrim(p_customer_name), pg_catalog.btrim(p_customer_phone), v_address_snapshot,
    p_fulfillment_mode, v_c.st_placed, 0, v_delivery_fee, v_delivery_fee,
    p_declared_payment_method, NULL, COALESCE(p_customer_notes, ''), pg_catalog.btrim(p_idempotency_key)
  );

  FOR v_item IN SELECT elem.val FROM pg_catalog.jsonb_array_elements(p_items) AS elem(val) LOOP
    v_line := v_line + 1;
    IF pg_catalog.jsonb_typeof(v_item) <> v_c.json_object
      OR (v_item->>v_c.key_channel_offer_id) IS NULL
      OR (v_item->>v_c.key_channel_offer_id) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR pg_catalog.jsonb_typeof(v_item->'quantity') <> v_c.json_number
    THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
    END IF;

    v_offer_id := (v_item->>v_c.key_channel_offer_id)::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_item_notes := COALESCE(v_item->>'notes', '');

    SELECT co.* INTO v_offer
    FROM public.channel_offers AS co
    WHERE co.organization_id = p_organization_id
      AND co.establishment_id = p_establishment_id
      AND co.branch_id = p_branch_id
      AND co.sales_channel_id = v_channel_id
      AND co.id = v_offer_id
      AND co.status = v_c.status_active
      AND co.is_visible IS TRUE
      AND co.availability_state = 'available'
      AND co.base_price IS NOT NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_offer_unavailable, ERRCODE = v_c.sqlstate_22023;
    END IF;

    IF v_offer.target_kind = (private.get_catalog_literal_constants()).target_product THEN
      SELECT pr.* INTO v_prod
      FROM public.products AS pr
      WHERE pr.organization_id = p_organization_id AND pr.id = v_offer.product_id AND pr.status = v_c.status_active;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_offer_unavailable, ERRCODE = v_c.sqlstate_22023;
      END IF;
      v_prod_id := v_prod.id;
      v_var_id := NULL;
      v_display_name := COALESCE(v_offer.title_override, v_prod.name);
    ELSE
      SELECT pv.* INTO v_var
      FROM public.product_variants AS pv
      WHERE pv.organization_id = p_organization_id AND pv.id = v_offer.variant_id AND pv.status = v_c.status_active;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_offer_unavailable, ERRCODE = v_c.sqlstate_22023;
      END IF;
      SELECT pr.* INTO v_prod
      FROM public.products AS pr
      WHERE pr.organization_id = p_organization_id AND pr.id = v_var.product_id AND pr.status = v_c.status_active;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_offer_unavailable, ERRCODE = v_c.sqlstate_22023;
      END IF;
      v_prod_id := v_prod.id;
      v_var_id := v_var.id;
      v_display_name := COALESCE(v_offer.title_override, v_prod.name || ' · ' || v_var.name);
    END IF;

    INSERT INTO public.order_items (
      organization_id, order_id, line_number, channel_offer_id, product_id, variant_id,
      display_name_snapshot, quantity, unit_price_snapshot, line_total_amount, notes
    ) VALUES (
      p_organization_id, v_order_id, v_line, v_offer.id, v_prod_id, v_var_id,
      pg_catalog.left(v_display_name, 240), v_qty, v_offer.base_price, v_offer.base_price * v_qty, v_item_notes
    );

    v_subtotal := v_subtotal + (v_offer.base_price * v_qty);
  END LOOP;

  v_total := v_subtotal + v_delivery_fee;
  IF p_cash_change_for IS NOT NULL AND p_cash_change_for < v_total THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  UPDATE public.orders
  SET
    subtotal_amount = v_subtotal,
    total_amount = v_total,
    cash_change_for_amount = p_cash_change_for
  WHERE id = v_order_id;

  INSERT INTO public.order_status_transitions (
    organization_id, order_id, from_status, to_status, actor_user_id, actor_kind, reason, correlation_id
  ) VALUES (
    p_organization_id, v_order_id, NULL, v_c.st_placed, p_actor_user_id, p_actor_kind, '', p_correlation_id
  );

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    p_actor_user_id, p_organization_id, p_establishment_id, p_branch_id,
    v_c.action_order_placed, v_c.target_order, v_order_id,
    v_c.outcome_allow, v_c.reason_order_placed, p_correlation_id, v_c.source_orders_command,
    pg_catalog.jsonb_build_object(
      v_c.meta_order_number, v_order_number,
      v_c.meta_fulfillment_mode, p_fulfillment_mode,
      v_c.meta_amount, v_total::text
    )
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_order_id, v_order_id,
    v_c.meta_order_number, v_order_number,
    'idempotent_replay', false,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.create_canonical_order(
  uuid, text, uuid, uuid, uuid, text, text, text, jsonb, numeric, text, numeric, text, jsonb, text, uuid
) FROM PUBLIC, anon, authenticated, service_role;

-- Public authenticated command RPCs
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
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
BEGIN
  IF v_actor_id IS NULL OR NOT public.orders_has_permission(
    p_organization_id, p_establishment_id, p_branch_id, v_c.perm_orders_write
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  RETURN private.create_canonical_order(
    v_actor_id,
    v_c.actor_staff,
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
    p_correlation_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_place_staff(
  uuid, uuid, uuid, text, text, text, jsonb, numeric, text, numeric, text, jsonb, text, uuid
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_place_staff(
  uuid, uuid, uuid, text, text, text, jsonb, numeric, text, numeric, text, jsonb, text, uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.orders_transition_status(
  p_order_id uuid,
  p_to_status text,
  p_reason text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_ord public.orders%ROWTYPE;
  v_is_cancel boolean;
  v_clean_reason text := COALESCE(pg_catalog.btrim(p_reason), '');
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_order_id IS NULL OR p_to_status IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  SELECT ord.* INTO v_ord
  FROM public.orders AS ord
  WHERE ord.id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  v_is_cancel := (p_to_status = v_c.st_cancelled);

  IF NOT public.orders_has_permission(
    v_ord.organization_id,
    v_ord.establishment_id,
    v_ord.branch_id,
    CASE WHEN v_is_cancel THEN v_c.perm_orders_cancel ELSE v_c.perm_orders_write END
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF v_ord.status IN (v_c.st_completed, v_c.st_cancelled) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_invalid_transition, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF v_is_cancel THEN
    IF NOT private.catalog_has_non_whitespace(v_clean_reason) OR pg_catalog.char_length(v_clean_reason) NOT BETWEEN 3 AND 500 THEN
      RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
    END IF;
  ELSIF NOT private.is_valid_order_transition(v_ord.fulfillment_mode, v_ord.status, p_to_status) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_invalid_transition, ERRCODE = v_c.sqlstate_22023;
  END IF;

  UPDATE public.orders
  SET
    status = p_to_status,
    cancellation_reason = CASE WHEN v_is_cancel THEN v_clean_reason ELSE cancellation_reason END,
    accepted_at = CASE WHEN p_to_status = v_c.st_accepted THEN pg_catalog.now() ELSE accepted_at END,
    ready_at = CASE WHEN p_to_status IN (v_c.st_ready_pickup, v_c.st_ready_dispatch) THEN pg_catalog.now() ELSE ready_at END,
    dispatched_at = CASE WHEN p_to_status = v_c.st_out_for_delivery THEN pg_catalog.now() ELSE dispatched_at END,
    completed_at = CASE WHEN p_to_status = v_c.st_completed THEN pg_catalog.now() ELSE completed_at END,
    cancelled_at = CASE WHEN v_is_cancel THEN pg_catalog.now() ELSE cancelled_at END,
    updated_at = pg_catalog.now()
  WHERE id = v_ord.id;

  INSERT INTO public.order_status_transitions (
    organization_id, order_id, from_status, to_status, actor_user_id, actor_kind, reason, correlation_id
  ) VALUES (
    v_ord.organization_id, v_ord.id, v_ord.status, p_to_status, v_actor_id, v_c.actor_staff, v_clean_reason, p_correlation_id
  );

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, v_ord.organization_id, v_ord.establishment_id, v_ord.branch_id,
    CASE WHEN v_is_cancel THEN v_c.action_order_cancelled ELSE v_c.action_order_transitioned END,
    v_c.target_order, v_ord.id, v_c.outcome_allow,
    CASE WHEN v_is_cancel THEN v_c.reason_order_cancelled ELSE v_c.reason_order_transitioned END,
    p_correlation_id, v_c.source_orders_command,
    pg_catalog.jsonb_build_object(
      v_c.meta_order_number, v_ord.order_number,
      v_c.meta_from_status, v_ord.status,
      v_c.meta_to_status, p_to_status
    )
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_order_id, v_ord.id,
    'status', p_to_status,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_transition_status(uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_transition_status(uuid, text, text, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.orders_record_handoff_payment(
  p_order_id uuid,
  p_payment_method text,
  p_status text,
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
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_ord public.orders%ROWTYPE;
  v_sensitive boolean;
  v_clean_reason text := COALESCE(pg_catalog.btrim(p_reason), '');
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_order_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN (v_c.pay_pix, v_c.pay_debit, v_c.pay_credit, v_c.pay_cash)
    OR p_status IS NULL OR p_status NOT IN (v_c.hp_collected, v_c.hp_failed, v_c.hp_cancelled, v_c.hp_reversed, v_c.hp_disputed)
  THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF p_status <> v_c.hp_collected
    AND (NOT private.catalog_has_non_whitespace(v_clean_reason) OR pg_catalog.char_length(v_clean_reason) NOT BETWEEN 3 AND 500)
  THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  SELECT ord.* INTO v_ord
  FROM public.orders AS ord
  WHERE ord.id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  v_sensitive := p_status IN (v_c.hp_reversed, v_c.hp_disputed);

  IF NOT public.orders_has_permission(
    v_ord.organization_id,
    v_ord.establishment_id,
    v_ord.branch_id,
    CASE WHEN v_sensitive THEN v_c.perm_handoff_sensitive ELSE v_c.perm_handoff_write END
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF v_sensitive AND NOT private.consume_orders_step_up_proof(
    p_step_up_proof_id,
    v_actor_id,
    v_ord.organization_id,
    v_ord.establishment_id,
    v_ord.branch_id,
    v_ord.id
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_step_up_required, ERRCODE = v_c.sqlstate_42501;
  END IF;

  INSERT INTO public.order_handoff_payments (
    organization_id, order_id, payment_method, amount, currency, status, reason, actor_user_id, correlation_id
  ) VALUES (
    v_ord.organization_id, v_ord.id, p_payment_method, v_ord.total_amount, v_c.currency_brl,
    p_status, v_clean_reason, v_actor_id, p_correlation_id
  );

  UPDATE public.orders
  SET handoff_payment_status = p_status, updated_at = pg_catalog.now()
  WHERE id = v_ord.id;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, v_ord.organization_id, v_ord.establishment_id, v_ord.branch_id,
    v_c.action_handoff_recorded, v_c.target_order, v_ord.id,
    v_c.outcome_allow, v_c.reason_handoff_recorded, p_correlation_id, v_c.source_orders_command,
    pg_catalog.jsonb_build_object(
      v_c.meta_order_number, v_ord.order_number,
      v_c.meta_handoff_status, p_status,
      v_c.meta_payment_method, p_payment_method,
      v_c.meta_amount, v_ord.total_amount::text
    )
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_order_id, v_ord.id,
    'handoff_payment_status', p_status,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_record_handoff_payment(uuid, text, text, text, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_record_handoff_payment(uuid, text, text, text, uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.orders_list_available_offers(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid
)
RETURNS TABLE (
  offer_id uuid,
  display_label text,
  base_price numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.orders_literal_constants := private.get_orders_literal_constants();
BEGIN
  IF NOT public.orders_has_permission(
    p_organization_id,
    p_establishment_id,
    p_branch_id,
    v_c.perm_orders_read
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_orders_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  RETURN QUERY
  SELECT
    co.id AS offer_id,
    COALESCE(
      co.title_override,
      CASE
        WHEN pv.id IS NOT NULL THEN pr.name || ' · ' || pv.name
        ELSE pr.name
      END
    ) AS display_label,
    co.base_price
  FROM public.channel_offers AS co
  JOIN public.sales_channels AS sc
    ON sc.organization_id = co.organization_id
    AND sc.id = co.sales_channel_id
    AND sc.channel_key = v_c.channel_goodz_online
    AND sc.status = v_c.status_active
  LEFT JOIN public.product_variants AS pv
    ON pv.organization_id = co.organization_id
    AND pv.id = co.variant_id
    AND pv.status = v_c.status_active
  JOIN public.products AS pr
    ON pr.organization_id = co.organization_id
    AND pr.id = COALESCE(co.product_id, pv.product_id)
    AND pr.status = v_c.status_active
  WHERE co.organization_id = p_organization_id
    AND co.establishment_id = p_establishment_id
    AND co.branch_id = p_branch_id
    AND co.status = v_c.status_active
    AND co.is_visible IS TRUE
    AND co.availability_state = 'available'
    AND co.base_price IS NOT NULL
    AND (co.variant_id IS NULL OR pv.id IS NOT NULL)
  ORDER BY display_label ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.orders_list_available_offers(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_list_available_offers(uuid, uuid, uuid)
  TO authenticated;
