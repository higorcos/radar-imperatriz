"use server";

import { revalidatePath } from "next/cache";
import { invalidateDb } from "@/lib/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { firstIssue, optionalText, uuid, type ActionResult } from "@/lib/action-result";
import { fromLocalInput } from "@/lib/format";
import { logActivity } from "@/lib/repo/activity";
import { CALENDAR_KINDS, createCalendarItem, deleteCalendarItem, setCalendarStatus } from "@/lib/repo/calendar";
import { PRODUCTION_STATUSES } from "@/lib/repo/pautas";

const CalendarForm = z.object({
  title: z.string().trim().min(2, "Informe um título").max(300),
  kind: z.enum(CALENDAR_KINDS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  status: z.enum(PRODUCTION_STATUSES),
  notes: optionalText(2000),
});

export async function createCalendarAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = CalendarForm.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;
  await createCalendarItem({ title: d.title, kind: d.kind, starts_at: fromLocalInput(d.date, d.time), status: d.status, pauta_id: null, draft_id: null, notes: d.notes });
  await logActivity("agendou", d.title, "/calendario");
  invalidateDb();
  revalidatePath("/calendario");
  return { ok: true, message: "Adicionado ao calendário." };
}

export async function setCalendarStatusAction(id: string, status: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  const st = z.enum(PRODUCTION_STATUSES).safeParse(status);
  if (!pid.success || !st.success) return { ok: false, error: "Dados inválidos." };
  await setCalendarStatus(pid.data, st.data);
  invalidateDb();
  revalidatePath("/calendario");
  return { ok: true, message: "Status atualizado." };
}

export async function deleteCalendarAction(id: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  if (!pid.success) return { ok: false, error: "Dados inválidos." };
  await deleteCalendarItem(pid.data);
  invalidateDb();
  revalidatePath("/calendario");
  return { ok: true, message: "Item removido." };
}
