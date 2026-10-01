# Goodz Menu — Security & Privacy

Status: BASELINE_V0.1 / REVIEW_PENDING
Authority domain: SECURITY

## 1. Security mission

Security is a product-correctness requirement because Goodz handles operational, financial, customer, employee, SaaS and AI-related data.

Primary goals:
- preserve tenant isolation;
- prevent unauthorized money, stock and admin actions;
- protect credentials and PII;
- preserve auditable history;
- fail closed on ambiguous authorization;
- minimize privileged blast radius.

## 2. Trust boundaries

Security design distinguishes:
1. public storefront/browser;
2. authenticated tenant user;
3. privileged tenant user;
4. Platform/Super Admin;
5. server application;
6. database/Auth platform;
7. workers/queues;
8. external providers;
9. AI/model providers;
10. local/offline POS state;
11. observability/support systems.

Crossing a boundary requires an explicit authentication, authorization and data-handling contract.

## 3. Authentication is not authorization

Being logged in never grants tenant data access by itself.

Every protected action resolves:
- actor identity;
- active tenant membership;
- organization;
- establishment/branch scope where applicable;
- role/permission;
- target resource ownership;
- policy state;
- stronger authentication when required.

## 4. Supabase RLS baseline

Current official Supabase documentation was revalidated on 2026-10-01.

Goodz rules:
- RLS is mandatory on tables in exposed schemas when client/Data API access is possible.
- The authenticated role alone is not tenant authorization.
- Policies require membership/ownership/resource predicates.
- UPDATE policy design must account for both visible existing rows and allowed resulting state.
- UPDATE also requires compatible SELECT visibility.
- Views over protected data must preserve intended RLS behavior, such as security-invoker semantics where appropriate, or remain outside exposed access.
- bypass-RLS/service credentials are privileged server-only capabilities.

No physical RLS SQL is frozen in this planning document.

## 5. Authorization metadata

User-editable metadata is forbidden as an authorization authority.

Current Supabase guidance distinguishes user metadata, which users can modify, from application metadata controlled by trusted server-side flows.

Even trusted JWT claims can become stale before token refresh. High-risk authorization must account for revocation/freshness requirements.

## 6. Membership source of truth

Goodz tenant membership and roles are canonical authorization data.

JWT/application metadata may accelerate low-risk authorization only when its freshness model is appropriate.

High-risk actions may require fresh server-side membership and session checks.

## 7. Sessions

Required capabilities:
- session revocation;
- safe session inventory where appropriate;
- secure token/cookie handling;
- logout and device/session removal;
- reauthentication for high-impact actions;
- bounded risk window for privileged sessions.

Exact expiration values are deferred to implementation and tests.

## 8. MFA and assurance level

MFA must be supported and strongly enforced for Platform Owner/Admin roles and selected high-risk tenant operations.

Current Supabase Auth supports MFA assurance levels, including AAL2-style enforcement patterns.

Security implementation must explicitly define which actions require stronger assurance.

## 9. Authority planes

Platform roles and tenant roles are separate:
- Platform Owner;
- Platform Admin;
- Platform Security/Billing/Support/Operations;
- Tenant Owner;
- Tenant Admin;
- Tenant staff roles.

No tenant role implies platform authority.

Support authority does not automatically permit financial mutation.

## 10. Goodz Admin Guard

High-impact administrative actions can require:
- explicit target;
- impact preview;
- reason;
- reauthentication;
- MFA;
- additional confirmation;
- temporary privilege;
- audit event;
- rollback/reversal path when possible;
- future dual approval for extreme actions.

Examples include tenant suspension, ownership transfer, entitlement overrides, privileged support access, large exports and deletion/anonymization operations.

## 11. Support mode

Support mode must be:
- explicitly initiated;
- reason-bound;
- time-limited;
- role-limited;
- visible;
- audited;
- revocable.

It must not reveal passwords/secrets or silently grant high-risk mutation capability.

Invisible impersonation is prohibited.

## 12. Secrets and keys

Secrets never appear in:
- browser bundles;
- client-visible environment variables;
- logs;
- error toasts;
- screenshots/evidence;
- issues/PRs;
- repository history.

Supabase service-role/secret keys are server-only.

External credentials are stored behind an approved secret-management boundary and referenced indirectly.

## 13. Least privilege

Use the narrowest provider/database/application privilege needed.

A credential that bypasses tenant or RLS protection receives a high security classification and minimal runtime exposure.

Rotation/revocation procedures are required before production.

## 14. Database privilege

Privileged functions/roles do not bypass application authorization by convenience.

If privileged database code is needed later:
- explicit authorization is required;
- search path is controlled;
- execution grants are restricted;
- exposed schema placement is reviewed;
- security tests/advisor checks are mandatory.

## 15. Tenant isolation invariant

No tenant-controlled request may read, mutate, infer or enumerate another tenant's protected data.

Release-blocking negative tests must cover:
- direct ID substitution;
- branch/establishment substitution;
- nested relationship access;
- reports/exports;
- realtime/subscriptions;
- media/storage;
- AI retrieval/tools;
- jobs/background tasks.

## 16. IDOR/BOLA

Opaque identifiers do not replace authorization.

Every resource access checks the tenant/resource boundary regardless of identifier predictability.

## 17. Financial action security

Material money actions require:
- authorized role;
- tenant/resource validation;
- idempotency;
- amount/currency checks;
- current-state preconditions;
- audit;
- correction/reversal semantics;
- stronger approval above governed thresholds.

UI hiding is never a security control.

## 18. Inventory action security

Large adjustments, loss, count reconciliation and similar stock actions may require explicit reason, permission, audit and threshold-based approval.

## 19. Offline POS security

Offline capability cannot expand authority.

Local operations carry:
- actor;
- tenant/branch;
- stable operation ID;
- timestamp;
- authorization/policy context;
- later reconciliation result.

High-risk actions may be disallowed offline.

## 20. Offline tamper resistance

The server does not blindly trust reconnect data.

Sync revalidates:
- operation identity;
- tenant;
- permissions;
- product/pricing policy;
- replay/duplicate status;
- impossible state transitions.

Rejected/conflicting actions remain visible.

## 21. Webhook authenticity and replay

Use the strongest provider-supported authenticity controls:
- signature/token;
- timestamp/replay window;
- environment/account binding;
- canonical-body rules;
- idempotency.

Authenticity and idempotency are separate requirements.

Duplicate delivery must not double-charge, duplicate orders or consume stock twice.

## 22. Integration blast radius

Integration credentials and permissions are scoped per tenant/provider/capability where possible.

Compromise of one provider connection must not expose unrelated credentials.

## 23. Input validation

Server-side validation applies to:
- browser/API input;
- storefront;
- imports;
- webhooks;
- provider responses;
- AI/tool output;
- uploaded files/metadata;
- support/admin forms.

Client validation is UX, not security.

## 24. Injection defenses

Tenant/customer/provider content is untrusted.

No arbitrary script execution is allowed in standard SaaS storefront customization.

Database access uses safe parameterization/query contracts.

AI-generated SQL is not executed directly in production user context.

## 25. File/media security

Media flows validate:
- ownership;
- type;
- size;
- access class;
- upload authorization;
- provider reference.

Private receipts/documents remain separate from public product imagery.

Arbitrary document upload requires risk assessment and malware scanning before broad production use.

## 26. Logs and redaction

Logs may contain safe IDs, correlation IDs, module/route and timing.

Logs redact:
- passwords;
- secrets;
- tokens;
- authorization headers;
- sensitive payment data;
- unnecessary PII;
- private AI content unless separately governed.

## 27. Safe errors

User errors show:
- understandable explanation;
- impact;
- next action;
- safe code;
- correlation ID.

Never expose raw stack traces, SQL, connection strings, tokens or provider secrets.

## 28. Audit trail

Material events include:
- role/permission changes;
- price/discount/cancellation changes;
- stock adjustments;
- cash/finance operations;
- tenant suspension;
- billing/entitlement override;
- support sessions;
- AI-authorized actions;
- sensitive export/delete;
- security-setting changes.

Ordinary users cannot rewrite audit history.

## 29. Data classification

At minimum distinguish:
- public business data;
- operational internal data;
- financial data;
- customer PII;
- employee/user PII;
- secrets/credentials;
- security telemetry;
- AI conversation/recommendation data;
- payment references;
- legal/fiscal documents.

Controls and retention follow classification.

## 30. Data minimization and LGPD readiness

Collect only data required by product purpose, legal obligation, security or an admitted feature.

Architecture supports:
- transparent purpose;
- consent where appropriate;
- opt-out;
- access/export;
- correction;
- deletion/anonymization where legally allowed;
- retention policy;
- incident/breach handling.

Software does not replace jurisdiction-specific legal advice.

## 31. Deletion and anonymization

Privacy deletion must preserve financial/legal/audit history where required while removing or pseudonymizing unnecessary identity data.

Do not corrupt ledgers to satisfy deletion.

## 32. Marketing consent

Marketing preference tracks channel, purpose, source, timestamp and opt-out/suppression state.

Transactional communication is not automatically marketing consent.

## 33. AI provider security

Before production, every AI provider requires review of:
- retention;
- training usage;
- region;
- encryption;
- subprocessors;
- deletion;
- enterprise/privacy controls.

Provider routing must respect data sensitivity.

## 34. Prompt injection and AI tool security

Retrieved web/doc content is untrusted data.

It cannot:
- grant tool permission;
- override system/security rules;
- switch tenant;
- request secrets;
- authorize actions.

Tools enforce server-side capability, tenant, schema, risk, approval and audit.

## 35. AI exfiltration defense

Context is minimized.

Cross-tenant retrieval/memory is prohibited.

Public research workflows cannot send internal sensitive business data to public sources unless explicitly designed and approved.

## 36. Investment research security

Investment research is read-only in the baseline.

Private broker/exchange trading credentials are not required.

Future trading credentials or execution require a separate high-risk Security architecture and explicit Work Order.

## 37. Super Admin visibility

Super Admin defaults to aggregate/platform operational metadata.

Platform ownership does not automatically mean unrestricted access to tenant business content.

Tenant-content access uses explicit controlled support mode.

## 38. Rate limiting and abuse

Implementation must define controls for login, recovery, storefront/checkout, invites, exports, AI endpoints, webhooks and privileged admin operations.

Exact thresholds are evidence-driven.

## 39. CSRF, XSS and SSRF

Cookie/session mutation flows use appropriate CSRF/origin protection.

Rich content is safely encoded/sanitized, with CSP evaluated before production.

Server-side URL fetchers, importers and research tools must block localhost, metadata endpoints and private/internal network targets unless an explicitly safe use exists.

## 40. Supply chain

Implementation requires:
- pinned dependency versions;
- lockfiles;
- vulnerability scanning;
- review of risky install scripts;
- controlled upgrades.

## 41. Environment separation

Development, test, staging and production credentials/data are isolated.

The local Supabase stack is never exposed publicly and production data is not casually copied into development.

## 42. Backup and recovery security

Backups inherit data classification and need restricted access, encryption, retention and restoration tests.

## 43. Incident response

Security incidents track severity, detection, affected tenants/data, containment, credential/session revocation, recovery, legal/notification assessment and post-incident actions.

## 44. Security monitoring

Monitor suspicious authentication, privilege escalation, platform-admin actions, cross-tenant denial spikes, integration auth failures, webhook verification failures, excessive refunds/cancellations and unusual AI/tool activity.

Anomaly is not an accusation.

## 45. Mandatory security tests

Required families:
- cross-tenant denial;
- role/permission denial;
- RLS policies;
- INSERT/UPDATE ownership;
- admin-plane separation;
- MFA/reauth flows;
- session revocation;
- webhook auth/replay;
- idempotency;
- offline replay/conflict;
- secret/log redaction;
- AI prompt-injection/tool authorization;
- support-mode bounds;
- privacy export/delete authorization.

## 46. Supabase advisors

When schema/auth implementation starts, run applicable current Supabase security/database advisors and govern findings before acceptance.

Advisors supplement, not replace, Goodz tests.

## 47. Fail-closed rule

Unknown or ambiguous tenant ownership, authorization, policy or security evidence means deny/block.

Provider degradation never justifies bypassing security.

## 48. Severity gate

Unresolved CRITICAL or HIGH security defects block affected promotion/release.

Risk acceptance, if ever needed, is explicit and cannot be represented as a fix.

## 49. Current source verification

Official Supabase documentation revalidated on 2026-10-01:
- Row Level Security;
- Auth/MFA/session concepts;
- key/secret handling;
- local development security.

Security-sensitive implementation must revalidate current docs/version behavior.

## 50. Deferred physical choices

Not frozen here:
- exact RLS SQL;
- JWT/session durations;
- exact cookie/session framework;
- CSP directives;
- secret-manager vendor;
- WAF/SIEM vendor;
- numeric rate limits;
- exact MFA enrollment UX.

These require implementation evidence.

STOP CONDITION: GMZ_SECURITY_BASELINE_V0_1_DOCUMENTED
