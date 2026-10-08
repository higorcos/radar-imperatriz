import "server-only";
import { cachedQuery } from "../cache";
import { db } from "../db";
import type { PautaDetails } from "../ai/schemas";

export const PRODUCTION_STATUSES = ["ideia", "em_apuracao", "em_producao", "em_revisao", "pronto", "publicado"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  ideia: "Ideia",
  em_apuracao: "Em apuração",
  em_producao: "Em produção",
  em_revisao: "Em revisão",
  pronto: "Pronto para publicar",
  publicado: "Publicado",
};

export type PautaStatus = ProductionStatus | "descartada";

export interface Pauta {
  id: string;
  title: string;
  summary: string;
  details: Partial<PautaDetails>;
  origin: "ia" | "manual";
  origin_label: string | null;
  article_ids: string[];
  status: PautaStatus;
  created_at: Date;
  updated_at: Date;
}

async function listPautasQuery(f: { status?: PautaStatus; limit?: number } = {}): Promise<Pauta[]> {
  const sql = db();
  return sql<Pauta[]>`
    select * from pautas
    where ${f.status ? sql`status = ${f.status}` : sql`status <> 'descartada'`}
    order by created_at desc limit ${f.limit ?? 100}
  `;
}

async function getPautaQuery(id: string): Promise<Pauta | null> {
  const sql = db();
  const [row] = await sql<Pauta[]>`select * from pautas where id = ${id}`;
  return row ?? null;
}

/** Títulos já cadastrados — enviados à IA para evitar sugestões repetidas. */
async function existingPautaTitlesQuery(limit = 60): Promise<string[]> {
  const sql = db();
  const rows = await sql<{ title: string }[]>`select title from pautas order by created_at desc limit ${limit}`;
  return rows.map((r) => r.title);
}

export async function createPauta(p: {
  title: string;
  summary: string;
  details: Partial<PautaDetails>;
  origin: "ia" | "manual";
  origin_label: string | null;
  article_ids: string[];
}): Promise<string> {
  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    insert into pautas (title, summary, details, origin, origin_label, article_ids)
    values (${p.title}, ${p.summary}, ${sql.json(p.details as never)}, ${p.origin}, ${p.origin_label}, ${p.article_ids})
    returning id
  `;
  return row.id;
}

export async function setPautaStatus(id: string, status: PautaStatus) {
  const sql = db();
  await sql`update pautas set status = ${status}, updated_at = now() where id = ${id}`;
}

export async function deletePauta(id: string) {
  const sql = db();
  await sql`delete from pautas where id = ${id}`;
}

async function countPautasInProgressQuery(): Promise<number> {
  const sql = db();
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from pautas where status in ('em_apuracao','em_producao','em_revisao','pronto')
  `;
  return r.n;
}

async function searchPautasQuery(q: string, limit = 20): Promise<Pauta[]> {
  const sql = db();
  const like = `%${q}%`;
  return sql<Pauta[]>`
    select * from pautas where title ilike ${like} or summary ilike ${like} order by created_at desc limit ${limit}
  `;
}

// Leituras com cache (invalidado a cada gravação — ver src/lib/cache.ts).
export const listPautas = cachedQuery(listPautasQuery, "pautas.listPautas");
export const getPauta = cachedQuery(getPautaQuery, "pautas.getPauta");
export const existingPautaTitles = cachedQuery(existingPautaTitlesQuery, "pautas.existingPautaTitles");
export const countPautasInProgress = cachedQuery(countPautasInProgressQuery, "pautas.countPautasInProgress");
export const searchPautas = cachedQuery(searchPautasQuery, "pautas.searchPautas");
