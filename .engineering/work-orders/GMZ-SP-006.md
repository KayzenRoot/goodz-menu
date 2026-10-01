# GMZ-SP-006 — UI/UX Design System + Feedback/Motion/Notifications

Status: `ADMITTED / PLANNING_ONLY`  
Risk: `ELEVATED_PLANNING`  
Issue: `#19`

## Source Lock
Base: `main@fa78e7495921d5814304029ac4b119300b16f6ab`  
GEF: `1.1.1`

Mandatory sources:
- Project Overview
- Requirements APPROVED_V0.1
- Scope FROZEN_V0.1
- Architecture APPROVED_V0.1
- Data Model APPROVED_V0.1_CORRECTED
- API/Integration Contracts APPROVED_V0.1
- AI Architecture APPROVED_V0.1
- current Checkpoint

## Objective
Freeze the Goodz Menu visual/interaction system as a product contract before frontend implementation.

## WRITE_ALLOWED
- `docs/source-pack/UI-UX-DESIGN-SYSTEM.md`
- `.engineering/UX-STATE-MATRIX.md`
- this Work Order
- Context Lock
- Checkpoint
- Evidence Bundle
- Issue/PR metadata

## WRITE_FORBIDDEN
- frontend/runtime code
- CSS/Tailwind config
- component-library installation
- images/assets
- design-tool exports
- package manifests
- CI/build/deployment implementation
- secrets
- `.gef/**`

## Acceptance
- light/dark contracts explicit;
- glass/depth usage bounded;
- design tokens and component taxonomy documented;
- motion, reduced motion and performance rules documented;
- toast/error/loading/confirmation patterns documented;
- notification center and settings UX documented;
- POS/Owner/Storefront/Super Admin shells differentiated;
- responsive/accessibility/focus/input rules explicit;
- visual-review and screenshot regression obligations explicit;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_006_UI_UX_DESIGN_SYSTEM_READY_FOR_REVIEW`
