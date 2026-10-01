import type { PautaDetails } from "@/lib/ai/schemas";

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
        {items.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-0.5 text-sm">{text}</p>
    </div>
  );
}

/** Detalhes de uma pauta (sugestão da IA ou pauta salva). */
export function PautaDetailsView({ d }: { d: Partial<PautaDetails> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field title="Pergunta central" text={d.pergunta_central} />
      <Field title="Justificativa jornalística" text={d.justificativa} />
      <Field title="Interesse público" text={d.interesse_publico} />
      <Field title="Abordagem sugerida" text={d.abordagem} />
      <Field title="Formato recomendado" text={d.formato} />
      <List title="Possíveis entrevistados" items={d.entrevistados} />
      <List title="Fontes a consultar" items={d.fontes_consultar} />
      <List title="Dados a levantar" items={d.dados_levantar} />
      <List title="Perguntas para entrevistas" items={d.perguntas_entrevista} />
      {d.pontos_a_verificar && d.pontos_a_verificar.length > 0 && (
        <div className="rounded-lg bg-warn-soft p-3 sm:col-span-2">
          <List title="Precisa ser verificado antes de publicar" items={d.pontos_a_verificar} />
        </div>
      )}
    </div>
  );
}
