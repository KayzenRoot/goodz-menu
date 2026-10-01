# ADR-0004 — AI Truth, Policy and Action Boundary

Status: `APPROVED_V0.1`

## Decision
Goodz separates deterministic business truth from probabilistic AI interpretation, and separates recommendations from authorized actions.

## Layers
1. Truth Layer — structured facts, calculations, ledgers, balances, KPIs.
2. Intelligence Layer — explanation, forecasting, simulation, recommendations.
3. Policy/Decision Layer — permissions, limits, approvals, action preparation.
4. Action Layer — bounded tools with idempotency/audit.

## Required behavior
- AI may not manufacture official financial values;
- external/current facts require source/time provenance;
- material recommendations expose uncertainty/assumptions;
- money-moving/high-impact actions require explicit governed authorization;
- recommendation outcome is measurable when practical.

## Investment boundary
Research/scenario analysis is admitted. External investment execution is not admitted by this ADR.
