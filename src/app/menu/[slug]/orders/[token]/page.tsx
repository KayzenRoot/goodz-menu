import { PublicOrderTrackingView, type PublicOrderTrackingBundle } from "@/components/goodz/public-order-tracking-view";
import { normalizeStorefrontSlug } from "@/lib/storefront/storefront-domain";
import { createPublicAnonSupabaseClient } from "@/lib/supabase/public-anon-client.server";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  params: Promise<{ slug: string; token: string }>;
}>;

export default async function PublicOrderTrackingPage({ params }: PageProps) {
  const { slug, token } = await params;
  const cleanSlug = normalizeStorefrontSlug(slug);
  const cleanToken = token.trim().toLowerCase();
  const validToken = /^[0-9a-f]{48}$/.test(cleanToken);
  const client = cleanSlug && validToken ? createPublicAnonSupabaseClient() : null;

  let tracking: PublicOrderTrackingBundle | null = null;
  if (client && cleanSlug && validToken) {
    const { data, error } = await client.rpc("storefront_get_order_tracking", {
      p_slug: cleanSlug,
      p_tracking_token: cleanToken,
    });
    if (!error && data && typeof data === "object" && !Array.isArray(data)) {
      tracking = data as unknown as PublicOrderTrackingBundle;
    }
  }

  return <PublicOrderTrackingView slug={cleanSlug ?? ""} tracking={tracking} />;
}
