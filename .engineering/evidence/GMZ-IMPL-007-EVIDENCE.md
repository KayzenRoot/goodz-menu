# GMZ-IMPL-007 — Evidence Bundle

Status: `ELEVATED VALIDATION COMPLETE AT EXACT HEAD; READY FOR OBJECTIVE AUDIT`

## Binding

- Repository: `KayzenRoot/goodz-menu`
- Issue: `#67`; PR: `#69` (open, draft, unmerged, base `main`)
- Branch: `execution/gmz-impl-007-catalog-core`
- Execution base: `1b64fbfbef3d31d215f4a2a1e30e88f8f946860c`
- Governance HEAD that authorized execution: `b8d4c0ba4022907832e81c2ed5c40accf123e4b9`
- Context Lock: `BOUND_FOR_EXECUTION`; locked source fingerprints re-verified at closeout: `16 / 16 MATCH`
- Assurance: `ELEVATED`; merge authority: `NO`
- `.gef`: product version `1.1.1`, `APPLIED` (`run-1-20a68d43599d`), zero `.gef` paths changed relative to the execution base
- Production credit: unchanged at `52 / 515 = 10.10%`

## Candidate identity

- Implementation commits on the branch, oldest first:
  `81cf915`, `b989169`, `8813ec2`, `73ca70c`, `17f6ef0`, `b519318`, `b8d4c0b` (governance bind), then
  `89bd7ab` (schema, RLS, server contracts), `cbeac4e` (typed application contracts),
  `cabc007` (privileged actions, receipted idempotency), `03eb19e` (console, admitted-scope read),
  `eadadb8` (proof suites, scope containment).
- Closeout commit: this bundle, the Work Order closeout and the CHECKPOINT proposal. It changes
  governance/evidence text only; the implementation source of record is the head named in the PR.
- Full branch delta against the execution base: `31` files, `8605` insertions, `82` deletions.

## What was built

- **Schema** (`supabase/migrations/20261005090000_catalog_core_schema.sql`): `product_categories`,
  `products`, `product_variants`, `sales_channels`, `channel_offers`, and an immutable
  `channel_offer_price_history` exposed read-only through the `channel_offer_price_timeline` view.
  Money is `numeric(19,4)` and travels as an exact decimal string; there is no binary floating point
  anywhere on the money path.
- **Authorization** (`20261005090100_catalog_authorization.sql`): tenant-aware RLS on every catalog
  table, direct-client mutation denied, `SECURITY DEFINER` contracts with `SET search_path = ''`
  granted EXECUTE to `authenticated` only, actor read from the caller's JWT, no service-role path.
- **Contracts** (`20261005090200_catalog_contracts.sql`): catalog commands, `catalog_require_step_up()`
  as the two-layer strong-auth check, and receipt-based idempotency.
- **Application layer** (`src/lib/catalog/*`): typed server-side commands and queries with
  deterministic validation, tenant scope, capability checks, correlation and safe errors.
- **Privileged mutations**: price, promotional price, availability and material visibility go through
  the Admin Guard, and a privileged command whose durable audit event cannot be persisted fails closed.
- **UI**: `/app/catalog` inside the existing app shell — search, categories, products, variants,
  channels, offers, admitted price, promotional price, availability, visibility, and the price timeline.

## Defects found and corrected by the proof suites

These were found by the E2E and unit work, not by inspection, and all were inside the authorized scope.

1. **The privileged step-up was unreachable for a catalog-only manager.** `readPrivilegedCatalogReadiness`
   now reports the lapsed layer and the verified factor ids, and the console renders a password +
   authenticator confirmation panel of its own instead of deferring to a screen the manager has no
   route to.
2. **A money change could never succeed.** The bearer used for a privileged catalog RPC was an AAL1
   password-grant token, while `catalog_require_step_up()` requires AAL2 plus a fresh `totp` and a
   fresh `password` authentication. `src/lib/supabase/privileged-identity.server.ts` now produces a
   single token carrying all three: password grant on an ephemeral client, `mfa.challengeAndVerify` on
   that same session, then the resulting access token is both stored in the
   `goodz-privileged-reauth` cookie and used as the RPC bearer. This was the highest-severity defect in
   the slice: the guarded path was closed to everyone.
3. **The console never re-read server truth after a mutation.** It reported success for rows that were
   not on screen. `dispatch` now calls `revalidatePath("/app/catalog")` on success.
4. **The archive buttons were inverted.** `catalog_set_product_archived` treats its argument as the
   target state; the client was sending the current state, so the button labelled "Arquivar" reactivated
   the product. Both archivers now send `archived ? "false" : "true"`.
5. **A refused submission emptied the form.** React 19 resets a form's fields before running an action,
   accepted or refused. Text fields survived because React re-marks an input's default value on every
   update; a `<select>` did not, because React only marks the default option while mounting, so every
   dropdown silently reverted and the next attempt was submitted with no target at all.
   `SelectField` now keys the element by the current choice, which re-mounts it and re-marks the
   default, and the E2E asserts the operator's channel and variant survive a refusal byte for byte.
6. **An offer could not name a variant.** The product select had no empty option, so the form's own
   hint — "Informe um produto ou uma variante, nunca os dois" — described a choice the form could not
   make. The empty option was added and the hint is associated with both fields.

## Corrections to the proof itself

The E2E was corrected twice where it was asserting something the product does not promise.

- The fixture seeded the offer at revision 1 with **no** revision-1 history row — a state the product
  cannot produce, since `catalog_create_channel_offer` writes that row. The first admitted change then
  closed a revision no history had recorded, so the prior price was not closed, it was gone, and the
  proof passed only on a database that already had a long timeline. The fixture now seeds the row and
  its audit event, and writes them only while the offer is still at revision 1 so a later run cannot
  append a revision dated after the revisions that already closed it.
- Money assertions are now derived from the observed baseline with `movedPrice()`, which does exact
  decimal arithmetic on the persisted string with `BigInt`. The suite is archival by construction, so a
  hard-coded price asks for a change that is not a change and the command is right to refuse it. The
  offer creation now targets the channel the run itself created, for the same reason: an offer is
  unique per channel and target, and aiming at the seeded channel collided with the suite's own history.
- `PROJECT_TAGS["mobile-chromium"]` was `"m7"`, and `m` is not a hexadecimal digit. The tag is the
  leading pair of the last group of every fixture identifier, so the mobile project could not seed at
  all. It is now `"a7"`.

## ELEVATED validation at the exact head

| Gate | Result |
|---|---|
| GEF 1.1.1 preflight | PASS — correct repository/branch/base, base ancestral, Context Lock `BOUND_FOR_EXECUTION`, `16 / 16 MATCH`, `implementationAuthorized = true`, known working tree, `.gef` unchanged |
| Frozen install / strict peers | PASS — pnpm `12.8.1`; `corepack pnpm install --frozen-lockfile --strict-peer-dependencies`; no lockfile diff |
| Lint | PASS — `pnpm lint` |
| Typecheck | PASS — `pnpm typecheck` |
| Unit | PASS — `93 / 93`, 13 test files, including the new `hasFreshPasswordAuthentication` coverage |
| Production build | PASS — Next.js `16.3.8`, Turbopack |
| Local Supabase reset | PASS — all 6 migrations applied, including the 3 catalog migrations |
| pgTAP | PASS — `356 / 356`, 6 SQL files |
| Auth/Data API integration | PASS — `59 / 59` |
| Catalog Auth/Data API integration | PASS — `74 / 74` |
| Migration status | PASS — all six local migrations listed and applied |
| Generated DB types | PASS — regenerated; `git diff` against the tracked `database.types.ts` is empty |
| DB lint | PASS — `public,private`, no schema errors at warning level |
| Security/performance advisors | PASS — see matrix below |
| Full E2E desktop + mobile | PASS — `32 / 32`; catalog, auth/session, foundation and MFA/Admin Guard suites |
| Axe / accessibility | PASS — zero reported violations in every asserted state, light and dark |
| Layout review | PASS with measured evidence — see below |
| Production dependency audit | PASS — `No known vulnerabilities found` |
| Raw full dependency audit | **RAW FAIL preserved** — exit `1`, exactly one HIGH `GHSA-vfj7-8cjw-p6xm` |
| `pnpm why braces` | PASS — dev-only chain `braces@3.0.3 ← micromatch@4.0.8 ← fast-glob@3.3.1 ← @next/eslint-plugin-next@16.3.8 ← devDependencies` |
| Braces reachability guard | PASS — `braces` absent from `211` resolved production packages; no active `settings.next.rootDir`; all `22` pinned Next recommended rules enabled; disposition `RESOLVED_NOT_AFFECTED` |
| Secret scan | PASS — 243 tracked text files; JWT, provider-key and literal service-role patterns had zero matches |
| Client-bundle containment | PASS — 21 files in `.next/static`; zero `SUPABASE_SERVICE_ROLE_KEY` name matches and zero matches for the local service-role value |
| Docker config/build/up | PASS — `docker compose config` valid, image built from the candidate, container recreated and `healthy` |
| Health / readiness | PASS — `/api/health` `200 ok`, `/api/ready` `200 ready` with `supabase: available`, `/login` `200`, `/app/catalog` `307` to sign-in when unauthenticated |
| Local Supabase / Auth / Postgres | PASS — Auth health `200`, REST `200`, `pg_isready` accepting connections, `SELECT 1` returned |
| Runtime logs | PASS — 80 recent lines; zero error/fatal/exception/panic lines, zero credential-pattern matches |
| `.gef` integrity | PASS — zero `.gef` paths changed relative to the execution base |

### Security advisor matrix

Run directly against the local database, because the hosted advisor endpoint is not reachable from a
local stack:

| Check | Value |
|---|---|
| `rls_disabled_on_public_tables` | `0` |
| `catalog_tables_without_rls` | `0` |
| `catalog_tables_readable_by_anon` | `0` |
| `catalog_tables_writable_by_authenticated` | `0` |
| `public_views_without_security_invoker` | `0` |
| `security_definer_without_pinned_search_path` | `0` — all 26 catalog/audit contracts carry `search_path=""` |
| `public_functions_executable_by_anon` | `0` |
| anon write grants | `6`, all on Supabase's own internal `hooks` and `migrations` tables; no application table |
| `security_definer` functions not executable by `authenticated` | `8`, all `private.*` internals plus `public.append_audit_event`, which is the promoted GMZ-IMPL-006 audit RPC and is not on the catalog path |

The catalog writes its audit event inside the same transaction through `private.catalog_append_audit`,
so the fail-closed property does not depend on `append_audit_event` being reachable by `authenticated`.

### Layout review, and the limit of it

This session could not ingest raster images, so the catalog surface was **not** reviewed by looking at
it. It was reviewed by measurement instead, and that substitution is stated here rather than left
implicit:

- No horizontal overflow at `1440x1000` or `390x844`, in either theme: `document.scrollWidth` equals
  the viewport width in all four combinations, and no element escapes the viewport except inside an
  ancestor that scrolls or clips it.
- The price-history table is wider than a phone (`scrollWidth 520` against `clientWidth 258` at
  `390px`), and is reachable because its wrapper computes `overflow-x: auto`; the extra width becomes a
  scroll region rather than content the operator cannot see.
- No interactive target is below the WCAG 2.2 SC 2.5.8 minimum of `24x24` CSS pixels, measuring the
  label where a control is wrapped in one.
- Focus is visible: the first control an operator reaches computes a `3px solid` outline.
- Axe reports zero violations at `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` in both themes,
  and Axe computes contrast from the rendered colours, so the palette claim is measured rather than
  asserted.

**Observation left out of scope:** `.mfa-status-success` on `/app/security` renders at `4.37:1`, below
the `4.5:1` AA threshold. It is the same success-on-tint pattern that the catalog confirmation used, and
it is fixed inside the catalog with the new `--success-strong` token (`#1f7350` light, `#8fe0b3` dark).
The security page is outside this Work Order's authorized scope, so it is recorded here as a finding for
a future increment rather than changed. It is not counted as a defect of GMZ-IMPL-007.

## Known limitations recorded honestly

- **Authenticator factor removal.** GoTrue refuses to unenrol a verified factor without a current AAL2
  session (`422 insufficient_aal`), returns `405` for `POST /auth/v1/admin/users/{id}/factors`, and
  cannot clear a stale factor through the API. No run can produce the AAL2 session, because the secret
  that would satisfy the challenge died with the run that enrolled it. The fixture therefore clears
  stale rows with `DELETE FROM auth.mfa_factors WHERE user_id = …` directly in the local database, where
  it already provisions everything else. That reset is only ever available locally; no committed path
  reaches a remote Auth service.
- **Raster review.** As above: measured, not seen.
- **E2E rewrites promoted screenshots.** `tests/e2e/foundation.spec.ts` and
  `tests/e2e/auth-session.spec.ts` write into `.engineering/evidence/GMZ-IMPL-001/screenshots` and
  `.engineering/evidence/GMZ-IMPL-004/screenshots`. Every run dirties those promoted artifacts. They
  were restored to their committed bytes before this commit and are not part of this delta.

## Security disposition and checkpoint proposal

- CRITICAL unresolved: `0`.
- HIGH unresolved: `0`. The raw full audit remains nonzero and is recorded above as a raw FAIL, not as
  a pass; `GHSA-vfj7-8cjw-p6xm` keeps its evidence-backed `RESOLVED_NOT_AFFECTED` disposition, which is
  conditional on the committed guard and fails closed if the dependency graph or lint configuration
  changes.
- No service-role key is used for catalog authorization, catalog business mutation or tenant bypass. In
  the E2E fixture the service role provisions synthetic identities and nothing else, and that is stated
  in the file that uses it.
- Audit metadata written by this slice carries only `required_permission`, `resource_kind`,
  `changed_fields`, `previous_value` and `next_value`; the database enforces that allowlist with
  `private.is_safe_audit_metadata`, so no token, password, secret, provider credential or raw payload
  can reach an audit row.
- Prohibited scope was not entered: no ModifierGroup/ModifierOption/ProductModifierRule, no
  ComboDefinition/ComboItemRule, no rich media runtime, no Ingredient, Recipe, InventoryItem, stock,
  purchasing, suppliers, POS, cart, payments, orders, finance, reconciliation, iFood or 99Food adapter,
  no provider catalog sync, no Goodz Online storefront publishing, no autonomous pricing, no
  Platform/Super Admin, no remote Supabase, no production deployment. `SalesChannel` is an explicit
  channel identity and carries no provider adapter.
- No merge, no `main` update, no force-push, no history rewrite, no `.gef` edit.
- **Checkpoint proposal, NOT APPLIED.** `CHECKPOINT.json` stays at `GMZ_IMPL_007_BOUND_FOR_EXECUTION`
  with `implementationAuthorized = true` and credit `52 / 515 = 10.10%`. The proposed delta is appended
  to `.engineering/CHECKPOINT.md` and is explicitly left for independent objective audit.
- PR `#69` stays open and draft.

## Hosted gates

SonarCloud, Socket Pull Request Alerts, Socket Project Report and CodeRabbit are awaited at the exact
final published head. No result from an earlier SHA is reused as the final-head result; the statuses
and links are recorded in the PR `#69` description.

STOP CONDITION:
`GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT`

## Revalidação corretiva — snapshot de implementação 98bd039

Esta seção registra a revalidação posterior às revisões CodeRabbit locais. Ela supersede a conclusão
READY da execução histórica acima para o candidato corrente. O stop condition **não foi atingido**.

| Identidade | Valor |
|---|---|
| Repositório / branch | `KayzenRoot/goodz-menu` / `execution/gmz-impl-007-catalog-core` |
| Execution base | `1b64fbfbef3d31d215f4a2a1e30e88f8f946860c` |
| HEAD do snapshot de implementação validado | `98bd0390cef640fc34a0729933578388a2b0d74a` |
| Tree do snapshot de implementação | `86ccf5b5f3ee147bb3636683f5f23aab044686d0` |
| Context Lock / fingerprints | `BOUND_FOR_EXECUTION` / `16 / 16 MATCH` |
| `.gef` | íntegro; zero diff relativo à execution base |
| `CHECKPOINT.json` | preservado; crédito continua `52 / 515 = 10.10%` |

### Correções verificadas nesta revalidação

- Cada editor/creator mantém estado de ação próprio. Campos de texto e selects agora preservam o rascunho
  após falha e retornam ao valor inicial/valor canônico atualizado somente após sucesso.
- O histórico de preço formata ambas as datas com `timeZone: America/Sao_Paulo`. O E2E usa browser UTC,
  lê as duas últimas revisões do banco e compara `effective_from`/`effective_to` com o horário esperado.
- O fixture E2E ganhou leitura que preserva todas as linhas retornadas e serializa instantes em ISO 8601
  UTC com precisão de milissegundos.
- `private.reject_catalog_scope` não declara mais `IMMUTABLE`: a função PL/pgSQL levanta exceção e não
  satisfaz o contrato de função imutável.
- A revisão CodeRabbit local final executada sobre o snapshot de implementação terminou com `0 issues`.

### Validações novas no snapshot exato

| Check | Resultado |
|---|---|
| `pnpm install --frozen-lockfile --strict-peer-dependencies` | PASS — pnpm `12.8.1`, sem mudança no lockfile |
| Lint | PASS |
| Typecheck | PASS em execução sequencial após o build |
| Unit | PASS — `93 / 93`, 13 arquivos |
| Production build | PASS — Next.js `16.3.8`, Turbopack |
| `pnpm why braces` | PASS — cadeia somente de desenvolvimento via `@next/eslint-plugin-next` |
| `security:braces-disposition` | PASS — `braces` ausente dos `211` pacotes de produção; zero `settings.next.rootDir` ativo; 22 regras recomendadas do Next habilitadas; `RESOLVED_NOT_AFFECTED` |
| Production dependency audit | PASS — sem vulnerabilidades conhecidas |
| Raw full dependency audit | **RAW FAIL** — exatamente um HIGH `GHSA-vfj7-8cjw-p6xm`; não foi mascarado |
| Secret-pattern scan | PASS — `256` arquivos texto rastreados; `0` padrões |
| Client-bundle scan | PASS — `21` arquivos; `0` identificadores service-role; `0` padrões de token |
| Docker compose config | PASS |
| `.gef` integrity | PASS |

Uma tentativa concorrente de typecheck e build encontrou ausência momentânea de `.next/types`, pois o
build os estava regenerando; o typecheck foi repetido sequencialmente e passou. O resultado concorrente
não foi contabilizado como PASS.

### Bloqueio do host e provas não reexecutadas

O Docker Desktop não consegue iniciar o daemon; `docker compose build web`, `docker compose up` e `docker
info` falham conectando ao named pipe `npipe:////./pipe/dockerDesktopLinuxEngine`. O comando
`supabase db reset --local` falha com `LocalDbRunningError` pelo mesmo motivo. Além disso,
`wsl -d Ubuntu-24.04 -- uname -r` falha em `Wsl/Service/CreateInstance/CreateVm/HCS/ERROR_NOT_SUPPORTED`.
Uma instância do instalador por usuário restaurou os binários do Docker Desktop, mas o backend e a criação
de VMs WSL2 continuam indisponíveis.

Os VHDX já existentes em `D:\DockerLive` foram verificados e não foram apagados, movidos ou
reinitializados por esta execução. A sessão atual não tem privilégio administrativo para reparar a camada
Windows/WSL/HCS ou reiniciar o host.

Por isso, neste snapshot **não foram reexecutados com sucesso**: reset Supabase, pgTAP completo após a
última edição SQL, Auth/Data API, migration status, generated-type equivalence, DB lint/advisors, E2E
desktop/mobile e Axe, Docker build/up/health, health/readiness, Supabase/Auth/Postgres, runtime logs e
SonarCloud/Socket/CodeRabbit hospedado no SHA final. Resultados antigos continuam históricos e não são
reutilizados como prova final. `docker compose config` isoladamente não substitui essas provas.

### Situação do incremento

- CRITICAL/HIGH de código não resolvido: `0 / 0` conforme a revisão local atual; o raw advisory HIGH de
  dependência continua explicitamente não PASS e com disposição condicional documentada acima.
- Crédito: sem promoção; `52 / 515 = 10.10%`.
- Checkpoint JSON: permanece `GMZ_IMPL_007_BOUND_FOR_EXECUTION`.
- PR `#69`: permanece draft e não mergeada. Após publicar `599a001b21e04e0204c7e7b521d9d8881a7b55e0`,
  SonarCloud Code Analysis, Socket Security Project Report e Socket Security Pull Request Alerts
  reportaram PASS. O check hospedado CodeRabbit reportou PASS com `Review skipped: draft pull request`;
  isso não é revisão objetiva/independente. CodeRabbit local no snapshot de implementação: `0 issues`.
- O commit `599a001` contém apenas documentação após o snapshot de implementação `98bd039`. Os resultados
  hospedados acima são vinculados ao SHA `599a001` e devem ser tratados como históricos se outro commit
  for publicado.
- Estado: `BLOCKED_FOR_OBJECTIVE_AUDIT`; somente uma recuperação segura do host seguida do HIGH_ASSURANCE
  L5 completo pode liberar nova avaliação do stop condition.
