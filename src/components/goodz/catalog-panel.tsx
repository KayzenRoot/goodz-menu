"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  reauthenticateForPrivilegedAction,
  type ReauthenticationActionState,
} from "@/app/app/security/actions";
import {
  saveCategoryAction,
  saveOfferAction,
  saveProductAction,
  saveVariantAction,
  type CatalogActionState,
} from "@/app/app/catalog/actions";
import { TotpChallengeForm } from "@/components/goodz/totp-challenge-form";
import type { Database } from "@/lib/supabase/database.types";

type Category = Pick<Database["public"]["Tables"]["product_categories"]["Row"], "id" | "organization_id" | "parent_id" | "name" | "description" | "status">;
type Product = Pick<Database["public"]["Tables"]["products"]["Row"], "id" | "organization_id" | "category_id" | "name" | "description" | "status">;
type Variant = Pick<Database["public"]["Tables"]["product_variants"]["Row"], "id" | "organization_id" | "product_id" | "name" | "size_label" | "flavor_label" | "status">;
type Channel = Pick<Database["public"]["Tables"]["sales_channels"]["Row"], "id" | "organization_id" | "channel_key" | "display_name" | "status">;
type Offer = Pick<Database["public"]["Tables"]["channel_offers"]["Row"],
  | "id" | "organization_id" | "establishment_id" | "branch_id" | "sales_channel_id"
  | "target_kind" | "product_id" | "variant_id" | "title_override" | "description_override"
  | "base_price" | "currency" | "availability_state" | "is_visible" | "status"
>;

type CatalogPanelProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  tenants: { id: string; displayName: string }[];
  branches: { id: string; displayName: string; establishmentId: string }[];
  selectedOrganizationId: string;
  selectedBranchId: string;
  verifiedFactorIds: string[];
  canWriteCatalog: boolean;
  canReadOffers: boolean;
  canWriteOffers: boolean;
  canWritePrice: boolean;
  canWriteAvailability: boolean;
  access: "organization" | "branch" | "none";
  loadFailed: boolean;
  categories: Category[];
  products: Product[];
  variants: Variant[];
  channels: Channel[];
  offers: Offer[];
}>;

export function CatalogPanel(props: CatalogPanelProps) {
  const [search, setSearch] = useState("");
  const tenantName = props.tenants.find(({ id }) => id === props.selectedOrganizationId)?.displayName ?? "";
  const branchName = props.branches.find(({ id }) => id === props.selectedBranchId)?.displayName ?? "";
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const productNames = useMemo(() => new Map(props.products.map(({ id, name }) => [id, name])), [props.products]);
  const variantNames = useMemo(() => new Map(props.variants.map(({ id, name }) => [id, name])), [props.variants]);
  const channelNames = useMemo(() => new Map(props.channels.map(({ id, display_name }) => [id, display_name])), [props.channels]);
  const categories = normalizedSearch
    ? props.categories.filter(({ name, description }) => matches(normalizedSearch, name, description))
    : props.categories;
  const products = normalizedSearch
    ? props.products.filter(({ name, description }) => matches(normalizedSearch, name, description))
    : props.products;
  const variants = normalizedSearch
    ? props.variants.filter(({ name, size_label, flavor_label }) => matches(normalizedSearch, name, size_label, flavor_label))
    : props.variants;
  const offers = normalizedSearch
    ? props.offers.filter((offer) => matches(
        normalizedSearch,
        offer.title_override,
        offer.description_override,
        offer.product_id ? productNames.get(offer.product_id) : null,
        offer.variant_id ? variantNames.get(offer.variant_id) : null,
        channelNames.get(offer.sales_channel_id),
      ))
    : props.offers;

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div>
          <span className="auth-eyebrow">CATÁLOGO · GESTÃO INTERNA</span>
          <h1 id="catalog-title">Produtos e ofertas</h1>
          <p>Identidade do produto, variantes de texto e ofertas por canal em um único fluxo protegido.</p>
        </div>
        <nav className="catalog-links" aria-label="Navegação da conta">
          <Link className="auth-entry-link" href="/app">Espaços</Link>
          <Link className="auth-entry-link" href="/app/security">Segurança</Link>
          <Link className="auth-entry-link" href="/app/admin-guard">Ação protegida</Link>
        </nav>
      </header>

      <form className="catalog-scope" method="get" action="/app/catalog">
        <div className="auth-field">
          <label htmlFor="catalog-organization">Organização</label>
          <select id="catalog-organization" name="organization" defaultValue={props.selectedOrganizationId} required>
            {props.tenants.map(({ id, displayName }) => <option key={id} value={id}>{displayName}</option>)}
          </select>
        </div>
        <div className="auth-field">
          <label htmlFor="catalog-branch">Unidade</label>
          <select id="catalog-branch" name="branch" defaultValue={props.selectedBranchId}>
            <option value="">Selecione uma unidade</option>
            {props.branches.map(({ id, displayName }) => <option key={id} value={id}>{displayName}</option>)}
          </select>
        </div>
        <button className="auth-submit catalog-scope-submit" type="submit">Abrir catálogo</button>
      </form>

      {props.loadFailed ? (
        <p className="catalog-alert" role="alert">Não foi possível carregar os dados deste espaço. Atualize a página e tente novamente.</p>
      ) : null}

      {!props.loadFailed && props.access === "none" ? (
        <section className="catalog-empty" aria-labelledby="catalog-scope-title">
          <h2 id="catalog-scope-title">Permissão de catálogo necessária</h2>
          <p>
            {props.selectedOrganizationId
              ? "Sua sessão não tem permissão de leitura de catálogo no escopo selecionado."
              : "Não há uma organização ativa disponível para abrir o catálogo."}
          </p>
        </section>
      ) : null}

      {!props.loadFailed && props.access === "branch" ? (
        <>
          <div className="catalog-toolbar">
            <div>
              <p className="catalog-context">{tenantName || "Organização"}{branchName ? ` · ${branchName}` : ""}</p>
              <p className="catalog-counts">{offers.length} ofertas disponíveis nesta unidade. Produtos e variantes canônicos são geridos pela organização.</p>
            </div>
            <div className="auth-field catalog-search">
              <label htmlFor="catalog-search">Buscar ofertas</label>
              <input id="catalog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título ou descrição do canal" />
            </div>
          </div>
          <section className="catalog-section" aria-labelledby="branch-offers-title">
            <div className="catalog-section-heading">
              <div><span className="catalog-index">04</span><h2 id="branch-offers-title">Ofertas da unidade</h2></div>
              <span className="catalog-section-count">{offers.length}</span>
            </div>
            {offers.length === 0 ? <p className="catalog-empty-note">Ainda não há ofertas nesta unidade. Uma pessoa com acesso ao catálogo da organização pode criar a primeira oferta.</p> : null}
            <OfferCardGrid
              offers={offers}
              productNames={productNames}
              variantNames={variantNames}
              channelNames={channelNames}
              verifiedFactorIds={props.verifiedFactorIds}
              supabaseUrl={props.supabaseUrl}
              anonKey={props.anonKey}
              canWriteOffers={props.canWriteOffers}
              canWritePrice={props.canWritePrice}
              canWriteAvailability={props.canWriteAvailability}
            />
          </section>
        </>
      ) : null}

      {!props.loadFailed && props.access === "organization" ? (
        <>
          <div className="catalog-toolbar">
            <div>
              <p className="catalog-context">{tenantName || "Organização"}{branchName ? ` · ${branchName}` : ""}</p>
              <p className="catalog-counts">{props.products.length} produtos · {props.categories.length} categorias · {props.offers.length} ofertas nesta unidade</p>
            </div>
            <div className="auth-field catalog-search">
              <label htmlFor="catalog-search">Buscar no catálogo</label>
              <input id="catalog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, descrição ou variante" />
            </div>
          </div>

          <section className="catalog-section" aria-labelledby="categories-title">
            <div className="catalog-section-heading">
              <div><span className="catalog-index">01</span><h2 id="categories-title">Categorias</h2></div>
              <span className="catalog-section-count">{categories.length}</span>
            </div>
            {props.canWriteCatalog ? <CategoryForm organizationId={props.selectedOrganizationId} categories={props.categories} /> : <p className="catalog-readonly-note">Sua função permite consultar, mas não alterar categorias.</p>}
            <div className="catalog-card-grid">
              {categories.map((category) => (
                props.canWriteCatalog
                  ? <CategoryForm key={category.id} organizationId={props.selectedOrganizationId} category={category} categories={props.categories} />
                  : <ReadonlyCatalogCard key={category.id} kicker="CATEGORIA" title={category.name} details={[category.description ?? "", category.status === "active" ? "Ativa" : "Arquivada"]} />
              ))}
            </div>
          </section>

          <section className="catalog-section" aria-labelledby="products-title">
            <div className="catalog-section-heading">
              <div><span className="catalog-index">02</span><h2 id="products-title">Produtos canônicos</h2></div>
              <span className="catalog-section-count">{products.length}</span>
            </div>
            {props.canWriteCatalog ? <ProductForm organizationId={props.selectedOrganizationId} categories={props.categories} /> : <p className="catalog-readonly-note">Sua função permite consultar, mas não alterar produtos.</p>}
            <div className="catalog-card-grid">
              {products.map((product) => (
                props.canWriteCatalog
                  ? <ProductForm key={product.id} organizationId={props.selectedOrganizationId} product={product} categories={props.categories} />
                  : <ReadonlyCatalogCard key={product.id} kicker="PRODUTO CANÔNICO" title={product.name} details={[product.description ?? "", product.status === "active" ? "Ativo" : "Arquivado"]} />
              ))}
            </div>
          </section>

          <section className="catalog-section" aria-labelledby="variants-title">
            <div className="catalog-section-heading">
              <div><span className="catalog-index">03</span><h2 id="variants-title">Variantes</h2></div>
              <span className="catalog-section-count">{variants.length}</span>
            </div>
            {products.map((product) => (
              <div className="catalog-variant-group" key={product.id}>
                <h3>{product.name}</h3>
                {props.canWriteCatalog ? <VariantForm organizationId={props.selectedOrganizationId} productId={product.id} /> : null}
                <div className="catalog-card-grid">
                  {variants.filter(({ product_id }) => product_id === product.id).map((variant) => (
                    props.canWriteCatalog
                      ? <VariantForm key={variant.id} organizationId={props.selectedOrganizationId} productId={product.id} variant={variant} />
                      : <ReadonlyCatalogCard key={variant.id} kicker="VARIANTE" title={variant.name} details={[variant.size_label ?? "", variant.flavor_label ?? "", variant.status === "active" ? "Ativa" : "Arquivada"]} />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="catalog-section" aria-labelledby="offers-title">
            <div className="catalog-section-heading">
              <div><span className="catalog-index">04</span><h2 id="offers-title">Ofertas da unidade</h2></div>
              <span className="catalog-section-count">{offers.length}</span>
            </div>
            {props.selectedBranchId && props.canReadOffers ? (
              <>
                {props.canWriteOffers && props.canWriteCatalog ? (
                  <div className="catalog-create-grid">
                    <NewProductOfferForm
                      organizationId={props.selectedOrganizationId}
                      branchId={props.selectedBranchId}
                      establishmentId={props.branches.find(({ id }) => id === props.selectedBranchId)?.establishmentId ?? ""}
                      channels={props.channels}
                      products={props.products.filter(({ status }) => status === "active")}
                    />
                    <NewVariantOfferForm
                      organizationId={props.selectedOrganizationId}
                      branchId={props.selectedBranchId}
                      establishmentId={props.branches.find(({ id }) => id === props.selectedBranchId)?.establishmentId ?? ""}
                      channels={props.channels}
                      variants={props.variants.filter(({ status }) => status === "active")}
                      products={props.products}
                    />
                  </div>
                ) : props.canWriteOffers ? <p className="catalog-empty-note">Novas ofertas exigem leitura do catálogo canônico da organização.</p> : <p className="catalog-empty-note">Sua função pode consultar ofertas, mas não alterá-las.</p>}
                {offers.length === 0 ? <p className="catalog-empty-note">Ainda não há ofertas nesta unidade.</p> : null}
                <OfferCardGrid
                  offers={offers}
                  productNames={productNames}
                  variantNames={variantNames}
                  channelNames={channelNames}
                  verifiedFactorIds={props.verifiedFactorIds}
                  supabaseUrl={props.supabaseUrl}
                  anonKey={props.anonKey}
                  canWriteOffers={props.canWriteOffers}
                  canWritePrice={props.canWritePrice}
                  canWriteAvailability={props.canWriteAvailability}
                />
              </>
            ) : (
              <p className="catalog-empty-note">{props.selectedBranchId ? "Sua sessão não tem permissão para consultar ofertas nesta unidade." : "Escolha uma unidade para criar e revisar ofertas por canal."}</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function ReadonlyCatalogCard({ kicker, title, details }: Readonly<{ kicker: string; title: string; details: string[] }>) {
  const visibleDetails = details.filter(Boolean);
  return (
    <article className="catalog-card catalog-readonly-card">
      <span className="catalog-card-kicker">{kicker}</span>
      <h3>{title}</h3>
      {visibleDetails.length > 0 ? (
        <ul className="catalog-readonly-list">
          {visibleDetails.map((detail, index) => <li key={`${index}-${detail}`}>{detail}</li>)}
        </ul>
      ) : null}
    </article>
  );
}

function OfferCardGrid({
  offers,
  productNames,
  variantNames,
  channelNames,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
  canWriteOffers,
  canWritePrice,
  canWriteAvailability,
}: Readonly<{
  offers: Offer[];
  productNames: ReadonlyMap<string, string>;
  variantNames: ReadonlyMap<string, string>;
  channelNames: ReadonlyMap<string, string>;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
  canWriteOffers: boolean;
  canWritePrice: boolean;
  canWriteAvailability: boolean;
}>) {
  return (
    <div className="catalog-card-grid">
      {offers.map((offer) => (
        <OfferForm
          key={offer.id}
          offer={offer}
          label={displayOfferLabel(offer, productNames, variantNames)}
          channelName={channelNames.get(offer.sales_channel_id) ?? "Canal"}
          verifiedFactorIds={verifiedFactorIds}
          supabaseUrl={supabaseUrl}
          anonKey={anonKey}
          canWriteOffers={canWriteOffers}
          canWritePrice={canWritePrice}
          canWriteAvailability={canWriteAvailability}
        />
      ))}
    </div>
  );
}

function displayOfferLabel(
  offer: Offer,
  productNames: ReadonlyMap<string, string>,
  variantNames: ReadonlyMap<string, string>,
) {
  const canonicalLabel = offer.variant_id
    ? variantNames.get(offer.variant_id)
    : offer.product_id ? productNames.get(offer.product_id) : null;
  const fallbackLabel = offer.title_override?.trim();
  return canonicalLabel?.trim()
    || fallbackLabel
    || (offer.variant_id ? "Variante" : offer.product_id ? "Produto" : "Item");
}

function CategoryForm({
  organizationId,
  category,
  categories,
}: Readonly<{ organizationId: string; category?: Category; categories: Category[] }>) {
  const [state, action, pending] = useActionState(saveCategoryAction, null);
  const id = category?.id ?? "new";
  const options = categories.filter(({ id: parentId, status }) => status === "active" && (!category || parentId !== category.id));
  return (
    <form className={`catalog-card${category ? "" : " catalog-card-new"}`} action={action}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="categoryId" value={category?.id ?? ""} />
      <span className="catalog-card-kicker">{category ? "CATEGORIA" : "NOVA CATEGORIA"}</span>
      <div className="auth-field"><label htmlFor={`category-name-${id}`}>Nome</label><input id={`category-name-${id}`} name="name" maxLength={120} defaultValue={category?.name ?? ""} required /></div>
      <div className="auth-field"><label htmlFor={`category-description-${id}`}>Descrição</label><textarea id={`category-description-${id}`} name="description" maxLength={2000} rows={2} defaultValue={category?.description ?? ""} /></div>
      <div className="auth-field"><label htmlFor={`category-parent-${id}`}>Categoria superior</label>
        <select id={`category-parent-${id}`} name="parentId" defaultValue={category?.parent_id ?? ""}>
          <option value="">Nenhuma</option>{options.map(({ id: parentId, name }) => <option key={parentId} value={parentId}>{name}</option>)}
        </select>
      </div>
      <div className="auth-field"><label htmlFor={`category-status-${id}`}>Estado</label>
        <select id={`category-status-${id}`} name="status" defaultValue={category?.status ?? "active"}><option value="active">Ativa</option><option value="archived">Arquivada</option></select>
      </div>
      <button className="catalog-save-button" type="submit" disabled={pending}>{pending ? "Salvando…" : category ? "Salvar categoria" : "Criar categoria"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

function ProductForm({
  organizationId,
  product,
  categories,
}: Readonly<{ organizationId: string; product?: Product; categories: Category[] }>) {
  const [state, action, pending] = useActionState(saveProductAction, null);
  const id = product?.id ?? "new";
  return (
    <form className={`catalog-card${product ? "" : " catalog-card-new"}`} action={action}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="productId" value={product?.id ?? ""} />
      <span className="catalog-card-kicker">{product ? "PRODUTO" : "NOVO PRODUTO"}</span>
      <div className="auth-field"><label htmlFor={`product-name-${id}`}>Nome canônico</label><input id={`product-name-${id}`} name="name" maxLength={160} defaultValue={product?.name ?? ""} required /></div>
      <div className="auth-field"><label htmlFor={`product-description-${id}`}>Descrição do produto</label><textarea id={`product-description-${id}`} name="description" maxLength={5000} rows={3} defaultValue={product?.description ?? ""} /></div>
      <div className="auth-field"><label htmlFor={`product-category-${id}`}>Categoria</label>
        <select id={`product-category-${id}`} name="categoryId" defaultValue={product?.category_id ?? ""}>
          <option value="">Sem categoria</option>{categories.filter(({ status }) => status === "active").map(({ id: categoryId, name }) => <option key={categoryId} value={categoryId}>{name}</option>)}
        </select>
      </div>
      <div className="auth-field"><label htmlFor={`product-status-${id}`}>Estado</label>
        <select id={`product-status-${id}`} name="status" defaultValue={product?.status ?? "active"}><option value="active">Ativo</option><option value="archived">Arquivado</option></select>
      </div>
      <button className="catalog-save-button" type="submit" disabled={pending}>{pending ? "Salvando…" : product ? "Salvar produto" : "Criar produto"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

function VariantForm({
  organizationId,
  productId,
  variant,
}: Readonly<{ organizationId: string; productId: string; variant?: Variant }>) {
  const [state, action, pending] = useActionState(saveVariantAction, null);
  const id = variant?.id ?? `new-${productId}`;
  return (
    <form className={`catalog-card${variant ? "" : " catalog-card-new"}`} action={action}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="variantId" value={variant?.id ?? ""} />
      <input type="hidden" name="productId" value={productId} />
      <span className="catalog-card-kicker">{variant ? "VARIANTE" : "NOVA VARIANTE"}</span>
      <div className="auth-field"><label htmlFor={`variant-name-${id}`}>Nome da variante</label><input id={`variant-name-${id}`} name="name" maxLength={120} defaultValue={variant?.name ?? ""} required /></div>
      <div className="catalog-inline-fields">
        <div className="auth-field"><label htmlFor={`variant-size-${id}`}>Tamanho</label><input id={`variant-size-${id}`} name="sizeLabel" maxLength={80} defaultValue={variant?.size_label ?? ""} /></div>
        <div className="auth-field"><label htmlFor={`variant-flavor-${id}`}>Sabor</label><input id={`variant-flavor-${id}`} name="flavorLabel" maxLength={80} defaultValue={variant?.flavor_label ?? ""} /></div>
      </div>
      <div className="auth-field"><label htmlFor={`variant-status-${id}`}>Estado</label>
        <select id={`variant-status-${id}`} name="status" defaultValue={variant?.status ?? "active"}><option value="active">Ativa</option><option value="archived">Arquivada</option></select>
      </div>
      <button className="catalog-save-button" type="submit" disabled={pending}>{pending ? "Salvando…" : variant ? "Salvar variante" : "Criar variante"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

function NewProductOfferForm({
  organizationId,
  branchId,
  establishmentId,
  channels,
  products,
}: Readonly<{ organizationId: string; branchId: string; establishmentId: string; channels: Channel[]; products: Product[] }>) {
  const [state, action, pending] = useActionState(saveOfferAction, null);
  const id = `new-product-${branchId}`;
  return (
    <form className="catalog-card catalog-offer-create" action={action}>
      <input type="hidden" name="offerId" value="" /><input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="establishmentId" value={establishmentId} /><input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="targetKind" value="product" /><input type="hidden" name="variantId" value="" />
      <input type="hidden" name="basePrice" value="" /><input type="hidden" name="availabilityState" value="unknown" /><input type="hidden" name="status" value="active" />
      <span className="catalog-card-kicker">NOVA OFERTA · PRODUTO</span>
      <p className="catalog-help">A oferta começa como rascunho indisponível. Preço e disponibilidade são confirmados em uma etapa protegida.</p>
      <div className="auth-field"><label htmlFor={`${id}-product`}>Produto</label>
        <select id={`${id}-product`} name="productId" defaultValue="" required><option value="" disabled>Escolha um produto</option>{products.map(({ id: productId, name }) => <option key={productId} value={productId}>{name}</option>)}</select>
      </div>
      <ChannelSelect id={`${id}-channel`} channels={channels} />
      <div className="auth-field"><label htmlFor={`${id}-title`}>Título nesta oferta (opcional)</label><input id={`${id}-title`} name="titleOverride" maxLength={160} /></div>
      <div className="auth-field"><label htmlFor={`${id}-description`}>Descrição nesta oferta (opcional)</label><textarea id={`${id}-description`} name="descriptionOverride" maxLength={2000} rows={2} /></div>
      <button className="catalog-save-button" type="submit" disabled={pending || channels.length === 0 || products.length === 0}>{pending ? "Criando rascunho…" : "Criar rascunho"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

function NewVariantOfferForm({
  organizationId,
  branchId,
  establishmentId,
  channels,
  variants,
  products,
}: Readonly<{ organizationId: string; branchId: string; establishmentId: string; channels: Channel[]; variants: Variant[]; products: Product[] }>) {
  const [state, action, pending] = useActionState(saveOfferAction, null);
  const productById = new Map(products.map(({ id, name }) => [id, name]));
  const id = `new-variant-${branchId}`;
  return (
    <form className="catalog-card catalog-offer-create" action={action}>
      <input type="hidden" name="offerId" value="" /><input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="establishmentId" value={establishmentId} /><input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="targetKind" value="variant" /><input type="hidden" name="productId" value="" />
      <input type="hidden" name="basePrice" value="" /><input type="hidden" name="availabilityState" value="unknown" /><input type="hidden" name="status" value="active" />
      <span className="catalog-card-kicker">NOVA OFERTA · VARIANTE</span>
      <p className="catalog-help">A oferta começa como rascunho indisponível. Preço e disponibilidade são confirmados em uma etapa protegida.</p>
      <div className="auth-field"><label htmlFor={`${id}-variant`}>Variante</label>
        <select id={`${id}-variant`} name="variantId" defaultValue="" required><option value="" disabled>Escolha uma variante</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{productById.get(variant.product_id) ?? "Produto"} · {variant.name}</option>)}</select>
      </div>
      <ChannelSelect id={`${id}-channel`} channels={channels} />
      <div className="auth-field"><label htmlFor={`${id}-title`}>Título nesta oferta (opcional)</label><input id={`${id}-title`} name="titleOverride" maxLength={160} /></div>
      <div className="auth-field"><label htmlFor={`${id}-description`}>Descrição nesta oferta (opcional)</label><textarea id={`${id}-description`} name="descriptionOverride" maxLength={2000} rows={2} /></div>
      <button className="catalog-save-button" type="submit" disabled={pending || channels.length === 0 || variants.length === 0}>{pending ? "Criando rascunho…" : "Criar rascunho"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

function ChannelSelect({ id, channels }: Readonly<{ id: string; channels: Channel[] }>) {
  return (
    <div className="auth-field"><label htmlFor={id}>Canal de venda</label>
      <select id={id} name="salesChannelId" defaultValue="" required><option value="" disabled>Escolha um canal</option>{channels.map(({ id: channelId, display_name }) => <option key={channelId} value={channelId}>{display_name}</option>)}</select>
    </div>
  );
}

function OfferForm({
  offer,
  label,
  channelName,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
  canWriteOffers,
  canWritePrice,
  canWriteAvailability,
}: Readonly<{
  offer: Offer;
  label: string;
  channelName: string;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
  canWriteOffers: boolean;
  canWritePrice: boolean;
  canWriteAvailability: boolean;
}>) {
  const [state, action, pending] = useActionState(saveOfferAction, null);
  const [reauthentication, reauthenticationAction, reauthenticationPending] = useActionState<ReauthenticationActionState, FormData>(reauthenticateForPrivilegedAction, null);
  const [draft, setDraft] = useState(() => offerDraft(offer));
  const persistedDraft = useMemo(() => offerDraft(offer), [
    offer.title_override,
    offer.description_override,
    offer.base_price,
    offer.availability_state,
    offer.is_visible,
    offer.status,
  ]);
  const persistedDraftRef = useRef(persistedDraft);
  const [totpVerified, setTotpVerified] = useState(false);
  useEffect(() => {
    if (sameOfferDraft(persistedDraftRef.current, persistedDraft)) return;
    persistedDraftRef.current = persistedDraft;
    setDraft(persistedDraft);
  }, [persistedDraft]);

  if (!canWriteOffers) {
    return (
      <article className="catalog-card catalog-offer-card catalog-readonly-card">
        <span className="catalog-card-kicker">OFERTA · {channelName.toLocaleUpperCase("pt-BR")}</span>
        <h3>{label}</h3>
        <dl className="catalog-readonly-details">
          <div><dt>Preço base</dt><dd>{offer.base_price === null ? "Ainda não definido" : `${offer.currency} ${offer.base_price.toFixed(2)}`}</dd></div>
          <div><dt>Disponibilidade</dt><dd>{availabilityLabel(offer.availability_state)}</dd></div>
          <div><dt>Visibilidade</dt><dd>{offer.is_visible ? "Visível" : "Oculta"}</dd></div>
          <div><dt>Estado</dt><dd>{offer.status === "active" ? "Ativa" : "Arquivada"}</dd></div>
        </dl>
        {offer.title_override ? <p className="catalog-readonly-copy"><strong>Título do canal:</strong> {offer.title_override}</p> : null}
        {offer.description_override ? <p className="catalog-readonly-copy"><strong>Descrição do canal:</strong> {offer.description_override}</p> : null}
      </article>
    );
  }

  return (
    <section className="catalog-card catalog-offer-card">
      <form className="catalog-offer-form" action={action}>
        <input type="hidden" name="offerId" value={offer.id} />
        <input type="hidden" name="targetKind" value={offer.target_kind} />
        <input type="hidden" name="productId" value={offer.product_id ?? ""} />
        <input type="hidden" name="variantId" value={offer.variant_id ?? ""} />
        <span className="catalog-card-kicker">OFERTA · {channelName.toLocaleUpperCase("pt-BR")}</span>
        <h3>{label}</h3>
        <p className="catalog-help">Nome e descrição do produto continuam canônicos; estes campos são apenas apresentação do canal.</p>
        <div className="auth-field"><label htmlFor={`offer-title-${offer.id}`}>Título nesta oferta</label><input id={`offer-title-${offer.id}`} name="titleOverride" maxLength={160} value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} /></div>
        <div className="auth-field"><label htmlFor={`offer-description-${offer.id}`}>Descrição nesta oferta</label><textarea id={`offer-description-${offer.id}`} name="descriptionOverride" maxLength={2000} rows={2} value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} /></div>
        {canWritePrice ? (
          <div className="auth-field">
            <label htmlFor={`offer-price-${offer.id}`}>Preço base em BRL</label>
            <input id={`offer-price-${offer.id}`} name="basePrice" type="text" inputMode="decimal" autoComplete="off" maxLength={13} pattern="(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?" placeholder="0,00" value={draft.price} onChange={(event) => setDraft((value) => ({ ...value, price: event.target.value }))} />
            <span className="catalog-field-note">Use ponto decimal. Até duas casas. O histórico de preço não pode ser apagado.</span>
          </div>
        ) : (
          <div className="auth-field">
            <span className="catalog-field-label">Preço base em BRL</span>
            <output className="catalog-readonly-value">{offer.base_price === null ? "Ainda não definido" : `${offer.currency} ${offer.base_price.toFixed(2)}`}</output>
            <input type="hidden" name="basePrice" value={offer.base_price === null ? "" : offer.base_price.toFixed(2)} />
          </div>
        )}
        <div className="auth-field">
          {canWriteAvailability ? <label htmlFor={`offer-availability-${offer.id}`}>Disponibilidade interna</label> : <span className="catalog-field-label">Disponibilidade interna</span>}
          {canWriteAvailability ? (
            <select id={`offer-availability-${offer.id}`} name="availabilityState" value={draft.availability} onChange={(event) => setDraft((value) => ({ ...value, availability: event.target.value as typeof draft.availability }))}>
              <option value="unknown">Desconhecida</option><option value="available">Disponível</option><option value="unavailable">Indisponível</option>
            </select>
          ) : (
            <>
              <output className="catalog-readonly-value">{availabilityLabel(offer.availability_state)}</output>
              <input type="hidden" name="availabilityState" value={offer.availability_state} />
            </>
          )}
        </div>
        {canWriteAvailability ? (
          <div className="catalog-checkbox-row">
            <input id={`offer-visible-${offer.id}`} name="isVisible" type="checkbox" checked={draft.visible} onChange={(event) => setDraft((value) => ({ ...value, visible: event.target.checked }))} />
            <label htmlFor={`offer-visible-${offer.id}`}>Visível no canal (exige preço e disponibilidade disponível)</label>
          </div>
        ) : (
          <div className="catalog-checkbox-row catalog-readonly-value">
            <span>Visibilidade: {offer.is_visible ? "visível" : "oculta"}</span>
            <input type="hidden" name="isVisible" value={offer.is_visible ? "true" : "false"} />
          </div>
        )}
        {canWriteAvailability || !offer.is_visible ? (
          <div className="auth-field"><label htmlFor={`offer-status-${offer.id}`}>Estado da oferta</label>
            <select id={`offer-status-${offer.id}`} name="status" value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value as typeof draft.status }))}>
              <option value="active">Ativa</option><option value="archived">Arquivada</option>
            </select>
          </div>
        ) : (
          <div className="auth-field"><span className="catalog-field-label">Estado da oferta</span><output className="catalog-readonly-value">{offer.status === "active" ? "Ativa" : "Arquivada"}</output><input type="hidden" name="status" value={offer.status} /></div>
        )}
        <button className="catalog-save-button" type="submit" disabled={pending}>{pending ? "Salvando oferta…" : "Salvar oferta"}</button>
      </form>
      <ActionFeedback state={state} />
      {state?.kind === "step_up_required" ? (
        <div className="catalog-step-up" aria-labelledby={`offer-step-up-${offer.id}`}>
          <h4 id={`offer-step-up-${offer.id}`}>Confirme a verificação em duas etapas</h4>
          {verifiedFactorIds[0] && !totpVerified ? (
            <TotpChallengeForm
              supabaseUrl={supabaseUrl}
              anonKey={anonKey}
              factorId={verifiedFactorIds[0]}
              fieldId={`catalog-offer-totp-${offer.id}`}
              onVerified={() => setTotpVerified(true)}
              buttonLabel="Validar código e depois salvar novamente"
            />
          ) : verifiedFactorIds[0] ? <output className="catalog-step-up-status">Código validado. Envie a oferta novamente para concluir a alteração.</output> : <p>Configure um fator autenticador em <Link href="/app/security">Segurança</Link>.</p>}
        </div>
      ) : null}
      {state?.kind === "reauthentication_required" ? (
        <div className="catalog-step-up" aria-labelledby={`offer-reauth-${offer.id}`}>
          <h4 id={`offer-reauth-${offer.id}`}>Confirme sua senha recente</h4>
          <form className="catalog-auth-form" action={reauthenticationAction}>
            <div className="auth-field"><label htmlFor={`offer-password-${offer.id}`}>Senha da conta</label><input id={`offer-password-${offer.id}`} name="reauth-password" type="password" autoComplete="current-password" required /></div>
            <button className="catalog-save-button" type="submit" disabled={reauthenticationPending}>{reauthenticationPending ? "Confirmando…" : "Confirmar identidade"}</button>
          </form>
          {reauthentication?.kind === "reauthenticated" ? <output className="catalog-step-up-status">Identidade confirmada. Envie a oferta novamente para concluir a alteração.</output> : null}
          {reauthentication?.kind === "denied" ? <p className="catalog-form-error" role="alert">Não foi possível confirmar a identidade.</p> : null}
        </div>
      ) : null}
      {state?.kind === "factor_setup_required" ? <p className="catalog-form-error" role="alert">Configure um fator autenticador em <Link href="/app/security">Segurança</Link> antes de alterar preço ou disponibilidade.</p> : null}
    </section>
  );
}

function ActionFeedback({ state }: Readonly<{ state: CatalogActionState }>) {
  if (!state) return null;
  if (state.kind === "saved") return <output className="catalog-form-success">Salvo. Código de atendimento: {state.correlationId}. Referências de auditoria: {state.auditEventIds.length ? state.auditEventIds.join(", ") : "sem alteração material"}.</output>;
  if (state.kind === "invalid") return <p className="catalog-form-error" role="alert">Revise os campos e as relações informadas. Código: {state.correlationId}</p>;
  if (state.kind === "denied") return <p className="catalog-form-error" role="alert">A alteração não foi autorizada para o seu escopo atual. Código: {state.correlationId}</p>;
  if (state.kind === "failed") return <p className="catalog-form-error" role="alert">Não foi possível concluir a alteração. Nenhuma confirmação foi retornada. Código: {state.correlationId}</p>;
  if (state.kind === "step_up_required") return <output className="catalog-form-note">Verificação recente em duas etapas necessária. Código: {state.correlationId}</output>;
  if (state.kind === "reauthentication_required") return <output className="catalog-form-note">Uma confirmação recente da senha é necessária. Código: {state.correlationId}</output>;
  return <p className="catalog-form-error" role="alert">Configure um fator autenticador antes de continuar. Código: {state.correlationId}</p>;
}

function offerDraft(offer: Offer) {
  return {
    title: offer.title_override ?? "",
    description: offer.description_override ?? "",
    price: offer.base_price === null ? "" : offer.base_price.toFixed(2),
    availability: offer.availability_state as "unknown" | "available" | "unavailable",
    visible: offer.is_visible,
    status: offer.status as "active" | "archived",
  };
}

type OfferDraft = ReturnType<typeof offerDraft>;

function sameOfferDraft(left: OfferDraft, right: OfferDraft): boolean {
  return left.title === right.title
    && left.description === right.description
    && left.price === right.price
    && left.availability === right.availability
    && left.visible === right.visible
    && left.status === right.status;
}

function availabilityLabel(value: Offer["availability_state"]): string {
  if (value === "available") return "Disponível";
  if (value === "unavailable") return "Indisponível";
  return "Desconhecida";
}

function matches(needle: string, ...values: (string | null | undefined)[]) {
  return values.some((value) => value?.toLocaleLowerCase("pt-BR").includes(needle));
}
