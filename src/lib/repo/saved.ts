import "server-only";
import { cachedQuery } from "../cache";
import { db } from "../db";

export const SAVED_KINDS = ["noticia", "pauta", "fonte", "ideia", "rascunho", "entrevista"] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

export const SAVED_KIND_LABELS: Record<SavedKind, string> = {
  noticia: "Notícia",
  pauta: "Pauta",
  fonte: "Fonte",
  ideia: "Ideia",
  rascunho: "Rascunho",
  entrevista: "Entrevista planejada",
};

export interface SavedItem {
  id: string;
  kind: SavedKind;
  article_id: string | null;
  title: string;
  url: string | null;
  notes: string | null;
  tags: string[];
  created_at: Date;
  source_name: string | null;
  scope: string | null;
  published_at: Date | null;
}

async function listSavedQuery(f: { kind?: SavedKind; tag?: string; q?: string }): Promise<SavedItem[]> {
  const sql = db();
  return sql<SavedItem[]>`
    select si.*, s.name as source_name, a.scope, a.published_at
    from saved_items si
    left join articles a on a.id = si.article_id
    left join sources s on s.id = a.source_id
    where true
      ${f.kind ? sql`and si.kind = ${f.kind}` : sql``}
      ${f.tag ? sql`and ${f.tag} = any(si.tags)` : sql``}
      ${f.q ? sql`and (si.title ilike ${"%" + f.q + "%"} or si.notes ilike ${"%" + f.q + "%"})` : sql``}
    order by si.created_at desc
    limit 200
  `;
}

async function allTagsQuery(): Promise<string[]> {
  const sql = db();
  const rows = await sql<{ tag: string }[]>`select distinct unnest(tags) as tag from saved_items order by 1`;
  return rows.map((r) => r.tag);
}

async function countSavedQuery(): Promise<number> {
  const sql = db();
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from saved_items`;
  return r.n;
}

/** Salva/remove uma notícia da biblioteca. Retorna o novo estado. */
export async function toggleSavedArticle(articleId: string): Promise<{ saved: boolean; title: string } | null> {
  const sql = db();
  const [article] = await sql<{ title: string; url: string }[]>`select title, url from articles where id = ${articleId}`;
  if (!article) return null;
  const removed = await sql`delete from saved_items where article_id = ${articleId} returning id`;
  if (removed.length > 0) return { saved: false, title: article.title };
  await sql`
    insert into saved_items (kind, article_id, title, url) values ('noticia', ${articleId}, ${article.title}, ${article.url})
  `;
  return { saved: true, title: article.title };
}

export async function createSaved(item: { kind: SavedKind; title: string; url: string | null; notes: string | null; tags: string[] }) {
  const sql = db();
  await sql`
    insert into saved_items (kind, title, url, notes, tags)
    values (${item.kind}, ${item.title}, ${item.url}, ${item.notes}, ${item.tags})
  `;
}

export async function updateSaved(id: string, data: { notes: string | null; tags: string[] }) {
  const sql = db();
  await sql`update saved_items set notes = ${data.notes}, tags = ${data.tags} where id = ${id}`;
}

export async function deleteSaved(id: string) {
  const sql = db();
  await sql`delete from saved_items where id = ${id}`;
}

async function getSavedQuery(id: string): Promise<SavedItem | null> {
  const sql = db();
  const [row] = await sql<SavedItem[]>`
    select si.*, null as source_name, null as scope, null as published_at from saved_items si where id = ${id}
  `;
  return row ?? null;
}

// Leituras com cache (invalidado a cada gravação — ver src/lib/cache.ts).
export const listSaved = cachedQuery(listSavedQuery, "saved.listSaved");
export const allTags = cachedQuery(allTagsQuery, "saved.allTags");
export const countSaved = cachedQuery(countSavedQuery, "saved.countSaved");
export const getSaved = cachedQuery(getSavedQuery, "saved.getSaved");
