"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { firstIssue, optionalText, tagsField, uuid, type ActionResult } from "@/lib/action-result";
import { isHttpUrl } from "@/lib/text";
import { logActivity } from "@/lib/repo/activity";
import { SAVED_KINDS, createSaved, deleteSaved, updateSaved } from "@/lib/repo/saved";

const NewItem = z.object({
  kind: z.enum(SAVED_KINDS),
  title: z.string().trim().min(2, "Informe um título").max(300),
  url: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || isHttpUrl(v), "Link inválido (use http ou https)"),
  notes: optionalText(3000),
  tags: tagsField,
});

export async function createSavedAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = NewItem.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  await createSaved(parsed.data);
  await logActivity("salvou", parsed.data.title, "/salvos");
  revalidatePath("/salvos");
  return { ok: true, message: "Item salvo na biblioteca." };
}

const Update = z.object({ id: uuid, notes: optionalText(3000), tags: tagsField });

export async function updateSavedAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = Update.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  await updateSaved(parsed.data.id, { notes: parsed.data.notes, tags: parsed.data.tags });
  revalidatePath("/salvos");
  return { ok: true, message: "Atualizado." };
}

export async function deleteSavedAction(id: string): Promise<ActionResult> {
  await requireSession();
  const pid = uuid.safeParse(id);
  if (!pid.success) return { ok: false, error: "Item inválido." };
  await deleteSaved(pid.data);
  revalidatePath("/salvos");
  return { ok: true, message: "Removido da biblioteca." };
}
