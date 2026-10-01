# GMZ-SP-005 — API/Integration Contracts + AI Architecture

Status: `ADMITTED / PLANNING_ONLY`  
Risk: `ELEVATED_PLANNING`  
Issue: `#13`

## Source Lock
Base: `main@c7f7c2a3081d9a3790fc51e1380f8c7df3038473`  
GEF: `1.1.1`

Mandatory sources:
- Project Overview
- Requirements APPROVED_V0.1
- Scope FROZEN_V0.1
- Architecture APPROVED_V0.1
- Data Model APPROVED_V0.1
- ADR-0001..ADR-0004
- current official iFood and 99Food developer documentation

## Objective
Freeze the first canonical application/integration contracts and Goodz AI architecture without introducing executable integration or model-provider code.

## WRITE_ALLOWED
- `docs/source-pack/API-INTEGRATION-CONTRACTS.md`
- `docs/source-pack/AI-ARCHITECTURE.md`
- this Work Order
- Context Lock
- Checkpoint
- evidence bundle
- Issue/PR metadata

## WRITE_FORBIDDEN
- runtime code
- provider SDK installation
- API credentials/secrets
- SQL/migrations
- CI/build workflows
- deploy implementation
- production webhook registration
- financial/investment execution

## Acceptance
- internal/external boundaries explicit;
- provider payloads do not become canonical domain contracts;
- idempotency/retry/dead-letter/auth/secrets/correlation defined;
- current iFood/99Food assumptions source-verified;
- AI truth/action/policy/proof boundaries explicit;
- tenant isolation and audit apply to AI;
- external market research freshness/provenance explicit;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_005_API_AI_CONTRACTS_READY_FOR_REVIEW`
