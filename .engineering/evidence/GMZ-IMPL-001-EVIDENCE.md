# GMZ-IMPL-001 — Evidências de execução

## Identidade e autoridade

- Repositório: `KayzenRoot/goodz-menu` (`origin=https://github.com/KayzenRoot/goodz-menu.git`).
- Work Order: `GMZ-IMPL-001`, Issue `#36`, branch autorizada `implementation/gmz-impl-001-runtime-foundation`.
- GEF Bootstrap: `1.1.1`; `.gef/init-state.json` registra `APPLIED` e o recibo registra `CONFIRMED`.
- Correção do Context Lock: `GMZ-IMPL-001-CD-001`, aplicada; autorização do executor permanece restrita a este Work Order.
- Base legal de execução e `main` no preflight: `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585`.
- Ponta local/remota da branch no preflight: `e8591720025a46cded5ae61374c7d9a0b1c09442`; ancestralidade da base legal verificada (`git merge-base --is-ancestor`, exit 0).
- Identidade GitHub verificada: `KayzenRoot` (ID `114633702`); Issue `#36` aberta e atribuída a essa identidade.
- Pré-flight GEF após fetch remoto: **PASS**; fingerprints do Context Lock **14/14 MATCH**, sem divergências. A alteração do checkpoint ao final deste Work Order é progresso expressamente autorizado; o Context Lock e `.gef/**` não foram editados.
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

## Validação e comandos

Os comandos abaixo foram executados no código candidato desta branch. A repetição L5 será executada e conferida no head final publicado no PR.

| Nível | Comando/checagem | Exit | Resultado |
|---|---|---:|---|
| Preflight | `git fetch origin implementation/gmz-impl-001-runtime-foundation main` | 0 | Fetch concluído; branch remota em `e859172…`, `main` em `0932c46…` |
| Preflight | Loop sobre `lockedSources[]`, `git hash-object -- <path>` | 0 | 14/14 `MATCH` |
| Preflight | `git merge-base --is-ancestor 0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585 HEAD` | 0 | Branch descende da base vinculada |
| L0 | `corepack pnpm install --frozen-lockfile` | 0 | Lockfile íntegro; pnpm `12.8.1` |
| L0 | `docker compose config --quiet` | 0 | Configuração Compose válida |
| L1 | `corepack pnpm test` | 0 | 2 arquivos, 6 testes passaram: 4 de ambiente e 2 de correlação |
| L2 | `corepack pnpm lint` | 0 | ESLint sem findings |
| L2 | `corepack pnpm typecheck` | 0 | TypeScript sem erros |
| L2 | `corepack pnpm build` | 0 | Build Next.js de produção concluído; `/` estática, APIs dinâmicas |
| L2/L4 | `corepack pnpm test:e2e` | 0 | 4/4 passaram em Chromium desktop e mobile |
| L4 | E2E com axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` | 0 | Zero violações; contraste/semântica verificados pelo axe; largura sem overflow em 1440 px e 390 px; tema e reduced-motion verificados |
| L4 | `corepack pnpm audit --audit-level high` | 0 | Nenhuma vulnerabilidade conhecida no limiar solicitado |
| L4 | `corepack pnpm peers check` | 0 | Nenhum conflito de peer dependency |
| L4 | Secret scan direcionado a 45 arquivos de fonte/configuração | 0 | Nenhuma credencial, chave de serviço, JWT ou URL com senha detectada; valores de teste são placeholders deliberados |
| L4 | Busca de DDL em `supabase/` (`CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, `auth.users`) | 1 | Zero ocorrências; `rg` usa exit 1 para zero matches |
| L3 | `corepack pnpm supabase:status` (saída bruta suprimida) | 0 | Stack local reconhecida; nenhum token/key copiado para evidência |
| L3 | `GET http://127.0.0.1:54321/auth/v1/health` | 0 | GoTrue respondeu; versão `v2.197.0` |
| L3 | `docker compose build web` | 0 | Imagem construída usando instalação congelada |
| L3 | `docker compose up -d` | 0 | Serviço web iniciado em `127.0.0.1:3001` |
| L3 | `GET http://127.0.0.1:3001/api/health` | 0 | HTTP 200, `status=ok`, `environment=local`, `runtime=docker` |
| L3 | `GET http://127.0.0.1:3001/api/ready` | 0 | HTTP 200, `status=ready`, Supabase `available` via host gateway |
| L3 | `docker compose ps` | 0 | `goodz-menu-web-1` saudável; publicação apenas loopback |
| L3 | `docker compose logs --no-color --tail=40 web` | 0 | Inicialização e logs estruturados de health/readiness; sem erro |
| GEF | `git status --short -- .gef` e `git diff --quiet -- .gef` | 0 | `.gef` sem alterações |

### Casos automatizados

Unitários:
- `runtime environment boundary`: padrão local explícito, ausência de fallback de produção, bloqueio de endpoint remoto/credenciais em local e exigência de HTTPS remoto.
- `request correlation`: preservação de UUID válido, substituição de header arbitrário e sanitização de revisão de build.

E2E (`tests/e2e/foundation.spec.ts`):
- `foundation shell stays responsive, themed, reduced-motion aware and accessible`: saúde/readiness/correlação, Supabase disponível, tema claro/escuro, screenshots, viewport desktop/mobile, ausência de overflow, reduced-motion e axe.
- `feedback examples remain clearly labeled as previews`: feedback acessível e marcação explícita de exemplo.

O objetivo de LCP/INP/CLS p75 dos requisitos de storefront é uma medição de campo para a futura superfície pública. Esta fatia é somente a prévia local estática; não afirma resultado de tráfego de produção. A inspeção de performance confirmou ausência de gráficos/bibliotecas pesadas e que o caminho reduced-motion não depende de animações contínuas.

## Capturas visuais

- [Tema claro — desktop](GMZ-IMPL-001/screenshots/light-desktop.png)
- [Tema escuro — desktop](GMZ-IMPL-001/screenshots/dark-desktop.png)
- [Tema claro — mobile](GMZ-IMPL-001/screenshots/light-mobile.png)
- [Tema escuro — mobile](GMZ-IMPL-001/screenshots/dark-mobile.png)

## Arquivos do incremento

Incluem runtime, design shell, Docker, configuração Supabase local, testes, documentação local e estas evidências/capturas. `AGENTS.md` contém apenas o bloco de orientação Next.js gerado pelo framework. `.gef/**`, Source Pack congelado e módulos de negócio não fazem parte do delta. O inventário final será atualizado após o fechamento.

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
- Estado do checkpoint, número/URL/head do PR e inventário final de arquivos serão preenchidos no fechamento após push. PR final deve permanecer aberto contra `main`; sem merge.
- `productionEarned=0`; nenhum módulo foi marcado como concluído.

**Stop condition:** `GMZ_IMPL_001_READY_FOR_OBJECTIVE_AUDIT`.
