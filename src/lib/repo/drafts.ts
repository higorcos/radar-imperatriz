import "server-only";
import { cachedQuery } from "../cache";
import { db } from "../db";

export interface Draft {
  id: string;
  pauta_id: string | null;
  article_id: string | null;
  format: string;
  style: string;
  title: string;
  body: string;
  ai_generated: boolean;
  created_at: Date;
  updated_at: Date;
}

async function listDraftsQuery(limit = 30): Promise<Draft[]> {
  const sql = db();
  return sql<Draft[]>`select * from content_drafts order by updated_at desc limit ${limit}`;
}

async function getDraftQuery(id: string): Promise<Draft | null> {
  const sql = db();
  const [row] = await sql<Draft[]>`select * from content_drafts where id = ${id}`;
  return row ?? null;
}

export async function saveDraft(d: {
  id?: string;
  pauta_id: string | null;
  article_id: string | null;
  format: string;
  style: string;
  title: string;
  body: string;
  ai_generated: boolean;
}): Promise<string> {
  const sql = db();
  if (d.id) {
    const [row] = await sql<{ id: string }[]>`
      update content_drafts set title = ${d.title}, body = ${d.body}, format = ${d.format}, style = ${d.style}, updated_at = now()
      where id = ${d.id} returning id
    `;
    if (row) return row.id;
  }
  const [row] = await sql<{ id: string }[]>`
    insert into content_drafts (pauta_id, article_id, format, style, title, body, ai_generated)
    values (${d.pauta_id}, ${d.article_id}, ${d.format}, ${d.style}, ${d.title}, ${d.body}, ${d.ai_generated})
    returning id
  `;
  return row.id;
}

export async function deleteDraft(id: string) {
  const sql = db();
  await sql`delete from content_drafts where id = ${id}`;
}

// Leituras com cache (invalidado a cada gravação — ver src/lib/cache.ts).
export const listDrafts = cachedQuery(listDraftsQuery, "drafts.listDrafts");
export const getDraft = cachedQuery(getDraftQuery, "drafts.getDraft");
