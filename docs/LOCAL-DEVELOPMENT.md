# Desenvolvimento local do Goodz Menu

Esta branch contém a fundação executável do reboot. O preview valida somente o runtime, a experiência visual e os estados de interface; não há login, dados de negócio ou módulos operacionais.

## Pré-requisitos

- Windows 11 com Docker Desktop e engine Linux/WSL 2 iniciados;
- Node.js 24 LTS e pnpm 12.8.1;
- 8 GB de memória disponível para a stack Supabase local.

Confirme a engine com `docker info`. No Windows, os wrappers resolvem a CLI somente em locais padrão do Docker Desktop e aceitam qualquer unidade fixa local, sem exigir que seja `SystemDrive`. Primeiro consultam o inventário de volumes; caminhos em unidades não fixas são ignorados antes de qualquer inspeção do sistema de arquivos. Para candidatos locais, leem os atributos de cada componente e recusam qualquer `FILE_ATTRIBUTE_REPARSE_POINT` antes de verificar o destino final com `realpath`. A consulta usa PowerShell sem perfil ou módulos herdados e falha fechada se não conseguir confirmar o volume ou os atributos. Ela pressupõe que `SystemRoot`/`WINDIR` vieram do ambiente normal do Windows e não foram adulterados: o helper reduz erros de configuração, mas não autentica o próprio executável PowerShell nem impede uma alteração concorrente de caminhos pelo mesmo usuário. Também só aceita as named pipes locais do Docker Desktop para o engine Linux; endpoints TCP e sockets Unix são recusados, inclusive `localhost` e `127.0.0.1`, para evitar que um túnel local direcione comandos a um daemon remoto. O Goodz Menu usa o project ID `goodz-menu-reboot-001`, portas Supabase `56320–56329` e a rede `goodz-menu-reboot-001-loopback`, criada com a opção de bind padrão `127.0.0.1`. Antes de iniciar Supabase ou subir a aplicação Docker, os wrappers confirmam o driver `bridge`, a opção de bind da rede e a identidade completa dela; Supabase e Compose recebem o ID validado da rede, não uma referência resolvida novamente pelo nome. O runtime não liga um projeto Supabase remoto.

No Windows, configure também Docker Desktop em `Settings > Resources > Network > Port binding behavior` para `Localhost by default` ou `Localhost only`. O wrapper lê essa preferência antes de iniciar ou resetar a stack e verifica depois os endereços publicados pelos containers. Em `start` ou `reset`, se a configuração estiver ausente ou uma porta não estiver limitada a `127.0.0.1`/`::1`, a operação falha e o wrapper para a stack deste projeto que estiver em execução, preservando os volumes. Essa preferência é global para os projetos Docker da máquina. A opção da rede por projeto, sozinha, não garantiu bind local neste ambiente.

Use somente os wrappers `pnpm supabase:start`, `pnpm supabase:status`, `pnpm supabase:stop` e `pnpm supabase:reset`. Não invoque a CLI diretamente com `pnpm exec supabase ...`: esse caminho contorna a verificação do endpoint Docker e o preparo da rede com bind limitado ao loopback.

## Primeira inicialização e modo nativo

Na raiz do repositório, em PowerShell:

```powershell
pnpm install --frozen-lockfile
pnpm supabase:start
pnpm supabase:status
pnpm dev
```

Abra <http://127.0.0.1:3000>. O comando de desenvolvimento carrega apenas o endpoint local e a chave pública anônima do Supabase para o processo do servidor. Ele não imprime nem persiste a chave. Se o Supabase local já estiver parado quando `pnpm dev` iniciar, o app sobe sem essa configuração e `/api/ready` responde `503`; depois de iniciar o Supabase, reinicie `pnpm dev` para carregar a chave. Se a stack parar depois que o app foi configurado, `/api/ready` responde `503` até o Supabase local voltar.

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

O reset usa somente a configuração isolada desta branch. Após a confirmação, ele cria ou valida que a rede `goodz-menu-reboot-001-loopback` use o driver `bridge` e limite publicações a `127.0.0.1`; a identidade completa é reinspecionada e seu ID imutável é passado à CLI. Se a rede existente não atender às verificações, o reset falha sem alterá-la. O comando também falha se detectar uma ligação Supabase remota. Não use `docker compose down -v` nem comandos de prune para a rotina normal.

## Variáveis permitidas

`.env.example` lista somente valores locais sem segredos: `GOODZ_ENVIRONMENT`, `GOODZ_RUNTIME`, `BUILD_REVISION`, `SUPABASE_API_URL`, `SUPABASE_ANON_KEY` e a porta web. A readiness aceita loopback na execução nativa e somente `kong:8000` na execução Docker; HTTPS, hostname remoto, path adicional, usuário e senha são rejeitados. Não configure chave service-role.
