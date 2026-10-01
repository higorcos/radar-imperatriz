"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass } from "@/components/ui";
import { deleteOccurrenceAction, setOccurrenceStatusAction } from "./actions";
import { OccurrenceForm, type OccurrenceDefaults } from "./occurrence-form";

export function OccurrenceItemControls({
  id,
  status,
  defaults,
  categories,
  statuses,
}: {
  id: string;
  status: string;
  defaults: OccurrenceDefaults;
  categories: [string, string][];
  statuses: [string, string][];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast(r.message ?? "Ok");
      else toast(r.error ?? "Erro", "error");
      router.refresh();
    });
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`occ-st-${id}`} className="sr-only">Status de verificação</label>
        <select id={`occ-st-${id}`} defaultValue={status} disabled={pending} onChange={(e) => run(() => setOccurrenceStatusAction(id, e.target.value))} className={`${inputClass} h-8 w-auto text-[13px]`}>
          {statuses.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <Link href={`/pautas?ocorrencia=${id}`} className={buttonClass("ghost", "sm")}>
          <Lightbulb className="size-4" aria-hidden /> Gerar pauta
        </Link>
        <button type="button" onClick={() => setEditing((e) => !e)} className={buttonClass("ghost", "sm")} aria-expanded={editing}>
          <Pencil className="size-4" aria-hidden /> Editar
        </button>
        <button type="button" disabled={pending} onClick={() => confirm("Excluir esta ocorrência?") && run(() => deleteOccurrenceAction(id))} className={buttonClass("ghost", "sm")} aria-label="Excluir ocorrência">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      {editing && (
        <div className="mt-3 rounded-lg bg-surface-2 p-3">
          <OccurrenceForm defaults={defaults} categories={categories} statuses={statuses} onDone={() => { setEditing(false); router.refresh(); }} />
        </div>
      )}
    </div>
  );
}
