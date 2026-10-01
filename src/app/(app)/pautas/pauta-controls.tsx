"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Compass, PenSquare, Trash2 } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass } from "@/components/ui";
import { deletePautaAction, schedulePautaAction, setPautaStatusAction } from "./actions";

const STATUS_OPTIONS = [
  ["ideia", "Ideia"],
  ["em_apuracao", "Em apuração"],
  ["em_producao", "Em produção"],
  ["em_revisao", "Em revisão"],
  ["pronto", "Pronto para publicar"],
  ["publicado", "Publicado"],
  ["descartada", "Descartada"],
] as const;

export function PautaControls({ id, status, today }: { id: string; status: string; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scheduling, setScheduling] = useState(false);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [kind, setKind] = useState<"pauta" | "publicacao" | "entrevista" | "prazo">("publicacao");

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast(res.message ?? "Ok");
      else toast(res.error ?? "Erro", "error");
      router.refresh();
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`st-${id}`}>Status da pauta</label>
        <select id={`st-${id}`} defaultValue={status} disabled={pending} onChange={(e) => run(() => setPautaStatusAction(id, e.target.value))} className={`${inputClass} h-8 w-auto text-[13px]`}>
          {STATUS_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <Link href={`/conteudo?pauta=${id}`} className={buttonClass("ghost", "sm")}>
          <PenSquare className="size-4" aria-hidden /> Criar conteúdo
        </Link>
        <Link href={`/pautas?angulo=${id}`} className={buttonClass("ghost", "sm")}>
          <Compass className="size-4" aria-hidden /> Explorar outro ângulo
        </Link>
        <button type="button" onClick={() => setScheduling((s) => !s)} className={buttonClass("ghost", "sm")} aria-expanded={scheduling}>
          <CalendarPlus className="size-4" aria-hidden /> Agendar
        </button>
        <button type="button" disabled={pending} onClick={() => confirm("Excluir esta pauta?") && run(() => deletePautaAction(id))} className={buttonClass("ghost", "sm")} aria-label="Excluir pauta">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      {scheduling && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-surface-2 p-2.5">
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={`${inputClass} h-8 w-auto`} aria-label="Tipo">
            <option value="publicacao">Publicação</option>
            <option value="pauta">Pauta</option>
            <option value="entrevista">Entrevista</option>
            <option value="prazo">Prazo de apuração</option>
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} h-8 w-auto`} aria-label="Data" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} h-8 w-auto`} aria-label="Horário" />
          <button type="button" disabled={pending} onClick={() => run(async () => { const r = await schedulePautaAction({ id, date, time, kind }); if (r.ok) setScheduling(false); return r; })} className={buttonClass("primary", "sm")}>
            Adicionar ao calendário
          </button>
        </div>
      )}
    </div>
  );
}
