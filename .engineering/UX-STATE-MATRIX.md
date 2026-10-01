# Goodz Menu — UX State Matrix

Status: `BASELINE_V0.1 / REVIEW_PENDING`

Every material surface must consciously handle its applicable states.

| Surface | Loading | Empty | Success | Warning | Error | Offline | Permission | Dark/Light | Mobile |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cash | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Orders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Catalog | ✓ | ✓ | ✓ | ✓ | ✓ | partial | ✓ | ✓ | ✓ |
| Inventory | ✓ | ✓ | ✓ | ✓ | ✓ | partial | ✓ | ✓ | ✓ |
| Purchasing | ✓ | ✓ | ✓ | ✓ | ✓ | partial | ✓ | ✓ | ✓ |
| Finance | ✓ | ✓ | ✓ | ✓ | ✓ | restricted | ✓ | ✓ | ✓ |
| Owner Dashboard | ✓ | ✓ | n/a | ✓ | ✓ | degraded | ✓ | ✓ | ✓ |
| Goodz AI | ✓ | ✓ | ✓ | ✓ | ✓ | degraded | ✓ | ✓ | ✓ |
| Storefront | ✓ | ✓ | ✓ | ✓ | ✓ | degraded | n/a | ✓ | ✓ |
| Settings | ✓ | ✓ | ✓ | ✓ | ✓ | restricted | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | cached | ✓ | ✓ | ✓ |
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ | restricted | ✓ | ✓ | ✓ |

## State semantics

### partial
Some read-only/local behavior may work; authoritative mutation policy is domain-specific.

### restricted
Risk policy may prohibit action offline.

### degraded
Core UI remains understandable, but network/AI/provider-dependent features state their limitation.

### cached
Previously loaded data may be shown with freshness/sync indicator.

## Required visual-review pack

For each first implementation increment with UI, evidence should include the smallest applicable set of:
- desktop light;
- desktop dark;
- mobile light;
- mobile dark;
- loading;
- empty;
- representative success;
- representative error;
- permission denied;
- offline/pending sync where relevant.

## Feedback mapping

| Situation | Primary pattern |
|---|---|
| Field invalid | inline validation |
| Save succeeded | toast |
| Background export finished | notification + optional toast |
| Provider outage | persistent banner/notification |
| Destructive confirmation | confirm dialog |
| Critical platform incident | persistent high-priority notification |
| Offline transition | status indicator + toast |
| Sync conflict | persistent attention card/dialog |
| Permission denied | inline/page state + safe explanation |
| AI recommendation | RecommendationCard + ProofDrawer |
| AI action approval | ActionApprovalCard |

STOP CONDITION: `GMZ_UX_STATE_MATRIX_V0_1_DOCUMENTED`
