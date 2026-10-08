"use server";

import { revalidatePath } from "next/cache";
import { invalidateDb } from "@/lib/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { buildMaterial, generateContent } from "@/lib/ai/features";
import { CONTENT_FORMATS, CONTENT_STYLES, type ContentFormat, type ContentStyle } from "@/lib/ai/prompts";
import { runAi } from "@/lib/ai/run";
import type { ContentOutput } from "@/lib/ai/schemas";
import { firstIssue, uuid, type ActionResult } from "@/lib/action-result";
import { fromLocalInput } from "@/lib/format";
import { logActivity } from "@/lib/repo/activity";
import { getArticlesByIds } from "@/lib/repo/articles";
import { createCalendarItem } from "@/lib/repo/calendar";
import { deleteDraft, getDraft, saveDraft } from "@/lib/repo/drafts";
import { getPauta } from "@/lib/repo/pautas";

const formatEnum = z.enum(Object.keys(CONTENT_FORMATS) as [ContentFormat, ...ContentFormat[]]);
const styleEnum = z.enum(Object.keys(CONTENT_STYLES) as [ContentStyle, ...ContentStyle[]]);

const GenerateInput = z.object({
  pautaId: uuid.optional(),
  articleId: uuid.optional(),
  brief: z.string().trim().max(3000),
  format: formatEnum,
  style: styleEnum,
});

export async function generateContentAction(input: z.input<typeof GenerateInput>): Promise<ActionResult<ContentOutput & { model: string }>> {
  await requireSession();
  const parsed = GenerateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { pautaId, articleId, brief, format, style } = parsed.data;

  const pauta = pautaId ? await getPauta(pautaId) : null;
  const articleIds = [...new Set([...(pauta?.article_ids ?? []), ...(articleId ? [articleId] : [])])];
  const articles = await getArticlesByIds(articleIds);
  if (!pauta && articles.length === 0 && !brief) return { ok: false, error: "Escolha uma pauta, uma notícia ou descreva o assunto." };

  const briefParts = [
    pauta ? `Pauta: ${pauta.title}\n${pauta.summary}` : null,
    pauta?.details.pergunta_central ? `Pergunta central: ${pauta.details.pergunta_central}` : null,
    pauta?.details.pontos_a_verificar?.length ? `Pontos ainda não verificados: ${pauta.details.pontos_a_verificar.join("; ")}` : null,
    brief ? `Orientação da jornalista: ${brief}` : null,
  ].filter(Boolean);
  const material = buildMaterial(
    articles.map((a) => ({ id: a.id, kind: "noticia" as const, title: a.title, text: a.excerpt, source: a.source_name, date: a.published_at, contentKind: a.content_kind })),
  );
  const res = await runAi(() => generateContent({ material, brief: briefParts.join("\n"), format, style }));
  if (!res.ok) return res;
  return { ok: true, data: { ...res.data!.content, model: res.data!.model } };
}

const DraftInput = z.object({
  id: uuid.optional(),
  pautaId: uuid.optional(),
  articleId: uuid.optional(),
  format: formatEnum,
  style: styleEnum,
  title: z.string().trim().min(1, "Informe um título").max(300),
  body: z.string().max(20000),
  aiGenerated: z.boolean(),
});

export async function saveDraftAction(input: z.input<typeof DraftInput>): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = DraftInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;
  const id = await saveDraft({
    id: d.id,
    pauta_id: d.pautaId ?? null,
    article_id: d.articleId ?? null,
    format: d.format,
    style: d.style,
    title: d.title,
    body: d.body,
    ai_generated: d.aiGenerated,
  });
  await logActivity("salvou", `Rascunho: ${d.title}`, `/conteudo?rascunho=${id}`);
  invalidateDb();
  revalidatePath("/conteudo");
  return { ok: true, message: "Rascunho salvo.", data: { id } };
}

const ScheduleInput = z.object({
  draftId: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function scheduleDraftAction(input: z.input<typeof ScheduleInput>): Promise<ActionResult> {
  await requireSession();
  const parsed = ScheduleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const draft = await getDraft(parsed.data.draftId);
  if (!draft) return { ok: false, error: "Salve o rascunho antes de agendar." };
  await createCalendarItem({
    title: draft.title,
    kind: "publicacao",
    starts_at: fromLocalInput(parsed.data.date, parsed.data.time),
    status: "em_revisao",
    pauta_id: draft.pauta_id,
    draft_id: draft.id,
    notes: null,
  });
  await logActivity("agendou", `Publicação agendada: ${draft.title}`, "/calendario");
  invalidateDb();
  revalidatePath("/calendario");
  return { ok: true, message: "Enviado ao calendário editorial (status: em revisão)." };
}

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  await requireSession();
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Rascunho inválido." };
  await deleteDraft(parsed.data);
  invalidateDb();
  revalidatePath("/conteudo");
  return { ok: true, message: "Rascunho excluído." };
}
