import { categoryLabel, type CategoryKey } from "@/lib/categories";
import { buttonClass, inputClass, labelClass } from "./ui";

export const PERIODS = [
  { value: "24", label: "Últimas 24 horas" },
  { value: "72", label: "Últimos 3 dias" },
  { value: "168", label: "Últimos 7 dias" },
  { value: "", label: "Todo o período" },
];

/** Filtros via GET (funcionam sem JavaScript e geram URLs compartilháveis). */
export function ArticleFilters({
  action,
  categories,
  sources,
  values,
  extra,
}: {
  action: string;
  categories: CategoryKey[];
  sources: { id: string; name: string }[];
  values: { categoria?: string; fonte?: string; periodo?: string; q?: string; ordem?: string };
  extra?: React.ReactNode;
}) {
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label htmlFor="f-q" className={labelClass}>Assunto</label>
        <input id="f-q" name="q" defaultValue={values.q} placeholder="Ex.: vacinação, BR-010" className={inputClass} />
      </div>
      <div>
        <label htmlFor="f-cat" className={labelClass}>Categoria</label>
        <select id="f-cat" name="categoria" defaultValue={values.categoria ?? ""} className={inputClass}>
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c} value={c}>{categoryLabel(c)}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-src" className={labelClass}>Fonte</label>
        <select id="f-src" name="fonte" defaultValue={values.fonte ?? ""} className={inputClass}>
          <option value="">Todas</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-per" className={labelClass}>Período</label>
        <select id="f-per" name="periodo" defaultValue={values.periodo ?? "72"} className={inputClass}>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      {extra}
      <div className="flex items-end gap-2">
        <button type="submit" className={buttonClass("primary")}>Filtrar</button>
        <a href={action} className={buttonClass("ghost")}>Limpar</a>
      </div>
    </form>
  );
}
