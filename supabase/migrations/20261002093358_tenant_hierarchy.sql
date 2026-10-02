CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  legal_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_display_name_check
    CHECK (display_name ~ '[^[:space:]]' AND char_length(display_name) <= 120),
  CONSTRAINT organizations_status_check
    CHECK (status IN ('active', 'suspended', 'archived'))
);

CREATE TABLE public.establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT establishments_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT establishments_organization_id_id_key
    UNIQUE (organization_id, id),
  CONSTRAINT establishments_display_name_check
    CHECK (display_name ~ '[^[:space:]]' AND char_length(display_name) <= 120),
  CONSTRAINT establishments_status_check
    CHECK (status IN ('active', 'suspended', 'archived'))
);

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branches_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT,
  CONSTRAINT branches_establishment_tenant_fkey
    FOREIGN KEY (organization_id, establishment_id)
    REFERENCES public.establishments (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT branches_display_name_check
    CHECK (display_name ~ '[^[:space:]]' AND char_length(display_name) <= 120),
  CONSTRAINT branches_status_check
    CHECK (status IN ('active', 'suspended', 'archived'))
);

CREATE INDEX branches_organization_establishment_idx
  ON public.branches (organization_id, establishment_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.organizations,
  public.establishments,
  public.branches
FROM PUBLIC, anon, authenticated;
