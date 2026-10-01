import type { FeedItem } from "./feed-parser";
import { canonicalUrl, htmlToText } from "../text";

/**
 * Extrai notícias de uma página de listagem HTML (sites institucionais sem RSS).
 * Usa só o que a listagem mostra: link, título e data (dd/mm/aaaa). Não abre as matérias.
 * Aceita apenas links do mesmo domínio da listagem que casem com `linkPattern`.
 */
export function parseListing(html: string, pageUrl: string, linkPattern: string, maxItems = 40): FeedItem[] {
  const base = new URL(pageUrl);
  const pattern = new RegExp(linkPattern, "i");
  const anchors = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  const byUrl = new Map<string, { title: string; date: Date | null; order: number }>();
  let order = 0;
  for (let m = anchors.exec(html); m; m = anchors.exec(html)) {
    const href = m[1];
    if (href.length > 2000) continue;
    let abs: URL;
    try {
      abs = new URL(href, base);
    } catch {
      continue;
    }
    if (abs.hostname !== base.hostname || !pattern.test(abs.pathname)) continue;
    const url = canonicalUrl(abs.toString());
    if (!url) continue;

    const inner = m[2];
    // Título: cabeçalho dentro do link (h1–h6) ou o texto do próprio link.
    const heading = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
    const headings = [...inner.matchAll(heading)].map((h) => htmlToText(h[1])).filter(Boolean);
    const title = (headings.at(-1) ?? htmlToText(inner)).trim();

    // Data: dentro do link ou logo depois dele (mesmo bloco da listagem).
    const after = html.slice(m.index, m.index + m[0].length + 400);
    const date = parseBrDate(after);

    const prev = byUrl.get(url);
    if (!prev) byUrl.set(url, { title, date, order: order++ });
    else {
      // O mesmo link pode aparecer em blocos laterais com título truncado ("Câmara realiza…").
      if (betterTitle(title, prev.title)) prev.title = title;
      if (!prev.date && date) prev.date = date;
    }
  }

  return [...byUrl.entries()]
    .filter(([, v]) => v.title.length >= 8)
    .sort((a, b) => a[1].order - b[1].order)
    .slice(0, maxItems)
    .map(([url, v]) => ({
      title: v.title,
      url,
      excerpt: "",
      publishedAt: v.date,
      datePrecision: "date" as const,
      categories: [],
      imageUrl: null,
    }));
}

const isTruncated = (t: string) => /(\.\.\.|…)$/.test(t);

function betterTitle(candidate: string, current: string): boolean {
  if (!candidate) return false;
  if (!current) return true;
  if (isTruncated(current) !== isTruncated(candidate)) return isTruncated(current);
  return candidate.length > current.length;
}

/** Primeira data dd/mm/aaaa do trecho, interpretada como meio-dia em Imperatriz (UTC-3). */
export function parseBrDate(text: string): Date | null {
  const m = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(text);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(`${y}-${mo}-${d}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(d)) return null;
  return date;
}
