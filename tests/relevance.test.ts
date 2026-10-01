import { describe, expect, it } from "vitest";
import { clusterArticles, multiSourceClusters, rankArticles, type RankableArticle } from "@/lib/relevance";

const NOW = Date.parse("2026-10-01T15:00:00Z");
let n = 0;
function art(title: string, source: string, hoursAgo: number, extra: Partial<RankableArticle> = {}): RankableArticle {
  n++;
  return {
    id: `id-${n}`,
    title,
    source_id: source,
    source_name: source,
    source_type: "jornalistica",
    category: "geral",
    published_at: new Date(NOW - hoursAgo * 3_600_000),
    collected_at: new Date(NOW),
    mentions_imperatriz: false,
    content_kind: "noticia",
    ...extra,
  };
}

describe("clusterArticles", () => {
  it("agrupa o mesmo assunto de fontes diferentes", () => {
    const items = [
      art("Câmara aprova reforma tributária em segundo turno", "g1", 2),
      art("Reforma tributária é aprovada pela Câmara em segundo turno", "Agência Brasil", 3),
      art("Festival de cinema começa em Imperatriz", "Imirante", 1),
    ];
    const clusters = clusterArticles(items);
    expect(clusters).toHaveLength(2);
    expect(multiSourceClusters(items)[0].sources.sort()).toEqual(["Agência Brasil", "g1"]);
  });
});

describe("rankArticles", () => {
  it("explica os critérios e prioriza cobertura múltipla e interesse público", () => {
    const items = [
      art("Curiosidade sobre celebridade", "Portal", 1),
      art("Ministério anuncia mudança no programa de vacinação infantil", "g1", 4, { category: "saude" }),
      art("Mudança no programa de vacinação infantil é anunciada pelo Ministério", "Agência Brasil", 5, { category: "saude", source_type: "institucional" }),
    ];
    const ranked = rankArticles(items, NOW);
    expect(ranked[0].lead.category).toBe("saude");
    expect(ranked[0].reasons).toContain("Noticiado por 2 fontes diferentes");
    expect(ranked[0].reasons).toContain("Inclui fonte institucional");
    expect(ranked[0].reasons.some((r) => r.startsWith("Tema de interesse público"))).toBe(true);
  });

  it("não coloca opinião entre os destaques", () => {
    const ranked = rankArticles([art("Coluna: o que penso da reforma tributária", "Folha", 1, { content_kind: "opiniao", category: "economia" })], NOW);
    expect(ranked).toHaveLength(0);
  });
});
