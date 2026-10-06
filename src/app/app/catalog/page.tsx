import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { LogoutButton } from "@/components/goodz/logout-button";
import { CatalogConsole } from "@/components/goodz/catalog-console";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import { loadCatalogOverview } from "@/lib/catalog/catalog-queries.server";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";

export const dynamic = "force-dynamic";

type CatalogSearchParams = Promise<{ search?: string | string[] }>;

function readSearch(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.slice(0, 120) : "";
}

export default async function CatalogPage({ searchParams }: Readonly<{ searchParams: CatalogSearchParams }>) {
  const auth = await getCurrentAuthContext();
  if (!auth) redirect("/login?next=%2Fapp%2Fcatalog");

  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect("/login?next=%2Fapp%2Fcatalog");

  const search = readSearch((await searchParams).search);
  const overview = await loadCatalogOverview(auth.client, search, null);

  return (
    <AuthFrame>
      <div className="tenant-entry">
        <div className="tenant-entry-header">
          <div className="auth-logout-wrap">
            <Link className="auth-entry-link" href="/app">Voltar</Link>
            <LogoutButton supabaseUrl={config.config.supabaseApiUrl.toString()} anonKey={config.config.anonKey} />
          </div>
        </div>

        <CatalogConsole overview={overview} search={search} />
      </div>
    </AuthFrame>
  );
}