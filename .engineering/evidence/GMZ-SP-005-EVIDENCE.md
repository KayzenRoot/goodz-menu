# GMZ-SP-005 — Evidence Bundle

Status: `APPROVED_FOR_PLANNING_PROMOTION`

## Binding
- Repository: `KayzenRoot/goodz-menu`
- Issue: `#13`
- Base: `main@c7f7c2a3081d9a3790fc51e1380f8c7df3038473`
- Work Order: `GMZ-SP-005`
- Context Lock: `.engineering/context-locks/GMZ-SP-005.json`

## Outputs
- `docs/source-pack/API-INTEGRATION-CONTRACTS.md`
- `docs/source-pack/AI-ARCHITECTURE.md`
- synchronized checkpoints

## Integration contract coverage
PASS:
- application/domain/provider separation;
- provider payload isolation;
- safe error contract;
- idempotency;
- durable inbox/outbox;
- retries and dead-letter handling;
- integration connection/capability model;
- universal order normalization;
- catalog synchronization;
- Goodz Online contract;
- iFood adapter boundary;
- 99Food adapter boundary;
- WhatsApp/e-mail/payment/media/market-data adapters;
- secrets/webhook/correlation/versioning/observability/outage behavior.

## Current provider verification
Provider assumptions were verified against current documentation on 2026-10-01.

iFood baseline records current documented restaurant integration families and keeps exact provider endpoint/version details outside the Goodz canonical domain.

99Food baseline records its official developer platform's current menu/order integration, sandbox and certification/authorization process and treats exact runtime schemas as implementation-time provider contracts.

Provider docs MUST be revalidated before adapter implementation.

## AI architecture coverage
PASS:
- Truth Layer;
- Semantic Business Layer;
- Data Quality Gate;
- Agent Fabric;
- Orchestrator;
- Policy Brain;
- autonomy levels;
- Proof Engine;
- confidence/trust;
- Model Router;
- AI Cost Governor;
- Memory Tiers;
- context compiler;
- Business Twin;
- Merchant Genome;
- Decision Graph;
- forecasting;
- counterfactual/scenario analysis;
- Business Optimizer;
- recommendation/action lifecycle;
- Daily Brief;
- Treasury Copilot;
- Investment Research Agent;
- Risk Agent;
- external-source provenance;
- human approval;
- AI audit/evaluation;
- Learning Loop;
- prompt/template governance;
- prompt-injection/tool safety;
- tenant isolation/privacy;
- graceful AI-provider failure;
- advanced AI production gates.

## Safety boundaries
- deterministic business facts remain authoritative;
- AI does not bypass tenant authorization;
- material action requires Policy Brain and applicable approval;
- current external facts require timestamped sources;
- investment research is read-only baseline;
- external investment execution is not admitted;
- LLM outage does not block canonical POS/finance/inventory operation.

## Implementation boundary
No:
- runtime/provider code;
- SDK installation;
- API credentials;
- production webhooks;
- SQL/migrations;
- CI/build/deploy implementation;
- financial/investment execution.

## Audit
- required SP-005 acceptance groups: `PASS`
- CRITICAL: `0`
- HIGH: `0`
- audit independence: `NOT_INDEPENDENT / owner-operated`

## Open independent gate
GMZ-SRC-001 exact repository archive remains governed by GMZ-SP-003A / Issue #9 and still blocks final Source Pack freeze.

## Progress truth
Overall product completion remains `NOT_YET_BASELINED`.

STOP CONDITION: `GMZ_SP_005_API_AI_CONTRACTS_READY_FOR_REVIEW`
