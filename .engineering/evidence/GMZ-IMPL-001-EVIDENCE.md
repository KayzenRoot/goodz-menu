# GMZ-IMPL-001 — Evidências de execução

## Identidade e autoridade

- Repositório: `KayzenRoot/goodz-menu` (`origin=https://github.com/KayzenRoot/goodz-menu.git`).
- Work Order: `GMZ-IMPL-001`, Issue `#36`, branch autorizada `implementation/gmz-impl-001-runtime-foundation`.
- GEF Bootstrap: `1.1.1`; `.gef/init-state.json` registra `APPLIED` e o recibo registra `CONFIRMED`.
- Correções do Context Lock/revisão: `GMZ-IMPL-001-CD-001` a `CD-005`, aplicadas sem alteração semântica de escopo ou da base de execução.
- Base legal de execução e `main` no preflight: `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585`.
- Após fetch e fast-forward local sem merge do PR, ponta local/remota da branch no preflight: `ae8696200876495c5acb1a662a8893e8d6b842d4`; ancestralidade da base legal verificada (`git merge-base --is-ancestor`, exit 0); worktree limpo.
- Identidade GitHub verificada: `KayzenRoot` (ID `114633702`); Issue `#36` aberta e atribuída a essa identidade.
- Pré-flight GEF 1.1.1 completo após fetch remoto e novamente antes de L5: **PASS**; fingerprints do Context Lock **14/14 MATCH**, sem divergências; repositório, Work Order, branch, base vinculada, autorização restrita, Source Pack congelado, CD-005 e stop condition conferidos.
- `.gef/init-state.json`: produto `1.1.1`, transação `APPLIED`; recibo do mesmo `runId`: efeito `CONFIRMED`.
- PR `#38`: aberta em rascunho para `main`, head do preflight `ae8696200876495c5acb1a662a8893e8d6b842d4`, não merged. O preflight confirmou Issue `#36` aberta.
- O worktree já continha a implementação em andamento desta mesma execução ao retomar. O bloco de orientação de versão Next.js em `AGENTS.md` é gerado por `next dev`; foi mantido para que o fluxo nativo documentado não deixe esse arquivo modificado após inicializar.
- `.gef/**`: intacto; `git status --short -- .gef` vazio e `git diff --quiet -- .gef` exit 0.

## Ambiente e versões

| Ferramenta | Versão/estado |
|---|---|
| Windows host | Windows PowerShell; comandos e caminhos Windows revisados |
| Node.js | `v24.19.0` |
| pnpm | `12.8.1` via Corepack |
| Next.js | `16.3.8` |
| React / React DOM | `19.3.0` |
| TypeScript | `6.0.3`, strict |
| Tailwind CSS / PostCSS | `4.3.3` / `8.5.28` |
| Motion for React | `13.5.0` |
| Supabase CLI | `2.119.0` |
| Vitest | `5.0.3` |
| Playwright | `1.63.0` |
| Axe Playwright | `4.13.0` |
| Docker Engine | `29.8.0`, Docker Desktop, engine Linux ativo |
| Docker Compose | `v5.5.1` |

`components.json` configura componentes próprios compatíveis com shadcn/ui (`base-nova`, CSS variables); não foi adicionado runtime de componentes de terceiros. As dependências estão fixadas e o lockfile é versionado.

## Resultado implementado

- Aplicação Next.js App Router em `src/`, TypeScript strict, scripts determinísticos e build standalone.
- Shell Goodz `Foundation Preview`, com modo claro/escuro/sistema, layout desktop/mobile, navegação explicitamente “Em breve”, feedback de demonstração e redução de movimento. Não apresenta indicadores de negócio fictícios.
- `/api/health` independente de dependências e `/api/ready` com verificação limitada do Supabase; ambos usam correlation ID validado e respostas/logs sanitizados.
- Configuração Supabase local e seed sem domínio de negócio; sem migrations, tabelas de negócio, autenticação de produto, RBAC ou vínculo a projeto remoto.
- Imagem Docker multi-stage, runtime não-root, healthcheck, porta publicada somente em `127.0.0.1:3001`, com `host.docker.internal:host-gateway` para a API Supabase local do host.
- O host já tinha `hive-dashboard-1` em `127.0.0.1:3000`; o Goodz usa 3001 sem interromper ou reconfigurar esse serviço.
- Serviços opcionais Supabase que não são necessários à fundação (Realtime, Studio, SMTP/Inbucket, Storage, Edge Runtime e Analytics) permanecem desativados. Auth local está disponível apenas como componente padrão do stack; nenhum fluxo de autenticação foi implementado.
- O launcher local define `GOODZ_ENVIRONMENT=local`; local aceita somente endpoint loopback/`host.docker.internal`, e staging/production exigem URL HTTPS explícita. Não há endpoint de produção implícito.
- Correção CD-003: parsing isolado de health/readiness, falhas de parse limpam sucesso antigo e regressão E2E exercita health JSON malformado com readiness saudável.

## Governança e validação

### Pré-flight GEF 1.1.1

| Verificação | Resultado |
|---|---|
| `git fetch origin implementation/gmz-impl-001-runtime-foundation main` e fast-forward local | exit 0; branch remota/local em `50a92b4d34756ee0eb8d7787a55aafa4a98e26ba`; `main` em `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585` |
| `git status --short --branch`; branch, remote e identidade | worktree limpo; branch e URL do repositório corretas; GitHub `KayzenRoot` (`114633702`) |
| Ancestralidade da base `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585` | exit 0; base vinculada é ancestral de HEAD |
| Fingerprints de `lockedSources[]` com `git hash-object -- <path>` | exit 0; **14/14 MATCH** |
| Checkpoint, Work Order, Context Lock, CD-003 e `WRITE_ALLOWED/FORBIDDEN` | PASS; executor autorizado somente para `GMZ-IMPL-001`; sem mudança semântica de escopo/base |
| `.gef/init-state.json` / recibo GEF | `1.1.1`, `APPLIED` / `CONFIRMED` |
| Issue `#36` / PR `#38` | Issue OPEN e atribuída a `KayzenRoot`; PR OPEN, DRAFT, base `main`, não merged |
| Ferramentas do executor | Node `v24.19.0`; pnpm `12.8.1`; Next `16.3.8`; TypeScript `6.0.3`; Tailwind `4.3.3`; Motion `13.5.0`; Supabase CLI `2.119.0`; Docker Engine `29.8.0`; Compose `5.5.1` |

### Validação L5 da correção CD-005

Todos os comandos abaixo foram executados no candidato `ae8696200876495c5acb1a662a8893e8d6b842d4` após CD-005. Após o commit deste fechamento de checkpoint/evidência, a bateria completa será repetida no novo HEAD; a identidade e os resultados dessa repetição final serão registrados na descrição da PR.

| Nível | Comando/checagem | Exit | Resultado |
|---|---|---:|---|
| L0 | `corepack pnpm install --frozen-lockfile` | 0 | Lockfile íntegro; pnpm `12.8.1` |
| L2 | `corepack pnpm lint` | 0 | ESLint sem findings |
| L2 | `corepack pnpm typecheck` | 0 | TypeScript sem erros |
| L1 | `corepack pnpm test` | 0 | 2 arquivos, 6 testes passaram: 4 de ambiente e 2 de correlação |
| L2 | `corepack pnpm build` | 0 | Build Next.js de produção concluído; `/` estática, APIs dinâmicas |
| L2/L4 | `corepack pnpm test:e2e` | 0 | 8/8 passaram em Chromium desktop e mobile; regressões CD-003 e CD-005 passaram nos dois perfis |
| L4 | E2E com axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` | 0 | Zero violações; largura sem overflow em 1440 px e 390 px; temas claro/escuro e reduced-motion verificados |
| L4 | `corepack pnpm audit --audit-level high` | 0 | Nenhuma vulnerabilidade conhecida no limiar solicitado |
| L4 | `corepack pnpm peers check` | 0 | Nenhum conflito de peer dependency |
| L3 | `docker compose config --quiet` | 0 | Configuração Compose válida |
| L4 | Secret-pattern scan em 124 arquivos textuais versionados | 0 | Nenhum valor com formato de chave/token/URL de banco com senha detectado; 129 paths versionados no total |
| L4 | Busca de DDL em `supabase/` (`CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, `auth.users`) | 1 | Zero ocorrências; exit 1 do `rg` representa ausência de matches |
| L3 | `corepack pnpm supabase:status` (saída bruta suprimida) | 0 | Stack local reconhecida; chaves/tokens não foram copiados para saída/evidência |
| L3 | `GET http://127.0.0.1:54321/auth/v1/health` | 0 | HTTP 200; Auth local respondeu |
| L3 | `docker compose build web` | 0 | Build multi-stage de produção concluído com instalação congelada no Docker Desktop/Engine `29.8.0` |
| L3 | `docker compose up -d` | 0 | Serviço web recriado e iniciado |
| L3 | `docker inspect` / `docker compose ps` | 0 | `goodz-menu-web-1` `healthy`/running; bind somente `127.0.0.1:3001` |
| L3 | `GET http://127.0.0.1:3001/api/health` | 0 | HTTP 200, `status=ok`, `environment=local`, `runtime=docker` |
| L3 | `GET http://127.0.0.1:3001/api/ready` | 0 | HTTP 200, `status=ready`, Supabase `available` via host gateway |
| L3 | `docker compose logs --no-color --tail=50 web` | 0 | 12 registros examinados; nenhum marcador `error`, `exception` ou `fatal` |
| GEF | `git status/diff -- .gef` e diff de `.gef` desde a base autorizada | 0 | Nenhum arquivo `.gef` modificado |
| Pós-L5 | `git status/diff -- .gef` e diff de `.gef` desde a base legal | 0 | Worktree, index e delta desde a base sem mudanças em `.gef` |

### Casos automatizados

Unitários:
- `runtime environment boundary`: padrão local explícito, ausência de fallback de produção, bloqueio de endpoint remoto/credenciais em local e exigência de HTTPS remoto.
- `request correlation`: preservação de UUID válido, substituição de header arbitrário e sanitização de revisão de build.

E2E (`tests/e2e/foundation.spec.ts`):
- `foundation shell stays responsive, themed, reduced-motion aware and accessible`: saúde/readiness/correlação, Supabase disponível, tema claro/escuro, screenshots, viewport desktop/mobile, ausência de overflow, reduced-motion e axe.
- `feedback examples remain clearly labeled as previews`: feedback acessível e marcação explícita de exemplo.
- `status cards isolate malformed health responses from readiness state`: resposta health JSON inválida não deixa sucesso antigo; readiness válido continua disponível (desktop e mobile).
- `status cards keep the newest refresh when an older request finishes late`: resposta antiga de health/readiness falha após uma resposta mais nova bem-sucedida sem sobrescrever o estado atual (desktop e mobile; 18.2 s por perfil).

O objetivo de LCP/INP/CLS p75 dos requisitos de storefront é uma medição de campo para a futura superfície pública. Esta fatia é somente a prévia local estática; não afirma resultado de tráfego de produção. A inspeção de performance confirmou ausência de gráficos/bibliotecas pesadas e que o caminho reduced-motion não depende de animações contínuas.

## Capturas visuais

- [Tema claro — desktop](GMZ-IMPL-001/screenshots/light-desktop.png)
- [Tema escuro — desktop](GMZ-IMPL-001/screenshots/dark-desktop.png)
- [Tema claro — mobile](GMZ-IMPL-001/screenshots/light-mobile.png)
- [Tema escuro — mobile](GMZ-IMPL-001/screenshots/dark-mobile.png)

## Arquivos do incremento

Incluem runtime, design shell, Docker, configuração Supabase local, testes, documentação local e estas evidências/capturas. `AGENTS.md` contém apenas o bloco de orientação Next.js gerado pelo framework. `.gef/**`, Source Pack congelado e módulos de negócio não fazem parte do delta.

Inventário versionado do incremento a partir da base vinculada (52 paths):

```text
.dockerignore
.engineering/CHECKPOINT.json
.engineering/CHECKPOINT.md
.engineering/context-locks/GMZ-IMPL-001.json
.engineering/evidence/GMZ-IMPL-001-ADMISSION.md
.engineering/evidence/GMZ-IMPL-001-CD-001-EVIDENCE.md
.engineering/evidence/GMZ-IMPL-001-CD-003-EVIDENCE.md
.engineering/evidence/GMZ-IMPL-001-CD-005-EVIDENCE.md
.engineering/evidence/GMZ-IMPL-001-EVIDENCE.md
.engineering/evidence/GMZ-IMPL-001-OBJECTIVE-AUDIT.md
.engineering/evidence/GMZ-IMPL-001/screenshots/dark-desktop.png
.engineering/evidence/GMZ-IMPL-001/screenshots/dark-mobile.png
.engineering/evidence/GMZ-IMPL-001/screenshots/light-desktop.png
.engineering/evidence/GMZ-IMPL-001/screenshots/light-mobile.png
.engineering/execution-packs/GMZ-IMPL-001.md
.engineering/work-orders/GMZ-IMPL-001.md
.env.example
.gitignore
AGENTS.md
Dockerfile
components.json
compose.yaml
docs/LOCAL-DEVELOPMENT.md
eslint.config.mjs
next.config.ts
package.json
playwright.config.ts
pnpm-lock.yaml
pnpm-workspace.yaml
postcss.config.mjs
public/goodz-mark.svg
scripts/start.mjs
src/app/api/health/route.ts
src/app/api/ready/route.ts
src/app/favicon.ico
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/components/goodz/foundation-preview.tsx
src/components/goodz/theme-provider.tsx
src/lib/env/runtime-env.test.ts
src/lib/env/runtime-env.ts
src/lib/observability/correlation.test.ts
src/lib/observability/correlation.ts
src/lib/observability/runtime-log.ts
src/lib/runtime/readiness.ts
supabase/.gitignore
supabase/config.toml
supabase/seed.sql
tests/e2e/foundation.spec.ts
tsconfig.json
vitest.config.mts
```

## Rastreabilidade e crédito

| Requisito | Evidência |
|---|---|
| `GMZ-REQ-RUN-001` | Compose, build/up, porta loopback e container healthy |
| `GMZ-REQ-RUN-002` | Schema/launcher de ambiente e testes negativos de endpoint |
| `GMZ-REQ-UX-001/002/003` | Shell Goodz, tokens, temas e capturas desktop/mobile |
| `GMZ-REQ-UX-004` | Hook `prefers-reduced-motion`, CSS e E2E |
| `GMZ-REQ-UX-005` | Exemplos de feedback acessíveis e teste E2E |
| `GMZ-REQ-UX-008` | Viewports 1440/390 px e checagem contra overflow |
| `GMZ-REQ-OBS-001` | Correlation ID sanitizado em headers, payloads e logs |
| `GMZ-REQ-QA-003/004/005` | Unit/E2E, revisão visual e axe sem violações |
| `GMZ-REQ-QA-006` | Guardas de custo de shell e reduced-motion; telemetria de campo permanece futura |
| `GMZ-REQ-SEC-005` | Env boundary, secret scan, audit e ausência de segredos reais |
| `GMZ-REQ-GOV-001..004` | Context Lock/preflight, evidência, branch/PR e stop condition |

| Módulo | Elegibilidade máxima prevista | Crédito reconhecido agora |
|---|---:|---:|
| `GMZ-M25` Runtime, Docker & Deployment | 4 | 0 — auditoria objetiva pendente |
| `GMZ-M04` Design System shell | 1 | 0 — auditoria objetiva pendente |
| `GMZ-M26` Validation & Quality Engineering | 2 | 0 — auditoria objetiva pendente |
| `GMZ-M23` Observability/correlation bootstrap | 1 | 0 — auditoria objetiva pendente |
| **Total** | **8 / 515** | **0 / 515** |

## Findings, exclusões e fechamento

- Findings do executor por severidade: CRITICAL `0`, HIGH `0`, MEDIUM `0`, LOW `0`; auditoria objetiva continua pendente e é uma revisão separada.
- Sem login/signup de produto, tenant/RBAC, CRUD, POS, inventário, finanças, pedidos, marketplace, IA, billing, tabelas de negócio, integração externa, projeto Supabase remoto ou deployment de produção.
- Reset destrutivo do banco (`supabase db reset`) não foi executado. O guia documenta seu uso intencional; dados/volumes existentes foram preservados.
- PR de execução: [#38](https://github.com/KayzenRoot/goodz-menu/pull/38), aberta em rascunho contra `main`, branch `implementation/gmz-impl-001-runtime-foundation`, sem merge. O head completo após o commit de evidência e a repetição final L5 será registrado na descrição da PR e no relatório do executor.
- Checkpoint humano e JSON estão sincronizados em `GMZ_IMPL_001_READY_FOR_OBJECTIVE_AUDIT` e `OBJECTIVE_AUDIT_GMZ_IMPL_001`; crédito segue zero.
- `productionEarned=0`; nenhum módulo foi marcado como concluído.

**Stop condition:** `GMZ_IMPL_001_READY_FOR_OBJECTIVE_AUDIT`.
