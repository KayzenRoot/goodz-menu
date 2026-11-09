"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
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
  confirmPrivilegedIdentityAction,
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

const actionResetTokens = new WeakMap<object, number>();
let nextActionResetToken = 1;

function actionResetToken(state: CatalogActionState | undefined): string {
  if (state == null) return "initial";
  const existing = actionResetTokens.get(state);
  if (existing !== undefined) return String(existing);
  const next = nextActionResetToken++;
  actionResetTokens.set(state, next);
  return String(next);
}

/**
 * Whether this session currently carries the confirmation a commercial mutation needs.
 *
 * The catalog contract checks the two layers independently, so the interface only says which one
 * lapsed; it never decides whether the operator is allowed to proceed.
 */
export type CatalogCommercialConfirmation = {
  confirmed: boolean;
  verifiedFactorIds: string[];
};

function Feedback({ state, pending, label }: Readonly<{ state: CatalogActionState; pending: boolean; label: string }>) {
  const message = pending ? "Salvando…" : (state?.message ?? label);
  const tone = state ? `catalog-feedback-${state.kind}` : "";
  return (
    <output className={`catalog-feedback ${tone}`} aria-live="polite">
      {message}
    </output>
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

/**
 * A text field that keeps what the operator typed.
 *
 * React resets a form's uncontrolled fields every time an action bound to it runs, whether the action
 * accepted the submission or refused it. A refused price would therefore erase the rest of the form
 * along with it, which is the one moment the operator most needs their input left alone. The draft is
 * held here rather than in the form, so it survives that reset, and the server value is what the field
 * starts from and returns to when the record is re-read from a place the operator did not type.
 */
function Field({ label, name, defaultValue, resetKey, type = "text", inputMode, hint, required = true }: Readonly<{
  label: string;
  name: string;
  defaultValue?: string;
  resetKey?: CatalogActionState;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal";
  hint?: string;
  required?: boolean;
}>) {
  const id = useId();
  const resetToken = actionResetToken(resetKey);
  const [draft, setDraft] = useState<{ resetToken: string; value: string } | null>(null);
  const value = draft?.resetToken === resetToken
    ? draft.value
    : resetKey?.kind === "ok"
      ? defaultValue ?? ""
      : draft?.value ?? defaultValue ?? "";
  return (
    <div className="catalog-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => setDraft({ resetToken, value: event.target.value })}
        inputMode={inputMode}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    </div>
  );
}

/**
 * A select that keeps the operator's choice across the reset React performs before an action runs.
 *
 * A reset puts a field back the way it was mounted. React re-marks an input's default value on every
 * update, so a text field comes back holding what was typed; a select's default option is only marked
 * while mounting, so a controlled select silently emptied itself the moment the form was submitted,
 * accepted or refused. Keying the element by the current choice remounts it, which marks the default
 * option to the choice that was just made, and the field survives the reset.
 */
function SelectField({ label, name, options, defaultValue, resetKey, hint, describedBy }: Readonly<{
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  resetKey?: CatalogActionState;
  hint?: string;
  describedBy?: string;
}>) {
  const id = useId();
  const resetToken = actionResetToken(resetKey);
  const [draft, setDraft] = useState<{ resetToken: string; value: string } | null>(null);
  const value = draft?.resetToken === resetToken
    ? draft.value
    : resetKey?.kind === "ok"
      ? defaultValue ?? ""
      : draft?.value ?? defaultValue ?? "";

  return (
    <div className="catalog-field">
      <label htmlFor={id}>{label}</label>
      <select
        key={`${id}-${resetToken}`}
        id={id}
        name={name}
        defaultValue={value}
        onChange={(event) => setDraft({ resetToken, value: event.target.value })}
        aria-describedby={describedBy ?? (hint ? `${id}-hint` : undefined)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
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
function admittedScopeLabel(scope: CatalogAdmittedScope): string {
  if (scope.branchId) return `${scope.organizationName} · filial`;
  if (scope.establishmentId) return `${scope.organizationName} · estabelecimento`;
  return scope.organizationName;
}

function ScopeNotice({ scope }: Readonly<{ scope: CatalogAdmittedScope }>) {
  return <small className="catalog-scope-note">Novos itens entram em {admittedScopeLabel(scope)}.</small>;
}

export function CatalogConsole({ overview, search, commercialConfirmation }: Readonly<{
  overview: CatalogOverview;
  search: string;
  commercialConfirmation: CatalogCommercialConfirmation;
}>) {
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
      {overview.canManagePrice || overview.canManageAvailability
        ? <CommercialConfirmation confirmation={commercialConfirmation} />
        : null}
      <OfferSection
        offers={overview.offers}
        products={overview.products}
        variants={overview.variants}
        channels={overview.channels}
        timeline={overview.timeline}
        scope={scope}
        canManagePrice={overview.canManagePrice}
        canManageAvailability={overview.canManageAvailability}
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
            <CategoryEditor category={category} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryEditor({ category }: Readonly<{ category: CatalogCategoryView }>) {
  const [state, action, pending] = useActionState(updateCategoryAction as Action, null);
  return (
    <form action={action} className="catalog-inline-form">
      <HiddenId name="categoryId" value={category.id} />
      <Field label={`Nome de ${category.name}`} name="name" defaultValue={category.name} resetKey={state} />
      <Field label={`Descrição de ${category.name}`} name="description" defaultValue={category.description ?? ""} resetKey={state} required={false} />
      <Field label={`Ordem de ${category.name}`} name="displayOrder" defaultValue={String(category.displayOrder)} resetKey={state} inputMode="numeric" />
      <button className="catalog-button" type="submit" disabled={pending}>Salvar</button>
      <Feedback state={state} pending={pending} label="" />
    </form>
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
        <Field label="Nome da nova categoria" name="name" resetKey={state} />
        <Field label="Descrição da nova categoria" name="description" resetKey={state} required={false} />
        <Field label="Ordem da nova categoria" name="displayOrder" defaultValue="0" resetKey={state} inputMode="numeric" />
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
      {/* The field is the state being asked for, not the state being left behind: archiving posts true
          and reactivation posts false. Carrying the current state instead would make the button
          labelled "Arquivar" the one that reactivates. */}
      <HiddenId name="archived" value={archived ? "false" : "true"} />
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
            <ProductEditor product={product} />
            <VariantList variants={variants.filter((variant) => variant.productId === product.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductEditor({ product }: Readonly<{ product: CatalogProductView }>) {
  const [state, action, pending] = useActionState(updateProductAction as Action, null);
  return (
    <form action={action} className="catalog-inline-form">
      <HiddenId name="productId" value={product.id} />
      <Field label={`Nome de ${product.name}`} name="name" defaultValue={product.name} resetKey={state} />
      <Field label={`Descrição de ${product.name}`} name="description" defaultValue={product.description ?? ""} resetKey={state} required={false} />
      <button className="catalog-button" type="submit" disabled={pending}>Salvar</button>
      <Feedback state={state} pending={pending} label="" />
    </form>
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
        <Field label="Nome do novo produto" name="name" resetKey={state} />
        <Field label="Descrição do novo produto" name="description" resetKey={state} required={false} />
        <SelectField
          label="Categoria do novo produto"
          name="categoryId"
          defaultValue=""
          resetKey={state}
          options={[
            { value: "", label: "Sem categoria" },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
        />
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
      {/* See CategoryArchiver: the form asks for the target state, not the current one. */}
      <HiddenId name="archived" value={archived ? "false" : "true"} />
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
        <SelectField
          label="Produto da nova variante"
          name="productId"
          defaultValue={products[0].id}
          resetKey={state}
          options={products.map((product) => ({ value: product.id, label: product.name }))}
        />
        <Field label="Nome da nova variante" name="name" resetKey={state} />
        <button className="catalog-button" type="submit" disabled={pending}>Criar variante</button>
        <Feedback state={state} pending={pending} label="" />
      </form>
    </details>
  );
}

function VariantList({ variants }: Readonly<{ variants: CatalogVariantView[] }>) {
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
          <VariantEditor variant={variant} />
        </li>
      ))}
    </ul>
  );
}

function VariantEditor({ variant }: Readonly<{ variant: CatalogVariantView }>) {
  const [state, action, pending] = useActionState(updateVariantAction as Action, null);
  return (
    <form action={action} className="catalog-inline-form">
      <HiddenId name="variantId" value={variant.id} />
      <Field label={`Nome de ${variant.name}`} name="name" defaultValue={variant.name} resetKey={state} />
      <label className="catalog-checkbox">
        <input type="checkbox" name="archived" defaultChecked={variant.status === "archived"} />
        <span>{`Arquivar ${variant.name}`}</span>
      </label>
      <button className="catalog-button" type="submit" disabled={pending}>Salvar variante</button>
      <Feedback state={state} pending={pending} label="" />
    </form>
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
        <Field label="Chave do novo canal" name="channelKey" resetKey={state} hint="Identificador estável, sem acentos ou espaços." />
        <Field label="Nome exibido do novo canal" name="displayName" resetKey={state} />
        <Field label="Descrição do novo canal" name="description" resetKey={state} required={false} />
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
      <Field label={`Nome exibido de ${channel.displayName}`} name="displayName" defaultValue={channel.displayName} resetKey={state} />
      <Field label={`Descrição de ${channel.displayName}`} name="description" defaultValue={channel.description ?? ""} resetKey={state} required={false} />
      <button className="catalog-button" type="submit" disabled={pending}>Salvar canal</button>
      <Feedback state={state} pending={pending} label="" />
    </form>
  );
}

/**
 * The confirmation a money action needs, rendered as its own state rather than as an error.
 *
 * Without this the interface could only ever report "confirme a identidade" and leave the operator
 * with nothing to act on, because the confirmation controls lived solely on the Admin Guard route.
 *
 * The two factors are asked for in one form on purpose. A privileged command is authorized by a
 * single token that has to carry the password grant and the authenticator proof together; confirming
 * them in two separate steps, on two separate sessions, produces two tokens that each satisfy half of
 * what the database asks for and no token that satisfies all of it.
 */
function CommercialConfirmation({ confirmation }: Readonly<{ confirmation: CatalogCommercialConfirmation }>) {
  const [state, action, pending] =
    useActionState<CatalogActionState, FormData>(confirmPrivilegedIdentityAction, null);
  const passwordId = useId();
  const codeId = useId();

  if (confirmation.confirmed) {
    return (
      <output className="catalog-confirmation catalog-confirmation-ok">
        Identidade confirmada nesta sessão: preço, disponibilidade e visibilidade podem ser alterados.
      </output>
    );
  }

  return (
    <section className="catalog-confirmation" aria-labelledby="catalog-confirmation-title">
      <div className="catalog-confirmation-head">
        <span className="eyebrow">AÇÃO COMERCIAL PROTEGIDA</span>
        <h2 id="catalog-confirmation-title">Confirme a identidade antes de alterar preço ou disponibilidade</h2>
        <p>
          Preço, preço promocional, disponibilidade e visibilidade exigem uma verificação em duas etapas e uma
          reconfirmação de senha. Nomear, descrever e arquivar itens não exigem essa confirmação.
        </p>
      </div>
      {confirmation.verifiedFactorIds.length > 0 ? (
        <form action={action} className="catalog-form">
          <div className="catalog-field">
            <label htmlFor={passwordId}>Senha para reautenticar</label>
            <input id={passwordId} name="reauth-password" type="password" autoComplete="current-password" required />
          </div>
          <div className="catalog-field">
            <label htmlFor={codeId}>Código do aplicativo autenticador</label>
            <input
              id={codeId}
              name="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
            <small>A confirmação vale por cinco minutos e vale para a sessão inteira.</small>
          </div>
          <button className="catalog-button" type="submit" disabled={pending}>
            {pending ? "Confirmando identidade…" : "Confirmar identidade"}
          </button>
          {state ? <Feedback state={state} pending={pending} label="" /> : null}
        </form>
      ) : (
        <p className="catalog-empty-line">
          <Link className="auth-entry-link" href="/app/security">Configure um aplicativo autenticador</Link>{" "}
          para habilitar alterações de preço e disponibilidade.
        </p>
      )}
    </section>
  );
}

function OfferSection({ offers, products, variants, channels, timeline, scope, canManagePrice, canManageAvailability }: Readonly<{
  offers: CatalogOfferView[];
  products: CatalogProductView[];
  variants: CatalogVariantView[];
  channels: CatalogChannelView[];
  timeline: CatalogTimelineEntry[];
  scope: CatalogAdmittedScope | null;
  canManagePrice: boolean;
  canManageAvailability: boolean;
}>) {
  // An offer is created with its price, so creating one is a commercial act and follows the same
  // capability as repricing it.
  const creatable = Boolean(scope) && canManagePrice && products.length > 0 && channels.length > 0;
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
            <OfferEditor
              offer={offer}
              timeline={timeline.filter((entry) => entry.channelOfferId === offer.id)}
              canWrite={Boolean(scope)}
              canManagePrice={canManagePrice}
              canManageAvailability={canManageAvailability}
            />
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
        <SelectField
          label="Canal da nova oferta"
          name="salesChannelId"
          defaultValue={channels[0]?.id ?? ""}
          resetKey={state}
          options={channels.map((channel) => ({ value: channel.id, label: channel.displayName }))}
        />
        {/* The two target fields share one hint because the rule is about the pair: an offer names a
            product or a variant, never both. */}
        <SelectField
          label="Produto da nova oferta"
          name="productId"
          defaultValue=""
          resetKey={state}
          describedBy="catalog-offer-target-hint"
          // An offer can name a variant instead of a product, so the product has to be clearable.
          options={[
            { value: "", label: "Nenhum produto" },
            ...products.map((product) => ({ value: product.id, label: product.name })),
          ]}
        />
        <p className="catalog-hint" id="catalog-offer-target-hint">Informe um produto ou uma variante, nunca os dois.</p>
        <SelectField
          label="Variante da nova oferta"
          name="productVariantId"
          defaultValue=""
          resetKey={state}
          describedBy="catalog-offer-target-hint"
          options={[
            { value: "", label: "Nenhuma variante" },
            ...variants.map((variant) => ({ value: variant.id, label: variant.name })),
          ]}
        />
        <Field label="Preço base da nova oferta" name="basePrice" resetKey={state} inputMode="decimal" hint="Valor exato, com até 4 casas decimais." />
        <Field label="Moeda da nova oferta" name="currency" defaultValue="BRL" resetKey={state} />
        <Field label="Preço promocional da nova oferta" name="promotionalPrice" resetKey={state} required={false} inputMode="decimal" hint="Deixe vazio para não aplicar promoção." />
        <button className="catalog-button" type="submit" disabled={pending}>Criar oferta</button>
        <Feedback state={state} pending={pending} label="" />
      </form>
    </details>
  );
}

function OfferEditor({ offer, timeline, canWrite, canManagePrice, canManageAvailability }: Readonly<{
  offer: CatalogOfferView;
  timeline: CatalogTimelineEntry[];
  canWrite: boolean;
  canManagePrice: boolean;
  canManageAvailability: boolean;
}>) {
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

      {canManagePrice ? (
        <form action={priceAction} className="catalog-inline-form">
          <HiddenId name="offerId" value={offer.id} />
          <Field label={`Preço base de ${label}`} name="basePrice" defaultValue={offer.basePrice} resetKey={priceState} inputMode="decimal" />
          <Field label={`Preço promocional de ${label}`} name="promotionalPrice" defaultValue={offer.promotionalPrice ?? ""} resetKey={priceState} required={false} inputMode="decimal" />
          <button className="catalog-button" type="submit" disabled={pricing}>Atualizar preços</button>
          <Feedback state={priceState} pending={pricing} label="" />
        </form>
      ) : null}

      {canWrite ? (
        <form action={presentationAction} className="catalog-inline-form">
          <HiddenId name="offerId" value={offer.id} />
          <Field label={`Título no canal de ${label}`} name="title" defaultValue={offer.title ?? ""} resetKey={presentationState} required={false} />
          <Field label={`Descrição no canal de ${label}`} name="description" defaultValue={offer.description ?? ""} resetKey={presentationState} required={false} />
          <button className="catalog-button" type="submit" disabled={presentationPending}>Salvar apresentação</button>
          <Feedback state={presentationState} pending={presentationPending} label="" />
        </form>
      ) : null}

      {canManageAvailability ? (
        <>
          <form action={availabilityAction} className="catalog-inline-form">
            <HiddenId name="offerId" value={offer.id} />
            <SelectField label={`Disponibilidade de ${label}`} name="availability" options={AVAILABILITY_OPTIONS} defaultValue={offer.availability} resetKey={availabilityState} />
            <button className="catalog-button" type="submit" disabled={availabilityPending}>Atualizar disponibilidade</button>
            <Feedback state={availabilityState} pending={availabilityPending} label="" />
          </form>

          <form action={visibilityAction} className="catalog-inline-form">
            <HiddenId name="offerId" value={offer.id} />
            <SelectField label={`Visibilidade de ${label}`} name="visibility" options={VISIBILITY_OPTIONS} defaultValue={offer.visibility} resetKey={visibilityState} />
            <button className="catalog-button" type="submit" disabled={visibilityPending}>Atualizar visibilidade</button>
            <Feedback state={visibilityState} pending={visibilityPending} label="" />
          </form>
        </>
      ) : null}

      <PriceTimeline entries={timeline} label={label} />
    </div>
  );
}

function PriceTimeline({ entries, label }: Readonly<{ entries: CatalogTimelineEntry[]; label: string }>) {
  return (
    <details className="catalog-disclosure">
      <summary>{`Histórico de preços de ${label} (${entries.length})`}</summary>
      {/* The timeline scrolls sideways on a narrow viewport, and a scroll container that cannot take
          focus cannot be reached with a keyboard. The section carries the landmark natively and the
          tab stop is the price of that reachability. */}
      <section className="catalog-table-scroll" tabIndex={0} aria-label={`Histórico de preços de ${label}`}>
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
                <td>{new Date(entry.effectiveFrom).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td>{entry.effectiveTo ? new Date(entry.effectiveTo).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "atual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </details>
  );
}
