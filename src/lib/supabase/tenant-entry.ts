import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { loadAllPages } from "@/lib/supabase/query-pagination";

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
      loadAllPages((from, to) => client.from("organizations")
        .select("id, display_name, status", { count: "exact" })
        .order("display_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)),
      loadAllPages((from, to) => client.from("establishments")
        .select("id, organization_id, display_name, status", { count: "exact" })
        .order("display_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)),
      loadAllPages((from, to) => client.from("branches")
        .select("id, organization_id, establishment_id, display_name, status", { count: "exact" })
        .order("display_name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)),
    ]);

    if (!organizations || !establishments || !branches) {
      return { ok: false };
    }

    return {
      ok: true,
      tenants: organizations.map((organization) => ({
        id: organization.id,
        displayName: organization.display_name,
        status: organization.status,
        establishments: establishments
          .filter((establishment) => establishment.organization_id === organization.id)
          .map((establishment) => ({
            id: establishment.id,
            displayName: establishment.display_name,
            status: establishment.status,
            branches: branches
              .filter((branch) => branch.establishment_id === establishment.id)
              .map((branch) => ({ id: branch.id, displayName: branch.display_name, status: branch.status })),
          })),
      })),
    };
  } catch {
    return { ok: false };
  }
}
