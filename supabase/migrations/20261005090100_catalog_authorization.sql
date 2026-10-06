-- GMZ-IMPL-007 — Catalog RLS, least privilege and read authorization.
--
-- Two independent controls are established here:
--   1. Privilege level: the Data API grants SELECT only. INSERT, UPDATE and DELETE are never
--      granted to anon or authenticated, so an ordinary browser client cannot mutate catalog truth
--      even before RLS is consulted.
--   2. Row level: SELECT policies resolve tenant membership, an explicit catalog capability and a
--      fail-closed scope match on every exposed catalog table.
--
-- Scope matching is deliberately asymmetric and fail closed: an organization scoped role sees every
-- row of its organization, an establishment scoped role sees only rows that carry that establishment,
-- and a branch scoped role sees only rows that carry that branch. A tenant-wide row is therefore never
-- exposed to a narrower role, because a narrower role cannot know which branch it would sell it in.

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
          WHEN p_branch_id IS NOT NULL THEN
            private.is_branch_scope(membership_role.scope_type)
            AND membership_role.establishment_id = p_establishment_id
            AND membership_role.branch_id = p_branch_id
          WHEN p_establishment_id IS NOT NULL THEN
            (
              private.is_establishment_scope(membership_role.scope_type)
              OR private.is_branch_scope(membership_role.scope_type)
            )
            AND membership_role.establishment_id = p_establishment_id
          ELSE private.is_organization_scope(membership_role.scope_type)
        END
    );
$function$;

REVOKE ALL ON FUNCTION private.catalog_scope_grants(text, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.catalog_scope_grants(text, uuid, uuid, uuid) TO authenticated;

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
  USING ((SELECT private.catalog_scope_grants('catalog.read', organization_id, establishment_id, branch_id)));

CREATE POLICY products_catalog_select
  ON public.products
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_scope_grants('catalog.read', organization_id, establishment_id, branch_id)));

CREATE POLICY product_variants_catalog_select
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_scope_grants('catalog.read', organization_id, establishment_id, branch_id)));

CREATE POLICY sales_channels_catalog_select
  ON public.sales_channels
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_scope_grants('catalog.read', organization_id, NULL, NULL)));

CREATE POLICY channel_offers_catalog_select
  ON public.channel_offers
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_scope_grants('catalog.read', organization_id, establishment_id, branch_id)));

CREATE POLICY channel_offer_price_history_catalog_select
  ON public.channel_offer_price_history
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_scope_grants('catalog.read', organization_id, NULL, NULL)));

CREATE POLICY catalog_command_receipts_catalog_select
  ON public.catalog_command_receipts
  FOR SELECT
  TO authenticated
  USING ((SELECT private.catalog_scope_grants('catalog.read', organization_id, NULL, NULL)));

-- Reconstructable price timeline. security_invoker keeps the underlying catalog policy authoritative.
CREATE VIEW public.channel_offer_price_timeline
WITH (security_invoker = true)
AS
SELECT
  history.id,
  history.organization_id,
  history.channel_offer_id,
  history.price_revision,
  history.base_price_amount,
  history.base_price_currency,
  history.promotional_price_amount,
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