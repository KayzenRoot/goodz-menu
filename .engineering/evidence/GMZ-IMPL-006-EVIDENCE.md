# GMZ-IMPL-006 — Evidence Bundle

Status: `BLOCKED — dependency audit HIGH finding; objective-audit readiness not asserted`

## Candidate and preflight identity

- Repositório: `KayzenRoot/goodz-menu` (`https://github.com/KayzenRoot/goodz-menu.git`).
- Branch autorizada: `execution/gmz-impl-006-durable-audit`.
- PR: `#64`, destino `main`; manter aberta e em draft, sem merge.
- Execution base canônica: `2490ed590a6fb21f53d79b7ab7c93fee854c01ee`.
- Commit de implementação candidato: `1055bcf93a37858027165e4e177b9701ec4bdd0d`.
- Árvore Git do candidato de implementação: `520c9eeaa63d3ec4a38a9145f2c8c87a38a9f0b9`.
- O candidato descende da execution base; branch/repositório conferidos e PR existente #64 apontava para `main` antes da execução.
- Context Lock: `BOUND_FOR_EXECUTION`; as 16 fontes bloqueadas estavam `16 / 16 MATCH` no preflight, sem alteração de nenhuma delas.
- Snapshot de governança no início: `MATCH` com o bind da execution base. `CHECKPOINT.json` permanece sem mudança: crédito `44 / 515 = 8.54%`, estado de execução não promovido.
- `.gef`: `1.1.1`, estado `APPLIED / CONFIRMED`, idêntico à execution base; nenhuma alteração em `.gef`.
- A árvore de trabalho estava limpa no início. Screenshots atualizados como efeito colateral dos testes foram restaurados; não integram o candidato.

## Implementação entregue no candidato

- Migração única `20261004125938_durable_audit_events.sql`: adiciona `public.audit_events`, campos explícitos de ator/escopo/ação/alvo/resultado/motivo/correlação/origem/tempo, limites e allowlists estritas de payload, FKs compostas de tenant, índices, RLS e negação de grants diretos.
- Imutabilidade no banco: trigger `BEFORE UPDATE OR DELETE` levanta SQLSTATE `55000`, inclusive para papéis privilegiados que alcancem a tabela.
- Escrita restrita: `public.append_audit_event` é `SECURITY DEFINER` com `search_path=''`, valida o único evento admitido e tem `EXECUTE` apenas para `service_role`; o papel não recebe grants diretos na tabela. `anon` e `authenticated` não recebem leitura nem mutação direta.
- A única abstração de aplicação com service-role é `src/lib/supabase/audit-writer.server.ts`, marcada `server-only`, write-only, sem leitura de negócio/autorização e sem retorno de detalhes do provedor. A autorização continua na sessão do usuário, `auth.getUser`/claims e Data API/RLS.
- O Admin Guard persiste a decisão com o mesmo correlation ID da requisição/log. O escopo de sucesso deriva da linha da branch retornada por consulta caller-scoped sob RLS. A falha de persistência converte um allow em `audit_unavailable`; um deny continua deny.
- Metadata é exata e allowlisted (`required_permission`), com limites também no banco; entradas malformadas/extra são rejeitadas. O evento não aceita credenciais, tokens, senha, TOTP ou payload arbitrário.
- Tipos locais foram regenerados por `pnpm supabase:types`; duas gerações consecutivas resultaram em SHA-256 idêntico `4EF52B57AAED8B31712B4F83F677D635CC4D01AC7F608ED0E869030250AEF95B`.
- O E2E inspeciona localmente o evento por correlation ID. Não foi adicionado audit viewer, mutation de negócio ou fluxo remoto.

## HIGH_ASSURANCE L5 no candidato `1055bcf` / tree `520c9ee`

| Gate | Resultado |
|---|---|
| GEF 1.1.1 preflight | PASS — repositório/branch/base corretos; base ancestral; Context Lock `BOUND_FOR_EXECUTION`; `16 / 16 MATCH`; snapshot de bind `MATCH`; `.gef` aplicado/confirmado e inalterado |
| Install frozen / strict peers | PASS — `corepack pnpm install --frozen-lockfile --strict-peer-dependencies` |
| Lint / typecheck | PASS — `pnpm lint`, `pnpm typecheck` |
| Unit | PASS — `50 / 50`, 11 arquivos de teste |
| Build | PASS — build de produção Next.js `16.3.8` |
| E2E desktop/mobile | PASS na execução final — `24 / 24`, 1 worker, Playwright em modo CI; inclui Auth/session, MFA/TOTP, autorização, revogação, persistência auditável e spoof de metadata |
| Axe | PASS — as assertions Axe executadas pelos cenários acessíveis desktop/mobile não reportaram violações |
| Reset Supabase local | PASS — três migrations locais aplicadas, incluindo `20261004125938_durable_audit_events.sql` |
| pgTAP | PASS — `166 / 166`, 3 arquivos |
| Auth/Data API | PASS — `59 / 59` checks com usuários sintéticos locais; leitura enumeração e CRUD direto de audit negados para anon/autenticados |
| Migration list/status | PASS — migrations locais `20261002093358`, `20261002152627`, `20261004125938` aplicadas |
| DB lint | PASS — `public,private`, nenhum erro de schema |
| Security advisors | PASS — nenhuma issue reportada |
| Dependency audit de produção | PASS — nenhuma vulnerabilidade conhecida no grafo de produção em `high` ou acima |
| Dependency audit completo | **FAIL / BLOCKER** — uma vulnerabilidade `HIGH` não corrigida: `braces <= 3.0.3`, via `@next/eslint-plugin-next → fast-glob → micromatch → braces`; o advisory não lista versão corrigida. O achado é transitivo de desenvolvimento. Não foi feito override/upgrade fora do escopo. Referência: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/ghsa-vfj7-8cjw-p6xm). |
| Peer dependency check | PASS — strict peers instalados com lockfile congelado |
| Secret scan de fontes | PASS — 4 padrões, zero hits em 212 arquivos textuais verificados |
| Client bundle / server-only containment | PASS — zero ocorrência do valor local service-role e zero ocorrência de `SUPABASE_SERVICE_ROLE_KEY` em `.next/static` |
| Docker config/build/up | PASS — Compose válido; imagem construída com o candidato; container web `healthy`; chave do writer presente apenas no ambiente do container server |
| Health/readiness | PASS — `http://127.0.0.1:3001/api/health` HTTP `200`; `/api/ready` HTTP `200` |
| Supabase/Auth/Postgres local | PASS — API loopback; Auth health HTTP `200`; REST HTTP `200`; `pg_isready` e `SELECT 1` locais passaram |
| Runtime logs | PASS — zero hits dos padrões de segredo verificados |
| `.gef` integrity | PASS — sem diferença contra a execution base |
| CodeRabbit local | PASS — revisão NDJSON de todos os 14 arquivos textuais alterados, incluindo migration, writer e pgTAP; `0 findings` |
| SonarCloud / Socket / CodeRabbit hosted | PENDING — dependem de publicação do candidato; atualizar esta linha e a PR #64 após os checks remotos no SHA publicado |

A revisão CodeRabbit local final das alterações documentais de closeout (`CHECKPOINT.md`, Work Order e este Evidence Bundle) também concluiu com `0 findings` em todos os três arquivos. Esse resultado não altera o bloqueio do audit de dependências nem substitui os checks hospedados.

### Observações de execução E2E

Houve uma execução intermediária completa em que um fluxo de enrollment mostrou a mensagem genérica de falha, sem chamar o endpoint de enrollment do Auth; também houve tentativas abortadas enquanto o Postgres local encerrava conexões. A stack Supabase local foi reiniciada sem apagar volumes, o banco foi resetado e o cenário isolado passou. A execução completa final acima passou `24 / 24` sem retry de teste; as assertions não foram alteradas nem afrouxadas. A instabilidade observada fica registrada para a auditoria.

Uma execução pgTAP feita após o E2E falhou três assertions de contagem do seed porque o teste E2E deixa intencionalmente linhas sintéticas referenciadas por eventos imutáveis. O reset foi repetido, na ordem exigida, antes da execução final de pgTAP `166 / 166`. As assertions originais foram preservadas.

## Segurança, findings e limite de prontidão

- CRITICAL: `0`.
- HIGH: `1` no `pnpm audit` completo (`braces` transitivo de ferramenta de lint); sem versão corrigida informada pelo advisory. `pnpm audit --prod --audit-level=high` passou.
- CodeRabbit local: `0 findings`.
- A aceitação GMZ-IMPL-006 exige auditoria de dependências sem finding CRITICAL/HIGH não resolvido. Essa condição não foi satisfeita. Nenhuma dependência foi alterada, conforme o limite de escopo e a ausência de versão corrigida.
- Checks externos SonarCloud/Socket/CodeRabbit ainda precisam ser observados no SHA publicado.
- Portanto, o candidato **não** está declarado `READY_FOR_OBJECTIVE_AUDIT`; não emitir o stop token de prontidão enquanto os gates acima estiverem pendentes/bloqueados.

## Escopo não implementado e crédito

Audit viewer, Error Center, self-healing, Platform/Super Admin, POS, catálogo, estoque, pedidos, financeiro, mutations de negócio, Supabase remoto e deploy de produção permanecem fora do escopo. Não foi alterado `.gef` nem `main`; não houve merge nem force-push.

Crédito segue `44 / 515 = 8.54%`. O máximo prospectivo continua `8 / 515`, condicionado à aceitação objetiva, merge e promoção; nenhum crédito foi promovido.

## Proposta de Checkpoint Delta — não aplicada

1. Preservar o snapshot de bind e o crédito atuais.
2. Manter GMZ-IMPL-006 como execução em curso/bloqueada; não mudar para `READY_FOR_OBJECTIVE_AUDIT` enquanto o finding HIGH da auditoria completa e os checks externos não forem resolvidos.
3. Após resolver o gate sem ampliar o Work Order, executar novamente L5 no novo SHA, atualizar este bundle e só então propor a transição de estado para auditoria objetiva. Promoção de crédito continua reservada ao aceite, merge e promoção governada.

STOP CONDITION: `BLOCKED — unresolved HIGH dependency audit; objective audit readiness not reached`.
