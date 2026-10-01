import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb, ListChecks } from "lucide-react";
import { AiLabel, Badge, Card, EmptyState, PageHeader, SectionHeader, cx } from "@/components/ui";
import { aiConfigured } from "@/lib/env";
import { localDateKey, relativeTime } from "@/lib/format";
import { paramText, paramUuid, paramUuidList, type SearchParams } from "@/lib/params";
import { getArticlesByIds, listArticles, type Article } from "@/lib/repo/articles";
import { listOccurrences } from "@/lib/repo/occurrences";
import { PRODUCTION_STATUS_LABELS, getPauta, listPautas, type ProductionStatus } from "@/lib/repo/pautas";
import { getSaved } from "@/lib/repo/saved";
import { PautaGenerator } from "./generator";
import { ManualPautaForm } from "./manual-form";
import { PautaControls } from "./pauta-controls";
import { PautaDetailsView } from "./pauta-details";

export const metadata: Metadata = { title: "Gerador de Pautas" };
export const maxDuration = 120;

export default async function PautasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const initialIds = [...new Set([...paramUuidList(sp.artigos), ...(paramUuid(sp.artigo) ? [paramUuid(sp.artigo)!] : [])])];
  const savedItem = paramUuid(sp.salvo) ? await getSaved(paramUuid(sp.salvo)!) : null;
  if (savedItem?.article_id) initialIds.push(savedItem.article_id);
  const anglePauta = paramUuid(sp.angulo) ? await getPauta(paramUuid(sp.angulo)!) : null;
  const highlight = paramUuid(sp.ver);

  const [initial, recentLocal, recentNational, occurrences, pautas] = await Promise.all([
    getArticlesByIds(initialIds),
    listArticles({ scopes: ["local", "estadual"], sinceHours: 24 * 7, limit: 20 }),
    listArticles({ scopes: ["nacional"], sinceHours: 48, limit: 20 }),
    listOccurrences(),
    listPautas({ limit: 100 }),
  ]);
  const originArticles = new Map((await getArticlesByIds([...new Set(pautas.flatMap((p) => p.article_ids))].slice(0, 500))).map((a) => [a.id, a]));
  const pick = (a: { id: string; title: string; source_name: string; scope: string }) => ({ id: a.id, title: a.title, source: a.source_name, scope: a.scope });
  const savedIdea = savedItem && !savedItem.article_id ? [savedItem.title, savedItem.notes].filter(Boolean).join("\n") : "";

  return (
    <>
      <PageHeader
        title="Gerador de Pautas"
        description="Escolha notícias, acontecimentos, um tema ou escreva uma ideia. A IA sugere pautas com perguntas, fontes e dados para você apurar."
      />
      <PautaGenerator
        key={`${initialIds.join(",")}-${anglePauta?.id ?? ""}-${paramText(sp.tema) ?? ""}`}
        initialArticles={initial.map(pick)}
        recentArticles={[...recentLocal, ...recentNational].map(pick)}
        occurrences={occurrences.filter((o) => o.status !== "descartada").slice(0, 15).map((o) => ({ id: o.id, description: o.description, status: o.status }))}
        initialTheme={paramText(sp.tema, 300) ?? ""}
        initialIdea={savedIdea}
        initialOccurrenceId={paramUuid(sp.ocorrencia)}
        angle={anglePauta ? { id: anglePauta.id, title: anglePauta.title } : undefined}
        aiReady={aiConfigured()}
      />

      <section className="mt-10">
        <SectionHeader icon={ListChecks} title="Pautas cadastradas" description="Acompanhe o status de cada pauta, agende no calendário ou transforme em conteúdo." />
        <Card className="mb-4 p-4">
          <ManualPautaForm />
        </Card>
        {pautas.length === 0 ? (
          <EmptyState icon={Lightbulb} title="Nenhuma pauta salva ainda">Gere sugestões acima e salve as que fizerem sentido.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {pautas.map((p) => (
              <li key={p.id} id={p.id}>
                <Card className={cx("p-4", highlight === p.id && "ring-2 ring-accent")} as="article">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone={p.status === "publicado" ? "ok" : "accent"}>{p.status === "descartada" ? "Descartada" : PRODUCTION_STATUS_LABELS[p.status as ProductionStatus]}</Badge>
                    {p.origin === "ia" ? <AiLabel>Sugerida pela IA</AiLabel> : <Badge>Manual</Badge>}
                    <span className="text-xs text-muted">{relativeTime(p.created_at)}</span>
                    {p.origin_label && <span className="text-xs text-muted">· {p.origin_label}</span>}
                  </div>
                  <h3 className="font-serif text-[17px] font-semibold leading-snug">{p.title}</h3>
                  {p.summary && <p className="mt-1 text-sm text-muted">{p.summary}</p>}
                  {Object.keys(p.details).length > 0 && (
                    <details className="mt-2" open={highlight === p.id}>
                      <summary className="cursor-pointer text-sm font-medium text-accent">Ver detalhes da pauta</summary>
                      <div className="mt-3"><PautaDetailsView d={p.details} /></div>
                      {p.article_ids.length > 0 && <PautaSources ids={p.article_ids} articles={originArticles} />}
                    </details>
                  )}
                  <div className="mt-3 border-t border-border pt-3">
                    <PautaControls id={p.id} status={p.status} today={localDateKey(new Date())} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function PautaSources({ ids, articles: byId }: { ids: string[]; articles: Map<string, Article> }) {
  const articles = ids.map((id) => byId.get(id)).filter((a): a is Article => Boolean(a));
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notícias de origem</p>
      <ul className="space-y-0.5">
        {articles.map((a) => (
          <li key={a.id} className="text-xs">
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">{a.source_name}</a>
            <span className="text-muted"> — {a.title}</span>
          </li>
        ))}
      </ul>
      <Link href={`/pautas?artigos=${ids.join(",")}`} className="mt-1 inline-block text-xs text-accent hover:underline">Usar estas notícias no gerador</Link>
    </div>
  );
}
