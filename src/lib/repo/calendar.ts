import "server-only";
import { db } from "../db";
import type { ProductionStatus } from "./pautas";

export const CALENDAR_KINDS = ["publicacao", "pauta", "entrevista", "evento", "prazo"] as const;
export type CalendarKind = (typeof CALENDAR_KINDS)[number];
export const CALENDAR_KIND_LABELS: Record<CalendarKind, string> = {
  publicacao: "Publicação",
  pauta: "Pauta",
  entrevista: "Entrevista",
  evento: "Evento",
  prazo: "Prazo de apuração",
};

export interface CalendarItem {
  id: string;
  title: string;
  kind: CalendarKind;
  starts_at: Date;
  status: ProductionStatus;
  pauta_id: string | null;
  draft_id: string | null;
  notes: string | null;
  created_at: Date;
}

export async function listCalendar(from: Date, to: Date): Promise<CalendarItem[]> {
  const sql = db();
  return sql<CalendarItem[]>`
    select * from calendar_items where starts_at >= ${from} and starts_at < ${to} order by starts_at
  `;
}

export async function listCalendarAll(limit = 300): Promise<CalendarItem[]> {
  const sql = db();
  return sql<CalendarItem[]>`select * from calendar_items order by starts_at desc limit ${limit}`;
}

export async function upcomingCalendar(days = 7, limit = 8): Promise<CalendarItem[]> {
  const sql = db();
  return sql<CalendarItem[]>`
    select * from calendar_items
    where starts_at >= date_trunc('day', now()) and starts_at < now() + make_interval(days => ${days})
    order by starts_at limit ${limit}
  `;
}

export async function inProduction(limit = 6): Promise<CalendarItem[]> {
  const sql = db();
  return sql<CalendarItem[]>`
    select * from calendar_items where status in ('em_apuracao','em_producao','em_revisao','pronto')
    order by starts_at limit ${limit}
  `;
}

export async function createCalendarItem(c: {
  title: string;
  kind: CalendarKind;
  starts_at: Date;
  status: ProductionStatus;
  pauta_id: string | null;
  draft_id: string | null;
  notes: string | null;
}): Promise<string> {
  const sql = db();
  const [row] = await sql<{ id: string }[]>`
    insert into calendar_items (title, kind, starts_at, status, pauta_id, draft_id, notes)
    values (${c.title}, ${c.kind}, ${c.starts_at}, ${c.status}, ${c.pauta_id}, ${c.draft_id}, ${c.notes})
    returning id
  `;
  return row.id;
}

export async function setCalendarStatus(id: string, status: ProductionStatus) {
  const sql = db();
  await sql`update calendar_items set status = ${status} where id = ${id}`;
}

export async function deleteCalendarItem(id: string) {
  const sql = db();
  await sql`delete from calendar_items where id = ${id}`;
}
