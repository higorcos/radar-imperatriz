import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Lightbulb, Quote } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { Article } from "@/lib/repo/articles";
import { SaveButton } from "./save-button";
import { Badge, buttonClass, cx } from "./ui";

const SOURCE_TYPE_LABEL: Record<string, string> = {
  jornalistica: "Jornalística",
  institucional: "Institucional",
  documento_publico: "Documento público",
  relato_usuario: "Relato",
  agregador: "Agregador",
};

export function ArticleMeta({ article }: { article: Pick<Article, "published_at" | "collected_at" | "source_name"> }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
      <span className="font-medium text-text">{article.source_name}</span>
      <span aria-hidden>·</span>
      {article.published_at ? (
        <time dateTime={new Date(article.published_at).toISOString()} title={`Publicado em ${formatDateTime(article.published_at)}`}>
          {relativeTime(article.published_at)}
        </time>
      ) : (
        <span title="A fonte não informou a data de publicação">data de publicação não informada</span>
      )}
    </p>
  );
}

export function ArticleBadges({ article }: { article: Article }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge tone="accent">{categoryLabel(article.category)}</Badge>
      {article.scope === "estadual" && <Badge>Maranhão</Badge>}
      {article.mentions_imperatriz && article.scope === "local" && <Badge tone="ok">Imperatriz e região</Badge>}
      {article.source_type === "institucional" && <Badge title="Fonte oficial/institucional">{SOURCE_TYPE_LABEL.institucional}</Badge>}
      {article.content_kind === "opiniao" && <Badge tone="warn" title="Texto de opinião — não é reportagem">Opinião</Badge>}
      {article.content_kind === "analise" && <Badge tone="warn" title="Texto analítico">Análise</Badge>}
      {article.has_statement && (
        <Badge tone="neutral" title="O título relata uma declaração: fala atribuída a alguém não é fato confirmado">
          <Quote className="size-3" aria-hidden /> Declaração
        </Badge>
      )}
    </div>
  );
}

export function ArticleActions({ article }: { article: Article }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <SaveButton articleId={article.id} initialSaved={article.saved} />
      <Link href={`/pautas?artigo=${article.id}`} className={buttonClass("ghost", "sm")}>
        <Lightbulb className="size-4" aria-hidden />
        Gerar pauta
      </Link>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
        <ExternalLink className="size-4" aria-hidden />
        Abrir original
        <span className="sr-only">(abre em nova aba)</span>
      </a>
    </div>
  );
}

export function ArticleCard({
  article,
  variant = "default",
  reasons,
  related,
}: {
  article: Article;
  variant?: "default" | "compact" | "feature";
  reasons?: string[];
  related?: Article[];
}) {
  const showImage = variant === "feature" && article.image_url;
  return (
    <article className={cx("fade-in flex flex-col rounded-xl border border-border bg-surface", variant === "compact" ? "p-3.5" : "p-4")}>
      {showImage && (
        <div className="relative -mx-4 -mt-4 mb-3 aspect-[16/8] overflow-hidden rounded-t-xl bg-surface-2">
          <Image src={article.image_url!} alt="" fill unoptimized className="object-cover" referrerPolicy="no-referrer" />
          <span className="absolute bottom-1.5 right-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">Imagem: {article.source_name}</span>
        </div>
      )}
      <div className="mb-2">
        <ArticleBadges article={article} />
      </div>
      <h3 className={cx("font-serif font-semibold leading-snug text-text", variant === "compact" ? "text-[15px]" : "text-[17px]")}>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
          {article.title}
        </a>
      </h3>
      {article.excerpt && variant !== "compact" && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">
          <span className="sr-only">Trecho da fonte: </span>
          {article.excerpt}
        </p>
      )}
      <div className="mt-2.5">
        <ArticleMeta article={article} />
        <p className="mt-0.5 text-[11px] text-muted/80">Coletada em {formatDateTime(article.collected_at)}</p>
      </div>
      {reasons && reasons.length > 0 && (
        <details className="mt-2.5 rounded-lg bg-surface-2 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-text">Por que está em destaque?</summary>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-muted/80">Ordenação automática por critérios explícitos — não é avaliação editorial.</p>
        </details>
      )}
      {related && related.length > 0 && (
        <div className="mt-2.5 border-t border-border pt-2.5">
          <p className="mb-1 text-xs font-medium text-muted">Também em:</p>
          <ul className="space-y-1">
            {related.map((r) => (
              <li key={r.id} className="text-xs">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  {r.source_name}
                </a>
                <span className="text-muted"> — {r.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 border-t border-border pt-2.5">
        <ArticleActions article={article} />
      </div>
    </article>
  );
}
