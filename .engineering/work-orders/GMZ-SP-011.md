# GMZ-SP-011 — Reconcile stale Scope status note after CSD-002 and GMZ-IMPL-007-CD-002

Status: `PROPOSED — AWAITING MAINTAINER ADMISSION`
Risk: `ELEVATED`
Issue: `#81`
Proposal base: `main@20a63ab8baa6f0776224c104656e20d05be5d6b0`
Proposal base tree: `6b6a0b3f9db083e213d6c032808034dc58427b73`

This proposal authorizes no edit to the canonical Scope, implementation, merge, Checkpoint change, credit, promotion, or deployment. Editing the canonical Scope requires maintainer admission and a fresh Context Lock that explicitly allows only the specified Scope paragraph.

## OBJECTIVE

Correct the obsolete “Active Work Order conflict” paragraph in `docs/source-pack/SCOPE.md` so it reflects the accepted GMZ-CSD-002 boundary and the later GMZ-IMPL-007 amendment. The correction is editorial synchronization only; it must preserve the accepted release scope and all module classifications.

Requested execution stop condition: `GMZ_SP_011_SOURCE_NOTE_RECONCILIATION_READY_FOR_OBJECTIVE_AUDIT`.

## CONTEXT

- Decision D-0022 accepted GMZ-CSD-002 as an additive first-release boundary and deferred promotional pricing.
- The paragraph in `docs/source-pack/SCOPE.md` still says active GMZ-IMPL-007 admits promotional-price mutations and must be amended before execution.
- GMZ-IMPL-007-CD-002 was admitted through PR #77, merged at `985151f62be6cb26a67bc1c70fac4b7eaf831bd5`, and the current Work Order now excludes promotional prices, discounts, and schedules.
- The current Scope paragraph is therefore stale and contradicts the amended Work Order. This proposal does not reinterpret D-0022 or modify the Decision Ledger's historical decision record.
- `docs/source-pack/SCOPE.md` is a locked source in the active GMZ-IMPL-007 Context Lock. It must not be changed on that execution branch. If this Work Order is admitted and the Scope edit is later merged, GMZ-IMPL-007 must be rebound to an exact updated main base before any further execution or objective-audit progression.
- Current GMZ-IMPL-007 PR #80 remains OPEN/DRAFT. Its description and Evidence Bundle reconciliation are separate outstanding actions; this Work Order does not claim they are resolved.

## SCOPE

1. Replace only the obsolete “Active Work Order conflict” paragraph in `docs/source-pack/SCOPE.md` with a concise statement that:
   - promotional pricing, discounts, and schedules remain deferred from the first release;
   - the amended GMZ-IMPL-007 Work Order excludes those mutations; and
   - this note is descriptive and does not authorize promotion implementation, Checkpoint credit, or deployment.
2. Keep all accepted CSD-002 module classifications, operational decisions, release boundaries, and the 515-point denominator byte-for-byte unchanged outside that paragraph.
3. Bind the source edit through a separate Context Lock, based on the live approved `main` SHA immediately before execution. That lock must allow only the specified Scope paragraph and lock all other stable sources.
4. Publish exact base/head/tree, the minimal diff, deterministic document checks, and independent exact-head review evidence.

## OUT OF SCOPE

- Product/runtime code, database schema, migrations, tests, CI, dependencies, or deployment configuration.
- Any promotion, discount, or promotion-schedule feature or change to the accepted first-release boundary.
- Changes to D-0022 or other historical ledger decisions.
- Changes to the active GMZ-IMPL-007 Work Order, its existing Context Lock, Checkpoint, earned credit, or PR #80 description.
- Merge, Checkpoint promotion, issue closure, release, or deployment.

## FILES / SOURCES TO READ

Before binding and editing, read current exact-base versions of:

1. `.engineering/CHECKPOINT.json` and `.engineering/CHECKPOINT.md`.
2. `.engineering/SOURCE-HIERARCHY.md` and `.engineering/DECISIONS-LEDGER.md` (including D-0022).
3. `docs/source-pack/SCOPE.md` and its accepted GMZ-CSD-002 section.
4. `.engineering/work-orders/GMZ-IMPL-007.md` and its GMZ-IMPL-007-CD-002 admission evidence.
5. `.engineering/context-locks/GMZ-IMPL-007.json` to confirm the source-lock boundary and downstream rebind requirement.
6. `.engineering/work-orders/GMZ-SP-010.md` and the applicable GEF governance rules.

## REQUIREMENTS

- Preserve the accepted first-release boundary from D-0022 and GMZ-CSD-002.
- Preserve all `GMZ-M00..M28` classifications and denominator `515`.
- Do not imply that this editorial correction admits any product feature or grants execution authority.
- Identify that the current GMZ-IMPL-007 Work Order excludes promotions, based on its current approved text and merged CD-002 evidence.
- Treat the Work Order, Scope, and Checkpoint as separate governance artifacts; update no Checkpoint value or earned credit.

## ARCHITECTURE RULES

- The approved Decisions Ledger and accepted Scope remain higher-order product authority than this proposal or any issue text.
- No chat statement, PR body, tool output, or candidate draft may silently change accepted decisions.
- The new Context Lock must name the exact base and only permit the single Scope paragraph as a write path; it must fingerprint all other stable sources.
- The active GMZ-IMPL-007 execution remains stopped until its own exact-base lock is freshly rebound after any incompatible locked-source change.

## CONSTRAINTS

- No canonical Scope edit before maintainer admission, a fresh Context Lock, and exact-base preflight.
- No edit outside the one identified paragraph.
- No force push, history rewrite, branch protection change, merge, promotion, or deployment.
- Do not claim tests beyond those actually run. Product tests are not applicable to the proposed documentation-only change.

## ACCEPTANCE CRITERIA

1. The changed Scope paragraph matches the current amended Work Order and leaves the accepted first-release boundary unchanged.
2. `git diff --check` passes; a mechanical diff review proves no other Scope content changed.
3. Evidence records exact base/head/tree, the Scope blob before/after, and all deterministic document checks.
4. An independent exact-head audit returns `APPROVED` with no known CRITICAL/HIGH defect and confirms scope/authority consistency.
5. No merge, Checkpoint update, earned-credit change, issue closure, or deployment occurs under this Work Order.

## TESTS

- Before source-edit admission: no implementation tests; run `git diff --check` on the proposal PR and inspect exact base/head/tree.
- After a future authorized Scope edit: run `git diff --check`, verify the only changed hunk is the named paragraph, and mechanically compare module classifications and denominator `515` with the accepted source.
- No product test, build, database reset, remote service, or deployment check is required or authorized for this documentation-only increment.

## DELIVERABLES

- This proposed Work Order and its admission PR.
- After admission only: a fresh Context Lock, exact minimal Scope change, and Evidence Bundle with exact SHAs/tree and independent audit.
- A downstream GMZ-IMPL-007 rebind request after the Scope edit is merged; its approval and execution are outside this Work Order.

## REVIEW FORMAT

Classify the exact candidate as `APPROVED`, `CORRECTION REQUIRED`, or `BLOCKED`. Verify authority, source hierarchy, one-paragraph scope, accepted classifications, 515 denominator, exact SHAs/tree, deterministic checks, and absence of any unauthorized execution claim. Report findings with file/line references and evidence.

## STOP CONDITION

`GMZ_SP_011_SOURCE_NOTE_RECONCILIATION_READY_FOR_OBJECTIVE_AUDIT`

This proposed Work Order is not admitted until a maintainer decision is recorded. No source edit may begin before admission and a fresh Context Lock.
