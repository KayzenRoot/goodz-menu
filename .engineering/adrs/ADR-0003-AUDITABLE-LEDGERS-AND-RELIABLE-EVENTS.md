# ADR-0003 — Auditable Ledgers + Reliable Integration Events

Status: `APPROVED_V0.1`

## Decision
Inventory and financial movements use append/audit-oriented records. External integration events use durable inbox/outbox/idempotency concepts.

## Rationale
Mutable balance-only models make it difficult to explain discrepancies, reconcile channels or recover from retries.

## Invariants
- corrections are new compensating/reversal records where feasible;
- summaries/balances are derived or reconcilable;
- external event IDs/idempotency keys prevent duplicate economic effects;
- provider retries never silently duplicate stock/payment/order effects;
- audit/correlation metadata links the business effect to its source.

## Consequence
Data-model complexity increases, but operational explainability and recovery improve substantially.
