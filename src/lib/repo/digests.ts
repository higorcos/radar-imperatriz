import "server-only";
import { cachedQuery } from "../cache";
import { db } from "../db";

export type DigestKind = "resumo_nacional" | "conexoes_imperatriz" | "pautas_populacao";

export interface Digest<T> {
  id: string;
  kind: DigestKind;
  content: T;
  article_ids: string[];
  model: string;
  created_at: Date;
}

async function latestDigestQuery(kind: DigestKind): Promise<Digest<unknown> | null> {
  const sql = db();
  const [row] = await sql<Digest<unknown>[]>`select * from ai_digests where kind = ${kind} order by created_at desc limit 1`;
  return row ?? null;
}

const latestDigestCached = cachedQuery(latestDigestQuery, "digests.latestDigest");

/** Último conteúdo de IA do tipo pedido (com cache, invalidado a cada gravação). */
export async function latestDigest<T>(kind: DigestKind): Promise<Digest<T> | null> {
  return (await latestDigestCached(kind)) as Digest<T> | null;
}

export async function saveDigest(kind: DigestKind, content: unknown, articleIds: string[], model: string) {
  const sql = db();
  await sql`
    insert into ai_digests (kind, content, article_ids, model)
    values (${kind}, ${sql.json(content as never)}, ${articleIds}, ${model})
  `;
}
