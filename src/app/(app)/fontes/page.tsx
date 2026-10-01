import type { Metadata } from "next";
import { ExternalLink, History, Play, Plus, Power, Rss, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Badge, Card, Notice, PageHeader, SectionHeader } from "@/components/ui";
import { CATEGORIES, categoryLabel, type CategoryKey } from "@/lib/categories";
import { formatDateTime, relativeTime } from "@/lib/format";
import { listSources, recentRuns, type SourceHealth } from "@/lib/repo/sources";
import { deleteSourceAction, testSourceAction, toggleSourceAction } from "./actions";
import { SourceForm } from "./source-form";

export const metadata: Metadata = { title: "Fontes de Informação" };
export const maxDuration = 60;

const HEALTH: Record<SourceHealth, { label: string; tone: "ok" | "warn" | "danger" | "neutral" | "accent" }> = {
  ok: { label: "Funcionando", tone: "ok" },
  instavel: { label: "Falhou na última consulta", tone: "warn" },
  falhando: { label: "Falhando", tone: "danger" },
  desatualizada: { label: "Parou de atualizar", tone: "warn" },
  nunca_consultada: { label: "Ainda não consultada", tone: "neutral" },
  sem_integracao: { label: "Sem integração automática", tone: "neutral" },
  desativada: { label: "Desativada", tone: "neutral" },
};
const TYPE_LABEL: Record<string, string> = {
  jornalistica: "Jornalística",
  institucional: "Institucional",
  documento_publico: "Documento público",
  relato_usuario: "Relato de usuário",
  agregador: "Agregador",
};
const METHOD_LABEL: Record<string, string> = { rss: "RSS automático", manual: "Consulta manual", sem_integracao: "Sem integração" };
const SCOPE_LABEL: Record<string, string> = { local: "Imperatriz", estadual: "Maranhão", nacional: "Nacional" };

export default async function FontesPage() {
  const [sources, runs] = await Promise.all([listSources(), recentRuns(25)]);
  const problems = sources.filter((s) => ["falhando", "instavel", "desatualizada"].includes(s.health));
  const categories: [string, string][] = (Object.keys(CATEGORIES) as CategoryKey[]).filter((k) => k !== "geral").map((k) => [k, CATEGORIES[k].label]);

  return (
    <>
      <PageHeader title="Fontes de Informação" description="Fontes monitoradas, como são coletadas e se estão funcionando. A coleta usa apenas RSS público — sem raspagem de páginas e sem contornar bloqueios." />
      {problems.length > 0 && (
        <Notice tone="warn" title={`${problems.length} fonte(s) precisam de atenção`} className="mb-6">
          {problems.map((p) => `${p.name} (${HEALTH[p.health].label.toLowerCase()})`).join(" · ")}
        </Notice>
      )}

      <details className="mb-6 rounded-xl border border-border bg-surface p-4">
        <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-accent"><Plus className="size-4" aria-hidden /> Cadastrar nova fonte</summary>
        <div className="mt-4"><SourceForm categories={categories} /></div>
      </details>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Fonte</th>
              <th scope="col" className="px-3 py-2 font-medium">Tipo / cobertura</th>
              <th scope="col" className="px-3 py-2 font-medium">Coleta</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 font-medium">Última consulta</th>
              <th scope="col" className="px-3 py-2 font-medium">Notícias</th>
              <th scope="col" className="px-3 py-2 font-medium"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sources.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="px-3 py-3">
                  <a href={s.site_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-accent">
                    {s.name} <ExternalLink className="size-3" aria-hidden />
                  </a>
                  {s.feed_url && <p className="max-w-xs truncate text-xs text-muted" title={s.feed_url}><Rss className="mr-1 inline size-3" aria-hidden />{s.feed_url}</p>}
                  {s.categories.length > 0 && <p className="text-xs text-muted">{s.categories.map(categoryLabel).join(", ")}</p>}
                  {s.notes && <p className="mt-1 max-w-xs text-xs text-muted">{s.notes}</p>}
                </td>
                <td className="px-3 py-3 text-xs">
                  <Badge tone={s.type === "institucional" ? "accent" : s.type === "relato_usuario" ? "warn" : "neutral"}>{TYPE_LABEL[s.type] ?? s.type}</Badge>
                  <p className="mt-1 text-muted">{SCOPE_LABEL[s.scope]} · {s.region}</p>
                </td>
                <td className="px-3 py-3 text-xs text-muted">
                  {METHOD_LABEL[s.method]}
                  {s.method === "rss" && <p>a cada {s.frequency_minutes} min</p>}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={HEALTH[s.health].tone}>{HEALTH[s.health].label}</Badge>
                  {s.last_error && <p className="mt-1 max-w-[200px] text-xs text-danger">{s.last_error}</p>}
                </td>
                <td className="px-3 py-3 text-xs text-muted">
                  {s.last_checked_at ? <span title={formatDateTime(s.last_checked_at)}>{relativeTime(s.last_checked_at)}</span> : "—"}
                  {s.last_success_at && <p>Sucesso: {relativeTime(s.last_success_at)}</p>}
                </td>
                <td className="px-3 py-3 text-xs text-muted">
                  {s.article_count}
                  {s.latest_article_at && <p>mais recente {relativeTime(s.latest_article_at)}</p>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    {s.method === "rss" && s.feed_url && (
                      <ActionButton action={testSourceAction.bind(null, s.id)} label="Testar" pendingLabel="Consultando…" icon={<Play className="size-4" aria-hidden />} variant="ghost" size="sm" />
                    )}
                    <ActionButton action={toggleSourceAction.bind(null, s.id)} label={s.enabled ? "Desativar" : "Ativar"} icon={<Power className="size-4" aria-hidden />} variant="ghost" size="sm" />
                    <ActionButton action={deleteSourceAction.bind(null, s.id)} label="" pendingLabel="" icon={<Trash2 className="size-4" aria-label="Excluir fonte" />} variant="ghost" size="sm" confirm={`Excluir "${s.name}" e todas as notícias coletadas dela?`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <SectionHeader icon={History} title="Registro das últimas coletas" description="Cada consulta fica registrada, com erros, para identificar falhas." />
        <Card>
          <ul className="divide-y divide-border text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                <Badge tone={r.status === "erro" ? "danger" : r.status === "ok" ? "ok" : "neutral"}>{r.status === "nao_modificado" ? "sem alterações" : r.status}</Badge>
                <span className="font-medium">{r.source_name}</span>
                <span className="text-xs text-muted">{formatDateTime(r.started_at)}</span>
                <span className="text-xs text-muted">{r.status === "erro" ? r.error : `${r.items_found} lidos · ${r.items_new} novos`}</span>
              </li>
            ))}
            {runs.length === 0 && <li className="px-4 py-3 text-muted">Nenhuma coleta registrada.</li>}
          </ul>
        </Card>
      </section>
    </>
  );
}
