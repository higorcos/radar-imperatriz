"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass, labelClass } from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";
import { createCalendarAction } from "./actions";

export function CalendarForm({ today, kinds, statuses }: { today: string; kinds: [string, string][]; statuses: [string, string][] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createCalendarAction, { ok: true });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) {
      toast(state.message);
      ref.current?.reset();
    }
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_0.8fr_1fr_auto]">
      <div>
        <label htmlFor="c-title" className={labelClass}>Título</label>
        <input id="c-title" name="title" required minLength={2} maxLength={300} className={inputClass} placeholder="Ex.: Entrevista com a Secretaria de Saúde" />
      </div>
      <div>
        <label htmlFor="c-kind" className={labelClass}>Tipo</label>
        <select id="c-kind" name="kind" className={inputClass} defaultValue="publicacao">
          {kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="c-date" className={labelClass}>Data</label>
        <input id="c-date" name="date" type="date" required defaultValue={today} className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-time" className={labelClass}>Horário</label>
        <input id="c-time" name="time" type="time" required defaultValue="09:00" className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-status" className={labelClass}>Status</label>
        <select id="c-status" name="status" className={inputClass} defaultValue="ideia">
          {statuses.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          <Plus className="size-4" aria-hidden /> Adicionar
        </button>
      </div>
      <input type="hidden" name="notes" value="" />
      {!state.ok && <p role="alert" className="text-sm text-danger sm:col-span-2 lg:col-span-6">{state.error}</p>}
    </form>
  );
}
