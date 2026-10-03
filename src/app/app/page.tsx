import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { LogoutButton } from "@/components/goodz/logout-button";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import { loadVisibleTenantEntry } from "@/lib/supabase/tenant-entry";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";

export const dynamic = "force-dynamic";

export default async function TenantEntryPage() {
  const auth = await getCurrentAuthContext();
  if (!auth) redirect("/login?next=%2Fapp");

  const config = readSupabaseAuthConfig();
  if (!config.ok) redirect("/login?next=%2Fapp");

  const result = await loadVisibleTenantEntry(auth.client);
  return (
    <AuthFrame>
      <div className="tenant-entry">
        <header className="tenant-entry-header">
          <div>
            <span className="auth-eyebrow">ESPAÇO DE TRABALHO</span>
            <h1>Seu Goodz Menu</h1>
            <p>Os espaços exibidos seguem suas permissões atuais.</p>
          </div>
          <LogoutButton supabaseUrl={config.config.supabaseApiUrl.toString()} anonKey={config.config.anonKey} />
        </header>

        {!result.ok ? (
          <section className="tenant-empty-state" role="status">
            <span className="tenant-state-mark" aria-hidden="true">!</span>
            <h2>Não foi possível carregar seu espaço de trabalho</h2>
            <p>Tente novamente em alguns instantes.</p>
          </section>
        ) : result.tenants.length === 0 ? (
          <section className="tenant-empty-state" role="status">
            <span className="tenant-state-mark" aria-hidden="true">g</span>
            <h2>Ainda não há um espaço de trabalho disponível</h2>
            <p>Sua conta está conectada, mas nenhum acesso de organização está ativo.</p>
          </section>
        ) : (
          <section className="tenant-list" aria-labelledby="tenant-list-title">
            <h2 id="tenant-list-title" className="tenant-list-title">Espaços disponíveis</h2>
            {result.tenants.map((tenant) => (
              <article className="tenant-card" key={tenant.id}>
                <span className="tenant-card-label">ORGANIZAÇÃO</span>
                <h3>{tenant.displayName}</h3>
                {tenant.establishments.length > 0 ? (
                  <ul className="tenant-establishments">
                    {tenant.establishments.map((establishment) => (
                      <li key={establishment.id}>
                        <span className="tenant-resource-icon" aria-hidden="true">E</span>
                        <div>
                          <strong>{establishment.displayName}</strong>
                          {establishment.branches.length > 0 ? (
                            <ul className="tenant-branches">
                              {establishment.branches.map((branch) => <li key={branch.id}>{branch.displayName}</li>)}
                            </ul>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </section>
        )}

        <p className="tenant-entry-footnote">O acesso é reavaliado pelo servidor a cada entrada.</p>
      </div>
    </AuthFrame>
  );
}
