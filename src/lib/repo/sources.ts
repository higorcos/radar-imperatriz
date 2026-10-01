import "server-only";
import { db } from "../db";

export type SourceHealth = "ok" | "instavel" | "falhando" | "desatualizada" | "nunca_consultada" | "sem_integracao" | "desativada";

export interface Source {
  id: string;
  name: string;
  site_url: string;
  feed_url: string | null;
  type: string;
  scope: string;
  region: string;
  categories: string[];
  method: string;
  frequency_minutes: number;
  enabled: boolean;
  allow_images: boolean;
  notes: string | null;
  last_checked_at: Date | null;
  last_success_at: Date | null;
  last_error: string | null;
  consecutive_failures: number;
  last_item_count: number | null;
  article_count: number;
  latest_article_at: Date | null;
}

export interface SourceWithHealth extends Source {
  health: SourceHealth;
}

/** Estado da integração, derivado de dados reais de coleta. */
export function sourceHealth(s: Source, now = Date.now()): SourceHealth {
  if (!s.enabled) return "desativada";
  if (s.method !== "rss" || !s.feed_url) return "sem_integracao";
  if (!s.last_checked_at) return "nunca_consultada";
  if (s.consecutive_failures >= 3) return "falhando";
  if (s.consecutive_failures >= 1) return "instavel";
  const limit = 3 * s.frequency_minutes * 60 * 1000;
  if (!s.last_success_at || now - s.last_success_at.getTime() > Math.max(limit, 6 * 3600 * 1000)) return "desatualizada";
  return "ok";
}

export async function listSources(): Promise<SourceWithHealth[]> {
  const sql = db();
  const rows = await sql<Source[]>`
    select s.*, coalesce(st.n, 0)::int as article_count, st.latest as latest_article_at
    from sources s
    left join lateral (
      select count(*) as n, max(coalesce(published_at, collected_at)) as latest from articles where source_id = s.id
    ) st on true
    order by case s.scope when 'local' then 0 when 'estadual' then 1 else 2 end, s.name
  `;
  return rows.map((s) => ({ ...s, health: sourceHealth(s) }));
}

export interface CollectionStatus {
  lastSuccessAt: Date | null;
  failing: { id: string; name: string; error: string | null }[];
  activeFeeds: number;
}

/** Situação geral da coleta — usada nos avisos de dados desatualizados. */
export async function collectionStatus(): Promise<CollectionStatus> {
  const sql = db();
  const [agg] = await sql<{ last: Date | null; active: number }[]>`
    select max(last_success_at) as last, count(*)::int as active
    from sources where enabled and method = 'rss' and feed_url is not null
  `;
  const failing = await sql<{ id: string; name: string; error: string | null }[]>`
    select id, name, last_error as error from sources
    where enabled and method = 'rss' and consecutive_failures >= 1 order by consecutive_failures desc
  `;
  return { lastSuccessAt: agg.last, failing, activeFeeds: agg.active };
}

export interface CollectionRun {
  id: number;
  source_name: string;
  started_at: Date;
  status: string;
  items_found: number;
  items_new: number;
  error: string | null;
}

export async function recentRuns(limit = 30): Promise<CollectionRun[]> {
  const sql = db();
  return sql<CollectionRun[]>`
    select r.id, s.name as source_name, r.started_at, r.status, r.items_found, r.items_new, r.error
    from collection_runs r join sources s on s.id = r.source_id
    order by r.started_at desc limit ${limit}
  `;
}
