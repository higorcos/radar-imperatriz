"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { buildMaterial, suggestPautas, type ResolvedPauta } from "@/lib/ai/features";
import { runAi } from "@/lib/ai/run";
import { firstIssue, uuid, type ActionResult } from "@/lib/action-result";
import { fromLocalInput } from "@/lib/format";
import { logActivity } from "@/lib/repo/activity";
import { getArticlesByIds } from "@/lib/repo/articles";
import { createCalendarItem } from "@/lib/repo/calendar";
import { getOccurrence } from "@/lib/repo/occurrences";
import {
  PRODUCTION_STATUSES,
  createPauta,
  deletePauta,
  existingPautaTitles,
  getPauta,
  setPautaStatus,
} from "@/lib/repo/pautas";

export interface ArticleRef {
  id: string;
  title: string;
  source: string;
  url: string;
}

const GenerateInput = z.object({
  articleIds: z.array(uuid).max(15),
  occurrenceIds: z.array(uuid).max(5),
  theme: z.string().trim().max(300),
  idea: z.string().trim().max(2000),
  anglePautaId: uuid.optional(),
});

export async function generatePautasAction(
  input: z.input<typeof GenerateInput>,
): Promise<ActionResult<{ pautas: ResolvedPauta[]; refs: ArticleRef[]; model: string }>> {
  await requireSession();
  const parsed = GenerateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { articleIds, occurrenceIds, theme, idea, anglePautaId } = parsed.data;

  const angle = anglePautaId ? await getPauta(anglePautaId) : null;
  const articleSet = [...new Set([...articleIds, ...(angle?.article_ids ?? [])])];
  if (articleSet.length === 0 && occurrenceIds.length === 0 && !theme && !idea && !angle) {
    return { ok: false, error: "Selecione notícias, uma ocorrência, um tema ou escreva uma ideia." };
  }

  const articles = await getArticlesByIds(articleSet);
  const occurrences = (await Promise.all(occurrenceIds.map(getOccurrence))).filter((o) => o !== null);
  const material = buildMaterial([
    ...articles.map((a) => ({
      id: a.id,
      kind: "noticia" as const,
      title: a.title,
      text: a.excerpt,
      source: a.source_name,
      date: a.published_at,
      contentKind: a.content_kind,
    })),
    ...occurrences.map((o) => ({
      id: `ocorrencia:${o.id}`,
      kind: "ocorrencia" as const,
      title: o.description.slice(0, 300),
      text: [o.location && `Local: ${o.location}`, o.initial_source && `Fonte inicial: ${o.initial_source}`, o.notes].filter(Boolean).join(" · "),
      source: "Registro manual da jornalista",
      date: o.occurred_at,
      verified: o.status === "confirmada" || o.status === "publicada",
    })),
  ]);

  const avoidTitles = await existingPautaTitles();
  const res = await runAi(() =>
    suggestPautas({
      material,
      theme: theme || undefined,
      idea: idea || undefined,
      angleOf: angle ? { title: angle.title, summary: angle.summary } : undefined,
      avoidTitles,
    }),
  );
  if (!res.ok) return res;
  const pautas = res.data!.pautas.map((p) => ({ ...p, article_ids: p.article_ids.filter((id) => !id.startsWith("ocorrencia:")) }));
  const refs = articles.map((a) => ({ id: a.id, title: a.title, source: a.source_name, url: a.url }));
  return { ok: true, data: { pautas, refs, model: res.data!.model } };
}

const SuggestionInput = z.object({
  titulo_provisorio: z.string().trim().min(3).max(300),
  resumo: z.string().trim().max(3000),
  justificativa: z.string().max(3000),
  interesse_publico: z.string().max(3000),
  pergunta_central: z.string().max(1000),
  entrevistados: z.array(z.string().max(300)).max(20),
  fontes_consultar: z.array(z.string().max(300)).max(20),
  perguntas_entrevista: z.array(z.string().max(500)).max(30),
  dados_levantar: z.array(z.string().max(300)).max(20),
  abordagem: z.string().max(3000),
  formato: z.string().max(300),
  pontos_a_verificar: z.array(z.string().max(500)).max(20),
  article_ids: z.array(uuid).max(20),
  origin_label: z.string().max(200).optional(),
});

export async function savePautaAction(input: z.input<typeof SuggestionInput>): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const parsed = SuggestionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { titulo_provisorio, resumo, article_ids, origin_label, ...details } = parsed.data;
  const existing = (await getArticlesByIds(article_ids)).map((a) => a.id);
  const id = await createPauta({
    title: titulo_provisorio,
    summary: resumo,
    details,
    origin: "ia",
    origin_label: origin_label ?? null,
    article_ids: existing,
  });
  await logActivity("criou", `Pauta salva: ${titulo_provisorio}`, `/pautas?ver=${id}`);
  revalidatePath("/pautas");
  return { ok: true, message: "Pauta salva.", data: { id } };
}

const ManualInput = z.object({
  title: z.string().trim().min(3, "Informe um título").max(300),
  summary: z.string().trim().max(3000),
});

export async function createManualPautaAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = ManualInput.safeParse({ title: fd.get("title"), summary: fd.get("summary") ?? "" });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const id = await createPauta({ ...parsed.data, details: {}, origin: "manual", origin_label: null, article_ids: [] });
  await logActivity("criou", `Pauta manual: ${parsed.data.title}`, `/pautas?ver=${id}`);
  revalidatePath("/pautas");
  return { ok: true, message: "Pauta criada." };
}

const StatusInput = z.enum([...PRODUCTION_STATUSES, "descartada"]);

export async function setPautaStatusAction(id: string, status: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  const st = StatusInput.safeParse(status);
  if (!pid.success || !st.success) return { ok: false, error: "Dados inválidos." };
  await setPautaStatus(pid.data, st.data);
  revalidatePath("/pautas");
  return { ok: true, message: "Status atualizado." };
}

export async function deletePautaAction(id: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  if (!pid.success) return { ok: false, error: "Pauta inválida." };
  await deletePauta(pid.data);
  revalidatePath("/pautas");
  return { ok: true, message: "Pauta excluída." };
}

const ScheduleInput = z.object({
  id: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  kind: z.enum(["pauta", "publicacao", "entrevista", "prazo"]),
});

export async function schedulePautaAction(input: z.input<typeof ScheduleInput>): Promise<ActionResult> {
  await requireSession();
  const parsed = ScheduleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const pauta = await getPauta(parsed.data.id);
  if (!pauta) return { ok: false, error: "Pauta não encontrada." };
  const status = pauta.status === "descartada" ? "ideia" : pauta.status;
  await createCalendarItem({
    title: pauta.title,
    kind: parsed.data.kind,
    starts_at: fromLocalInput(parsed.data.date, parsed.data.time),
    status,
    pauta_id: pauta.id,
    draft_id: null,
    notes: null,
  });
  await logActivity("agendou", `Agendou: ${pauta.title}`, "/calendario");
  revalidatePath("/calendario");
  return { ok: true, message: "Adicionado ao calendário." };
}
