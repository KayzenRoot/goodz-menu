# Goodz Menu — Environment Matrix

Status: `FROZEN_CANDIDATE_V0.1 / REVIEW_PENDING`

| Concern | LOCAL_DEV | CI_TEST | PREVIEW/STAGING | PRODUCTION |
|---|---|---|---|---|
| Application | local process/container | ephemeral build/test | isolated deployed build | accepted release |
| Database | local Supabase/Postgres | ephemeral/local service | isolated remote | production remote |
| Auth | local test users | synthetic | isolated users | real users |
| Data | synthetic dev seed | fixtures | synthetic/staging | real tenant data |
| Secrets | local non-prod | CI secrets | staging secrets | prod secrets |
| iFood/99Food | mocks/sandbox | mocks/contracts | sandbox if available | live |
| Payments | mock/sandbox | mock/contracts | sandbox | live |
| WhatsApp/E-mail | local capture/mock | mock | sandbox/test | live |
| AI | fake/low-cost/test provider allowed | deterministic fakes + selected live eval | restricted live | governed live |
| Market data | fixture/mock | fixtures | restricted live | live current data |
| Media | fixtures/local/test namespace | fixtures | isolated namespace | production namespace |
| Observability | verbose local | test artifacts | staging | production |
| PII | synthetic only | synthetic only | synthetic/minimized | allowed per policy |
| Destructive testing | local allowed by command | ephemeral allowed | controlled | prohibited unless explicit incident/change |
| Public exposure | localhost only | runner-internal | controlled | yes |
| Backups | not production | no | optional | required by production plan |

## Hard boundaries

1. Production secret cannot be required for LOCAL_DEV.
2. Production PII cannot be normal seed data.
3. LOCAL_DEV never silently falls back to production endpoints.
4. CI tests cannot mutate production.
5. Provider mode is explicit.
6. Production deploy identity is traceable to accepted source.
7. AI/provider costs must be separated by environment when practical.

## Environment naming

Runtime configuration must carry an explicit environment identifier. Inferring production merely from hostname is insufficient for privileged behavior.

STOP CONDITION: `GMZ_ENVIRONMENT_MATRIX_V0_1_READY_FOR_REVIEW`
