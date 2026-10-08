import "server-only";
import { revalidateTag, unstable_cache, updateTag } from "next/cache";

/**
 * Cache das leituras do banco.
 *
 * Toda leitura dos repositórios passa por `cachedQuery` e fica guardada até a próxima gravação:
 * qualquer server action que grava chama `invalidateDb()`, e a coleta agendada chama
 * `invalidateDbFromRoute()`. A validade de segurança cobre gravações feitas por fora do site
 * (SQL Editor do Supabase ou scripts de terminal), que não passam por essas funções.
 *
 * Usamos `unstable_cache` porque o `use cache` exige ativar Cache Components, que muda o modelo
 * de renderização do projeto inteiro (e remove `dynamic = "force-dynamic"`).
 */
export const DB_TAG = "radar-db";
const SAFETY_TTL_SECONDS = 60 * 60;

// O cache serializa em JSON: datas voltam como texto. Os campos de data do projeto terminam em
// "_at" (published_at, created_at…) ou "At" (lastSuccessAt), então são reconvertidos aqui.
const DATE_KEY = /(_at|At)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = DATE_KEY.test(k) && typeof v === "string" && ISO_DATE.test(v) ? new Date(v) : reviveDates(v);
    }
    return out as T;
  }
  return value;
}

/** Envolve uma leitura do banco com cache invalidado por gravações. `key` identifica a função. */
export function cachedQuery<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string): (...args: A) => Promise<R> {
  const cached = unstable_cache(fn, ["radar", key], { tags: [DB_TAG], revalidate: SAFETY_TTL_SECONDS });
  return async (...args: A) => reviveDates(await cached(...args));
}

/** Em server actions: expira o cache na hora (a próxima leitura já vê a gravação). */
export function invalidateDb(): void {
  updateTag(DB_TAG);
}

/** Em route handlers (coleta agendada): mesma invalidação imediata, sem servir dado antigo. */
export function invalidateDbFromRoute(): void {
  revalidateTag(DB_TAG, { expire: 0 });
}
