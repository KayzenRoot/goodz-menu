import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { CatalogPanel } from "@/components/goodz/catalog-panel";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { loadVisibleTenantEntry } from "@/lib/supabase/tenant-entry";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function CatalogPage({ searchParams }: PageProps) {
  const auth = await getCurrentAuthContext();
  if (!auth) redirect("/login?next=%2Fapp%2Fcatalog");
  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect("/login?next=%2Fapp%2Fcatalog");

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
      }))) ?? [];
  const requestedBranchId = firstValue(params.branch);
  const selectedBranch = branchOptions.find(({ id }) => id === requestedBranchId) ?? branchOptions[0] ?? null;

  if (!tenant) {
    return (
      <AuthFrame wide>
        <CatalogPanel
          supabaseUrl={config.config.supabaseApiUrl.toString()}
          anonKey={config.config.anonKey}
          tenants={[]}
          branches={[]}
          selectedOrganizationId=""
          selectedBranchId=""
          verifiedFactorIds={[]}
          canWriteCatalog={false}
          canReadOffers={false}
          canWriteOffers={false}
          canWritePrice={false}
          canWriteAvailability={false}
          access="none"
          loadFailed={!entry.ok}
          categories={[]}
          products={[]}
          variants={[]}
          channels={[]}
          offers={[]}
        />
      </AuthFrame>
    );
  }

  const catalogData = await loadCatalogPageData(auth.client, tenant.id, selectedBranch);
  const verifiedFactorIds = factorResult.error || !factorResult.data
    ? []
    : factorResult.data.totp.filter(({ status }) => status === "verified").map(({ id }) => id);

  return (
    <AuthFrame wide>
      <CatalogPanel
        supabaseUrl={config.config.supabaseApiUrl.toString()}
        anonKey={config.config.anonKey}
        tenants={tenants.map(({ id, displayName }) => ({ id, displayName }))}
        branches={branchOptions}
        selectedOrganizationId={tenant.id}
        selectedBranchId={selectedBranch?.id ?? ""}
        verifiedFactorIds={verifiedFactorIds}
        canWriteCatalog={catalogData.canWriteCatalog}
        canReadOffers={catalogData.canReadOffers}
        canWriteOffers={catalogData.canWriteOffers}
        canWritePrice={catalogData.canWritePrice}
        canWriteAvailability={catalogData.canWriteAvailability}
        access={catalogData.access}
        loadFailed={catalogData.failed || !entry.ok}
        categories={catalogData.categories}
        products={catalogData.products}
        variants={catalogData.variants}
        channels={catalogData.channels}
        offers={catalogData.offers}
      />
    </AuthFrame>
  );
}


async function loadCatalogPageData(
  client: ServerSupabaseClient,
  organizationId: string,
  selectedBranch: Readonly<{ id: string; establishmentId: string }> | null,
) {
  const [organizationRead, organizationWrite, branchRead, branchWrite, branchPriceWrite, branchAvailabilityWrite] = await Promise.all([
    checkCatalogPermission(client, organizationId, null, null, "catalog.read"),
    checkCatalogPermission(client, organizationId, null, null, "catalog.write"),
    selectedBranch
      ? checkCatalogPermission(client, organizationId, selectedBranch.establishmentId, selectedBranch.id, "catalog.read")
      : deniedPermission(),
    selectedBranch
      ? checkCatalogPermission(client, organizationId, selectedBranch.establishmentId, selectedBranch.id, "catalog.write")
      : deniedPermission(),
    selectedBranch
      ? checkCatalogPermission(client, organizationId, selectedBranch.establishmentId, selectedBranch.id, "catalog.price.write")
      : deniedPermission(),
    selectedBranch
      ? checkCatalogPermission(client, organizationId, selectedBranch.establishmentId, selectedBranch.id, "catalog.availability.write")
      : deniedPermission(),
  ]);
  const canReadOrganizationCatalog = organizationRead.allowed;
  const canReadOffers = branchRead.allowed;
  const [categoryResult, productResult, variantResult, channelResult, offerResult] = await Promise.all([
    canReadOrganizationCatalog
      ? client.from("product_categories").select("id,organization_id,parent_id,name,description,status")
        .eq("organization_id", organizationId).order("name").limit(500)
      : emptyResult<"product_categories">(),
    canReadOrganizationCatalog
      ? client.from("products").select("id,organization_id,category_id,name,description,status")
        .eq("organization_id", organizationId).order("name").limit(500)
      : emptyResult<"products">(),
    canReadOrganizationCatalog
      ? client.from("product_variants").select("id,organization_id,product_id,name,size_label,flavor_label,status")
        .eq("organization_id", organizationId).order("name").limit(1000)
      : emptyResult<"product_variants">(),
    canReadOrganizationCatalog
      ? client.from("sales_channels").select("id,organization_id,channel_key,display_name,status")
        .eq("organization_id", organizationId).eq("status", "active").order("display_name").limit(100)
      : emptyResult<"sales_channels">(),
    canReadOffers && selectedBranch
      ? client.from("channel_offers").select("id,organization_id,establishment_id,branch_id,sales_channel_id,target_kind,product_id,variant_id,title_override,description_override,base_price,currency,availability_state,is_visible,status")
        .eq("organization_id", organizationId).eq("branch_id", selectedBranch.id).order("created_at", { ascending: false }).limit(500)
      : emptyResult<"channel_offers">(),
  ]);
  const permissionChecks = [organizationRead, organizationWrite, branchRead, branchWrite, branchPriceWrite, branchAvailabilityWrite];
  const queryResults = [categoryResult, productResult, variantResult, channelResult, offerResult];

  return {
    access: canReadOrganizationCatalog ? "organization" as const : canReadOffers ? "branch" as const : "none" as const,
    failed: permissionChecks.some(({ failed }) => failed) || queryResults.some(({ error }) => error !== null),
    canWriteCatalog: organizationWrite.allowed,
    canReadOffers,
    canWriteOffers: branchWrite.allowed,
    canWritePrice: branchPriceWrite.allowed,
    canWriteAvailability: branchAvailabilityWrite.allowed,
    categories: categoryResult.data ?? [],
    products: productResult.data ?? [],
    variants: variantResult.data ?? [],
    channels: channelResult.data ?? [],
    offers: offerResult.data ?? [],
  };
}
type CatalogPermissionKey = "catalog.read" | "catalog.write" | "catalog.price.write" | "catalog.availability.write";
type CatalogPermissionResult = Readonly<{ allowed: boolean; failed: boolean }>;

async function checkCatalogPermission(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string | null,
  branchId: string | null,
  permission: CatalogPermissionKey,
): Promise<CatalogPermissionResult> {
  const args = {
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
    p_permission_key: permission,
  } as unknown as Database["public"]["Functions"]["catalog_has_permission"]["Args"];
  try {
    const { data, error } = await client.rpc("catalog_has_permission", args);
    return { allowed: !error && data === true, failed: !!error };
  } catch {
    return { allowed: false, failed: true };
  }
}

function deniedPermission(): CatalogPermissionResult {
  return { allowed: false, failed: false };
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function emptyResult<Table extends "product_categories" | "products" | "product_variants" | "sales_channels" | "channel_offers">() {
  return { data: [], error: null } as unknown as {
    data: Database["public"]["Tables"][Table]["Row"][];
    error: null;
  };
}
