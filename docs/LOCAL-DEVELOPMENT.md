# Desenvolvimento local do Goodz Menu

Este repositório contém apenas a fundação visual e o runtime do Goodz Menu. O shell é uma **Foundation Preview**: ainda não há módulos de negócio, dados operacionais ou autenticação.

## Pré-requisitos

- Windows 11 com Docker Desktop iniciado e engine Linux/WSL 2 disponível;
- Node.js 24 LTS e Corepack; o campo `packageManager` fixa pnpm 12.8.1;
- pelo menos 8 GB de memória disponível para a stack local Supabase.

Confirme o runtime Docker com `docker info`. Se a engine estiver parada, abra Docker Desktop, aguarde o estado “Engine running” e repita o comando. O repositório não apaga volumes nem redefine dados automaticamente.

## Primeira inicialização

Na raiz do repositório, em PowerShell:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm supabase:start
corepack pnpm supabase:status
corepack pnpm build
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://127.0.0.1:3001/api/health
Invoke-RestMethod http://127.0.0.1:3001/api/ready
```

Abra <http://127.0.0.1:3001>. O Compose publica somente a aplicação em loopback. A porta padrão externa é 3001 para coexistir com serviços de desenvolvimento comuns em 3000. A API Supabase local permanece no host e não é publicada pelo Compose; o container web a alcança por `host.docker.internal`.

## Fluxo nativo rápido

```powershell
corepack pnpm dev
```

O modo nativo escuta apenas `127.0.0.1:3000`. Use os mesmos endpoints `/api/health` e `/api/ready`.

## Validação

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
corepack pnpm audit --audit-level high
```

O teste E2E grava capturas de tela da prévia clara e escura para desktop e mobile em `.engineering/evidence/GMZ-IMPL-001/screenshots/`.

## Parada, estado e reset

`docker compose stop` pausa o web runtime e mantém seu estado. `docker compose down` remove somente o container/rede Compose; a stack Supabase tem ciclo próprio. `corepack pnpm supabase:stop` para a stack Supabase sem apagar o banco. `corepack pnpm supabase:reset` é destrutivo para o banco local e deve ser executado intencionalmente; não use em ambientes remotos.

Não use `docker compose down -v` nem comandos de prune para a rotina normal. Nenhum comando deste guia conecta a um projeto Supabase remoto.

## Configuração

`.env.example` documenta somente nomes e valores locais sem segredo. `GOODZ_ENVIRONMENT=local` aceita apenas o endpoint local padrão ou um endpoint loopback explícito. Ambientes `staging` e `production` exigem `SUPABASE_API_URL` explícita via HTTPS. Nenhuma service-role key é usada nesta fatia.
