"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { isCategoryKey } from "@/lib/categories";
import { collectFeeds } from "@/lib/collector/collect";
import { decodeBody, parseFeed } from "@/lib/collector/feed-parser";
import { safeFetch } from "@/lib/collector/safe-fetch";
import { db } from "@/lib/db";
import { firstIssue, optionalText, uuid, type ActionResult } from "@/lib/action-result";
import { isHttpUrl } from "@/lib/text";
import { logActivity } from "@/lib/repo/activity";

const httpUrl = z.string().trim().max(1000).refine(isHttpUrl, "Endereço inválido (use http ou https)");

const SourceForm = z
  .object({
    name: z.string().trim().min(2, "Informe o nome").max(200),
    site_url: httpUrl,
    feed_url: z.string().trim().max(1000).optional().transform((v) => v || null),
    type: z.enum(["jornalistica", "institucional", "documento_publico", "relato_usuario", "agregador"]),
    scope: z.enum(["local", "estadual", "nacional"]),
    region: z.string().trim().min(2).max(120),
    method: z.enum(["rss", "manual", "sem_integracao"]),
    frequency_minutes: z.coerce.number().int().min(15, "Frequência mínima: 15 min").max(10080),
    categories: z.array(z.string().refine(isCategoryKey)).max(5).default([]),
    notes: optionalText(1000),
  })
  .refine((d) => d.method !== "rss" || (d.feed_url && isHttpUrl(d.feed_url)), { message: "Informe o endereço do feed RSS", path: ["feed_url"] });

/** Cadastra a fonte. Para RSS, testa o feed antes de salvar e informa o resultado real. */
export async function createSourceAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireSession();
  const raw = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && k !== "categories"));
  const parsed = SourceForm.safeParse({ ...raw, categories: fd.getAll("categories").filter((v) => typeof v === "string") });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const s = parsed.data;

  if (s.method === "rss" && s.feed_url) {
    try {
      const res = await safeFetch(s.feed_url);
      const items = res.body ? parseFeed(decodeBody(res.body, res.contentType)) : [];
      if (items.length === 0) return { ok: false, error: "O endereço respondeu, mas não encontramos itens de RSS/Atom. Confira o link do feed." };
    } catch (err) {
      return { ok: false, error: `Não foi possível ler o feed: ${err instanceof Error ? err.message : "erro desconhecido"}` };
    }
  }

  const sql = db();
  const dup = await sql`select 1 from sources where name = ${s.name} or (feed_url is not null and feed_url = ${s.feed_url})`;
  if (dup.length) return { ok: false, error: "Já existe uma fonte com esse nome ou feed." };
  await sql`
    insert into sources (name, site_url, feed_url, type, scope, region, categories, method, frequency_minutes, enabled, allow_images, notes)
    values (${s.name}, ${s.site_url}, ${s.method === "rss" ? s.feed_url : null}, ${s.type}, ${s.scope}, ${s.region}, ${s.categories},
            ${s.method}, ${s.frequency_minutes}, true, false, ${s.notes})
  `;
  await logActivity("cadastrou", `Fonte: ${s.name}`, "/fontes");
  revalidatePath("/fontes");
  return { ok: true, message: s.method === "rss" ? "Fonte cadastrada e feed validado." : "Fonte cadastrada." };
}

export async function toggleSourceAction(id: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  if (!pid.success) return { ok: false, error: "Fonte inválida." };
  const [row] = await db()<{ enabled: boolean }[]>`update sources set enabled = not enabled where id = ${pid.data} returning enabled`;
  if (!row) return { ok: false, error: "Fonte não encontrada." };
  revalidatePath("/fontes");
  return { ok: true, message: row.enabled ? "Fonte ativada." : "Fonte desativada." };
}

export async function testSourceAction(id: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  if (!pid.success) return { ok: false, error: "Fonte inválida." };
  const summary = await collectFeeds(db(), { sourceId: pid.data });
  const r = summary.results[0];
  revalidatePath("/fontes");
  if (!r) return { ok: false, error: "Esta fonte não tem feed RSS para consultar." };
  if (r.status === "erro") return { ok: false, error: `Falha: ${r.error}` };
  return { ok: true, message: r.status === "nao_modificado" ? "Feed sem alterações desde a última consulta." : `${r.found} itens lidos, ${r.inserted} novos.` };
}

export async function deleteSourceAction(id: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  if (!pid.success) return { ok: false, error: "Fonte inválida." };
  await db()`delete from sources where id = ${pid.data}`;
  revalidatePath("/fontes");
  return { ok: true, message: "Fonte e notícias associadas removidas." };
}
