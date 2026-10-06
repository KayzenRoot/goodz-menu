-- GMZ-IMPL-007 — Catalog Core & Channel Offers Foundation: physical catalog schema.
--
-- Architecture invariants encoded here:
--   * ProductCategory is tenant aware, hierarchical, deterministically ordered and archivable.
--   * Product is canonical and channel independent: no sales-channel or provider column exists on it,
--     so a canonical product can never be duplicated per channel.
--   * ProductVariant points at exactly one canonical Product and may never cross tenants.
--   * SalesChannel is explicit channel identity only: it carries no provider adapter, endpoint or
--     credential surface, so a provider schema can never become the canonical schema.
--   * ChannelOffer owns channel-specific commercial and presentation state for exactly one canonical
--     Product or ProductVariant in exactly one SalesChannel.
--   * Money is persisted as exact NUMERIC(19,4); binary floating point is never used.
--   * Prior commercial truth is reconstructable: channel_offer_price_history is append-only and is
--     never updated or deleted, and catalog rows are never hard deleted.

-- ---------------------------------------------------------------------------
-- 1. Durable audit vocabulary widening
-- ---------------------------------------------------------------------------
-- public.audit_events was pinned by single-value CHECK constraints to the GMZ-IMPL-005 synthetic
-- Admin Guard proof. Catalog material mutations need their own action/target/source vocabulary, but
-- the service-role writer public.append_audit_event stays restricted to the admin_guard vocabulary
-- so that no service-role path can ever author a catalog business audit row.

CREATE OR REPLACE FUNCTION private.is_safe_audit_metadata(p_metadata jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT
    p_metadata IS NOT NULL
    AND pg_catalog.jsonb_typeof(p_metadata) = 'object'
    AND pg_catalog.octet_length(p_metadata::text) <= 1024
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_object_keys(p_metadata) AS metadata_key
      WHERE metadata_key NOT IN (
        'required_permission',
        'resource_kind',
        'changed_fields',
        'previous_value',
        'next_value'
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_each(p_metadata) AS metadata_entry(metadata_key, metadata_value)
      WHERE NOT (
        pg_catalog.jsonb_typeof(metadata_entry.metadata_value) = 'string'
        OR pg_catalog.jsonb_typeof(metadata_entry.metadata_value) = 'null'
        OR (
          pg_catalog.jsonb_typeof(metadata_entry.metadata_value) = 'array'
          AND pg_catalog.jsonb_array_length(metadata_entry.metadata_value) <= 16
          AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.jsonb_array_elements(metadata_entry.metadata_value) AS metadata_item
            WHERE pg_catalog.jsonb_typeof(metadata_item) <> 'string'
              OR pg_catalog.length(metadata_item #>> '{}') > 64
          )
        )
      )
      OR pg_catalog.length(metadata_entry.metadata_value #>> '{}') > 240
    );
$function$;

REVOKE ALL ON FUNCTION private.is_safe_audit_metadata(jsonb) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_events
  DROP CONSTRAINT audit_events_action_check,
  DROP CONSTRAINT audit_events_target_type_check,
  DROP CONSTRAINT audit_events_source_check,
  DROP CONSTRAINT audit_events_metadata_check;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_action_check
    CHECK (action IN (
      'synthetic.privileged.proof',
      'catalog.category.created',
      'catalog.category.updated',
      'catalog.category.archived',
      'catalog.category.reactivated',
      'catalog.product.created',
      'catalog.product.updated',
      'catalog.product.archived',
      'catalog.product.reactivated',
      'catalog.variant.created',
      'catalog.variant.updated',
      'catalog.variant.archived',
      'catalog.variant.reactivated',
      'catalog.sales_channel.created',
      'catalog.sales_channel.updated',
      'catalog.sales_channel.archived',
      'catalog.channel_offer.created',
      'catalog.channel_offer.updated',
      'catalog.channel_offer.price_changed',
      'catalog.channel_offer.promotional_price_changed',
      'catalog.channel_offer.availability_changed',
      'catalog.channel_offer.visibility_changed'
    )),
  ADD CONSTRAINT audit_events_target_type_check
    CHECK (target_type IN (
      'branch',
      'product_category',
      'product',
      'product_variant',
      'sales_channel',
      'channel_offer'
    )),
  ADD CONSTRAINT audit_events_source_check
    CHECK (source IN ('admin_guard', 'catalog_contract')),
  ADD CONSTRAINT audit_events_metadata_check
    CHECK (
      CASE source
        WHEN 'admin_guard' THEN metadata = '{"required_permission":"tenant.hierarchy.read"}'::jsonb
        ELSE private.is_safe_audit_metadata(metadata)
      END
    );

-- Catalog contract events are always a persisted material mutation. A denied catalog command never
-- reaches this table because the contract raises before any write, so a catalog event is always an
-- allow/authorized pair resolved against the caller's own verified session.
ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_catalog_authorization_check
    CHECK (
      source <> 'catalog_contract'
      OR (
        outcome = 'allow'
        AND reason_code = 'authorized'
        AND actor_user_id IS NOT NULL
        AND organization_id IS NOT NULL
        AND target_id IS NOT NULL
      )
    );

CREATE INDEX audit_events_organization_target_idx
  ON public.audit_events (organization_id, target_type, target_id, created_at DESC)
  WHERE source = 'catalog_contract';

-- ---------------------------------------------------------------------------
-- 2. ProductCategory
-- ---------------------------------------------------------------------------

CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid,
  branch_id uuid,
  parent_category_id uuid,
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT product_categories_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT product_categories_establishment_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT product_categories_branch_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE RESTRICT,
  -- Composite parent key: a category can never adopt a parent from another tenant.
  CONSTRAINT product_categories_parent_tenant_fkey
    FOREIGN KEY (organization_id, parent_category_id)
    REFERENCES public.product_categories (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT product_categories_organization_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT product_categories_scope_shape_check
    CHECK (branch_id IS NULL OR establishment_id IS NOT NULL),
  CONSTRAINT product_categories_parent_not_self_check
    CHECK (parent_category_id IS DISTINCT FROM id),
  CONSTRAINT product_categories_name_check
    CHECK (name ~ '[^[:space:]]' AND char_length(name) <= 120),
  CONSTRAINT product_categories_description_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT product_categories_display_order_check
    CHECK (display_order BETWEEN -100000 AND 100000),
  CONSTRAINT product_categories_status_check
    CHECK (status IN ('active', 'archived')),
  CONSTRAINT product_categories_archival_state_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);

CREATE INDEX product_categories_tenant_order_idx
  ON public.product_categories (organization_id, parent_category_id NULLS FIRST, display_order, name, id);
-- COALESCE keeps root categories in the uniqueness rule: a plain UNIQUE treats NULLs as distinct.
CREATE UNIQUE INDEX product_categories_sibling_name_key
  ON public.product_categories (
    organization_id,
    COALESCE(parent_category_id, '00000000-0000-4000-8000-000000000000'::uuid),
    name
  );
CREATE INDEX product_categories_branch_scope_idx
  ON public.product_categories (organization_id, establishment_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Product (canonical, channel independent)
-- ---------------------------------------------------------------------------

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid,
  branch_id uuid,
  category_id uuid,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT products_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT products_establishment_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT products_branch_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT products_category_tenant_fkey
    FOREIGN KEY (organization_id, category_id)
    REFERENCES public.product_categories (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT products_organization_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT products_tenant_name_key
    UNIQUE (organization_id, name),
  CONSTRAINT products_scope_shape_check
    CHECK (branch_id IS NULL OR establishment_id IS NOT NULL),
  CONSTRAINT products_name_check
    CHECK (name ~ '[^[:space:]]' AND char_length(name) <= 120),
  CONSTRAINT products_description_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT products_status_check
    CHECK (status IN ('active', 'archived')),
  CONSTRAINT products_archival_state_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);

CREATE INDEX products_tenant_order_idx
  ON public.products (organization_id, name, id);
CREATE INDEX products_category_idx
  ON public.products (organization_id, category_id, name, id)
  WHERE category_id IS NOT NULL;
CREATE INDEX products_branch_scope_idx
  ON public.products (organization_id, establishment_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. ProductVariant (exactly one canonical Product)
-- ---------------------------------------------------------------------------

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid,
  branch_id uuid,
  product_id uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT product_variants_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT product_variants_establishment_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT product_variants_branch_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE RESTRICT,
  -- A variant can never belong to a product of another tenant.
  CONSTRAINT product_variants_product_tenant_fkey
    FOREIGN KEY (organization_id, product_id)
    REFERENCES public.products (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT product_variants_organization_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT product_variants_product_name_key
    UNIQUE (organization_id, product_id, name),
  CONSTRAINT product_variants_scope_shape_check
    CHECK (branch_id IS NULL OR establishment_id IS NOT NULL),
  CONSTRAINT product_variants_name_check
    CHECK (name ~ '[^[:space:]]' AND char_length(name) <= 120),
  CONSTRAINT product_variants_status_check
    CHECK (status IN ('active', 'archived')),
  CONSTRAINT product_variants_archival_state_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);

CREATE INDEX product_variants_product_order_idx
  ON public.product_variants (organization_id, product_id, status, name, id);

-- ---------------------------------------------------------------------------
-- 5. SalesChannel (explicit channel identity, never a provider adapter)
-- ---------------------------------------------------------------------------

CREATE TABLE public.sales_channels (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  channel_key text NOT NULL,
  display_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT sales_channels_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT sales_channels_organization_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT sales_channels_tenant_key_key
    UNIQUE (organization_id, channel_key),
  CONSTRAINT sales_channels_channel_key_check
    CHECK (channel_key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  CONSTRAINT sales_channels_display_name_check
    CHECK (display_name ~ '[^[:space:]]' AND char_length(display_name) <= 120),
  CONSTRAINT sales_channels_description_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT sales_channels_status_check
    CHECK (status IN ('active', 'archived')),
  CONSTRAINT sales_channels_archival_state_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);

CREATE INDEX sales_channels_tenant_order_idx
  ON public.sales_channels (organization_id, display_name, id);

-- ---------------------------------------------------------------------------
-- 6. ChannelOffer (channel-specific commercial and presentation state)
-- ---------------------------------------------------------------------------

CREATE TABLE public.channel_offers (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid,
  branch_id uuid,
  sales_channel_id uuid NOT NULL,
  product_id uuid,
  product_variant_id uuid,
  title text,
  description text,
  base_price_amount numeric(19,4) NOT NULL,
  base_price_currency text NOT NULL,
  promotional_price_amount numeric(19,4),
  availability text NOT NULL DEFAULT 'available',
  visibility text NOT NULL DEFAULT 'visible',
  status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  price_revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT channel_offers_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offers_establishment_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offers_branch_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offers_sales_channel_tenant_fkey
    FOREIGN KEY (organization_id, sales_channel_id)
    REFERENCES public.sales_channels (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offers_product_tenant_fkey
    FOREIGN KEY (organization_id, product_id)
    REFERENCES public.products (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offers_product_variant_tenant_fkey
    FOREIGN KEY (organization_id, product_variant_id)
    REFERENCES public.product_variants (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offers_organization_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT channel_offers_scope_shape_check
    CHECK (branch_id IS NULL OR establishment_id IS NOT NULL),
  -- Exactly one canonical target: a Product or a ProductVariant, never both and never neither.
  CONSTRAINT channel_offers_single_target_check
    CHECK (num_nonnulls(product_id, product_variant_id) = 1),
  CONSTRAINT channel_offers_title_check
    CHECK (title IS NULL OR (char_length(title) BETWEEN 1 AND 120)),
  CONSTRAINT channel_offers_description_check
    CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT channel_offers_currency_check
    CHECK (base_price_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT channel_offers_base_price_check
    CHECK (base_price_amount >= 0),
  -- A promotional price is only a valid commercial state when it is a strict reduction.
  CONSTRAINT channel_offers_promotional_price_check
    CHECK (
      promotional_price_amount IS NULL
      OR (promotional_price_amount >= 0 AND promotional_price_amount < base_price_amount)
    ),
  CONSTRAINT channel_offers_availability_check
    CHECK (availability IN ('available', 'unavailable')),
  CONSTRAINT channel_offers_visibility_check
    CHECK (visibility IN ('visible', 'hidden')),
  CONSTRAINT channel_offers_status_check
    CHECK (status IN ('active', 'archived')),
  CONSTRAINT channel_offers_archival_state_check
    CHECK ((status = 'archived') = (archived_at IS NOT NULL)),
  CONSTRAINT channel_offers_price_revision_check
    CHECK (price_revision >= 1)
);

-- One offer per canonical target per channel: the product is never duplicated per channel.
CREATE UNIQUE INDEX channel_offers_channel_product_key
  ON public.channel_offers (organization_id, sales_channel_id, product_id)
  WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX channel_offers_channel_variant_key
  ON public.channel_offers (organization_id, sales_channel_id, product_variant_id)
  WHERE product_variant_id IS NOT NULL;

CREATE INDEX channel_offers_tenant_order_idx
  ON public.channel_offers (organization_id, sales_channel_id, title NULLS FIRST, id);
CREATE INDEX channel_offers_product_idx
  ON public.channel_offers (organization_id, product_id, sales_channel_id)
  WHERE product_id IS NOT NULL;
CREATE INDEX channel_offers_product_variant_idx
  ON public.channel_offers (organization_id, product_variant_id, sales_channel_id)
  WHERE product_variant_id IS NOT NULL;
CREATE INDEX channel_offers_branch_scope_idx
  ON public.channel_offers (organization_id, establishment_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Append-only price history and command receipts
-- ---------------------------------------------------------------------------

CREATE TABLE public.channel_offer_price_history (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  channel_offer_id uuid NOT NULL,
  price_revision integer NOT NULL,
  base_price_amount numeric(19,4) NOT NULL,
  base_price_currency text NOT NULL,
  promotional_price_amount numeric(19,4),
  availability text NOT NULL,
  visibility text NOT NULL,
  effective_from timestamptz NOT NULL,
  recorded_by_user_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  audit_event_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT channel_offer_price_history_offer_tenant_fkey
    FOREIGN KEY (organization_id, channel_offer_id)
    REFERENCES public.channel_offers (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offer_price_history_actor_fkey
    FOREIGN KEY (recorded_by_user_id)
    REFERENCES auth.users (id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offer_price_history_audit_fkey
    FOREIGN KEY (audit_event_id)
    REFERENCES public.audit_events (id)
    ON DELETE RESTRICT,
  CONSTRAINT channel_offer_price_history_revision_key
    UNIQUE (channel_offer_id, price_revision),
  CONSTRAINT channel_offer_price_history_revision_check
    CHECK (price_revision >= 1),
  CONSTRAINT channel_offer_price_history_currency_check
    CHECK (base_price_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT channel_offer_price_history_base_price_check
    CHECK (base_price_amount >= 0),
  CONSTRAINT channel_offer_price_history_promotional_price_check
    CHECK (
      promotional_price_amount IS NULL
      OR (promotional_price_amount >= 0 AND promotional_price_amount < base_price_amount)
    ),
  CONSTRAINT channel_offer_price_history_availability_check
    CHECK (availability IN ('available', 'unavailable')),
  CONSTRAINT channel_offer_price_history_visibility_check
    CHECK (visibility IN ('visible', 'hidden'))
);

-- Reconstruction uses effective_from ordering; a row is never rewritten to close its interval.
CREATE INDEX channel_offer_price_history_timeline_idx
  ON public.channel_offer_price_history (channel_offer_id, effective_from DESC);
CREATE INDEX channel_offer_price_history_organization_idx
  ON public.channel_offer_price_history (organization_id, effective_from DESC);
CREATE INDEX channel_offer_price_history_correlation_idx
  ON public.channel_offer_price_history (correlation_id);
CREATE INDEX channel_offer_price_history_audit_event_idx
  ON public.channel_offer_price_history (audit_event_id);

CREATE TABLE public.catalog_command_receipts (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  audit_event_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  resulting_price_revision integer,
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT catalog_command_receipts_organization_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT catalog_command_receipts_actor_fkey
    FOREIGN KEY (actor_user_id)
    REFERENCES auth.users (id)
    ON DELETE RESTRICT,
  CONSTRAINT catalog_command_receipts_audit_fkey
    FOREIGN KEY (audit_event_id)
    REFERENCES public.audit_events (id)
    ON DELETE RESTRICT,
  CONSTRAINT catalog_command_receipts_target_type_check
    CHECK (target_type IN (
      'product_category',
      'product',
      'product_variant',
      'sales_channel',
      'channel_offer'
    )),
  CONSTRAINT catalog_command_receipts_idempotency_key
    UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX catalog_command_receipts_organization_idx
  ON public.catalog_command_receipts (organization_id, recorded_at DESC);
CREATE INDEX catalog_command_receipts_audit_event_idx
  ON public.catalog_command_receipts (audit_event_id);

-- ---------------------------------------------------------------------------
-- 8. Structural guards: no hard delete, no rewritten history
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.reject_catalog_row_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Catalog rows cannot be hard deleted.'
    USING ERRCODE = '55000';
END;
$function$;

CREATE OR REPLACE FUNCTION private.reject_catalog_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Catalog price history and command receipts are append-only.'
    USING ERRCODE = '55000';
END;
$function$;

REVOKE ALL ON FUNCTION private.reject_catalog_row_delete() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.reject_catalog_history_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER product_categories_no_hard_delete
  BEFORE DELETE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_row_delete();
CREATE TRIGGER products_no_hard_delete
  BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_row_delete();
CREATE TRIGGER product_variants_no_hard_delete
  BEFORE DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_row_delete();
CREATE TRIGGER sales_channels_no_hard_delete
  BEFORE DELETE ON public.sales_channels
  FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_row_delete();
CREATE TRIGGER channel_offers_no_hard_delete
  BEFORE DELETE ON public.channel_offers
  FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_row_delete();

CREATE TRIGGER channel_offer_price_history_append_only
  BEFORE UPDATE OR DELETE ON public.channel_offer_price_history
  FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_history_mutation();
CREATE TRIGGER catalog_command_receipts_append_only
  BEFORE UPDATE OR DELETE ON public.catalog_command_receipts
  FOR EACH ROW EXECUTE FUNCTION private.reject_catalog_history_mutation();

-- ---------------------------------------------------------------------------
-- 9. Scope containment guards
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.catalog_scope_contains(
  p_parent_organization_id uuid,
  p_parent_establishment_id uuid,
  p_parent_branch_id uuid,
  p_child_organization_id uuid,
  p_child_establishment_id uuid,
  p_child_branch_id uuid
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT
    p_child_organization_id = p_parent_organization_id
    AND (p_parent_establishment_id IS NULL OR p_child_establishment_id = p_parent_establishment_id)
    AND (p_parent_branch_id IS NULL OR p_child_branch_id = p_parent_branch_id);
$function$;

REVOKE ALL ON FUNCTION private.catalog_scope_contains(uuid, uuid, uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_catalog_child_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_allowed boolean;
BEGIN
  IF TG_TABLE_NAME = 'product_variants' THEN
    SELECT private.catalog_scope_contains(
        parent_product.organization_id,
        parent_product.establishment_id,
        parent_product.branch_id,
        NEW.organization_id,
        NEW.establishment_id,
        NEW.branch_id
      )
    INTO v_allowed
    FROM public.products AS parent_product
    WHERE parent_product.organization_id = NEW.organization_id
      AND parent_product.id = NEW.product_id;

    IF v_allowed IS NOT TRUE THEN
      RAISE EXCEPTION 'Product variant scope must stay inside its canonical product scope.'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'channel_offers' THEN
    IF NEW.product_id IS NOT NULL THEN
      SELECT private.catalog_scope_contains(
          parent_product.organization_id,
          parent_product.establishment_id,
          parent_product.branch_id,
          NEW.organization_id,
          NEW.establishment_id,
          NEW.branch_id
        )
      INTO v_allowed
      FROM public.products AS parent_product
      WHERE parent_product.organization_id = NEW.organization_id
        AND parent_product.id = NEW.product_id;

      IF v_allowed IS NOT TRUE THEN
        RAISE EXCEPTION 'Channel offer scope must stay inside its canonical product scope.'
          USING ERRCODE = '23514';
      END IF;
    ELSE
      SELECT private.catalog_scope_contains(
          parent_variant.organization_id,
          parent_variant.establishment_id,
          parent_variant.branch_id,
          NEW.organization_id,
          NEW.establishment_id,
          NEW.branch_id
        )
      INTO v_allowed
      FROM public.product_variants AS parent_variant
      WHERE parent_variant.organization_id = NEW.organization_id
        AND parent_variant.id = NEW.product_variant_id;

      IF v_allowed IS NOT TRUE THEN
        RAISE EXCEPTION 'Channel offer scope must stay inside its canonical product variant scope.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'product_categories' THEN
    IF NEW.parent_category_id IS NOT NULL THEN
      SELECT private.catalog_scope_contains(
          parent_category.organization_id,
          parent_category.establishment_id,
          parent_category.branch_id,
          NEW.organization_id,
          NEW.establishment_id,
          NEW.branch_id
        )
      INTO v_allowed
      FROM public.product_categories AS parent_category
      WHERE parent_category.organization_id = NEW.organization_id
        AND parent_category.id = NEW.parent_category_id;

      IF v_allowed IS NOT TRUE THEN
        RAISE EXCEPTION 'Category scope must stay inside its parent category scope.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_catalog_child_scope() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER product_categories_scope_containment
  BEFORE INSERT OR UPDATE OF organization_id, establishment_id, branch_id, parent_category_id
  ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION private.guard_catalog_child_scope();
CREATE TRIGGER product_variants_scope_containment
  BEFORE INSERT OR UPDATE OF organization_id, establishment_id, branch_id, product_id
  ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION private.guard_catalog_child_scope();
CREATE TRIGGER channel_offers_scope_containment
  BEFORE INSERT OR UPDATE OF organization_id, establishment_id, branch_id, product_id, product_variant_id
  ON public.channel_offers
  FOR EACH ROW EXECUTE FUNCTION private.guard_catalog_child_scope();

-- ---------------------------------------------------------------------------
-- 10. RBAC capability catalog (reuses the existing permissions model)
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (permission_key, display_name)
VALUES
  ('catalog.read', 'Read catalog'),
  ('catalog.write', 'Manage catalog structure'),
  ('catalog.price.manage', 'Manage catalog prices'),
  ('catalog.availability.manage', 'Manage catalog availability and visibility');