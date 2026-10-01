# Goodz Menu — AI Architecture

Status: `BASELINE_V0.1 / REVIEW_PENDING`  
Authority domain: `ARCHITECTURE + AI_GOVERNANCE`

## 1. Mission

Goodz AI exists to improve business decisions and execution quality.

It is not a decorative chatbot and is not canonical financial truth.

Core loop:

```text
OBSERVE
→ VERIFY DATA
→ EXPLAIN
→ FORECAST / SIMULATE
→ RECOMMEND
→ PROVE
→ POLICY CHECK
→ HUMAN/POLICY APPROVAL
→ EXECUTE ALLOWED ACTION
→ MEASURE OUTCOME
→ LEARN
```

## 2. Architectural planes

```text
Business Data / External Sources
          ↓
      Truth Layer
          ↓
 Data Quality / Semantic Layer
          ↓
     Agent Fabric
          ↓
 Simulation / Forecast / Risk
          ↓
      Proof Engine
          ↓
      Policy Brain
          ↓
 Approval / Action Gateway
          ↓
 Outcome Measurement
          ↓
     Learning Loop
```

## 3. Truth Layer

Official values for:
- sales;
- balances;
- inventory;
- COGS/CMV;
- fees;
- payables/receivables;
- cash;
- managerial metrics;

must come from deterministic data/rules.

LLMs may explain these outputs but may not replace them with free-form arithmetic.

If deterministic data is missing/invalid, AI must say the result is unavailable/insufficient rather than invent it.

## 4. Semantic Business Layer

Provide safe tool-level concepts such as:
- revenue_today;
- contribution_margin_by_product;
- upcoming_payables;
- inventory_days_cover;
- settlement_variance;
- channel_profitability.

This layer:
- owns definitions;
- records time range;
- carries tenant scope;
- exposes confidence/data-quality metadata.

Agents should query semantic tools rather than compose arbitrary SQL by default.

## 5. Data Quality Gate

Before material advice, check:
- stale inventory;
- missing product costs;
- incomplete recipes;
- unreconciled sales;
- missing supplier prices;
- incomplete receivables;
- abnormal data gaps.

Recommendation may be downgraded or blocked when required inputs are insufficient.

## 6. Agent Fabric

Initial logical agents:
- Finance Agent
- Treasury Agent
- Inventory Agent
- Purchasing Agent
- Pricing Agent
- Sales Agent
- Delivery Agent
- Customer Agent
- Marketing Agent
- Investment Research Agent
- Risk Agent
- Audit Agent

Agents are roles/contracts, not necessarily separate processes/models.

Each has:
- allowed tools;
- allowed data domains;
- action permissions;
- risk class;
- context budget;
- evaluation suite.

## 7. Orchestrator

The orchestrator decides:
- which agent/tool is needed;
- execution order;
- which facts are shared;
- when deterministic code suffices;
- when higher-capability model is justified;
- when risk/audit review is required.

The orchestrator itself does not grant authorization.

## 8. Policy Brain

Every action proposal is checked against:
- user identity;
- tenant;
- role/permission;
- business policy;
- financial threshold;
- risk class;
- current state;
- required approval;
- idempotency.

Example policies:
- reserve floor;
- max discount;
- max campaign spend;
- max purchase value without approval;
- investment risk concentration;
- offline-action restrictions.

Policy decisions are auditable.

## 9. Autonomy levels

### L0 — Data
AI explains existing facts.

### L1 — Insight
AI identifies observations/anomalies.

### L2 — Recommendation
AI recommends actions/scenarios.

### L3 — Prepared Action
AI fills draft forms/actions for approval.

### L4 — Policy-bounded low-risk execution
Only explicitly admitted, reversible/low-risk actions.

### L5 — Advanced bounded autonomy
Future experimental class only.

Money movement/investment execution is not admitted by this baseline.

## 10. Proof Engine

Material recommendation proof contains:
- recommendation;
- deterministic facts used;
- source record/metric references;
- external source references;
- time range/freshness;
- assumptions;
- uncertainty/confidence;
- risk;
- estimated effect;
- alternative scenarios;
- policy decision;
- later observed outcome.

The proof is a durable object, not merely prose.

## 11. Confidence and Trust Score

Confidence is derived from evidence quality, not model self-confidence alone.

Inputs may include:
- data completeness;
- freshness;
- historical coverage;
- forecast error;
- source reliability;
- model agreement;
- scenario sensitivity.

Display categories can be user-friendly, while underlying factors remain inspectable.

## 12. Model Router

Models are selected by task profile:
- simple extraction/classification;
- summarization;
- reasoning/simulation explanation;
- vision;
- current-web research;
- coding/admin assistance where admitted.

Routing dimensions:
- quality;
- cost;
- latency;
- privacy;
- context size;
- modality;
- provider availability.

Provider is not canonical.

## 13. AI Cost Governor

Track by:
- tenant;
- user;
- feature;
- agent;
- provider;
- model;
- tokens/usage unit;
- cache/reuse;
- latency;
- estimated/actual cost.

Controls:
- budgets;
- routing downgrade;
- cache/reuse;
- deterministic preprocessing;
- context compression;
- feature limits;
- abuse detection.

SaaS margin after AI cost is a Super Admin metric.

## 14. Memory Tiers

### HOT
Current conversation/task and near-real-time operational context.

### WARM
Recent structured business history and active plans.

### COLD
Longer-term historical data accessed through governed queries.

### SEMANTIC
Documents/policies/manuals/non-transactional knowledge via retrieval.

Rules:
- structured financial/inventory facts stay in canonical stores;
- vector retrieval is context, not official numeric truth;
- memory always tenant-scoped;
- memory has retention/privacy rules;
- user corrections/feedback do not silently overwrite canonical business data.

## 15. Context compiler

Agent context should contain minimum sufficient authoritative data.

Priority:
1. task/actor/tenant;
2. applicable policy;
3. deterministic facts;
4. relevant recent history;
5. semantic documents only if needed;
6. external current sources only if needed.

Do not send entire tenant databases to models.

## 16. Business Twin

A simulation representation of the business.

Inputs may include:
- sales distributions;
- demand;
- recipe/cost structure;
- channel fees;
- staffing/capacity assumptions;
- stock;
- cash flows;
- obligations.

Twin output is scenario data, clearly separate from actual transactions.

Model assumptions/version must be preserved.

## 17. Merchant Genome

Learns establishment-specific patterns:
- demand by day/time;
- channel shifts;
- promotion response;
- product sensitivity;
- cost behavior;
- recurring operational bottlenecks.

Genome output is evidence for forecasts/recommendations, never authorization.

## 18. Decision Graph

Represents explainable relations:
- input cost → product cost → margin;
- channel mix → fees → net margin;
- stock → purchase need → cash effect.

Edges require provenance or model/rule identity.

A graph edge is not automatically causal proof.

## 19. Forecasting

Forecast objects preserve:
- target variable;
- horizon;
- training/history window;
- feature set;
- model/version;
- generated time;
- prediction interval/uncertainty;
- later actual outcome;
- error metric.

Forecasts must be backtestable.

## 20. Counterfactual and scenario analysis

Counterfactual output must be labeled estimate.

Examples:
- price change;
- promotion/no promotion;
- supplier switch;
- equipment purchase;
- marketing spend;
- delivery fee.

Scenario assumptions are explicit and stored.

## 21. Business Optimizer

Optimization requires:
- objective;
- constraints;
- allowed decision variables;
- hard policies;
- scenario assumptions.

Example objective:
maximize contribution margin subject to:
- minimum order volume;
- reserve floor;
- kitchen capacity;
- price-change limits.

Optimizer may propose, not silently execute material changes.

## 22. Recommendation lifecycle

States:
- DRAFT
- EVIDENCE_PENDING
- READY
- PRESENTED
- ACCEPTED
- MODIFIED
- REJECTED
- EXPIRED
- ACTION_PREPARED
- EXECUTED
- OUTCOME_PENDING
- OUTCOME_MEASURED

Expired recommendations cannot be executed without revalidation.

## 23. Action lifecycle

```text
proposal
→ authorization
→ policy evaluation
→ approval if required
→ precondition recheck
→ idempotency lock
→ execution
→ audit
→ result
```

State may change between recommendation and execution. Preconditions must be checked again.

## 24. Goodz Daily Brief

Brief is assembled from deterministic facts + prioritized insights.

It may include:
- prior-day revenue/result;
- cash/obligations;
- stock risk;
- channel anomalies;
- recommendations;
- reserve/free-capital estimate.

Each material statement links to its proof/fact basis.

## 25. Treasury Copilot

Order of reasoning:
1. current cash/liquidity;
2. near-term obligations;
3. taxes/provisions;
4. inventory/working capital;
5. configured reserve;
6. debt/cost of capital;
7. business reinvestment opportunities;
8. only then external-investment capital.

This prevents “profit” from being confused with freely investable cash.

## 26. Investment Research Agent

Read-only baseline.

May research:
- liquidity products;
- FX;
- equities;
- ETFs;
- crypto assets;
- staking/pools/DeFi where admitted;
- macro/current market context.

Every current claim requires fresh timestamped source evidence.

Research output includes:
- risk;
- liquidity;
- fees;
- concentration;
- downside;
- business-cash impact.

No guaranteed-return language.

## 27. Risk Agent

Risk dimensions:
- liquidity;
- volatility;
- market;
- counterparty;
- protocol/smart-contract;
- FX;
- concentration;
- operational cash impact.

Risk rules can hard-block a recommendation even if expected return appears attractive.

## 28. External research provenance

Record:
- source URL/provider;
- publication/market timestamp if available;
- retrieval timestamp;
- asset/entity;
- claim/fact extracted;
- staleness policy.

News/opinion must be distinguished from price/fundamental data.

## 29. Human approval

Material decisions remain attributable to a person/policy.

UI must clearly distinguish:
- AI suggestion;
- deterministic fact;
- forecast;
- user-approved action;
- automatically executed low-risk action.

## 30. AI audit record

Material invocation/action audit may record:
- tenant/user;
- feature/agent;
- model/provider/version;
- prompt/template version;
- tool calls;
- source references;
- policy result;
- approval;
- latency/cost;
- output hash/reference;
- result/outcome.

Sensitive prompt/content storage follows privacy retention policy.

## 31. Evaluation

Each major AI feature requires task-specific evaluation.

Metrics may include:
- factual correctness;
- numeric grounding;
- recommendation usefulness;
- false-alert rate;
- forecast error;
- policy violation rate;
- unsafe action rate;
- tool success;
- latency;
- cost;
- outcome value.

No feature is “good” solely because responses look fluent.

## 32. Recommendation Evaluation

Business-value metrics:
- accepted;
- applied;
- successful;
- savings;
- incremental margin/revenue;
- time saved;
- false positives;
- negative outcomes.

This powers the Goodz Learning Loop.

## 33. Learning Loop

Learning sources:
- outcome measurement;
- user feedback;
- accepted/rejected recommendations;
- experiment results;
- forecast errors.

Learning cannot bypass:
- Source Pack authority;
- tenant isolation;
- policy;
- evaluation gates.

Cross-tenant learning requires explicit privacy-preserving architecture.

## 34. Prompt/template governance

Prompts/templates are versioned artifacts.

Changes require:
- reason;
- test/evaluation;
- rollout scope;
- rollback path.

User content cannot silently rewrite system/policy constraints.

## 35. Prompt injection/tool safety

External documents/web content are untrusted.

Agent rules:
- treat retrieved instructions as data, not authority;
- tools require explicit permission;
- secrets not provided to untrusted context;
- no arbitrary command execution from retrieved text;
- high-risk tool output validated before action.

## 36. Tenant isolation

Every AI request/tool call carries tenant identity.

Forbidden:
- cross-tenant retrieval;
- shared raw memory;
- prompts containing other tenant data;
- aggregate benchmarks exposing identifiable competitor data.

## 37. Privacy

AI data use must respect:
- customer consent/legal basis where applicable;
- PII minimization;
- retention;
- deletion/anonymization workflows;
- model/provider data-handling configuration.

Provider contract/privacy review is required before production integration.

## 38. Failure handling

If AI provider unavailable:
- core POS/finance/inventory must continue;
- deterministic dashboards remain available;
- AI features degrade gracefully;
- queued noncritical AI work may retry;
- no canonical transaction is lost.

Goodz is not allowed to make the business unusable because an LLM is down.

## 39. Source Pack boundary

This document does not freeze:
- model brands;
- prompt text;
- vector DB physical choice;
- agent-process topology;
- SDKs;
- queue technology;
- numeric confidence thresholds.

Those are implementation/evaluation decisions.

## 40. Production gates for advanced AI

Experimental capabilities require:
1. Utility Gate
2. Assurance Gate
3. Validity/Stability Gate
4. Engineering ROI Gate

High-impact financial/autonomy capabilities additionally require:
- Security approval;
- policy coverage;
- adversarial evaluation;
- user-visible proof;
- rollback/disable path.

STOP CONDITION: `GMZ_AI_ARCHITECTURE_BASELINE_V0_1_DOCUMENTED`
