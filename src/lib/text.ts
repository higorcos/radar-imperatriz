/** Utilitários de texto puros (sem dependências de servidor) — testados em text.test.ts. */

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Minúsculas, sem acentos, só letras/números/espaços. */
export function normalize(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/\b(segunda|terca|quarta|quinta|sexta)-feira/g, "$1feira") // evita "feira" solto
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  (
    "a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para pra com sem " +
    "e ou mas que se ao aos a as como mais menos muito ja nao sim sobre entre apos ate desde contra durante " +
    "seu sua seus suas ele ela eles elas isso isto esse essa este esta foi ser sao era tem ter vai vao diz " +
    "afirma apos ano anos dia dias hoje ontem amanha novo nova novos novas veja saiba entenda"
  ).split(" "),
);

/** Tokens significativos para comparar títulos. */
export function significantTokens(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(" ")
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

/** Similaridade de Jaccard entre dois conjuntos de tokens. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Remove HTML e normaliza espaços. Decodifica entidades duas vezes (feeds com HTML escapado). */
export function htmlToText(html: string): string {
  let s = decodeEntities(html);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Trecho curto da descrição original — nunca o texto integral da matéria.
 * Corta em limite de frase/palavra e marca com reticências.
 */
export function makeExcerpt(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : max)}…`;
}

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|cmpid|srsltid|xtor)$/i;

/** URL canônica para deduplicação: sem fragmento, sem parâmetros de rastreamento. */
export function canonicalUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return null;
  }
}

export function isHttpUrl(raw: string): boolean {
  return canonicalUrl(raw) !== null;
}
