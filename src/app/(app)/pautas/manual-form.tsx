"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass, textareaClass } from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";
import { createManualPautaAction } from "./actions";

export function ManualPautaForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createManualPautaAction, { ok: true });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) {
      toast(state.message);
      ref.current?.reset();
    }
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input name="title" required minLength={3} maxLength={300} placeholder="Título da pauta" className={inputClass} aria-label="Título da pauta" />
      <textarea name="summary" rows={2} maxLength={3000} placeholder="Resumo (opcional)" className={textareaClass} aria-label="Resumo" />
      {!state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass("secondary", "sm")}>
        <Plus className="size-4" aria-hidden /> Criar pauta manual
      </button>
    </form>
  );
}
