import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Rows3 } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, buttonClass, cx } from "@/components/ui";
import { formatDateTime, formatTime, fromLocalInput, localDateKey } from "@/lib/format";
import { paramEnum, type SearchParams } from "@/lib/params";
import { CALENDAR_KINDS, CALENDAR_KIND_LABELS, listCalendar, listCalendarAll, type CalendarItem } from "@/lib/repo/calendar";
import { PRODUCTION_STATUSES, PRODUCTION_STATUS_LABELS } from "@/lib/repo/pautas";
import { CalendarForm } from "./calendar-form";
import { CalendarItemControls } from "./item-controls";

export const metadata: Metadata = { title: "Calendário Editorial" };

const VIEWS = [
  { key: "mes", label: "Mês", icon: CalendarDays },
  { key: "semana", label: "Semana", icon: Rows3 },
  { key: "lista", label: "Lista", icon: List },
  { key: "kanban", label: "Quadro", icon: Columns3 },
] as const;
type View = (typeof VIEWS)[number]["key"];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const KIND_TONE: Record<string, "accent" | "ok" | "warn" | "ai" | "neutral"> = {
  publicacao: "accent",
  pauta: "ai",
  entrevista: "ok",
  evento: "warn",
  prazo: "neutral",
};

// Aritmética de datas sobre chaves "YYYY-MM-DD" (sem fuso).
function parseKey(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(k: string, n: number) {
  const d = parseKey(k);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
}

const statuses: [string, string][] = PRODUCTION_STATUSES.map((s) => [s, PRODUCTION_STATUS_LABELS[s]]);
const kinds: [string, string][] = CALENDAR_KINDS.map((k) => [k, CALENDAR_KIND_LABELS[k]]);

function ItemChip({ item }: { item: CalendarItem }) {
  return (
    <div className={cx("rounded-md border-l-2 bg-surface-2 px-1.5 py-1 text-[11px] leading-tight", item.status === "publicado" ? "border-ok opacity-70" : "border-accent")}>
      <span className="font-medium text-muted">{formatTime(item.starts_at)}</span> <span className="text-text">{item.title}</span>
    </div>
  );
}

export default async function CalendarioPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const view = paramEnum(sp.visao, VIEWS.map((v) => v.key), "mes") as View;
  const today = localDateKey(new Date());
  const anchor = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : today;

  let days: string[] = [];
  let title = "";
  let prev = anchor;
  let next = anchor;
  if (view === "mes") {
    const first = `${anchor.slice(0, 7)}-01`;
    const start = addDays(first, -parseKey(first).getUTCDay());
    days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const d = parseKey(first);
    title = `${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
    const pm = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
    const nm = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    prev = toKey(pm);
    next = toKey(nm);
  } else if (view === "semana") {
    const start = addDays(anchor, -parseKey(anchor).getUTCDay());
    days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    title = `Semana de ${start.split("-").reverse().join("/")}`;
    prev = addDays(anchor, -7);
    next = addDays(anchor, 7);
  }

  const items = days.length
    ? await listCalendar(fromLocalInput(days[0], "00:00"), fromLocalInput(addDays(days[days.length - 1], 1), "00:00"))
    : await listCalendarAll();
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const k = localDateKey(it.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), it]);
  }
  const currentMonth = anchor.slice(0, 7);

  return (
    <>
      <PageHeader title="Calendário Editorial" description="Organize publicações, pautas, entrevistas, eventos e prazos de apuração." />
      <Card className="mb-6 p-4">
        <CalendarForm today={today} kinds={kinds} statuses={statuses} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Visualização" className="flex rounded-lg border border-border bg-surface p-0.5">
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <Link key={key} href={`/calendario?visao=${key}&data=${anchor}`} aria-current={view === key ? "page" : undefined} className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === key ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-text")}>
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        {days.length > 0 && (
          <div className="flex items-center gap-2">
            <Link href={`/calendario?visao=${view}&data=${prev}`} className={buttonClass("ghost", "sm")} aria-label="Anterior"><ChevronLeft className="size-4" /></Link>
            <p className="min-w-44 text-center text-sm font-semibold capitalize">{title}</p>
            <Link href={`/calendario?visao=${view}&data=${next}`} className={buttonClass("ghost", "sm")} aria-label="Próximo"><ChevronRight className="size-4" /></Link>
            <Link href={`/calendario?visao=${view}`} className={buttonClass("secondary", "sm")}>Hoje</Link>
          </div>
        )}
      </div>

      {view === "mes" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-xl border border-border bg-border gap-px">
            {WEEKDAYS.map((w) => <div key={w} className="bg-surface-2 px-2 py-1.5 text-xs font-semibold text-muted">{w}</div>)}
            {days.map((d) => (
              <div key={d} className={cx("min-h-28 bg-surface p-1.5", !d.startsWith(currentMonth) && "bg-surface/60 opacity-60")}>
                <p className={cx("mb-1 inline-grid size-6 place-items-center rounded-full text-xs", d === today ? "bg-accent font-semibold text-on-accent" : "text-muted")}>{Number(d.slice(8))}</p>
                <div className="space-y-1">
                  {(byDay.get(d) ?? []).slice(0, 4).map((it) => <ItemChip key={it.id} item={it} />)}
                  {(byDay.get(d)?.length ?? 0) > 4 && <p className="text-[11px] text-muted">+{byDay.get(d)!.length - 4} mais</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "semana" && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d, i) => (
            <div key={d} className={cx("rounded-xl border bg-surface p-2.5", d === today ? "border-accent" : "border-border")}>
              <p className="mb-2 text-xs font-semibold text-muted">{WEEKDAYS[i]} {d.slice(8)}/{d.slice(5, 7)}</p>
              <div className="space-y-2">
                {(byDay.get(d) ?? []).map((it) => (
                  <div key={it.id} className="rounded-lg bg-surface-2 p-2">
                    <Badge tone={KIND_TONE[it.kind]}>{CALENDAR_KIND_LABELS[it.kind]}</Badge>
                    <p className="mt-1 text-sm leading-snug">{it.title}</p>
                    <p className="text-xs text-muted">{formatTime(it.starts_at)} · {PRODUCTION_STATUS_LABELS[it.status]}</p>
                  </div>
                ))}
                {!byDay.get(d) && <p className="text-xs text-muted/70">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "lista" && (
        items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhum item no calendário" />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {items.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={KIND_TONE[it.kind]}>{CALENDAR_KIND_LABELS[it.kind]}</Badge>
                    <span className="text-xs text-muted">{formatDateTime(it.starts_at)}</span>
                    {it.draft_id && <Link href={`/conteudo?rascunho=${it.draft_id}`} className="text-xs text-accent hover:underline">abrir rascunho</Link>}
                    {it.pauta_id && <Link href={`/pautas?ver=${it.pauta_id}#${it.pauta_id}`} className="text-xs text-accent hover:underline">ver pauta</Link>}
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{it.title}</p>
                </div>
                <CalendarItemControls id={it.id} status={it.status} statuses={statuses} />
              </li>
            ))}
          </ul>
        )
      )}

      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PRODUCTION_STATUSES.map((st) => {
            const col = items.filter((i) => i.status === st).sort((a, b) => +a.starts_at - +b.starts_at);
            return (
              <section key={st} aria-label={PRODUCTION_STATUS_LABELS[st]} className="w-64 shrink-0 rounded-xl bg-surface-2 p-2.5">
                <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {PRODUCTION_STATUS_LABELS[st]} <span className="rounded bg-surface px-1.5 py-0.5">{col.length}</span>
                </h2>
                <div className="space-y-2">
                  {col.map((it) => (
                    <article key={it.id} className="rounded-lg border border-border bg-surface p-2.5">
                      <Badge tone={KIND_TONE[it.kind]}>{CALENDAR_KIND_LABELS[it.kind]}</Badge>
                      <p className="mt-1 text-sm leading-snug">{it.title}</p>
                      <p className="text-xs text-muted">{formatDateTime(it.starts_at)}</p>
                      <div className="mt-1.5 flex justify-end"><CalendarItemControls id={it.id} status={it.status} statuses={statuses} mode="kanban" /></div>
                    </article>
                  ))}
                  {col.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted/70">Vazio</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
