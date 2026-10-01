// Sessão sem estado: cookie "expiração.assinatura" (HMAC-SHA256 com SESSION_SECRET).
// Usado pelo proxy (checagem otimista) e pelas páginas/ações (checagem definitiva).

export const SESSION_COOKIE = "radar_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

const encoder = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(sig).toString("base64url");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  return `${exp}.${await hmac(secret, `radar:${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig || exp * 1000 < now) return false;
  return constantTimeEqual(sig, await hmac(secret, `radar:${exp}`));
}
