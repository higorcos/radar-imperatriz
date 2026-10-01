import type { Metadata } from "next";
import { AlertTriangle, CalendarClock, ClipboardList, Eye, Flame, PartyPopper, PlusCircle, Radio } from "lucide-react";
import { ArticleMeta } from "@/components/article-card";
import { LastUpdate, StaleNotice } from "@/components/stale-notice";
import { Badge, Card, EmptyState, Notice, PageHeader, SectionHeader } from "@/components/ui";
import { CATEGORIES, categoryLabel, isEvent, isUtilityAlert, type CategoryKey } from "@/lib/categories";
import { formatDateTime, hoursSince, localDateKey, relativeTime } from "@/lib/format";
import { rankArticles } from "@/lib/relevance";
import { listArticles, type Article } from "@/lib/repo/articles";
import { CALENDAR_KIND_LABELS, upcomingCalendar } from "@/lib/repo/calendar";
import { OCCURRENCE_STATUSES, OCCURRENCE_STATUS_LABELS, listOccurrences, type OccurrenceStatus } from "@/lib/repo/occurrences";
import { OccurrenceForm } from "./occurrence-form";
import { OccurrenceItemControls } from "./occurrence-item";

export const metadata: Metadata = { title: "Radar de Acontecimentos" };

const STATUS_TONE: Record<OccurrenceStatus, "warn" | "accent" | "ok" | "neutral"> = {
  recebida: "warn",
  em_apuracao: "accent",
  confirmada: "ok",
  descartada: "neutral",
  publicada: "ok",
};

function MiniList({ items, empty }: { items: Article[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id}>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-snug hover:text-accent">{a.title}</a>
          <ArticleMeta article={a} />
        </li>
      ))}
    </ul>
  );
}

export default async function RadarPage() {
  const [local, regional, occurrences, events] = await Promise.all([
    listArticles({ scopes: ["local"], sinceHours: 24 * 7, limit: 80 }),
    listArticles({ scopes: ["local", "estadual"], sinceHours: 72, limit: 150 }),
    listOccurrences(),
    upcomingCalendar(30, 20),
  ]);
  const now = local.filter((a) => hoursSince(a.published_at ?? a.collected_at) < 24);
  const alerts = regional.filter((a) => (a.scope === "local" || a.mentions_imperatriz || a.category === "servicos_publicos") && isUtilityAlert(a.title, a.excerpt)).slice(0, 6);
  const cityEvents = local.filter((a) => isEvent(a.title, a.excerpt)).slice(0, 6);
  const developing = rankArticles(regional).filter((e) => e.developing || e.cluster.sources.length >= 2).slice(0, 6);
  const plannedOcc = occurrences.filter((o) => o.occurred_at && hoursSince(o.occurred_at) < 0 && o.status !== "descartada");
  const follow = occurrences.filter((o) => o.status === "recebida" || o.status === "em_apuracao");
  const plannedEvents = events.filter((e) => e.kind === "evento" || e.kind === "entrevista" || e.kind === "prazo");

  const categories: [string, string][] = (Object.keys(CATEGORIES) as CategoryKey[]).map((k) => [k, CATEGORIES[k].label]);
  const statuses: [string, string][] = OCCURRENCE_STATUSES.map((s) => [s, OCCURRENCE_STATUS_LABELS[s]]);

  return (
    <>
      <PageHeader title="Radar de Acontecimentos" description="O que pode virar notícia: publicações recentes, alertas, eventos, assuntos em desenvolvimento e informações recebidas para verificação." actions={<LastUpdate />} />
      <StaleNotice />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <SectionHeader icon={Radio} title="Acontecendo agora" description="Notícias locais publicadas nas últimas 24 horas." />
          <MiniList items={now.slice(0, 6)} empty="Nenhuma publicação local nas últimas 24 horas nas fontes monitoradas." />
        </Card>
        <Card className="p-4">
          <SectionHeader icon={AlertTriangle} title="Alertas de utilidade pública" description="Interdições, vacinação, prazos, inscrições, avisos (72 h)." />
          <MiniList items={alerts} empty="Nenhum alerta identificado nas últimas 72 horas." />
        </Card>
        <Card className="p-4">
          <SectionHeader icon={Flame} title="Assuntos em desenvolvimento" description="Temas com várias publicações ou fontes (72 h)." />
          {developing.length === 0 ? (
            <p className="text-sm text-muted">Nenhum assunto em desenvolvimento identificado.</p>
          ) : (
            <ul className="space-y-3">
              {developing.map((e) => (
                <li key={e.lead.id}>
                  <a href={e.lead.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-snug hover:text-accent">{e.lead.title}</a>
                  <p className="text-xs text-muted">{e.cluster.items.length} publicação(ões) · {e.cluster.sources.join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <SectionHeader icon={PartyPopper} title="Eventos da cidade" description="Notícias locais sobre eventos (7 dias)." />
          <MiniList items={cityEvents} empty="Nenhum evento local identificado nas notícias recentes." />
        </Card>
        <Card className="p-4">
          <SectionHeader icon={CalendarClock} title="Acontecimentos previstos" description="Do seu calendário e das ocorrências com data futura." href="/calendario" />
          {plannedEvents.length + plannedOcc.length === 0 ? (
            <p className="text-sm text-muted">Nada previsto. Cadastre eventos no Calendário Editorial.</p>
          ) : (
            <ul className="space-y-2.5">
              {plannedEvents.map((e) => (
                <li key={e.id} className="text-sm">
                  {e.title}
                  <p className="text-xs text-muted">{CALENDAR_KIND_LABELS[e.kind]} · {formatDateTime(e.starts_at)}</p>
                </li>
              ))}
              {plannedOcc.map((o) => (
                <li key={o.id} className="text-sm">
                  {o.description.slice(0, 120)}
                  <p className="text-xs text-muted">Ocorrência · {formatDateTime(o.occurred_at!)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <SectionHeader icon={Eye} title="Precisam de acompanhamento" description="Ocorrências recebidas ou em apuração." />
          {follow.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma ocorrência pendente.</p>
          ) : (
            <ul className="space-y-2.5">
              {follow.slice(0, 6).map((o) => (
                <li key={o.id} className="text-sm">
                  <a href={`#occ-${o.id}`} className="hover:text-accent">{o.description.slice(0, 120)}</a>
                  <p className="text-xs text-muted">{OCCURRENCE_STATUS_LABELS[o.status]} · registrada {relativeTime(o.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="mt-10 grid gap-6 xl:grid-cols-[440px_1fr]">
        <div>
          <SectionHeader icon={PlusCircle} title="Registrar ocorrência" description="Informação recebida para verificação posterior." />
          <Card className="p-4">
            <Notice tone="warn" className="mb-4">Relatos e publicações em redes sociais não são fatos confirmados. Toda ocorrência entra como “Recebida (não verificada)”.</Notice>
            <OccurrenceForm categories={categories} statuses={statuses} />
          </Card>
        </div>
        <div>
          <SectionHeader icon={ClipboardList} title="Ocorrências registradas" description={`${occurrences.length} registro(s)`} />
          {occurrences.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhuma ocorrência registrada">Use o formulário para registrar algo que você recebeu ou observou.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {occurrences.map((o) => (
                <li key={o.id} id={`occ-${o.id}`}>
                  <Card className="p-4" as="article">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={STATUS_TONE[o.status]}>{OCCURRENCE_STATUS_LABELS[o.status]}</Badge>
                      <Badge>{categoryLabel(o.category)}</Badge>
                      <span className="text-xs text-muted">registrada {relativeTime(o.created_at)}</span>
                    </div>
                    <p className="text-sm text-text whitespace-pre-line">{o.description}</p>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-2">
                      {o.location && <div><dt className="inline font-medium text-text">Local: </dt><dd className="inline">{o.location}</dd></div>}
                      {o.occurred_at && <div><dt className="inline font-medium text-text">Quando: </dt><dd className="inline">{formatDateTime(o.occurred_at)}</dd></div>}
                      {o.initial_source && <div><dt className="inline font-medium text-text">Fonte inicial: </dt><dd className="inline">{o.initial_source}</dd></div>}
                      {o.notes && <div className="sm:col-span-2"><dt className="inline font-medium text-text">Observações: </dt><dd className="inline">{o.notes}</dd></div>}
                      {o.next_actions && <div className="sm:col-span-2"><dt className="inline font-medium text-text">Próximas ações: </dt><dd className="inline">{o.next_actions}</dd></div>}
                    </dl>
                    <OccurrenceItemControls
                      id={o.id}
                      status={o.status}
                      categories={categories}
                      statuses={statuses}
                      defaults={{
                        id: o.id,
                        description: o.description,
                        location: o.location ?? "",
                        date: o.occurred_at ? localDateKey(o.occurred_at) : "",
                        time: o.occurred_at ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" }).format(o.occurred_at) : "",
                        initial_source: o.initial_source ?? "",
                        category: o.category,
                        status: o.status,
                        notes: o.notes ?? "",
                        next_actions: o.next_actions ?? "",
                      }}
                    />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
