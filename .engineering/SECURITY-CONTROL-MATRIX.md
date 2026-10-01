# Goodz Menu — Security Control Matrix

Status: BASELINE_V0.1 / REVIEW_PENDING

| Threat / control | Prevent | Detect | Recover | Proof |
|---|---|---|---|---|
| Cross-tenant access | membership + RLS + server authz | denial/security logs | revoke/contain | negative tenant tests |
| Privilege escalation | RBAC + Admin Guard + MFA | audit events | revoke roles/sessions | role boundary tests |
| IDOR/BOLA | resource-scope authz | denial anomalies | contain | foreign-ID tests |
| Secret exposure | server-only secrets | secret/log scanning | rotate/revoke | secret gates |
| Webhook spoofing | signature/token/replay controls | verification failures | disable/rekey/reconcile | invalid/replay tests |
| Duplicate financial/order event | idempotency + state guards | reconciliation | reversal/reconcile | duplicate delivery tests |
| Offline tampering | bounded local authority | conflict/rejection | reject/reconcile | tampered sync tests |
| Unsafe Super Admin action | Admin Guard + stronger auth | platform audit | rollback where possible | privileged-action tests |
| Support abuse | time/role/reason limits | support audit | terminate/revoke | expiration tests |
| XSS/content injection | encoding/sanitization | security monitoring | remove/revoke | injection tests |
| SSRF | outbound target policy | denied-target logs | disable tool | private-range tests |
| SQL injection | parameterization | DB/security signals | patch/rotate | injection tests |
| AI prompt injection | untrusted-content boundary + tool auth | policy denials | abort/revoke | adversarial AI tests |
| AI cross-tenant leakage | context/retrieval scope | evaluation/audit | disable/revoke | multi-tenant AI tests |
| PII overexposure | minimization + role scope | access audit | revoke/anonymize | privacy tests |
| Deletion error | governed lifecycle | audit | restore/correct | delete/anonymize tests |
| Supply-chain compromise | pin/lock/scan | SCA alerts | upgrade/remove | dependency gates |
| Session theft | secure session + MFA | auth anomalies | revoke | session/MFA tests |
| Provider outage | adapters + queues | health/lag | retry/reconcile | degraded-mode tests |

## High-risk action classes

Evaluate stronger authentication and explicit approval for:
- tenant ownership transfer;
- platform-role change;
- tenant suspension/deletion;
- bulk sensitive export;
- billing/entitlement override;
- privileged support mode;
- mass session revocation;
- destructive financial correction;
- future external-money movement.

## Implementation security evidence

Security-sensitive implementation PRs must identify:
- affected requirements;
- threat/control mapping;
- negative tests;
- exact-head security checks;
- CRITICAL/HIGH inventory;
- secret/key inventory impact;
- tenant-boundary impact;
- rollback/recovery note.

STOP CONDITION: GMZ_SECURITY_CONTROL_MATRIX_V0_1_DOCUMENTED
