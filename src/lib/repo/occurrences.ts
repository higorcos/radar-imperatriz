import "server-only";
import { cachedQuery } from "../cache";
import { db } from "../db";

export const OCCURRENCE_STATUSES = ["recebida", "em_apuracao", "confirmada", "descartada", "publicada"] as const;
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];

export const OCCURRENCE_STATUS_LABELS: Record<OccurrenceStatus, string> = {
  recebida: "Recebida (não verificada)",
  em_apuracao: "Em apuração",
  confirmada: "Confirmada",
  descartada: "Descartada",
  publicada: "Publicada",
};

export interface Occurrence {
  id: string;
  description: string;
  location: string | null;
  occurred_at: Date | null;
  initial_source: string | null;
  category: string;
  status: OccurrenceStatus;
  notes: string | null;
  next_actions: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OccurrenceInput {
  description: string;
  location: string | null;
  occurred_at: Date | null;
  initial_source: string | null;
  category: string;
  status: OccurrenceStatus;
  notes: string | null;
  next_actions: string | null;
}

async function listOccurrencesQuery(status?: OccurrenceStatus): Promise<Occurrence[]> {
  const sql = db();
  return sql<Occurrence[]>`
    select * from occurrences ${status ? sql`where status = ${status}` : sql``}
    order by case status when 'recebida' then 0 when 'em_apuracao' then 1 when 'confirmada' then 2 else 3 end, created_at desc
    limit 200
  `;
}

async function getOccurrenceQuery(id: string): Promise<Occurrence | null> {
  const sql = db();
  const [row] = await sql<Occurrence[]>`select * from occurrences where id = ${id}`;
  return row ?? null;
}

export async function createOccurrence(o: OccurrenceInput): Promise<string> {
  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    insert into occurrences (description, location, occurred_at, initial_source, category, status, notes, next_actions)
    values (${o.description}, ${o.location}, ${o.occurred_at}, ${o.initial_source}, ${o.category}, ${o.status}, ${o.notes}, ${o.next_actions})
    returning id
  `;
  return row.id;
}

export async function updateOccurrence(id: string, o: OccurrenceInput) {
  const sql = db();
  await sql`
    update occurrences set description = ${o.description}, location = ${o.location}, occurred_at = ${o.occurred_at},
      initial_source = ${o.initial_source}, category = ${o.category}, status = ${o.status}, notes = ${o.notes},
      next_actions = ${o.next_actions}, updated_at = now()
    where id = ${id}
  `;
}

export async function deleteOccurrence(id: string) {
  const sql = db();
  await sql`delete from occurrences where id = ${id}`;
}

async function countOpenOccurrencesQuery(): Promise<number> {
  const sql = db();
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from occurrences where status in ('recebida','em_apuracao')`;
  return r.n;
}

async function searchOccurrencesQuery(q: string, limit = 20): Promise<Occurrence[]> {
  const sql = db();
  const like = `%${q}%`;
  return sql<Occurrence[]>`
    select * from occurrences
    where description ilike ${like} or location ilike ${like} or notes ilike ${like}
    order by created_at desc limit ${limit}
  `;
}

// Leituras com cache (invalidado a cada gravação — ver src/lib/cache.ts).
export const listOccurrences = cachedQuery(listOccurrencesQuery, "occurrences.listOccurrences");
export const getOccurrence = cachedQuery(getOccurrenceQuery, "occurrences.getOccurrence");
export const countOpenOccurrences = cachedQuery(countOpenOccurrencesQuery, "occurrences.countOpenOccurrences");
export const searchOccurrences = cachedQuery(searchOccurrencesQuery, "occurrences.searchOccurrences");
