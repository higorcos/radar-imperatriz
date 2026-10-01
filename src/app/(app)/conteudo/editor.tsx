"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Copy, Heart, Loader2, MessageCircle, Save, Send, Sparkles, Bookmark } from "lucide-react";
import { toast } from "@/components/toaster";
import { AiLabel, Notice, buttonClass, inputClass, labelClass, textareaClass } from "@/components/ui";
import { CONTENT_FORMAT_LABELS, CONTENT_STYLES, type ContentFormat, type ContentStyle } from "@/lib/ai/prompts";
import type { ContentOutput } from "@/lib/ai/schemas";
import { generateContentAction, saveDraftAction, scheduleDraftAction } from "./actions";

export interface EditorInitial {
  draftId?: string;
  pautaId?: string;
  articleId?: string;
  format: ContentFormat;
  style: ContentStyle;
  title: string;
  body: string;
  aiGenerated: boolean;
}

/** Texto editável a partir da saída da IA. Carrossel vira blocos "=== Slide N: título ===". */
function contentToBody(c: ContentOutput, format: ContentFormat): string {
  const tags = c.hashtags.length ? `\n\n${c.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : "";
  const check = c.pontos_a_verificar.length ? `\n\n[VERIFICAR ANTES DE PUBLICAR]\n${c.pontos_a_verificar.map((p) => `- ${p}`).join("\n")}` : "";
  if (format === "carrossel" && c.slides.length) {
    const slides = c.slides.map((s, i) => `=== Slide ${i + 1}: ${s.titulo} ===\n${s.texto}`).join("\n\n");
    return `${slides}\n\n=== Legenda ===\n${c.texto}${tags}${check}`;
  }
  return `${c.texto}${tags}${check}`;
}

function parseSlides(body: string): { title: string; text: string }[] {
  const re = /=== (?:Slide \d+: )?(.+?) ===\n([\s\S]*?)(?=\n=== |$)/g;
  const out: { title: string; text: string }[] = [];
  for (const m of body.matchAll(re)) if (m[1] !== "Legenda") out.push({ title: m[1], text: m[2].trim() });
  return out;
}

function captionOf(body: string): string {
  const legenda = body.split("=== Legenda ===")[1];
  return (legenda ?? body).replace(/\[VERIFICAR ANTES DE PUBLICAR\][\s\S]*$/, "").trim();
}

export function ContentEditor({
  initial,
  pautas,
  articleLabel,
  today,
  aiReady,
}: {
  initial: EditorInitial;
  pautas: { id: string; title: string }[];
  articleLabel?: string;
  today: string;
  aiReady: boolean;
}) {
  const router = useRouter();
  const [draftId, setDraftId] = useState(initial.draftId);
  const [pautaId, setPautaId] = useState(initial.pautaId ?? "");
  const [format, setFormat] = useState<ContentFormat>(initial.format);
  const [style, setStyle] = useState<ContentStyle>(initial.style);
  const [brief, setBrief] = useState("");
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [aiGenerated, setAiGenerated] = useState(initial.aiGenerated);
  const [model, setModel] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("18:00");
  const [error, setError] = useState<string | null>(null);
  const [generating, startGen] = useTransition();
  const [saving, startSave] = useTransition();

  function generate() {
    setError(null);
    startGen(async () => {
      const res = await generateContentAction({ pautaId: pautaId || undefined, articleId: initial.articleId, brief, format, style });
      if (res.ok && res.data) {
        setTitle(res.data.titulo);
        setBody(contentToBody(res.data, format));
        setAiGenerated(true);
        setModel(res.data.model);
      } else if (!res.ok) setError(res.error);
    });
  }

  async function save(): Promise<string | undefined> {
    const res = await saveDraftAction({ id: draftId, pautaId: pautaId || undefined, articleId: initial.articleId, format, style, title, body, aiGenerated });
    if (res.ok && res.data) {
      setDraftId(res.data.id);
      toast("Rascunho salvo.");
      router.refresh();
      return res.data.id;
    }
    if (!res.ok) toast(res.error, "error");
  }

  const slides = format === "carrossel" ? parseSlides(body) : [];
  const caption = captionOf(body);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="pauta" className={labelClass}>Assunto: pauta cadastrada</label>
            <select id="pauta" value={pautaId} onChange={(e) => setPautaId(e.target.value)} className={inputClass}>
              <option value="">— Nenhuma —</option>
              {pautas.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            {articleLabel && <p className="mt-1 text-xs text-muted">Notícia de base: {articleLabel}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="brief" className={labelClass}>Orientações ou assunto livre</label>
            <textarea id="brief" rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={3000} className={textareaClass} placeholder="Ex.: foco no serviço — onde e quando a população pode se vacinar" />
          </div>
          <div>
            <label htmlFor="format" className={labelClass}>Formato</label>
            <select id="format" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)} className={inputClass}>
              {Object.entries(CONTENT_FORMAT_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="style" className={labelClass}>Estilo</label>
            <select id="style" value={style} onChange={(e) => setStyle(e.target.value as ContentStyle)} className={inputClass}>
              {Object.entries(CONTENT_STYLES).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="button" onClick={generate} disabled={generating} className={buttonClass("ai")}>
              {generating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {generating ? "Escrevendo rascunho…" : "Gerar com IA"}
            </button>
            {!aiReady && <span className="text-sm text-warn">IA não configurada — você pode escrever manualmente.</span>}
            {error && <span role="alert" className="text-sm text-danger">{error}</span>}
          </div>
        </div>

        <Notice tone="warn" title="Revisão editorial obrigatória">
          Confira cada informação nas fontes originais, substitua os marcadores [entre colchetes] e remova a lista “VERIFICAR ANTES DE PUBLICAR”.
          O Radar não publica nada automaticamente.
        </Notice>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Editor</p>
            {aiGenerated && <AiLabel>{`Rascunho gerado por IA${model ? ` · ${model}` : ""}`}</AiLabel>}
          </div>
          <label htmlFor="title" className={labelClass}>Título interno</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} className={inputClass} />
          <label htmlFor="body" className={`${labelClass} mt-3`}>Texto</label>
          <textarea id="body" rows={16} value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} className={`${textareaClass} font-mono text-[13px] leading-relaxed`} />
          <p className="mt-1 text-right text-xs text-muted">{caption.length} caracteres na legenda (limite do Instagram: 2.200)</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(caption);
                  toast("Legenda copiada.");
                } catch {
                  toast("Não foi possível copiar. Selecione o texto manualmente.", "error");
                }
              }}
            >
              <Copy className="size-4" aria-hidden /> Copiar legenda
            </button>
            <button type="button" disabled={saving || !title.trim()} className={buttonClass("primary")} onClick={() => startSave(async () => { await save(); })}>
              <Save className="size-4" aria-hidden /> {draftId ? "Salvar alterações" : "Salvar rascunho"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-surface-2 p-3">
            <div>
              <label htmlFor="cal-date" className={labelClass}>Publicar em</label>
              <input id="cal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} w-auto`} />
            </div>
            <div>
              <label htmlFor="cal-time" className={labelClass}>Horário</label>
              <input id="cal-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} w-auto`} />
            </div>
            <button
              type="button"
              disabled={saving || !title.trim()}
              className={buttonClass("secondary")}
              onClick={() =>
                startSave(async () => {
                  const id = await save();
                  if (!id) return;
                  const res = await scheduleDraftAction({ draftId: id, date, time });
                  if (res.ok) toast(res.message ?? "Agendado.");
                  else toast(res.error, "error");
                })
              }
            >
              <CalendarPlus className="size-4" aria-hidden /> Enviar ao calendário
            </button>
          </div>
        </div>
      </div>

      <aside aria-label="Prévia da publicação">
        <div className="xl:sticky xl:top-20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Prévia (aproximada)</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">RI</div>
              <div className="text-[13px] font-semibold">sua.pagina</div>
            </div>
            <div className="aspect-square overflow-x-auto bg-navy">
              {slides.length > 0 ? (
                <div className="flex h-full snap-x snap-mandatory">
                  {slides.map((s, i) => (
                    <div key={i} className="flex h-full w-full shrink-0 snap-center flex-col justify-center p-6 text-on-navy">
                      <p className="text-[11px] text-on-navy-muted">{i + 1}/{slides.length}</p>
                      <p className="mt-2 font-serif text-xl font-bold leading-tight">{s.title}</p>
                      <p className="mt-3 line-clamp-6 text-sm text-on-navy-muted">{s.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col justify-end bg-gradient-to-t from-black/50 to-transparent p-6">
                  <p className="font-serif text-2xl font-bold leading-tight text-white">{title || "Título da arte"}</p>
                  <p className="mt-2 text-xs text-white/70">A informação que movimenta a cidade.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-3 pt-2.5 text-text">
              <Heart className="size-5" aria-hidden /> <MessageCircle className="size-5" aria-hidden /> <Send className="size-5" aria-hidden />
              <Bookmark className="ml-auto size-5" aria-hidden />
            </div>
            <p className="max-h-72 overflow-y-auto whitespace-pre-line px-3 py-2.5 text-[13px] leading-relaxed">
              <span className="font-semibold">sua.pagina </span>
              {caption || <span className="text-muted">A legenda aparece aqui enquanto você edita.</span>}
            </p>
          </div>
          {slides.length > 1 && <p className="mt-2 text-xs text-muted">Deslize a prévia para ver os {slides.length} slides.</p>}
        </div>
      </aside>
    </div>
  );
}
