import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";

export type VisibleTenant = {
  id: string;
  displayName: string;
  status: string;
  establishments: {
    id: string;
    displayName: string;
    status: string;
    branches: { id: string; displayName: string; status: string }[];
  }[];
};

export type TenantEntryResult =
  | { ok: true; tenants: VisibleTenant[] }
  | { ok: false };

export async function loadVisibleTenantEntry(client: ServerSupabaseClient): Promise<TenantEntryResult> {
  try {
    const [organizations, establishments, branches] = await Promise.all([
      client.from("organizations").select("id, display_name, status").order("display_name"),
      client.from("establishments").select("id, organization_id, display_name, status").order("display_name"),
      client.from("branches").select("id, organization_id, establishment_id, display_name, status").order("display_name"),
    ]);

    if (organizations.error || establishments.error || branches.error || !organizations.data || !establishments.data || !branches.data) {
      return { ok: false };
    }

    return {
      ok: true,
      tenants: organizations.data.map((organization) => ({
        id: organization.id,
        displayName: organization.display_name,
        status: organization.status,
        establishments: establishments.data
          .filter((establishment) => establishment.organization_id === organization.id)
          .map((establishment) => ({
            id: establishment.id,
            displayName: establishment.display_name,
            status: establishment.status,
            branches: branches.data
              .filter((branch) => branch.establishment_id === establishment.id)
              .map((branch) => ({ id: branch.id, displayName: branch.display_name, status: branch.status })),
          })),
      })),
    };
  } catch {
    return { ok: false };
  }
}
