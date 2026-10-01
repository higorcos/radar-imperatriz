import { describe, expect, it } from "vitest";
import { classify, detectContentKind, hasStatement, isEvent, isUtilityAlert, mentionsImperatriz } from "@/lib/categories";

describe("classify", () => {
  it.each([
    ["Campanha de vacinação contra a gripe começa nas UBS de Imperatriz", "saude"],
    ["Inscrições para concurso da prefeitura terminam nesta sexta", "oportunidades"],
    ["Polícia prende suspeito de assalto no centro", "seguranca"],
    ["Cavalo de Aço vence no Frei Epifânio e segue na Série D", "esporte"],
    ["STF julga recurso sobre condenação", "justica"],
  ])("%s → %s", (title, expected) => {
    expect(classify(title, "")).toBe(expected);
  });

  it("não confunde 'golpe' com futebol nem 'suspeito' com SUS", () => {
    expect(classify("Suspeito de golpe é preso", "")).toBe("seguranca");
  });
  it("não trata 'sexta-feira' como feira", () => {
    expect(isEvent("Reunião acontece na sexta-feira", null)).toBe(false);
  });
  it("usa 'geral' quando não há sinais", () => {
    expect(classify("Uma notícia qualquer", "")).toBe("geral");
  });
});

describe("sinais editoriais", () => {
  it("detecta Imperatriz e região", () => {
    expect(mentionsImperatriz("IMPERATRIZ - produtos vencidos apreendidos")).toBe(true);
    expect(mentionsImperatriz("Obras em Açailândia")).toBe(true);
    expect(mentionsImperatriz("São Luís recebe evento")).toBe(false);
  });
  it("separa opinião de notícia", () => {
    expect(detectContentKind("https://www1.folha.uol.com.br/colunas/fulano/2026/x.shtml", "Título")).toBe("opiniao");
    expect(detectContentKind("https://g1.globo.com/ma/noticia/x.ghtml", "Título")).toBe("noticia");
  });
  it("marca declarações", () => {
    expect(hasStatement("Ministro diz que vai rever programa")).toBe(true);
    expect(hasStatement("Ponte é interditada")).toBe(false);
  });
  it("identifica utilidade pública", () => {
    expect(isUtilityAlert("Avenida será interditada para obras", null)).toBe(true);
  });
});
