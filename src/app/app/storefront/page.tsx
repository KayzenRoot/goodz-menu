import { AuthFrame } from "@/components/goodz/auth-frame";
import { StorefrontAdminPanel } from "@/components/goodz/storefront-admin-panel";
import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { resolveBranchConsoleSessionContext } from "@/lib/supabase/branch-console-context.server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function StorefrontAdminPage({ searchParams }: PageProps) {
  const ctx = await resolveBranchConsoleSessionContext(searchParams, "/app/storefront");

  if (!ctx.selectedOrganizationId || !ctx.selectedBranch) {
    return (
      <AuthFrame wide>
        <StorefrontAdminPanel
          supabaseUrl={ctx.supabaseUrl}
          anonKey={ctx.anonKey}
          tenants={ctx.tenants}
          branches={ctx.branches}
          selectedOrganizationId={ctx.selectedOrganizationId}
          selectedBranchId=""
          selectedEstablishmentId=""
          verifiedFactorIds={[]}
          canReadStorefront={false}
          canWriteStorefront={false}
          loadFailed={!ctx.entryOk}
          profile={null}
          mediaAssets={[]}
          products={[]}
        />
      </AuthFrame>
    );
  }

  const branchData = await loadStorefrontBranchData(
    ctx.client,
    ctx.selectedOrganizationId,
    ctx.selectedBranch.establishmentId,
    ctx.selectedBranch.id,
  );

  return (
    <AuthFrame wide>
      <StorefrontAdminPanel
        supabaseUrl={ctx.supabaseUrl}
        anonKey={ctx.anonKey}
        tenants={ctx.tenants}
        branches={ctx.branches}
        selectedOrganizationId={ctx.selectedOrganizationId}
        selectedBranchId={ctx.selectedBranch.id}
        selectedEstablishmentId={ctx.selectedBranch.establishmentId}
        verifiedFactorIds={ctx.verifiedFactorIds}
        canReadStorefront={branchData.canReadStorefront}
        canWriteStorefront={branchData.canWriteStorefront}
        loadFailed={branchData.failed || !ctx.entryOk}
        profile={branchData.profile}
        mediaAssets={branchData.mediaAssets}
        products={branchData.products}
      />
    </AuthFrame>
  );
}

async function loadStorefrontBranchData(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
) {
  const [readPerm, writePerm] = await Promise.all([
    checkStorefrontPerm(client, organizationId, establishmentId, branchId, "storefront.read"),
    checkStorefrontPerm(client, organizationId, establishmentId, branchId, "storefront.write"),
  ]);

  if (!readPerm.allowed) {
    return {
      canReadStorefront: false,
      canWriteStorefront: false,
      failed: readPerm.failed || writePerm.failed,
      profile: null,
      mediaAssets: [],
      products: [],
    };
  }

  const [profileRes, mediaRes, productsRes] = await Promise.all([
    client.from("storefront_profiles")
      .select("id,organization_id,establishment_id,branch_id,public_slug,headline,subheadline,hero_media_asset_id,layout_family,accent_preset,card_style,is_published,version")
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId)
      .maybeSingle(),
    client.from("media_assets")
      .select("id,provider_key,storage_key,canonical_url,mime_type,alt_text,width_px,height_px,status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50),
    client.from("products")
      .select("id,name,primary_media_asset_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  return {
    canReadStorefront: true,
    canWriteStorefront: writePerm.allowed,
    failed: Boolean(profileRes.error || mediaRes.error || readPerm.failed || writePerm.failed),
    profile: profileRes.data ?? null,
    mediaAssets: mediaRes.data ?? [],
    products: productsRes.data ?? [],
  };
}

async function checkStorefrontPerm(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
  permission: "storefront.read" | "storefront.write",
): Promise<Readonly<{ allowed: boolean; failed: boolean }>> {
  const args = {
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
    p_permission_key: permission,
  } as unknown as Database["public"]["Functions"]["storefront_has_permission"]["Args"];
  try {
    const { data, error } = await client.rpc("storefront_has_permission", args);
    return { allowed: !error && data === true, failed: !!error };
  } catch {
    return { allowed: false, failed: true };
  }
}
