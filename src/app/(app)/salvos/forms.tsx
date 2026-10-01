"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass, labelClass, textareaClass } from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";
import { createSavedAction, updateSavedAction } from "./actions";

export function NewSavedForm({ kinds }: { kinds: [string, string][] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createSavedAction, { ok: true });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) {
      toast(state.message);
      ref.current?.reset();
    }
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="s-kind" className={labelClass}>Tipo</label>
        <select id="s-kind" name="kind" defaultValue="ideia" className={inputClass}>
          {kinds.filter(([k]) => k !== "noticia").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="lg:col-span-2">
        <label htmlFor="s-title" className={labelClass}>Título</label>
        <input id="s-title" name="title" required minLength={2} maxLength={300} className={inputClass} />
      </div>
      <div>
        <label htmlFor="s-url" className={labelClass}>Link (opcional)</label>
        <input id="s-url" name="url" type="url" maxLength={1000} className={inputClass} placeholder="https://" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="s-notes" className={labelClass}>Anotações</label>
        <textarea id="s-notes" name="notes" rows={2} maxLength={3000} className={textareaClass} />
      </div>
      <div>
        <label htmlFor="s-tags" className={labelClass}>Etiquetas (separadas por vírgula)</label>
        <input id="s-tags" name="tags" maxLength={500} className={inputClass} placeholder="saúde, bairro, prefeitura" />
      </div>
      <div className="flex items-end gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}><Plus className="size-4" aria-hidden /> Salvar item</button>
      </div>
      {!state.ok && <p role="alert" className="text-sm text-danger sm:col-span-2 lg:col-span-4">{state.error}</p>}
    </form>
  );
}

export function EditSavedForm({ id, notes, tags }: { id: string; notes: string; tags: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const res = await updateSavedAction(prev, fd);
    if (res.ok) {
      toast(res.message ?? "Atualizado.");
      setOpen(false);
    }
    return res;
  }, { ok: true });
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost", "sm")}>
        <Pencil className="size-4" aria-hidden /> Anotações e etiquetas
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 w-full space-y-2 rounded-lg bg-surface-2 p-3">
      <input type="hidden" name="id" value={id} />
      <textarea name="notes" defaultValue={notes} rows={3} maxLength={3000} className={textareaClass} aria-label="Anotações" placeholder="Anotações" />
      <input name="tags" defaultValue={tags.join(", ")} maxLength={500} className={inputClass} aria-label="Etiquetas" placeholder="etiquetas, separadas, por vírgula" />
      {!state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>Salvar</button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "sm")}>Cancelar</button>
      </div>
    </form>
  );
}
