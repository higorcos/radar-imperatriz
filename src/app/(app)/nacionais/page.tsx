import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Layers, MapPinned, Newspaper, Sparkles, Star, TrendingUp, FileText } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ArticleCard, ArticleMeta } from "@/components/article-card";
import { ArticleFilters } from "@/components/article-filters";
import { BulletList, DigestMeta, SourceLinks, ToPautaLink } from "@/components/digest";
import { Pagination } from "@/components/pagination";
import { LastUpdate, StaleNotice } from "@/components/stale-notice";
import { RefreshButton } from "@/components/topbar";
import { Badge, Card, EmptyState, Notice, PageHeader, SectionHeader, cx } from "@/components/ui";
import type { ResolvedConnections, ResolvedNationalDigest } from "@/lib/ai/features";
import { NATIONAL_CATEGORIES, categoryLabel } from "@/lib/categories";
import { aiConfigured } from "@/lib/env";
import { formatDateTime, relativeTime } from "@/lib/format";
import { paramCategory, paramEnum, paramPage, paramPeriod, paramText, paramUuid, type SearchParams } from "@/lib/params";
import { multiSourceClusters, rankArticles } from "@/lib/relevance";
import { countArticles, getArticlesByIds, listArticles, sourcesWithArticles } from "@/lib/repo/articles";
import { latestDigest } from "@/lib/repo/digests";
import { generateImperatrizConnections, generateNationalDigest } from "../digest-actions";

export const metadata: Metadata = { title: "Notícias Nacionais" };
export const maxDuration = 120;

const TABS = [
  { key: "geral", label: "Visão geral", icon: Star },
  { key: "ultimas", label: "Últimas notícias", icon: Clock },
  { key: "resumo", label: "Resumo do dia", icon: FileText },
  { key: "imperatriz", label: "Interessam a Imperatriz", icon: MapPinned },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function NacionaisPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const tab = paramEnum(sp.aba, TABS.map((t) => t.key), "geral") as Tab;

  return (
    <>
      <PageHeader
        title="Notícias Nacionais"
        description="O que está acontecendo no Brasil, a partir de agências públicas, órgãos institucionais e veículos jornalísticos."
        actions={<LastUpdate />}
      />
      <StaleNotice />
      <nav aria-label="Seções de notícias nacionais" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/nacionais?aba=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={cx(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm",
              tab === key ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      {tab === "geral" && <Overview />}
      {tab === "ultimas" && <Latest sp={sp} />}
      {tab === "resumo" && <DailySummary />}
      {tab === "imperatriz" && <Connections />}
    </>
  );
}

async function Overview() {
  const pool = await listArticles({ scopes: ["nacional"], sinceHours: 24, limit: 200 });
  if (pool.length === 0) {
    return (
      <EmptyState icon={Newspaper} title="Nenhuma notícia nacional nas últimas 24 horas" action={<RefreshButton variant="primary" />}>
        As fontes ainda não foram consultadas hoje ou a coleta falhou. Os dados antigos continuam em “Últimas notícias”.
      </EmptyState>
    );
  }
  const ranked = rankArticles(pool);
  const top = ranked.slice(0, 4);
  const more = ranked.slice(4, 16);
  const focus = multiSourceClusters(await listArticles({ scopes: ["nacional"], sinceHours: 72, limit: 300 })).slice(0, 6);

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader icon={Star} title="Principais notícias do Brasil" description="Seleção automática das últimas 24 horas por critérios explícitos (abra “Por que está em destaque?”)." />
        <div className="grid gap-4 md:grid-cols-2">
          {top.map((e) => (
            <ArticleCard key={e.lead.id} article={e.lead} variant="feature" reasons={e.reasons} related={e.cluster.items.filter((i) => i.id !== e.lead.id).slice(0, 3)} />
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <SectionHeader
            icon={TrendingUp}
            title="Mais relevantes do momento"
            description="Critérios: cobertura por fontes diferentes, fonte institucional, tema de interesse público, atualidade e desdobramentos. Popularidade e viralização não contam."
          />
          <ol className="space-y-2">
            {more.map((e, i) => (
              <li key={e.lead.id} className="flex gap-3 rounded-xl border border-border bg-surface p-3.5">
                <span className="mt-0.5 w-5 shrink-0 text-right font-serif text-lg font-bold text-muted/60">{i + 5}</span>
                <div className="min-w-0 flex-1">
                  <a href={e.lead.url} target="_blank" rel="noopener noreferrer" className="font-serif text-[15px] font-semibold leading-snug text-text hover:text-accent">
                    {e.lead.title}
                  </a>
                  <div className="mt-1"><ArticleMeta article={e.lead} /></div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge tone="accent">{categoryLabel(e.lead.category)}</Badge>
                    {e.developing && <Badge tone="warn">Em desenvolvimento</Badge>}
                    {e.reasons.map((r) => <Badge key={r}>{r}</Badge>)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionHeader icon={Layers} title="Categorias nacionais" />
          <div className="flex flex-wrap gap-1.5">
            {NATIONAL_CATEGORIES.map((c) => (
              <Link key={c} href={`/nacionais?aba=ultimas&categoria=${c}`} className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text hover:border-accent hover:text-accent">
                {categoryLabel(c)}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section>
        <SectionHeader icon={Layers} title="O Brasil em foco" description="Assuntos noticiados por várias fontes nos últimos 3 dias, agrupados por semelhança de título. Cada publicação mantém sua fonte." />
        {focus.length === 0 ? (
          <EmptyState icon={Layers} title="Nenhum assunto com cobertura de várias fontes no período" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {focus.map((c) => (
              <Card key={c.items[0].id} className="p-4">
                <div className="mb-2 flex flex-wrap gap-1">
                  <Badge tone="accent">{categoryLabel(c.items[0].category)}</Badge>
                  <Badge>{c.sources.length} fontes · {c.items.length} publicações</Badge>
                </div>
                <h3 className="font-serif text-[16px] font-semibold leading-snug">{c.items[0].title}</h3>
                <ul className="mt-3 space-y-2 border-l-2 border-accent/30 pl-3">
                  {c.items.slice(0, 6).map((a) => (
                    <li key={a.id} className="text-sm">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-text hover:text-accent">{a.title}</a>
                      <p className="text-xs text-muted">
                        {a.source_name} · {a.published_at ? formatDateTime(a.published_at) : "data não informada"}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3"><ToPautaLink theme={c.items[0].title} ids={c.items.slice(0, 6).map((a) => a.id)} /></div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const PAGE_SIZE = 30;

async function Latest({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const categoria = paramCategory(sp.categoria);
  const fonte = paramUuid(sp.fonte);
  const q = paramText(sp.q, 100);
  const period = paramPeriod(sp.periodo, 72);
  const page = paramPage(sp.pagina);
  const filters = { scopes: ["nacional" as const], category: categoria, sourceId: fonte, sinceHours: period.hours, q };
  const [items, total, sources] = await Promise.all([
    listArticles({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countArticles(filters),
    sourcesWithArticles(["nacional"]),
  ]);
  return (
    <section>
      <ArticleFilters action="/nacionais" categories={NATIONAL_CATEGORIES} sources={sources} values={{ categoria, fonte, periodo: period.raw, q }} extra={<input type="hidden" name="aba" value="ultimas" />} />
      <p className="mt-4 mb-3 text-xs text-muted">{total} notícia(s), da mais recente para a mais antiga.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
      {items.length === 0 && <EmptyState icon={Newspaper} title="Nenhuma notícia com esses filtros">Tente ampliar o período.</EmptyState>}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} searchParams={{ ...sp, aba: "ultimas" }} basePath="/nacionais" />
    </section>
  );
}

function AiNotice() {
  if (aiConfigured()) return null;
  return (
    <Notice tone="info" title="IA não configurada" className="mb-4">
      Defina ANTHROPIC_API_KEY no .env.local para gerar este conteúdo. Instruções em Configurações e no README.
    </Notice>
  );
}

async function DailySummary() {
  const digest = await latestDigest<ResolvedNationalDigest>("resumo_nacional");
  const articles = new Map((digest ? await getArticlesByIds(digest.article_ids) : []).map((a) => [a.id, a]));
  return (
    <section className="max-w-3xl">
      <SectionHeader icon={FileText} title="Resumo nacional do dia" description="Gerado pela IA a partir das notícias nacionais coletadas nas últimas 24 horas. Cada manchete aponta suas fontes originais." />
      <AiNotice />
      <ActionButton action={generateNationalDigest} label={digest ? "Atualizar resumo" : "Gerar resumo do dia"} pendingLabel="Lendo as notícias das últimas 24 h…" icon={<Sparkles className="size-4" aria-hidden />} variant="ai" />
      <div className="mt-6">
        {!digest ? (
          <EmptyState icon={FileText} title="Nenhum resumo gerado ainda" />
        ) : (
          <>
            <DigestMeta createdAt={digest.created_at} model={digest.model} />
            <ol className="space-y-4">
              {digest.content.manchetes.map((m, i) => (
                <li key={i}>
                  <Card className="p-4">
                    <h3 className="font-serif text-lg font-semibold leading-snug">{m.titulo}</h3>
                    <p className="mt-1.5 text-sm text-text">{m.explicacao}</p>
                    <p className="mt-1.5 text-sm text-muted"><span className="font-medium text-text">Contexto: </span>{m.contexto}</p>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Fontes originais</p>
                      <SourceLinks ids={m.article_ids} articles={articles} />
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
            {digest.content.sugestoes_pauta.length > 0 && (
              <div className="mt-6">
                <SectionHeader icon={Sparkles} title="Sugestões de pautas relacionadas" />
                <ul className="space-y-3">
                  {digest.content.sugestoes_pauta.map((s, i) => (
                    <li key={i} className="rounded-xl border border-border bg-surface p-4">
                      <p className="font-medium">{s.titulo}</p>
                      <p className="mt-1 text-sm text-muted">{s.ideia}</p>
                      <div className="mt-2"><ToPautaLink theme={s.titulo} ids={s.article_ids} /></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {digest.content.limitacoes && (
              <Notice tone="info" title="Limitações apontadas" className="mt-6">{digest.content.limitacoes}</Notice>
            )}
          </>
        )}
      </div>
    </section>
  );
}

async function Connections() {
  const digest = await latestDigest<ResolvedConnections>("conexoes_imperatriz");
  const articles = new Map((digest ? await getArticlesByIds(digest.article_ids) : []).map((a) => [a.id, a]));
  return (
    <section className="max-w-3xl">
      <SectionHeader
        icon={MapPinned}
        title="Notícias nacionais que interessam a Imperatriz"
        description="Hipóteses de pauta: possíveis reflexos de temas nacionais em Imperatriz e na região Tocantina. Nada aqui é afirmação — tudo precisa ser apurado."
      />
      <AiNotice />
      <ActionButton action={generateImperatrizConnections} label={digest ? "Gerar novas hipóteses" : "Gerar hipóteses"} pendingLabel="Analisando notícias nacionais…" icon={<Sparkles className="size-4" aria-hidden />} variant="ai" />
      <div className="mt-6">
        {!digest ? (
          <EmptyState icon={MapPinned} title="Nenhuma hipótese gerada ainda" />
        ) : (
          <>
            <DigestMeta createdAt={digest.created_at} model={digest.model} />
            <ul className="space-y-4">
              {digest.content.conexoes.map((c, i) => (
                <li key={i}>
                  <Card className="p-4">
                    <Badge tone="warn" className="mb-2">Hipótese — não confirmada</Badge>
                    <h3 className="font-serif text-[17px] font-semibold leading-snug">{c.hipotese}</h3>
                    <p className="mt-1.5 text-sm text-muted">{c.por_que_pode_interessar}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <BulletList title="Perguntas de apuração" items={c.perguntas_apuracao} />
                      <BulletList title="Fontes a consultar" items={c.fontes_consultar} />
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notícia(s) nacional(is) de origem</p>
                      <SourceLinks ids={c.article_ids} articles={articles} />
                    </div>
                    <div className="mt-3"><ToPautaLink theme={c.hipotese} ids={c.article_ids} /></div>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <p className="mt-6 text-xs text-muted">Atualizado em {digest ? relativeTime(digest.created_at) : "—"}.</p>
    </section>
  );
}
