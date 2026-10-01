import { describe, expect, it } from "vitest";
import { canonicalUrl, htmlToText, jaccard, makeExcerpt, normalize, significantTokens } from "@/lib/text";

describe("normalize", () => {
  it("remove acentos e pontuação", () => {
    expect(normalize("Vacinação em Imperatriz: começa HOJE!")).toBe("vacinacao em imperatriz comeca hoje");
  });
  it("junta dias da semana para não casar 'feira'", () => {
    expect(normalize("Na sexta-feira")).toBe("na sextafeira");
  });
});

describe("htmlToText", () => {
  it("decodifica HTML escapado duas vezes", () => {
    expect(htmlToText("&lt;p&gt;Olá &amp;amp; até&lt;/p&gt;")).toBe("Olá & até");
  });
  it("remove scripts", () => {
    expect(htmlToText("<p>a</p><script>alert(1)</script><b>b</b>")).toBe("a b");
  });
});

describe("makeExcerpt", () => {
  it("não altera textos curtos", () => {
    expect(makeExcerpt("Curto.")).toBe("Curto.");
  });
  it("corta textos longos (nunca guarda a matéria integral)", () => {
    const long = "Primeira frase do texto que é bem comprida. ".repeat(30);
    const ex = makeExcerpt(long, 280);
    expect(ex.length).toBeLessThanOrEqual(281);
    expect(ex.length).toBeGreaterThan(100);
  });
});

describe("canonicalUrl", () => {
  it("remove rastreamento e fragmento", () => {
    expect(canonicalUrl("https://Site.com/a?utm_source=x&id=2#top")).toBe("https://site.com/a?id=2");
  });
  it("recusa protocolos não http", () => {
    expect(canonicalUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalUrl("ftp://x.com/a")).toBeNull();
  });
});

describe("jaccard", () => {
  it("mede semelhança de títulos", () => {
    const a = significantTokens("Câmara aprova reforma tributária em segundo turno");
    const b = significantTokens("Reforma tributária é aprovada pela Câmara em segundo turno");
    expect(jaccard(a, b)).toBeGreaterThan(0.4);
  });
});
