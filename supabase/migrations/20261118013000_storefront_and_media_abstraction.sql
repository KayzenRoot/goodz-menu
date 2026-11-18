CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE private.storefront_literal_constants AS (
  perm_storefront_read text,
  perm_storefront_write text,
  status_active text,
  status_archived text,
  role_owner text,
  role_admin text,
  actor_staff text,
  actor_customer text,
  provider_external_https text,
  provider_supabase_storage text,
  provider_cdn_proxy text,
  mime_webp text,
  mime_avif text,
  mime_jpeg text,
  mime_png text,
  variant_thumb text,
  variant_hero text,
  variant_square text,
  layout_editorial text,
  layout_express text,
  accent_emerald text,
  accent_terracotta text,
  accent_amber text,
  card_glass text,
  card_minimal text,
  https_url_regex text,
  slug_regex text,
  uuid_regex text,
  sha256_algo text,
  hex_fmt text,
  action_storefront_step_up text,
  action_profile_upserted text,
  action_media_registered text,
  target_storefront_profile text,
  target_media_asset text,
  source_admin_guard text,
  source_storefront_command text,
  outcome_allow text,
  outcome_deny text,
  reason_authorized text,
  reason_profile_created text,
  reason_profile_updated text,
  reason_media_registered text,
  meta_required_permissions text,
  meta_step_up_proof_id text,
  meta_public_slug text,
  meta_layout_family text,
  meta_version text,
  meta_provider_key text,
  meta_product_id text,
  key_profile_id text,
  key_media_asset_id text,
  key_tracking_token text,
  key_audit_event_ids text,
  json_object text,
  json_array text,
  json_string text,
  json_number text,
  sqlstate_22023 text,
  sqlstate_42501 text,
  sqlstate_p0002 text,
  msg_storefront_auth_unavailable text,
  msg_storefront_input_invalid text,
  msg_storefront_entitlement_denied text,
  msg_storefront_step_up_required text,
  msg_storefront_not_found text
);

CREATE FUNCTION private.get_storefront_literal_constants()
RETURNS private.storefront_literal_constants
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT ROW(
    'storefront.read'::text,
    'storefront.write'::text,
    'active'::text,
    'archived'::text,
    'owner'::text,
    'admin'::text,
    'staff'::text,
    'customer_checkout'::text,
    'external_https'::text,
    'supabase_storage'::text,
    'cdn_proxy'::text,
    'image/webp'::text,
    'image/avif'::text,
    'image/jpeg'::text,
    'image/png'::text,
    'card_thumb'::text,
    'hero_banner'::text,
    'detail_square'::text,
    'editorial_bistro'::text,
    'express_grid'::text,
    'emerald_garden'::text,
    'terracotta_oven'::text,
    'midnight_amber'::text,
    'elevated_glass'::text,
    'crisp_minimal'::text,
    '^https://[^[:space:]"''<>]+$'::text,
    '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$'::text,
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text,
    'sha256'::text,
    'hex'::text,
    'storefront.privileged.step_up'::text,
    'storefront.profile.upserted'::text,
    'catalog.media.registered'::text,
    'storefront_profile'::text,
    'media_asset'::text,
    'admin_guard'::text,
    'storefront_command'::text,
    'allow'::text,
    'deny'::text,
    'authorized'::text,
    'storefront_profile_created'::text,
    'storefront_profile_updated'::text,
    'media_asset_registered'::text,
    'required_permissions'::text,
    'step_up_proof_id'::text,
    'public_slug'::text,
    'layout_family'::text,
    'version'::text,
    'provider_key'::text,
    'product_id'::text,
    'profile_id'::text,
    'media_asset_id'::text,
    'tracking_token'::text,
    'audit_event_ids'::text,
    'object'::text,
    'array'::text,
    'string'::text,
    'number'::text,
    '22023'::text,
    '42501'::text,
    'P0002'::text,
    'Storefront authorization is unavailable.'::text,
    'Storefront or media input is invalid.'::text,
    'Online orders entitlement is not active for this organization.'::text,
    'Storefront step-up verification is required.'::text,
    'Requested storefront or order status is unavailable.'::text
  )::private.storefront_literal_constants;
$function$;

REVOKE ALL ON TYPE private.storefront_literal_constants FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_storefront_literal_constants() FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON TYPE private.storefront_literal_constants TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_storefront_literal_constants() TO authenticated;

-- RBAC Permissions for Storefront Management
INSERT INTO public.permissions (permission_key, display_name)
VALUES
  ((private.get_storefront_literal_constants()).perm_storefront_read, 'Read branch storefront profile and media configuration'),
  ((private.get_storefront_literal_constants()).perm_storefront_write, 'Publish and configure branch storefront theme and media')
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.seed_storefront_role_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
BEGIN
  IF NEW.role_key IN (v_c.role_owner, v_c.role_admin) THEN
    INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
    VALUES
      (NEW.organization_id, NEW.id, v_c.perm_storefront_read),
      (NEW.organization_id, NEW.id, v_c.perm_storefront_write)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.role_key = v_c.actor_staff THEN
    INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
    VALUES (NEW.organization_id, NEW.id, v_c.perm_storefront_read)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.seed_storefront_role_permissions() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER tenant_roles_seed_storefront_permissions
AFTER INSERT ON public.tenant_roles
FOR EACH ROW
EXECUTE FUNCTION private.seed_storefront_role_permissions();

WITH c AS (SELECT (private.get_storefront_literal_constants()).*)
INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
SELECT role.organization_id, role.id, perm.permission_key
FROM public.tenant_roles AS role
CROSS JOIN c
CROSS JOIN LATERAL unnest(
  CASE
    WHEN role.role_key IN (c.role_owner, c.role_admin) THEN ARRAY[c.perm_storefront_read, c.perm_storefront_write]::text[]
    WHEN role.role_key = c.actor_staff THEN ARRAY[c.perm_storefront_read]::text[]
    ELSE ARRAY[]::text[]
  END
) AS perm(permission_key)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.storefront_has_permission(
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
      (private.get_storefront_literal_constants()).perm_storefront_read,
      (private.get_storefront_literal_constants()).perm_storefront_write
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
        AND br_row.status = (private.get_storefront_literal_constants()).status_active
        AND est_row.status = (private.get_storefront_literal_constants()).status_active
        AND org_row.status = (private.get_storefront_literal_constants()).status_active
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
        AND m.status = (private.get_storefront_literal_constants()).status_active
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

REVOKE ALL ON FUNCTION public.storefront_has_permission(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_has_permission(uuid, uuid, uuid, text)
  TO authenticated;

-- 1. Provider-Agnostic Media Abstraction (GMZ-REQ-CAT-004)
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  provider_key text NOT NULL,
  storage_key text NOT NULL,
  canonical_url text NOT NULL,
  mime_type text NOT NULL,
  alt_text text NOT NULL,
  width_px integer NOT NULL,
  height_px integer NOT NULL,
  status text NOT NULL DEFAULT (private.get_storefront_literal_constants()).status_active,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT media_assets_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT media_assets_organization_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE RESTRICT,
  CONSTRAINT media_assets_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT media_assets_provider_check
    CHECK (provider_key IN (
      (private.get_storefront_literal_constants()).provider_external_https,
      (private.get_storefront_literal_constants()).provider_supabase_storage,
      (private.get_storefront_literal_constants()).provider_cdn_proxy
    )),
  CONSTRAINT media_assets_storage_key_check
    CHECK (private.catalog_has_non_whitespace(storage_key) AND pg_catalog.char_length(storage_key) <= 512),
  CONSTRAINT media_assets_url_https_check
    CHECK (
      pg_catalog.char_length(canonical_url) BETWEEN 12 AND 1000
      AND canonical_url ~ (private.get_storefront_literal_constants()).https_url_regex
    ),
  CONSTRAINT media_assets_mime_check
    CHECK (mime_type IN (
      (private.get_storefront_literal_constants()).mime_webp,
      (private.get_storefront_literal_constants()).mime_avif,
      (private.get_storefront_literal_constants()).mime_jpeg,
      (private.get_storefront_literal_constants()).mime_png
    )),
  CONSTRAINT media_assets_alt_text_check
    CHECK (private.catalog_has_non_whitespace(alt_text) AND pg_catalog.char_length(alt_text) <= 180),
  CONSTRAINT media_assets_dimensions_check
    CHECK (width_px BETWEEN 64 AND 4096 AND height_px BETWEEN 64 AND 4096),
  CONSTRAINT media_assets_status_check
    CHECK (status IN (
      (private.get_storefront_literal_constants()).status_active,
      (private.get_storefront_literal_constants()).status_archived
    ))
);

CREATE INDEX media_assets_org_status_idx ON public.media_assets (organization_id, status, created_at DESC);

CREATE TABLE public.media_variants (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  variant_key text NOT NULL,
  url text NOT NULL,
  mime_type text NOT NULL,
  width_px integer NOT NULL,
  height_px integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT media_variants_asset_variant_unique UNIQUE (media_asset_id, variant_key),
  CONSTRAINT media_variants_asset_tenant_fkey
    FOREIGN KEY (organization_id, media_asset_id)
    REFERENCES public.media_assets (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT media_variants_key_check
    CHECK (variant_key IN (
      (private.get_storefront_literal_constants()).variant_thumb,
      (private.get_storefront_literal_constants()).variant_hero,
      (private.get_storefront_literal_constants()).variant_square
    )),
  CONSTRAINT media_variants_url_https_check
    CHECK (
      pg_catalog.char_length(url) BETWEEN 12 AND 1000
      AND url ~ (private.get_storefront_literal_constants()).https_url_regex
    ),
  CONSTRAINT media_variants_mime_check
    CHECK (mime_type IN (
      (private.get_storefront_literal_constants()).mime_webp,
      (private.get_storefront_literal_constants()).mime_avif,
      (private.get_storefront_literal_constants()).mime_jpeg,
      (private.get_storefront_literal_constants()).mime_png
    )),
  CONSTRAINT media_variants_dimensions_check
    CHECK (width_px BETWEEN 64 AND 4096 AND height_px BETWEEN 64 AND 4096)
);

ALTER TABLE public.products
  ADD COLUMN primary_media_asset_id uuid,
  ADD CONSTRAINT products_primary_media_tenant_fkey
    FOREIGN KEY (organization_id, primary_media_asset_id)
    REFERENCES public.media_assets (organization_id, id) ON DELETE RESTRICT;

ALTER TABLE public.customers
  ADD COLUMN marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN marketing_opt_in_updated_at timestamptz;

-- 2. Safe Versioned Storefront Profile & Theme Schema (GMZ-REQ-WEB-001..003)
CREATE TABLE public.storefront_profiles (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  public_slug text NOT NULL UNIQUE,
  headline text NOT NULL,
  subheadline text NOT NULL DEFAULT '',
  hero_media_asset_id uuid,
  theme_schema_version integer NOT NULL DEFAULT 1,
  layout_family text NOT NULL DEFAULT (private.get_storefront_literal_constants()).layout_editorial,
  accent_preset text NOT NULL DEFAULT (private.get_storefront_literal_constants()).accent_emerald,
  card_style text NOT NULL DEFAULT (private.get_storefront_literal_constants()).card_glass,
  is_published boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT storefront_profiles_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT storefront_profiles_branch_unique UNIQUE (organization_id, branch_id),
  CONSTRAINT storefront_profiles_branch_scope_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id) ON DELETE RESTRICT,
  CONSTRAINT storefront_profiles_hero_media_fkey
    FOREIGN KEY (organization_id, hero_media_asset_id)
    REFERENCES public.media_assets (organization_id, id) ON DELETE SET NULL,
  CONSTRAINT storefront_profiles_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT storefront_profiles_slug_check
    CHECK (public_slug ~ (private.get_storefront_literal_constants()).slug_regex),
  CONSTRAINT storefront_profiles_headline_check
    CHECK (private.catalog_has_non_whitespace(headline) AND pg_catalog.char_length(headline) BETWEEN 3 AND 140),
  CONSTRAINT storefront_profiles_subheadline_check
    CHECK (pg_catalog.char_length(subheadline) <= 280),
  CONSTRAINT storefront_profiles_theme_version_check
    CHECK (theme_schema_version = 1),
  CONSTRAINT storefront_profiles_layout_check
    CHECK (layout_family IN (
      (private.get_storefront_literal_constants()).layout_editorial,
      (private.get_storefront_literal_constants()).layout_express
    )),
  CONSTRAINT storefront_profiles_accent_check
    CHECK (accent_preset IN (
      (private.get_storefront_literal_constants()).accent_emerald,
      (private.get_storefront_literal_constants()).accent_terracotta,
      (private.get_storefront_literal_constants()).accent_amber
    )),
  CONSTRAINT storefront_profiles_card_style_check
    CHECK (card_style IN (
      (private.get_storefront_literal_constants()).card_glass,
      (private.get_storefront_literal_constants()).card_minimal
    )),
  CONSTRAINT storefront_profiles_version_check
    CHECK (version >= 1)
);

-- 3. Private SHA-256 Capability-Token Table for Public Order Tracking (Zero IDOR)
CREATE TABLE private.order_public_tracking_tokens (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  order_id uuid NOT NULL,
  token_sha256 text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT order_public_tracking_tokens_order_fkey
    FOREIGN KEY (organization_id, order_id)
    REFERENCES public.orders (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT order_public_tracking_tokens_hash_check
    CHECK (token_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX order_public_tracking_tokens_order_idx
  ON private.order_public_tracking_tokens (organization_id, order_id);

REVOKE ALL PRIVILEGES ON TABLE private.order_public_tracking_tokens
  FROM PUBLIC, anon, authenticated, service_role;

-- 4. Audit & Step-Up Extension for Storefront & Media
CREATE TABLE private.storefront_step_up_consumptions (
  guard_event_id uuid PRIMARY KEY REFERENCES public.audit_events (id) ON DELETE RESTRICT,
  consumed_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  consumed_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

REVOKE ALL PRIVILEGES ON TABLE private.storefront_step_up_consumptions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_valid_storefront_audit_metadata(
  p_action text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
  v_proof text;
BEGIN
  IF p_metadata IS NULL OR pg_catalog.jsonb_typeof(p_metadata) <> v_c.json_object THEN
    RETURN false;
  END IF;

  IF p_action = v_c.action_storefront_step_up THEN
    IF NOT (p_metadata ? v_c.meta_required_permissions)
      OR pg_catalog.jsonb_typeof(p_metadata->v_c.meta_required_permissions) <> v_c.json_array
      OR pg_catalog.jsonb_array_length(p_metadata->v_c.meta_required_permissions) <> 1
      OR (p_metadata->v_c.meta_required_permissions->>0) IS DISTINCT FROM v_c.perm_storefront_write
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

  IF p_action = v_c.action_profile_upserted THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_public_slug
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_public_slug) = v_c.json_string
      AND p_metadata ? v_c.meta_layout_family
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_layout_family) = v_c.json_string
      AND p_metadata ? v_c.meta_version
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_version) = v_c.json_number
      AND (p_metadata - ARRAY[v_c.meta_public_slug, v_c.meta_layout_family, v_c.meta_version]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  IF p_action = v_c.action_media_registered THEN
    RETURN COALESCE(
      p_metadata ? v_c.meta_provider_key
      AND pg_catalog.jsonb_typeof(p_metadata->v_c.meta_provider_key) = v_c.json_string
      AND (p_metadata - ARRAY[v_c.meta_provider_key, v_c.meta_product_id]::text[]) = '{}'::jsonb,
      false
    );
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION private.is_valid_storefront_audit_metadata(text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admitted_storefront_audit_shape(
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
    p_action = (private.get_storefront_literal_constants()).action_storefront_step_up
    AND p_target_type = (private.get_storefront_literal_constants()).target_storefront_profile
    AND p_source = (private.get_storefront_literal_constants()).source_admin_guard
  )
  OR (
    p_action = (private.get_storefront_literal_constants()).action_profile_upserted
    AND p_target_type = (private.get_storefront_literal_constants()).target_storefront_profile
    AND p_source = (private.get_storefront_literal_constants()).source_storefront_command
  )
  OR (
    p_action = (private.get_storefront_literal_constants()).action_media_registered
    AND p_target_type = (private.get_storefront_literal_constants()).target_media_asset
    AND p_source = (private.get_storefront_literal_constants()).source_storefront_command
  );
$function$;

REVOKE ALL ON FUNCTION private.is_admitted_storefront_audit_shape(text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

-- Composable audit predicates so future slices never duplicate full allowlists
CREATE OR REPLACE FUNCTION private.is_admitted_audit_action_key(p_action text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT p_action IN (
    (private.get_storefront_literal_constants()).action_storefront_step_up,
    (private.get_storefront_literal_constants()).action_profile_upserted,
    (private.get_storefront_literal_constants()).action_media_registered,
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
  OR p_action ~ '^catalog\.(category|product|variant|channel)\.(created|updated|archived)$'
  OR p_action ~ '^catalog\.offer\.(created|updated|archived|commercial_created|commercial_updated)$';
$function$;

REVOKE ALL ON FUNCTION private.is_admitted_audit_action_key(text) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_action_check CHECK (
  private.is_admitted_audit_action_key(action) IS TRUE
);

ALTER TABLE public.audit_events DROP CONSTRAINT audit_events_target_type_check;
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_target_type_check CHECK (
  target_type IN (
    (private.get_storefront_literal_constants()).target_storefront_profile,
    (private.get_storefront_literal_constants()).target_media_asset,
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
  pg_catalog.jsonb_typeof(metadata) = (private.get_storefront_literal_constants()).json_object
  AND pg_catalog.octet_length(metadata::text) <= 1024
  AND (
    ((action LIKE 'storefront.%' OR action = (private.get_storefront_literal_constants()).action_media_registered)
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
);

-- 5. RLS & Least Privilege on Media & Storefront Tables (Zero direct anon access)
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.media_assets,
  public.media_variants,
  public.storefront_profiles
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.media_assets,
  public.media_variants,
  public.storefront_profiles
TO authenticated;

CREATE OR REPLACE FUNCTION public.storefront_can_read_org_media(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.branches AS br
    WHERE br.organization_id = p_organization_id
      AND public.storefront_has_permission(
        p_organization_id, br.establishment_id, br.id,
        (private.get_storefront_literal_constants()).perm_storefront_read
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.storefront_can_read_org_media(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_can_read_org_media(uuid)
  TO authenticated;

CREATE POLICY media_assets_org_select ON public.media_assets
FOR SELECT TO authenticated
USING ((SELECT public.storefront_can_read_org_media(organization_id)));

CREATE POLICY media_variants_org_select ON public.media_variants
FOR SELECT TO authenticated
USING ((SELECT public.storefront_can_read_org_media(organization_id)));

CREATE POLICY storefront_profiles_branch_select ON public.storefront_profiles
FOR SELECT TO authenticated
USING ((SELECT public.storefront_has_permission(
  organization_id, establishment_id, branch_id,
  (private.get_storefront_literal_constants()).perm_storefront_read
)));

-- 6. Admin Guard Step-Up & Staff Storefront/Media Command RPCs
CREATE OR REPLACE FUNCTION public.append_storefront_step_up_event(
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
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
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
    OR p_required_permissions[1] IS DISTINCT FROM v_c.perm_storefront_write
    OR (p_outcome = v_c.outcome_allow AND (
      p_actor_user_id IS NULL
      OR p_organization_id IS NULL
      OR p_branch_id IS NULL
      OR p_reason_code IS DISTINCT FROM v_c.reason_authorized
    ))
    OR (p_outcome = v_c.outcome_deny AND p_reason_code = v_c.reason_authorized)
    OR p_reason_code IS NULL
  THEN
    RAISE EXCEPTION 'Invalid storefront step-up event.' USING ERRCODE = v_c.sqlstate_22023;
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
    v_c.action_storefront_step_up, v_c.target_storefront_profile, p_target_id,
    p_outcome, p_reason_code, p_correlation_id, v_c.source_admin_guard, v_metadata
  );

  RETURN v_proof_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_storefront_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.append_storefront_step_up_event(uuid, uuid, uuid, uuid, uuid, text[], uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.consume_storefront_step_up_proof(
  p_proof_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
  v_event public.audit_events%ROWTYPE;
  v_rows integer;
BEGIN
  IF p_proof_id IS NULL OR p_actor_user_id IS NULL OR p_actor_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN false;
  END IF;

  SELECT ev.* INTO v_event
  FROM public.audit_events AS ev
  WHERE ev.action = v_c.action_storefront_step_up
    AND ev.outcome = v_c.outcome_allow
    AND ev.actor_user_id = p_actor_user_id
    AND ev.organization_id = p_organization_id
    AND ev.establishment_id = p_establishment_id
    AND ev.branch_id = p_branch_id
    AND ev.target_id = p_branch_id
    AND ev.metadata->>v_c.meta_step_up_proof_id = p_proof_id::text
    AND ev.created_at >= pg_catalog.now() - interval '5 minutes'
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO private.storefront_step_up_consumptions (guard_event_id, consumed_by)
  VALUES (v_event.id, p_actor_user_id)
  ON CONFLICT (guard_event_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_storefront_step_up_proof(uuid, uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.storefront_save_profile(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_public_slug text,
  p_headline text,
  p_subheadline text,
  p_layout_family text,
  p_accent_preset text,
  p_card_style text,
  p_hero_media_asset_id uuid,
  p_is_published boolean,
  p_step_up_proof_id uuid,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
  v_sc private.settings_literal_constants := private.get_settings_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_clean_slug text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_public_slug, '')));
  v_clean_headline text := pg_catalog.btrim(COALESCE(p_headline, ''));
  v_clean_sub text := pg_catalog.btrim(COALESCE(p_subheadline, ''));
  v_old public.storefront_profiles%ROWTYPE;
  v_profile_id uuid;
  v_version integer;
  v_reason_code text;
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_organization_id IS NULL OR p_establishment_id IS NULL OR p_branch_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT public.storefront_has_permission(
    p_organization_id, p_establishment_id, p_branch_id, v_c.perm_storefront_write
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT private.organization_has_boolean_entitlement(p_organization_id, v_sc.key_online_orders_entitlement) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_entitlement_denied, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF v_clean_slug !~ v_c.slug_regex
    OR NOT private.catalog_has_non_whitespace(v_clean_headline)
    OR pg_catalog.char_length(v_clean_headline) NOT BETWEEN 3 AND 140
    OR pg_catalog.char_length(v_clean_sub) > 280
    OR p_layout_family IS NULL
    OR p_layout_family NOT IN (v_c.layout_editorial, v_c.layout_express)
    OR p_accent_preset IS NULL
    OR p_accent_preset NOT IN (v_c.accent_emerald, v_c.accent_terracotta, v_c.accent_amber)
    OR p_card_style IS NULL
    OR p_card_style NOT IN (v_c.card_glass, v_c.card_minimal)
    OR p_is_published IS NULL
  THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF p_hero_media_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.media_assets AS ma
    WHERE ma.organization_id = p_organization_id AND ma.id = p_hero_media_asset_id AND ma.status = v_c.status_active
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF NOT private.consume_storefront_step_up_proof(
    p_step_up_proof_id, v_actor_id, p_organization_id, p_establishment_id, p_branch_id
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_step_up_required, ERRCODE = v_c.sqlstate_42501;
  END IF;

  SELECT sp.* INTO v_old
  FROM public.storefront_profiles AS sp
  WHERE sp.organization_id = p_organization_id AND sp.branch_id = p_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_version := 1;
    v_reason_code := v_c.reason_profile_created;
    INSERT INTO public.storefront_profiles (
      organization_id, establishment_id, branch_id, public_slug, headline, subheadline,
      hero_media_asset_id, layout_family, accent_preset, card_style, is_published, version, updated_by
    ) VALUES (
      p_organization_id, p_establishment_id, p_branch_id, v_clean_slug, v_clean_headline, v_clean_sub,
      p_hero_media_asset_id, p_layout_family, p_accent_preset, p_card_style, p_is_published, v_version, v_actor_id
    ) RETURNING id INTO v_profile_id;
  ELSE
    v_profile_id := v_old.id;
    v_version := v_old.version + 1;
    v_reason_code := v_c.reason_profile_updated;
    UPDATE public.storefront_profiles
    SET
      public_slug = v_clean_slug,
      headline = v_clean_headline,
      subheadline = v_clean_sub,
      hero_media_asset_id = p_hero_media_asset_id,
      layout_family = p_layout_family,
      accent_preset = p_accent_preset,
      card_style = p_card_style,
      is_published = p_is_published,
      version = v_version,
      updated_by = v_actor_id,
      updated_at = pg_catalog.now()
    WHERE id = v_profile_id;
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, p_organization_id, p_establishment_id, p_branch_id,
    v_c.action_profile_upserted, v_c.target_storefront_profile, v_profile_id,
    v_c.outcome_allow, v_reason_code, p_correlation_id, v_c.source_storefront_command,
    pg_catalog.jsonb_build_object(
      v_c.meta_public_slug, v_clean_slug,
      v_c.meta_layout_family, p_layout_family,
      v_c.meta_version, v_version
    )
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_profile_id, v_profile_id,
    v_c.meta_public_slug, v_clean_slug,
    v_c.meta_version, v_version,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.storefront_save_profile(
  uuid, uuid, uuid, text, text, text, text, text, text, uuid, boolean, uuid, uuid
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_save_profile(
  uuid, uuid, uuid, text, text, text, text, text, text, uuid, boolean, uuid, uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.catalog_register_product_media(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_provider_key text,
  p_storage_key text,
  p_canonical_url text,
  p_mime_type text,
  p_alt_text text,
  p_width_px integer,
  p_height_px integer,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
  v_actor_id uuid := (SELECT auth.uid());
  v_clean_storage text := pg_catalog.btrim(COALESCE(p_storage_key, ''));
  v_clean_url text := pg_catalog.btrim(COALESCE(p_canonical_url, ''));
  v_clean_alt text := pg_catalog.btrim(COALESCE(p_alt_text, ''));
  v_asset_id uuid;
  v_audit_id uuid;
BEGIN
  IF v_actor_id IS NULL OR p_organization_id IS NULL OR p_establishment_id IS NULL OR p_branch_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF NOT public.storefront_has_permission(
    p_organization_id, p_establishment_id, p_branch_id, v_c.perm_storefront_write
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_auth_unavailable, ERRCODE = v_c.sqlstate_42501;
  END IF;

  IF p_provider_key IS NULL
    OR p_provider_key NOT IN (v_c.provider_external_https, v_c.provider_supabase_storage, v_c.provider_cdn_proxy)
    OR NOT private.catalog_has_non_whitespace(v_clean_storage)
    OR pg_catalog.char_length(v_clean_storage) > 512
    OR pg_catalog.char_length(v_clean_url) NOT BETWEEN 12 AND 1000
    OR v_clean_url !~ v_c.https_url_regex
    OR p_mime_type IS NULL
    OR p_mime_type NOT IN (v_c.mime_webp, v_c.mime_avif, v_c.mime_jpeg, v_c.mime_png)
    OR NOT private.catalog_has_non_whitespace(v_clean_alt)
    OR pg_catalog.char_length(v_clean_alt) > 180
    OR p_width_px IS NULL
    OR p_height_px IS NULL
    OR p_width_px NOT BETWEEN 64 AND 4096
    OR p_height_px NOT BETWEEN 64 AND 4096
  THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  IF p_product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.products AS pr
    WHERE pr.organization_id = p_organization_id AND pr.id = p_product_id AND pr.status = v_c.status_active
  ) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  INSERT INTO public.media_assets (
    organization_id, provider_key, storage_key, canonical_url, mime_type, alt_text, width_px, height_px, created_by
  ) VALUES (
    p_organization_id, p_provider_key, v_clean_storage, v_clean_url, p_mime_type, v_clean_alt, p_width_px, p_height_px, v_actor_id
  ) RETURNING id INTO v_asset_id;

  INSERT INTO public.media_variants (
    organization_id, media_asset_id, variant_key, url, mime_type, width_px, height_px
  ) VALUES (
    p_organization_id, v_asset_id, v_c.variant_thumb, v_clean_url, p_mime_type,
    LEAST(p_width_px, 640), LEAST(p_height_px, 480)
  );

  IF p_product_id IS NOT NULL THEN
    UPDATE public.products
    SET primary_media_asset_id = v_asset_id, updated_at = pg_catalog.now()
    WHERE organization_id = p_organization_id AND id = p_product_id;
  END IF;

  INSERT INTO public.audit_events (
    actor_user_id, organization_id, establishment_id, branch_id,
    action, target_type, target_id, outcome, reason_code,
    correlation_id, source, metadata
  ) VALUES (
    v_actor_id, p_organization_id, p_establishment_id, p_branch_id,
    v_c.action_media_registered, v_c.target_media_asset, v_asset_id,
    v_c.outcome_allow, v_c.reason_media_registered, p_correlation_id, v_c.source_storefront_command,
    CASE
      WHEN p_product_id IS NOT NULL THEN pg_catalog.jsonb_build_object(
        v_c.meta_provider_key, p_provider_key,
        v_c.meta_product_id, p_product_id::text
      )
      ELSE pg_catalog.jsonb_build_object(v_c.meta_provider_key, p_provider_key)
    END
  ) RETURNING id INTO v_audit_id;

  RETURN pg_catalog.jsonb_build_object(
    v_c.key_media_asset_id, v_asset_id,
    v_c.key_audit_event_ids, pg_catalog.jsonb_build_array(v_audit_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.catalog_register_product_media(
  uuid, uuid, uuid, uuid, text, text, text, text, text, integer, integer, uuid
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_register_product_media(
  uuid, uuid, uuid, uuid, text, text, text, text, text, integer, integer, uuid
) TO authenticated;

-- 7. Narrow Public Storefront Read, Checkout & Capability-Token Tracking RPCs (anon + authenticated)
CREATE OR REPLACE FUNCTION public.storefront_get_public_menu(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
  v_oc private.orders_literal_constants := private.get_orders_literal_constants();
  v_sc private.settings_literal_constants := private.get_settings_literal_constants();
  v_clean_slug text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_slug, '')));
  v_prof public.storefront_profiles%ROWTYPE;
  v_branch_name text;
  v_est_name text;
  v_ordering_on boolean;
  v_pickup_on boolean;
  v_delivery_on boolean;
  v_accepted_methods jsonb;
  v_cash_change_on boolean;
  v_prep_mins integer;
  v_public_notice text;
  v_whatsapp text;
  v_hero_media jsonb := NULL;
  v_offers jsonb;
  v_zones jsonb := '[]'::jsonb;
BEGIN
  IF v_clean_slug !~ v_c.slug_regex THEN
    RETURN NULL;
  END IF;

  SELECT sp.* INTO v_prof
  FROM public.storefront_profiles AS sp
  JOIN public.branches AS br
    ON br.organization_id = sp.organization_id
    AND br.establishment_id = sp.establishment_id
    AND br.id = sp.branch_id
    AND br.status = v_c.status_active
  JOIN public.establishments AS est
    ON est.organization_id = sp.organization_id
    AND est.id = sp.establishment_id
    AND est.status = v_c.status_active
  JOIN public.organizations AS org
    ON org.id = sp.organization_id
    AND org.status = v_c.status_active
  WHERE sp.public_slug = v_clean_slug
    AND sp.is_published IS TRUE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT private.organization_has_boolean_entitlement(v_prof.organization_id, v_sc.key_online_orders_entitlement) THEN
    RETURN NULL;
  END IF;

  SELECT br.display_name, est.display_name INTO v_branch_name, v_est_name
  FROM public.branches AS br
  JOIN public.establishments AS est
    ON est.organization_id = br.organization_id AND est.id = br.establishment_id
  WHERE br.id = v_prof.branch_id;

  v_ordering_on := private.resolve_branch_setting_json(
    v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, v_sc.key_ordering_enabled
  ) = pg_catalog.to_jsonb(true);
  v_pickup_on := private.resolve_branch_setting_json(
    v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, 'storefront.pickup_enabled'
  ) = pg_catalog.to_jsonb(true);
  v_delivery_on := (
    private.resolve_branch_setting_json(
      v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, 'storefront.delivery_enabled'
    ) = pg_catalog.to_jsonb(true)
    AND private.organization_has_boolean_entitlement(v_prof.organization_id, v_sc.key_delivery_own_fleet)
  );
  v_accepted_methods := COALESCE(
    private.resolve_branch_setting_json(
      v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, v_sc.key_accepted_payment_methods
    ),
    '[]'::jsonb
  );
  v_cash_change_on := private.resolve_branch_setting_json(
    v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, 'handoff.cash_change_enabled'
  ) = pg_catalog.to_jsonb(true);
  v_prep_mins := COALESCE(
    (private.resolve_branch_setting_json(
      v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, 'operations.default_prep_minutes'
    ))::text::integer,
    30
  );
  v_public_notice := COALESCE(
    private.resolve_branch_setting_json(
      v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, 'storefront.public_notice'
    ) #>> '{}',
    ''
  );
  v_whatsapp := COALESCE(
    private.resolve_branch_setting_json(
      v_prof.organization_id, v_prof.establishment_id, v_prof.branch_id, 'storefront.support_whatsapp'
    ) #>> '{}',
    ''
  );

  IF v_prof.hero_media_asset_id IS NOT NULL THEN
    SELECT pg_catalog.jsonb_build_object(
      'url', COALESCE(mv.url, ma.canonical_url),
      'alt_text', ma.alt_text,
      'width_px', COALESCE(mv.width_px, ma.width_px),
      'height_px', COALESCE(mv.height_px, ma.height_px)
    ) INTO v_hero_media
    FROM public.media_assets AS ma
    LEFT JOIN public.media_variants AS mv
      ON mv.organization_id = ma.organization_id
      AND mv.media_asset_id = ma.id
      AND mv.variant_key = v_c.variant_hero
    WHERE ma.organization_id = v_prof.organization_id
      AND ma.id = v_prof.hero_media_asset_id
      AND ma.status = v_c.status_active;
  END IF;

  -- Fail-closed offer query: ONLY active, visible, explicitly 'available' offers on goodz_online channel
  SELECT COALESCE(pg_catalog.jsonb_agg(offer_json ORDER BY offer_json->>'category_name', offer_json->>'display_name'), '[]'::jsonb)
  INTO v_offers
  FROM (
    SELECT pg_catalog.jsonb_build_object(
      'offer_id', co.id,
      'category_name', COALESCE(cat.name, 'Destaques da casa'),
      'display_name', COALESCE(
        co.title_override,
        CASE WHEN pv.id IS NOT NULL THEN pr.name || ' · ' || pv.name ELSE pr.name END
      ),
      'description', COALESCE(NULLIF(co.description_override, ''), pr.description, ''),
      'base_price', co.base_price,
      'currency', co.currency,
      'media', CASE
        WHEN ma.id IS NOT NULL THEN pg_catalog.jsonb_build_object(
          'url', COALESCE(mv.url, ma.canonical_url),
          'alt_text', ma.alt_text,
          'width_px', COALESCE(mv.width_px, ma.width_px),
          'height_px', COALESCE(mv.height_px, ma.height_px)
        )
        ELSE NULL
      END
    ) AS offer_json
    FROM public.channel_offers AS co
    JOIN public.sales_channels AS sc
      ON sc.organization_id = co.organization_id
      AND sc.id = co.sales_channel_id
      AND sc.channel_key = v_oc.channel_goodz_online
      AND sc.status = v_c.status_active
    LEFT JOIN public.product_variants AS pv
      ON pv.organization_id = co.organization_id
      AND pv.id = co.variant_id
      AND pv.status = v_c.status_active
    JOIN public.products AS pr
      ON pr.organization_id = co.organization_id
      AND pr.id = COALESCE(co.product_id, pv.product_id)
      AND pr.status = v_c.status_active
    LEFT JOIN public.product_categories AS cat
      ON cat.organization_id = pr.organization_id
      AND cat.id = pr.category_id
      AND cat.status = v_c.status_active
    LEFT JOIN public.media_assets AS ma
      ON ma.organization_id = pr.organization_id
      AND ma.id = pr.primary_media_asset_id
      AND ma.status = v_c.status_active
    LEFT JOIN public.media_variants AS mv
      ON mv.organization_id = ma.organization_id
      AND mv.media_asset_id = ma.id
      AND mv.variant_key = v_c.variant_thumb
    WHERE co.organization_id = v_prof.organization_id
      AND co.establishment_id = v_prof.establishment_id
      AND co.branch_id = v_prof.branch_id
      AND co.status = v_c.status_active
      AND co.is_visible IS TRUE
      AND co.availability_state = 'available'
      AND co.base_price IS NOT NULL
      AND (co.variant_id IS NULL OR pv.id IS NOT NULL)
  ) AS sub;

  IF v_delivery_on THEN
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'zone_id', dz.id,
      'name', dz.name,
      'neighborhoods', dz.neighborhoods,
      'delivery_fee_amount', dz.delivery_fee_amount,
      'minimum_order_amount', dz.minimum_order_amount,
      'estimated_delivery_minutes', dz.estimated_delivery_minutes
    ) ORDER BY dz.delivery_fee_amount ASC, dz.name ASC), '[]'::jsonb)
    INTO v_zones
    FROM public.delivery_zones AS dz
    WHERE dz.organization_id = v_prof.organization_id
      AND dz.branch_id = v_prof.branch_id
      AND dz.status = v_c.status_active;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'public_slug', v_prof.public_slug,
    'establishment_name', v_est_name,
    'branch_name', v_branch_name,
    'headline', v_prof.headline,
    'subheadline', v_prof.subheadline,
    'hero_media', v_hero_media,
    'theme', pg_catalog.jsonb_build_object(
      'schema_version', v_prof.theme_schema_version,
      'layout_family', v_prof.layout_family,
      'accent_preset', v_prof.accent_preset,
      'card_style', v_prof.card_style
    ),
    'policy', pg_catalog.jsonb_build_object(
      'ordering_enabled', v_ordering_on,
      'pickup_enabled', v_pickup_on,
      'delivery_enabled', v_delivery_on,
      'accepted_payment_methods', v_accepted_methods,
      'cash_change_enabled', v_cash_change_on,
      'default_prep_minutes', v_prep_mins,
      'public_notice', v_public_notice,
      'support_whatsapp', v_whatsapp
    ),
    'offers', v_offers,
    'delivery_zones', v_zones
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.storefront_get_public_menu(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_get_public_menu(text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.storefront_place_public_order(
  p_slug text,
  p_fulfillment_mode text,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_delivery_zone_id uuid,
  p_declared_payment_method text,
  p_cash_change_for numeric,
  p_customer_notes text,
  p_marketing_opt_in boolean,
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
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
  v_oc private.orders_literal_constants := private.get_orders_literal_constants();
  v_sc private.settings_literal_constants := private.get_settings_literal_constants();
  v_clean_slug text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_slug, '')));
  v_prof public.storefront_profiles%ROWTYPE;
  v_receipt jsonb;
  v_order_id uuid;
  v_customer_id uuid;
  v_raw_token text;
  v_token_hash text;
BEGIN
  IF v_clean_slug !~ v_c.slug_regex THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_not_found, ERRCODE = v_c.sqlstate_p0002;
  END IF;

  SELECT sp.* INTO v_prof
  FROM public.storefront_profiles AS sp
  WHERE sp.public_slug = v_clean_slug AND sp.is_published IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_not_found, ERRCODE = v_c.sqlstate_p0002;
  END IF;

  IF NOT private.organization_has_boolean_entitlement(v_prof.organization_id, v_sc.key_online_orders_entitlement) THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_entitlement_denied, ERRCODE = v_c.sqlstate_42501;
  END IF;

  -- Require configured delivery zone when public checkout chooses own_delivery
  IF p_fulfillment_mode = v_oc.mode_own_delivery AND p_delivery_zone_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = v_c.msg_storefront_input_invalid, ERRCODE = v_c.sqlstate_22023;
  END IF;

  v_receipt := private.create_order_with_delivery(
    NULL,
    v_c.actor_customer,
    v_prof.organization_id,
    v_prof.establishment_id,
    v_prof.branch_id,
    p_fulfillment_mode,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    0,
    p_declared_payment_method,
    p_cash_change_for,
    p_customer_notes,
    p_items,
    p_idempotency_key,
    p_correlation_id,
    p_delivery_zone_id
  );

  v_order_id := (v_receipt->>v_oc.key_order_id)::uuid;

  IF COALESCE((v_receipt->>'idempotent_replay')::boolean, false) IS FALSE THEN
    SELECT ord.customer_id INTO v_customer_id FROM public.orders AS ord WHERE ord.id = v_order_id;
    IF v_customer_id IS NOT NULL AND COALESCE(p_marketing_opt_in, false) IS TRUE THEN
      UPDATE public.customers
      SET marketing_opt_in = true, marketing_opt_in_updated_at = pg_catalog.now()
      WHERE id = v_customer_id;
    END IF;
  END IF;

  -- Mint 192-bit opaque capability token (stored only as SHA-256 hex digest)
  v_raw_token := pg_catalog.encode(extensions.gen_random_bytes(24), v_c.hex_fmt);
  v_token_hash := pg_catalog.encode(extensions.digest(v_raw_token, v_c.sha256_algo), v_c.hex_fmt);

  INSERT INTO private.order_public_tracking_tokens (organization_id, branch_id, order_id, token_sha256)
  VALUES (v_prof.organization_id, v_prof.branch_id, v_order_id, v_token_hash);

  RETURN v_receipt || pg_catalog.jsonb_build_object(v_c.key_tracking_token, v_raw_token);
END;
$function$;

REVOKE ALL ON FUNCTION public.storefront_place_public_order(
  text, text, text, text, jsonb, uuid, text, numeric, text, boolean, jsonb, text, uuid
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_place_public_order(
  text, text, text, text, jsonb, uuid, text, numeric, text, boolean, jsonb, text, uuid
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.storefront_get_order_tracking(
  p_slug text,
  p_tracking_token text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_c private.storefront_literal_constants := private.get_storefront_literal_constants();
  v_clean_slug text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_slug, '')));
  v_clean_token text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_tracking_token, '')));
  v_token_hash text;
  v_prof public.storefront_profiles%ROWTYPE;
  v_tok private.order_public_tracking_tokens%ROWTYPE;
  v_ord public.orders%ROWTYPE;
  v_first_name text;
  v_neighborhood text;
  v_items jsonb;
  v_delivery jsonb := NULL;
  v_transitions jsonb;
BEGIN
  IF v_clean_slug !~ v_c.slug_regex OR v_clean_token !~ '^[0-9a-f]{48}$' THEN
    RETURN NULL;
  END IF;

  SELECT sp.* INTO v_prof
  FROM public.storefront_profiles AS sp
  WHERE sp.public_slug = v_clean_slug AND sp.is_published IS TRUE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_token_hash := pg_catalog.encode(extensions.digest(v_clean_token, v_c.sha256_algo), v_c.hex_fmt);

  SELECT tk.* INTO v_tok
  FROM private.order_public_tracking_tokens AS tk
  WHERE tk.token_sha256 = v_token_hash
    AND tk.organization_id = v_prof.organization_id
    AND tk.branch_id = v_prof.branch_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT ord.* INTO v_ord
  FROM public.orders AS ord
  WHERE ord.organization_id = v_tok.organization_id AND ord.id = v_tok.order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_first_name := pg_catalog.split_part(pg_catalog.btrim(v_ord.customer_name_snapshot), ' ', 1);
  v_neighborhood := CASE
    WHEN v_ord.delivery_address_snapshot IS NOT NULL THEN COALESCE(v_ord.delivery_address_snapshot->>'neighborhood', '')
    ELSE ''
  END;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'line_number', oi.line_number,
    'display_name', oi.display_name_snapshot,
    'quantity', oi.quantity,
    'line_total_amount', oi.line_total_amount
  ) ORDER BY oi.line_number ASC), '[]'::jsonb)
  INTO v_items
  FROM public.order_items AS oi
  WHERE oi.organization_id = v_ord.organization_id AND oi.order_id = v_ord.id;

  SELECT pg_catalog.jsonb_build_object(
    'status', del.status,
    'zone_name', del.zone_name_snapshot,
    'estimated_delivery_minutes', del.estimated_delivery_minutes,
    'courier_label', del.courier_label
  ) INTO v_delivery
  FROM public.deliveries AS del
  WHERE del.organization_id = v_ord.organization_id AND del.order_id = v_ord.id;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'to_status', tr.to_status,
    'created_at', tr.created_at
  ) ORDER BY tr.created_at ASC), '[]'::jsonb)
  INTO v_transitions
  FROM public.order_status_transitions AS tr
  WHERE tr.organization_id = v_ord.organization_id AND tr.order_id = v_ord.id;

  RETURN pg_catalog.jsonb_build_object(
    'public_slug', v_prof.public_slug,
    'headline', v_prof.headline,
    'theme', pg_catalog.jsonb_build_object(
      'layout_family', v_prof.layout_family,
      'accent_preset', v_prof.accent_preset,
      'card_style', v_prof.card_style
    ),
    'order_number', v_ord.order_number,
    'fulfillment_mode', v_ord.fulfillment_mode,
    'status', v_ord.status,
    'currency', v_ord.currency,
    'subtotal_amount', v_ord.subtotal_amount,
    'delivery_fee_amount', v_ord.delivery_fee_amount,
    'total_amount', v_ord.total_amount,
    'declared_payment_method', v_ord.declared_payment_method,
    'cash_change_for_amount', v_ord.cash_change_for_amount,
    'handoff_payment_status', v_ord.handoff_payment_status,
    'customer_first_name', v_first_name,
    'neighborhood', v_neighborhood,
    'placed_at', v_ord.placed_at,
    'items', v_items,
    'delivery', v_delivery,
    'transitions', v_transitions
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.storefront_get_order_tracking(text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storefront_get_order_tracking(text, text)
  TO anon, authenticated;
