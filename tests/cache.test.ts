import { describe, expect, it } from "vitest";
import { reviveDates } from "@/lib/cache";

describe("reviveDates (dados vindos do cache em JSON)", () => {
  it("reconverte campos de data em objetos aninhados e listas", () => {
    const fromCache = JSON.parse(
      JSON.stringify({
        lastSuccessAt: new Date("2026-10-08T12:00:00Z"),
        items: [{ published_at: new Date("2026-10-08T09:30:00.123Z"), collected_at: null, title: "2026-10-08T12:00:00Z" }],
      }),
    );
    const out = reviveDates(fromCache);
    expect(out.lastSuccessAt).toBeInstanceOf(Date);
    expect(out.items[0].published_at).toBeInstanceOf(Date);
    expect(out.items[0].published_at.getTime()).toBe(Date.parse("2026-10-08T09:30:00.123Z"));
    expect(out.items[0].collected_at).toBeNull();
    // campos que não são de data continuam texto, mesmo parecendo uma data
    expect(out.items[0].title).toBe("2026-10-08T12:00:00Z");
  });

  it("não altera valores simples", () => {
    expect(reviveDates(42)).toBe(42);
    expect(reviveDates(null)).toBeNull();
    expect(reviveDates(["a"])).toEqual(["a"]);
  });
});
