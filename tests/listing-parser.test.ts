import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseBrDate, parseListing } from "@/lib/collector/listing-parser";

// Fixtures: trechos reais das páginas de listagem (capturados em 01/10/2026).
const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("parseListing — Câmara Municipal de Imperatriz", () => {
  const items = parseListing(fixture("camara-noticias.html"), "https://www.camaraimperatriz.ma.gov.br/noticias", "/noticia/[a-z0-9-]+$");

  it("extrai título, link absoluto e data, sem duplicar o link da miniatura", () => {
    const mesa = items.find((i) => i.url.endsWith("/noticia/camara-elege-mesa-diretora-para-o-bienio-20272028"));
    expect(mesa).toBeDefined();
    expect(mesa!.title).toBe("Câmara elege Mesa Diretora para o biênio 2027/2028");
    expect(mesa!.publishedAt?.toISOString()).toBe("2026-10-01T15:00:00.000Z");
    expect(mesa!.datePrecision).toBe("date");
    expect(new Set(items.map((i) => i.url)).size).toBe(items.length);
  });

  it("não guarda texto das matérias", () => {
    expect(items.every((i) => i.excerpt === "")).toBe(true);
  });
});

describe("parseListing — Prefeitura de Imperatriz", () => {
  const items = parseListing(fixture("prefeitura-noticias.html"), "https://imperatriz.ma.gov.br/noticias/", "/noticias/[a-z0-9-]+\\.html$");

  it("usa o título do cabeçalho do card, sem a data e a seção", () => {
    const sedes = items.find((i) => i.url.endsWith("sedes-promove-acao-de-saude-bucal-para-criancas-assistidas-pelo-creas.html"));
    expect(sedes?.title).toBe("SEDES promove ação de saúde bucal para crianças assistidas pelo CREAS");
    expect(sedes?.url.startsWith("https://imperatriz.ma.gov.br/noticias/")).toBe(true);
    expect(sedes?.publishedAt).not.toBeNull();
  });

  it("encontra a lista completa da página", () => {
    expect(items.length).toBeGreaterThanOrEqual(10);
  });
});

describe("parseListing — segurança", () => {
  it("ignora links de outros domínios e fora do padrão", () => {
    const html = `
      <a href="https://outro.com/noticia/abc">Notícia de outro site qualquer</a>
      <a href="/contato">Fale conosco agora mesmo</a>
      <a href="/noticia/valida-123">Título válido de notícia</a> 05/09/2026`;
    const items = parseListing(html, "https://www.camaraimperatriz.ma.gov.br/noticias", "/noticia/[a-z0-9-]+$");
    expect(items.map((i) => i.url)).toEqual(["https://www.camaraimperatriz.ma.gov.br/noticia/valida-123"]);
  });

  it("prefere o título completo ao truncado", () => {
    const html = `<a href="/noticia/x-1">Câmara realiza...</a><a href="/noticia/x-1">Câmara realiza audiência pública sobre saúde</a>`;
    const [item] = parseListing(html, "https://site.gov.br/noticias", "/noticia/");
    expect(item.title).toBe("Câmara realiza audiência pública sobre saúde");
  });
});

describe("parseBrDate", () => {
  it("interpreta dd/mm/aaaa no fuso de Imperatriz", () => {
    expect(parseBrDate("em 30/09/2026")?.toISOString()).toBe("2026-09-30T15:00:00.000Z");
  });
  it("recusa datas impossíveis", () => {
    expect(parseBrDate("31/02/2026")).toBeNull();
  });
});
