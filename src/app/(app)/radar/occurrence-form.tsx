"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass, labelClass, textareaClass } from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";
import { saveOccurrenceAction } from "./actions";

export interface OccurrenceDefaults {
  id?: string;
  description?: string;
  location?: string;
  date?: string;
  time?: string;
  initial_source?: string;
  category?: string;
  status?: string;
  notes?: string;
  next_actions?: string;
}

export function OccurrenceForm({
  defaults = {},
  categories,
  statuses,
  onDone,
}: {
  defaults?: OccurrenceDefaults;
  categories: [string, string][];
  statuses: [string, string][];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveOccurrenceAction, { ok: true });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) {
      toast(state.message);
      if (!defaults.id) ref.current?.reset();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const p = defaults.id ?? "novo";
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="sm:col-span-2">
        <label htmlFor={`${p}-desc`} className={labelClass}>Descrição *</label>
        <textarea id={`${p}-desc`} name="description" required minLength={5} maxLength={3000} rows={3} defaultValue={defaults.description} className={textareaClass} placeholder="O que foi relatado? Escreva só o que foi informado, sem suposições." />
      </div>
      <div>
        <label htmlFor={`${p}-loc`} className={labelClass}>Local</label>
        <input id={`${p}-loc`} name="location" maxLength={300} defaultValue={defaults.location} className={inputClass} placeholder="Bairro, rua, referência" />
      </div>
      <div>
        <label htmlFor={`${p}-src`} className={labelClass}>Fonte inicial</label>
        <input id={`${p}-src`} name="initial_source" maxLength={300} defaultValue={defaults.initial_source} className={inputClass} placeholder="Ex.: relato de leitor via direct (sem dados pessoais)" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${p}-date`} className={labelClass}>Data</label>
          <input id={`${p}-date`} type="date" name="date" defaultValue={defaults.date} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${p}-time`} className={labelClass}>Horário</label>
          <input id={`${p}-time`} type="time" name="time" defaultValue={defaults.time} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${p}-cat`} className={labelClass}>Categoria</label>
          <select id={`${p}-cat`} name="category" defaultValue={defaults.category ?? "geral"} className={inputClass}>
            {categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${p}-st`} className={labelClass}>Status de verificação</label>
          <select id={`${p}-st`} name="status" defaultValue={defaults.status ?? "recebida"} className={inputClass}>
            {statuses.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`${p}-notes`} className={labelClass}>Observações</label>
        <textarea id={`${p}-notes`} name="notes" rows={2} maxLength={3000} defaultValue={defaults.notes} className={textareaClass} />
      </div>
      <div>
        <label htmlFor={`${p}-next`} className={labelClass}>Próximas ações</label>
        <textarea id={`${p}-next`} name="next_actions" rows={2} maxLength={2000} defaultValue={defaults.next_actions} className={textareaClass} placeholder="Ex.: ligar para a Defesa Civil; ir ao local" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          {defaults.id ? "Salvar alterações" : "Registrar ocorrência"}
        </button>
        {!state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <p className="text-xs text-muted">Não registre dados pessoais de quem relatou (LGPD).</p>
      </div>
    </form>
  );
}
