"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBrlNumeric, type OrderStatus } from "@/lib/orders/order-lifecycle";
import type { HandoffPaymentMethod } from "@/lib/settings/settings-resolver";
import { resolveSafeThemeTokens } from "@/lib/storefront/storefront-domain";

export type PublicOrderTrackingBundle = Readonly<{
  public_slug: string;
  headline: string;
  theme: {
    layout_family: string;
    accent_preset: string;
    card_style: string;
  };
  order_number: number;
  fulfillment_mode: "pickup" | "own_delivery";
  status: OrderStatus;
  currency: string;
  subtotal_amount: number;
  delivery_fee_amount: number;
  total_amount: number;
  declared_payment_method: HandoffPaymentMethod;
  cash_change_for_amount: number | null;
  handoff_payment_status: string;
  customer_first_name: string;
  neighborhood: string;
  placed_at: string;
  items: ReadonlyArray<{
    line_number: number;
    display_name: string;
    quantity: number;
    line_total_amount: number;
  }>;
  delivery: Readonly<{
    status: string;
    zone_name: string;
    estimated_delivery_minutes: number;
    courier_label: string;
  }> | null;
  transitions: ReadonlyArray<{
    to_status: string;
    created_at: string;
  }>;
}>;

const PUBLIC_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Pedido recebido pelo estabelecimento",
  accepted: "Pedido confirmado",
  preparing: "Em preparo na cozinha",
  ready_for_pickup: "Pronto para retirada no balcão",
  ready_for_dispatch: "Pronto para saída de entrega",
  out_for_delivery: "Saiu para entrega própria",
  completed: "Pedido concluído",
  cancelled: "Pedido cancelado",
};

const PAYMENT_LABELS: Record<HandoffPaymentMethod, string> = {
  pix_in_person: "Pix presencial",
  debit_card_pos: "Cartão de débito (maquininha)",
  credit_card_pos: "Cartão de crédito (maquininha)",
  cash: "Dinheiro em espécie",
};

export function PublicOrderTrackingView({
  slug,
  tracking,
}: Readonly<{
  slug: string;
  tracking: PublicOrderTrackingBundle | null;
}>) {
  const router = useRouter();

  if (!tracking) {
    return (
      <main className="storefront-shell" data-layout="editorial_bistro" data-accent="emerald_garden" data-card="elevated_glass">
        <div className="storefront-container">
          <section className="catalog-empty" aria-labelledby="trk-not-found">
            <h1 id="trk-not-found">Acompanhamento indisponível</h1>
            <p>Não encontramos um pedido correspondente a este link protegido.</p>
            {slug ? (
              <p style={{ marginTop: 10 }}>
                <Link className="auth-entry-link" href={`/menu/${slug}`}>Voltar ao cardápio</Link>
              </p>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  const safeTheme = resolveSafeThemeTokens(tracking.theme);

  return (
    <main
      className="storefront-shell"
      data-layout={safeTheme.layoutFamily}
      data-accent={safeTheme.accentPreset}
      data-card={safeTheme.cardStyle}
    >
      <div className="storefront-container">
        <header className="storefront-hero">
          <div className="storefront-hero-copy">
            <span className="storefront-eyebrow">{tracking.headline}</span>
            <h1>Pedido #{tracking.order_number}</h1>
            <p className="storefront-subheadline">
              Olá, <strong>{tracking.customer_first_name}</strong> · Status atual:{" "}
              <strong>{PUBLIC_STATUS_LABELS[tracking.status]}</strong>
            </p>
            <div className="storefront-meta-pills">
              <button className="auth-logout" type="button" onClick={() => router.refresh()}>
                Atualizar status
              </button>
              <Link className="auth-entry-link" href={`/menu/${tracking.public_slug}`}>
                Fazer outro pedido
              </Link>
            </div>
          </div>
        </header>

        <div className="storefront-tracking-grid">
          <section className="catalog-section" aria-labelledby="trk-items-title">
            <h2 id="trk-items-title">Resumo do pedido</h2>
            <ul className="orders-history-list">
              {tracking.items.map((item) => (
                <li key={item.line_number}>
                  {item.quantity}× <strong>{item.display_name}</strong> — {formatBrlNumeric(item.line_total_amount)}
                </li>
              ))}
            </ul>

            <div className="storefront-totals">
              <div><span>Subtotal</span><strong>{formatBrlNumeric(tracking.subtotal_amount)}</strong></div>
              {tracking.fulfillment_mode === "own_delivery" ? (
                <div><span>Taxa de entrega</span><strong>{formatBrlNumeric(tracking.delivery_fee_amount)}</strong></div>
              ) : null}
              <div className="storefront-total-row">
                <span>Total presencial ({PAYMENT_LABELS[tracking.declared_payment_method]})</span>
                <strong>{formatBrlNumeric(tracking.total_amount)}</strong>
              </div>
            </div>
          </section>

          <section className="catalog-section" aria-labelledby="trk-progress-title">
            <h2 id="trk-progress-title">Andamento em tempo real</h2>
            {tracking.delivery ? (
              <p className="catalog-description">
                Entrega própria · Zona <strong>{tracking.delivery.zone_name || "Local"}</strong>
                {tracking.neighborhood ? ` (${tracking.neighborhood})` : ""} · Prazo estimado ~
                {tracking.delivery.estimated_delivery_minutes} min
                {tracking.delivery.courier_label ? ` · Entregador: ${tracking.delivery.courier_label}` : ""}
              </p>
            ) : (
              <p className="catalog-description">Modalidade: <strong>Retirada no balcão</strong></p>
            )}

            <ul className="orders-history-list">
              {tracking.transitions.map((tr, index) => (
                <li key={`${tr.to_status}-${index}`}>
                  <strong>{PUBLIC_STATUS_LABELS[tr.to_status as OrderStatus] ?? tr.to_status}</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
