import { describe, expect, it } from "vitest";
import { decodeBody, parseDate, parseFeed } from "@/lib/collector/feed-parser";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Teste</title>
<item>
  <title><![CDATA[ Prefeitura anuncia mutirão de vacinação ]]></title>
  <link>https://exemplo.com/noticia-1?utm_source=rss</link>
  <pubDate>Thu, 01 Oct 2026 13:07:00 GMT</pubDate>
  <category>Saúde</category>
  <description><![CDATA[<p>O mutirão acontece no sábado.</p>]]></description>
  <content:encoded><![CDATA[<p>TEXTO INTEGRAL QUE NÃO PODE SER ARMAZENADO</p>]]></content:encoded>
  <media:content url="https://exemplo.com/foto.jpg" medium="image" />
</item>
<item>
  <title>Item sem data</title>
  <link>https://exemplo.com/noticia-2</link>
</item>
<item>
  <title>Duplicado</title>
  <link>https://exemplo.com/noticia-1</link>
</item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title>
<entry><title type="html">Câmara aprova projeto</title>
<link rel="alternate" href="https://exemplo.org/a"/><updated>2026-09-30T10:00:00Z</updated>
<summary>Resumo do projeto.</summary></entry></feed>`;

describe("parseFeed", () => {
  it("normaliza itens RSS 2.0", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2); // duplicado removido
    expect(items[0]).toMatchObject({
      title: "Prefeitura anuncia mutirão de vacinação",
      url: "https://exemplo.com/noticia-1",
      excerpt: "O mutirão acontece no sábado.",
      categories: ["Saúde"],
      imageUrl: "https://exemplo.com/foto.jpg",
    });
    expect(items[0].publishedAt?.toISOString()).toBe("2026-10-01T13:07:00.000Z");
    expect(items[1].publishedAt).toBeNull();
  });

  it("não guarda o conteúdo integral (content:encoded)", () => {
    expect(JSON.stringify(parseFeed(RSS))).not.toContain("TEXTO INTEGRAL");
  });

  it("lê Atom", () => {
    const [item] = parseFeed(ATOM);
    expect(item.url).toBe("https://exemplo.org/a");
    expect(item.excerpt).toBe("Resumo do projeto.");
  });

  it("rejeita formato desconhecido", () => {
    expect(() => parseFeed("<html><body>oi</body></html>")).toThrow(/não reconhecido/);
  });
});

describe("decodeBody", () => {
  it("respeita ISO-8859-1 (ex.: Folha)", () => {
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?><rss><channel><item><title>Eleição</title></item></channel></rss>`;
    const bytes = Uint8Array.from(Buffer.from(xml, "latin1"));
    expect(decodeBody(bytes.buffer, "text/xml")).toContain("Eleição");
  });
});

describe("parseDate", () => {
  it("descarta datas muito no futuro", () => {
    expect(parseDate("Fri, 01 Jan 2100 00:00:00 GMT")).toBeNull();
  });
  it("descarta datas inválidas", () => {
    expect(parseDate("ontem à tarde")).toBeNull();
  });
});
