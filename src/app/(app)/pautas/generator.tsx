"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Compass, Loader2, Save, Sparkles, X } from "lucide-react";
import { toast } from "@/components/toaster";
import { AiLabel, Badge, buttonClass, inputClass, labelClass, textareaClass } from "@/components/ui";
import type { ResolvedPauta } from "@/lib/ai/features";
import { generatePautasAction, savePautaAction, type ArticleRef } from "./actions";
import { PautaDetailsView } from "./pauta-details";

export interface PickArticle {
  id: string;
  title: string;
  source: string;
  scope: string;
}
export interface PickOccurrence {
  id: string;
  description: string;
  status: string;
}

export function PautaGenerator({
  initialArticles,
  recentArticles,
  occurrences,
  initialTheme,
  initialOccurrenceId,
  initialIdea,
  angle,
  aiReady,
}: {
  initialArticles: PickArticle[];
  recentArticles: PickArticle[];
  occurrences: PickOccurrence[];
  initialTheme: string;
  initialOccurrenceId?: string;
  initialIdea: string;
  angle?: { id: string; title: string };
  aiReady: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<PickArticle[]>(initialArticles);
  const [occIds, setOccIds] = useState<string[]>(initialOccurrenceId ? [initialOccurrenceId] : []);
  const [theme, setTheme] = useState(initialTheme);
  const [idea, setIdea] = useState(initialIdea);
  const [angleState, setAngle] = useState(angle);
  const [results, setResults] = useState<{ pautas: ResolvedPauta[]; refs: ArticleRef[]; model: string } | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pool = [...initialArticles, ...recentArticles.filter((r) => !initialArticles.some((i) => i.id === r.id))];
  const toggleArticle = (a: PickArticle) =>
    setSelected((prev) => (prev.some((p) => p.id === a.id) ? prev.filter((p) => p.id !== a.id) : prev.length >= 15 ? prev : [...prev, a]));

  function generate(extra?: { angleOfSuggestion?: ResolvedPauta }) {
    setError(null);
    start(async () => {
      const angleIdea = extra?.angleOfSuggestion
        ? `Explore outro ângulo, diferente desta sugestão: "${extra.angleOfSuggestion.titulo_provisorio}" — ${extra.angleOfSuggestion.resumo}`
        : "";
      const res = await generatePautasAction({
        articleIds: extra?.angleOfSuggestion ? [...new Set([...selected.map((s) => s.id), ...extra.angleOfSuggestion.article_ids])] : selected.map((s) => s.id),
        occurrenceIds: occIds,
        theme,
        idea: [idea, angleIdea].filter(Boolean).join("\n\n"),
        anglePautaId: angleState?.id,
      });
      if (res.ok && res.data) {
        setResults(res.data);
        setSavedIdx(new Set());
      } else if (!res.ok) setError(res.error);
    });
  }

  async function save(p: ResolvedPauta, idx: number) {
    const { titulo_provisorio, resumo, article_ids, ...rest } = p;
    const res = await savePautaAction({
      titulo_provisorio,
      resumo,
      article_ids,
      ...rest,
      origin_label: angleState ? `Outro ângulo de: ${angleState.title}` : theme || undefined,
    });
    if (res.ok) {
      setSavedIdx((prev) => new Set(prev).add(idx));
      toast("Pauta salva na lista.");
      router.refresh();
    } else toast(res.error, "error");
  }

  const refsById = new Map(results?.refs.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        {angleState && (
          <div className="mb-4 flex items-start justify-between gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
            <span>
              <Compass className="mr-1 inline size-4 text-accent" aria-hidden />
              Explorando outro ângulo de: <strong>{angleState.title}</strong>
            </span>
            <button type="button" onClick={() => setAngle(undefined)} className="text-muted hover:text-text" aria-label="Remover ângulo">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className={labelClass}>Notícias selecionadas ({selected.length}/15)</p>
            {selected.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma. Escolha abaixo ou use “Gerar pauta” em qualquer notícia.</p>
            ) : (
              <ul className="space-y-1">
                {selected.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm">
                    <span>
                      {a.title} <span className="text-xs text-muted">— {a.source}</span>
                    </span>
                    <button type="button" onClick={() => toggleArticle(a)} className="text-muted hover:text-danger" aria-label={`Remover ${a.title}`}>
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-accent">Adicionar notícias recentes</summary>
              <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                {pool.map((a) => {
                  const checked = selected.some((s) => s.id === a.id);
                  return (
                    <li key={a.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleArticle(a)} className="mt-1" />
                        <span>
                          {a.title} <Badge>{a.scope === "nacional" ? "Nacional" : a.scope === "local" ? "Imperatriz" : "Maranhão"}</Badge>{" "}
                          <span className="text-xs text-muted">{a.source}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </details>
            {occurrences.length > 0 && (
              <div className="mt-4">
                <p className={labelClass}>Acontecimentos cadastrados no Radar</p>
                <ul className="space-y-1">
                  {occurrences.map((o) => (
                    <li key={o.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-2">
                        <input
                          type="checkbox"
                          checked={occIds.includes(o.id)}
                          onChange={() => setOccIds((prev) => (prev.includes(o.id) ? prev.filter((x) => x !== o.id) : [...prev, o.id].slice(-5)))}
                          className="mt-1"
                        />
                        <span>
                          {o.description.slice(0, 140)}
                          {o.status === "recebida" || o.status === "em_apuracao" ? <Badge tone="warn" className="ml-1">Não verificado</Badge> : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="tema" className={labelClass}>Tema específico (opcional)</label>
              <input id="tema" value={theme} onChange={(e) => setTheme(e.target.value)} maxLength={300} placeholder="Ex.: transporte público nos bairros" className={inputClass} />
            </div>
            <div>
              <label htmlFor="ideia" className={labelClass}>Ideia escrita por você (opcional)</label>
              <textarea id="ideia" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={2000} rows={5} placeholder="Descreva uma ideia, dúvida ou situação que você observou…" className={textareaClass} />
            </div>
            {!aiReady && <p className="text-sm text-warn">IA não configurada: defina ANTHROPIC_API_KEY (veja Configurações).</p>}
            <button type="button" onClick={() => generate()} disabled={pending} className={buttonClass("ai")}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {pending ? "Gerando ideias…" : "Gerar novas ideias"}
            </button>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </div>
        </div>
      </div>

      {pending && !results && (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      )}

      {results && (
        <section aria-live="polite" className={pending ? "opacity-60" : undefined}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold">Sugestões</h2>
            <AiLabel />
            <span className="text-xs text-muted">{results.model}</span>
          </div>
          <ol className="space-y-4">
            {results.pautas.map((p, idx) => (
              <li key={idx} className="fade-in rounded-xl border border-border bg-surface p-4">
                <h3 className="font-serif text-lg font-semibold leading-snug">{p.titulo_provisorio}</h3>
                <p className="mt-1 text-sm text-muted">{p.resumo}</p>
                <div className="mt-3">
                  <PautaDetailsView d={p} />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Baseada em</p>
                  {p.article_ids.length === 0 ? (
                    <p className="text-xs text-muted">Tema/ideia informados (sem notícia vinculada).</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {p.article_ids.map((id) => {
                        const r = refsById.get(id);
                        return r ? (
                          <li key={id} className="text-xs">
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">{r.source}</a>
                            <span className="text-muted"> — {r.title}</span>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  <button type="button" disabled={savedIdx.has(idx)} onClick={() => save(p, idx)} className={buttonClass(savedIdx.has(idx) ? "secondary" : "primary", "sm")}>
                    {savedIdx.has(idx) ? <Check className="size-4" aria-hidden /> : <Save className="size-4" aria-hidden />}
                    {savedIdx.has(idx) ? "Salva" : "Salvar pauta"}
                  </button>
                  <button type="button" disabled={pending} onClick={() => generate({ angleOfSuggestion: p })} className={buttonClass("secondary", "sm")}>
                    <Compass className="size-4" aria-hidden />
                    Explorar outro ângulo
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
