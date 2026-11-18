import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { PrivacyPanel } from "@/components/goodz/privacy-panel";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import type { Database } from "@/lib/supabase/database.types";
import { loadVisibleTenantEntry } from "@/lib/supabase/tenant-entry";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function PrivacyPage({ searchParams }: PageProps) {
  const auth = await getCurrentAuthContext();
  if (!auth) redirect("/login?next=%2Fapp%2Fprivacy");
  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect("/login?next=%2Fapp%2Fprivacy");

  const [entry, factorResult, params] = await Promise.all([
    loadVisibleTenantEntry(auth.client),
    auth.client.auth.mfa.listFactors(),
    searchParams,
  ]);
  const tenants = entry.ok ? entry.tenants.filter(({ status }) => status === "active") : [];
  const requestedOrgId = Array.isArray(params.organization) ? params.organization[0] : params.organization;
  const selectedTenant = tenants.find(({ id }) => id === requestedOrgId) ?? tenants[0] ?? null;
  const verifiedFactorIds = factorResult.error || !factorResult.data
    ? []
    : factorResult.data.totp.filter(({ status }) => status === "verified").map(({ id }) => id);

  if (!selectedTenant) {
    return (
      <AuthFrame wide>
        <PrivacyPanel
          supabaseUrl={config.config.supabaseApiUrl.toString()}
          anonKey={config.config.anonKey}
          tenants={[]}
          selectedOrganizationId=""
          verifiedFactorIds={verifiedFactorIds}
          canReadPrivacy={false}
          canManagePrivacy={false}
          loadFailed={!entry.ok}
          customers={[]}
          consents={[]}
        />
      </AuthFrame>
    );
  }

  const data = await loadPrivacyConsoleData(auth.client, selectedTenant.id);
  return (
    <AuthFrame wide>
      <PrivacyPanel
        supabaseUrl={config.config.supabaseApiUrl.toString()}
        anonKey={config.config.anonKey}
        tenants={tenants.map(({ id, displayName }) => ({ id, displayName }))}
        selectedOrganizationId={selectedTenant.id}
        verifiedFactorIds={verifiedFactorIds}
        canReadPrivacy={data.canRead}
        canManagePrivacy={data.canManage}
        loadFailed={data.failed || !entry.ok}
        customers={data.customers}
        consents={data.consents}
      />
    </AuthFrame>
  );
}

async function loadPrivacyConsoleData(client: ServerSupabaseClient, organizationId: string) {
  const [readPerm, managePerm] = await Promise.all([
    checkPrivacyPermission(client, organizationId, "privacy.read"),
    checkPrivacyPermission(client, organizationId, "privacy.manage"),
  ]);

  if (!readPerm.allowed) {
    return {
      canRead: false,
      canManage: false,
      failed: readPerm.failed || managePerm.failed,
      customers: [],
      consents: [],
    };
  }

  const listArgs = {
    p_organization_id: organizationId,
    p_retention_days: 365,
  } as unknown as Database["public"]["Functions"]["privacy_list_customers"]["Args"];

  const [customersResult, consentsResult] = await Promise.all([
    client.rpc("privacy_list_customers", listArgs),
    client
      .from("customer_consents")
      .select("id,customer_id,purpose,granted,source,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  return {
    canRead: true,
    canManage: managePerm.allowed,
    failed: readPerm.failed || managePerm.failed || Boolean(customersResult.error || consentsResult.error),
    customers: customersResult.data ?? [],
    consents: consentsResult.data ?? [],
  };
}

async function checkPrivacyPermission(
  client: ServerSupabaseClient,
  organizationId: string,
  permissionKey: "privacy.read" | "privacy.manage",
): Promise<Readonly<{ allowed: boolean; failed: boolean }>> {
  const args = {
    p_organization_id: organizationId,
    p_permission_key: permissionKey,
  } as unknown as Database["public"]["Functions"]["privacy_has_permission"]["Args"];
  try {
    const { data, error } = await client.rpc("privacy_has_permission", args);
    return { allowed: !error && data === true, failed: Boolean(error) };
  } catch {
    return { allowed: false, failed: true };
  }
}
