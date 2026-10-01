"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass } from "@/components/ui";
import { deleteCalendarAction, setCalendarStatusAction } from "./actions";

export function CalendarItemControls({ id, status, statuses, mode = "select" }: { id: string; status: string; statuses: [string, string][]; mode?: "select" | "kanban" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast(r.error ?? "Erro", "error");
      router.refresh();
    });
  const idx = statuses.findIndex(([k]) => k === status);
  return (
    <div className="flex items-center gap-1">
      {mode === "kanban" ? (
        <>
          <button type="button" disabled={pending || idx <= 0} onClick={() => run(() => setCalendarStatusAction(id, statuses[idx - 1][0]))} className={buttonClass("ghost", "sm")} aria-label="Mover para a etapa anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" disabled={pending || idx >= statuses.length - 1} onClick={() => run(() => setCalendarStatusAction(id, statuses[idx + 1][0]))} className={buttonClass("ghost", "sm")} aria-label="Mover para a próxima etapa">
            <ChevronRight className="size-4" />
          </button>
        </>
      ) : (
        <>
          <label htmlFor={`cal-st-${id}`} className="sr-only">Status</label>
          <select id={`cal-st-${id}`} defaultValue={status} disabled={pending} onChange={(e) => run(() => setCalendarStatusAction(id, e.target.value))} className={`${inputClass} h-8 w-auto text-[13px]`}>
            {statuses.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("Remover este item do calendário?") && run(async () => { const r = await deleteCalendarAction(id); if (r.ok) toast("Item removido."); return r; })}
        className={buttonClass("ghost", "sm")}
        aria-label="Remover"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
