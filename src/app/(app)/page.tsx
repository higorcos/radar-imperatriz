import Link from "next/link";
import {
  AlertTriangle,
  BookmarkCheck,
  CalendarDays,
  Flag,
  History,
  Lightbulb,
  MapPin,
  PenSquare,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ArticleCard, ArticleMeta } from "@/components/article-card";
import { LastUpdate, StaleNotice } from "@/components/stale-notice";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { categoryLabel, isUtilityAlert } from "@/lib/categories";
import { formatLongDate, formatTime, relativeTime, formatDate } from "@/lib/format";
import { multiSourceClusters, rankArticles } from "@/lib/relevance";
import { recentActivity } from "@/lib/repo/activity";
import { articleStats, listArticles } from "@/lib/repo/articles";
import { CALENDAR_KIND_LABELS, inProduction, upcomingCalendar } from "@/lib/repo/calendar";
import { countOpenOccurrences } from "@/lib/repo/occurrences";
import { PRODUCTION_STATUS_LABELS, countPautasInProgress, listPautas } from "@/lib/repo/pautas";
import { countSaved } from "@/lib/repo/saved";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Fortaleza" }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Stat({ label, value, href, icon: Icon }: { label: string; value: number; href: string; icon: typeof MapPin }) {
  return (
    <Link href={href} className="group rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <Icon className="size-4 text-muted group-hover:text-accent" aria-hidden />
      </div>
      <p className="mt-2 font-serif text-[28px] font-bold leading-none text-text">{value}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const [stats, localPool, nationalPool, recentAll, pautas, production, agenda, activity, openOcc, saved, inProgress] = await Promise.all([
    articleStats(),
    listArticles({ scopes: ["local", "estadual"], sinceHours: 72, limit: 150 }),
    listArticles({ scopes: ["nacional"], sinceHours: 24, limit: 200 }),
    listArticles({ scopes: ["local", "estadual", "nacional"], sinceHours: 24, limit: 300 }),
    listPautas({ status: "ideia", limit: 4 }),
    inProduction(5),
    upcomingCalendar(7, 6),
    recentActivity(6),
    countOpenOccurrences(),
    countSaved(),
    countPautasInProgress(),
  ]);

  const localRanked = rankArticles(localPool);
  const nationalRanked = rankArticles(nationalPool);
  const trending = multiSourceClusters(recentAll).slice(0, 5);
  const alerts = localPool.filter((a) => a.scope === "local" || a.mentions_imperatriz).filter((a) => isUtilityAlert(a.title, a.excerpt)).slice(0, 4);
  const latestLocal = [...localPool].slice(0, 5);

  return (
    <>
      <PageHeader
        title={`${greeting()}!`}
        description={`Hoje é ${formatLongDate(new Date())}. Este é o panorama de Imperatriz e do Brasil.`}
        actions={<LastUpdate />}
      />
      <StaleNotice />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Locais e MA (24 h)" value={stats.local24} href="/imperatriz" icon={MapPin} />
        <Stat label="Nacionais (24 h)" value={stats.national24} href="/nacionais" icon={Flag} />
        <Stat label="Pautas em andamento" value={inProgress} href="/calendario?visao=kanban" icon={PenSquare} />
        <Stat label="Ocorrências a apurar" value={openOcc} href="/radar" icon={Radar} />
        <Stat label="Itens salvos" value={saved} href="/salvos" icon={BookmarkCheck} />
      </div>

      <section className="mb-10">
        <SectionHeader icon={Sparkles} title="Destaques do momento" description="Ordenação automática por critérios explícitos — abra “Por que está em destaque?” em cada card." />
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><MapPin className="size-3.5" aria-hidden /> Imperatriz e Maranhão · 72 h</p>
            <div className="space-y-3">
              {localRanked.slice(0, 3).map((e) => <ArticleCard key={e.lead.id} article={e.lead} reasons={e.reasons} />)}
              {localRanked.length === 0 && <EmptyState icon={MapPin} title="Nenhuma notícia local recente">Atualize a coleta ou cadastre mais fontes locais.</EmptyState>}
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><Flag className="size-3.5" aria-hidden /> Brasil · 24 h</p>
            <div className="space-y-3">
              {nationalRanked.slice(0, 3).map((e) => <ArticleCard key={e.lead.id} article={e.lead} reasons={e.reasons} />)}
              {nationalRanked.length === 0 && <EmptyState icon={Flag} title="Nenhuma notícia nacional nas últimas 24 horas" />}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionHeader icon={TrendingUp} title="Assuntos ganhando destaque" description="Temas noticiados por várias fontes nas últimas 24 horas." href="/nacionais" />
          {trending.length === 0 ? (
            <p className="text-sm text-muted">Nenhum assunto com cobertura de várias fontes nas últimas 24 horas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {trending.map((c) => (
                <li key={c.items[0].id} className="py-2.5">
                  <a href={c.items[0].url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text hover:text-accent">{c.items[0].title}</a>
                  <p className="mt-0.5 text-xs text-muted">
                    <Badge tone="accent" className="mr-1.5">{categoryLabel(c.items[0].category)}</Badge>
                    {c.sources.length} fontes: {c.sources.slice(0, 4).join(", ")}{c.sources.length > 4 ? "…" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader icon={AlertTriangle} title="Alertas de utilidade pública" description="Locais, com termos como interdição, vacinação, prazo, inscrições." href="/radar" />
          {alerts.length === 0 ? (
            <p className="text-sm text-muted">Nenhum alerta local identificado nas últimas 72 horas.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text hover:text-accent">{a.title}</a>
                  <ArticleMeta article={a} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader icon={MapPin} title="Notícias locais recentes" href="/imperatriz" />
          <ul className="space-y-3">
            {latestLocal.map((a) => (
              <li key={a.id}>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-snug text-text hover:text-accent">{a.title}</a>
                <ArticleMeta article={a} />
              </li>
            ))}
            {latestLocal.length === 0 && <p className="text-sm text-muted">Sem notícias locais nas últimas 72 horas.</p>}
          </ul>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={Flag} title="Nacionais relevantes" href="/nacionais" />
          <ul className="space-y-3">
            {nationalRanked.slice(3, 8).map((e) => (
              <li key={e.lead.id}>
                <a href={e.lead.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-snug text-text hover:text-accent">{e.lead.title}</a>
                <ArticleMeta article={e.lead} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={Lightbulb} title="Sugestões de pautas" href="/pautas" />
          {pautas.length === 0 ? (
            <EmptyState icon={Lightbulb} title="Nenhuma pauta em ideia" action={<Link href="/pautas" className="text-sm font-medium text-accent hover:underline">Gerar pautas</Link>} />
          ) : (
            <ul className="space-y-2.5">
              {pautas.map((p) => (
                <li key={p.id}>
                  <Link href={`/pautas?ver=${p.id}`} className="text-sm font-medium text-text hover:text-accent">{p.title}</Link>
                  <p className="text-xs text-muted">{p.origin === "ia" ? "Sugerida pela IA" : "Manual"} · {relativeTime(p.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader icon={PenSquare} title="Conteúdos em produção" href="/calendario?visao=kanban" />
          {production.length === 0 ? (
            <p className="text-sm text-muted">Nada em produção no momento.</p>
          ) : (
            <ul className="space-y-2.5">
              {production.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2">
                  <span className="text-sm text-text">{c.title}</span>
                  <Badge tone="accent">{PRODUCTION_STATUS_LABELS[c.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader icon={CalendarDays} title="Agenda dos próximos 7 dias" href="/calendario" />
          {agenda.length === 0 ? (
            <p className="text-sm text-muted">Nenhum compromisso agendado.</p>
          ) : (
            <ul className="space-y-2.5">
              {agenda.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-xs font-semibold text-accent">{formatDate(c.starts_at).slice(0, 5)}</p>
                    <p className="text-[11px] text-muted">{formatTime(c.starts_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text">{c.title}</p>
                    <p className="text-xs text-muted">{CALENDAR_KIND_LABELS[c.kind]}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader icon={History} title="Atividades recentes" />
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma atividade registrada.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.href ? <Link href={a.href} className="text-text hover:text-accent">{a.label}</Link> : <span>{a.label}</span>}
                  <p className="text-xs text-muted">{relativeTime(a.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
