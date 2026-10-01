import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { buildMaterial, resolveRefs } from "@/lib/ai/features";
import { formatMaterial } from "@/lib/ai/prompts";
import { ConnectionsSchema, ContentSchema, NationalDigestSchema, PautaListSchema, PopulationImpactSchema } from "@/lib/ai/schemas";

describe("referências da IA", () => {
  const m = buildMaterial([
    { id: "uuid-a", kind: "noticia", title: "A", source: "g1", date: null },
    { id: "uuid-b", kind: "noticia", title: "B", source: "Agência Brasil", date: null },
  ]);

  it("mapeia refs curtas para IDs reais", () => {
    expect(resolveRefs(["N1", " n2 "], m)).toEqual(["uuid-a", "uuid-b"]);
  });
  it("descarta referências inventadas", () => {
    expect(resolveRefs(["N9", "https://site-falso.com", "N1"], m)).toEqual(["uuid-a"]);
  });
  it("marca ocorrências não verificadas no material", () => {
    const text = formatMaterial([{ ref: "N1", kind: "ocorrencia", title: "Relato de alagamento", verified: false }]);
    expect(text).toContain("NÃO VERIFICADO");
    expect(text).toContain("Data: não informada");
  });
});

describe("schemas de saída estruturada", () => {
  it.each([
    ["pautas", PautaListSchema],
    ["conteúdo", ContentSchema],
    ["resumo nacional", NationalDigestSchema],
    ["conexões", ConnectionsSchema],
    ["impacto", PopulationImpactSchema],
  ])("%s converte para JSON Schema", (_name, schema) => {
    const format = betaZodOutputFormat(schema) as unknown as { type: string; schema: Record<string, unknown> };
    expect(format.type).toBe("json_schema");
    expect(format.schema).toHaveProperty("properties");
  });
});
