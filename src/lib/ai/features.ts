import "server-only";
import { generateStructured } from "./client";
import {
  CONTENT_FORMATS,
  CONTENT_STYLES,
  formatMaterial,
  type ContentFormat,
  type ContentStyle,
  type MaterialItem,
} from "./prompts";
import {
  ConnectionsSchema,
  ContentSchema,
  NationalDigestSchema,
  PautaListSchema,
  PopulationImpactSchema,
  type ContentOutput,
  type PautaSuggestion,
} from "./schemas";

/** Material com mapeamento ref → id real (ex.: N1 → uuid da notícia). */
export interface Material {
  items: MaterialItem[];
  idsByRef: Map<string, string>;
}

export function buildMaterial(items: (Omit<MaterialItem, "ref"> & { id: string })[]): Material {
  const idsByRef = new Map<string, string>();
  const out = items.map(({ id, ...rest }, i) => {
    const ref = `N${i + 1}`;
    idsByRef.set(ref, id);
    return { ...rest, ref };
  });
  return { items: out, idsByRef };
}

/** Converte refs em IDs reais, descartando qualquer referência que não esteja no material. */
export function resolveRefs(refs: string[], m: Material): string[] {
  return [...new Set(refs.map((r) => m.idsByRef.get(r.trim().toUpperCase())).filter((x): x is string => Boolean(x)))];
}

export type ResolvedPauta = Omit<PautaSuggestion, "refs"> & { article_ids: string[] };

export async function suggestPautas(opts: {
  material: Material;
  theme?: string;
  idea?: string;
  angleOf?: { title: string; summary: string };
  avoidTitles: string[];
}): Promise<{ pautas: ResolvedPauta[]; model: string }> {
  const parts = [
    opts.material.items.length > 0 ? `MATERIAL:\n${formatMaterial(opts.material.items)}` : "MATERIAL: nenhum item selecionado.",
    opts.theme ? `TEMA DE INTERESSE: ${opts.theme}` : null,
    opts.idea ? `IDEIA ESCRITA PELA JORNALISTA: ${opts.idea}` : null,
    opts.angleOf
      ? `EXPLORAR OUTRO ÂNGULO: a pauta abaixo já existe. Proponha abordagens realmente diferentes (outro recorte, personagem, dado ou consequência), sem repetir o ângulo dela.\nPauta existente: ${opts.angleOf.title} — ${opts.angleOf.summary}`
      : null,
    opts.avoidTitles.length > 0
      ? `PAUTAS JÁ CADASTRADAS (não repita):\n${opts.avoidTitles.map((t) => `- ${t}`).join("\n")}`
      : null,
    `TAREFA: sugira de 3 a 4 pautas jornalísticas viáveis para uma estudante de Jornalismo em Imperatriz, relacionadas ao material/tema acima. Cada pauta deve incentivar apuração própria (fontes, dados, entrevistas) e ter relação clara com o assunto original. Se o material for insuficiente para alguma sugestão, deixe isso claro em pontos_a_verificar.`,
  ];
  const { data, model } = await generateStructured(PautaListSchema, parts.filter(Boolean).join("\n\n"));
  return {
    model,
    pautas: data.pautas.map(({ refs, ...p }) => ({ ...p, article_ids: resolveRefs(refs, opts.material) })),
  };
}

export async function generateContent(opts: {
  material: Material;
  brief: string;
  format: ContentFormat;
  style: ContentStyle;
}): Promise<{ content: ContentOutput; model: string }> {
  const prompt = [
    `MATERIAL:\n${opts.material.items.length > 0 ? formatMaterial(opts.material.items) : "nenhum item"}`,
    `ASSUNTO / PAUTA:\n${opts.brief}`,
    `FORMATO: ${CONTENT_FORMATS[opts.format]}`,
    `ESTILO: ${CONTENT_STYLES[opts.style]}`,
    `TAREFA: escreva um rascunho para Instagram neste formato e estilo. Use apenas informações do material e da pauta; onde faltar dado, deixe um marcador entre colchetes, como [confirmar horário com a prefeitura]. Cite a fonte original no texto quando usar informação de uma notícia. Liste em pontos_a_verificar tudo o que precisa ser confirmado antes de publicar. Hashtags: no máximo 6, sem # repetidas.`,
  ].join("\n\n");
  const { data, model } = await generateStructured(ContentSchema, prompt);
  return { content: data, model };
}

export async function nationalDigest(material: Material) {
  const prompt = [
    `MATERIAL (notícias nacionais coletadas nas últimas 24 horas):\n${formatMaterial(material.items)}`,
    `TAREFA: monte o resumo nacional do dia com as 5 a 7 manchetes mais relevantes para o público (critério: interesse público e impacto, não popularidade). Para cada manchete: título objetivo, explicação breve (2 frases), contexto essencial (1 a 2 frases, apenas com base no material) e as refs usadas — prefira manchetes sustentadas por mais de uma fonte. Depois, sugira 2 a 3 pautas relacionadas. Em limitacoes, registre lacunas do material.`,
  ].join("\n\n");
  const { data, model } = await generateStructured(NationalDigestSchema, prompt);
  return {
    model,
    content: {
      manchetes: data.manchetes.map(({ refs, ...m }) => ({ ...m, article_ids: resolveRefs(refs, material) })),
      sugestoes_pauta: data.sugestoes_pauta.map(({ refs, ...s }) => ({ ...s, article_ids: resolveRefs(refs, material) })),
      limitacoes: data.limitacoes,
    },
  };
}
export type ResolvedNationalDigest = Awaited<ReturnType<typeof nationalDigest>>["content"];

export async function imperatrizConnections(material: Material) {
  const prompt = [
    `MATERIAL (notícias nacionais recentes):\n${formatMaterial(material.items)}`,
    `TAREFA: identifique de 3 a 5 notícias nacionais que podem ter reflexos para moradores de Imperatriz e da região Tocantina (ex.: programas sociais, educação, saúde, economia regional, meio ambiente amazônico, infraestrutura como a BR-010). Para cada uma, escreva a conexão como HIPÓTESE de pauta, explique por que pode interessar, liste perguntas de apuração e fontes locais a consultar (órgãos, entidades, bases de dados). Não afirme que a decisão afeta Imperatriz — isso precisa ser verificado.`,
  ].join("\n\n");
  const { data, model } = await generateStructured(ConnectionsSchema, prompt);
  return {
    model,
    content: { conexoes: data.conexoes.map(({ refs, ...c }) => ({ ...c, article_ids: resolveRefs(refs, material) })) },
  };
}
export type ResolvedConnections = Awaited<ReturnType<typeof imperatrizConnections>>["content"];

export async function populationImpact(material: Material) {
  const prompt = [
    `MATERIAL (notícias locais e do Maranhão recentes):\n${formatMaterial(material.items)}`,
    `TAREFA: aponte de 3 a 5 assuntos do material com possível impacto no dia a dia dos moradores de Imperatriz (serviços públicos, infraestrutura de bairros, transporte, saúde, educação, oportunidades, eventos gratuitos). Para cada um: o assunto, o possível impacto (como hipótese), uma sugestão de investigação jornalística, perguntas de apuração e fontes a consultar. Se o material tiver poucos itens locais, diga isso no primeiro item.`,
  ].join("\n\n");
  const { data, model } = await generateStructured(PopulationImpactSchema, prompt);
  return {
    model,
    content: { itens: data.itens.map(({ refs, ...i }) => ({ ...i, article_ids: resolveRefs(refs, material) })) },
  };
}
export type ResolvedPopulationImpact = Awaited<ReturnType<typeof populationImpact>>["content"];
