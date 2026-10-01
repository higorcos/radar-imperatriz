import "server-only";
import { db } from "../db";

export interface Activity {
  id: number;
  action: string;
  label: string;
  href: string | null;
  created_at: Date;
}

/** Registra uma ação da usuária (sem dados pessoais nem segredos). */
export async function logActivity(action: string, label: string, href?: string): Promise<void> {
  const sql = db();
  await sql`insert into activity_log (action, label, href) values (${action}, ${label.slice(0, 200)}, ${href ?? null})`;
}

export async function recentActivity(limit = 8): Promise<Activity[]> {
  const sql = db();
  return sql<Activity[]>`select * from activity_log order by created_at desc limit ${limit}`;
}
