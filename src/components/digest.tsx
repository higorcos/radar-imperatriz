import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { formatDateTime, hoursSince, relativeTime } from "@/lib/format";
import type { Article } from "@/lib/repo/articles";
import { AiLabel, Notice, buttonClass } from "./ui";

/** Cabeçalho comum de conteúdo gerado por IA: selo, horário e aviso de defasagem. */
export function DigestMeta({ createdAt, model }: { createdAt: Date; model: string }) {
  const ageH = hoursSince(createdAt);
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <AiLabel />
        <span>
          Gerado {relativeTime(createdAt)} ({formatDateTime(createdAt)}) · {model}
        </span>
      </div>
      {ageH > 24 && (
        <Notice tone="warn" title="Este conteúdo tem mais de 24 horas">
          Pode não refletir os acontecimentos atuais. Gere uma nova versão.
        </Notice>
      )}
    </div>
  );
}

/** Lista as notícias reais (com fonte e link) que embasam um item gerado pela IA. */
export function SourceLinks({ ids, articles }: { ids: string[]; articles: Map<string, Article> }) {
  const found = ids.map((id) => articles.get(id)).filter((a): a is Article => Boolean(a));
  if (found.length === 0) {
    return <p className="text-xs text-warn">Sem notícia de referência vinculada — trate como ideia a verificar.</p>;
  }
  return (
    <ul className="space-y-1">
      {found.map((a) => (
        <li key={a.id} className="text-xs">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
            {a.source_name}
          </a>
          <span className="text-muted">
            {" "}
            — {a.title}
            {a.published_at ? ` (${relativeTime(a.published_at)})` : " (data não informada)"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ToPautaLink({ theme, ids }: { theme: string; ids: string[] }) {
  const params = new URLSearchParams({ tema: theme.slice(0, 200) });
  if (ids.length) params.set("artigos", ids.join(","));
  return (
    <Link href={`/pautas?${params}`} className={buttonClass("secondary", "sm")}>
      <Lightbulb className="size-4" aria-hidden />
      Desenvolver pauta
    </Link>
  );
}

export function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-text">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
