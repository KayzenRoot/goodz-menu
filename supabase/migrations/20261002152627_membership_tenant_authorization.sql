CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.branches
  ADD CONSTRAINT branches_organization_establishment_id_key
  UNIQUE (organization_id, establishment_id, id);

CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  default_establishment_id uuid,
  default_branch_id uuid,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_memberships_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT organization_memberships_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE,
  CONSTRAINT organization_memberships_organization_id_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT organization_memberships_organization_user_key
    UNIQUE (organization_id, user_id),
  CONSTRAINT organization_memberships_status_check
    CHECK (status IN ('active', 'suspended', 'revoked')),
  CONSTRAINT organization_memberships_revocation_state_check
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  CONSTRAINT organization_memberships_default_scope_check
    CHECK (default_branch_id IS NULL OR default_establishment_id IS NOT NULL),
  CONSTRAINT organization_memberships_default_establishment_fkey
    FOREIGN KEY (organization_id, default_establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT organization_memberships_default_branch_fkey
    FOREIGN KEY (organization_id, default_establishment_id, default_branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX organization_memberships_user_status_idx
  ON public.organization_memberships (user_id, organization_id, status);
CREATE INDEX organization_memberships_default_establishment_idx
  ON public.organization_memberships (organization_id, default_establishment_id)
  WHERE default_establishment_id IS NOT NULL;
CREATE INDEX organization_memberships_default_branch_idx
  ON public.organization_memberships (organization_id, default_establishment_id, default_branch_id)
  WHERE default_branch_id IS NOT NULL;

CREATE TABLE public.tenant_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  role_key text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_roles_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT tenant_roles_organization_id_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT tenant_roles_organization_role_key
    UNIQUE (organization_id, role_key),
  CONSTRAINT tenant_roles_role_key_check
    CHECK (role_key ~ '^[a-z][a-z0-9_-]{0,63}$'),
  CONSTRAINT tenant_roles_display_name_check
    CHECK (display_name ~ '[^[:space:]]' AND char_length(display_name) <= 120)
);

CREATE INDEX tenant_roles_organization_idx
  ON public.tenant_roles (organization_id);

CREATE TABLE public.permissions (
  permission_key text PRIMARY KEY,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_permission_key_check
    CHECK (permission_key ~ '^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$'),
  CONSTRAINT permissions_display_name_check
    CHECK (display_name ~ '[^[:space:]]' AND char_length(display_name) <= 120)
);

INSERT INTO public.permissions (permission_key, display_name)
VALUES ('tenant.hierarchy.read', 'Read tenant hierarchy');

CREATE TABLE public.role_permissions (
  organization_id uuid NOT NULL,
  role_id uuid NOT NULL,
  permission_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_pkey
    PRIMARY KEY (organization_id, role_id, permission_key),
  CONSTRAINT role_permissions_role_fkey
    FOREIGN KEY (organization_id, role_id)
    REFERENCES public.tenant_roles (organization_id, id)
    ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_key_fkey
    FOREIGN KEY (permission_key)
    REFERENCES public.permissions (permission_key)
    ON DELETE RESTRICT
);

CREATE INDEX role_permissions_permission_key_idx
  ON public.role_permissions (permission_key, organization_id, role_id);

CREATE TABLE public.membership_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  role_id uuid NOT NULL,
  scope_type text NOT NULL,
  establishment_id uuid,
  branch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_roles_membership_fkey
    FOREIGN KEY (organization_id, membership_id)
    REFERENCES public.organization_memberships (organization_id, id)
    ON DELETE CASCADE,
  CONSTRAINT membership_roles_role_fkey
    FOREIGN KEY (organization_id, role_id)
    REFERENCES public.tenant_roles (organization_id, id)
    ON DELETE CASCADE,
  CONSTRAINT membership_roles_scope_type_check
    CHECK (scope_type IN ('organization', 'establishment', 'branch')),
  CONSTRAINT membership_roles_scope_shape_check
    CHECK (
      (scope_type = 'organization' AND establishment_id IS NULL AND branch_id IS NULL)
      OR (scope_type = 'establishment' AND establishment_id IS NOT NULL AND branch_id IS NULL)
      OR (scope_type = 'branch' AND establishment_id IS NOT NULL AND branch_id IS NOT NULL)
    ),
  CONSTRAINT membership_roles_establishment_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT membership_roles_branch_fkey
    FOREIGN KEY (organization_id, establishment_id, branch_id)
    REFERENCES public.branches (organization_id, establishment_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX membership_roles_organization_assignment_key
  ON public.membership_roles (organization_id, membership_id, role_id)
  WHERE scope_type = 'organization';
CREATE UNIQUE INDEX membership_roles_establishment_assignment_key
  ON public.membership_roles (organization_id, membership_id, role_id, establishment_id)
  WHERE scope_type = 'establishment';
CREATE UNIQUE INDEX membership_roles_branch_assignment_key
  ON public.membership_roles (organization_id, membership_id, role_id, establishment_id, branch_id)
  WHERE scope_type = 'branch';
CREATE INDEX membership_roles_role_idx
  ON public.membership_roles (organization_id, role_id);
CREATE INDEX membership_roles_establishment_scope_idx
  ON public.membership_roles (organization_id, establishment_id)
  WHERE establishment_id IS NOT NULL;
CREATE INDEX membership_roles_branch_scope_idx
  ON public.membership_roles (organization_id, establishment_id, branch_id)
  WHERE branch_id IS NOT NULL;

CREATE FUNCTION private.guard_permission_catalog_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Permission catalog entries cannot be deleted.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.permission_key IS DISTINCT FROM OLD.permission_key THEN
    RAISE EXCEPTION 'Permission keys are immutable.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_permission_catalog_identity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER permissions_identity_immutable
  BEFORE UPDATE OR DELETE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_permission_catalog_identity();

CREATE FUNCTION private.can_read_tenant_hierarchy(
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
    AND (p_branch_id IS NULL OR p_establishment_id IS NOT NULL)
    AND (
      p_establishment_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.establishments AS target_establishment
        WHERE target_establishment.organization_id = p_organization_id
          AND target_establishment.id = p_establishment_id
      )
    )
    AND (
      p_branch_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.branches AS target_branch
        WHERE target_branch.organization_id = p_organization_id
          AND target_branch.establishment_id = p_establishment_id
          AND target_branch.id = p_branch_id
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
        AND membership.status = 'active'
        AND role_permission.permission_key = 'tenant.hierarchy.read'
        AND CASE
          WHEN p_branch_id IS NOT NULL THEN
            membership_role.scope_type = 'organization'
            OR (
              membership_role.scope_type = 'establishment'
              AND membership_role.establishment_id = p_establishment_id
            )
            OR (
              membership_role.scope_type = 'branch'
              AND membership_role.establishment_id = p_establishment_id
              AND membership_role.branch_id = p_branch_id
            )
          WHEN p_establishment_id IS NOT NULL THEN
            membership_role.scope_type = 'organization'
            OR (
              membership_role.scope_type IN ('establishment', 'branch')
              AND membership_role.establishment_id = p_establishment_id
            )
          ELSE TRUE
        END
    );
$function$;

REVOKE ALL ON FUNCTION private.can_read_tenant_hierarchy(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_tenant_hierarchy(uuid, uuid, uuid) TO authenticated;

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.organizations,
  public.establishments,
  public.branches,
  public.organization_memberships,
  public.tenant_roles,
  public.permissions,
  public.role_permissions,
  public.membership_roles
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.organizations,
  public.establishments,
  public.branches
TO authenticated;

CREATE POLICY organizations_membership_select
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING ((SELECT private.can_read_tenant_hierarchy(id, NULL, NULL)));

CREATE POLICY establishments_membership_select
  ON public.establishments
  FOR SELECT
  TO authenticated
  USING ((SELECT private.can_read_tenant_hierarchy(organization_id, id, NULL)));

CREATE POLICY branches_membership_select
  ON public.branches
  FOR SELECT
  TO authenticated
  USING ((SELECT private.can_read_tenant_hierarchy(organization_id, establishment_id, id)));
