import type postgres from "postgres";
import { classify, detectContentKind, hasStatement, isCategoryKey, mentionsImperatriz } from "../categories";
import { decodeBody, parseFeed } from "./feed-parser";
import { safeFetch } from "./safe-fetch";

interface SourceRow {
  id: string;
  name: string;
  feed_url: string;
  scope: "local" | "estadual" | "nacional";
  categories: string[];
  allow_images: boolean;
  etag: string | null;
  last_modified: string | null;
}

export interface SourceResult {
  sourceId: string;
  name: string;
  status: "ok" | "nao_modificado" | "erro";
  found: number;
  inserted: number;
  error?: string;
}

export interface CollectSummary {
  startedAt: string;
  finishedAt: string;
  results: SourceResult[];
}

const CONCURRENCY = 4;

/**
 * Coleta os feeds RSS habilitados. Por padrão consulta só as fontes "vencidas"
 * (última consulta mais antiga que a frequência configurada); `force` consulta todas.
 * Recebe o cliente SQL para poder rodar tanto no Next.js quanto em scripts/cron.
 */
export async function collectFeeds(
  sql: postgres.Sql,
  opts: { force?: boolean; sourceId?: string } = {},
): Promise<CollectSummary> {
  const startedAt = new Date().toISOString();
  const sources = await sql<SourceRow[]>`
    select id, name, feed_url, scope, categories, allow_images, etag, last_modified
    from sources
    where method = 'rss' and feed_url is not null
      and ${opts.sourceId ? sql`id = ${opts.sourceId}` : sql`enabled`}
      and ${
        opts.force || opts.sourceId
          ? sql`true`
          : sql`(last_checked_at is null or last_checked_at < now() - make_interval(mins => frequency_minutes))`
      }
    order by case scope when 'local' then 0 when 'estadual' then 1 else 2 end, name
  `;

  const results: SourceResult[] = [];
  const queue = [...sources];
  async function worker() {
    for (let s = queue.shift(); s; s = queue.shift()) {
      results.push(await collectOne(sql, s));
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return { startedAt, finishedAt: new Date().toISOString(), results };
}

async function collectOne(sql: postgres.Sql, source: SourceRow): Promise<SourceResult> {
  const [run] = await sql<{ id: string }[]>`
    insert into collection_runs (source_id, status) values (${source.id}, 'erro') returning id
  `;
  try {
    const res = await safeFetch(source.feed_url, { etag: source.etag, lastModified: source.last_modified });
    if (res.notModified || !res.body) {
      await sql`update collection_runs set status = 'nao_modificado', finished_at = now() where id = ${run.id}`;
      await sql`
        update sources set last_checked_at = now(), last_success_at = now(), last_error = null, consecutive_failures = 0
        where id = ${source.id}
      `;
      return { sourceId: source.id, name: source.name, status: "nao_modificado", found: 0, inserted: 0 };
    }

    const items = parseFeed(decodeBody(res.body, res.contentType));
    const defaultCategory = source.categories.find(isCategoryKey);
    const rows = items.map((item) => {
      const fullText = `${item.title} ${item.excerpt}`;
      const local = mentionsImperatriz(fullText);
      let category: string = classify(item.title, item.excerpt, item.categories);
      if (category === "geral" && defaultCategory) category = defaultCategory;
      return {
        source_id: source.id,
        title: item.title.slice(0, 500),
        excerpt: item.excerpt || null,
        url: item.url,
        image_url: source.allow_images ? item.imageUrl : null,
        published_at: item.publishedAt,
        category,
        scope: local ? "local" : source.scope,
        content_kind: detectContentKind(item.url, item.title, item.categories),
        has_statement: hasStatement(item.title),
        mentions_imperatriz: local,
      };
    });

    let inserted = 0;
    if (rows.length > 0) {
      // Deduplicação por URL canônica. Se a mesma matéria chega por outra fonte, mantemos o
      // registro original e só tornamos o escopo mais específico (nacional → estadual → local).
      const out = await sql<{ inserted: boolean }[]>`
        insert into articles ${sql(rows)}
        on conflict (url) do update set
          scope = case
            when excluded.scope = 'local' or articles.scope = 'local' then 'local'
            when excluded.scope = 'estadual' or articles.scope = 'estadual' then 'estadual'
            else 'nacional' end,
          mentions_imperatriz = articles.mentions_imperatriz or excluded.mentions_imperatriz
        returning (xmax = 0) as inserted
      `;
      inserted = out.filter((r) => r.inserted).length;
    }

    await sql`
      update collection_runs set status = 'ok', finished_at = now(), items_found = ${rows.length}, items_new = ${inserted}
      where id = ${run.id}
    `;
    await sql`
      update sources set
        last_checked_at = now(), last_success_at = now(), last_error = null, consecutive_failures = 0,
        last_item_count = ${rows.length}, etag = ${res.etag}, last_modified = ${res.lastModified}
      where id = ${source.id}
    `;
    return { sourceId: source.id, name: source.name, status: "ok", found: rows.length, inserted };
  } catch (err) {
    const message = describeError(err);
    await sql`update collection_runs set finished_at = now(), error = ${message} where id = ${run.id}`;
    await sql`
      update sources set last_checked_at = now(), last_error = ${message}, consecutive_failures = consecutive_failures + 1
      where id = ${source.id}
    `;
    return { sourceId: source.id, name: source.name, status: "erro", found: 0, inserted: 0, error: message };
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError") return "Tempo esgotado ao consultar a fonte (20 s)";
    const cause = (err as Error & { cause?: { code?: string } }).cause;
    if (cause?.code === "ENOTFOUND") return "Domínio não encontrado";
    if (cause?.code === "ECONNREFUSED") return "Conexão recusada pela fonte";
    return err.message.slice(0, 300);
  }
  return "Erro desconhecido";
}
