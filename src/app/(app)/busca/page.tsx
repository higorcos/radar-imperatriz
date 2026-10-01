import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { relativeTime } from "@/lib/format";
import { paramText, type SearchParams } from "@/lib/params";
import { listArticles } from "@/lib/repo/articles";
import { OCCURRENCE_STATUS_LABELS, searchOccurrences } from "@/lib/repo/occurrences";
import { searchPautas } from "@/lib/repo/pautas";
import { SAVED_KIND_LABELS, listSaved } from "@/lib/repo/saved";

export const metadata: Metadata = { title: "Pesquisa" };

export default async function BuscaPage({ searchParams }: { searchParams: SearchParams }) {
  const q = paramText((await searchParams).q, 100);
  if (!q) {
    return (
      <>
        <PageHeader title="Pesquisa" />
        <EmptyState icon={Search} title="Digite um assunto na barra de pesquisa">Busca em notícias, pautas, ocorrências e itens salvos.</EmptyState>
      </>
    );
  }
  const [articles, pautas, occurrences, saved] = await Promise.all([
    listArticles({ scopes: ["local", "estadual", "nacional"], q, limit: 30 }),
    searchPautas(q),
    searchOccurrences(q),
    listSaved({ q }),
  ]);
  const total = articles.length + pautas.length + occurrences.length + saved.length;

  return (
    <>
      <PageHeader title={`Resultados para “${q}”`} description={`${total} resultado(s). Notícias ordenadas da mais recente para a mais antiga.`} />
      {total === 0 && <EmptyState icon={Search} title="Nada encontrado">Tente outras palavras ou termos mais gerais.</EmptyState>}
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <section>
          {articles.length > 0 && <SectionHeader title={`Notícias (${articles.length})`} />}
          <div className="space-y-3">
            {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
        <aside className="space-y-4">
          {pautas.length > 0 && (
            <Card className="p-4">
              <SectionHeader title={`Pautas (${pautas.length})`} />
              <ul className="space-y-2">
                {pautas.map((p) => (
                  <li key={p.id}><Link href={`/pautas?ver=${p.id}#${p.id}`} className="text-sm font-medium hover:text-accent">{p.title}</Link></li>
                ))}
              </ul>
            </Card>
          )}
          {occurrences.length > 0 && (
            <Card className="p-4">
              <SectionHeader title={`Ocorrências (${occurrences.length})`} />
              <ul className="space-y-2">
                {occurrences.map((o) => (
                  <li key={o.id} className="text-sm">
                    <Link href={`/radar#occ-${o.id}`} className="hover:text-accent">{o.description.slice(0, 120)}</Link>
                    <p className="text-xs text-muted">{OCCURRENCE_STATUS_LABELS[o.status]} · {relativeTime(o.created_at)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {saved.length > 0 && (
            <Card className="p-4">
              <SectionHeader title={`Salvos (${saved.length})`} />
              <ul className="space-y-2">
                {saved.map((s) => (
                  <li key={s.id} className="text-sm"><Badge className="mr-1">{SAVED_KIND_LABELS[s.kind]}</Badge>{s.title}</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
