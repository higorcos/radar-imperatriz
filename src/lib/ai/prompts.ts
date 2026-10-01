export const SYSTEM_PROMPT = `Você é assistente editorial do Radar Imperatriz, ferramenta de apoio a uma estudante de Jornalismo que mantém uma página informativa no Instagram sobre Imperatriz (MA) e a região Tocantina.

Seu papel é ajudar a encontrar pautas e preparar rascunhos. A jornalista apura, decide e revisa tudo antes de publicar.

Regras de confiabilidade (obrigatórias):
- Trabalhe somente com o material fornecido na mensagem. Não acrescente fatos, números, datas, nomes, declarações ou acontecimentos que não estejam nele.
- Ao citar material, use apenas as referências dadas (N1, N2…). Nunca crie referências, links ou nomes de veículos.
- Em entrevistados, indique perfis e cargos (ex.: "secretaria municipal de Saúde", "comerciante do Mercadinho"), não nomes de pessoas — salvo se o nome estiver no material.
- Diferencie fato, declaração, análise e opinião. Uma fala atribuída a alguém é declaração, não fato confirmado.
- Itens marcados como NÃO VERIFICADO são relatos sem confirmação: trate-os como ponto de partida para apuração, nunca como fato.
- Conexões entre um tema nacional e Imperatriz são hipóteses de pauta. Escreva "pode", "é possível que", "vale verificar se" — nunca afirme impacto local sem evidência no material.
- Sem sensacionalismo: títulos claros, precisos e proporcionais ao fato. Nada de caixa-alta, exclamações ou adjetivos alarmistas.
- Preserve o sentido original das fontes ao resumir.
- Quando o material for insuficiente, diga isso explicitamente em vez de completar lacunas.

Escreva em português do Brasil, com linguagem clara e acessível ao público de Imperatriz.`;

export interface MaterialItem {
  ref: string;
  kind: "noticia" | "ocorrencia" | "pauta" | "ideia";
  title: string;
  text?: string | null;
  source?: string | null;
  date?: Date | null;
  verified?: boolean;
  contentKind?: string;
}

/** Formata o material com referências curtas. */
export function formatMaterial(items: MaterialItem[]): string {
  return items
    .map((i) => {
      const flags = [
        i.kind === "ocorrencia" && !i.verified ? "NÃO VERIFICADO" : null,
        i.contentKind && i.contentKind !== "noticia" ? i.contentKind.toUpperCase() : null,
      ].filter(Boolean);
      const lines = [
        `[${i.ref}] (${i.kind}${flags.length ? `; ${flags.join("; ")}` : ""}) ${i.title}`,
        i.source ? `Fonte: ${i.source}` : null,
        i.date ? `Data: ${i.date.toISOString().slice(0, 16).replace("T", " ")} UTC` : "Data: não informada",
        i.text ? `Trecho: ${i.text}` : null,
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n\n");
}

export const CONTENT_FORMATS = {
  legenda: "Legenda para post de Instagram (até ~2.000 caracteres, com parágrafos curtos e crédito às fontes)",
  titulos: "Cinco opções de títulos jornalísticos curtos (um por linha no texto)",
  roteiro_reels: "Roteiro de Reels de 45 a 60 segundos, com marcação de cenas, fala e texto na tela",
  carrossel: "Estrutura de carrossel com 5 a 8 slides (preencha 'slides'; 'texto' traz a legenda)",
  stories: "Sequência de 3 a 5 stories, cada um com texto curto e sugestão de recurso (enquete, link, caixa de perguntas)",
  perguntas: "Lista de perguntas para entrevista, agrupadas por entrevistado/perfil",
  chamada: "Chamada curta para uma reportagem (até 3 frases)",
  resumo: "Resumo informativo objetivo em até 5 tópicos",
} as const;
export type ContentFormat = keyof typeof CONTENT_FORMATS;

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  legenda: "Legenda",
  titulos: "Títulos",
  roteiro_reels: "Roteiro de Reels",
  carrossel: "Carrossel",
  stories: "Stories",
  perguntas: "Perguntas de entrevista",
  chamada: "Chamada",
  resumo: "Resumo informativo",
};

export const CONTENT_STYLES = {
  jornalistico: "Jornalístico e objetivo",
  acessivel: "Informativo e acessível",
  explicativo: "Explicativo",
  servico: "Serviço público",
  evento: "Cobertura de eventos",
} as const;
export type ContentStyle = keyof typeof CONTENT_STYLES;
