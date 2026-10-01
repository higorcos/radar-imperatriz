import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Newspaper, Sparkles, Users } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ArticleCard } from "@/components/article-card";
import { ArticleFilters } from "@/components/article-filters";
import { BulletList, DigestMeta, SourceLinks, ToPautaLink } from "@/components/digest";
import { Pagination } from "@/components/pagination";
import { LastUpdate, StaleNotice } from "@/components/stale-notice";
import { Card, EmptyState, Notice, PageHeader, SectionHeader, inputClass, labelClass } from "@/components/ui";
import { aiConfigured } from "@/lib/env";
import type { ResolvedPopulationImpact } from "@/lib/ai/features";
import { LOCAL_CATEGORIES } from "@/lib/categories";
import { paramCategory, paramEnum, paramPage, paramPeriod, paramText, paramUuid, type SearchParams } from "@/lib/params";
import { rankArticles } from "@/lib/relevance";
import { countArticles, getArticlesByIds, listArticles, sourcesWithArticles, type Scope } from "@/lib/repo/articles";
import { latestDigest } from "@/lib/repo/digests";
import { generatePopulationImpact } from "../digest-actions";

export const metadata: Metadata = { title: "Notícias de Imperatriz" };
export const maxDuration = 120;

const PAGE_SIZE = 24;

export default async function ImperatrizPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const abrangencia = paramEnum(sp.abrangencia, ["local", "regional"] as const, "regional");
  const ordem = paramEnum(sp.ordem, ["recentes", "relevancia"] as const, "recentes");
  const categoria = paramCategory(sp.categoria);
  const fonte = paramUuid(sp.fonte);
  const q = paramText(sp.q, 100);
  const period = paramPeriod(sp.periodo, 168);
  const page = paramPage(sp.pagina);
  const scopes: Scope[] = abrangencia === "local" ? ["local"] : ["local", "estadual"];

  const filters = { scopes, category: categoria, sourceId: fonte, sinceHours: period.hours, q };
  const [feed, total, sources, happeningPool, digest] = await Promise.all([
    ordem === "relevancia"
      ? listArticles({ ...filters, limit: 200 })
      : listArticles({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countArticles(filters),
    sourcesWithArticles(["local", "estadual"]),
    listArticles({ scopes: ["local"], sinceHours: 72, limit: 60 }),
    latestDigest<ResolvedPopulationImpact>("pautas_populacao"),
  ]);
  const ranked = ordem === "relevancia" ? rankArticles(feed) : null;

  // "O que está acontecendo": notícias locais das últimas 72 h; sem elas, as mais recentes com aviso.
  const happening = rankArticles(happeningPool).slice(0, 4);
  const fallbackLocal = happening.length === 0 ? await listArticles({ scopes: ["local"], limit: 4 }) : [];
  const digestArticles = new Map((digest ? await getArticlesByIds(digest.article_ids) : []).map((a) => [a.id, a]));

  return (
    <>
      <PageHeader
        title="Notícias de Imperatriz"
        description="Acontecimentos de Imperatriz, da região Tocantina e do Maranhão, coletados de fontes locais e institucionais."
        actions={<LastUpdate />}
      />
      <StaleNotice />

      <section className="mb-8">
        <SectionHeader icon={Activity} title="O que está acontecendo em Imperatriz?" description="Publicações locais das últimas 72 horas, ordenadas por critérios explícitos." />
        {happening.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {happening.map((e) => (
              <ArticleCard key={e.lead.id} article={e.lead} reasons={e.reasons} related={e.cluster.items.filter((i) => i.id !== e.lead.id).slice(0, 3)} />
            ))}
          </div>
        ) : (
          <>
            <Notice tone="warn" title="Nenhuma publicação local nas últimas 72 horas nas fontes monitoradas" className="mb-4">
              Abaixo, as notícias locais mais recentes disponíveis — confira a data de cada uma. Considere cadastrar mais fontes locais em{" "}
              <Link href="/fontes" className="font-medium text-accent hover:underline">Fontes</Link>.
            </Notice>
            {fallbackLocal.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {fallbackLocal.map((a) => <ArticleCard key={a.id} article={a} variant="compact" />)}
              </div>
            ) : (
              <EmptyState icon={Newspaper} title="Ainda não há notícias locais coletadas" />
            )}
          </>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <section>
          <SectionHeader icon={Newspaper} title="Todas as notícias" description={`${total} resultado(s)`} />
          <ArticleFilters
            action="/imperatriz"
            categories={LOCAL_CATEGORIES}
            sources={sources}
            values={{ categoria, fonte, periodo: period.raw, q }}
            extra={
              <>
                <div>
                  <label htmlFor="f-abr" className={labelClass}>Abrangência</label>
                  <select id="f-abr" name="abrangencia" defaultValue={abrangencia} className={inputClass}>
                    <option value="regional">Imperatriz + Maranhão</option>
                    <option value="local">Só Imperatriz e região</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="f-ord" className={labelClass}>Ordenar por</label>
                  <select id="f-ord" name="ordem" defaultValue={ordem} className={inputClass}>
                    <option value="recentes">Mais recentes</option>
                    <option value="relevancia">Relevância editorial</option>
                  </select>
                </div>
              </>
            }
          />
          <div className="mt-4 space-y-3">
            {ranked
              ? ranked.slice(0, 40).map((e) => <ArticleCard key={e.lead.id} article={e.lead} reasons={e.reasons} related={e.cluster.items.filter((i) => i.id !== e.lead.id).slice(0, 3)} />)
              : feed.map((a) => <ArticleCard key={a.id} article={a} />)}
            {feed.length === 0 && (
              <EmptyState icon={Newspaper} title="Nenhuma notícia com esses filtros">
                Tente ampliar o período ou remover filtros.
              </EmptyState>
            )}
          </div>
          {!ranked && <Pagination page={page} total={total} pageSize={PAGE_SIZE} searchParams={sp} basePath="/imperatriz" />}
        </section>

        <aside>
          <Card className="p-4 xl:sticky xl:top-20">
            <SectionHeader icon={Users} title="Pautas que afetam a população" description="A IA aponta assuntos com possível impacto na vida dos moradores." />
            {!aiConfigured() && (
              <Notice tone="info" title="IA não configurada" className="mb-3">
                Defina ANTHROPIC_API_KEY para gerar sugestões. Veja Configurações.
              </Notice>
            )}
            <ActionButton action={generatePopulationImpact} label={digest ? "Gerar novas sugestões" : "Gerar sugestões"} pendingLabel="Analisando notícias…" icon={<Sparkles className="size-4" aria-hidden />} variant="ai" />
            <div className="mt-4">
              {digest ? (
                <>
                  <DigestMeta createdAt={digest.created_at} model={digest.model} />
                  <ol className="space-y-4">
                    {digest.content.itens.map((item, i) => (
                      <li key={i} className="rounded-lg border border-border p-3">
                        <p className="font-medium text-text">{item.assunto}</p>
                        <p className="mt-1 text-sm text-muted"><span className="font-medium text-text">Possível impacto (hipótese):</span> {item.possivel_impacto}</p>
                        <p className="mt-1 text-sm text-muted"><span className="font-medium text-text">Investigação sugerida:</span> {item.sugestao_investigacao}</p>
                        <div className="mt-2 space-y-2">
                          <BulletList title="Perguntas de apuração" items={item.perguntas_apuracao} />
                          <BulletList title="Fontes a consultar" items={item.fontes_consultar} />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Baseado em</p>
                            <SourceLinks ids={item.article_ids} articles={digestArticles} />
                          </div>
                        </div>
                        <div className="mt-3"><ToPautaLink theme={item.assunto} ids={item.article_ids} /></div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="text-sm text-muted">Nenhuma sugestão gerada ainda.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
