import "server-only";
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

export async function latestDigest<T>(kind: DigestKind): Promise<Digest<T> | null> {
  const sql = db();
  const [row] = await sql<Digest<T>[]>`select * from ai_digests where kind = ${kind} order by created_at desc limit 1`;
  return row ?? null;
}

export async function saveDigest(kind: DigestKind, content: unknown, articleIds: string[], model: string) {
  const sql = db();
  await sql`
    insert into ai_digests (kind, content, article_ids, model)
    values (${kind}, ${sql.json(content as never)}, ${articleIds}, ${model})
  `;
}
