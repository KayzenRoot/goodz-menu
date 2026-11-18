import "server-only";
import { redirect } from "next/navigation";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { loadVisibleTenantEntry } from "@/lib/supabase/tenant-entry";

export type ConsoleTenantOption = Readonly<{ id: string; displayName: string }>;
export type ConsoleBranchOption = Readonly<{
  id: string;
  displayName: string;
  establishmentId: string;
}>;

export type BranchConsoleSessionContext = Readonly<{
  client: ServerSupabaseClient;
  supabaseUrl: string;
  anonKey: string;
  entryOk: boolean;
  tenants: ConsoleTenantOption[];
  branches: ConsoleBranchOption[];
  selectedOrganizationId: string;
  selectedBranch: ConsoleBranchOption | null;
  verifiedFactorIds: string[];
}>;

export async function resolveBranchConsoleSessionContext(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  nextPath: string,
): Promise<BranchConsoleSessionContext> {
  const encodedNext = encodeURIComponent(nextPath);
  const auth = await getCurrentAuthContext();
  if (!auth) redirect(`/login?next=${encodedNext}`);
  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect(`/login?next=${encodedNext}`);

  const [entry, factorResult, params] = await Promise.all([
    loadVisibleTenantEntry(auth.client),
    auth.client.auth.mfa.listFactors(),
    searchParams,
  ]);
  const activeTenants = entry.ok ? entry.tenants.filter(({ status }) => status === "active") : [];
  const requestedOrgId = firstQueryValue(params.organization);
  const tenant = activeTenants.find(({ id }) => id === requestedOrgId) ?? activeTenants[0] ?? null;

  const branches: ConsoleBranchOption[] = tenant?.establishments
    .filter(({ status }) => status === "active")
    .flatMap((establishment) => establishment.branches
      .filter(({ status }) => status === "active")
      .map((branch) => ({
        id: branch.id,
        displayName: `${establishment.displayName} · ${branch.displayName}`,
        establishmentId: establishment.id,
      }))) ?? [];

  const requestedBranchId = firstQueryValue(params.branch);
  const selectedBranch = branches.find(({ id }) => id === requestedBranchId) ?? branches[0] ?? null;
  const verifiedFactorIds = factorResult.error || !factorResult.data
    ? []
    : factorResult.data.totp.filter(({ status }) => status === "verified").map(({ id }) => id);

  return {
    client: auth.client,
    supabaseUrl: config.config.supabaseApiUrl.toString(),
    anonKey: config.config.anonKey,
    entryOk: entry.ok,
    tenants: activeTenants.map(({ id, displayName }) => ({ id, displayName })),
    branches,
    selectedOrganizationId: tenant?.id ?? "",
    selectedBranch,
    verifiedFactorIds,
  };
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
