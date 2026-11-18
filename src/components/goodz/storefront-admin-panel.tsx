"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { reauthenticateForPrivilegedAction } from "@/app/app/security/actions";
import {
  registerProductMediaAction,
  saveStorefrontProfileAction,
  type StorefrontAdminActionState,
} from "@/app/app/storefront/actions";
import { PrivilegedStepUpPrompt } from "@/components/goodz/privileged-step-up-prompt";
import type { Database } from "@/lib/supabase/database.types";

type StorefrontProfileRow = Pick<
  Database["public"]["Tables"]["storefront_profiles"]["Row"],
  | "id"
  | "organization_id"
  | "establishment_id"
  | "branch_id"
  | "public_slug"
  | "headline"
  | "subheadline"
  | "hero_media_asset_id"
  | "layout_family"
  | "accent_preset"
  | "card_style"
  | "is_published"
  | "version"
>;

type MediaAssetRow = Pick<
  Database["public"]["Tables"]["media_assets"]["Row"],
  "id" | "provider_key" | "storage_key" | "canonical_url" | "mime_type" | "alt_text" | "width_px" | "height_px" | "status"
>;

type ProductSummaryRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "id" | "name" | "primary_media_asset_id"
>;

type StorefrontAdminPanelProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  tenants: { id: string; displayName: string }[];
  branches: { id: string; displayName: string; establishmentId: string }[];
  selectedOrganizationId: string;
  selectedBranchId: string;
  selectedEstablishmentId: string;
  verifiedFactorIds: string[];
  canReadStorefront: boolean;
  canWriteStorefront: boolean;
  loadFailed: boolean;
  profile: StorefrontProfileRow | null;
  mediaAssets: MediaAssetRow[];
  products: ProductSummaryRow[];
}>;

export function StorefrontAdminPanel(props: StorefrontAdminPanelProps) {
  return (
    <div className="catalog-page storefront-admin-page">
      <header className="catalog-header">
        <div>
          <span className="auth-eyebrow">GOODZ ONLINE · VITRINE E MÍDIA</span>
          <h1 id="storefront-admin-title">Vitrine online e acervo de mídia</h1>
          <p>
            Configure o endereço público da unidade, famílias de layout com schema seguro (sem CSS arbitrário) e ativos de mídia independentes de provedor.
          </p>
        </div>
        <nav className="catalog-links" aria-label="Navegação operacional">
          <Link className="auth-entry-link" href="/app">Espaços</Link>
          <Link className="auth-entry-link" href="/app/orders">Pedidos</Link>
          <Link className="auth-entry-link" href="/app/delivery">Entregas</Link>
          <Link className="auth-entry-link" href="/app/catalog">Catálogo</Link>
          <Link className="auth-entry-link" href="/app/settings">Configurações</Link>
        </nav>
      </header>

      <form className="catalog-scope settings-scope-bar" method="get" action="/app/storefront">
        <div className="auth-field">
          <label htmlFor="sf-organization">Organização</label>
          <select id="sf-organization" name="organization" defaultValue={props.selectedOrganizationId} required>
            {props.tenants.map(({ id, displayName }) => (
              <option key={id} value={id}>{displayName}</option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <label htmlFor="sf-branch">Unidade publicada</label>
          <select id="sf-branch" name="branch" defaultValue={props.selectedBranchId}>
            {props.branches.map(({ id, displayName }) => (
              <option key={id} value={id}>{displayName}</option>
            ))}
          </select>
        </div>
        <button className="auth-submit catalog-scope-submit" type="submit">Selecionar unidade</button>
      </form>

      {props.loadFailed ? (
        <p className="catalog-alert" role="alert">
          Não foi possível carregar as configurações de vitrine desta unidade.
        </p>
      ) : (
        <StorefrontAdminContent props={props} />
      )}
    </div>
  );
}

function StorefrontAdminContent({ props }: Readonly<{ props: StorefrontAdminPanelProps }>) {
  if (!props.canReadStorefront) {
    return (
      <section className="catalog-empty" aria-labelledby="sf-no-access-title">
        <h2 id="sf-no-access-title">Permissão de vitrine necessária</h2>
        <p>Sua sessão atual não possui permissão para consultar a vitrine pública desta unidade.</p>
      </section>
    );
  }

  return (
    <>
      {props.profile?.is_published ? (
        <section className="orders-status-banner" aria-label="Link público da vitrine">
          <div>
            <strong>Vitrine publicada (v{props.profile.version}):</strong>{" "}
            <Link href={`/menu/${props.profile.public_slug}`}>
              /menu/{props.profile.public_slug}
            </Link>
          </div>
          <span className="settings-plan-pill">Layout: {props.profile.layout_family}</span>
        </section>
      ) : null}

      <StorefrontProfileSection props={props} />
      <StorefrontMediaSection props={props} />
    </>
  );
}

function StorefrontProfileSection({ props }: Readonly<{ props: StorefrontAdminPanelProps }>) {
  const [state, action, pending] = useActionState(saveStorefrontProfileAction, null);
  const [totpVerified, setTotpVerified] = useState(false);
  const [reauthState, reauthAction, reauthPending] = useActionState(reauthenticateForPrivilegedAction, null);

  return (
    <section className="catalog-section" aria-labelledby="sf-profile-heading">
      <div className="catalog-section-heading">
        <div>
          <span className="catalog-index">01</span>
          <h2 id="sf-profile-heading">Perfil público e schema seguro de tema (v1)</h2>
        </div>
      </div>

      {props.canWriteStorefront ? (
        <>
          <form className="catalog-offer-form" action={action}>
            <input type="hidden" name="organizationId" value={props.selectedOrganizationId} />
            <input type="hidden" name="establishmentId" value={props.selectedEstablishmentId} />
            <input type="hidden" name="branchId" value={props.selectedBranchId} />

            <div className="catalog-create-grid">
              <div className="auth-field">
                <label htmlFor="sf-slug">Slug público (/menu/slug)</label>
                <input
                  id="sf-slug"
                  name="publicSlug"
                  defaultValue={props.profile?.public_slug ?? ""}
                  placeholder="ex.: bistro-jardins"
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="sf-headline">Título principal da vitrine</label>
                <input
                  id="sf-headline"
                  name="headline"
                  defaultValue={props.profile?.headline ?? ""}
                  placeholder="Ex.: Cozinha artesanal fresca todos os dias"
                  maxLength={140}
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="sf-subheadline">Subtítulo / aviso curto</label>
                <input
                  id="sf-subheadline"
                  name="subheadline"
                  defaultValue={props.profile?.subheadline ?? ""}
                  maxLength={280}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="sf-layout">Família visual de layout</label>
                <select id="sf-layout" name="layoutFamily" defaultValue={props.profile?.layout_family ?? "editorial_bistro"}>
                  <option value="editorial_bistro">Editorial Bistrô (destaque gastronômico)</option>
                  <option value="express_grid">Express Grid (foco em agilidade mobile)</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="sf-accent">Paleta aprovada de tokens</label>
                <select id="sf-accent" name="accentPreset" defaultValue={props.profile?.accent_preset ?? "emerald_garden"}>
                  <option value="emerald_garden">Emerald Garden</option>
                  <option value="terracotta_oven">Terracotta Oven</option>
                  <option value="midnight_amber">Midnight Amber</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="sf-card-style">Variante de cartão</label>
                <select id="sf-card-style" name="cardStyle" defaultValue={props.profile?.card_style ?? "elevated_glass"}>
                  <option value="elevated_glass">Elevated Glass</option>
                  <option value="crisp_minimal">Crisp Minimal</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="sf-hero-media">Imagem de capa (opcional)</label>
                <select id="sf-hero-media" name="heroMediaAssetId" defaultValue={props.profile?.hero_media_asset_id ?? ""}>
                  <option value="">Sem imagem de capa</option>
                  {props.mediaAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.alt_text}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="sf-published">Estado de publicação</label>
                <select id="sf-published" name="isPublished" defaultValue={props.profile?.is_published === false ? "false" : "true"}>
                  <option value="true">Publicada</option>
                  <option value="false">Oculta (rascunho)</option>
                </select>
              </div>
            </div>

            <button className="catalog-save-button" type="submit" disabled={pending}>
              {pending ? "Salvando vitrine…" : "Salvar vitrine pública (protegido por Admin Guard)"}
            </button>
          </form>

          <StorefrontAdminFeedback state={state} />
          <PrivilegedStepUpPrompt
            idPrefix="sf-profile"
            state={state}
            verifiedFactorIds={props.verifiedFactorIds}
            totpVerified={totpVerified}
            setTotpVerified={setTotpVerified}
            supabaseUrl={props.supabaseUrl}
            anonKey={props.anonKey}
            reauthentication={reauthState}
            reauthenticationAction={reauthAction}
            reauthenticationPending={reauthPending}
            actionLabel="vitrine pública"
          />
        </>
      ) : (
        <p className="catalog-form-note">
          Somente proprietários ou administradores podem publicar ou alterar o tema da vitrine.
        </p>
      )}
    </section>
  );
}

function StorefrontMediaSection({ props }: Readonly<{ props: StorefrontAdminPanelProps }>) {
  const [state, action, pending] = useActionState(registerProductMediaAction, null);

  return (
    <section className="catalog-section" aria-labelledby="sf-media-heading">
      <div className="catalog-section-heading">
        <div>
          <span className="catalog-index">02</span>
          <h2 id="sf-media-heading">Abstração de mídia por provedor (MediaAsset)</h2>
        </div>
        <span className="catalog-section-count">{props.mediaAssets.length}</span>
      </div>

      {props.canWriteStorefront ? (
        <>
          <form className="catalog-offer-form" action={action}>
            <input type="hidden" name="organizationId" value={props.selectedOrganizationId} />
            <input type="hidden" name="establishmentId" value={props.selectedEstablishmentId} />
            <input type="hidden" name="branchId" value={props.selectedBranchId} />

            <div className="catalog-create-grid">
              <div className="auth-field">
                <label htmlFor="media-product">Vincular ao produto (opcional)</label>
                <select id="media-product" name="productId" defaultValue="">
                  <option value="">Apenas registrar no acervo</option>
                  {props.products.map((prod) => (
                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="media-provider">Adaptador de provedor</label>
                <select id="media-provider" name="providerKey" defaultValue="external_https">
                  <option value="external_https">HTTPS Externo Validado</option>
                  <option value="supabase_storage">Supabase Storage</option>
                  <option value="cdn_proxy">CDN Transform Proxy</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="media-storage-key">Chave lógica de armazenamento</label>
                <input id="media-storage-key" name="storageKey" placeholder="catalog/burger-artesanal.webp" required />
              </div>
              <div className="auth-field">
                <label htmlFor="media-url">URL canônica HTTPS</label>
                <input id="media-url" name="canonicalUrl" placeholder="https://images.example.com/burger.webp" required />
              </div>
              <div className="auth-field">
                <label htmlFor="media-mime">Formato MIME</label>
                <select id="media-mime" name="mimeType" defaultValue="image/webp">
                  <option value="image/webp">image/webp</option>
                  <option value="image/avif">image/avif</option>
                  <option value="image/jpeg">image/jpeg</option>
                  <option value="image/png">image/png</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="media-alt">Texto alternativo acessível (alt)</label>
                <input id="media-alt" name="altText" placeholder="Ex.: Hambúrguer duplo no pão brioche" maxLength={180} required />
              </div>
              <div className="auth-field">
                <label htmlFor="media-width">Largura (px)</label>
                <input id="media-width" name="widthPx" type="number" min={64} max={4096} defaultValue="800" required />
              </div>
              <div className="auth-field">
                <label htmlFor="media-height">Altura (px)</label>
                <input id="media-height" name="heightPx" type="number" min={64} max={4096} defaultValue="600" required />
              </div>
            </div>

            <button className="auth-logout" type="submit" disabled={pending}>
              {pending ? "Registrando mídia…" : "Registrar MediaAsset e variante"}
            </button>
          </form>
          <StorefrontAdminFeedback state={state} />
        </>
      ) : null}

      {props.mediaAssets.length > 0 ? (
        <div className="catalog-card-grid">
          {props.mediaAssets.map((asset) => (
            <article className="catalog-card" key={asset.id}>
              <span className="catalog-badge">{asset.provider_key}</span>
              <h3>{asset.alt_text}</h3>
              <p className="catalog-meta">
                {asset.mime_type} · {asset.width_px}×{asset.height_px}px · {asset.storage_key}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="catalog-empty-note">Nenhum MediaAsset registrado nesta organização.</p>
      )}
    </section>
  );
}

function StorefrontAdminFeedback({ state }: Readonly<{ state: StorefrontAdminActionState }>) {
  if (!state) return null;
  if (state.kind === "saved") {
    const slugNote = state.publicSlug ? ` (/menu/${state.publicSlug})` : "";
    return (
      <output className="catalog-form-success">
        Alteração salva e auditada{slugNote}. Código: {state.correlationId}
      </output>
    );
  }
  if (state.kind === "step_up_required" || state.kind === "reauthentication_required") {
    return (
      <output className="catalog-form-note">
        Confirme o segundo fator / senha recente antes de publicar alterações na vitrine. Código: {state.correlationId}
      </output>
    );
  }
  if (state.kind === "factor_setup_required") {
    return (
      <p className="catalog-form-error" role="alert">
        Configure um fator autenticador em <Link href="/app/security">Segurança</Link>. Código: {state.correlationId}
      </p>
    );
  }
  const messages: Record<string, string> = {
    invalid: "Verifique o slug (letras minúsculas, números e hífens), título ou URL HTTPS.",
    denied: "Operação não autorizada para sua sessão.",
    duplicate_slug: "Este slug público já está em uso por outra unidade.",
    failed: "Não foi possível salvar agora.",
  };
  return (
    <p className="catalog-form-error" role="alert">
      {messages[state.kind] ?? messages.failed} Código: {state.correlationId}
    </p>
  );
}
