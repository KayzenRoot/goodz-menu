CREATE SCHEMA IF NOT EXISTS private;

INSERT INTO public.permissions (permission_key, display_name)
VALUES
  ('catalog.read', 'Read catalog'),
  ('catalog.write', 'Manage catalog metadata'),
  ('catalog.price.write', 'Change catalog base prices'),
  ('catalog.availability.write', 'Change catalog availability')
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_catalog_role_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_permission text;
BEGIN
  IF NEW.role_key IN ('owner', 'admin') THEN
    FOREACH v_permission IN ARRAY ARRAY[
      'catalog.read', 'catalog.write', 'catalog.price.write', 'catalog.availability.write'
    ] LOOP
      INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
      VALUES (NEW.organization_id, NEW.id, v_permission)
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF NEW.role_key = 'staff' THEN
    INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
    VALUES
      (NEW.organization_id, NEW.id, 'catalog.read'),
      (NEW.organization_id, NEW.id, 'catalog.write')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_catalog_role_permissions() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER tenant_roles_seed_catalog_permissions
AFTER INSERT ON public.tenant_roles
FOR EACH ROW
EXECUTE FUNCTION private.seed_catalog_role_permissions();

INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, permission.permission_key
FROM public.tenant_roles AS role
CROSS JOIN LATERAL unnest(
  CASE role.role_key
    WHEN 'owner' THEN ARRAY['catalog.read', 'catalog.write', 'catalog.price.write', 'catalog.availability.write']::text[]
    WHEN 'admin' THEN ARRAY['catalog.read', 'catalog.write', 'catalog.price.write', 'catalog.availability.write']::text[]
    WHEN 'staff' THEN ARRAY['catalog.read', 'catalog.write']::text[]
    ELSE ARRAY[]::text[]
  END
) AS permission(permission_key)
ON CONFLICT DO NOTHING;

CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  parent_id uuid,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT product_categories_organization_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE RESTRICT,
  CONSTRAINT product_categories_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT product_categories_parent_tenant_fkey
    FOREIGN KEY (organization_id, parent_id) REFERENCES public.product_categories (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_categories_not_self_parent_check CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT product_categories_name_check CHECK (name ~ '[^[:space:]]' AND char_length(name) <= 120),
  CONSTRAINT product_categories_description_check CHECK (char_length(description) <= 2000),
  CONSTRAINT product_categories_status_check CHECK (status IN ('active', 'archived'))
);

CREATE UNIQUE INDEX product_categories_root_name_key
  ON public.product_categories (organization_id, pg_catalog.lower(name))
  WHERE parent_id IS NULL;
CREATE UNIQUE INDEX product_categories_child_name_key
  ON public.product_categories (organization_id, parent_id, pg_catalog.lower(name))
  WHERE parent_id IS NOT NULL;
CREATE INDEX product_categories_org_status_idx
  ON public.product_categories (organization_id, status, name);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT products_organization_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE RESTRICT,
  CONSTRAINT products_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT products_category_tenant_fkey
    FOREIGN KEY (organization_id, category_id) REFERENCES public.product_categories (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT products_name_check CHECK (name ~ '[^[:space:]]' AND char_length(name) <= 160),
  CONSTRAINT products_description_check CHECK (char_length(description) <= 5000),
  CONSTRAINT products_status_check CHECK (status IN ('active', 'archived'))
);

CREATE INDEX products_org_status_name_idx ON public.products (organization_id, status, name);
CREATE INDEX products_category_idx ON public.products (organization_id, category_id) WHERE category_id IS NOT NULL;

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  name text NOT NULL,
  size_label text,
  flavor_label text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT product_variants_organization_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE RESTRICT,
  CONSTRAINT product_variants_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT product_variants_product_tenant_fkey
    FOREIGN KEY (organization_id, product_id) REFERENCES public.products (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT product_variants_name_check CHECK (name ~ '[^[:space:]]' AND char_length(name) <= 120),
  CONSTRAINT product_variants_size_label_check CHECK (size_label IS NULL OR (size_label ~ '[^[:space:]]' AND char_length(size_label) <= 80)),
  CONSTRAINT product_variants_flavor_label_check CHECK (flavor_label IS NULL OR (flavor_label ~ '[^[:space:]]' AND char_length(flavor_label) <= 80)),
  CONSTRAINT product_variants_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT product_variants_product_name_key UNIQUE (organization_id, product_id, name)
);

CREATE INDEX product_variants_org_product_status_idx
  ON public.product_variants (organization_id, product_id, status, name);

CREATE TABLE public.sales_channels (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  channel_key text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT sales_channels_organization_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE RESTRICT,
  CONSTRAINT sales_channels_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT sales_channels_channel_key_check CHECK (channel_key IN ('goodz_online', 'pickup', 'delivery')),
  CONSTRAINT sales_channels_display_name_check CHECK (display_name ~ '[^[:space:]]' AND char_length(display_name) <= 100),
  CONSTRAINT sales_channels_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT sales_channels_organization_channel_key UNIQUE (organization_id, channel_key)
);

CREATE INDEX sales_channels_org_status_idx ON public.sales_channels (organization_id, status, channel_key);

CREATE OR REPLACE FUNCTION private.seed_default_sales_channels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.sales_channels (organization_id, channel_key, display_name)
  VALUES
    (NEW.id, 'goodz_online', 'Goodz Online'),
    (NEW.id, 'pickup', 'Retirada'),
    (NEW.id, 'delivery', 'Entrega')
  ON CONFLICT (organization_id, channel_key) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_default_sales_channels() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER organizations_seed_catalog_channels
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION private.seed_default_sales_channels();

INSERT INTO public.sales_channels (organization_id, channel_key, display_name)
SELECT organization_row.id, channel.channel_key, channel.display_name
FROM public.organizations AS organization_row
CROSS JOIN (VALUES
  ('goodz_online', 'Goodz Online'),
  ('pickup', 'Retirada'),
  ('delivery', 'Entrega')
) AS channel(channel_key, display_name)
ON CONFLICT (organization_id, channel_key) DO NOTHING;

CREATE TABLE public.channel_offers (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid,
  branch_id uuid,
  sales_channel_id uuid NOT NULL,
  target_kind text NOT NULL,
  product_id uuid,
  variant_id uuid,
  title_override text,
  description_override text,
  base_price numeric(12, 2),
  currency text NOT NULL DEFAULT 'BRL',
  availability_state text NOT NULL DEFAULT 'unknown',
  is_visible boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT channel_offers_organization_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE RESTRICT,
  CONSTRAINT channel_offers_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT channel_offers_establishment_scope_fkey
    FOREIGN KEY (organization_id, establishment_id) REFERENCES public.establishments (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT channel_offers_branch_scope_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id) REFERENCES public.branches (organization_id, establishment_id, id) ON DELETE RESTRICT,
  CONSTRAINT channel_offers_channel_tenant_fkey
    FOREIGN KEY (organization_id, sales_channel_id) REFERENCES public.sales_channels (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT channel_offers_product_tenant_fkey
    FOREIGN KEY (organization_id, product_id) REFERENCES public.products (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT channel_offers_variant_tenant_fkey
    FOREIGN KEY (organization_id, variant_id) REFERENCES public.product_variants (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT channel_offers_scope_shape_check
    CHECK (branch_id IS NULL OR establishment_id IS NOT NULL),
  CONSTRAINT channel_offers_target_shape_check
    CHECK ((target_kind = 'product' AND product_id IS NOT NULL AND variant_id IS NULL)
      OR (target_kind = 'variant' AND product_id IS NULL AND variant_id IS NOT NULL)),
  CONSTRAINT channel_offers_price_check
    CHECK (base_price IS NULL OR base_price >= 0),
  CONSTRAINT channel_offers_currency_check CHECK (currency = 'BRL'),
  CONSTRAINT channel_offers_availability_check CHECK (availability_state IN ('unknown', 'available', 'unavailable')),
  CONSTRAINT channel_offers_visible_check
    CHECK (NOT is_visible OR (base_price IS NOT NULL AND availability_state = 'available')),
  CONSTRAINT channel_offers_archived_hidden_check CHECK (status <> 'archived' OR NOT is_visible),
  CONSTRAINT channel_offers_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT channel_offers_title_override_check
    CHECK (title_override IS NULL OR (title_override ~ '[^[:space:]]' AND char_length(title_override) <= 160)),
  CONSTRAINT channel_offers_description_override_check
    CHECK (description_override IS NULL OR char_length(description_override) <= 2000)
);

CREATE UNIQUE INDEX channel_offers_identity_scope_key
  ON public.channel_offers (
    organization_id,
    sales_channel_id,
    (COALESCE(establishment_id, '00000000-0000-4000-8000-000000000000'::uuid)),
    (COALESCE(branch_id, '00000000-0000-4000-8000-000000000000'::uuid)),
    (COALESCE(product_id, '00000000-0000-4000-8000-000000000000'::uuid)),
    (COALESCE(variant_id, '00000000-0000-4000-8000-000000000000'::uuid))
  );
CREATE INDEX channel_offers_org_scope_status_idx
  ON public.channel_offers (organization_id, establishment_id, branch_id, status, sales_channel_id);
CREATE INDEX channel_offers_product_idx
  ON public.channel_offers (organization_id, product_id) WHERE product_id IS NOT NULL;
CREATE INDEX channel_offers_variant_idx
  ON public.channel_offers (organization_id, variant_id) WHERE variant_id IS NOT NULL;

CREATE TABLE public.channel_offer_price_history (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  channel_offer_id uuid NOT NULL,
  version integer NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  actor_user_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT channel_offer_price_history_offer_tenant_fkey
    FOREIGN KEY (organization_id, channel_offer_id) REFERENCES public.channel_offers (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT channel_offer_price_history_actor_fkey
    FOREIGN KEY (actor_user_id) REFERENCES auth.users (id) ON DELETE RESTRICT,
  CONSTRAINT channel_offer_price_history_version_check CHECK (version > 0),
  CONSTRAINT channel_offer_price_history_amount_check CHECK (amount >= 0),
  CONSTRAINT channel_offer_price_history_currency_check CHECK (currency = 'BRL'),
  CONSTRAINT channel_offer_price_history_version_key UNIQUE (organization_id, channel_offer_id, version)
);

CREATE INDEX channel_offer_price_history_offer_version_idx
  ON public.channel_offer_price_history (organization_id, channel_offer_id, version DESC);

CREATE TABLE private.catalog_step_up_consumptions (
  guard_event_id uuid PRIMARY KEY REFERENCES public.audit_events (id) ON DELETE RESTRICT,
  consumed_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  consumed_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE private.catalog_step_up_consumptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE private.catalog_step_up_consumptions FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_valid_catalog_audit_metadata(p_action text, p_metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_permissions jsonb;
  v_proof text;
BEGIN
  IF pg_catalog.jsonb_typeof(p_metadata) IS DISTINCT FROM 'object'
    OR pg_catalog.octet_length(p_metadata::text) > 1024
  THEN
    RETURN false;
  END IF;

  IF p_action = 'catalog.privileged.step_up' THEN
    IF p_metadata - ARRAY['required_permissions', 'step_up_proof_id']::text[] <> '{}'::jsonb
      OR NOT (p_metadata ? 'required_permissions')
      OR pg_catalog.jsonb_typeof(p_metadata->'required_permissions') IS DISTINCT FROM 'array'
    THEN
      RETURN false;
    END IF;
    v_permissions := p_metadata->'required_permissions';
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements_text(v_permissions) AS permission(value)
      WHERE permission.value IS NULL
        OR permission.value NOT IN ('catalog.price.write', 'catalog.availability.write')
    ) THEN
      RETURN false;
    END IF;
    IF p_metadata ? 'step_up_proof_id' THEN
      v_proof := p_metadata->>'step_up_proof_id';
      IF v_proof IS NULL OR v_proof !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN false;
      END IF;
    END IF;
    RETURN true;
  END IF;

  IF p_action IN ('catalog.offer.commercial_created', 'catalog.offer.commercial_updated') THEN
    RETURN COALESCE(p_metadata ? 'changed_fields'
      AND pg_catalog.jsonb_typeof(p_metadata->'changed_fields') = 'array'
      AND p_metadata - ARRAY[
        'changed_fields', 'old_base_price', 'new_base_price', 'currency',
        'old_availability', 'new_availability', 'old_visibility', 'new_visibility'
      ]::text[] = '{}'::jsonb, false);
  END IF;

  RETURN COALESCE(p_metadata ? 'changed_fields'
    AND pg_catalog.jsonb_typeof(p_metadata->'changed_fields') = 'array'
    AND p_metadata - ARRAY['changed_fields']::text[] = '{}'::jsonb, false);
END;
$function$;

REVOKE ALL ON FUNCTION private.is_valid_catalog_audit_metadata(text, jsonb) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (action IN (
  'synthetic.privileged.proof',
  'catalog.privileged.step_up',
  'catalog.category.created', 'catalog.category.updated', 'catalog.category.archived',
  'catalog.product.created', 'catalog.product.updated', 'catalog.product.archived',
  'catalog.variant.created', 'catalog.variant.updated', 'catalog.variant.archived',
  'catalog.channel.created', 'catalog.channel.updated', 'catalog.channel.archived',
  'catalog.offer.created', 'catalog.offer.updated', 'catalog.offer.archived',
  'catalog.offer.commercial_created', 'catalog.offer.commercial_updated'
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_type_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_type_check CHECK (target_type IN (
  'branch', 'product_category', 'product', 'product_variant', 'sales_channel', 'channel_offer'
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_reason_code_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_reason_code_check CHECK (reason_code IN (
  'authorized', 'invalid_scope', 'unauthenticated', 'identity_unverified', 'authorization_denied',
  'aal2_required', 'factor_unverified', 'reauthentication_required', 'step_up_required',
  'catalog_created', 'catalog_updated', 'catalog_archived', 'catalog_commercial_updated'
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_source_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_source_check CHECK (source IN (
  'admin_guard', 'catalog_command'
));

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_metadata_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_metadata_check CHECK (
  pg_catalog.jsonb_typeof(metadata) = 'object'
  AND pg_catalog.octet_length(metadata::text) <= 1024
  AND (
    (action = 'synthetic.privileged.proof'
      AND metadata = '{"required_permission":"tenant.hierarchy.read"}'::jsonb)
    OR (action LIKE 'catalog.%' AND private.is_valid_catalog_audit_metadata(action, metadata) IS TRUE)
  )
);

ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_action_shape_check CHECK (
  (action = 'synthetic.privileged.proof' AND target_type = 'branch' AND source = 'admin_guard')
  OR (action = 'catalog.privileged.step_up' AND target_type = 'channel_offer' AND source = 'admin_guard')
  OR (action LIKE 'catalog.category.%' AND target_type = 'product_category' AND source = 'catalog_command')
  OR (action LIKE 'catalog.product.%' AND target_type = 'product' AND source = 'catalog_command')
  OR (action LIKE 'catalog.variant.%' AND target_type = 'product_variant' AND source = 'catalog_command')
  OR (action LIKE 'catalog.channel.%' AND target_type = 'sales_channel' AND source = 'catalog_command')
  OR (action LIKE 'catalog.offer.%' AND target_type = 'channel_offer' AND source = 'catalog_command')
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_offer_price_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.product_categories, public.products, public.product_variants, public.sales_channels,
  public.channel_offers, public.channel_offer_price_history
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.product_categories, public.products, public.product_variants, public.sales_channels,
  public.channel_offers, public.channel_offer_price_history
TO authenticated;

CREATE OR REPLACE FUNCTION public.catalog_has_permission(
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
    AND p_permission_key IN ('catalog.read', 'catalog.write', 'catalog.price.write', 'catalog.availability.write')
    AND (p_branch_id IS NULL OR p_establishment_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.organizations AS organization_row
      WHERE organization_row.id = p_organization_id AND organization_row.status = 'active'
    )
    AND (
      p_establishment_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.establishments AS establishment_row
        WHERE establishment_row.organization_id = p_organization_id
          AND establishment_row.id = p_establishment_id
          AND establishment_row.status = 'active'
      )
    )
    AND (
      p_branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches AS branch_row
        WHERE branch_row.organization_id = p_organization_id
          AND branch_row.establishment_id = p_establishment_id
          AND branch_row.id = p_branch_id
          AND branch_row.status = 'active'
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
        AND membership.status = 'active'
        AND role_permission.permission_key = p_permission_key
        AND CASE
          WHEN p_branch_id IS NOT NULL THEN
            assignment.scope_type = 'organization'
            OR (assignment.scope_type = 'establishment' AND assignment.establishment_id = p_establishment_id)
            OR (assignment.scope_type = 'branch'
              AND assignment.establishment_id = p_establishment_id
              AND assignment.branch_id = p_branch_id)
          WHEN p_establishment_id IS NOT NULL THEN
            assignment.scope_type = 'organization'
            OR (assignment.scope_type = 'establishment' AND assignment.establishment_id = p_establishment_id)
          ELSE assignment.scope_type = 'organization'
        END
    );
$function$;

REVOKE ALL ON FUNCTION public.catalog_has_permission(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_has_permission(uuid, uuid, uuid, text) TO authenticated;

CREATE POLICY product_categories_catalog_select ON public.product_categories
FOR SELECT TO authenticated
USING ((SELECT public.catalog_has_permission(organization_id, NULL, NULL, 'catalog.read')));

CREATE POLICY products_catalog_select ON public.products
FOR SELECT TO authenticated
USING ((SELECT public.catalog_has_permission(organization_id, NULL, NULL, 'catalog.read')));

CREATE POLICY product_variants_catalog_select ON public.product_variants
FOR SELECT TO authenticated
USING ((SELECT public.catalog_has_permission(organization_id, NULL, NULL, 'catalog.read')));

CREATE POLICY sales_channels_catalog_select ON public.sales_channels
FOR SELECT TO authenticated
USING ((SELECT public.catalog_has_permission(organization_id, NULL, NULL, 'catalog.read')));

CREATE POLICY channel_offers_catalog_select ON public.channel_offers
FOR SELECT TO authenticated
USING ((SELECT public.catalog_has_permission(organization_id, establishment_id, branch_id, 'catalog.read')));

CREATE POLICY channel_offer_price_history_catalog_select ON public.channel_offer_price_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channel_offers AS offer
    WHERE offer.organization_id = channel_offer_price_history.organization_id
      AND offer.id = channel_offer_price_history.channel_offer_id
      AND public.catalog_has_permission(offer.organization_id, offer.establishment_id, offer.branch_id, 'catalog.read')
  )
);

CREATE OR REPLACE FUNCTION private.reject_catalog_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Catalog price history is immutable.' USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.reject_catalog_history_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER channel_offer_price_history_immutable
BEFORE UPDATE OR DELETE ON public.channel_offer_price_history
FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_history_mutation();
