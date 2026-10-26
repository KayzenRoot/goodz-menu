# Desenvolvimento local do Goodz Menu

Esta branch contém a fundação executável do reboot. O preview valida somente o runtime, a experiência visual e os estados de interface; não há login, dados de negócio ou módulos operacionais.

## Pré-requisitos

- Windows 11 com Docker Desktop e engine Linux/WSL 2 iniciados;
- Node.js 24 LTS e pnpm 12.8.1;
- 8 GB de memória disponível para a stack Supabase local.

Confirme a engine com `docker info`. Neste setup Windows, os comandos só aceitam as named pipes locais do Docker Desktop para o engine Linux; endpoints TCP e sockets Unix são recusados, inclusive `localhost` e `127.0.0.1`, para evitar que um túnel local direcione comandos a um daemon remoto. O Goodz Menu usa o project ID `goodz-menu-reboot-001`, portas Supabase `56320–56329` e a rede `goodz-menu-reboot-001-loopback`, cuja publicação de portas fica limitada a `127.0.0.1`. O runtime não liga um projeto Supabase remoto.

## Primeira inicialização e modo nativo

Na raiz do repositório, em PowerShell:

```powershell
pnpm install --frozen-lockfile
pnpm supabase:start
pnpm supabase:status
pnpm dev
```

Abra <http://127.0.0.1:3000>. O comando de desenvolvimento carrega apenas o endpoint local e a chave pública anônima do Supabase para o processo do servidor. Ele não imprime nem persiste a chave. Se o Supabase local estiver parado, o app inicia e `/api/ready` responde `503` até a dependência ficar disponível.

## Modo Docker

Com a stack local Supabase iniciada:

```powershell
pnpm docker:up
pnpm docker:ps
Invoke-RestMethod http://127.0.0.1:3001/api/health
Invoke-RestMethod http://127.0.0.1:3001/api/ready
```

Abra <http://127.0.0.1:3001>. O Compose publica somente a aplicação no loopback. O container web e a stack Supabase usam a mesma rede Docker local; o web acessa o gateway interno em `http://kong:8000`, sem atravessar uma porta publicada no host. A chave pública fica no ambiente do container e não aparece na interface nem nos logs. Encerre o web runtime com `pnpm docker:down`; esse comando não remove volumes.

## Health e readiness

- `GET /api/health` é liveness e responde `200` sem depender do Supabase.
- `GET /api/ready` verifica `GET /auth/v1/health` no endpoint local, usando a chave pública no cabeçalho `apikey` e timeout limitado. Sem configuração ou serviço disponível, responde `503`.
- As respostas incluem ambiente permitido, revisão segura, correlation ID e `Cache-Control: no-store`. URL, chave, credenciais e erro bruto do upstream não são retornados.

## Validação

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm security:deps
pnpm security:secrets
```

O E2E usa um servidor de saúde sintético isolado em loopback; ele não precisa iniciar Supabase nem receber credenciais. As capturas light/dark desktop/mobile são gravadas em `.engineering/evidence/GMZ-REBOOT-001/screenshots/`.

## Parada e reset

`pnpm supabase:stop` para a stack e preserva os volumes. Nenhum comando executa reset implicitamente. O reset local é destrutivo e exige confirmação na sessão:

```powershell
$env:GOODZ_ALLOW_LOCAL_DB_RESET = "1"
try { pnpm supabase:reset } finally { Remove-Item Env:\GOODZ_ALLOW_LOCAL_DB_RESET -ErrorAction SilentlyContinue }
```

O reset usa somente a configuração isolada desta branch. Após a confirmação, ele cria ou valida que a rede `goodz-menu-reboot-001-loopback` limite publicações a `127.0.0.1` e passa essa rede explicitamente à CLI; se a rede existente não tiver essa opção, o reset falha sem alterá-la. O comando também falha se detectar uma ligação Supabase remota. Não use `docker compose down -v` nem comandos de prune para a rotina normal.

## Variáveis permitidas

`.env.example` lista somente valores locais sem segredos: `GOODZ_ENVIRONMENT`, `GOODZ_RUNTIME`, `BUILD_REVISION`, `SUPABASE_API_URL`, `SUPABASE_ANON_KEY` e a porta web. A readiness aceita loopback na execução nativa e somente `kong:8000` na execução Docker; HTTPS, hostname remoto, path adicional, usuário e senha são rejeitados. Não configure chave service-role.
