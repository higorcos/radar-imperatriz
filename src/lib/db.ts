import "server-only";
import postgres from "postgres";
import { env } from "./env";

const globalForDb = globalThis as unknown as { radarSql?: postgres.Sql };

/** Cliente PostgreSQL compartilhado. Todas as queries usam tagged templates (parametrizadas). */
export function db(): postgres.Sql {
  if (!globalForDb.radarSql) {
    globalForDb.radarSql = postgres(env().DATABASE_URL, {
      max: 5,
      prepare: false, // compatível com o pooler do Supabase
      idle_timeout: 20,
      onnotice: () => {},
    });
  }
  return globalForDb.radarSql;
}
