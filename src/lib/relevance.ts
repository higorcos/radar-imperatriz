import { CATEGORIES, categoryLabel, isCategoryKey, looksDeveloping } from "./categories";
import { jaccard, significantTokens } from "./text";

/**
 * Organização "Mais relevantes do momento".
 * Não é uma avaliação jornalística: é uma ordenação automática por critérios explícitos,
 * e cada destaque mostra quais critérios atendeu. Popularidade/volume não entram.
 */
export interface RankableArticle {
  id: string;
  title: string;
  source_id: string;
  source_name: string;
  source_type: string;
  category: string;
  published_at: Date | null;
  collected_at: Date;
  mentions_imperatriz: boolean;
  content_kind: string;
}

export interface Cluster<T extends RankableArticle> {
  items: T[];
  sources: string[];
}

export interface RankedEntry<T extends RankableArticle> {
  lead: T;
  cluster: Cluster<T>;
  reasons: string[];
  developing: boolean;
}

export const articleTime = (a: Pick<RankableArticle, "published_at" | "collected_at">): Date => a.published_at ?? a.collected_at;

const SIMILARITY = 0.34;
const MIN_SHARED_TOKENS = 3;

function similar(a: Set<string>, b: Set<string>): boolean {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared >= MIN_SHARED_TOKENS && jaccard(a, b) >= SIMILARITY;
}

/** Agrupa matérias sobre o mesmo assunto (títulos semelhantes), preservando cada publicação. */
export function clusterArticles<T extends RankableArticle>(items: T[]): Cluster<T>[] {
  const sorted = [...items].sort((a, b) => articleTime(b).getTime() - articleTime(a).getTime());
  const clusters: { items: T[]; tokens: Set<string>[] }[] = [];
  for (const item of sorted) {
    const tokens = significantTokens(item.title);
    // Compara só com a matéria que abriu o grupo, evitando encadear assuntos diferentes.
    const target = clusters.find((c) => similar(c.tokens[0], tokens));
    if (target) {
      target.items.push(item);
      target.tokens.push(tokens);
    } else {
      clusters.push({ items: [item], tokens: [tokens] });
    }
  }
  return clusters.map((c) => ({
    items: c.items,
    sources: [...new Set(c.items.map((i) => i.source_name))],
  }));
}

const HOUR = 60 * 60 * 1000;

export function rankArticles<T extends RankableArticle>(items: T[], now = Date.now()): RankedEntry<T>[] {
  const entries = clusterArticles(items).map((cluster) => {
    const lead = cluster.items.find((i) => i.content_kind === "noticia") ?? cluster.items[0];
    const reasons: string[] = [];
    const distinctSources = cluster.sources.length;
    if (distinctSources >= 2) {
      reasons.push(`Noticiado por ${distinctSources} fontes diferentes`);
    }
    if (cluster.items.some((i) => i.source_type === "institucional")) {
      reasons.push("Inclui fonte institucional");
    }
    if (isCategoryKey(lead.category) && CATEGORIES[lead.category].publicInterest) {
      reasons.push(`Tema de interesse público: ${categoryLabel(lead.category)}`);
    }
    const age = now - articleTime(lead).getTime();
    if (age < 6 * HOUR) reasons.push("Publicado nas últimas 6 horas");
    if (cluster.items.some((i) => i.mentions_imperatriz)) reasons.push("Menciona Imperatriz ou a região Tocantina");

    const times = cluster.items.map((i) => articleTime(i).getTime());
    const span = Math.max(...times) - Math.min(...times);
    const developing = cluster.items.some((i) => looksDeveloping(i.title)) || (cluster.items.length >= 2 && span > 6 * HOUR);
    if (developing) reasons.push("Assunto com novas publicações ao longo do tempo");

    return { lead, cluster, reasons, developing, distinctSources, age };
  });

  return entries
    .filter((e) => e.lead.content_kind === "noticia")
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length ||
        b.distinctSources - a.distinctSources ||
        a.age - b.age,
    )
    .map(({ lead, cluster, reasons, developing }) => ({ lead, cluster, reasons, developing }));
}

/** Assuntos cobertos por várias fontes — base para "Brasil em foco" e "Assuntos ganhando destaque". */
export function multiSourceClusters<T extends RankableArticle>(items: T[], minSources = 2): Cluster<T>[] {
  return clusterArticles(items)
    .filter((c) => c.sources.length >= minSources)
    .sort((a, b) => b.sources.length - a.sources.length || b.items.length - a.items.length);
}
