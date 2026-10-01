"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { collectFeeds } from "@/lib/collector/collect";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/repo/activity";
import { toggleSavedArticle } from "@/lib/repo/saved";
import { uuid, type ActionResult } from "@/lib/action-result";

export async function toggleSaveArticle(articleId: string): Promise<ActionResult<{ saved: boolean }>> {
  await requireSession();
  const id = uuid.safeParse(articleId);
  if (!id.success) return { ok: false, error: "Notícia inválida." };
  const result = await toggleSavedArticle(id.data);
  if (!result) return { ok: false, error: "Notícia não encontrada." };
  if (result.saved) await logActivity("salvou", result.title, "/salvos");
  revalidatePath("/", "layout");
  return { ok: true, message: result.saved ? "Notícia salva." : "Removida das salvas.", data: { saved: result.saved } };
}

/** "Atualizar agora": consulta todas as fontes RSS ativas imediatamente. */
export async function refreshCollection(): Promise<ActionResult> {
  await requireSession();
  try {
    const summary = await collectFeeds(db(), { force: true });
    const newItems = summary.results.reduce((n, r) => n + r.inserted, 0);
    const failed = summary.results.filter((r) => r.status === "erro");
    await logActivity("coletou", `Coleta manual: ${newItems} notícia(s) nova(s)`, "/fontes");
    revalidatePath("/", "layout");
    const base = `${newItems} notícia(s) nova(s) de ${summary.results.length} fonte(s).`;
    return failed.length > 0
      ? { ok: true, message: `${base} ${failed.length} fonte(s) com falha — veja Fontes.` }
      : { ok: true, message: base };
  } catch (err) {
    console.error("[coleta] falha geral", err instanceof Error ? err.message : err);
    return { ok: false, error: "Não foi possível concluir a coleta. Tente novamente em instantes." };
  }
}
