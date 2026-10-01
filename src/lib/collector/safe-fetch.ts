import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const USER_AGENT = "RadarImperatriz/0.1 (monitoramento jornalístico; leitor de RSS)";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/** Recusa URLs que não sejam http(s) públicas (proteção contra SSRF ao buscar feeds cadastrados). */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Somente URLs http(s) são aceitas");
  if (url.username || url.password) throw new Error("URL com credenciais não é aceita");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error("Endereço de rede interno não é permitido");
  }
  return url;
}

export interface FetchResult {
  status: number;
  notModified: boolean;
  body: ArrayBuffer | null;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
}

/** GET com timeout, limite de tamanho, redirecionamentos verificados e requisição condicional (ETag). */
export async function safeFetch(
  raw: string,
  opts: { etag?: string | null; lastModified?: string | null; timeoutMs?: number } = {},
): Promise<FetchResult> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
    };
    if (opts.etag) headers["If-None-Match"] = opts.etag;
    if (opts.lastModified) headers["If-Modified-Since"] = opts.lastModified;

    const res = await fetch(url, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      cache: "no-store",
    });

    if (res.status >= 300 && res.status < 400 && res.status !== 304) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`Redirecionamento ${res.status} sem destino`);
      current = new URL(location, url).toString();
      continue;
    }

    const base = {
      status: res.status,
      contentType: res.headers.get("content-type"),
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
    };
    if (res.status === 304) return { ...base, notModified: true, body: null };
    if (!res.ok) throw new Error(`A fonte respondeu HTTP ${res.status}`);

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) throw new Error("Resposta maior que o limite de 5 MB");
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) throw new Error("Resposta maior que o limite de 5 MB");
    return { ...base, notModified: false, body };
  }
  throw new Error("Redirecionamentos demais");
}
