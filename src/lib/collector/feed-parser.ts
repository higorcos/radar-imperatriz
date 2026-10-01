import { XMLParser } from "fast-xml-parser";
import { canonicalUrl, htmlToText, makeExcerpt } from "../text";

/** Item normalizado de um feed RSS 2.0, RSS 0.91/1.0 ou Atom. */
export interface FeedItem {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: Date | null;
  categories: string[];
  imageUrl: string | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  parseTagValue: false,
  isArray: (name) => ["item", "entry", "category", "link", "media:content", "media:thumbnail", "enclosure"].includes(name),
});

type Node = unknown;

/** Extrai texto de nós que podem ser string, número ou objeto com #text. */
function text(node: Node): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>)) {
    return text((node as Record<string, unknown>)["#text"]);
  }
  return "";
}

function attr(node: Node, name: string): string | undefined {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    const v = (node as Record<string, unknown>)[`@_${name}`];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

function asArray(node: Node): Node[] {
  if (node == null) return [];
  return Array.isArray(node) ? node : [node];
}

const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

export function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  // Datas muito no futuro indicam erro da fonte; preferimos "não informada" a exibir data falsa.
  if (d.getTime() - Date.now() > MAX_FUTURE_MS) return null;
  return d;
}

function firstImgSrc(html: string): string | null {
  const decoded = html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(decoded))) {
    const src = m[1];
    // ignora pixels de rastreamento e logotipos
    if (/\.(gif)(\?|$)|pixel|logo|\.svg(\?|$)|ebc\.png/i.test(src)) continue;
    return src;
  }
  return null;
}

function pickImage(item: Record<string, Node>, htmlFields: string[]): string | null {
  for (const key of ["media:content", "media:thumbnail"]) {
    for (const n of asArray(item[key])) {
      const url = attr(n, "url");
      const medium = attr(n, "medium");
      const type = attr(n, "type");
      if (url && (!medium || medium === "image") && (!type || type.startsWith("image"))) return url;
    }
  }
  for (const n of asArray(item.enclosure)) {
    const url = attr(n, "url");
    if (url && (attr(n, "type") ?? "").startsWith("image")) return url;
  }
  const destaque = text(item["imagem-destaque"]);
  if (destaque) return destaque;
  for (const html of htmlFields) {
    const src = firstImgSrc(html);
    if (src) return src;
  }
  return null;
}

function atomLink(links: Node): string {
  const arr = asArray(links);
  const alternate = arr.find((l) => !attr(l, "rel") || attr(l, "rel") === "alternate");
  return attr(alternate ?? arr[0], "href") ?? text(arr[0]);
}

/**
 * Converte o XML do feed em itens normalizados.
 * Guarda apenas título, link, metadados e um trecho curto da descrição — nunca o conteúdo integral.
 */
export function parseFeed(xml: string, maxItems = 60): FeedItem[] {
  const doc = parser.parse(xml) as Record<string, Record<string, Node>>;
  let rawItems: Node[] = [];
  let isAtom = false;
  if (doc.rss) {
    rawItems = asArray((doc.rss.channel as Record<string, Node>)?.item);
  } else if (doc["rdf:RDF"]) {
    rawItems = asArray(doc["rdf:RDF"].item);
  } else if (doc.feed) {
    rawItems = asArray(doc.feed.entry);
    isAtom = true;
  } else {
    throw new Error("Formato de feed não reconhecido (esperado RSS ou Atom)");
  }

  const out: FeedItem[] = [];
  const seen = new Set<string>();
  for (const raw of rawItems) {
    if (out.length >= maxItems) break;
    const item = raw as Record<string, Node>;
    const title = htmlToText(text(item.title));
    const link = isAtom ? atomLink(item.link) : text(item.link) || (attr(item.guid, "isPermaLink") !== "false" ? text(item.guid) : "");
    const url = canonicalUrl(link);
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);

    const descriptionHtml = text(item.description) || text(item.summary);
    const subtitle = text(item["atom:subtitle"]);
    const contentHtml = text(item["content:encoded"]) || text(item.content);
    const summarySource = subtitle || htmlToText(descriptionHtml) || htmlToText(contentHtml);
    // Alguns feeds repetem o título no começo da descrição.
    const summary = summarySource.startsWith(title) ? summarySource.slice(title.length).trim() : summarySource;

    const dateRaw = text(item.pubDate) || text(item["dc:date"]) || text(item.published) || text(item.updated);
    const categories = asArray(item.category)
      .map((c) => text(c) || attr(c, "term") || "")
      .filter(Boolean);

    out.push({
      title,
      url,
      excerpt: makeExcerpt(summary),
      publishedAt: parseDate(dateRaw),
      categories,
      imageUrl: pickImage(item, [descriptionHtml, contentHtml]),
    });
  }
  return out;
}

/** Decodifica o corpo respeitando o charset (header HTTP ou declaração XML), ex.: ISO-8859-1 da Folha. */
export function decodeBody(bytes: ArrayBuffer, contentType: string | null): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType ?? "")?.[1];
  const head = new TextDecoder("ascii").decode(bytes.slice(0, 200));
  const fromProlog = /encoding=["']([\w-]+)["']/i.exec(head)?.[1];
  const charset = (fromHeader ?? fromProlog ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}
