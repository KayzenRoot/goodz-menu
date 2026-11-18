import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { SettingsPanel } from "@/components/goodz/settings-panel";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { loadVisibleTenantEntry } from "@/lib/supabase/tenant-entry";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function SettingsPage({ searchParams }: PageProps) {
  const auth = await getCurrentAuthContext();
  if (!auth) redirect("/login?next=%2Fapp%2Fsettings");
  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect("/login?next=%2Fapp%2Fsettings");

  const [entry, factorResult, params] = await Promise.all([
    loadVisibleTenantEntry(auth.client),
    auth.client.auth.mfa.listFactors(),
    searchParams,
  ]);
  const tenants = entry.ok ? entry.tenants.filter(({ status }) => status === "active") : [];
  const requestedOrganizationId = firstValue(params.organization);
  const tenant = tenants.find(({ id }) => id === requestedOrganizationId) ?? tenants[0] ?? null;

  const branchOptions = tenant?.establishments
    .filter(({ status }) => status === "active")
    .flatMap((establishment) => establishment.branches
      .filter(({ status }) => status === "active")
      .map((branch) => ({
        id: branch.id,
        displayName: `${establishment.displayName} · ${branch.displayName}`,
        establishmentId: establishment.id,
        establishmentName: establishment.displayName,
      }))) ?? [];

  const requestedBranchId = firstValue(params.branch);
  // D-0023: auto-select the active branch when only 1 branch exists or none was specified
  const selectedBranch = branchOptions.find(({ id }) => id === requestedBranchId) ?? branchOptions[0] ?? null;
  const requestedScope = firstValue(params.scope);

  if (!tenant) {
    return (
      <AuthFrame wide>
        <SettingsPanel
          supabaseUrl={config.config.supabaseApiUrl.toString()}
          anonKey={config.config.anonKey}
          userId={auth.user.id}
          tenants={[]}
          branches={[]}
          selectedOrganizationId=""
          selectedBranchId=""
          selectedScope="branch"
          verifiedFactorIds={[]}
          access="none"
          loadFailed={!entry.ok}
          canWriteOrganization={false}
          canWriteSensitiveOrganization={false}
          canWriteBranch={false}
          canWriteSensitiveBranch={false}
          definitions={[]}
          scopedValues={[]}
          effectiveSettings={[]}
          entitlements={[]}
        />
      </AuthFrame>
    );
  }

  const pageData = await loadSettingsPageData(auth.client, tenant.id, selectedBranch);
  const verifiedFactorIds = factorResult.error || !factorResult.data
    ? []
    : factorResult.data.totp.filter(({ status }) => status === "verified").map(({ id }) => id);

  const defaultScope = resolveDefaultEditingScope(pageData.canWriteOrganization, requestedScope, Boolean(selectedBranch));

  return (
    <AuthFrame wide>
      <SettingsPanel
        supabaseUrl={config.config.supabaseApiUrl.toString()}
        anonKey={config.config.anonKey}
        userId={auth.user.id}
        tenants={tenants.map(({ id, displayName }) => ({ id, displayName }))}
        branches={branchOptions}
        selectedOrganizationId={tenant.id}
        selectedBranchId={selectedBranch?.id ?? ""}
        selectedScope={defaultScope}
        verifiedFactorIds={verifiedFactorIds}
        access={pageData.access}
        loadFailed={pageData.failed || !entry.ok}
        canWriteOrganization={pageData.canWriteOrganization}
        canWriteSensitiveOrganization={pageData.canWriteSensitiveOrganization}
        canWriteBranch={pageData.canWriteBranch}
        canWriteSensitiveBranch={pageData.canWriteSensitiveBranch}
        definitions={pageData.definitions}
        scopedValues={pageData.scopedValues}
        effectiveSettings={pageData.effectiveSettings}
        entitlements={pageData.entitlements}
      />
    </AuthFrame>
  );
}

async function loadSettingsPageData(
  client: ServerSupabaseClient,
  organizationId: string,
  selectedBranch: Readonly<{ id: string; establishmentId: string }> | null,
) {
  const [
    canReadOrg,
    orgWrite,
    orgSensitiveWrite,
    branchRead,
    branchWrite,
    branchSensitiveWrite,
  ] = await Promise.all([
    checkCanReadOrganization(client, organizationId),
    checkSettingsPermission(client, organizationId, null, null, "settings.write"),
    checkSettingsPermission(client, organizationId, null, null, "settings.sensitive.write"),
    selectedBranch
      ? checkSettingsPermission(client, organizationId, selectedBranch.establishmentId, selectedBranch.id, "settings.read")
      : deniedPermission(),
    selectedBranch
      ? checkSettingsPermission(client, organizationId, selectedBranch.establishmentId, selectedBranch.id, "settings.write")
      : deniedPermission(),
    selectedBranch
      ? checkSettingsPermission(client, organizationId, selectedBranch.establishmentId, selectedBranch.id, "settings.sensitive.write")
      : deniedPermission(),
  ]);

  const hasRead = canReadOrg.allowed || branchRead.allowed;
  if (!hasRead) {
    return {
      access: "none" as const,
      failed: [canReadOrg, orgWrite, orgSensitiveWrite, branchRead, branchWrite, branchSensitiveWrite].some(({ failed }) => failed),
      canWriteOrganization: false,
      canWriteSensitiveOrganization: false,
      canWriteBranch: false,
      canWriteSensitiveBranch: false,
      definitions: [],
      scopedValues: [],
      effectiveSettings: [],
      entitlements: [],
    };
  }

  const [definitionsResult, valuesResult, effectiveResult, entitlementsResult] = await Promise.all([
    client.from("setting_definitions")
      .select("key,display_name,description,value_type,allowed_scopes,default_value,validation_rules,sensitivity,audit_required,lockable_scopes,schema_version")
      .eq("status", "active")
      .order("key"),
    client.from("setting_values")
      .select("id,setting_key,scope_type,organization_id,establishment_id,branch_id,role_id,user_id,value_json,is_locked,version,updated_at")
      .or(`scope_type.eq.platform,organization_id.eq.${organizationId}`),
    client.rpc("resolve_effective_settings", {
      p_organization_id: organizationId,
      ...(selectedBranch ? {
        p_establishment_id: selectedBranch.establishmentId,
        p_branch_id: selectedBranch.id,
      } : {}),
    }),
    client.rpc("resolve_tenant_entitlements", { p_organization_id: organizationId }),
  ]);

  const checks = [canReadOrg, orgWrite, orgSensitiveWrite, branchRead, branchWrite, branchSensitiveWrite];
  const queriesFailed = Boolean(
    definitionsResult.error || valuesResult.error || effectiveResult.error || entitlementsResult.error,
  );

  return {
    access: orgWrite.allowed ? "organization" as const : "branch" as const,
    failed: checks.some(({ failed }) => failed) || queriesFailed,
    canWriteOrganization: orgWrite.allowed,
    canWriteSensitiveOrganization: orgSensitiveWrite.allowed,
    canWriteBranch: branchWrite.allowed,
    canWriteSensitiveBranch: branchSensitiveWrite.allowed,
    definitions: definitionsResult.data ?? [],
    scopedValues: valuesResult.data ?? [],
    effectiveSettings: effectiveResult.data ?? [],
    entitlements: entitlementsResult.data ?? [],
  };
}

type SettingsPermissionKey = "settings.read" | "settings.write" | "settings.sensitive.write";
type PermissionResult = Readonly<{ allowed: boolean; failed: boolean }>;

async function checkCanReadOrganization(
  client: ServerSupabaseClient,
  organizationId: string,
): Promise<PermissionResult> {
  try {
    const { data, error } = await client.rpc("settings_can_read_organization", {
      p_organization_id: organizationId,
    });
    return { allowed: !error && data === true, failed: !!error };
  } catch {
    return { allowed: false, failed: true };
  }
}

async function checkSettingsPermission(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string | null,
  branchId: string | null,
  permission: SettingsPermissionKey,
): Promise<PermissionResult> {
  const args = {
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
    p_permission_key: permission,
  } as unknown as Database["public"]["Functions"]["settings_has_permission"]["Args"];
  try {
    const { data, error } = await client.rpc("settings_has_permission", args);
    return { allowed: !error && data === true, failed: !!error };
  } catch {
    return { allowed: false, failed: true };
  }
}

function deniedPermission(): PermissionResult {
  return { allowed: false, failed: false };
}

function resolveDefaultEditingScope(
  canWriteOrganization: boolean,
  requestedScope: string | undefined,
  hasSelectedBranch: boolean,
): "branch" | "organization" {
  if (canWriteOrganization && requestedScope === "organization") {
    return "organization";
  }
  return hasSelectedBranch ? "branch" : "organization";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
