# ADR-0001 — Modular Monolith Baseline

Status: `APPROVED_V0.1`

## Decision
Goodz Menu starts as a modular monolith with explicit domain/application boundaries.

## Rationale
The product is broad and strongly transactional. A single transactional boundary reduces distributed consistency cost while early usage/scale evidence is unavailable.

## Constraints
- modules must not bypass owned contracts;
- adapters/workers may be separately deployed where external protocol needs justify it;
- future service extraction requires measured performance, scaling, isolation or organizational evidence.

## Consequences
Positive:
- simpler local Docker development;
- easier transactional integrity;
- lower operational complexity;
- faster cross-domain evolution while boundaries are still being learned.

Risk:
- poor discipline can degrade into a big-ball-of-mud monolith.

Mitigation:
- module ownership, architecture tests and import/dependency rules later in QA/CI.

Supersession requires a new ADR.
