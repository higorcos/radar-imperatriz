import "server-only";
import { cachedQuery } from "../cache";
import { db } from "../db";
import type { RankableArticle } from "../relevance";

export type Scope = "local" | "estadual" | "nacional";

export interface Article extends RankableArticle {
  excerpt: string | null;
  url: string;
  image_url: string | null;
  scope: Scope;
  has_statement: boolean;
  published_precision: "datetime" | "date";
  saved: boolean;
}

export interface ArticleFilters {
  scopes: Scope[];
  category?: string;
  sourceId?: string;
  /** Somente publicações das últimas N horas. */
  sinceHours?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

async function listArticlesQuery(f: ArticleFilters): Promise<Article[]> {
  const sql = db();
  const limit = Math.min(f.limit ?? 30, 200);
  return sql<Article[]>`
    select a.id, a.title, a.excerpt, a.url, a.image_url, a.published_at, a.collected_at, a.category, a.scope,
           a.content_kind, a.has_statement, a.mentions_imperatriz, a.published_precision,
           s.id as source_id, s.name as source_name, s.type as source_type,
           exists (select 1 from saved_items si where si.article_id = a.id) as saved
    from articles a
    join sources s on s.id = a.source_id
    where a.scope in ${sql(f.scopes)}
      ${f.category ? sql`and a.category = ${f.category}` : sql``}
      ${f.sourceId ? sql`and a.source_id = ${f.sourceId}` : sql``}
      ${f.sinceHours ? sql`and coalesce(a.published_at, a.collected_at) > now() - make_interval(hours => ${f.sinceHours})` : sql``}
      ${f.q ? sql`and a.search @@ websearch_to_tsquery('portuguese', immutable_unaccent(${f.q}))` : sql``}
    order by coalesce(a.published_at, a.collected_at) desc
    limit ${limit} offset ${f.offset ?? 0}
  `;
}

async function countArticlesQuery(f: Omit<ArticleFilters, "limit" | "offset">): Promise<number> {
  const sql = db();
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from articles a
    where a.scope in ${sql(f.scopes)}
      ${f.category ? sql`and a.category = ${f.category}` : sql``}
      ${f.sourceId ? sql`and a.source_id = ${f.sourceId}` : sql``}
      ${f.sinceHours ? sql`and coalesce(a.published_at, a.collected_at) > now() - make_interval(hours => ${f.sinceHours})` : sql``}
      ${f.q ? sql`and a.search @@ websearch_to_tsquery('portuguese', immutable_unaccent(${f.q}))` : sql``}
  `;
  return row.n;
}

async function getArticlesByIdsQuery(ids: string[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const sql = db();
  return sql<Article[]>`
    select a.id, a.title, a.excerpt, a.url, a.image_url, a.published_at, a.collected_at, a.category, a.scope,
           a.content_kind, a.has_statement, a.mentions_imperatriz, a.published_precision,
           s.id as source_id, s.name as source_name, s.type as source_type,
           exists (select 1 from saved_items si where si.article_id = a.id) as saved
    from articles a join sources s on s.id = a.source_id
    where a.id in ${sql(ids)}
    order by coalesce(a.published_at, a.collected_at) desc
  `;
}

async function articleExistsQuery(id: string): Promise<boolean> {
  const sql = db();
  const [row] = await sql`select 1 from articles where id = ${id}`;
  return Boolean(row);
}

/** Fontes que já têm notícias no escopo (para o filtro "Fonte"). */
async function sourcesWithArticlesQuery(scopes: Scope[]): Promise<{ id: string; name: string }[]> {
  const sql = db();
  return sql`
    select distinct s.id, s.name from sources s join articles a on a.source_id = s.id
    where a.scope in ${sql(scopes)} order by s.name
  `;
}

async function articleStatsQuery(): Promise<{ local24: number; national24: number; total: number }> {
  const sql = db();
  const [row] = await sql<{ local24: number; national24: number; total: number }[]>`
    select
      count(*) filter (where scope in ('local','estadual') and coalesce(published_at, collected_at) > now() - interval '24 hours')::int as local24,
      count(*) filter (where scope = 'nacional' and coalesce(published_at, collected_at) > now() - interval '24 hours')::int as national24,
      count(*)::int as total
    from articles
  `;
  return row;
}

// Leituras com cache (invalidado a cada gravação — ver src/lib/cache.ts).
export const listArticles = cachedQuery(listArticlesQuery, "articles.listArticles");
export const countArticles = cachedQuery(countArticlesQuery, "articles.countArticles");
export const getArticlesByIds = cachedQuery(getArticlesByIdsQuery, "articles.getArticlesByIds");
export const articleExists = cachedQuery(articleExistsQuery, "articles.articleExists");
export const sourcesWithArticles = cachedQuery(sourcesWithArticlesQuery, "articles.sourcesWithArticles");
export const articleStats = cachedQuery(articleStatsQuery, "articles.articleStats");
