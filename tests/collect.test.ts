import { describe, expect, it } from "vitest";
import { scopeFor } from "@/lib/collector/collect";

describe("scopeFor", () => {
  it("rebaixa para nacional as seções nacionais de portais estaduais", () => {
    expect(scopeFor("estadual", "https://imirante.com/noticias/brasil/2026/10/01/x")).toBe("nacional");
    expect(scopeFor("estadual", "https://imirante.com/noticias/imperatriz/2026/10/01/x")).toBe("estadual");
    expect(scopeFor("nacional", "https://g1.globo.com/brasil/x")).toBe("nacional");
  });
});
