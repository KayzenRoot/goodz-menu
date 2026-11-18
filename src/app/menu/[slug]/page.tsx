import { PublicStorefrontShell, type PublicStorefrontBundle } from "@/components/goodz/public-storefront-shell";
import { normalizeStorefrontSlug } from "@/lib/storefront/storefront-domain";
import { createPublicAnonSupabaseClient } from "@/lib/supabase/public-anon-client.server";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export default async function PublicStorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = normalizeStorefrontSlug(slug);
  const client = normalizedSlug ? createPublicAnonSupabaseClient() : null;

  let bundle: PublicStorefrontBundle | null = null;
  if (client && normalizedSlug) {
    const { data, error } = await client.rpc("storefront_get_public_menu", {
      p_slug: normalizedSlug,
    });
    if (!error && data && typeof data === "object" && !Array.isArray(data)) {
      bundle = data as unknown as PublicStorefrontBundle;
    }
  }

  return <PublicStorefrontShell bundle={bundle} />;
}
