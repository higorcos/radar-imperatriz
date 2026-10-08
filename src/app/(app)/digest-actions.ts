"use server";

import { revalidatePath } from "next/cache";
import { invalidateDb } from "@/lib/cache";
import { requireSession } from "@/lib/auth";
import { buildMaterial, imperatrizConnections, nationalDigest, populationImpact } from "@/lib/ai/features";
import { runAi } from "@/lib/ai/run";
import type { ActionResult } from "@/lib/action-result";
import { listArticles, type Article } from "@/lib/repo/articles";
import { logActivity } from "@/lib/repo/activity";
import { saveDigest } from "@/lib/repo/digests";

function toMaterial(articles: Article[]) {
  return buildMaterial(
    articles.map((a) => ({
      id: a.id,
      kind: "noticia" as const,
      title: a.title,
      text: a.excerpt,
      source: a.source_name,
      date: a.published_at,
      contentKind: a.content_kind,
    })),
  );
}

/** Todos os IDs de notícia citados em qualquer nível do conteúdo. */
function collectIds(value: unknown, acc = new Set<string>()): string[] {
  if (Array.isArray(value)) value.forEach((v) => collectIds(v, acc));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "article_ids" && Array.isArray(v)) v.forEach((id) => acc.add(String(id)));
      else collectIds(v, acc);
    }
  }
  return [...acc];
}

export async function generateNationalDigest(): Promise<ActionResult> {
  await requireSession();
  const articles = (await listArticles({ scopes: ["nacional"], sinceHours: 24, limit: 80 })).filter((a) => a.content_kind === "noticia");
  if (articles.length < 5) {
    return { ok: false, error: "Há poucas notícias nacionais das últimas 24 horas. Atualize a coleta e tente de novo." };
  }
  const material = toMaterial(articles);
  const res = await runAi(() => nationalDigest(material));
  if (!res.ok) return res;
  await saveDigest("resumo_nacional", res.data!.content, collectIds(res.data!.content), res.data!.model);
  await logActivity("gerou", "Resumo nacional do dia (IA)", "/nacionais?aba=resumo");
  invalidateDb();
  revalidatePath("/nacionais");
  return { ok: true, message: "Resumo nacional atualizado." };
}

export async function generateImperatrizConnections(): Promise<ActionResult> {
  await requireSession();
  const articles = (await listArticles({ scopes: ["nacional"], sinceHours: 48, limit: 60 })).filter((a) => a.content_kind === "noticia");
  if (articles.length < 5) return { ok: false, error: "Há poucas notícias nacionais recentes. Atualize a coleta e tente de novo." };
  const material = toMaterial(articles);
  const res = await runAi(() => imperatrizConnections(material));
  if (!res.ok) return res;
  await saveDigest("conexoes_imperatriz", res.data!.content, collectIds(res.data!.content), res.data!.model);
  await logActivity("gerou", "Conexões nacionais com Imperatriz (IA)", "/nacionais?aba=imperatriz");
  invalidateDb();
  revalidatePath("/nacionais");
  return { ok: true, message: "Hipóteses de conexão geradas." };
}

export async function generatePopulationImpact(): Promise<ActionResult> {
  await requireSession();
  const local = await listArticles({ scopes: ["local"], sinceHours: 24 * 14, limit: 30 });
  const state = await listArticles({ scopes: ["estadual"], sinceHours: 72, limit: 30 });
  const articles = [...local, ...state].filter((a) => a.content_kind === "noticia");
  if (articles.length < 3) return { ok: false, error: "Há poucas notícias locais recentes. Atualize a coleta e tente de novo." };
  const material = toMaterial(articles);
  const res = await runAi(() => populationImpact(material));
  if (!res.ok) return res;
  await saveDigest("pautas_populacao", res.data!.content, collectIds(res.data!.content), res.data!.model);
  await logActivity("gerou", "Pautas que afetam a população (IA)", "/imperatriz");
  invalidateDb();
  revalidatePath("/imperatriz");
  return { ok: true, message: "Sugestões geradas." };
}
