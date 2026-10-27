# Proposed Checkpoint Delta — GMZ-REBOOT-001

**State: `PROPOSED / NOT APPLIED / NOT ELIGIBLE`**

Source checkpoint: `.engineering/CHECKPOINT.json` at `77b8b2a7dc88d1d97f01e5889f8bf5d2d40a95e8`.

The approved checkpoint remains unchanged. On published evidence/workflow HEAD `6c6e074`, app-foundation CI and both Socket checks passed. Sonar still fails at Security Rating `B`; the two local/test S5332 risks have scoped maintainer acceptance, but this does not change Sonar's status or pass the Quality Gate. The candidate remains not eligible for checkpoint promotion while Docker/Supabase and seed/reset acceptance, the user-requested human accessibility review, and the final objective audit remain incomplete. This proposal does not authorize checkpoint promotion, merge, or a new implementation increment.

If a later exact-HEAD objective audit approves the foundation and the governed merge/promotion gates are separately satisfied, propose this transition:

1. Keep the existing `52/515` as historical credit for the superseded `GMZ-IMPL-007` implementation only.
2. Establish the reboot implementation's progress baseline as `0/515`; do not transfer legacy credit to the new code.
3. Start `GMZ-M01 — Platform Core & Multi-Tenancy` only under its own Work Order after the foundation audit and checkpoint transition are accepted.

No canonical checkpoint file was edited to create this proposal.

## Maintainer risk disposition addendum — 2026-10-27

The two local S5332 findings have a scoped maintainer risk acceptance recorded in [`SONAR-RISK-DISPOSITION.md`](SONAR-RISK-DISPOSITION.md) and [PR #74 comment #6431020903](https://github.com/KayzenRoot/goodz-menu/pull/74#issuecomment-6431020903). Sonar still reports Security `B`; this decision does not override the Quality Gate. The proposed checkpoint transition remains `NOT ELIGIBLE` while the runtime, human review, exact-head, and objective-audit gates remain open.

## Current gate snapshot — 2026-10-27 18:39 UTC

The current code candidate is 7b9cc0f2e8b1c3f41b783dea47b190f80dc9c96a. App-foundation workflow 40560458468 and both Socket checks pass; Sonar remains failed at Security Rating B (required A). Its exact-head manifest artifact is recorded by ID/digest in LOCAL-VALIDATION.md; the ZIP's internal manifest was not parsed in this receipt.

The local Docker/Supabase lifecycle and reset remain NOT ACCEPTED. The current Docker Desktop settings file has no portBindingBehavior, and the earlier live stack used wildcard host bindings. The code candidate contains a fail-closed guard, but Docker Desktop remains stopped until localhost-only binding is configured. The current free RAM is 7.48 GiB with Chrome left open; this does not remove the configuration/security gate. Human visual/accessibility sign-off and final objective audit remain pending. The checkpoint stays PROPOSED / NOT APPLIED / NOT ELIGIBLE; no merge, deploy, promotion, or GMZ-M01 work is claimed.
