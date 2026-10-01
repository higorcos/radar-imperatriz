import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { AiLabel, Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { CONTENT_FORMAT_LABELS, CONTENT_STYLES, type ContentFormat, type ContentStyle } from "@/lib/ai/prompts";
import { aiConfigured } from "@/lib/env";
import { localDateKey, relativeTime } from "@/lib/format";
import { paramUuid, type SearchParams } from "@/lib/params";
import { getArticlesByIds } from "@/lib/repo/articles";
import { getDraft, listDrafts } from "@/lib/repo/drafts";
import { listPautas } from "@/lib/repo/pautas";
import { deleteDraftAction } from "./actions";
import { ContentEditor } from "./editor";

export const metadata: Metadata = { title: "Criador de Conteúdo" };
export const maxDuration = 120;

const isFormat = (v: string): v is ContentFormat => v in CONTENT_FORMAT_LABELS;
const isStyle = (v: string): v is ContentStyle => v in CONTENT_STYLES;

export default async function ConteudoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const draft = paramUuid(sp.rascunho) ? await getDraft(paramUuid(sp.rascunho)!) : null;
  const articleId = draft?.article_id ?? paramUuid(sp.artigo);
  const [pautas, drafts, articles] = await Promise.all([listPautas({ limit: 100 }), listDrafts(30), getArticlesByIds(articleId ? [articleId] : [])]);
  const article = articles[0];

  return (
    <>
      <PageHeader title="Criador de Conteúdo" description="Transforme pautas e notícias em rascunhos para Instagram: legendas, títulos, Reels, carrosséis, Stories e mais." />
      <ContentEditor
        key={draft?.id ?? `${paramUuid(sp.pauta) ?? ""}-${articleId ?? ""}`}
        initial={{
          draftId: draft?.id,
          pautaId: draft?.pauta_id ?? paramUuid(sp.pauta),
          articleId: article?.id,
          format: draft && isFormat(draft.format) ? draft.format : "legenda",
          style: draft && isStyle(draft.style) ? draft.style : "jornalistico",
          title: draft?.title ?? "",
          body: draft?.body ?? "",
          aiGenerated: draft?.ai_generated ?? false,
        }}
        pautas={pautas.map((p) => ({ id: p.id, title: p.title }))}
        articleLabel={article ? `${article.title} — ${article.source_name}` : undefined}
        today={localDateKey(new Date())}
        aiReady={aiConfigured()}
      />
      <section className="mt-10">
        <SectionHeader icon={FileText} title="Rascunhos salvos" />
        {drafts.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum rascunho salvo" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {drafts.map((d) => (
              <Card key={d.id} className="flex flex-col p-4" as="article">
                <div className="mb-1 flex flex-wrap gap-1">
                  <Badge tone="accent">{isFormat(d.format) ? CONTENT_FORMAT_LABELS[d.format] : d.format}</Badge>
                  {d.ai_generated && <AiLabel>IA</AiLabel>}
                </div>
                <Link href={`/conteudo?rascunho=${d.id}`} className="font-medium hover:text-accent">{d.title}</Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{d.body}</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-xs text-muted">Editado {relativeTime(d.updated_at)}</span>
                  <ActionButton action={deleteDraftAction.bind(null, d.id)} label="Excluir" pendingLabel="Excluindo…" icon={<Trash2 className="size-4" aria-hidden />} variant="ghost" size="sm" confirm="Excluir este rascunho?" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
