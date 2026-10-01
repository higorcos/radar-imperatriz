import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "@/lib/session";

const SECRET = "a".repeat(40);

describe("sessão", () => {
  it("aceita token válido", async () => {
    expect(await verifySessionToken(await createSessionToken(SECRET), SECRET)).toBe(true);
  });
  it("recusa assinatura adulterada ou outro segredo", async () => {
    const t = await createSessionToken(SECRET);
    expect(await verifySessionToken(t.slice(0, -2) + "xx", SECRET)).toBe(false);
    expect(await verifySessionToken(t, "b".repeat(40))).toBe(false);
  });
  it("recusa token expirado", async () => {
    const past = Date.now() - (SESSION_TTL_SECONDS + 60) * 1000;
    expect(await verifySessionToken(await createSessionToken(SECRET, past), SECRET)).toBe(false);
  });
  it("recusa ausência de token ou segredo", async () => {
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken("123.abc", undefined)).toBe(false);
  });
});
