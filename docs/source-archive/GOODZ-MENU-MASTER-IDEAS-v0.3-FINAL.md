# Goodz Menu — Master Ideas & Vision
**Versão:** 0.3 — Final + Controlled Scope Delta 001  
**Status:** IDEATION CLOSED — Controlled Scope Delta 001 incorporated; pronto para promoção ao Blueprint/Source Pack  
**Objetivo:** Registrar integralmente as ideias discutidas para o Goodz Menu, incluindo expansões e novas propostas, antes da criação do Source Pack definitivo.

---

# 1. Visão do produto

O **Goodz Menu** nasce inicialmente para uso próprio em uma pastelaria, mas deve ser arquitetado desde o início para evoluir para um **micro SaaS universal para estabelecimentos de alimentação e comércio**, incluindo:

- pastelarias;
- hamburguerias;
- pizzarias;
- restaurantes;
- lanchonetes;
- padarias;
- cafés;
- food trucks;
- cozinhas de delivery;
- pequenos comércios que precisem de PDV, estoque, financeiro e vendas online.

A visão não é criar apenas um PDV. O Goodz Menu deve se tornar um **sistema operacional inteligente para o estabelecimento**, centralizando:

- vendas;
- PDV;
- caixa;
- produtos;
- insumos;
- fichas técnicas;
- estoque;
- compras;
- fornecedores;
- contas a pagar;
- contas a receber;
- fiado;
- fluxo de caixa;
- DRE gerencial;
- delivery próprio;
- vendas online;
- canais externos;
- CRM;
- marketing;
- relatórios;
- dashboards;
- inteligência artificial;
- planejamento;
- projeções;
- recomendações;
- crescimento do negócio.

Princípio central:

> O Goodz Menu não deve apenas registrar o que aconteceu. Ele deve ajudar o empresário a entender o negócio, prever problemas, encontrar oportunidades e decidir o que fazer a seguir.

---

# 2. Posicionamento

Definição inicial do produto:

> **Goodz Menu é uma plataforma inteligente de operação e crescimento para food businesses, com comércio omnichannel, gestão financeira, estoque, delivery, CRM, marketing e um sistema de inteligência que entende, prevê, explica e recomenda decisões para o negócio.**

A IA deve ser o principal diferencial competitivo.

O Goodz Menu não deve ser apresentado como “um PDV com IA”.

A ideia é que o sistema possua um **motor Goodz de inteligência empresarial**, capaz de:

- observar;
- calcular;
- cruzar dados;
- explicar;
- prever;
- simular;
- alertar;
- recomendar;
- acompanhar metas;
- sugerir ações.

---

# 3. Princípios de arquitetura

## 3.1 Multi-tenant desde o início

Mesmo com apenas um estabelecimento no começo, o sistema deve nascer preparado para múltiplas empresas.

Estrutura conceitual:

```text
Organization
│
├── Establishment
│   ├── Branch
│   ├── Users
│   ├── Products
│   ├── Ingredients
│   ├── Inventory
│   ├── Sales
│   ├── Finance
│   ├── Customers
│   └── Integrations
│
└── SaaS Configuration
```

Entidades principais devem possuir isolamento por organização/estabelecimento.

O banco deve ser preparado para:

- múltiplos clientes;
- múltiplas filiais;
- usuários por empresa;
- papéis e permissões;
- isolamento de dados;
- expansão futura para SaaS.

## 3.2 Stack inicial proposta

- **Frontend:** Next.js + TypeScript
- **UI:** Tailwind CSS + shadcn/ui ou equivalente
- **Banco:** Supabase PostgreSQL
- **Autenticação:** Supabase Auth
- **Realtime:** Supabase Realtime quando necessário
- **Backend:** Server Actions, APIs e funções server-side
- **Imagens:** camada abstrata de mídia, inicialmente Cloudinary ou Cloudflare R2
- **Deploy:** Vercel ou infraestrutura equivalente
- **Observabilidade:** Sentry ou equivalente
- **Gráficos:** Recharts ou equivalente
- **PDF:** geração server-side
- **Planilhas/exports:** CSV/XLSX
- **IA:** provider abstraction para evitar dependência de um único modelo
- **RAG/memória:** PostgreSQL + pgvector quando fizer sentido

Nenhum limite de plano gratuito deve ser tratado como verdade permanente. Custos e cotas devem ser validados no momento da implementação.

## 3.3 Truth Layer

Cálculos financeiros importantes não devem ser feitos “na cabeça” do LLM.

A arquitetura deve separar:

```text
TRUTH LAYER
- cálculos
- regras
- métricas
- saldos
- margens
- custos
- impostos
- estoque
- fluxo de caixa
- indicadores

AI LAYER
- interpretação
- explicação
- linguagem natural
- hipóteses
- recomendações
- comparação de cenários

DECISION LAYER
- ações sugeridas
- aprovação do usuário
- trilha de auditoria
```

Princípio:

> IA interpreta e recomenda. Valores financeiros oficiais vêm de mecanismos determinísticos.

---

# 4. Goodz POS — PDV balcão

O PDV deve priorizar velocidade.

Fluxo desejado:

> localizar produto → adicionar → cobrar → concluir.

Recursos:

- pesquisa instantânea;
- categorias;
- favoritos;
- touchscreen;
- atalhos de teclado;
- leitor de código de barras;
- carrinho;
- quantidade;
- observações;
- complementos;
- adicionais;
- descontos;
- acréscimos;
- cliente;
- troco;
- pagamento dividido;
- PIX;
- dinheiro;
- débito;
- crédito;
- fiado;
- cancelamento;
- reimpressão;
- histórico de vendas;
- venda suspensa;
- múltiplos operadores;
- permissões por operação;
- auditoria de cancelamentos e descontos.

---

# 5. Caixa

Cada operador poderá abrir um turno de caixa.

Exemplo:

```text
ABERTURA
R$ 150,00

VENDAS
R$ 1.842,00

Dinheiro    R$ 620,00
PIX         R$ 722,00
Débito      R$ 300,00
Crédito     R$ 200,00

SANGRIAS
R$ 400,00

CAIXA ESPERADO
R$ 370,00

CAIXA CONTADO
R$ 365,00

DIFERENÇA
-R$ 5,00
```

Recursos:

- abertura;
- fechamento;
- sangria;
- suprimento;
- diferença;
- auditoria;
- operador responsável;
- justificativa;
- fechamento cego opcional;
- conferência;
- histórico.

---

# 6. Produtos

Cadastro completo de produtos.

Campos e recursos previstos:

- nome;
- nome interno;
- descrição;
- descrição comercial;
- fotos;
- galeria;
- categoria;
- subcategoria;
- SKU;
- EAN/código de barras;
- unidade;
- preço;
- preço promocional;
- custo;
- margem;
- markup;
- variantes;
- tamanhos;
- sabores;
- adicionais;
- complementos;
- combos;
- tempo de preparo;
- disponibilidade;
- estoque mínimo;
- estoque máximo;
- tags;
- canal de venda;
- ordem de exibição;
- destaque;
- alergênicos;
- informação nutricional futura;
- status ativo/inativo;
- histórico de preços;
- histórico de custo;
- rentabilidade por canal.

Tipos de produto:

- simples;
- com receita;
- com variantes;
- combo;
- kit;
- serviço;
- produzido;
- revendido.

---

# 7. Insumos

Cadastro de insumos deve ser detalhado.

Campos:

- nome;
- foto;
- categoria;
- marca;
- fornecedor principal;
- fornecedores alternativos;
- unidade de compra;
- unidade de estoque;
- unidade de utilização;
- conversões;
- preço da última compra;
- preço médio;
- mínimo histórico;
- máximo histórico;
- quantidade atual;
- estoque mínimo;
- estoque ideal;
- lote;
- validade;
- fator de correção;
- rendimento;
- perda média;
- embalagem;
- localização no estoque;
- observações;
- código interno.

Exemplo:

```text
Queijo mussarela

Compra: peça 4 kg
Estoque: gramas
Uso: gramas

Preço da peça: R$ 128
Custo: R$ 32/kg
Custo: R$ 0,032/g
```

---

# 8. Ficha técnica / Receita

Produto e insumo devem ser entidades separadas.

Exemplo de ficha:

```text
Pastel carne com queijo

1 massa
90 g carne
40 g queijo
8 ml óleo equivalente
1 embalagem
2 guardanapos
```

A ficha técnica deve permitir:

- quantidade;
- unidade;
- rendimento;
- perdas;
- sub-receitas;
- ingredientes opcionais;
- variantes;
- substituições;
- adicionais;
- embalagem;
- custo estimado;
- custo real;
- histórico de custo.

Mudança de preço de insumo deve recalcular:

- custo da ficha;
- custo do produto;
- margem;
- markup;
- lucro esperado.

---

# 9. Goodz Margin DNA™

Tecnologia proprietária para construir o “DNA econômico” de cada produto.

Exemplo:

```text
PASTEL DE CARNE

Ingredientes ........ R$ 3,40
Embalagem ........... R$ 0,52
Perda estimada ...... R$ 0,18
Energia estimada .... R$ 0,23
Mão de obra rateada . R$ X,XX

Custo econômico ..... R$ X,XX
```

Depois por canal:

```text
BALCÃO
Venda ............... R$ 12,00
Margem .............. R$ ...

GOODZ ONLINE
Venda ............... R$ 13,90
Taxas ............... R$ ...
Margem .............. R$ ...

IFOOD
Venda ............... R$ 16,90
Taxas ............... R$ ...
Margem líquida ...... R$ ...

99FOOD
Venda ............... R$ 15,90
Taxas ............... R$ ...
Margem líquida ...... R$ ...
```

A tecnologia permitirá:

- preço recomendado por canal;
- margem mínima desejada;
- alerta de produto deficitário;
- simulação de reajuste;
- análise de sensibilidade;
- rentabilidade real por produto;
- comparação entre canais.

---

# 10. Preços por canal

Um produto deve existir uma única vez.

O preço e a oferta são atributos por canal.

Canais iniciais:

- balcão;
- Goodz Online;
- WhatsApp;
- iFood;
- 99Food;
- delivery próprio;
- futuros marketplaces.

Cada oferta de canal poderá conter:

- preço;
- preço promocional;
- disponibilidade;
- prazo;
- adicionais;
- complementos;
- visibilidade;
- comissão;
- taxa;
- embalagem específica;
- custo extra;
- markup;
- margem mínima.

---

# 11. Goodz Orders — Central universal de pedidos

Todos os pedidos devem convergir para uma central.

```text
BALCÃO ────────┐
IFOOD ─────────┤
99FOOD ────────┤
GOODZ ONLINE ──┤──> GOODZ ORDERS
WHATSAPP ──────┤
DELIVERY ──────┘
```

Status:

- recebido;
- aguardando confirmação;
- aceito;
- em preparo;
- pronto;
- aguardando retirada;
- aguardando entregador;
- saiu para entrega;
- entregue;
- cancelado.

---

# 12. Integration Hub

Criar uma camada de integração desacoplada.

```text
Goodz Integration Hub
├── iFood Adapter
├── 99Food Adapter
├── Goodz Online Adapter
├── WhatsApp Adapter
├── Payment Adapter
└── Future Adapter
```

Objetivos:

- não espalhar código específico de plataforma;
- trocar integrações sem alterar o core;
- controlar versões;
- registrar falhas;
- retry;
- idempotência;
- observabilidade;
- sincronização.

---

# 13. Goodz Online — Menu e pedidos no site

Cada estabelecimento poderá possuir uma loja online.

Possibilidades futuras:

```text
goodz.menu/nome-do-estabelecimento
```

e domínio próprio.

Fluxo:

> cardápio → produto → personalização → carrinho → endereço/retirada → pagamento → pedido → acompanhamento.

Configurações:

- logo;
- capa;
- cores;
- fontes;
- horários;
- categorias;
- banners;
- promoções;
- produtos em destaque;
- taxas;
- regiões;
- pedido mínimo;
- retirada;
- entrega;
- agendamento;
- cupom;
- pagamento.

---

# 14. Goodz Adaptive Storefront™

O menu online não deve ser um único template com mudança de cor.

Deve existir um **motor de storefronts configuráveis**.

Modelos possíveis:

- Classic Menu;
- Visual Food;
- Fast Order;
- Premium Restaurant;
- Street Food;
- Minimal;
- Catalog;
- Story Menu;
- Dark Kitchen;
- Coffee Shop;
- Bakery;
- Pizzeria;
- Burger House.

Estrutura:

```text
Theme
├── Design Tokens
│   ├── Colors
│   ├── Typography
│   ├── Radius
│   ├── Shadows
│   └── Spacing
│
├── Layout
│   ├── Header
│   ├── Hero
│   ├── Categories
│   ├── Products
│   ├── Promotions
│   └── Footer
│
├── Component Variants
└── Commerce Engine
```

O comerciante poderá escolher:

- layout;
- estilo de card;
- posição das categorias;
- cabeçalho;
- hero;
- arredondamento;
- densidade;
- comportamento de navegação;
- banners;
- estilo do carrinho;
- estilo de checkout.

Não permitir CSS arbitrário na versão SaaS padrão. A personalização deve ocorrer por schemas, tokens e variantes para manter qualidade e segurança.

---

# 15. Goodz AI Designer™

IA de personalização visual.

Entrada:

- logo;
- fotos;
- categoria do negócio;
- estilo desejado;
- público;
- referências;
- tom da marca.

Saída:

- paleta;
- tipografia;
- layout;
- hero;
- banners;
- categorias;
- estilo dos produtos;
- copy;
- proposta de identidade.

A IA pode oferecer três propostas visuais para escolha.

---

# 16. Goodz Media Intelligence™

Camada de mídia independente de fornecedor.

Responsabilidades:

- upload;
- otimização;
- thumbnail;
- crop;
- compressão;
- WebP/AVIF;
- versões mobile/desktop;
- preview;
- banner;
- compartilhamento;
- campanhas;
- remoção de fundo futura;
- melhoria automática futura;
- detecção de imagem inadequada.

O banco guarda metadados e URLs, não arquivos binários pesados.

---

# 17. Delivery próprio

Módulo completo de delivery.

Recursos:

- zonas;
- bairros;
- distância;
- taxa fixa;
- taxa por região;
- taxa por distância;
- pedido mínimo;
- previsão;
- entregador;
- forma de pagamento;
- troco;
- PIX;
- observações;
- histórico;
- cancelamentos;
- fila de entregas;
- despacho;
- rota futura;
- rastreamento futuro;
- painel do entregador futuro.

---

# 18. Clientes / CRM

Cadastro de clientes:

- nome;
- telefone;
- e-mail;
- endereço;
- aniversário;
- primeira compra;
- última compra;
- número de pedidos;
- ticket médio;
- total gasto;
- produtos favoritos;
- canal preferido;
- consentimentos;
- segmentos;
- cupons;
- campanhas;
- histórico de contato.

Segmentos:

- VIP;
- novos;
- alto ticket;
- inativos;
- recorrentes;
- fim de semana;
- balcão;
- delivery;
- canal;
- produto favorito;
- risco de abandono.

---

# 19. Fiado / contas a receber

Fiado deve ser tratado como módulo financeiro sério.

Cliente poderá ter:

- limite;
- saldo;
- histórico;
- prazo;
- vencimento;
- pagamentos parciais;
- inadimplência;
- bloqueio opcional;
- extrato;
- lembrete;
- observação;
- aprovação do responsável.

---

# 20. Compras e fornecedores

Compra cadastrada deve gerar automaticamente:

- entrada de estoque;
- atualização de custo;
- histórico de fornecedor;
- conta a pagar;
- atualização de margem;
- atualização de ficha técnica.

Cadastro de fornecedor:

- dados;
- contatos;
- categorias;
- produtos fornecidos;
- tabela de preço;
- prazo;
- condições;
- histórico;
- pontualidade;
- qualidade;
- aumentos de preço;
- observações.

---

# 21. Estoque por ledger

O estoque não deve depender apenas de um campo de quantidade.

Criar ledger de movimentações:

```text
+10 kg compra
-0,09 kg venda
-0,50 kg perda
+2 kg ajuste
```

Tipos:

- compra;
- consumo;
- venda;
- produção;
- perda;
- quebra;
- vencimento;
- ajuste;
- inventário;
- transferência;
- devolução.

Benefícios:

- auditoria;
- rastreabilidade;
- reconstrução;
- investigação de divergência.

---

# 22. Goodz Smart Stock™

Comparar estoque teórico x estoque físico.

Exemplo:

```text
Teórico: 12,4 kg
Físico:   9,8 kg
Diferença: -2,6 kg
```

Possíveis causas:

- perda não registrada;
- porção acima da ficha;
- erro de entrada;
- inventário incorreto;
- desperdício;
- consumo interno;
- desvio.

A IA deve identificar anomalias e padrões, sem acusar pessoas automaticamente.

---

# 23. Contas a pagar

Categorias:

- aluguel;
- energia;
- água;
- internet;
- fornecedores;
- funcionários;
- impostos;
- manutenção;
- marketing;
- software;
- embalagens;
- taxas;
- empréstimos;
- investimentos;
- outros.

Campos:

- vencimento;
- recorrência;
- centro de custo;
- fornecedor;
- comprovante;
- forma de pagamento;
- parcelas;
- situação;
- juros;
- descontos;
- categoria;
- subcategoria;
- prioridade operacional;
- criticidade.

---

# 24. Contas a receber

Incluir:

- vendas;
- fiado;
- recebíveis de cartão;
- marketplace;
- repasses;
- outros créditos;
- parcelamentos;
- previsões;
- conciliação.

---

# 25. Centro de custos e rateio

Nova ideia adicionada.

O Goodz deve calcular não apenas ingredientes, mas também custos indiretos.

Centros de custo:

- cozinha;
- balcão;
- delivery;
- administrativo;
- marketing;
- infraestrutura;
- pessoal;
- tecnologia.

Custos rateáveis:

- energia;
- água;
- gás quando aplicável;
- aluguel;
- internet;
- folha;
- manutenção;
- depreciação;
- software;
- limpeza;
- embalagens indiretas;
- taxas.

Modelos de rateio:

- por faturamento;
- por pedido;
- por produto;
- por tempo;
- por área;
- por consumo estimado;
- manual.

---

# 26. Fechamento Econômico Diário

Funcionalidade solicitada para responder:

> “Vendi R$ 1.000 hoje. Quanto disso realmente é meu?”

O sistema deve separar faturamento de resultado.

Exemplo:

```text
FATURAMENTO DO DIA
R$ 1.000,00

(-) CMV / insumos consumidos
R$ 280,00

(-) Embalagens
R$ 40,00

(-) Taxas de pagamento
R$ 24,00

(-) Taxas de marketplaces
R$ 35,00

(-) Energia rateada
R$ 28,00

(-) Água rateada
R$ 8,00

(-) Aluguel rateado
R$ 45,00

(-) Mão de obra rateada
R$ 120,00

(-) Software / infraestrutura
R$ 10,00

(-) Tributos provisionados
R$ 60,00

RESULTADO OPERACIONAL ESTIMADO
R$ 350,00
```

Os valores acima são apenas exemplo. O sistema deve usar dados reais/configurados.

---

# 27. Goodz Profit Router™

Nova tecnologia proprietária.

Objetivo:

> transformar o lucro apurado em um plano de destinação do dinheiro.

O usuário poderá definir políticas de separação.

Exemplo:

```text
RESULTADO DISPONÍVEL
R$ 350,00

Reserva operacional ........ 20%
Reposição de estoque ....... 25%
Capital de giro ............ 15%
Impostos futuros ........... 10%
Reinvestimento no negócio .. 15%
Pró-labore .................. 10%
Investimentos externos ..... 5%
```

Ou a IA poderá propor percentuais com base em:

- caixa atual;
- estoque;
- contas futuras;
- sazonalidade;
- dívida;
- reserva mínima;
- projeção de vendas;
- risco;
- metas;
- histórico.

Princípio:

> o sistema sugere a destinação; o proprietário aprova.

---

# 28. Goodz Money Buckets™

Nova ideia.

Criar “caixinhas” financeiras virtuais.

Exemplos:

- Insumos;
- Energia;
- Água;
- Aluguel;
- Impostos;
- Folha;
- Emergência;
- Capital de giro;
- Marketing;
- Expansão;
- Equipamentos;
- Pró-labore;
- Investimentos.

O fechamento diário pode provisionar automaticamente valores contábeis internos para cada bucket.

Exemplo:

```text
Venda líquida disponível: R$ 1.000

Bucket Insumos ........ R$ 280
Bucket Estrutura ...... R$ 110
Bucket Impostos ....... R$ 60
Bucket Capital Giro ... R$ 150
Bucket Expansão ....... R$ 100
Bucket Investimentos .. R$ 100
Bucket Lucro Livre .... R$ 200
```

No início isso pode ser apenas um controle interno do sistema.

Futuramente pode integrar com contas bancárias, carteiras ou instituições, sempre com autorização explícita.

---

# 29. Goodz Reserve Guard™

Nova tecnologia proprietária.

O Goodz deve calcular uma **reserva operacional mínima** antes de considerar dinheiro como “livre para investir”.

Fatores:

- despesas fixas;
- estoque necessário;
- contas dos próximos dias;
- sazonalidade;
- volatilidade de vendas;
- prazo de recebíveis;
- risco de imprevistos;
- metas do proprietário.

Estados:

```text
Reserva abaixo do mínimo  🔴
Reserva em formação       🟡
Reserva adequada          🟢
Excesso de caixa          🔵
```

A IA nunca deve recomendar comprometer a reserva crítica sem destacar claramente o impacto.

---

# 30. Goodz Treasury Copilot™

Nova tecnologia proprietária.

Será o braço da IA responsável por:

- fechamento do dia;
- separação;
- capital de giro;
- provisões;
- reservas;
- reinvestimento;
- liquidez;
- caixa ocioso;
- análise de oportunidades externas.

Perguntas que deverá responder:

- Quanto do faturamento de hoje é realmente lucro?
- Quanto precisa ficar reservado?
- Quanto posso retirar?
- Quanto posso reinvestir na empresa?
- Quanto pode ser destinado para investimento externo?
- Tenho dinheiro parado?
- Tenho risco de falta de caixa?
- Quanto devo deixar líquido para os próximos 7/15/30 dias?

---

# 31. Goodz Capital Ladder™

Nova ideia.

Organizar a destinação financeira em camadas de prioridade.

Exemplo:

```text
NÍVEL 1 — SOBREVIVÊNCIA
contas críticas
estoque essencial
impostos
folha
reserva operacional

NÍVEL 2 — ESTABILIDADE
capital de giro
fundo de emergência
manutenção

NÍVEL 3 — CRESCIMENTO
marketing
equipamentos
expansão
melhoria operacional

NÍVEL 4 — PATRIMÔNIO
renda fixa
dólar
ações
ETFs
cripto
outros investimentos
```

A inteligência pode dizer em qual nível o estabelecimento está.

---

# 32. Goodz Opportunity Radar™

Nova tecnologia proposta para pesquisar oportunidades de investimento.

O sistema poderá consultar fontes externas atualizadas e analisar diferentes classes de ativos, como:

- renda fixa;
- Tesouro;
- CDBs;
- fundos;
- dólar;
- ações brasileiras;
- ETFs brasileiros;
- ações americanas;
- ETFs americanos;
- Bitcoin;
- Ethereum;
- outras criptomoedas;
- stablecoins;
- pools de liquidez;
- staking;
- produtos de rendimento;
- outras classes futuramente suportadas.

A consulta deverá considerar:

- liquidez;
- volatilidade;
- risco;
- prazo;
- taxas;
- tributação;
- exposição cambial;
- concentração;
- contexto macroeconômico;
- necessidade de caixa;
- perfil definido pelo usuário;
- horizonte;
- reserva operacional;
- políticas internas.

---

# 33. Modo de recomendação de investimentos

A intenção é permitir que o usuário pergunte:

> “Sobrou R$ 200 hoje. Onde faz mais sentido alocar?”

O Goodz poderá responder com **cenários e opções comparáveis**, por exemplo:

```text
Capital disponível para investimento:
R$ 200

Reserva operacional:
adequada

Horizonte:
longo prazo

Opções pesquisadas hoje:

A) Liquidez / baixo risco
B) Renda variável
C) Exposição internacional
D) Cripto
E) Reinvestimento no próprio negócio
```

O sistema poderá sugerir uma distribuição, mas toda sugestão deve conter:

- motivo;
- riscos;
- fonte dos dados;
- data/hora da informação;
- liquidez;
- custos;
- impacto no caixa;
- cenário adverso;
- concentração;
- alternativas.

Nenhuma compra deve ser executada automaticamente por padrão.

---

# 34. Guardrails de investimento

A IA financeira precisa ser útil sem virar uma caixa-preta perigosa.

Regras propostas:

1. **Nunca tratar lucro contábil como caixa imediatamente disponível.**
2. **Separar provisões antes de investimentos.**
3. **Manter reserva operacional configurável.**
4. **Não investir automaticamente sem autorização explícita.**
5. **Não usar crédito de curto prazo para comprar ativos voláteis por padrão.**
6. **Mostrar riscos e possíveis perdas.**
7. **Registrar a fonte dos preços e dados externos.**
8. **Distinguir fatos de projeções.**
9. **Usar linguagem probabilística para cenários futuros.**
10. **Exibir concentração total da carteira.**
11. **Considerar liquidez necessária do negócio.**
12. **Guardar trilha de auditoria de recomendações.**

---

# 35. Goodz Portfolio View™

Nova ideia.

Painel patrimonial do estabelecimento/proprietário, opcionalmente separado da contabilidade operacional.

Categorias:

- caixa;
- reservas;
- contas;
- renda fixa;
- dólar;
- ações;
- ETFs;
- cripto;
- stablecoins;
- pools de liquidez;
- outros.

Visualizações:

- valor total;
- alocação;
- exposição por moeda;
- exposição por risco;
- liquidez;
- rentabilidade;
- concentração;
- histórico.

O usuário decide se patrimônio empresarial, pessoal ou ambos serão conectados.

---

# 36. Goodz Crypto & Web3 Layer™

Como expansão futura, preparar integrações para:

- exchanges;
- carteiras;
- dados on-chain;
- protocolos DeFi;
- pools de liquidez;
- staking;
- yield;
- stablecoins;
- bridges;
- posições LP;
- impermanent loss;
- taxas;
- risco de protocolo.

O Goodz deve conseguir mostrar:

```text
Posição
Capital
Rendimento
Taxas recebidas
Impermanent loss
Variação do ativo
Resultado líquido
Risco
```

Antes de integração de execução, começar em modo de leitura/análise.

---

# 37. Goodz Investment Research Agent™

Nova ideia.

Agente especializado em pesquisa atualizada.

Funções:

- buscar informações públicas;
- comparar ativos;
- consultar preços;
- consultar fundamentos;
- consultar taxas;
- consultar indicadores;
- ler notícias relevantes;
- detectar eventos;
- resumir riscos;
- comparar alternativas;
- produzir relatório.

A saída deverá ser consumida pelo Treasury Copilot.

Arquitetura:

```text
Internet / APIs / Market Data
        ↓
Investment Research Agent
        ↓
Risk & Fact Validation
        ↓
Treasury Copilot
        ↓
Recommendation
        ↓
User Approval
```

---

# 38. Goodz Risk Engine™

Nova tecnologia própria.

Antes de sugerir qualquer investimento, calcular:

- risco de liquidez;
- risco de mercado;
- risco de contraparte;
- risco cambial;
- risco de protocolo;
- risco de concentração;
- volatilidade;
- prazo;
- impacto no capital de giro.

Classificações podem ser apresentadas de forma explicável.

---

# 39. Goodz Reinvestment Optimizer™

Nova ideia.

A IA deve comparar investimento externo com reinvestimento no próprio negócio.

Exemplo:

> Investir R$ 2.000 em marketing pode gerar mais retorno esperado que aplicar R$ 2.000 em outro ativo?

Ou:

> Comprar uma nova fritadeira reduziria gargalos e aumentaria capacidade?

Cenários comparáveis:

```text
OPÇÃO A
Reinvestir no negócio

OPÇÃO B
Reserva líquida

OPÇÃO C
Ativo financeiro

OPÇÃO D
Marketing

OPÇÃO E
Redução de dívida
```

O objetivo é analisar custo de oportunidade.

---

# 40. Goodz Intelligence Core™

Coração da inteligência.

Submódulos:

- Financial AI;
- Stock AI;
- Purchasing AI;
- Pricing AI;
- Sales AI;
- Customer AI;
- Marketing AI;
- Delivery AI;
- Investment AI;
- Planning AI.

Responsabilidades:

- interpretar;
- explicar;
- recomendar;
- conversar;
- gerar insights;
- produzir alertas;
- identificar anomalias;
- comparar cenários.

---

# 41. Goodz Business Twin™

Gêmeo digital do negócio.

O sistema conhece:

- vendas;
- canais;
- margens;
- fornecedores;
- despesas;
- estoque;
- clientes;
- horários;
- sazonalidade;
- recebíveis;
- contas;
- entregas;
- metas.

Permite simulações:

- aumentar preço;
- criar promoção;
- mudar fornecedor;
- contratar funcionário;
- comprar equipamento;
- reduzir horário;
- abrir nova unidade;
- mudar taxa de entrega;
- aumentar investimento em marketing;
- modificar mix de canais.

---

# 42. Goodz Decision Graph™

Tecnologia para explicar relações de causa e efeito.

Exemplo:

```text
Preço da mussarela ↑
      ↓
Custo da receita ↑
      ↓
Margem do produto ↓
      ↓
Lucro ↓
```

Outro:

```text
Delivery marketplace ↑
      ↓
Taxas ↑
      ↓
Margem líquida ↓
```

Objetivo:

> responder não apenas “o que aconteceu”, mas “por que aconteceu”.

---

# 43. Goodz Demand Pulse™

Previsão de demanda.

Variáveis futuras:

- dia da semana;
- horário;
- mês;
- feriado;
- eventos;
- clima;
- histórico;
- promoções;
- sazonalidade;
- canal;
- tendência.

Saída:

- pedidos esperados;
- unidades;
- insumos;
- estoque;
- equipe;
- compra.

---

# 44. Goodz Cash Guardian™

Monitor financeiro.

Acompanhar:

- caixa;
- contas;
- recebíveis;
- estoque;
- compras;
- vendas projetadas;
- reserva;
- compromissos.

Indicadores:

```text
Caixa ................ 🟢
Próximos 7 dias ...... 🟢
15 dias .............. 🟡
30 dias .............. 🟡
Estoque .............. 🟢
Margem ............... 🟡
```

---

# 45. Goodz Early Warning™

Radar preventivo.

Alertas possíveis:

- margem caindo;
- fornecedor aumentando preço;
- gasto anormal;
- conta vencendo;
- estoque crítico;
- caixa futuro negativo;
- queda de vendas;
- concentração em marketplace;
- desperdício elevado;
- produto deficitário;
- inadimplência crescendo;
- campanha sem retorno.

---

# 46. Goodz Goal Engine™

Metas:

- faturamento;
- margem;
- reserva;
- ticket;
- lucro;
- desperdício;
- crescimento;
- retenção;
- delivery;
- estoque;
- investimento.

Exemplo:

```text
META
R$ 50.000/mês

Atual:
R$ 37.420

Projeção:
R$ 47.850

Gap:
-R$ 2.150
```

A IA deverá explicar quais fatores estão desviando a meta.

---

# 47. Goodz Growth Lab™

Laboratório de cenários.

Perguntas:

- E se eu der 10% de desconto?
- E se eu criar um combo?
- E se aumentar R$ 2 no iFood?
- E se der frete grátis?
- E se mudar horário?
- E se contratar?
- E se investir R$ 1.000 em tráfego?

A saída é uma simulação, nunca certeza.

---

# 48. Goodz Customer Brain™

Perfil comportamental de clientes.

Indicadores:

- recência;
- frequência;
- ticket;
- produtos;
- horários;
- canais;
- resposta a promoções;
- cupons;
- churn.

O sistema poderá identificar:

- clientes fiéis;
- alto valor;
- risco de abandono;
- propensão de recompra;
- preferência de canal.

---

# 49. Goodz Growth Engine™

Futuro motor de marketing.

```text
CRM
 ↓
Segmentação
 ↓
Goodz AI
 ↓
Campanha
 ├── WhatsApp
 ├── Email
 ├── Push
 └── Cupons
 ↓
Venda
 ↓
ROI
```

Objetivo:

> medir resultado econômico, não apenas quantidade de mensagens enviadas.

---

# 50. WhatsApp

Fase inicial:

- link para pedido;
- contato;
- compartilhamento de carrinho;
- status.

Fases futuras:

- WhatsApp Business Platform;
- mensagens transacionais;
- recuperação de carrinho;
- campanhas;
- atendimento;
- segmentação;
- automação;
- consentimento;
- opt-out;
- LGPD.

---

# 51. E-mail marketing

Futuro:

- campanhas;
- segmentação;
- automações;
- aniversário;
- reativação;
- pós-compra;
- promoções;
- cupons;
- newsletters;
- relatórios.

---

# 52. Relatórios

Criar motor de relatórios.

Dimensões:

- período;
- produto;
- categoria;
- canal;
- cliente;
- fornecedor;
- operador;
- pagamento;
- unidade;
- horário;
- campanha.

Relatórios prontos:

- vendas;
- produto;
- categoria;
- margem;
- CMV;
- custo médio;
- desperdício;
- compras;
- fornecedores;
- variação de preços;
- estoque;
- giro;
- curva ABC;
- contas a pagar;
- contas a receber;
- fluxo de caixa;
- DRE;
- inadimplência;
- ticket médio;
- forma de pagamento;
- fechamento de caixa;
- canal;
- delivery;
- lucratividade por canal;
- rentabilidade de campanha;
- rentabilidade de cliente;
- fechamento diário econômico.

Exports:

- PDF;
- Excel;
- CSV.

---

# 53. Dashboard

Blocos:

## Agora
- faturamento;
- pedidos;
- ticket;
- lucro estimado;
- caixa;
- vendas por canal.

## Financeiro
- contas;
- receber;
- pagar;
- vencidas;
- fluxo;
- projeção;
- DRE.

## Operação
- estoque crítico;
- compras;
- perdas;
- produtividade.

## Comercial
- produtos;
- horários;
- canais;
- clientes;
- promoções.

## Goodz AI
- problemas;
- oportunidades;
- compras;
- contas;
- crescimento;
- recomendações.

## Patrimônio
- reservas;
- capital disponível;
- buckets;
- investimentos;
- rentabilidade.

---

# 54. Goodz Explainable AI™

Toda recomendação relevante deverá mostrar:

- recomendação;
- motivo;
- dados usados;
- período analisado;
- impacto estimado;
- confiança;
- riscos;
- ação possível.

Exemplo:

```text
Recomendação:
reduzir compra de mussarela.

Motivo:
estoque atual + demanda prevista cobre 9 dias.

Impacto:
aprox. R$ 420 menos capital parado.

Confiança:
Alta.
```

---

# 55. Memória do estabelecimento

A IA precisa possuir contexto persistente sobre o negócio.

Separar:

## Dados estruturados
PostgreSQL normal.

## Conhecimento textual/contextual
RAG / pgvector quando necessário.

Nunca usar busca vetorial como fonte oficial para saldo, faturamento, estoque ou valores financeiros.

---

# 56. Performance

Goodz deve parecer rápido mesmo em aparelho simples.

Metas iniciais:

- storefront com LCP agressivo;
- busca instantânea;
- carrinho local;
- poucas etapas;
- imagens responsivas;
- lazy loading;
- prefetch;
- cache;
- optimistic UI;
- sincronização incremental;
- edge caching quando adequado.

---

# 57. Goodz Continuity Engine™

PDV offline-first.

Em queda de internet:

- catálogo continua;
- carrinho continua;
- vendas locais permitidas conforme política;
- caixa continua;
- fila local registra operações.

Quando a internet volta:

```text
Local Queue
   ↓
Sync Engine
   ↓
Cloud
```

Deve existir estratégia de:

- idempotência;
- conflito;
- retry;
- reconciliação;
- integridade.

---

# 58. Segurança

Fundamentos:

- RLS;
- isolamento multi-tenant;
- RBAC;
- least privilege;
- auditoria;
- logs;
- criptografia;
- secrets fora do frontend;
- trilha de operações;
- sessões;
- proteção contra fraude;
- rate limits;
- backups;
- recuperação;
- observabilidade;
- política de retenção.

Ações sensíveis:

- cancelamento;
- desconto;
- alteração de preço;
- fechamento;
- pagamento;
- investimento;
- exportação;
- alteração de permissões.

Devem possuir auditoria.

---

# 59. Fiscal e contábil

Futuro módulo.

Possibilidades:

- impostos;
- classificação;
- exportação contábil;
- conciliação;
- emissão fiscal;
- integração com contador;
- provisões;
- calendário tributário.

Questões fiscais devem ser validadas especificamente para o regime e localidade do estabelecimento.

---

# 60. Goodz Daily Brief™

Nova ideia.

Todos os dias o proprietário recebe um resumo:

```text
Bom dia.

Ontem:
Faturamento: R$ ...
Resultado estimado: R$ ...
Ticket: R$ ...
Pedidos: ...
Melhor canal: ...
Produto mais lucrativo: ...

Hoje:
Contas: ...
Compras: ...
Risco de estoque: ...
Meta diária: ...

Dinheiro:
Reserva: ...
Disponível para reinvestimento: ...
Disponível para investimento externo: ...

3 recomendações Goodz:
1. ...
2. ...
3. ...
```

---

# 61. Goodz Closing Assistant™

Assistente de encerramento diário.

Checklist:

1. conferir caixa;
2. conciliar pagamentos;
3. registrar perdas;
4. confirmar compras;
5. fechar venda;
6. calcular custos;
7. provisionar despesas;
8. provisionar tributos;
9. calcular resultado;
10. distribuir buckets;
11. atualizar reserva;
12. gerar recomendação de reinvestimento;
13. gerar relatório.

---

# 62. Goodz Owner Mode™

Nova ideia.

Modo especial para proprietário.

Mostra apenas:

- quanto vendeu;
- quanto gastou;
- quanto lucrou;
- quanto está reservado;
- quanto pode gastar;
- quanto pode retirar;
- quanto pode reinvestir;
- contas próximas;
- alertas;
- recomendações.

Objetivo:

> gestão simples mesmo para quem não gosta de contabilidade.

---

# 63. Goodz CFO Mode™

Nova ideia.

Visão avançada:

- DRE;
- fluxo;
- working capital;
- margem de contribuição;
- custos fixos;
- custos variáveis;
- burn;
- runway;
- retorno sobre capital;
- rentabilidade;
- cenários;
- investimentos.

---

# 64. Goodz Autopilot Levels™

Nova ideia para automação gradual.

```text
LEVEL 0
Somente dados.

LEVEL 1
Insights.

LEVEL 2
Recomendações.

LEVEL 3
Criação de ações para aprovação.

LEVEL 4
Execução de ações de baixo risco aprovadas por política.

LEVEL 5
Autonomia limitada com limites rígidos.
```

Operações financeiras e investimentos devem exigir controles adicionais e, por padrão, permanecer em níveis que preservem aprovação humana.

---

# 65. Goodz Action Center™

Transformar insight em tarefa.

Exemplo:

```text
Insight:
Fornecedor aumentou queijo em 12%.

Ações:
[ Comparar fornecedores ]
[ Simular novo preço ]
[ Criar alerta ]
[ Abrir compra ]
```

A IA deve ser operacional, não apenas conversacional.

---

# 66. Goodz Audit Trail™

Registrar:

- quem;
- quando;
- ação;
- valor anterior;
- valor novo;
- motivo;
- origem;
- IA envolvida;
- aprovação;
- resultado.

Especialmente importante para:

- caixa;
- preço;
- estoque;
- finanças;
- investimentos;
- campanhas;
- permissões.

---

# 67. Goodz Data Quality Engine™

Nova ideia.

A IA depende de dados bons.

Motor para detectar:

- produto sem custo;
- insumo sem unidade;
- receita incompleta;
- conta duplicada;
- estoque impossível;
- preço incoerente;
- cliente duplicado;
- fornecedor duplicado;
- pagamentos não conciliados.

Score de qualidade dos dados por módulo.

---

# 68. Goodz Anomaly Engine™

Nova ideia.

Detectar:

- venda fora do padrão;
- desconto excessivo;
- cancelamento incomum;
- perda elevada;
- diferença de caixa;
- despesa atípica;
- preço de compra anormal;
- saque/retirada incomum;
- divergência de estoque.

Sempre diferenciar anomalia de acusação.

---

# 69. Goodz Benchmark Engine™

Futuramente, de forma anonimizada e com consentimento, permitir benchmarks:

- margem média;
- ticket;
- desperdício;
- mix;
- canal;
- custo.

Nunca expor dados de outro estabelecimento.

---

# 70. Goodz Learning Loop™

Nova ideia.

Toda recomendação pode receber feedback:

- útil;
- não útil;
- aplicada;
- ignorada;
- resultado.

O sistema aprende preferências operacionais e melhora futuras sugestões.

---

# 71. Goodz Scenario Vault™

Salvar simulações.

Exemplo:

- aumentar preço;
- comprar equipamento;
- contratar funcionário;
- abrir unidade;
- investir em marketing;
- alterar delivery;
- investir lucro.

Comparar cenário planejado x resultado real.

---

# 72. Goodz Calendar Intelligence™

Conectar eventos do negócio:

- contas;
- vencimentos;
- compras;
- feriados;
- campanhas;
- folha;
- impostos;
- manutenção;
- estoque;
- promoções.

A IA poderá responder:

> “O que exige atenção esta semana?”

---

# 73. Goodz Command Palette™

Nova ideia de UX.

Busca universal:

```text
Ctrl/Cmd + K
```

Permitir:

- abrir produto;
- criar venda;
- encontrar cliente;
- criar conta;
- buscar relatório;
- fazer pergunta;
- executar ação.

---

# 74. Goodz Mobile Owner App / PWA

O proprietário deve conseguir acompanhar tudo pelo celular.

Recursos:

- dashboard;
- alertas;
- aprovações;
- relatórios;
- IA;
- pagamentos futuros;
- pedidos;
- estoque;
- investimentos.

PWA inicialmente pode reduzir complexidade.

---

# 75. Goodz Roles

Papéis:

- proprietário;
- administrador;
- gerente;
- caixa;
- cozinha;
- estoque;
- financeiro;
- entregador;
- marketing;
- contador;
- suporte.

Permissões granulares.

---

# 76. SaaS futuro

Recursos:

- onboarding;
- planos;
- trial;
- billing;
- limites;
- addons;
- múltiplas unidades;
- suporte;
- tenant admin;
- feature flags;
- métricas;
- status;
- auditoria;
- migrações;
- exportação de dados;
- LGPD.

---

# 77. Classificação inicial de escopo

## NECESSARY

- multi-tenant preparado;
- PDV;
- caixa;
- produtos;
- insumos;
- ficha técnica;
- estoque ledger;
- compras;
- fornecedores;
- clientes;
- fiado;
- contas a pagar;
- contas a receber;
- preços por canal;
- central de pedidos;
- Goodz Online;
- Adaptive Storefront;
- Truth Layer;
- Intelligence Core básico;
- Margin DNA;
- fechamento econômico diário;
- Profit Router;
- Money Buckets;
- Reserve Guard;
- dashboard;
- relatórios principais;
- Explainable AI;
- Continuity Engine;
- segurança;
- auditoria.

## IMPORTANT

- iFood;
- 99Food;
- delivery próprio avançado;
- Business Twin;
- Demand Pulse;
- Smart Stock;
- Early Warning;
- Goal Engine;
- Decision Graph;
- Treasury Copilot;
- Opportunity Radar;
- Reinvestment Optimizer;
- Owner Mode;
- CFO Mode;
- Data Quality Engine;
- Anomaly Engine.

## FUTURE

- CRM avançado;
- WhatsApp marketing;
- e-mail marketing;
- Growth Engine;
- Customer Brain;
- Growth Lab;
- Portfolio View;
- Web3 Layer;
- Investment Research Agent;
- Risk Engine avançado;
- execução financeira integrada;
- Benchmark Engine;
- múltiplas filiais avançadas;
- fiscal completo;
- contabilidade integrada.

---

# 78. Princípios de IA financeira

O Goodz deve agir como consultor de gestão.

Ele deve poder:

- explicar;
- mostrar números;
- projetar;
- simular;
- pesquisar;
- comparar;
- sugerir.

Mas deve preservar agência humana.

Especialmente em investimentos:

> A IA não deve simplesmente dizer “compre X” sem mostrar contexto, risco, fontes, liquidez, impacto no caixa e alternativas.

Ela pode gerar uma recomendação clara, inclusive distribuição sugerida, desde que:

- seja baseada em dados atuais;
- deixe explícito que é uma recomendação;
- mostre riscos;
- não represente certeza;
- não execute sem aprovação;
- não comprometa dinheiro reservado para operação.

---

# 79. Visão do ciclo diário ideal

```text
VENDAS
  ↓
CUSTOS
  ↓
DESPESAS RATEADAS
  ↓
PROVISÕES
  ↓
RESULTADO
  ↓
MONEY BUCKETS
  ↓
RESERVA
  ↓
CAPITAL DE GIRO
  ↓
REINVESTIMENTO NO NEGÓCIO
  ↓
CAPITAL EXCEDENTE
  ↓
OPPORTUNITY RADAR
  ↓
RECOMENDAÇÃO
  ↓
APROVAÇÃO DO PROPRIETÁRIO
```

---

# 80. Exemplo completo: venda diária

Exemplo ilustrativo:

```text
Faturamento do dia ............. R$ 1.000

Custos variáveis
Insumos ........................ R$ 260
Embalagens ..................... R$ 35
Taxas .......................... R$ 25

Rateio de estrutura
Energia ........................ R$ 25
Água ........................... R$ 8
Aluguel ........................ R$ 40
Mão de obra .................... R$ 100
Software ....................... R$ 7

Provisões
Impostos ....................... R$ 60
Manutenção ..................... R$ 20

Resultado estimado ............. R$ 420
```

Depois:

```text
R$ 420 resultado

Reserva operacional ............ R$ 80
Capital de giro ................ R$ 80
Reinvestimento negócio ......... R$ 80
Pró-labore ...................... R$ 80
Capital para investimento ...... R$ 100
```

A divisão acima é apenas exemplo.

A divisão real será configurada e/ou recomendada de acordo com a saúde financeira do negócio.

---

# 81. Perguntas que o Goodz deve responder

## Operação

- O que vendeu mais?
- O que deu mais lucro?
- O que está acabando?
- O que devo comprar?
- Onde estou desperdiçando?

## Financeiro

- Quanto eu realmente lucrei?
- Quanto tenho disponível?
- Quanto está comprometido?
- Quais contas devo priorizar?
- Consigo pagar tudo?
- Posso retirar dinheiro?
- Quanto devo deixar de reserva?

## Crescimento

- Posso contratar?
- Posso comprar equipamento?
- Posso abrir outro ponto?
- Vale aumentar preço?
- Vale criar promoção?

## Investimentos

- Existe capital excedente?
- Quanto pode ser investido sem comprometer o negócio?
- Quais opções atuais fazem sentido para o objetivo configurado?
- Qual a liquidez?
- Qual o risco?
- Quanto estou concentrado?
- Reinvestir na empresa é melhor que investir fora neste cenário?

---

# 82. Diferenciais proprietários atualmente propostos

- **Goodz Adaptive Storefront™**
- **Goodz AI Designer™**
- **Goodz Media Intelligence™**
- **Goodz Margin DNA™**
- **Goodz Smart Stock™**
- **Goodz Intelligence Core™**
- **Goodz Business Twin™**
- **Goodz Decision Graph™**
- **Goodz Demand Pulse™**
- **Goodz Cash Guardian™**
- **Goodz Early Warning™**
- **Goodz Goal Engine™**
- **Goodz Growth Lab™**
- **Goodz Customer Brain™**
- **Goodz Growth Engine™**
- **Goodz Continuity Engine™**
- **Goodz Explainable AI™**
- **Goodz Profit Router™**
- **Goodz Money Buckets™**
- **Goodz Reserve Guard™**
- **Goodz Treasury Copilot™**
- **Goodz Capital Ladder™**
- **Goodz Opportunity Radar™**
- **Goodz Portfolio View™**
- **Goodz Crypto & Web3 Layer™**
- **Goodz Investment Research Agent™**
- **Goodz Risk Engine™**
- **Goodz Reinvestment Optimizer™**
- **Goodz Daily Brief™**
- **Goodz Closing Assistant™**
- **Goodz Owner Mode™**
- **Goodz CFO Mode™**
- **Goodz Autopilot Levels™**
- **Goodz Action Center™**
- **Goodz Audit Trail™**
- **Goodz Data Quality Engine™**
- **Goodz Anomaly Engine™**
- **Goodz Benchmark Engine™**
- **Goodz Learning Loop™**
- **Goodz Scenario Vault™**
- **Goodz Calendar Intelligence™**

---

# 83. Pontos ainda a explorar antes do Blueprint definitivo

Rodadas sugeridas:

1. IA avançada e automação;
2. fechamento diário e tesouraria;
3. investimentos e patrimônio;
4. UX do PDV;
5. UX/cardápio/checkout;
6. integrações iFood/99Food;
7. delivery próprio;
8. financeiro/contabilidade/fiscal;
9. segurança/antifraude;
10. SaaS/multi-tenant;
11. performance/offline;
12. CRM/marketing;
13. dados/analytics;
14. observabilidade;
15. mobile;
16. relatórios;
17. monetização;
18. onboarding;
19. administração;
20. Definition of Done e arquitetura final.

---

# 84. Regra deste documento

Este arquivo é um **registro de ideias**.

Ainda não representa:

- escopo congelado;
- arquitetura aprovada;
- Definition of Done;
- decisão final de tecnologia;
- autorização para implementação.

Quando o planejamento amadurecer, as ideias aprovadas serão promovidas para o Source Pack canônico.

---

# 85. Próxima evolução sugerida

Antes do código:

1. continuar sessões de ideação;
2. classificar NECESSARY / IMPORTANT / FUTURE / OUT OF SCOPE;
3. fechar visão do produto;
4. definir MVP/V1;
5. criar Source Pack;
6. aprovar arquitetura;
7. criar backlog;
8. definir DoD;
9. criar primeiro Work Order;
10. iniciar implementação.

---
---

# 86. Goodz Closed Loop™

Tecnologia proprietária para fechar o ciclo completo entre percepção e ação.

Fluxo:

```text
DETECTAR
   ↓
EXPLICAR
   ↓
SIMULAR
   ↓
RECOMENDAR
   ↓
PREPARAR AÇÃO
   ↓
APROVAÇÃO
   ↓
EXECUTAR
   ↓
MEDIR RESULTADO
   ↓
APRENDER
```

Exemplo:

```text
Problema:
Margem do pastel caiu.

Diagnóstico:
Custo do queijo subiu.

Goodz:
1. identifica causa;
2. compara fornecedores;
3. simula aumento de preço;
4. simula troca de fornecedor;
5. calcula impacto;
6. apresenta alternativas;
7. usuário aprova;
8. Goodz executa a ação permitida;
9. acompanha resultado;
10. compara previsto x realizado;
11. aprende com a decisão.
```

Objetivo:

> Transformar a IA de um sistema que responde perguntas em um sistema que acompanha decisões do início ao resultado.

---

# 87. Goodz Reconciliation Engine™

Motor de conciliação financeira automática.

O sistema deve cruzar:

- vendas;
- pagamentos;
- cartões;
- PIX;
- dinheiro;
- iFood;
- 99Food;
- Goodz Online;
- taxas;
- comissões;
- estornos;
- antecipações;
- repasses;
- recebíveis.

Exemplo:

```text
Vendas esperadas .......... R$ 8.420
PIX recebido .............. R$ 3.100
Cartões ................... R$ 2.200
iFood ..................... R$ 1.300
99Food .................... R$   900
A receber ................. R$   920
```

Quando houver divergência:

```text
Divergência encontrada:
R$ 37

Origem provável:
repasse / taxa / cancelamento / pagamento ausente
```

Objetivos:

- localizar diferenças;
- conciliar automaticamente quando seguro;
- gerar pendências;
- registrar evidências;
- evitar perda silenciosa de dinheiro.

---

# 88. Goodz Capture AI™

Camada de entrada inteligente de dados.

O usuário poderá fornecer:

- foto de nota;
- foto de boleto;
- comprovante;
- PDF;
- planilha;
- áudio;
- texto;
- e-mail;
- documento de fornecedor.

Exemplo por voz:

> “Comprei 10 kg de queijo por R$ 329 e paguei no PIX.”

Goodz prepara:

```text
Compra
Fornecedor
10 kg queijo
R$ 329

+ entrada de estoque
+ despesa
+ pagamento
+ atualização de custo
+ atualização de margem
```

A operação deverá ser revisável antes de confirmação quando envolver finanças, estoque ou dados críticos.

---

# 89. Goodz Merchant Genome™

Modelo econômico individual de cada estabelecimento.

O sistema aprende padrões próprios:

- dia forte;
- dia fraco;
- sazonalidade;
- efeito de chuva;
- efeito de feriados;
- produtos sensíveis a preço;
- comportamento por canal;
- elasticidade aproximada;
- resposta a promoções;
- capacidade operacional;
- gargalos;
- comportamento de fornecedores;
- ciclo financeiro.

Exemplo:

```text
Sexta-feira:
1,8x uma terça média.

Chuva:
balcão -18%
delivery +27%

Promoção X:
pedidos +22%
margem -9%
```

O Merchant Genome deve ser específico do estabelecimento e evoluir com seus dados.

---

# 90. Goodz Experiment Engine™

Motor de experimentação controlada.

Possíveis testes:

- preços;
- fotos;
- banners;
- ordem dos produtos;
- descrições;
- combos;
- cupons;
- frete;
- checkout;
- sugestões de adicionais;
- layout do storefront.

O sistema deve:

1. definir hipótese;
2. separar amostras quando aplicável;
3. executar dentro de regras;
4. medir conversão;
5. medir ticket;
6. medir margem;
7. medir lucro;
8. detectar efeito adverso;
9. encerrar experimento;
10. registrar resultado.

Princípio:

> Otimizar com evidência, não com opinião.

---

# 91. Goodz Supplier Intelligence Network™

Camada futura de inteligência de fornecedores.

Individualmente, o Goodz deve analisar:

- preços;
- histórico;
- prazo;
- qualidade;
- frequência de reajuste;
- ruptura;
- dependência.

Futuramente, com anonimização, consentimento e controles de privacidade, poderá gerar referências agregadas.

Exemplos:

```text
Seu queijo está 12% acima da referência comparável.

Óleo subiu 9% na sua região nas últimas semanas.

Seu fornecedor aumentou preço em 3 compras consecutivas.
```

Fases futuras:

- comparação;
- cotação;
- negociação;
- marketplace B2B;
- compra coletiva.

Nunca expor dados identificáveis de outro estabelecimento.

---

# 92. Goodz Owner Everywhere™

Levar a inteligência para onde o proprietário estiver.

Canais:

- painel web;
- PWA;
- aplicativo;
- push;
- WhatsApp futuro;
- e-mail;
- voz.

Comandos possíveis:

> “Feche meu dia.”

> “Quanto sobrou?”

> “O que vence amanhã?”

> “Tem algum problema?”

> “O que preciso comprar?”

> “Posso investir alguma coisa hoje?”

Goodz deve responder com dados do negócio, contexto e ações disponíveis.

---

# 93. Goodz Proof Engine™

Toda decisão importante deve ser verificável.

Uma recomendação deve possuir:

```text
RECOMENDAÇÃO
Reservar R$ 700.

DADOS UTILIZADOS
Contas dos próximos 15 dias
Recebíveis
Estoque
Histórico de vendas
Reserva atual

CENÁRIO ADVERSO
Queda de 20% das vendas

CONFIANÇA
Alta / Média / Baixa

RISCOS
...

FONTES
...

CÁLCULOS
...
```

Objetivo:

> nenhuma recomendação relevante deve ser uma caixa-preta.

---

# 94. Goodz Self-Healing Ops™

Motor de saúde operacional.

Detectar:

- integração offline;
- webhook com falha;
- pedido não sincronizado;
- duplicidade;
- fila parada;
- estoque divergente;
- recebível não conciliado;
- job atrasado;
- erro de catálogo;
- mídia indisponível.

Quando seguro, Goodz pode:

- reprocessar;
- repetir;
- reconstruir cache;
- reabrir fila;
- sincronizar;
- isolar erro;
- gerar incidente.

Ações destrutivas ou financeiramente sensíveis continuam exigindo política/autorização.

---

# 95. Goodz Business Optimizer™

Evolução do Business Twin.

O Business Twin responde:

> “O que acontece se...?”

O Business Optimizer responde:

> “Qual combinação atende melhor meu objetivo?”

Possíveis objetivos:

- maximizar margem;
- maximizar lucro;
- aumentar faturamento;
- reduzir desperdício;
- reduzir custo;
- aumentar capacidade;
- manter ticket;
- reduzir dependência de marketplace.

Variáveis:

- preços;
- promoções;
- mix;
- horário;
- estoque;
- capacidade;
- marketing;
- canal;
- frete;
- combos.

Combinar:

- otimização matemática;
- restrições;
- simulação;
- IA para explicação.

---

# 96. Goodz Agent Fabric™

Última fundação recomendada para a arquitetura de IA.

Em vez de uma única IA cuidar de tudo, o Goodz deve possuir especialistas coordenados.

Exemplo:

```text
GOODZ ORCHESTRATOR
│
├── Finance Agent
├── Treasury Agent
├── Inventory Agent
├── Purchasing Agent
├── Pricing Agent
├── Sales Agent
├── Delivery Agent
├── Customer Agent
├── Marketing Agent
├── Investment Research Agent
├── Risk Agent
└── Audit Agent
```

O orquestrador decide:

- qual especialista utilizar;
- quais dados fornecer;
- quais ferramentas permitir;
- quais ações precisam de aprovação;
- quando um segundo agente deve revisar o primeiro.

Benefícios:

- menor contexto;
- menor custo;
- especialização;
- auditabilidade;
- segurança;
- testes independentes.

---

# 97. Goodz Policy Brain™

Camada de políticas definida pelo proprietário.

Exemplos:

```text
Nunca deixar reserva abaixo de R$ 10.000.

Nunca aplicar mais de 5% do capital em ativo de risco elevado.

Desconto acima de 15% exige gerente.

Cancelamento acima de R$ 100 exige proprietário.

Nunca comprar insumo acima de X sem comparar fornecedor.

Nunca executar campanha acima de R$ 500 sem aprovação.
```

A IA deve respeitar essas políticas como restrições duras.

Isso permite personalizar autonomia sem depender de prompts improvisados.

---

# 98. Goodz Counterfactual Engine™

Motor de análise contrafactual.

Perguntas:

> “Meu lucro teria sido melhor se eu não tivesse feito a promoção?”

> “Se eu tivesse aumentado o preço há 30 dias, qual seria o cenário?”

> “Se eu tivesse comprado do fornecedor B, quanto teria economizado?”

> “Se eu tivesse mantido mais capital em caixa, qual seria o impacto?”

Objetivo:

- aprender com decisões passadas;
- melhorar futuras recomendações;
- distinguir correlação de explicações superficiais.

Os resultados devem ser apresentados como estimativas, não fatos históricos.

---

# 99. Goodz AI Cost Governor™

A IA deve gerar valor sem explodir custo operacional do SaaS.

O sistema deve:

- escolher modelo conforme dificuldade;
- usar modelo barato para tarefas simples;
- usar modelo mais forte para análise complexa;
- cachear contexto;
- resumir histórico;
- utilizar cálculos determinísticos antes de LLM;
- usar RAG apenas quando necessário;
- limitar tokens;
- reutilizar resultados válidos;
- registrar custo por tenant;
- registrar custo por feature;
- detectar abuso;
- permitir budgets.

Objetivo:

> maximizar inteligência por real gasto em IA.

---

# 100. Goodz Model Router™

Abstração de provedores/modelos.

O sistema não deve depender arquiteturalmente de um único provedor.

Critérios de roteamento:

- qualidade;
- custo;
- velocidade;
- contexto;
- privacidade;
- disponibilidade;
- tipo de tarefa;
- necessidade de visão;
- necessidade de pesquisa;
- necessidade de raciocínio.

Também deve haver fallback.

---

# 101. Goodz AI Governance Layer™

Governança de inteligência artificial.

Registrar:

- modelo;
- versão;
- prompt/template;
- ferramentas usadas;
- fontes;
- decisão;
- confiança;
- aprovação;
- custo;
- latência;
- resultado;
- feedback.

Permitir:

- auditoria;
- reprodução;
- comparação;
- rollback;
- avaliação;
- testes;
- monitoramento de qualidade.

---

# 102. Goodz Recommendation Evaluation™

Toda tecnologia de recomendação deve ser mensurada.

Métricas:

- recomendação aceita;
- recomendação aplicada;
- resultado positivo;
- resultado negativo;
- economia gerada;
- receita incremental;
- margem incremental;
- tempo economizado;
- falso alerta;
- confiança calibrada.

Pergunta fundamental:

> “A IA realmente melhorou o negócio?”

Não medir apenas número de chats ou tokens utilizados.

---

# 103. Goodz Trust Score™

Nova ideia final.

Cada recomendação pode ganhar um indicador de confiabilidade baseado em:

- qualidade dos dados;
- quantidade de histórico;
- consistência;
- atualidade;
- cobertura;
- disponibilidade de fontes externas;
- volatilidade;
- divergência entre modelos/cenários.

Exemplo:

```text
Confiança: 82%

Por quê:
+ 12 meses de histórico
+ estoque atualizado
+ custos reconciliados
- vendas recentes atípicas
```

---

# 104. Goodz Memory Tiers™

A memória do sistema deve ser dividida.

```text
HOT
Contexto atual:
caixa, pedidos, estoque, alertas.

WARM
Semanas/meses:
vendas, custos, clientes, comportamento.

COLD
Histórico:
anos, documentos, decisões, auditoria.

SEMANTIC
Conhecimento:
documentos, políticas, manuais, contexto não estruturado.
```

Objetivos:

- reduzir custo;
- acelerar respostas;
- preservar contexto importante;
- evitar enviar o banco inteiro para o modelo.

---

# 105. Goodz Data Moat™

O verdadeiro patrimônio tecnológico futuro do Goodz não deve ser apenas código.

Será a combinação de:

- histórico econômico;
- comportamento operacional;
- Merchant Genome;
- resultados de experimentos;
- Decision Graph;
- recomendações e outcomes;
- padrões de demanda;
- padrões de custos;
- padrões de clientes;
- padrões de fornecedores.

Sempre respeitando:

- privacidade;
- isolamento multi-tenant;
- consentimento;
- LGPD;
- anonimização quando aplicável.

O aprendizado agregado nunca deve permitir reconstruir dados privados de um estabelecimento.

---

# 106. O verdadeiro diferencial competitivo do Goodz Menu

O Goodz Menu não deve competir apenas por quantidade de funcionalidades.

A arquitetura competitiva proposta é:

```text
                    GOODZ MENU
                         │
                OPERAÇÃO DO NEGÓCIO
                         │
              DADOS REAIS + TRUTH LAYER
                         │
                MERCHANT GENOME
                         │
        BUSINESS TWIN + DECISION GRAPH
                         │
                GOODZ AGENT FABRIC
                         │
        SIMULAÇÃO + OTIMIZAÇÃO + RISCO
                         │
                 CLOSED LOOP
                         │
          AÇÃO + MEDIÇÃO + APRENDIZADO
```

Principais fossos tecnológicos:

1. **Merchant Genome™**
2. **Business Twin™**
3. **Decision Graph™**
4. **Closed Loop™**
5. **Profit Router™**
6. **Reconciliation Engine™**
7. **Experiment Engine™**
8. **Proof Engine™**
9. **Agent Fabric™**
10. **Policy Brain™**
11. **Business Optimizer™**
12. **Learning Loop™**

O diferencial não será:

> “Temos IA.”

Será:

> **“O Goodz entende como seu negócio funciona, detecta o que mudou, explica por quê, simula alternativas, recomenda a melhor próxima ação, executa o que você autorizar, mede o resultado e aprende com isso.”**

---

# 107. Arquitetura conceitual da inteligência

```text
                         DATA SOURCES
     POS / Estoque / Financeiro / CRM / Delivery / Market Data
                              │
                              ▼
                         TRUTH LAYER
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
      DATA QUALITY       EVENT STREAM       MEMORY TIERS
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
                      MERCHANT GENOME
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
     BUSINESS TWIN      DECISION GRAPH      FORECASTING
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
                       AGENT FABRIC
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
       SIMULATION         RISK ENGINE        OPTIMIZER
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
                         PROOF ENGINE
                              │
                         POLICY BRAIN
                              │
                         CLOSED LOOP
                              │
                         USER APPROVAL
                              │
                             ACTION
                              │
                         MEASUREMENT
                              │
                         LEARNING LOOP
```

---

# 108. Produto final imaginado

O proprietário abre o Goodz pela manhã.

Em vez de procurar dezenas de relatórios, recebe:

```text
Bom dia.

Ontem:
Faturamento ............. R$ 4.812
Resultado operacional ... R$ 1.184
Ticket médio ............ R$ ...
Pedidos ................. ...

Financeiro:
R$ 520 já comprometidos.
R$ 300 direcionados para reserva.
R$ 364 potencialmente livres.

Operação:
Queijo subiu 11%.
Estoque de embalagem cobre 2,4 dias.

Delivery:
Há divergência de R$ 42 em um repasse.

Oportunidades:
2 possibilidades de reinvestimento.
3 alternativas externas para análise.

Goodz encontrou 4 ações prioritárias.
```

O proprietário pode pedir:

> “Resolva o que puder sem risco e me mostre o que precisa da minha aprovação.”

O sistema executa somente dentro das políticas configuradas.

---

# 109. Decisão de encerramento da ideação

Após as rodadas de ideação, o Goodz Menu já possui:

- visão do produto;
- identidade;
- arquitetura conceitual;
- diferenciais proprietários;
- PDV;
- financeiro;
- estoque;
- compras;
- delivery;
- vendas omnichannel;
- storefront;
- CRM;
- marketing;
- IA;
- automação;
- investimentos;
- risco;
- governança;
- experimentação;
- otimização;
- aprendizado;
- offline;
- segurança;
- SaaS futuro.

**Decisão:** não adicionar novas funcionalidades macro antes da criação do Blueprint.

Motivo:

> O principal risco a partir daqui deixa de ser falta de ideias e passa a ser excesso de escopo.

Novas ideias futuras deverão passar por classificação:

- NECESSARY;
- IMPORTANT;
- FUTURE;
- OUT OF SCOPE.

Somente NECESSARY entra automaticamente na versão em planejamento.

---

# 110. STATUS FINAL DESTE DOCUMENTO

```text
IDEATION PHASE: CLOSED
VISION: ESTABLISHED
INNOVATION LAYER: ESTABLISHED
AI DIFFERENTIATION: ESTABLISHED
READY FOR BLUEPRINT: YES
READY FOR IMPLEMENTATION: NO
```

Este documento continua sendo a fonte de captura da visão, mas **não autoriza implementação**.

Próximo artefato obrigatório:

> **Goodz Menu Master Blueprint / Source Pack v0.1**

O Blueprint deverá transformar esta visão em:

- Project Overview;
- Requirements;
- Scope;
- Architecture;
- Data Model;
- API Contracts;
- Integration Contracts;
- AI Architecture;
- Security;
- UI/UX;
- Test/Benchmark Plan;
- Deployment;
- Backlog;
- Definition of Done;
- Decisions Ledger/ADRs;
- Checkpoint.

A partir desse momento, mudanças relevantes deverão ser registradas como decisão controlada, e não como expansão livre de ideias.

---
---

# 111. CONTROLLED SCOPE DELTA 001 — UX Feedback, Notifications, Settings e Super Admin

**Status:** ACCEPTED INTO VISION  
**Motivo:** Requisitos transversais fundamentais para experiência profissional, operação SaaS e administração da plataforma.  
**Regra:** Este delta não reabre a ideação macro. Ele adiciona requisitos controlados à visão já encerrada.

---

# 112. Goodz Feedback System™

Sistema visual unificado de feedback da aplicação.

Objetivo:

> Toda ação importante deve responder visualmente de forma imediata, bonita, consistente e compreensível.

Tipos previstos:

- success;
- confirmation;
- information;
- warning;
- error;
- destructive warning;
- loading;
- progress;
- promise/loading-to-success;
- undo;
- offline;
- reconnection;
- sync;
- update available;
- background job finished;
- permission denied;
- validation issue.

O sistema deverá possuir:

- animações consistentes;
- microinterações;
- ícones próprios;
- suporte light/dark;
- responsividade;
- acessibilidade;
- duração configurável;
- ações embutidas;
- empilhamento inteligente;
- limite de toasts simultâneos;
- deduplicação;
- prioridade;
- suporte a teclado;
- suporte a leitores de tela;
- comportamento diferente para eventos críticos.

Exemplos:

```text
✓ Pedido confirmado
Pedido #1042 foi enviado para a cozinha.
[Ver pedido]
```

```text
⚠ Sincronização pendente
A conexão caiu. A venda foi salva localmente e será sincronizada quando a internet voltar.
```

```text
✕ Não foi possível concluir a operação
Tente novamente ou informe o código GM-7F2A9 ao suporte.
[Detalhes] [Tentar novamente]
```

---

# 113. Goodz Error Experience™

Erros de produção não devem despejar stack trace, SQL, token, segredo ou detalhes internos na tela do usuário.

A experiência correta deve possuir:

- mensagem humana;
- ação recomendada;
- código de erro;
- correlation/request ID;
- data/hora;
- ação de tentar novamente;
- link para detalhes quando apropriado;
- envio automático para observabilidade;
- contexto técnico completo somente para logs autorizados.

Exemplo:

```text
Não foi possível finalizar o pagamento.

O pedido continua salvo.
Tente novamente em alguns segundos.

Código:
GM-PAY-2048

Request:
01JXYZ...
```

O administrador autorizado poderá correlacionar esse código com logs internos.

Princípio:

> O usuário vê clareza. A equipe técnica vê profundidade. Segredos nunca aparecem no frontend.

---

# 114. Goodz Motion System™

Sistema de animação documentado.

Categorias:

- microinterações;
- entrada/saída;
- confirmação;
- loading;
- success;
- error;
- navegação;
- modais;
- drawers;
- painéis;
- cards;
- dashboards;
- gráficos;
- notificações;
- carrinho;
- checkout;
- drag-and-drop.

Requisitos:

- animações suaves;
- sem prejudicar performance;
- respeitar `prefers-reduced-motion`;
- evitar excesso visual;
- manter consistência;
- tokens de duração/easing;
- presets reutilizáveis.

---

# 115. Goodz Notification Center™

Central robusta de notificações.

Categorias:

- pedidos;
- caixa;
- financeiro;
- estoque;
- compras;
- fornecedores;
- delivery;
- clientes;
- marketing;
- integrações;
- IA;
- segurança;
- sistema;
- billing;
- assinatura;
- administração.

Cada notificação pode possuir:

- título;
- descrição;
- prioridade;
- categoria;
- timestamp;
- entidade relacionada;
- ação;
- lida/não lida;
- arquivada;
- silenciada;
- snooze;
- expiração;
- origem;
- tenant;
- branch;
- usuário-alvo.

Prioridades:

```text
CRITICAL
HIGH
NORMAL
LOW
INFORMATIONAL
```

Recursos:

- badge;
- contador;
- filtros;
- pesquisa;
- agrupamento;
- marcar como lida;
- marcar todas;
- arquivar;
- snooze;
- mute;
- ações inline;
- deep links;
- digest.

---

# 116. Goodz Notification Rules™

Cada usuário poderá configurar quando e como deseja ser notificado.

Exemplos:

```text
Estoque crítico:
Push = ON
Email = OFF
WhatsApp = OFF
In-app = ON

Conta vencendo:
Push = ON
Email = ON
In-app = ON

Nova venda:
Somente in-app

Erro crítico de integração:
Push + Email + In-app
```

Configurações adicionais:

- horários silenciosos;
- dias;
- prioridades;
- canais;
- digest diário;
- digest semanal;
- filial;
- categoria;
- valor mínimo;
- evento específico.

Eventos críticos obrigatórios poderão ignorar silêncio conforme política do tenant/plataforma.

---

# 117. Hierarquia de Settings

As configurações devem ter escopos claros.

```text
PLATFORM DEFAULTS
        ↓
TENANT SETTINGS
        ↓
BRANCH SETTINGS
        ↓
ROLE SETTINGS
        ↓
USER PREFERENCES
        ↓
DEVICE / SESSION PREFERENCES
```

Regra de resolução:

> o nível mais específico vence, exceto políticas bloqueadas pelo nível superior.

Exemplo:

```text
Platform:
Tema padrão = System

Tenant:
Tema padrão = Dark

Usuário:
Tema = Light
```

Resultado para aquele usuário:

```text
Light
```

Outro exemplo:

```text
Platform:
MFA obrigatório para Super Admin = LOCKED
```

Nenhum tenant ou usuário poderá desativar.

---

# 118. Goodz Personal Settings

Cada usuário terá configurações próprias.

Categorias:

## Perfil
- nome;
- avatar;
- telefone;
- idioma;
- timezone;
- formato de data;
- formato de moeda quando aplicável.

## Aparência
- light;
- dark;
- system;
- densidade;
- tamanho de fonte;
- contraste;
- animações;
- reduce motion;
- layout preferido;
- sidebar;
- dashboard pessoal.

## Notificações
- canais;
- categorias;
- frequência;
- quiet hours;
- digest.

## Segurança
- senha;
- MFA;
- sessões;
- dispositivos;
- chaves/passkeys futuramente;
- login history.

## Preferências de trabalho
- filial padrão;
- caixa padrão;
- impressora;
- página inicial;
- filtros salvos;
- atalhos;
- relatórios favoritos.

---

# 119. Goodz Tenant Settings

Configurações específicas do estabelecimento.

Categorias:

- dados da empresa;
- marca;
- endereço;
- filiais;
- horários;
- timezone;
- moeda;
- regras de caixa;
- regras de estoque;
- regras financeiras;
- regras de crédito/fiado;
- política de descontos;
- política de cancelamentos;
- delivery;
- taxas;
- checkout;
- storefront;
- integrações;
- pagamentos;
- fiscal;
- notificações;
- IA;
- automações;
- políticas;
- usuários;
- permissões;
- segurança;
- retenção de dados;
- exportação.

---

# 120. Goodz AI Settings

Cada tenant poderá configurar o comportamento da IA.

Exemplos:

- nível de autonomia;
- ações que exigem aprovação;
- limites monetários;
- orçamento mensal de IA;
- modelos permitidos;
- retenção de contexto;
- uso de pesquisa externa;
- acesso a dados financeiros;
- acesso a investimentos;
- uso de dados agregados;
- horários de relatórios;
- estilo de explicação;
- idioma;
- nível de detalhe.

Integração direta com:

- Goodz Policy Brain™;
- Goodz Autopilot Levels™;
- Goodz AI Cost Governor™;
- Goodz Governance Layer™.

---

# 121. Goodz Settings Registry™

Tecnologia para evitar configurações espalhadas pelo código.

Cada configuração deverá possuir metadados:

```text
key
scope
type
default
validation
allowed_roles
locked_by_platform
requires_restart
audit_required
sensitive
version
```

Benefícios:

- consistência;
- validação;
- documentação;
- migrations;
- defaults;
- override;
- auditoria.

---

# 122. Goodz Super Admin Console™

Painel administrativo global exclusivo da operação da plataforma Goodz Menu.

O Super Admin é diferente de:

- Owner de uma loja;
- Admin de um tenant;
- Gerente;
- Usuário comum.

O Super Admin administra a **plataforma SaaS inteira**.

---

# 123. Super Admin — Global Overview

Dashboard principal:

```text
TENANTS
Total
Ativos
Trial
Suspensos
Cancelados

USUÁRIOS
Total
Ativos hoje
Ativos agora
Novos
Convidados pendentes

ASSINATURAS
Pagantes
Trial
Past due
Canceladas

RECEITA
MRR
ARR
Receita do mês
Receita por plano
ARPU
Churn
LTV quando calculável

PLATAFORMA
Pedidos processados
Vendas processadas
Storage
API requests
AI requests
AI cost
Errors
Latency
Uptime
```

---

# 124. Super Admin — Tenant Management

Ações:

- criar tenant;
- visualizar;
- editar;
- ativar;
- suspender;
- pausar;
- reativar;
- bloquear;
- iniciar/cancelar trial;
- alterar plano;
- alterar limites;
- adicionar crédito;
- conceder feature;
- remover feature;
- gerenciar filiais;
- verificar status de integrações;
- verificar uso;
- exportar dados;
- solicitar exclusão conforme regras;
- adicionar observação interna;
- marcar tenant especial/VIP;
- visualizar histórico administrativo.

Toda ação sensível deve ser auditada.

---

# 125. Super Admin — User Management

Recursos:

- pesquisar usuário;
- filtrar por tenant;
- visualizar perfil;
- visualizar status;
- bloquear;
- desbloquear;
- suspender;
- revogar sessões;
- exigir troca de senha;
- exigir MFA;
- alterar função quando autorizado;
- reenviar convite;
- invalidar convite;
- transferir ownership com fluxo seguro;
- visualizar último acesso;
- visualizar dispositivos/sessões conforme política;
- visualizar permissões.

O sistema nunca deverá permitir ao administrador “ver a senha” do usuário.

---

# 126. Super Admin — Presence & Usage

Painel de atividade:

- usuários online aproximados;
- usuários ativos nos últimos 5/15/60 minutos;
- DAU;
- WAU;
- MAU;
- sessões;
- duração média;
- tenants ativos;
- páginas mais utilizadas;
- módulos mais utilizados;
- ações mais frequentes;
- recursos sem adoção.

"Online" deve ser tratado como presença técnica aproximada, não como mecanismo invasivo de vigilância.

---

# 127. Super Admin — Plans & Entitlements

Gerenciamento de planos:

```text
FREE
STARTER
PRO
BUSINESS
ENTERPRISE
CUSTOM
```

Cada plano poderá definir:

- usuários;
- filiais;
- produtos;
- pedidos;
- armazenamento;
- integrações;
- relatórios;
- IA;
- tokens/créditos;
- campanhas;
- histórico;
- features;
- suporte;
- SLA.

Entitlements devem ser separados de billing.

Isso permite:

> conceder temporariamente um recurso sem alterar a definição global do plano.

---

# 128. Super Admin — Billing & Revenue

Dashboard SaaS:

- MRR;
- ARR;
- receita bruta;
- receita líquida;
- trials;
- conversão;
- upgrades;
- downgrades;
- churn;
- cancelamentos;
- falhas de cobrança;
- inadimplência;
- créditos;
- cupons;
- descontos;
- receita por plano;
- receita por tenant;
- coortes;
- retenção.

---

# 129. Super Admin — AI Economics

Como IA é parte central do produto, o painel administrativo deverá mostrar:

- requests de IA;
- tokens;
- custo por provider;
- custo por modelo;
- custo por tenant;
- custo por feature;
- custo por usuário;
- custo por plano;
- cache hit;
- latência;
- falhas;
- fallback;
- margem SaaS após custo de IA.

Alertas:

```text
Tenant excedendo budget.
Feature com custo acima da receita.
Provider degradado.
Modelo caro sendo usado em tarefa simples.
```

---

# 130. Super Admin — System Health

Monitoramento:

- API;
- web;
- workers;
- queues;
- database;
- cache;
- storage;
- media;
- webhooks;
- iFood;
- 99Food;
- payments;
- WhatsApp;
- email;
- AI providers.

Estados:

```text
Operational
Degraded
Partial Outage
Major Outage
Maintenance
```

---

# 131. Super Admin — Error Center

Central de erros.

Campos:

- error code;
- correlation ID;
- tenant;
- user;
- module;
- route;
- severity;
- first seen;
- last seen;
- occurrences;
- affected users;
- deploy version;
- status;
- owner;
- resolution.

Recursos:

- agrupar;
- pesquisar;
- filtrar;
- vincular incidente;
- marcar resolvido;
- reabrir;
- acompanhar regressão.

---

# 132. Super Admin — Integration Operations

Painel global de integrações.

Para cada provider:

- status;
- tenants conectados;
- tokens expirando;
- webhooks;
- falhas;
- retries;
- latency;
- rate limits;
- sync lag.

Permitir ações seguras:

- retry;
- reconnect request;
- resync;
- disable integration;
- rotate internal credential when aplicável.

---

# 133. Super Admin — Feature Flags

Sistema de feature flags.

Escopos:

- global;
- plano;
- tenant;
- usuário;
- percentual;
- cohort.

Usos:

- beta;
- rollout gradual;
- kill switch;
- A/B test;
- experimentos;
- incident response.

Toda mudança deve ser auditada.

---

# 134. Super Admin — Support Mode

Modo de suporte controlado.

Possibilidades:

- visualizar contexto técnico;
- reproduzir estado quando permitido;
- verificar configurações;
- diagnosticar;
- acessar tenant em modo de suporte quando necessário.

Requisitos obrigatórios:

- motivo;
- duração limitada;
- banner visível;
- auditoria;
- permissões;
- ações sensíveis bloqueadas por padrão;
- registro completo.

Evitar impersonação invisível.

---

# 135. Super Admin — Security Center

Dashboard:

- logins suspeitos;
- MFA;
- sessões;
- tentativas falhas;
- contas bloqueadas;
- alterações de permissão;
- ações privilegiadas;
- secrets/integrations health;
- eventos críticos;
- RLS/advisors quando aplicável;
- vulnerabilidades;
- dependências;
- auditoria.

---

# 136. Super Admin — Audit Center

Pesquisa global da trilha de auditoria.

Filtros:

- tenant;
- usuário;
- admin;
- ação;
- entidade;
- intervalo;
- IP quando coletado legalmente;
- request ID;
- severity.

Exportação controlada.

---

# 137. Super Admin — Communications

Futuro módulo para comunicação com clientes SaaS:

- banner global;
- maintenance notice;
- announcement;
- release note;
- mensagem por tenant;
- mensagem por plano;
- email operacional;
- aviso de cobrança;
- aviso de mudança.

Não misturar comunicação operacional com marketing sem consentimento.

---

# 138. Super Admin — Data & Privacy

Ferramentas:

- exportação;
- retenção;
- anonimização;
- exclusão;
- consentimentos;
- requests de titular;
- histórico;
- legal hold quando aplicável.

Preparar arquitetura para LGPD.

---

# 139. Super Admin — Admin Roles

Nem todo funcionário futuro da Goodz deverá possuir controle total.

Papéis administrativos possíveis:

- Platform Owner;
- Platform Admin;
- Support;
- Billing;
- Security;
- Operations;
- Read Only Analyst.

Aplicar least privilege.

O Platform Owner é o nível máximo.

---

# 140. Goodz Admin Guard™

Tecnologia de proteção de ações administrativas.

Para ações de alto impacto:

- confirmação explícita;
- reautenticação;
- MFA;
- reason required;
- preview do impacto;
- audit log;
- reversão quando possível;
- dual approval para ações extremas futuramente.

Exemplos:

- suspender tenant;
- transferir ownership;
- alterar cobrança;
- exclusão;
- alterar entitlement crítico;
- acessar suporte privilegiado.

---

# 141. Classificação do Controlled Scope Delta 001

## NECESSARY

- Goodz Feedback System™;
- Goodz Error Experience™;
- Goodz Motion System™ base;
- Notification Center;
- Notification Rules;
- Settings hierarchy;
- Personal Settings;
- Tenant Settings;
- AI Settings;
- Settings Registry;
- arquitetura do Super Admin;
- tenant management básico;
- user management básico;
- plans/entitlements;
- audit;
- security controls.

## IMPORTANT

- presença/usage avançado;
- billing analytics;
- AI economics;
- system health;
- error center;
- integration operations;
- feature flags;
- support mode;
- communications.

## FUTURE / SaaS MATURITY

- coortes avançadas;
- LTV/churn modeling sofisticado;
- dual approval administrativo;
- status page pública;
- analytics de produto avançado;
- automações de suporte;
- billing enterprise complexo.

---

# 142. Regra para implementação

A visão completa deve ser documentada desde o Blueprint, mas implementação será incremental.

Especialmente:

> O Super Admin deve nascer arquiteturalmente correto, porém seus módulos avançados poderão ser liberados conforme o SaaS amadurecer.

Não construir o painel administrativo inteiro antes de existir necessidade operacional comprovada.

Porém:

- tenancy;
- roles;
- entitlements;
- audit;
- settings hierarchy;
- security;
- notification foundation;

devem ser fundações iniciais para evitar migrações destrutivas posteriores.

---

# 143. Atualização do status

```text
IDEATION PHASE: CLOSED
CONTROLLED SCOPE DELTA 001: ACCEPTED
UX FEEDBACK SYSTEM: REQUIRED
NOTIFICATION ARCHITECTURE: REQUIRED
SETTINGS HIERARCHY: REQUIRED
SUPER ADMIN ARCHITECTURE: REQUIRED
READY FOR BLUEPRINT: YES
READY FOR IMPLEMENTATION: NO
```

Próxima etapa permanece:

> criação do repositório + instalação do GEF Bootstrap 1.1 + Source Check + Blueprint/Source Pack.

---

**Fim — Goodz Menu Master Ideas & Vision v0.3 — IDEATION CLOSED + CSD-001**
