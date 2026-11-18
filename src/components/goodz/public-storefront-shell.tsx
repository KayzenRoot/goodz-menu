"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  placePublicStorefrontOrderAction,
  type PublicCheckoutActionState,
} from "@/app/menu/[slug]/actions";
import { formatBrlNumeric } from "@/lib/orders/order-lifecycle";
import type { HandoffPaymentMethod } from "@/lib/settings/settings-resolver";
import {
  computeStorefrontCartSummary,
  groupOffersByCategory,
  resolveSafeThemeTokens,
  type PublicDeliveryZone,
  type PublicMediaSnapshot,
  type PublicMenuOffer,
} from "@/lib/storefront/storefront-domain";

export type PublicStorefrontPolicy = Readonly<{
  ordering_enabled: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  accepted_payment_methods: HandoffPaymentMethod[];
  cash_change_enabled: boolean;
  default_prep_minutes: number;
  public_notice: string;
  support_whatsapp: string;
}>;

export type PublicStorefrontBundle = Readonly<{
  public_slug: string;
  establishment_name: string;
  branch_name: string;
  headline: string;
  subheadline: string;
  hero_media: PublicMediaSnapshot | null;
  theme: {
    schema_version: number;
    layout_family: string;
    accent_preset: string;
    card_style: string;
  };
  policy: PublicStorefrontPolicy;
  offers: PublicMenuOffer[];
  delivery_zones: PublicDeliveryZone[];
}>;

const METHOD_LABELS: Record<HandoffPaymentMethod, string> = {
  pix_in_person: "Pix presencial na entrega/retirada",
  debit_card_pos: "Cartão de débito (maquininha)",
  credit_card_pos: "Cartão de crédito (maquininha)",
  cash: "Dinheiro em espécie",
};

function generateCheckoutKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pub-chk-${crypto.randomUUID()}`;
  }
  return `pub-chk-${Date.now()}-fallback`;
}

export function PublicStorefrontShell({ bundle }: Readonly<{ bundle: PublicStorefrontBundle | null }>) {
  if (!bundle) {
    return (
      <main className="storefront-shell" data-layout="editorial_bistro" data-accent="emerald_garden" data-card="elevated_glass">
        <div className="storefront-container">
          <section className="catalog-empty" aria-labelledby="sf-missing-title">
            <h1 id="sf-missing-title">Cardápio indisponível</h1>
            <p>Esta vitrine pública não foi encontrada ou está temporariamente oculta pelo estabelecimento.</p>
          </section>
        </div>
      </main>
    );
  }

  return <PublishedStorefrontView bundle={bundle} />;
}

function PublishedStorefrontView({ bundle }: Readonly<{ bundle: PublicStorefrontBundle }>) {
  const router = useRouter();
  const safeTheme = resolveSafeThemeTokens(bundle.theme);
  const categories = groupOffersByCategory(bundle.offers);
  const defaultMode = bundle.policy.pickup_enabled ? "pickup" : "own_delivery";

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [fulfillmentMode, setFulfillmentMode] = useState<"pickup" | "own_delivery">(defaultMode);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(bundle.delivery_zones[0]?.zone_id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<HandoffPaymentMethod>(
    bundle.policy.accepted_payment_methods[0] ?? "pix_in_person",
  );
  const [idempotencyKey] = useState<string>(generateCheckoutKey);
  const [state, action, pending] = useActionState(placePublicStorefrontOrderAction, null);

  useEffect(() => {
    if (state?.kind === "placed") {
      router.push(`/menu/${state.slug}/orders/${state.trackingToken}`);
    }
  }, [router, state]);

  const selectedZone = bundle.delivery_zones.find((z) => z.zone_id === selectedZoneId) ?? null;
  const cart = computeStorefrontCartSummary({
    offers: bundle.offers,
    quantities,
    fulfillmentMode,
    selectedZone,
  });

  const adjustQuantity = (offerId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(99, (prev[offerId] ?? 0) + delta));
      if (next === 0) {
        const rest = { ...prev };
        delete rest[offerId];
        return rest;
      }
      return { ...prev, [offerId]: next };
    });
  };

  return (
    <main
      className="storefront-shell"
      data-layout={safeTheme.layoutFamily}
      data-accent={safeTheme.accentPreset}
      data-card={safeTheme.cardStyle}
    >
      <div className="storefront-container">
        <StorefrontHeroHeader bundle={bundle} />

        {!bundle.policy.ordering_enabled ? (
          <section className="storefront-paused-banner" aria-labelledby="sf-paused-heading">
            <h2 id="sf-paused-heading">Recebimento de pedidos temporariamente pausado</h2>
            <p>
              Você pode consultar os itens e preços abaixo, mas o envio de novos pedidos online está fechado neste momento.
            </p>
          </section>
        ) : null}

        <div className="storefront-main-grid">
          <div className="storefront-menu-column">
            {categories.length === 0 ? (
              <p className="catalog-empty-note">Nenhum item disponível para pedido online neste momento.</p>
            ) : (
              categories.map((group) => (
                <section key={group.categoryName} className="storefront-category-block" aria-label={group.categoryName}>
                  <h2 className="storefront-category-title">{group.categoryName}</h2>
                  <div className="storefront-offers-grid">
                    {group.items.map((offer) => (
                      <StorefrontOfferCard
                        key={offer.offer_id}
                        offer={offer}
                        quantity={quantities[offer.offer_id] ?? 0}
                        orderingEnabled={bundle.policy.ordering_enabled}
                        onAdjust={adjustQuantity}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          <aside className="storefront-checkout-sidebar" aria-label="Sacola e finalização de pedido">
            <StorefrontCheckoutPanel
              bundle={bundle}
              quantities={quantities}
              cart={cart}
              fulfillmentMode={fulfillmentMode}
              setFulfillmentMode={setFulfillmentMode}
              selectedZone={selectedZone}
              selectedZoneId={selectedZoneId}
              setSelectedZoneId={setSelectedZoneId}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              idempotencyKey={idempotencyKey}
              state={state}
              action={action}
              pending={pending}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function StorefrontHeroHeader({ bundle }: Readonly<{ bundle: PublicStorefrontBundle }>) {
  return (
    <header className="storefront-hero">
      <div className="storefront-hero-copy">
        <span className="storefront-eyebrow">
          {bundle.establishment_name} · {bundle.branch_name}
        </span>
        <h1>{bundle.headline}</h1>
        {bundle.subheadline ? <p className="storefront-subheadline">{bundle.subheadline}</p> : null}
        <div className="storefront-meta-pills">
          <span className="settings-plan-pill">Preparo médio ~{bundle.policy.default_prep_minutes} min</span>
          {bundle.policy.pickup_enabled ? <span className="settings-plan-pill">Retirada disponível</span> : null}
          {bundle.policy.delivery_enabled ? <span className="settings-plan-pill">Entrega própria</span> : null}
        </div>
        {bundle.policy.public_notice ? (
          <p className="storefront-notice">{bundle.policy.public_notice}</p>
        ) : null}
      </div>

      {bundle.hero_media ? (
        <div className="storefront-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bundle.hero_media.url}
            alt={bundle.hero_media.alt_text}
            width={bundle.hero_media.width_px}
            height={bundle.hero_media.height_px}
            fetchPriority="high"
          />
        </div>
      ) : null}
    </header>
  );
}

function StorefrontOfferCard({
  offer,
  quantity,
  orderingEnabled,
  onAdjust,
}: Readonly<{
  offer: PublicMenuOffer;
  quantity: number;
  orderingEnabled: boolean;
  onAdjust: (offerId: string, delta: number) => void;
}>) {
  return (
    <article className="storefront-offer-card">
      {offer.media ? (
        <div className="storefront-offer-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.media.url}
            alt={offer.media.alt_text}
            width={offer.media.width_px}
            height={offer.media.height_px}
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="storefront-offer-body">
        <div>
          <h3>{offer.display_name}</h3>
          {offer.description ? <p className="catalog-description">{offer.description}</p> : null}
        </div>

        <div className="storefront-offer-footer">
          <strong className="storefront-price">{formatBrlNumeric(offer.base_price)}</strong>

          {orderingEnabled ? (
            <div className="storefront-qty-stepper">
              {quantity > 0 ? (
                <>
                  <button
                    type="button"
                    className="storefront-qty-btn"
                    aria-label={`Remover 1 unidade de ${offer.display_name}`}
                    onClick={() => onAdjust(offer.offer_id, -1)}
                  >
                    −
                  </button>
                  <span className="storefront-qty-count" aria-live="polite">{quantity}</span>
                </>
              ) : null}
              <button
                type="button"
                className="storefront-add-btn"
                aria-label={`Adicionar ${offer.display_name} à sacola`}
                onClick={() => onAdjust(offer.offer_id, 1)}
              >
                {quantity > 0 ? "+" : "Adicionar"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StorefrontCheckoutPanel({
  bundle,
  quantities,
  cart,
  fulfillmentMode,
  setFulfillmentMode,
  selectedZone,
  selectedZoneId,
  setSelectedZoneId,
  paymentMethod,
  setPaymentMethod,
  idempotencyKey,
  state,
  action,
  pending,
}: Readonly<{
  bundle: PublicStorefrontBundle;
  quantities: Readonly<Record<string, number>>;
  cart: ReturnType<typeof computeStorefrontCartSummary>;
  fulfillmentMode: "pickup" | "own_delivery";
  setFulfillmentMode: (mode: "pickup" | "own_delivery") => void;
  selectedZone: PublicDeliveryZone | null;
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  paymentMethod: HandoffPaymentMethod;
  setPaymentMethod: (method: HandoffPaymentMethod) => void;
  idempotencyKey: string;
  state: PublicCheckoutActionState;
  action: (payload: FormData) => void;
  pending: boolean;
}>) {
  const itemsPayload = JSON.stringify(
    Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([channel_offer_id, quantity]) => ({ channel_offer_id, quantity })),
  );
  const canCheckout = bundle.policy.ordering_enabled && cart.itemCount > 0 && cart.meetsMinimumOrder;

  return (
    <div className="storefront-checkout-card">
      <h2>Sua sacola ({cart.itemCount})</h2>

      <div className="storefront-totals">
        <div><span>Subtotal</span><strong>{cart.subtotalFormatted}</strong></div>
        {fulfillmentMode === "own_delivery" ? (
          <div><span>Taxa de entrega</span><strong>{cart.deliveryFeeFormatted}</strong></div>
        ) : null}
        <div className="storefront-total-row">
          <span>Total presencial</span>
          <strong>{cart.totalFormatted}</strong>
        </div>
      </div>

      <StorefrontCheckoutBody
        bundle={bundle}
        itemsPayload={itemsPayload}
        cart={cart}
        canCheckout={canCheckout}
        fulfillmentMode={fulfillmentMode}
        setFulfillmentMode={setFulfillmentMode}
        selectedZone={selectedZone}
        selectedZoneId={selectedZoneId}
        setSelectedZoneId={setSelectedZoneId}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        idempotencyKey={idempotencyKey}
        state={state}
        action={action}
        pending={pending}
      />
    </div>
  );
}

function StorefrontCheckoutBody({
  bundle,
  itemsPayload,
  cart,
  canCheckout,
  fulfillmentMode,
  setFulfillmentMode,
  selectedZone,
  selectedZoneId,
  setSelectedZoneId,
  paymentMethod,
  setPaymentMethod,
  idempotencyKey,
  state,
  action,
  pending,
}: Readonly<{
  bundle: PublicStorefrontBundle;
  itemsPayload: string;
  cart: ReturnType<typeof computeStorefrontCartSummary>;
  canCheckout: boolean;
  fulfillmentMode: "pickup" | "own_delivery";
  setFulfillmentMode: (mode: "pickup" | "own_delivery") => void;
  selectedZone: PublicDeliveryZone | null;
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  paymentMethod: HandoffPaymentMethod;
  setPaymentMethod: (method: HandoffPaymentMethod) => void;
  idempotencyKey: string;
  state: PublicCheckoutActionState;
  action: (payload: FormData) => void;
  pending: boolean;
}>) {
  if (!bundle.policy.ordering_enabled) {
    return <p className="catalog-form-note">A loja está fechada para novos pedidos neste momento.</p>;
  }
  if (cart.itemCount === 0) {
    return <p className="catalog-meta">Adicione itens do cardápio para iniciar o pedido.</p>;
  }
  return (
    <form className="catalog-offer-form" action={action}>
      <input type="hidden" name="slug" value={bundle.public_slug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="itemsJson" value={itemsPayload} />

      <div className="auth-field">
        <label htmlFor="pub-mode">Como deseja receber?</label>
        <select
          id="pub-mode"
          name="fulfillmentMode"
          value={fulfillmentMode}
          onChange={(event) => setFulfillmentMode(event.target.value as "pickup" | "own_delivery")}
        >
          {bundle.policy.pickup_enabled ? <option value="pickup">Retirada no balcão</option> : null}
          {bundle.policy.delivery_enabled ? <option value="own_delivery">Entrega própria</option> : null}
        </select>
      </div>

      {fulfillmentMode === "own_delivery" ? (
        <PublicDeliveryZoneFields
          zones={bundle.delivery_zones}
          selectedZone={selectedZone}
          selectedZoneId={selectedZoneId}
          setSelectedZoneId={setSelectedZoneId}
          meetsMinimumOrder={cart.meetsMinimumOrder}
          shortfallText={cart.minimumOrderShortfallFormatted}
        />
      ) : null}

      <div className="auth-field">
        <label htmlFor="pub-name">Seu nome</label>
        <input id="pub-name" name="customerName" maxLength={120} required />
      </div>
      <div className="auth-field">
        <label htmlFor="pub-phone">WhatsApp / Telefone</label>
        <input id="pub-phone" name="customerPhone" placeholder="11999990000" maxLength={40} required />
      </div>

      <div className="auth-field">
        <label htmlFor="pub-payment">Pagamento no recebimento (handoff)</label>
        <select
          id="pub-payment"
          name="paymentMethod"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as HandoffPaymentMethod)}
        >
          {bundle.policy.accepted_payment_methods.map((method) => (
            <option key={method} value={method}>{METHOD_LABELS[method]}</option>
          ))}
        </select>
      </div>

      {paymentMethod === "cash" && bundle.policy.cash_change_enabled ? (
        <div className="auth-field">
          <label htmlFor="pub-change">Precisa de troco para quanto? (BRL, opcional)</label>
          <input id="pub-change" name="cashChangeFor" placeholder="100.00" />
        </div>
      ) : null}

      <div className="auth-field">
        <label htmlFor="pub-notes">Observações do pedido (opcional)</label>
        <input id="pub-notes" name="customerNotes" maxLength={500} />
      </div>

      <div className="catalog-checkbox-row">
        <input id="pub-marketing" name="marketingOptIn" type="checkbox" />
        <label htmlFor="pub-marketing">
          Quero receber novidades e ofertas deste estabelecimento (opcional, revogável a qualquer momento).
        </label>
      </div>

      <button className="catalog-save-button storefront-submit" type="submit" disabled={pending || !canCheckout}>
        {pending ? "Enviando pedido…" : `Confirmar pedido · ${cart.totalFormatted}`}
      </button>

      <PublicCheckoutFeedback state={state} />
    </form>
  );
}

function PublicDeliveryZoneFields({
  zones,
  selectedZone,
  selectedZoneId,
  setSelectedZoneId,
  meetsMinimumOrder,
  shortfallText,
}: Readonly<{
  zones: PublicDeliveryZone[];
  selectedZone: PublicDeliveryZone | null;
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
  meetsMinimumOrder: boolean;
  shortfallText: string;
}>) {
  if (zones.length === 0) {
    return (
      <p className="catalog-form-error" role="alert">
        Esta unidade ainda não possui zonas de entrega ativas. Selecione retirada no balcão.
      </p>
    );
  }
  return (
    <>
      <div className="auth-field">
        <label htmlFor="pub-zone">Zona de entrega</label>
        <select
          id="pub-zone"
          name="deliveryZoneId"
          value={selectedZoneId}
          onChange={(event) => setSelectedZoneId(event.target.value)}
        >
          {zones.map((zone) => (
            <option key={zone.zone_id} value={zone.zone_id}>
              {zone.name} · Taxa {formatBrlNumeric(zone.delivery_fee_amount)} · Mín. {formatBrlNumeric(zone.minimum_order_amount)}
            </option>
          ))}
        </select>
      </div>
      {!meetsMinimumOrder && selectedZone ? (
        <output className="catalog-form-note">
          Faltam <strong>{shortfallText}</strong> em itens para atingir o pedido mínimo ({formatBrlNumeric(selectedZone.minimum_order_amount)}) desta zona.
        </output>
      ) : null}
      <div className="auth-field">
        <label htmlFor="pub-street">Logradouro</label>
        <input id="pub-street" name="streetLine" maxLength={200} required />
      </div>
      <div className="auth-field">
        <label htmlFor="pub-num">Número</label>
        <input id="pub-num" name="numberLabel" defaultValue="100" maxLength={40} />
      </div>
      <div className="auth-field">
        <label htmlFor="pub-neigh">Bairro atendido</label>
        <select id="pub-neigh" name="neighborhood" defaultValue={selectedZone?.neighborhoods[0] ?? ""}>
          {(selectedZone?.neighborhoods ?? []).map((neigh) => (
            <option key={neigh} value={neigh}>{neigh}</option>
          ))}
        </select>
      </div>
      <div className="auth-field">
        <label htmlFor="pub-city">Cidade</label>
        <input id="pub-city" name="city" defaultValue="São Paulo" maxLength={120} required />
      </div>
    </>
  );
}

function PublicCheckoutFeedback({ state }: Readonly<{ state: PublicCheckoutActionState }>) {
  if (!state) return null;
  if (state.kind === "placed") {
    return (
      <output className="catalog-form-success">
        Pedido #{state.orderNumber} confirmado!{" "}
        <Link href={`/menu/${state.slug}/orders/${state.trackingToken}`}>
          Acompanhar status do pedido
        </Link>
      </output>
    );
  }
  const messages: Record<string, string> = {
    invalid: "Confira seu nome, telefone e dados de entrega.",
    paused: "O recebimento de pedidos online acabou de ser pausado nesta unidade.",
    offer_unavailable: "Um dos itens selecionados esgotou. Atualize a página.",
    below_minimum: "O subtotal dos itens não atingiu o pedido mínimo da zona.",
    outside_zone: "O bairro selecionado não pertence à zona de entrega ativa.",
    failed: "Não foi possível enviar o pedido agora. Tente novamente.",
  };
  return (
    <p className="catalog-form-error" role="alert">
      {messages[state.kind] ?? messages.failed}
    </p>
  );
}
