# Radar Imperatriz

**A informação que movimenta a cidade.**

Central de inteligência jornalística para acompanhar Imperatriz (MA), a região Tocantina e as notícias nacionais mais relevantes, encontrar pautas, organizar a apuração e preparar rascunhos de conteúdo para o Instagram.

É uma ferramenta de **apoio**: a coleta é periódica (não em tempo real), todo conteúdo de IA é marcado como sugestão e nada é publicado automaticamente.

## Funcionalidades

| Área | O que faz | Depende de |
|---|---|---|
| Dashboard | Destaques locais e nacionais com critérios visíveis, assuntos em alta, alertas de utilidade pública, pautas, produção, agenda e atividades | Coleta |
| Notícias de Imperatriz | "O que está acontecendo", feed com filtros (categoria, fonte, período, abrangência, relevância), "Pautas que afetam a população" (IA) | Coleta; IA opcional |
| Notícias Nacionais | Principais notícias, mais relevantes (com motivo), Brasil em foco (mesmo assunto em várias fontes), últimas, categorias, resumo do dia (IA), conexões com Imperatriz (IA, como hipóteses) | Coleta; IA opcional |
| Radar de Acontecimentos | Acontecendo agora, alertas, eventos, assuntos em desenvolvimento, previstos, acompanhamento + registro de ocorrências com estados de verificação | Coleta |
| Gerador de Pautas | Sugestões a partir de notícias, ocorrências, tema ou ideia; "Gerar novas ideias" e "Explorar outro ângulo"; evita repetir pautas cadastradas | IA |
| Criador de Conteúdo | Legenda, títulos, Reels, carrossel, Stories, perguntas, chamada e resumo, em 5 estilos; editor com prévia de post; copiar, salvar rascunho, enviar ao calendário | IA (ou escrita manual) |
| Calendário Editorial | Mês, semana, lista e quadro (Kanban) com os estados Ideia → Publicado | — |
| Notícias Salvas | Biblioteca com tipos, etiquetas e filtros; "Transformar em pauta" em um clique | — |
| Fontes de Informação | Cadastro (com validação do feed), estado da integração, detecção de falhas e de fontes que pararam de atualizar, histórico de coletas | — |
| Configurações | Situação real do banco, da IA e da coleta; regras de confiabilidade; sair | — |

## Tecnologias

- **Next.js 16 (App Router) + React 19 + TypeScript** — interface e backend no mesmo projeto (server components, server actions e route handlers). Sem serviço de backend separado.
- **Tailwind CSS 4** e **lucide-react** (ícones). Componentes próprios e enxutos em `src/components/ui.tsx` (sem shadcn/ui, para evitar dependências que a v1 não precisa).
- **PostgreSQL** via [`postgres`](https://github.com/porsager/postgres) com SQL parametrizado. Local: Docker. Produção: **Supabase** (mesmo schema).
- **fast-xml-parser** para RSS/Atom.
- **Claude API** (`@anthropic-ai/sdk`, modelo `claude-opus-5-5`) com saídas estruturadas validadas por **zod**.
- **Vitest** para testes.

## Requisitos

- Node.js 20.9+ (testado com Node 24)
- Docker (para o PostgreSQL local) — ou uma URL de PostgreSQL/Supabase
- Opcional: chave da API do Claude (recursos de IA)

## Instalação e uso local

```bash
npm install
docker compose up -d            # PostgreSQL local na porta 5434
cp .env.example .env.local      # e preencha (veja abaixo)
npm run setup                   # cria as tabelas e cadastra as fontes iniciais
npm run collect -- --force      # primeira coleta das fontes RSS
npm run dev                     # http://localhost:3000
```

Entre com a senha definida em `APP_PASSWORD`.

### Variáveis de ambiente (`.env.local`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Conexão PostgreSQL. Local: `postgres://radar:radar_dev_local@127.0.0.1:5434/radar_imperatriz` |
| `APP_PASSWORD` | sim | Senha de acesso ao painel (mín. 10 caracteres) |
| `SESSION_SECRET` | sim | Segredo da sessão (mín. 32 caracteres) — `openssl rand -hex 32` |
| `CRON_SECRET` | para coleta agendada | Token exigido por `/api/cron/collect` — `openssl rand -hex 24` |
| `ANTHROPIC_API_KEY` | para IA | Chave da API do Claude (console.anthropic.com). Sem ela, a IA fica desativada e a interface avisa |
| `ANTHROPIC_MODEL` | não | Padrão `claude-opus-5-5` |

Nenhuma chave vai para o navegador: todas são lidas só no servidor.

### Scripts

| Comando | Uso |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento, build e produção |
| `npm run setup` | `db:migrate` + `db:seed` |
| `npm run collect` | Coleta as fontes vencidas (`-- --force` para todas) |
| `npm run reclassify` | Reaplica as regras de categoria após alterar `src/lib/categories.ts` |
| `npm test` / `npm run lint` / `npm run typecheck` | Qualidade |

## Integrações

### Fontes e coleta

A coleta usa **RSS/Atom públicos** e, para sites institucionais que não têm RSS, a **página de listagem de notícias** (método "Página de notícias (HTML)"): dela lemos só título, link e data de cada item — nunca abrimos as matérias. Não contornamos bloqueios nem disfarçamos o leitor (o user-agent se identifica como `RadarImperatriz`). Fontes iniciais, testadas em 01/10/2026:

- **Funcionando por RSS:** Imperatriz Notícias, g1 Maranhão, Imirante, Agência Brasil, Agência Senado, Câmara dos Deputados, g1, BBC News Brasil, CNN Brasil, Folha (Em cima da hora), Estadão (Brasil).
- **Desativadas:** Poder360 (recusa leitores automatizados — HTTP 403) e Google Notícias (termos limitam a uso pessoal e não comercial; avalie antes de ativar).
- **Por página de listagem (sem RSS):** Prefeitura de Imperatriz (`imperatriz.ma.gov.br/noticias/`) e Câmara Municipal de Imperatriz (`camaraimperatriz.ma.gov.br/noticias`), a cada 2 horas. Esses sites informam só o dia da publicação, então a interface mostra "publicado em dd/mm/aaaa", sem horário.
- **Sem integração, só consulta manual:** Governo do Maranhão, gov.br, Defesa Civil Nacional, UOL.

De cada matéria guardamos **título, link, fonte, datas, categoria e um trecho curto (≈280 caracteres) da descrição** — nunca o texto integral, mesmo quando o feed o oferece. Imagens só aparecem de fontes com licença aberta (Agência Brasil, Agência Senado e Câmara), com crédito.

Cada consulta usa requisição condicional (ETag/Last-Modified), timeout de 20 s, limite de 5 MB e bloqueio de endereços internos (proteção contra SSRF). Duplicatas são eliminadas pela URL canônica.

### Coleta agendada

Chame `GET /api/cron/collect` com o cabeçalho `Authorization: Bearer <CRON_SECRET>`. A rota consulta apenas as fontes cuja frequência venceu.

- **GitHub Actions (grátis):** `.github/workflows/coleta.yml` chama a rota a cada hora. Defina os secrets `APP_URL` e `CRON_SECRET` no repositório.
- **Vercel:** `vercel.json` agenda uma execução diária (limite do plano Hobby), como reserva.
- **Servidor próprio (crontab):**
  ```
  */30 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://SEU-DOMINIO/api/cron/collect > /dev/null
  ```
- **Alternativas:** GitHub Actions agendado ou um serviço externo de cron chamando a mesma URL.

O botão **Atualizar agora** força a consulta de todas as fontes ativas.

### Supabase (produção)

1. Crie um projeto no Supabase. Em **Connect** há duas *connection strings* que importam:
   - **Session pooler** (porta 5432): use para rodar as migrações e o seed a partir do seu computador:
     ```bash
     DATABASE_URL="<session pooler>" npx tsx scripts/migrate.ts
     DATABASE_URL="<session pooler>" npx tsx scripts/seed.ts
     ```
   - **Transaction pooler** (porta 6543): use como `DATABASE_URL` na Vercel (indicado para funções serverless).
2. Opcional: rode uma primeira coleta com `DATABASE_URL="<session pooler>" npx tsx scripts/collect.ts --force`.
3. As tabelas ficam com **RLS ativado e sem políticas**: a API pública do Supabase (anon/authenticated) não acessa nada; só o servidor da aplicação, pela conexão direta.

### Hospedagem

Vercel (ou qualquer host Node.js) com as variáveis de ambiente acima. As páginas de IA declaram `maxDuration = 120`.

### IA (Claude)

As chamadas ficam em `src/lib/ai/`. Cada recurso envia ao modelo apenas título, trecho, fonte e data das notícias selecionadas, com referências curtas (N1, N2…). A resposta é validada por schema; **referências que não existem no material são descartadas**, então a interface só mostra fontes reais. O prompt de sistema (`src/lib/ai/prompts.ts`) proíbe inventar fatos, nomes ou fontes, exige tratar relatos não verificados e conexões locais como hipóteses e veta o sensacionalismo. O fallback automático do servidor em caso de recusa (`fallbacks: "default"`) está ativado.

## Estrutura

```
db/migrations/        Schema SQL (aplicado por scripts/migrate.ts)
scripts/              migrate, seed, collect, reclassify
src/proxy.ts          Redireciona quem não tem sessão (checagem otimista)
src/app/login/        Login e logout
src/app/(app)/        Páginas autenticadas (uma pasta por seção + actions.ts)
src/app/api/cron/     Coleta agendada
src/components/       UI compartilhada (cards, filtros, menu, avisos)
src/lib/collector/    Busca segura, parser RSS/Atom e coleta
src/lib/ai/           Cliente, prompts, schemas e recursos de IA
src/lib/repo/         Acesso a dados (SQL parametrizado)
src/lib/categories.ts Classificação e sinais editoriais (opinião, declaração, alerta)
src/lib/relevance.ts  Agrupamento de assuntos e critérios de destaque
tests/                Testes (Vitest)
```

## Confiabilidade jornalística (como está implementada)

- Fonte, link original, data de publicação (ou "não informada") e data de coleta em toda notícia.
- **Relevância** é uma ordenação por critérios explícitos (cobertura por fontes diferentes, fonte institucional, tema de interesse público, atualidade, desdobramentos), exibidos em "Por que está em destaque?". Popularidade não entra; opinião não vira destaque.
- Selos de **Opinião**, **Análise** e **Declaração** (fala atribuída ≠ fato), detectados por sinais da própria fonte.
- Ocorrências entram como **Recebida (não verificada)**; estados: em apuração, confirmada, descartada, publicada.
- Avisos de **dados desatualizados** (última coleta com mais de 3 h) e de **fontes com falha**.
- Conteúdo de IA com selo, horário de geração e aviso quando tem mais de 24 h.

## Limitações conhecidas

- **IA não testada com chamadas reais no desenvolvimento** (não havia chave disponível). O código segue a documentação do SDK, os schemas foram validados por testes e os erros são tratados; faça um primeiro uso acompanhando os resultados.
- A coleta por página de listagem depende do HTML atual dos sites da Prefeitura e da Câmara: se o layout mudar, a fonte passa a aparecer como "Falhando" ou sem itens em Fontes, e o padrão de link precisa ser ajustado. Só a primeira página da listagem é lida; na Câmara, alguns títulos vêm truncados ("…") pelo próprio site.
- O Governo do MA não tem RSS nem listagem estática simples (o site é renderizado no navegador); segue como consulta manual.
- Categorias e sinais (opinião, declaração, alerta, evento) usam regras de palavras-chave: rápidas e explicáveis, mas sujeitas a erros pontuais. Ajuste `src/lib/categories.ts` e rode `npm run reclassify`.
- O agrupamento "mesmo assunto" compara palavras dos títulos; títulos muito diferentes sobre o mesmo fato podem não ser agrupados.
- Autenticação v1 com uma senha única (uso individual). Para várias usuárias, migrar para Supabase Auth com políticas RLS por usuária.
- O limite de tentativas de login fica em memória (reinicia com o servidor; não é compartilhado entre instâncias).
- Lembretes do calendário (e-mail/push) e publicação no Instagram não estão implementados — a publicação exige a API oficial da Meta e autorização explícita.
- A verificação contra SSRF resolve o DNS antes da requisição; um ataque de *DNS rebinding* ainda seria teoricamente possível. Só a usuária autenticada cadastra fontes.
