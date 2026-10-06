"use client";

import { useActionState, useId } from "react";
import {
  archiveCategoryAction,
  archiveProductAction,
  createCategoryAction,
  createChannelAction,
  createOfferAction,
  createProductAction,
  createVariantAction,
  updateCategoryAction,
  updateChannelAction,
  updateOfferAvailabilityAction,
  updateOfferPriceAction,
  updateOfferPresentationAction,
  updateOfferVisibilityAction,
  updateProductAction,
  updateVariantAction,
  type CatalogActionState,
} from "@/app/app/catalog/actions";
import type {
  CatalogAdmittedScope,
  CatalogCategoryView,
  CatalogChannelView,
  CatalogOfferView,
  CatalogOverview,
  CatalogProductView,
  CatalogTimelineEntry,
  CatalogVariantView,
} from "@/lib/catalog/catalog-types";

// Catalog management surface.
//
// Every control here is a plain form bound to a server action. There is no client-side authority
// decision: the interface shows what the caller's session already admits, and the server contract
// re-derives authority independently. Money is edited as an exact decimal string, so the value the
// operator sees is the value that is compared and persisted.

type Action = (previous: CatalogActionState, formData: FormData) => Promise<CatalogActionState>;

function Feedback({ state, pending, label }: Readonly<{ state: CatalogActionState; pending: boolean; label: string }>) {
  return (
    <p
      className={`catalog-feedback ${state ? `catalog-feedback-${state.kind}` : ""}`}
      role="status"
      aria-live="polite"
    >
      {pending ? "Salvando…" : state ? state.message : label}
    </p>
  );
}

function HiddenId({ name, value }: Readonly<{ name: string; value: string }>) {
  return <input type="hidden" name={name} value={value} />;
}

function ScopeFields({ scope }: Readonly<{ scope: { organizationId: string; establishmentId: string | null; branchId: string | null } }>) {
  return (
    <>
      <HiddenId name="organizationId" value={scope.organizationId} />
      {scope.establishmentId ? <HiddenId name="establishmentId" value={scope.establishmentId} /> : null}
      {scope.branchId ? <HiddenId name="branchId" value={scope.branchId} /> : null}
    </>
  );
}

function Field({ label, name, defaultValue, type = "text", inputMode, hint, required = true }: Readonly<{
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal";
  hint?: string;
  required?: boolean;
}>) {
  const id = useId();
  return (
    <div className="catalog-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        inputMode={inputMode}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    </div>
  );
}

function SelectField({ label, name, options, defaultValue }: Readonly<{
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
}>) {
  const id = useId();
  return (
    <div className="catalog-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Disponível" },
  { value: "unavailable", label: "Indisponível" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "visible", label: "Visível" },
  { value: "hidden", label: "Oculta" },
] as const;

/**
 * Every repeated editor names the entity it edits.
 *
 * A card list renders one "Nome" textbox per category, product and variant, and the creation
 * disclosures repeat those labels again. Without the entity in the name a screen reader announces
 * the same field over and over with nothing to tell the entries apart.
 */
function ScopeNotice({ scope }: Readonly<{ scope: CatalogAdmittedScope }>) {
  const where = scope.branchId
    ? `${scope.organizationName} · filial`
    : scope.establishmentId
      ? `${scope.organizationName} · estabelecimento`
      : scope.organizationName;
  return <small className="catalog-scope-note">Novos itens entram em {where}.</small>;
}

export function CatalogConsole({ overview, search }: Readonly<{ overview: CatalogOverview; search: string }>) {
  if (!overview.ok) {
    return (
      <section className="tenant-empty-state">
        <span className="tenant-state-mark" aria-hidden="true">!</span>
        <h2>Não foi possível carregar o catálogo</h2>
        <output>Tente novamente em alguns instantes.</output>
      </section>
    );
  }

  // The first admitted scope is where new rows are created. An empty list means the session holds no
  // catalog write scope, which is a different situation from an empty catalog and is stated as such.
  const scope = overview.writeScopes[0] ?? null;

  return (
    <div className="catalog-console">
      <header className="tenant-entry-header">
        <div>
          <span className="auth-eyebrow">CATÁLOGO</span>
          <h1>Produtos, categorias e ofertas por canal</h1>
          <p>
            Preço, preço promocional, disponibilidade e visibilidade exigem confirmação de identidade.
            Toda alteração é registrada na trilha de auditoria.
          </p>
        </div>
      </header>

      <CatalogSearch defaultValue={search} />

      {overview.categories.length === 0 && overview.products.length === 0 && overview.channels.length === 0 ? (
        <section className="tenant-empty-state">
          <span className="tenant-state-mark" aria-hidden="true">g</span>
          <h2>Nenhum item de catálogo visível</h2>
          <output>Crie uma categoria, um produto e um canal para começar a montar as ofertas.</output>
        </section>
      ) : null}

      <CategorySection categories={overview.categories} scope={scope} />
      <ProductSection products={overview.products} variants={overview.variants} categories={overview.categories} scope={scope} />
      <ChannelSection channels={overview.channels} scope={scope} />
      <OfferSection
        offers={overview.offers}
        products={overview.products}
        variants={overview.variants}
        channels={overview.channels}
        timeline={overview.timeline}
        scope={scope}
      />
    </div>
  );
}

function CatalogSearch({ defaultValue }: Readonly<{ defaultValue: string }>) {
  const id = useId();
  return (
    <form className="catalog-search" method="get" action="/app/catalog" role="search">
      <div className="catalog-field">
        <label htmlFor={id}>Buscar no catálogo</label>
        <input
          id={id}
          type="search"
          name="search"
          defaultValue={defaultValue}
          placeholder="Produto, categoria ou canal"
        />
      </div>
      <button className="catalog-button catalog-button-secondary" type="submit">Buscar</button>
    </form>
  );
}

function CategorySection({ categories, scope }: Readonly<{ categories: CatalogCategoryView[]; scope: CatalogAdmittedScope | null }>) {
  const [state, action, pending] = useActionState(updateCategoryAction as Action, null);
  return (
    <section className="catalog-section" aria-labelledby="catalog-categories-title">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">ORGANIZAÇÃO DO MENU</span>
          <h2 id="catalog-categories-title">Categorias</h2>
        </div>
        {scope ? <CategoryCreator scope={scope} /> : null}
      </div>
      {categories.length === 0 ? <EmptyList label="Nenhuma categoria criada." /> : null}
      <ul className="catalog-list">
        {categories.map((category) => (
          <li className="catalog-card" key={category.id}>
            <div className="catalog-card-head">
              <div>
                <strong>{category.name}</strong>
                <small>Ordem {category.displayOrder} · {category.status === "active" ? "Ativa" : "Arquivada"}</small>
              </div>
              <CategoryArchiver categoryId={category.id} archived={category.status === "archived"} />
            </div>
            <form action={action} className="catalog-inline-form">
              <HiddenId name="categoryId" value={category.id} />
              <Field label={`Nome de ${category.name}`} name="name" defaultValue={category.name} />
              <Field label={`Descrição de ${category.name}`} name="description" defaultValue={category.description ?? ""} required={false} />
              <Field label={`Ordem de ${category.name}`} name="displayOrder" defaultValue={String(category.displayOrder)} inputMode="numeric" />
              <button className="catalog-button" type="submit" disabled={pending}>Salvar</button>
              <Feedback state={state} pending={pending} label="" />
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyList({ label }: Readonly<{ label: string }>) {
  return <p className="catalog-empty-line">{label}</p>;
}

function CategoryCreator({ scope }: Readonly<{ scope: CatalogAdmittedScope }>) {
  const [state, action, pending] = useActionState(createCategoryAction as Action, null);
  return (
    <details className="catalog-disclosure">
      <summary>Nova categoria</summary>
      <form action={action} className="catalog-form">
        <ScopeFields scope={scope} />
        <ScopeNotice scope={scope} />
        <Field label="Nome da nova categoria" name="name" />
        <Field label="Descrição da nova categoria" name="description" required={false} />
        <Field label="Ordem da nova categoria" name="displayOrder" defaultValue="0" inputMode="numeric" />
        <button className="catalog-button" type="submit" disabled={pending}>Criar categoria</button>
        <Feedback state={state} pending={pending} label="" />
      </form>
    </details>
  );
}

function CategoryArchiver({ categoryId, archived }: Readonly<{ categoryId: string; archived: boolean }>) {
  const [state, action, pending] = useActionState(archiveCategoryAction as Action, null);
  return (
    <form action={action} className="catalog-inline-form">
      <HiddenId name="categoryId" value={categoryId} />
      {archived ? <HiddenId name="archived" value="on" /> : null}
      <button className="catalog-button catalog-button-secondary" type="submit" disabled={pending}>
        {archived ? "Reativar" : "Arquivar"}
      </button>
      <Feedback state={state} pending={pending} label="" />
    </form>
  );
}

function ProductSection({ products, variants, categories, scope }: Readonly<{
  products: CatalogProductView[];
  variants: CatalogVariantView[];
  categories: CatalogCategoryView[];
  scope: CatalogAdmittedScope | null;
}>) {
  const [state, action, pending] = useActionState(updateProductAction as Action, null);
  return (
    <section className="catalog-section" aria-labelledby="catalog-products-title">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">ITENS CANÔNICOS</span>
          <h2 id="catalog-products-title">Produtos e variantes</h2>
        </div>
        {scope ? (
          <div className="catalog-heading-actions">
            <ProductCreator scope={scope} categories={categories} />
            {products.length > 0 ? <VariantCreator scope={scope} products={products} /> : null}
          </div>
        ) : null}
      </div>
      {products.length === 0 ? <EmptyList label="Nenhum produto criado." /> : null}
      <ul className="catalog-list">
        {products.map((product) => (
          <li className="catalog-card" key={product.id}>
            <div className="catalog-card-head">
              <div>
                <strong>{product.name}</strong>
                <small>
                  {product.status === "active" ? "Ativo" : "Arquivado"}
                  {` · ${variants.filter((variant) => variant.productId === product.id).length} variante(s)`}
                </small>
              </div>
              <ProductArchiver productId={product.id} archived={product.status === "archived"} />
            </div>
            <form action={action} className="catalog-inline-form">
              <HiddenId name="productId" value={product.id} />
              <Field label={`Nome de ${product.name}`} name="name" defaultValue={product.name} />
              <Field label={`Descrição de ${product.name}`} name="description" defaultValue={product.description ?? ""} required={false} />
              <button className="catalog-button" type="submit" disabled={pending}>Salvar</button>
              <Feedback state={state} pending={pending} label="" />
            </form>
            <VariantList variants={variants.filter((variant) => variant.productId === product.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductCreator({ scope, categories }: Readonly<{ scope: CatalogAdmittedScope; categories: CatalogCategoryView[] }>) {
  const [state, action, pending] = useActionState(createProductAction as Action, null);
  return (
    <details className="catalog-disclosure">
      <summary>Novo produto</summary>
      <form action={action} className="catalog-form">
        <ScopeFields scope={scope} />
        <ScopeNotice scope={scope} />
        <Field label="Nome do novo produto" name="name" />
        <Field label="Descrição do novo produto" name="description" required={false} />
        <div className="catalog-field">
          <label htmlFor="catalog-product-category">Categoria do novo produto</label>
          <select id="catalog-product-category" name="categoryId" defaultValue="">
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <button className="catalog-button" type="submit" disabled={pending}>Criar produto</button>
        <Feedback state={state} pending={pending} label="" />
      </form>
    </details>
  );
}

function ProductArchiver({ productId, archived }: Readonly<{ productId: string; archived: boolean }>) {
  const [state, action, pending] = useActionState(archiveProductAction as Action, null);
  return (
    <form action={action} className="catalog-inline-form">
      <HiddenId name="productId" value={productId} />
      {archived ? <HiddenId name="archived" value="on" /> : null}
      <button className="catalog-button catalog-button-secondary" type="submit" disabled={pending}>
        {archived ? "Reativar" : "Arquivar"}
      </button>
      <Feedback state={state} pending={pending} label="" />
    </form>
  );
}

function VariantCreator({ scope, products }: Readonly<{ scope: CatalogAdmittedScope; products: CatalogProductView[] }>) {
  const [state, action, pending] = useActionState(createVariantAction as Action, null);
  return (
    <details className="catalog-disclosure">
      <summary>Nova variante</summary>
      <form action={action} className="catalog-form">
        <ScopeFields scope={scope} />
        <ScopeNotice scope={scope} />
        <div className="catalog-field">
          <label htmlFor="catalog-variant-product">Produto da nova variante</label>
          <select id="catalog-variant-product" name="productId" defaultValue={products[0].id}>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
        <Field label="Nome da nova variante" name="name" />
        <button className="catalog-button" type="submit" disabled={pending}>Criar variante</button>
        <Feedback state={state} pending={pending} label="" />
      </form>
    </details>
  );
}

function VariantList({ variants }: Readonly<{ variants: CatalogVariantView[] }>) {
  const [state, action, pending] = useActionState(updateVariantAction as Action, null);
  if (variants.length === 0) return null;

  return (
    <ul className="catalog-list catalog-list-nested">
      {variants.map((variant) => (
        <li className="catalog-card" key={variant.id}>
          <div className="catalog-card-head">
            <div>
              <strong>{variant.name}</strong>
              <small>{variant.status === "active" ? "Ativa" : "Arquivada"}</small>
            </div>
          </div>
          <form action={action} className="catalog-inline-form">
            <HiddenId name="variantId" value={variant.id} />
            <Field label={`Nome de ${variant.name}`} name="name" defaultValue={variant.name} />
            <label className="catalog-checkbox">
              <input type="checkbox" name="archived" defaultChecked={variant.status === "archived"} />
              <span>{`Arquivar ${variant.name}`}</span>
            </label>
            <button className="catalog-button" type="submit" disabled={pending}>Salvar variante</button>
            <Feedback state={state} pending={pending} label="" />
          </form>
        </li>
      ))}
    </ul>
  );
}

function ChannelSection({ channels, scope }: Readonly<{ channels: CatalogChannelView[]; scope: CatalogAdmittedScope | null }>) {
  return (
    <section className="catalog-section" aria-labelledby="catalog-channels-title">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">IDENTIDADE DE CANAL</span>
          <h2 id="catalog-channels-title">Canais de venda</h2>
        </div>
        {scope ? <ChannelCreator scope={scope} /> : null}
      </div>
      {channels.length === 0 ? <EmptyList label="Nenhum canal criado." /> : null}
      <ul className="catalog-list">
        {channels.map((channel) => (
          <li className="catalog-card" key={channel.id}>
            <div className="catalog-card-head">
              <div>
                <strong>{channel.displayName}</strong>
                <small>{channel.channelKey}</small>
              </div>
            </div>
            <ChannelEditor channel={channel} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChannelCreator({ scope }: Readonly<{ scope: CatalogAdmittedScope }>) {
  const [state, action, pending] = useActionState(createChannelAction as Action, null);
  return (
    <details className="catalog-disclosure">
      <summary>Novo canal</summary>
      <form action={action} className="catalog-form">
        <ScopeFields scope={scope} />
        <ScopeNotice scope={scope} />
        <Field label="Chave do novo canal" name="channelKey" hint="Identificador estável, sem acentos ou espaços." />
        <Field label="Nome exibido do novo canal" name="displayName" />
        <Field label="Descrição do novo canal" name="description" required={false} />
        <button className="catalog-button" type="submit" disabled={pending}>Criar canal</button>
        <Feedback state={state} pending={pending} label="" />
      </form>
    </details>
  );
}

function ChannelEditor({ channel }: Readonly<{ channel: CatalogChannelView }>) {
  const [state, action, pending] = useActionState(updateChannelAction as Action, null);
  return (
    <form action={action} className="catalog-inline-form">
      <HiddenId name="channelId" value={channel.id} />
      <Field label={`Nome exibido de ${channel.displayName}`} name="displayName" defaultValue={channel.displayName} />
      <Field label={`Descrição de ${channel.displayName}`} name="description" defaultValue={channel.description ?? ""} required={false} />
      <button className="catalog-button" type="submit" disabled={pending}>Salvar canal</button>
      <Feedback state={state} pending={pending} label="" />
    </form>
  );
}

function OfferSection({ offers, products, variants, channels, timeline, scope }: Readonly<{
  offers: CatalogOfferView[];
  products: CatalogProductView[];
  variants: CatalogVariantView[];
  channels: CatalogChannelView[];
  timeline: CatalogTimelineEntry[];
  scope: CatalogAdmittedScope | null;
}>) {
  const creatable = Boolean(scope) && products.length > 0 && channels.length > 0;
  return (
    <section className="catalog-section" aria-labelledby="catalog-offers-title">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">ESTADO COMERCIAL POR CANAL</span>
          <h2 id="catalog-offers-title">Ofertas</h2>
        </div>
        {scope && creatable ? (
          <OfferCreator scope={scope} products={products} variants={variants} channels={channels} />
        ) : null}
      </div>
      {offers.length === 0 ? <EmptyList label="Nenhuma oferta criada." /> : null}
      <ul className="catalog-list">
        {offers.map((offer) => (
          <li className="catalog-card" key={offer.id}>
            <OfferEditor offer={offer} timeline={timeline.filter((entry) => entry.channelOfferId === offer.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OfferCreator({ scope, products, variants, channels }: Readonly<{
  scope: CatalogAdmittedScope;
  products: CatalogProductView[];
  variants: CatalogVariantView[];
  channels: CatalogChannelView[];
}>) {
  const [state, action, pending] = useActionState(createOfferAction as Action, null);
  return (
    <details className="catalog-disclosure">
      <summary>Nova oferta</summary>
      <form action={action} className="catalog-form">
        <ScopeFields scope={scope} />
        <ScopeNotice scope={scope} />
        <div className="catalog-field">
          <label htmlFor="catalog-offer-channel">Canal da nova oferta</label>
          <select id="catalog-offer-channel" name="salesChannelId" defaultValue={channels[0]?.id ?? ""}>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>{channel.displayName}</option>
            ))}
          </select>
        </div>
        <div className="catalog-field">
          <label htmlFor="catalog-offer-product">Produto da nova oferta</label>
          <select id="catalog-offer-product" name="productId" defaultValue={products[0]?.id ?? ""}>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
          <small id="catalog-offer-target-hint">Informe um produto ou uma variante, nunca os dois.</small>
        </div>
        <div className="catalog-field">
          <label htmlFor="catalog-offer-variant">Variante da nova oferta</label>
          <select id="catalog-offer-variant" name="productVariantId" defaultValue="" aria-describedby="catalog-offer-target-hint">
            <option value="">Nenhuma variante</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>{variant.name}</option>
            ))}
          </select>
        </div>
        <Field label="Preço base da nova oferta" name="basePrice" inputMode="decimal" hint="Valor exato, com até 4 casas decimais." />
        <Field label="Moeda da nova oferta" name="currency" defaultValue="BRL" />
        <Field label="Preço promocional da nova oferta" name="promotionalPrice" required={false} inputMode="decimal" hint="Deixe vazio para não aplicar promoção." />
        <button className="catalog-button" type="submit" disabled={pending}>Criar oferta</button>
        <Feedback state={state} pending={pending} label="" />
      </form>
    </details>
  );
}

function OfferEditor({ offer, timeline }: Readonly<{ offer: CatalogOfferView; timeline: CatalogTimelineEntry[] }>) {
  const [priceState, priceAction, pricing] = useActionState(updateOfferPriceAction as Action, null);
  const [presentationState, presentationAction, presentationPending] = useActionState(updateOfferPresentationAction as Action, null);
  const [availabilityState, availabilityAction, availabilityPending] = useActionState(updateOfferAvailabilityAction as Action, null);
  const [visibilityState, visibilityAction, visibilityPending] = useActionState(updateOfferVisibilityAction as Action, null);
  const label = offer.title ?? "oferta sem título";

  return (
    <div className="catalog-offer">
      <div className="catalog-card-head">
        <div>
          <strong>{offer.title ?? "Oferta sem título"}</strong>
          <small>
            {offer.basePrice} {offer.currency}
            {offer.promotionalPrice ? ` · promocional ${offer.promotionalPrice}` : ""}
            {` · ${offer.availability === "available" ? "Disponível" : "Indisponível"}`}
            {` · ${offer.visibility === "visible" ? "Visível" : "Oculta"}`}
            {` · revisão ${offer.priceRevision}`}
          </small>
        </div>
      </div>

      <form action={priceAction} className="catalog-inline-form">
        <HiddenId name="offerId" value={offer.id} />
        <Field label={`Preço base de ${label}`} name="basePrice" defaultValue={offer.basePrice} inputMode="decimal" />
        <Field label={`Preço promocional de ${label}`} name="promotionalPrice" defaultValue={offer.promotionalPrice ?? ""} required={false} inputMode="decimal" />
        <button className="catalog-button" type="submit" disabled={pricing}>Atualizar preços</button>
        <Feedback state={priceState} pending={pricing} label="" />
      </form>

      <form action={presentationAction} className="catalog-inline-form">
        <HiddenId name="offerId" value={offer.id} />
        <Field label={`Título no canal de ${label}`} name="title" defaultValue={offer.title ?? ""} required={false} />
        <Field label={`Descrição no canal de ${label}`} name="description" defaultValue={offer.description ?? ""} required={false} />
        <button className="catalog-button" type="submit" disabled={presentationPending}>Salvar apresentação</button>
        <Feedback state={presentationState} pending={presentationPending} label="" />
      </form>

      <form action={availabilityAction} className="catalog-inline-form">
        <HiddenId name="offerId" value={offer.id} />
        <SelectField label={`Disponibilidade de ${label}`} name="availability" options={AVAILABILITY_OPTIONS} defaultValue={offer.availability} />
        <button className="catalog-button" type="submit" disabled={availabilityPending}>Atualizar disponibilidade</button>
        <Feedback state={availabilityState} pending={availabilityPending} label="" />
      </form>

      <form action={visibilityAction} className="catalog-inline-form">
        <HiddenId name="offerId" value={offer.id} />
        <SelectField label={`Visibilidade de ${label}`} name="visibility" options={VISIBILITY_OPTIONS} defaultValue={offer.visibility} />
        <button className="catalog-button" type="submit" disabled={visibilityPending}>Atualizar visibilidade</button>
        <Feedback state={visibilityState} pending={visibilityPending} label="" />
      </form>

      <PriceTimeline entries={timeline} label={label} />
    </div>
  );
}

function PriceTimeline({ entries, label }: Readonly<{ entries: CatalogTimelineEntry[]; label: string }>) {
  return (
    <details className="catalog-disclosure">
      <summary>{`Histórico de preços de ${label} (${entries.length})`}</summary>
      <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label={`Histórico de preços de ${label}`}>
        <table className="catalog-table">
          <caption className="sr-only">{`Histórico de preços de ${label}`}</caption>
          <thead>
            <tr>
              <th scope="col">Revisão</th>
              <th scope="col">Preço base</th>
              <th scope="col">Promocional</th>
              <th scope="col">Disponibilidade</th>
              <th scope="col">Visibilidade</th>
              <th scope="col">Vigente de</th>
              <th scope="col">Vigente até</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhuma revisão de preço registrada.</td>
              </tr>
            ) : entries.map((entry) => (
              <tr key={`${entry.channelOfferId}-${entry.priceRevision}`}>
                <td>{entry.priceRevision}</td>
                <td>{entry.basePrice} {entry.currency}</td>
                <td>{entry.promotionalPrice ?? "—"}</td>
                <td>{entry.availability === "available" ? "Disponível" : "Indisponível"}</td>
                <td>{entry.visibility === "visible" ? "Visível" : "Oculta"}</td>
                <td>{new Date(entry.effectiveFrom).toLocaleString("pt-BR")}</td>
                <td>{entry.effectiveTo ? new Date(entry.effectiveTo).toLocaleString("pt-BR") : "atual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}