---
name: Goodz Fast Track Agent Task
about: Create a bounded task eligible for conflict-free multi-agent scheduling.
title: "[FT] "
labels: ["agent-ready"]
---

## Goal

Describe the exact change in one or two sentences.

## Scope and acceptance

Replace the example values below. Only trusted maintainers should apply the `agent-ready` label. Never mark auth, RLS, money, migrations or secrets as routine.

```goodz-agent
{
  "risk": "routine",
  "lane": "frontend",
  "priority": 3,
  "paths": [
    "src/components/goodz/example.tsx",
    "tests/unit/example.test.ts"
  ],
  "dependsOn": [],
  "acceptance": "Implement the bounded feature and prove it with a focused test."
}
```

## Exclusions

Anything outside the declared writable paths requires a separate scoped decision.
