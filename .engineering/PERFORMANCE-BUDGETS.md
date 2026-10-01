# Goodz Menu — Performance Budgets

Status: `FROZEN_CANDIDATE_V0.1 / REVIEW_PENDING`

Budgets are quality gates, not marketing promises. They apply to defined benchmark populations and can only change through evidence-backed governance.

## Public storefront field targets

At p75, separately for mobile and desktop when field volume is sufficient:
- LCP: `<= 2.5 s`
- INP: `<= 200 ms`
- CLS: `<= 0.1`

Source baseline:
https://web.dev/articles/vitals

## POS interaction targets

Representative local/production build:
- product search local-result feedback: p95 `<= 100 ms`
- add/remove cart feedback: p95 `<= 100 ms`
- quantity/modifier UI update: p95 `<= 100 ms`
- route-to-usable POS shell: target `<= 2.0 s` on declared reference hardware/network profile

External payment/provider wait time is reported separately from local UI processing.

## Backend targets

Under defined representative load and excluding unavoidable external provider latency:
- common simple authenticated read: p95 `<= 300 ms`
- common transactional command: p95 `<= 500 ms`
- server error rate on benchmark workload: `< 1%` and `0` accepted integrity errors

No latency target justifies bypassing authorization, audit or consistency.

## AI budgets

AI performance is evaluated separately:
- deterministic pre-processing should complete before model call where applicable;
- time to first useful streamed response is measured;
- full-response latency by task class is measured;
- model/provider latency is separated from Goodz orchestration latency;
- token/cost per feature is tracked;
- fallback/retry amplification is measured.

No universal AI latency target is frozen until model/provider reference profiles are selected.

## Visual-performance constraints

- glass/blur effects must not cause unacceptable scrolling/input degradation;
- animations avoid long main-thread blocking;
- reduced-motion path must not require heavy animation runtime;
- image loading must use responsive dimensions/formats;
- large dashboard charts/tables must virtualize/paginate when required by benchmark evidence.

## Offline/sync targets

Initial planning expectations:
- local cart/POS actions remain interactive without network;
- sync queue processing exposes progress/failure;
- duplicate replay creates zero duplicate canonical financial/inventory effects.

Throughput/queue timing will be frozen with implementation dataset profiles.

## Regression rule

Performance-sensitive PRs compare against an accepted baseline.

A regression beyond configured tolerance:
- blocks merge; or
- requires explicit documented acceptance with rationale and follow-up.

No benchmark comparison is valid across materially different workload/device/network populations without disclosure.

## Accessibility performance

Performance optimizations must not remove:
- semantic markup;
- focus handling;
- announcements;
- accessible names;
- reduced motion.

STOP CONDITION: `GMZ_PERFORMANCE_BUDGETS_V0_1_READY_FOR_REVIEW`
