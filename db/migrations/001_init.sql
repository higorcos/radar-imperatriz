-- Radar Imperatriz — schema inicial.
-- O banco é acessado apenas pelo servidor Next.js. No Supabase, o RLS fica ativo sem
-- políticas, bloqueando qualquer acesso pela API pública (anon/authenticated).

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- unaccent() não é IMMUTABLE; este wrapper permite usá-lo em colunas geradas/índices.
create or replace function immutable_unaccent(text) returns text
  language sql immutable parallel safe strict
  as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_url text not null,
  feed_url text unique,
  type text not null check (type in ('jornalistica','institucional','documento_publico','relato_usuario','agregador')),
  scope text not null check (scope in ('local','estadual','nacional')),
  region text not null,
  categories text[] not null default '{}',
  method text not null check (method in ('rss','manual','sem_integracao')),
  frequency_minutes int not null default 60 check (frequency_minutes between 5 and 10080),
  enabled boolean not null default true,
  allow_images boolean not null default false,
  notes text,
  etag text,
  last_modified text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  consecutive_failures int not null default 0,
  last_item_count int,
  created_at timestamptz not null default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  title text not null,
  excerpt text,                       -- trecho curto da descrição original (nunca o texto integral)
  url text not null unique,
  image_url text,
  published_at timestamptz,           -- nulo quando a fonte não informa
  collected_at timestamptz not null default now(),
  category text not null default 'geral',
  scope text not null check (scope in ('local','estadual','nacional')),
  content_kind text not null default 'noticia' check (content_kind in ('noticia','opiniao','analise')),
  has_statement boolean not null default false,
  mentions_imperatriz boolean not null default false,
  status text not null default 'processado' check (status in ('novo','processado','erro')),
  search tsvector generated always as (
    to_tsvector('portuguese', immutable_unaccent(coalesce(title,'') || ' ' || coalesce(excerpt,'')))
  ) stored
);
create index articles_scope_time_idx on articles (scope, coalesce(published_at, collected_at) desc);
create index articles_category_idx on articles (category);
create index articles_source_idx on articles (source_id);
create index articles_search_idx on articles using gin (search);

create table collection_runs (
  id bigserial primary key,
  source_id uuid not null references sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('ok','nao_modificado','erro')),
  items_found int not null default 0,
  items_new int not null default 0,
  error text
);
create index collection_runs_source_idx on collection_runs (source_id, started_at desc);

create table saved_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('noticia','pauta','fonte','ideia','rascunho','entrevista')),
  article_id uuid references articles(id) on delete set null,
  title text not null,
  url text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create unique index saved_items_article_uidx on saved_items (article_id) where article_id is not null;
create index saved_items_created_idx on saved_items (created_at desc);

create table occurrences (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  location text,
  occurred_at timestamptz,
  initial_source text,
  category text not null default 'geral',
  status text not null default 'recebida' check (status in ('recebida','em_apuracao','confirmada','descartada','publicada')),
  notes text,
  next_actions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index occurrences_status_idx on occurrences (status, created_at desc);

create table pautas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb, -- justificativa, perguntas, fontes etc.
  origin text not null check (origin in ('ia','manual')),
  origin_label text,
  article_ids uuid[] not null default '{}',
  status text not null default 'ideia' check (status in ('ideia','em_apuracao','em_producao','em_revisao','pronto','publicado','descartada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pautas_status_idx on pautas (status, created_at desc);

create table content_drafts (
  id uuid primary key default gen_random_uuid(),
  pauta_id uuid references pautas(id) on delete set null,
  article_id uuid references articles(id) on delete set null,
  format text not null,
  style text not null,
  title text not null,
  body text not null,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_drafts_created_idx on content_drafts (created_at desc);

create table calendar_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('publicacao','pauta','entrevista','evento','prazo')),
  starts_at timestamptz not null,
  status text not null default 'ideia' check (status in ('ideia','em_apuracao','em_producao','em_revisao','pronto','publicado')),
  pauta_id uuid references pautas(id) on delete set null,
  draft_id uuid references content_drafts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index calendar_items_starts_idx on calendar_items (starts_at);

create table ai_digests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('resumo_nacional','conexoes_imperatriz','pautas_populacao')),
  content jsonb not null,
  article_ids uuid[] not null default '{}',
  model text not null,
  created_at timestamptz not null default now()
);
create index ai_digests_kind_idx on ai_digests (kind, created_at desc);

-- Registro de atividades (sem dados pessoais).
create table activity_log (
  id bigserial primary key,
  action text not null,
  label text not null,
  href text,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on activity_log (created_at desc);

alter table sources enable row level security;
alter table articles enable row level security;
alter table collection_runs enable row level security;
alter table saved_items enable row level security;
alter table occurrences enable row level security;
alter table pautas enable row level security;
alter table content_drafts enable row level security;
alter table calendar_items enable row level security;
alter table ai_digests enable row level security;
alter table activity_log enable row level security;
