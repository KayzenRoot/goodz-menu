# GMZ-REBOOT-001 — Reinício limpo da implementação (Módulo 1)

Status: `IN_PROGRESS / LOCAL_TLS_IMPLEMENTATION_AND_ACCEPTANCE_COMPLETE / RETRY_LIMIT_GUARD_LOCAL_CHECKS_PASS / FRESH_EXACT_HEAD_CI_PENDING / INDEPENDENT_REVIEW_PENDING / HUMAN_REVIEW_PENDING`<br>
Issue: #73<br>
Branch: `rebuild/gmz-reboot-001-module-01`<br>
Base: `main@3139534697743494626f4940b78ac3f9d468ceb6`<br>
Risk: `ELEVATED` (alterações de Auth, RLS ou migração são HIGH_ASSURANCE quando aplicável)

## OBJECTIVE
Reiniciar somente o código de Goodz Menu do zero preservando integralmente planejamento e histórico. O primeiro incremento de código refeito é a fundação executável anteriormente denominada `GMZ-IMPL-001`, requisito técnico antes do primeiro módulo de negócio `GMZ-M01 — Platform Core & Multi-Tenancy`. Implementar código novo sem transportar o comportamento dos incrementos antigos por inércia.

## CONTEXT
Fonte canônica: Source Pack v0.1 aprovado, 110 requisitos, mapa GMZ-M00..GMZ-M28, Decisions Ledger/ADRs, Scope e DoD. `main` tinha 52/515 créditos históricos, não reaproveitáveis como prova de conclusão da nova linha de implementação. O trabalho antigo permanece visível no Git. PR #69 (catálogo) e PR #71 são legadas e **não devem ser mescladas na nova base por engano**. A nova linha deve ser isolada até auditoria.

## SOURCE CHECK / CONTEXT LOCK (snapshot inicial, não equivale a validação do executor)
- main commit: `3139534697743494626f4940b78ac3f9d468ceb6`.
- Checkpoint JSON blob: `77b8b2a7dc88d1d97f01e5889f8bf5d2d40a95e8`.
- Source Hierarchy blob: `189109435a264fe5a7306d6d10fc3ea62145dab2`.
- Decisions Ledger blob: `3e5f06879ea1e60d6be32bb89fa2955885f7ff86`.
- Module Map blob: `c70a041da273787eb0d6f3ce43a6bc3a7260eeb0`.
- Architecture blob: `a82ff873264a1ba77fa37e6914f321a48e0a75f5`.
- DoD blob: `a3d1652a7dc9edfabafcb98151b9db8aed417888`.
Revalidar fingerprint/commit antes de cada mutação. Se source governante mudou, `STALE` e STOP para rebase/recompilação do WO.

## SCOPE (NECESSARY)
1. Inventariar código/runtime/migrações/testes/CI/serviços existentes, incluindo arquivos que são apenas planejamento.
2. Manter os mesmos repositório, documentação congelada, issues e rastreabilidade, sem transferir créditos antigos.
3. Reconstruir na nova branch, do zero, `src/**` e testes de produto relacionados, sem copiar lógicas antigas; limpar migrations de domínio antigas somente após inventário e isolamento de ambientes.
4. Preparar fundação Next.js App Router + TypeScript estrito + pnpm versões fixas + Tailwind/shadcn compatível, com UI Goodz em tema claro/escuro, responsividade, estados, acessibilidade e reduced motion.
5. Preparar Supabase **local** e runtime Docker para desenvolvimento Windows, sem ligação a banco remoto, secrets reais ou migração em produção.
6. Rotas liveness/readiness sanitizadas, correlation ID, validação de ambiente; testes unitários, integração, E2E, smoke Docker, verificação de segredos.
7. Documentar passos reprodutíveis de desenvolvimento local, cobertura e evidências do HEAD exato.
8. Para `GMZ-M01`, somente após a fundação aprovada, implementar em Work Order **separado** Organization → Establishment → Branch com identidade de tenant e isolamento RLS; nenhuma tabela de negócios antes de aprovar esse limite.

## OUT OF SCOPE
Mudar visão/escopo/ideias/arquitetura aprovada; excluir issues; reescrever Git history; modificar diretamente main; apagar branches ou conteúdo histórico; alterar dados locais existentes sem backup e autorização; operar Supabase remoto; produção/deploy; cobrança/API externa; implementação de catálogo, POS, pedidos, finanças, IA, integrações ou auth/RBAC de negócio neste incremento.

## FILES/SOURCES TO READ
1. `.engineering/CHECKPOINT.json` e `.engineering/CHECKPOINT.md`;
2. `.engineering/DECISIONS-LEDGER.md`, `.engineering/SOURCE-HIERARCHY.md`, `.engineering/MODULE-MAP.md`, `.engineering/adrs/**`;
3. `docs/source-pack/{README,SCOPE,PROJECT-OVERVIEW,REQUIREMENTS,ARCHITECTURE,SECURITY,TEST-BENCHMARK-PLAN,DEPLOYMENT,DEFINITION-OF-DONE,UI-UX-DESIGN-SYSTEM}.md`;
4. `.engineering/work-orders/GMZ-IMPL-001.md` (histórico como referência contratual, não como código a preservar);
5. `src/**`, `supabase/**`, `tests/**`, `package.json`, lockfile, Docker, compose e scripts, `.github/workflows/**`.

## REQUIREMENTS
Vincular aos IDs canônicos de runtime, UX, observability, QA, security e governance listados no antigo GMZ-IMPL-001, conferindo versão vigente. Respeitar contratos já aprovados. Não alegar módulo pronto a partir de telas demonstrativas.

## ARCHITECTURE RULES
Monólito modular; isolamento tenant como pré-requisito; Supabase/PostgreSQL/Auth somente na fronteira planejada, sem service-role client-side; segredos nunca em logs; HTTP 503 na readiness indisponível, sem mascarar erro; não introduzir fallback remoto. Branch de reboot é a única superfície de escrita de código.

## CONSTRAINTS / SAFETY
- A PR do reboot inicia em `Draft`; nenhum merge, deploy, exclusão remota, cobrança ou alteração de proteção do GitHub.
- Não editar `.gef/**`, `docs/source-archive/**`, `docs/source-pack/**`, ADRs, source hierarchy ou escopo aprovado sem processo governado.
- Nunca sobrescrever checkpoint aprovado de forma antecipada; produzir apenas **Checkpoint Delta proposto**.
- Arquivos não inspecionados são `UNKNOWN`, não `VERIFIED_DEAD`; remover só o que seja explicitamente substituído no escopo do reinício, com evidência e diff limitado.
- Atualizar a branch com merge/rebase seguro; sem force push.
- Execução com agentes paralelos somente quando superfícies de escrita não se sobrepõem; nunca afirmar paralelismo simulado.

## ACCEPTANCE CRITERIA
- `git diff --name-status` prova fontes canônicas e arquivos de planejamento intocados.
- Nenhum código de domínio anterior alcançável no novo runtime; remoções/substituições documentadas por caminho.
- Clone limpo instala com lockfile frozen, testa TypeScript, lint, unit, build e smoke E2E desktop/mobile; revisão visual light/dark, reduced-motion, estados.
- Runtime Docker e Supabase **local** arrancam, respondem e encerram com comandos documentados; readiness falha fechada sem Supabase.
- Segredos e acesso cruzado ausentes; migrations antigas não atingem ambiente real.
- Evidência do HEAD final, CI relevante, aprovação técnica/segurança e zero HIGH/CRITICAL conhecidos.
- Só após auditoria objetiva permitir merge e proposta de transição do checkpoint para um progresso **novo** de 0/515 antes do novo incremento concluir, mantendo 52/515 como registro histórico da implementação substituída.

## TESTS
`pnpm install --frozen-lockfile`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`; `pnpm test:e2e`; Docker build/up/health; Supabase local start/status/stop; readiness success/failure; dependency/secret audit; arquivos canônicos SHA/diff; verificação de que dados remotos não foram tocados. Se comando não existir no novo scaffold, implementar comando equivalente antes de declarar PASS.

## DELIVERABLES
Branch com runtime e código novos, teste reproduzível, documentação local de execução, PR atualizada, Evidence Bundle (base/head/diff, comandos/resultados, falhas, limites e riscos) e Checkpoint Delta **proposto**.

## REVIEW FORMAT
Resumo PT-BR: `APPROVED | CORRECTION REQUIRED | BLOCKED`, head SHA, arquivos, checks, riscos, lacunas, evidência e STOP. Separar nitidamente histórico da versão anterior de prova da nova.

## STOP CONDITION
`GMZ_REBOOT_001_READY_FOR_OBJECTIVE_AUDIT` somente quando todas as provas de fundação e CI estiverem presentes no HEAD candidato. Antes: `IN_PROGRESS` ou `BLOCKED`. Não iniciar `GMZ-M01` enquanto este WO exigir correções/validação.

## APPROVED SCOPE AMENDMENT — LOCAL TLS PROXY

On 2026-10-27 the repository maintainer explicitly authorized implementing a local TLS proxy to remediate the two S5332 findings. This amendment is limited to the local/test development runtime on this reboot branch and supersedes the earlier instruction to preserve the TLS WIP without implementation. It does not authorize remote Supabase, production TLS, business-domain work, GMZ-M01, merge, deployment, checkpoint promotion, or changes to Sonar issue states.

- Pin Caddy to an immutable upstream image digest and serve HTTPS only for the local Supabase API at `https://localhost:56443` (native app) and `https://supabase-tls:8443` (Docker app).
- Publish the proxy host port only on `127.0.0.1` and `::1`, and keep it on the validated, dedicated Supabase bridge.
- Keep the Caddy private CA key in a Docker-managed volume. Export only the public CA root certificate to an ignored local file; expose it read-only to the app and exclude it from Git and Docker build context.
- Require certificate-chain and hostname validation in Node; no trust-all flags, HTTP fallback, remote endpoint, or hidden Sonar suppression.
- The app-to-proxy hop is encrypted. The proxy-to-Supabase Envoy/Kong hop remains HTTP inside the dedicated Docker bridge and must be disclosed as a residual boundary; do not call this end-to-end TLS.
- Acceptance requires native and Docker readiness through the trusted proxy, rejection of an untrusted CA or mismatched hostname, loopback-only proxy binding, no private key in Git/build context/app container, and fresh exact-HEAD security/CI evidence.
- Preserve the user's keyboard, actual zoom, screen-reader, and visual sign-off as pending.

Execution binding and source fingerprints for this narrow amendment are recorded in `.engineering/context-locks/GMZ-REBOOT-001.json`. The existing main checkpoint remains unchanged; this amendment binds only the open foundation PR #74.

## OPERATIONAL CONCURRENCY CONSTRAINT — ONE WORKTREE PER DOCKER ENGINE

The Compose project, Supabase project, isolated bridge, and Caddy CA volume names are fixed in this scope. Use only one Goodz Menu worktree at a time on a Docker engine until per-worktree namespacing is separately authorized; another checkout could reuse or stop these resources.
