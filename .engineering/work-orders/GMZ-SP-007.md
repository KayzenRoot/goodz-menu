# GMZ-SP-007 — Security, Privacy, RLS & Admin Guard Baseline

Status: APPROVED / READY_FOR_PROMOTION
Risk: HIGH_PLANNING_ASSURANCE
Issue: #21

## Source Lock
Base: main@4d65a8ea4e352620a2e06f5c6bdb109785334edb
GEF: 1.1.1

Mandatory sources:
- Requirements APPROVED_V0.1
- Scope FROZEN_V0.1
- Architecture APPROVED_V0.1
- Data Model APPROVED_V0.1_CORRECTED
- API/Integration Contracts APPROVED_V0.1
- AI Architecture APPROVED_V0.1
- UI/UX Design System APPROVED_V0.1
- current official Supabase RLS/Auth/MFA/API-key documentation

## Objective
Freeze the security/privacy baseline and fail-closed control model before executable schema/auth/admin implementation.

## WRITE_ALLOWED
- docs/source-pack/SECURITY.md
- .engineering/SECURITY-CONTROL-MATRIX.md
- this Work Order
- Context Lock
- Checkpoint
- Evidence Bundle
- Issue/PR metadata

## WRITE_FORBIDDEN
- RLS SQL
- migrations/schema implementation
- auth/session implementation
- credentials/secrets
- runtime/application code
- dependency changes
- CI/build/deployment implementation
- production security configuration

## Acceptance
- tenant isolation and platform/tenant admin boundaries explicit;
- RLS/auth/session/MFA/key handling explicit;
- high-impact admin controls explicit;
- secrets/logging/webhook/offline/AI tool security explicit;
- privacy/LGPD lifecycle explicit;
- fail-closed behavior and security tests required;
- current Supabase assumptions source-verified;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: GMZ_SP_007_SECURITY_BASELINE_READY_FOR_REVIEW


## Audit disposition
- required Security coverage topics: PASS.
- tenant isolation/RLS/authz boundaries: PASS.
- session/MFA/Admin Guard/support mode: PASS.
- secret/key/webhook/offline controls: PASS.
- audit/log-redaction/LGPD/privacy lifecycle: PASS.
- prompt-injection/AI tool security: PASS.
- mandatory negative/security tests: PASS.
- current Supabase guidance revalidated 2026-10-01.
- RLS SQL/migrations/runtime/auth implementation: NONE.
- CRITICAL/HIGH: 0 / 0.
- Disposition: APPROVED_FOR_PLANNING_PROMOTION.
