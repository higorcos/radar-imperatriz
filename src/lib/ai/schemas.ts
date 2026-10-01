import { z } from "zod";

// Schemas das saídas estruturadas da IA. As referências ("refs") apontam apenas para itens
// do material enviado (N1, N2…); referências desconhecidas são descartadas no servidor.

export const PautaSuggestionSchema = z.object({
  titulo_provisorio: z.string(),
  resumo: z.string(),
  justificativa: z.string(),
  interesse_publico: z.string(),
  pergunta_central: z.string(),
  entrevistados: z.array(z.string()).describe("Perfis ou cargos a ouvir — não invente nomes de pessoas"),
  fontes_consultar: z.array(z.string()).describe("Órgãos, bases de dados e documentos a consultar"),
  perguntas_entrevista: z.array(z.string()),
  dados_levantar: z.array(z.string()),
  abordagem: z.string(),
  formato: z.string().describe("Formato de publicação recomendado (ex.: carrossel, Reels, reportagem)"),
  pontos_a_verificar: z.array(z.string()).describe("O que ainda precisa ser confirmado antes de publicar"),
  refs: z.array(z.string()).describe("Referências do material usadas (ex.: N1)"),
});
export type PautaSuggestion = z.infer<typeof PautaSuggestionSchema>;

export const PautaListSchema = z.object({ pautas: z.array(PautaSuggestionSchema) });

/** Campos guardados em pautas.details. */
export type PautaDetails = Omit<PautaSuggestion, "titulo_provisorio" | "resumo" | "refs">;

export const ContentSchema = z.object({
  titulo: z.string(),
  texto: z.string().describe("Texto principal pronto para revisão (legenda, roteiro, stories etc.)"),
  slides: z.array(z.object({ titulo: z.string(), texto: z.string() })).describe("Somente para carrossel; vazio nos demais formatos"),
  hashtags: z.array(z.string()),
  pontos_a_verificar: z.array(z.string()),
});
export type ContentOutput = z.infer<typeof ContentSchema>;

export const NationalDigestSchema = z.object({
  manchetes: z.array(
    z.object({
      titulo: z.string(),
      explicacao: z.string(),
      contexto: z.string(),
      refs: z.array(z.string()),
    }),
  ),
  sugestoes_pauta: z.array(z.object({ titulo: z.string(), ideia: z.string(), refs: z.array(z.string()) })),
  limitacoes: z.string().describe("Lacunas do material (ex.: poucas fontes sobre um tema)"),
});
export type NationalDigest = z.infer<typeof NationalDigestSchema>;

export const ConnectionsSchema = z.object({
  conexoes: z.array(
    z.object({
      hipotese: z.string(),
      por_que_pode_interessar: z.string(),
      perguntas_apuracao: z.array(z.string()),
      fontes_consultar: z.array(z.string()),
      refs: z.array(z.string()),
    }),
  ),
});
export type Connections = z.infer<typeof ConnectionsSchema>;

export const PopulationImpactSchema = z.object({
  itens: z.array(
    z.object({
      assunto: z.string(),
      possivel_impacto: z.string(),
      sugestao_investigacao: z.string(),
      perguntas_apuracao: z.array(z.string()),
      fontes_consultar: z.array(z.string()),
      refs: z.array(z.string()),
    }),
  ),
});
export type PopulationImpact = z.infer<typeof PopulationImpactSchema>;
