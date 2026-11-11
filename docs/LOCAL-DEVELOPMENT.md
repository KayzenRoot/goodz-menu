# Desenvolvimento local do Goodz Menu

Esta branch contém a fundação executável do reboot. O preview valida somente o runtime, a experiência visual e os estados de interface; não há login, dados de negócio ou módulos operacionais.

## Pré-requisitos

- Windows 11 com Docker Desktop e engine Linux/WSL 2 iniciados;
- Node.js 24 LTS e pnpm 12.8.1;
- 8 GB de memória livre recomendados para a stack Supabase local; menos memória pode funcionar mais devagar.

Confirme a engine com `docker info`. No Windows, os wrappers resolvem a CLI somente em locais padrão do Docker Desktop e aceitam qualquer unidade fixa local, sem exigir que seja `SystemDrive`. Primeiro consultam o inventário de volumes; caminhos em unidades não fixas são ignorados antes de qualquer inspeção do sistema de arquivos. Para candidatos locais, leem os atributos de cada componente e recusam qualquer `FILE_ATTRIBUTE_REPARSE_POINT` antes de verificar o destino final com `realpath`. A consulta usa PowerShell sem perfil ou módulos herdados e falha fechada se não conseguir confirmar o volume ou os atributos. Ela pressupõe que `SystemRoot`/`WINDIR` vieram do ambiente normal do Windows e não foram adulterados: o helper reduz erros de configuração, mas não autentica o próprio executável PowerShell nem impede uma alteração concorrente de caminhos pelo mesmo usuário. Também só aceita as named pipes locais do Docker Desktop para o engine Linux; endpoints TCP e sockets Unix são recusados, inclusive `localhost` e `127.0.0.1`, para evitar que um túnel local direcione comandos a um daemon remoto. O Goodz Menu usa o project ID `goodz-menu-reboot-001`, portas Supabase `56320–56329` e a rede `goodz-menu-reboot-001-loopback`, criada com a opção de bind padrão `127.0.0.1`. Antes de iniciar Supabase ou subir a aplicação Docker, os wrappers confirmam o driver `bridge`, a opção de bind da rede e a identidade completa dela; Supabase e Compose recebem o ID validado da rede, não uma referência resolvida novamente pelo nome. O runtime não liga um projeto Supabase remoto.

No Windows, configure também Docker Desktop em `Settings > Resources > Network > Port binding behavior` para `Localhost by default` ou `Localhost only`. O wrapper lê essa preferência antes de iniciar ou resetar a stack e verifica os endereços publicados; se uma porta Supabase não estiver limitada a `127.0.0.1`/`::1`, a operação falha e para a stack deste projeto, preservando os volumes. Essa preferência é global para os projetos Docker da máquina. O proxy TLS publica explicitamente em `127.0.0.1:56443` e `[::1]:56443`; o wrapper confere ambos os binds e, no Windows, os listeners do host.

Use somente os wrappers `pnpm supabase:start`, `pnpm supabase:status`, `pnpm supabase:stop` e `pnpm supabase:reset`. Não invoque a CLI diretamente com `pnpm exec supabase ...`: esse caminho contorna a verificação do endpoint Docker e o preparo da rede com bind limitado ao loopback.

## Primeira inicialização e modo nativo

Na raiz do repositório, em PowerShell:

```powershell
pnpm install --frozen-lockfile
pnpm supabase:start
pnpm supabase:status
pnpm dev
```

`pnpm supabase:start` inicia o Supabase local e o proxy Caddy TLS. A CA privada permanece em um volume Docker próprio; o wrapper copia somente a raiz pública para `.local-tls/supabase-root-ca.crt`, ignorada pelo Git e excluída do contexto Docker. `pnpm dev` entrega essa raiz ao Node por `NODE_EXTRA_CA_CERTS` antes de iniciar o servidor. O app nativo usa `https://localhost:56443`; nenhuma opção de confiança irrestrita é usada. Abra <http://127.0.0.1:3000>. O processo carrega apenas o endpoint local e a chave pública anônima do Supabase; não imprime nem persiste a chave. Se o Supabase local estiver parado quando `pnpm dev` iniciar, o app sobe sem essa configuração e `/api/ready` responde `503`; depois de iniciar o Supabase, reinicie `pnpm dev` para carregar a chave. Se a stack parar enquanto o app estiver configurado, `/api/ready` responde `503` até o Supabase local voltar.

## Modo Docker

Com a stack local Supabase iniciada:

```powershell
pnpm docker:up
pnpm docker:ps
Invoke-RestMethod http://127.0.0.1:3001/api/health
Invoke-RestMethod http://127.0.0.1:3001/api/ready
```

Abra <http://127.0.0.1:3001>. O Compose publica a aplicação e o proxy TLS apenas no loopback. O container web usa `https://supabase-tls:8443` e monta somente a CA raiz pública em modo somente leitura; a chave privada da CA permanece no volume Docker do Caddy. O proxy encaminha para `kong:8000` por HTTP dentro da rede Docker dedicada e isolada. Portanto, o tráfego entre o app e o proxy é criptografado; o trecho interno entre proxy e Envoy/Kong não é TLS. A chave pública fica no ambiente do container e não aparece na interface nem nos logs. Encerre o web runtime e o proxy com `pnpm docker:down`; esse comando não remove volumes.

## Health e readiness

- `GET /api/health` é liveness e responde `200` sem depender do Supabase.
- `GET /api/ready` verifica por HTTPS `GET /auth/v1/health` no endpoint local, usando a chave pública no cabeçalho `apikey`, a CA local confiável e timeout limitado. Sem configuração, proxy, certificado confiável ou serviço disponível, responde `503`.
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

`pnpm supabase:stop` para o proxy e a stack Supabase e preserva os volumes. Nenhum comando executa reset implicitamente. O reset local é destrutivo e exige confirmação na sessão:

```powershell
$env:GOODZ_ALLOW_LOCAL_DB_RESET = "1"
try { pnpm supabase:reset } finally { Remove-Item Env:\GOODZ_ALLOW_LOCAL_DB_RESET -ErrorAction SilentlyContinue }
```

O reset usa somente a configuração isolada desta branch. Após a confirmação, ele cria ou valida que a rede `goodz-menu-reboot-001-loopback` use o driver `bridge` e limite publicações a `127.0.0.1`; a identidade completa é reinspecionada e seu ID imutável é passado à CLI. Se a rede existente não atender às verificações, o reset falha sem alterá-la. O comando também falha se detectar uma ligação Supabase remota. Não use `docker compose down -v` nem comandos de prune para a rotina normal.

## Variáveis permitidas

`.env.example` lista somente valores locais sem segredos: `GOODZ_ENVIRONMENT`, `GOODZ_RUNTIME`, `BUILD_REVISION`, `SUPABASE_API_URL`, `SUPABASE_ANON_KEY` e a porta web. A execução local aceita HTTPS somente em `localhost:56443`; Docker aceita somente `supabase-tls:8443`. HTTP fica permitido apenas para o fixture nativo isolado em ambiente `test`. Hostnames remotos, path adicional, usuário e senha são rejeitados. Não configure chave service-role.

## Isolamento entre worktrees

Use apenas uma worktree do Goodz Menu por vez em cada Docker engine. O nome do projeto Compose, o ID do projeto Supabase, a rede local e o volume da CA Caddy são fixos nesta branch; uma segunda worktree no mesmo engine poderia reutilizar ou parar esses recursos. Encerre a stack na worktree atual antes de iniciar outra.
