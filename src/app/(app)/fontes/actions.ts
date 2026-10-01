"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { isCategoryKey } from "@/lib/categories";
import { collectFeeds } from "@/lib/collector/collect";
import { decodeBody, parseFeed } from "@/lib/collector/feed-parser";
import { parseListing } from "@/lib/collector/listing-parser";
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
    method: z.enum(["rss", "pagina_html", "manual", "sem_integracao"]),
    link_pattern: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => v || null)
      .refine((v) => {
        if (v === null) return true;
        try {
          new RegExp(v);
          return true;
        } catch {
          return false;
        }
      }, "Padrão de link inválido (expressão regular)"),
    frequency_minutes: z.coerce.number().int().min(15, "Frequência mínima: 15 min").max(10080),
    categories: z.array(z.string().refine(isCategoryKey)).max(5).default([]),
    notes: optionalText(1000),
  })
  .refine((d) => !["rss", "pagina_html"].includes(d.method) || (d.feed_url && isHttpUrl(d.feed_url)), {
    message: "Informe o endereço do feed RSS ou da página de notícias",
    path: ["feed_url"],
  })
  .refine((d) => d.method !== "pagina_html" || d.link_pattern, { message: "Informe o padrão dos links de notícia (ex.: /noticia/)", path: ["link_pattern"] });

/** Cadastra a fonte. Para RSS e página HTML, testa a leitura antes de salvar e informa o resultado real. */
export async function createSourceAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireSession();
  const raw = Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && k !== "categories"));
  const parsed = SourceForm.safeParse({ ...raw, categories: fd.getAll("categories").filter((v) => typeof v === "string") });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const s = parsed.data;

  const automatic = s.method === "rss" || s.method === "pagina_html";
  if (automatic && s.feed_url) {
    try {
      const res = await safeFetch(s.feed_url);
      const body = res.body ? decodeBody(res.body, res.contentType) : "";
      const items = s.method === "pagina_html" ? parseListing(body, s.feed_url, s.link_pattern!) : parseFeed(body);
      if (items.length === 0) {
        return {
          ok: false,
          error:
            s.method === "pagina_html"
              ? "A página respondeu, mas nenhum link casou com o padrão informado. Confira o padrão (ex.: /noticia/)."
              : "O endereço respondeu, mas não encontramos itens de RSS/Atom. Confira o link do feed.",
        };
      }
    } catch (err) {
      return { ok: false, error: `Não foi possível ler o endereço: ${err instanceof Error ? err.message : "erro desconhecido"}` };
    }
  }

  const sql = db();
  const dup = await sql`select 1 from sources where name = ${s.name} or (feed_url is not null and feed_url = ${s.feed_url})`;
  if (dup.length) return { ok: false, error: "Já existe uma fonte com esse nome ou feed." };
  await sql`
    insert into sources (name, site_url, feed_url, type, scope, region, categories, method, link_pattern, frequency_minutes, enabled, allow_images, notes)
    values (${s.name}, ${s.site_url}, ${automatic ? s.feed_url : null}, ${s.type}, ${s.scope}, ${s.region}, ${s.categories},
            ${s.method}, ${s.method === "pagina_html" ? s.link_pattern : null}, ${s.frequency_minutes}, true, false, ${s.notes})
  `;
  await logActivity("cadastrou", `Fonte: ${s.name}`, "/fontes");
  revalidatePath("/fontes");
  return { ok: true, message: automatic ? "Fonte cadastrada e leitura validada." : "Fonte cadastrada." };
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
  if (!r) return { ok: false, error: "Esta fonte não tem coleta automática configurada." };
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
