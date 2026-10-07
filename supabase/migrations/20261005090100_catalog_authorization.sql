-- GMZ-IMPL-007 — Catalog RLS, least privilege and read authorization.
--
-- Two independent controls are established here:
--   1. Privilege level: the Data API grants SELECT only. INSERT, UPDATE and DELETE are never
--      granted to anon or authenticated, so an ordinary browser client cannot mutate catalog truth
--      even before RLS is consulted.
--   2. Row level: SELECT policies resolve tenant membership, an explicit catalog capability and a
--      fail-closed scope match on every exposed catalog table.
--
-- Scope matching is deliberately asymmetric and fail closed: a row is readable only when the caller's
-- granted scope *contains* the row's scope. An organization scoped role contains every row of its
-- organization. An establishment scoped role contains only rows that carry that establishment, and a
-- branch scoped role contains only rows that carry that branch. A row wider than the caller's scope is
-- therefore never exposed, because a narrower role cannot know which branch it would sell it in.

CREATE OR REPLACE FUNCTION private.catalog_scope_grants(
  p_permission_key text,
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND p_permission_key IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organizations AS catalog_organization
      WHERE catalog_organization.id = p_organization_id
    )
    AND (
      p_establishment_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.establishments AS catalog_establishment
        WHERE catalog_establishment.organization_id = p_organization_id
          AND catalog_establishment.id = p_establishment_id
      )
    )
    AND (
      p_branch_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.branches AS catalog_branch
        WHERE catalog_branch.organization_id = p_organization_id
          AND catalog_branch.establishment_id = p_establishment_id
          AND catalog_branch.id = p_branch_id
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships AS membership
      JOIN public.membership_roles AS membership_role
        ON membership_role.organization_id = membership.organization_id
        AND membership_role.membership_id = membership.id
      JOIN public.role_permissions AS role_permission
        ON role_permission.organization_id = membership_role.organization_id
        AND role_permission.role_id = membership_role.role_id
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.organization_id = p_organization_id
        AND membership.status = private.active_membership_status()
        AND role_permission.permission_key = p_permission_key
        AND CASE
          -- Containment, not kind equality. Matching the row's scope against the role's scope kind
          -- would hide every branch row from an organization manager, which contradicts the whole
          -- point of granting that role at organization level.
          WHEN private.is_organization_scope(membership_role.scope_type) THEN TRUE
          WHEN private.is_establishment_scope(membership_role.scope_type) THEN
            p_branch_id IS NULL
            AND membership_role.establishment_id = p_establishment_id
          WHEN private.is_branch_scope(membership_role.scope_type) THEN
            p_branch_id IS NOT NULL
            AND membership_role.establishment_id = p_establishment_id
            AND membership_role.branch_id = p_branch_id
          ELSE FALSE
        END
    );
$function$;

REVOKE ALL ON FUNCTION private.catalog_scope_grants(text, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.catalog_scope_grants(text, uuid, uuid, uuid) TO authenticated;

-- The read policies below differ only in the scope they admit, so the capability itself is named
-- once here instead of in seven policies.
CREATE OR REPLACE FUNCTION private.catalog_readable_scoped(
  p_organization_id uuid,
  p_establishment_id uuid,
  p_branch_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT private.catalog_scope_grants('catalog.read', p_organization_id, p_establishment_id, p_branch_id));
$function$;

-- Organization-scoped tables carry no establishment or branch: the role scope must still contain the
-- row, which for these tables means the organization alone.
CREATE OR REPLACE FUNCTION private.catalog_readable_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT private.catalog_scope_grants('catalog.read', p_organization_id, NULL, NULL));
$function$;

REVOKE ALL ON FUNCTION private.catalog_readable_scoped(uuid, uuid, uuid),
  private.catalog_readable_organization(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- A row level policy is evaluated with the privileges of the calling role, so the wrappers the
-- policies call have to be executable by that role. They authorize nothing on their own: each one
-- delegates to private.catalog_scope_grants, which is where the membership and capability live.
GRANT EXECUTE ON FUNCTION private.catalog_readable_scoped(uuid, uuid, uuid),
  private.catalog_readable_organization(uuid)
TO authenticated;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_offer_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_command_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.product_categories,
  public.products,
  public.product_variants,
  public.sales_channels,
  public.channel_offers,
  public.channel_offer_price_history,
  public.catalog_command_receipts
FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO authenticated;

-- Reads only. No INSERT, UPDATE or DELETE privilege exists for anon or authenticated on any
-- catalog table, and no INSERT, UPDATE or DELETE policy is created below.
GRANT SELECT ON TABLE
  public.product_categories,
  public.products,
  public.product_variants,
  public.sales_channels,
  public.channel_offers,
  public.channel_offer_price_history,
  public.catalog_command_receipts
TO authenticated;

CREATE POLICY product_categories_catalog_select
  ON public.product_categories
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_readable_scoped(organization_id, establishment_id, branch_id)));

CREATE POLICY products_catalog_select
  ON public.products
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_readable_scoped(organization_id, establishment_id, branch_id)));

CREATE POLICY product_variants_catalog_select
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_readable_scoped(organization_id, establishment_id, branch_id)));

CREATE POLICY sales_channels_catalog_select
  ON public.sales_channels
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_readable_organization(organization_id)));

CREATE POLICY channel_offers_catalog_select
  ON public.channel_offers
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_readable_scoped(organization_id, establishment_id, branch_id)));

CREATE POLICY channel_offer_price_history_catalog_select
  ON public.channel_offer_price_history
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_readable_organization(organization_id)));

CREATE POLICY catalog_command_receipts_catalog_select
  ON public.catalog_command_receipts
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_readable_organization(organization_id)));

-- Reconstructable price timeline. security_invoker keeps the underlying catalog policy authoritative.
-- Monetary columns are projected as text: the Data API serialises a bare numeric as a JSON number,
-- which a browser would read back through an IEEE-754 double. Text keeps every admitted digit exact.
CREATE VIEW public.channel_offer_price_timeline
WITH (security_invoker = true)
AS
SELECT
  history.id,
  history.organization_id,
  history.channel_offer_id,
  history.price_revision,
  history.base_price_amount::text AS base_price_amount,
  history.base_price_currency,
  history.promotional_price_amount::text AS promotional_price_amount,
  history.availability,
  history.visibility,
  history.effective_from,
  pg_catalog.lead(history.effective_from) OVER (
    PARTITION BY history.channel_offer_id
    ORDER BY history.price_revision
  ) AS effective_to,
  history.recorded_by_user_id,
  history.correlation_id,
  history.audit_event_id,
  history.recorded_at
FROM public.channel_offer_price_history AS history;

REVOKE ALL ON TABLE public.channel_offer_price_timeline FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.channel_offer_price_timeline TO authenticated;

-- Current commercial state, projected with exact decimal text for the same reason.
CREATE VIEW public.channel_offer_pricing
WITH (security_invoker = true)
AS
SELECT
  offer.id,
  offer.organization_id,
  offer.establishment_id,
  offer.branch_id,
  offer.sales_channel_id,
  offer.product_id,
  offer.product_variant_id,
  offer.title,
  offer.description,
  offer.base_price_amount::text AS base_price_amount,
  offer.base_price_currency,
  offer.promotional_price_amount::text AS promotional_price_amount,
  offer.availability,
  offer.visibility,
  offer.status,
  offer.price_revision,
  offer.updated_at
FROM public.channel_offers AS offer;

REVOKE ALL ON TABLE public.channel_offer_pricing FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.channel_offer_pricing TO authenticated;