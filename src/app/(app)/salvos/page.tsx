import type { Metadata } from "next";
import Link from "next/link";
import { BookmarkCheck, ExternalLink, Lightbulb, Plus, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Badge, Card, EmptyState, PageHeader, buttonClass, cx, inputClass, labelClass } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/format";
import { paramEnum, paramText, type SearchParams } from "@/lib/params";
import { SAVED_KINDS, SAVED_KIND_LABELS, allTags, listSaved, type SavedKind } from "@/lib/repo/saved";
import { deleteSavedAction } from "./actions";
import { EditSavedForm, NewSavedForm } from "./forms";

export const metadata: Metadata = { title: "Notícias Salvas" };

export default async function SalvosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const kindParam = paramEnum(sp.tipo, ["", ...SAVED_KINDS] as const, "");
  const kind = kindParam === "" ? undefined : (kindParam as SavedKind);
  const tag = paramText(sp.etiqueta, 40);
  const q = paramText(sp.q, 100);
  const [items, tags] = await Promise.all([listSaved({ kind, tag, q }), allTags()]);
  const kinds: [string, string][] = SAVED_KINDS.map((k) => [k, SAVED_KIND_LABELS[k]]);
  const link = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { tipo: kind, etiqueta: tag, q, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    return `/salvos?${u}`;
  };

  return (
    <>
      <PageHeader title="Notícias Salvas" description="Sua biblioteca: notícias, pautas, fontes, ideias, rascunhos e entrevistas planejadas." />
      <details className="mb-6 rounded-xl border border-border bg-surface p-4">
        <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-accent"><Plus className="size-4" aria-hidden /> Adicionar item manualmente</summary>
        <div className="mt-4"><NewSavedForm kinds={kinds} /></div>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link href={link({ tipo: undefined })} className={cx("rounded-full border px-3 py-1 text-xs", !kind ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text")}>Todos</Link>
        {SAVED_KINDS.map((k) => (
          <Link key={k} href={link({ tipo: k })} className={cx("rounded-full border px-3 py-1 text-xs", kind === k ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text")}>{SAVED_KIND_LABELS[k]}</Link>
        ))}
      </div>
      <form action="/salvos" className="mb-6 flex flex-wrap items-end gap-3">
        {kind && <input type="hidden" name="tipo" value={kind} />}
        <div>
          <label htmlFor="sq" className={labelClass}>Pesquisar</label>
          <input id="sq" name="q" defaultValue={q} className={`${inputClass} w-64`} />
        </div>
        <div>
          <label htmlFor="stag" className={labelClass}>Etiqueta</label>
          <select id="stag" name="etiqueta" defaultValue={tag ?? ""} className={`${inputClass} w-48`}>
            <option value="">Todas</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button type="submit" className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={BookmarkCheck} title={kind || tag || q ? "Nada encontrado com esses filtros" : "Sua biblioteca está vazia"}>
          Use “Salvar” nos cards de notícia ou adicione itens manualmente.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((it) => (
            <li key={it.id}>
              <Card className="flex h-full flex-col p-4" as="article">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="accent">{SAVED_KIND_LABELS[it.kind]}</Badge>
                  {it.tags.map((t) => <Link key={t} href={link({ etiqueta: t })}><Badge>#{t}</Badge></Link>)}
                  <span className="text-xs text-muted">salvo {relativeTime(it.created_at)}</span>
                </div>
                <p className="font-serif text-[16px] font-semibold leading-snug">{it.title}</p>
                {it.source_name && (
                  <p className="text-xs text-muted">{it.source_name} · {it.published_at ? `publicado em ${formatDateTime(it.published_at)}` : "data não informada"}</p>
                )}
                {it.notes && <p className="mt-1.5 whitespace-pre-line text-sm text-muted">{it.notes}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-2.5 mt-3">
                  <Link href={`/pautas?salvo=${it.id}`} className={buttonClass("ghost", "sm")}><Lightbulb className="size-4" aria-hidden /> Transformar em pauta</Link>
                  {it.url && (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}><ExternalLink className="size-4" aria-hidden /> Abrir</a>
                  )}
                  <ActionButton action={deleteSavedAction.bind(null, it.id)} label="Remover" pendingLabel="Removendo…" icon={<Trash2 className="size-4" aria-hidden />} variant="ghost" size="sm" confirm="Remover da biblioteca?" />
                  <EditSavedForm id={it.id} notes={it.notes ?? ""} tags={it.tags} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
