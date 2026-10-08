import "server-only";
import postgres from "postgres";
import { env } from "./env";

const globalForDb = globalThis as unknown as { radarSql?: postgres.Sql };

/** Cliente PostgreSQL compartilhado. Todas as queries usam tagged templates (parametrizadas). */
export function db(): postgres.Sql {
  if (!globalForDb.radarSql) {
    // Configuração para funções serverless (Vercel) + Transaction pooler do Supabase (porta 6543):
    // - prepare: false — o pooler em modo transação não suporta prepared statements nomeados;
    // - max_pipeline: 1 — sem pipelining: cada conexão envia uma consulta por vez. Com pipelining,
    //   o pooler pode separar o lote entre conexões do banco e a consulta trava até "statement timeout";
    // - max: 20 — cada consulta de uma página (o Dashboard dispara ~15 em paralelo) ganha a própria
    //   conexão, sem fila interna. Com poucas conexões, a fila da biblioteca deixava uma consulta sem
    //   resposta atrás do pooler. No modo transação, conexões de cliente são baratas (limite de 200);
    // - idle_timeout/max_lifetime curtos — a função é congelada entre requisições, então conexões
    //   ociosas devem ser descartadas cedo.
    const options: postgres.Options<Record<string, never>> & { max_pipeline: number } = {
      max: 20,
      prepare: false,
      max_pipeline: 1, // aceito pela biblioteca (src/index.js), mas ausente das definições de tipo
      idle_timeout: 5,
      max_lifetime: 60 * 5,
      connect_timeout: 10,
      onnotice: () => {},
    };
    globalForDb.radarSql = postgres(env().DATABASE_URL, options);
  }
  return globalForDb.radarSql;
}
