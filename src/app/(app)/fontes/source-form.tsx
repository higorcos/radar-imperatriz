"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/components/toaster";
import { buttonClass, inputClass, labelClass } from "@/components/ui";
import type { ActionResult } from "@/lib/action-result";
import { createSourceAction } from "./actions";

export function SourceForm({ categories }: { categories: [string, string][] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createSourceAction, { ok: true });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message) {
      toast(state.message);
      ref.current?.reset();
    }
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label htmlFor="src-name" className={labelClass}>Nome *</label>
        <input id="src-name" name="name" required minLength={2} maxLength={200} className={inputClass} />
      </div>
      <div>
        <label htmlFor="src-site" className={labelClass}>Site *</label>
        <input id="src-site" name="site_url" type="url" required className={inputClass} placeholder="https://" />
      </div>
      <div>
        <label htmlFor="src-feed" className={labelClass}>Feed RSS/Atom ou página de notícias</label>
        <input id="src-feed" name="feed_url" type="url" className={inputClass} placeholder="https://…/feed" />
      </div>
      <div>
        <label htmlFor="src-type" className={labelClass}>Tipo</label>
        <select id="src-type" name="type" defaultValue="jornalistica" className={inputClass}>
          <option value="jornalistica">Jornalística</option>
          <option value="institucional">Institucional</option>
          <option value="documento_publico">Documento público</option>
          <option value="relato_usuario">Relato de usuário</option>
          <option value="agregador">Agregador</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="src-scope" className={labelClass}>Cobertura</label>
          <select id="src-scope" name="scope" defaultValue="local" className={inputClass}>
            <option value="local">Imperatriz</option>
            <option value="estadual">Maranhão</option>
            <option value="nacional">Nacional</option>
          </select>
        </div>
        <div>
          <label htmlFor="src-region" className={labelClass}>Região</label>
          <input id="src-region" name="region" required defaultValue="Imperatriz (MA)" maxLength={120} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="src-method" className={labelClass}>Método de coleta</label>
          <select id="src-method" name="method" defaultValue="rss" className={inputClass}>
            <option value="rss">RSS automático</option>
            <option value="pagina_html">Página de notícias (HTML)</option>
            <option value="manual">Consulta manual</option>
            <option value="sem_integracao">Sem integração</option>
          </select>
        </div>
        <div>
          <label htmlFor="src-freq" className={labelClass}>Frequência (min)</label>
          <input id="src-freq" name="frequency_minutes" type="number" min={15} max={10080} defaultValue={60} className={inputClass} />
        </div>
      </div>
      <fieldset className="sm:col-span-2 lg:col-span-3">
        <legend className={labelClass}>Categorias principais (opcional, até 5)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {categories.map(([k, l]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="categories" value={k} /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="src-pattern" className={labelClass}>Padrão do link de notícia (só para página HTML)</label>
        <input id="src-pattern" name="link_pattern" maxLength={200} className={inputClass} placeholder="/noticia/" />
      </div>
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="src-notes" className={labelClass}>Observações (licença, condições de uso)</label>
        <input id="src-notes" name="notes" maxLength={1000} className={inputClass} />
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          {pending ? "Validando feed…" : "Cadastrar fonte"}
        </button>
      </div>
      {!state.ok && <p role="alert" className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p>}
    </form>
  );
}
