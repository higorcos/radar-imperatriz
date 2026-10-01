import { z } from "zod";
import { isCategoryKey, type CategoryKey } from "./categories";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function paramText(v: string | string[] | undefined, max = 120): string | undefined {
  const s = one(v)?.trim();
  return s ? s.slice(0, max) : undefined;
}

export function paramUuid(v: string | string[] | undefined): string | undefined {
  const s = one(v);
  return s && uuidRe.test(s) ? s : undefined;
}

export function paramUuidList(v: string | string[] | undefined, max = 20): string[] {
  const raw = Array.isArray(v) ? v.join(",") : (v ?? "");
  return [...new Set(raw.split(",").filter((s) => uuidRe.test(s)))].slice(0, max);
}

export function paramCategory(v: string | string[] | undefined): CategoryKey | undefined {
  const s = one(v);
  return isCategoryKey(s) ? s : undefined;
}

export function paramEnum<T extends string>(v: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const s = one(v);
  return (allowed as readonly string[]).includes(s ?? "") ? (s as T) : fallback;
}

/** Período em horas: "" = todo o período. */
export function paramPeriod(v: string | string[] | undefined, fallback = 72): { hours?: number; raw: string } {
  const s = one(v);
  if (s === "") return { raw: "" };
  const n = z.coerce.number().int().safeParse(s);
  if (n.success && [24, 72, 168].includes(n.data)) return { hours: n.data, raw: String(n.data) };
  return { hours: fallback, raw: String(fallback) };
}

export function paramPage(v: string | string[] | undefined): number {
  const n = Number(one(v));
  return Number.isInteger(n) && n > 0 && n < 500 ? n : 1;
}
