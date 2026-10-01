# Goodz Menu — Requirement Traceability

Status: `APPROVED_V0.1`

This matrix binds requirement families to canonical module owners. Detailed one-to-many dependencies will be refined in Architecture.

| Requirement family | Primary modules |
|---|---|
| PLAT | GMZ-M01, M02, M03, M22 |
| UX | GMZ-M04, M11, M26 |
| POS | GMZ-M05, M10, M13 |
| CAT | GMZ-M06, M11 |
| REC | GMZ-M07 |
| INV | GMZ-M08 |
| PUR | GMZ-M09 |
| ORD | GMZ-M10, M24 |
| WEB | GMZ-M11 |
| DEL | GMZ-M12 |
| FIN | GMZ-M13 |
| TRE | GMZ-M14 |
| CRM/MKT | GMZ-M15, M16 |
| ANA | GMZ-M17 |
| AI | GMZ-M18, M19, M20 |
| INVEST | GMZ-M21, M14 |
| SAAS | GMZ-M22, M28 |
| SEC | GMZ-M02, M23, M27 |
| OBS | GMZ-M23 |
| RUN | GMZ-M25 |
| QA | GMZ-M26 |
| GOV | GMZ-M00 |

## Coverage invariant
Every requirement in `docs/source-pack/REQUIREMENTS.md` must belong to a listed family and therefore have at least one canonical module owner.

## Later traceability
Architecture must extend this into:
`Requirement → Module → Component/Contract → Test/Evidence → Work Order`.

STOP CONDITION: `GMZ_REQUIREMENT_TRACEABILITY_V0_1_DOCUMENTED`
