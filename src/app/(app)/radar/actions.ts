"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { isCategoryKey } from "@/lib/categories";
import { firstIssue, optionalText, uuid, type ActionResult } from "@/lib/action-result";
import { fromLocalInput } from "@/lib/format";
import { logActivity } from "@/lib/repo/activity";
import {
  OCCURRENCE_STATUSES,
  createOccurrence,
  deleteOccurrence,
  getOccurrence,
  updateOccurrence,
  type OccurrenceInput,
} from "@/lib/repo/occurrences";

const OccurrenceForm = z.object({
  id: uuid.optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().min(5, "Descreva a ocorrência (mín. 5 caracteres)").max(3000),
  location: optionalText(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  initial_source: optionalText(300),
  category: z.string().refine(isCategoryKey, "Categoria inválida"),
  status: z.enum(OCCURRENCE_STATUSES),
  notes: optionalText(3000),
  next_actions: optionalText(2000),
});

function toInput(d: z.infer<typeof OccurrenceForm>): OccurrenceInput {
  return {
    description: d.description,
    location: d.location,
    occurred_at: d.date ? fromLocalInput(d.date, d.time || "12:00") : null,
    initial_source: d.initial_source,
    category: d.category,
    status: d.status,
    notes: d.notes,
    next_actions: d.next_actions,
  };
}

export async function saveOccurrenceAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = OccurrenceForm.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = toInput(parsed.data);
  if (parsed.data.id) {
    if (!(await getOccurrence(parsed.data.id))) return { ok: false, error: "Ocorrência não encontrada." };
    await updateOccurrence(parsed.data.id, input);
    await logActivity("atualizou", `Ocorrência: ${input.description.slice(0, 80)}`, "/radar");
  } else {
    await createOccurrence(input);
    await logActivity("registrou", `Ocorrência: ${input.description.slice(0, 80)}`, "/radar");
  }
  revalidatePath("/radar");
  return { ok: true, message: parsed.data.id ? "Ocorrência atualizada." : "Ocorrência registrada como recebida." };
}

export async function setOccurrenceStatusAction(id: string, status: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  const st = z.enum(OCCURRENCE_STATUSES).safeParse(status);
  if (!pid.success || !st.success) return { ok: false, error: "Dados inválidos." };
  const occ = await getOccurrence(pid.data);
  if (!occ) return { ok: false, error: "Ocorrência não encontrada." };
  await updateOccurrence(pid.data, { ...occ, status: st.data });
  revalidatePath("/radar");
  return { ok: true, message: "Status atualizado." };
}

export async function deleteOccurrenceAction(id: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  if (!pid.success) return { ok: false, error: "Dados inválidos." };
  await deleteOccurrence(pid.data);
  revalidatePath("/radar");
  return { ok: true, message: "Ocorrência excluída." };
}
