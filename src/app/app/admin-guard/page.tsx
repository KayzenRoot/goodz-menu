import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { AdminGuardPanel } from "@/components/goodz/admin-guard-panel";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import { loadVisibleTenantEntry } from "@/lib/supabase/tenant-entry";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";

export const dynamic = "force-dynamic";

export default async function AdminGuardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const auth = await getCurrentAuthContext();
  if (!auth) redirect("/login?next=%2Fapp%2Fadmin-guard");

  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect("/login?next=%2Fapp%2Fadmin-guard");

  const [entries, factorResult, params] = await Promise.all([
    loadVisibleTenantEntry(auth.client),
    auth.client.auth.mfa.listFactors(),
    searchParams,
  ]);
  const requestedBranch = Array.isArray(params.branch) ? params.branch[0] : params.branch;
  const branches = entries.ok
    ? entries.tenants.flatMap((tenant) => tenant.establishments.flatMap((establishment) => establishment.branches.map((branch) => ({
        id: branch.id,
        displayName: `${tenant.displayName} · ${establishment.displayName} · ${branch.displayName}`,
      }))))
    : [];
  const verifiedFactorIds = factorResult.error || !factorResult.data
    ? []
    : factorResult.data.totp.filter(({ status }) => status === "verified").map(({ id }) => id);

  return (
    <AuthFrame>
      <AdminGuardPanel
        branches={branches}
        initialBranchId={requestedBranch ?? ""}
        verifiedFactorIds={verifiedFactorIds}
        supabaseUrl={config.config.supabaseApiUrl.toString()}
        anonKey={config.config.anonKey}
      />
    </AuthFrame>
  );
}
