import { normalize } from "./text";

export type CategoryKey =
  | "politica"
  | "seguranca"
  | "saude"
  | "educacao"
  | "infraestrutura"
  | "mobilidade"
  | "economia"
  | "cultura"
  | "esporte"
  | "meio_ambiente"
  | "servicos_publicos"
  | "oportunidades"
  | "tecnologia"
  | "justica"
  | "direitos_humanos"
  | "ciencia"
  | "internacional"
  | "geral";

interface CategoryDef {
  label: string;
  /**
   * Termos normalizados (sem acento), casados a partir do início de uma palavra.
   * "vacin" é radical (vacina, vacinação); "gol " com espaço final exige a palavra inteira.
   */
  keywords: string[];
  /** Temas com relevância pública direta (usado como critério explicável de destaque). */
  publicInterest: boolean;
}

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  politica: {
    label: "Política",
    keywords: ["eleic", "eleitor", "candidat", "prefeito", "prefeita ", "vereador", "deputad", "senador", "governador", "presidente lula", "congresso", "camara municipal", "partido", "ministro", "planalto", "votacao", "urna", "tse", "tre ma", "campanha eleitoral", "assembleia legislativa"],
    publicInterest: true,
  },
  seguranca: {
    label: "Segurança",
    keywords: ["policia", "pm ", "homicid", "assalt", "roubo", "furto", "preso", "prisao", "crime", "tiro", "baleado", "trafico", "delegacia", "violencia", "feminicid", "apreens", "operacao policial", "morto a tiros", "mortos a tiros"],
    publicInterest: true,
  },
  saude: {
    label: "Saúde",
    keywords: ["saude", "hospital", "vacina", "vacinac", "sus ", "ubs", "dengue", "covid", "medic", "doenca", "epidemi", "surto", "anvisa", "upa ", "atendimento medico", "leitos", "sarampo", "gripe"],
    publicInterest: true,
  },
  educacao: {
    label: "Educação",
    keywords: ["escola", "educac", "enem", "universidade", "ufma", "uemasul", "ifma", "professor", "aluno", "estudante", "matricula", "vestibular", "sisu", "fies", "prouni", "ensino ", "creche", "mec "],
    publicInterest: true,
  },
  infraestrutura: {
    label: "Infraestrutura",
    keywords: ["obras", "obra publica", "asfalt", "pavimenta", "ponte", "saneamento", "esgoto", "agua tratada", "falta de agua", "caema", "energia eletrica", "falta de energia", "equatorial", "drenagem", "buraco", "recapeamento", "iluminacao publica"],
    publicInterest: true,
  },
  mobilidade: {
    label: "Mobilidade urbana",
    keywords: ["transito", "onibus", "transporte publico", "mobilidade", "br 010", "rodovia", "acidente de transito", "semaforo", "ciclovia", "aeroporto", "detran", "interdic", "interdit"],
    publicInterest: true,
  },
  economia: {
    label: "Economia",
    keywords: ["economia", "inflacao", "ipca", "juros", "selic", "pib", "dolar", "emprego", "desemprego", "comercio", "imposto", "tribut", "salario minimo", "banco central", "mercado", "preco", "combustivel", "gasolina", "agronegocio", "exporta", "industria", "feira de negocios", "fecoimp", "empreendedor"],
    publicInterest: true,
  },
  cultura: {
    label: "Cultura",
    keywords: ["cultura", "cultural", "show ", "festival", "teatro", "cinema", "musica", "artista", "exposicao", "livro", "literatura", "sao joao", "bumba", "carnaval", "museu", "patrimonio"],
    publicInterest: false,
  },
  esporte: {
    label: "Esporte",
    keywords: ["futebol", "campeonato", "copa ", "jogo ", "gol ", "atleta", "esporte", "cavalo de aco", "sociedade imperatriz", "brasileirao", "olimp", "taekwondo", "torneio", "selecao"],
    publicInterest: false,
  },
  meio_ambiente: {
    label: "Meio ambiente",
    keywords: ["ambiental", "meio ambiente", "desmatamento", "queimada", "incendio florestal", "rio tocantins", "chuva", "seca ", "estiagem", "clima", "amazonia", "cerrado", "enchente", "poluic", "ibama", "fumaca", "temperatura"],
    publicInterest: true,
  },
  servicos_publicos: {
    label: "Serviços públicos",
    keywords: ["atendimento", "servico publico", "cadastro", "cadunico", "bolsa familia", "inss", "beneficio", "defesa civil", "coleta de lixo", "lixo", "documento", "rg ", "cras", "procon", "horario de funcionamento", "ponto facultativo", "feriado"],
    publicInterest: true,
  },
  oportunidades: {
    label: "Oportunidades",
    keywords: ["vagas", "concurso", "seletivo", "inscric", "edital", "curso gratuito", "bolsa de estudo", "capacitac", "estagio", "jovem aprendiz", "qualificac", "oportunidade"],
    publicInterest: true,
  },
  tecnologia: {
    label: "Tecnologia",
    keywords: ["tecnologia", "inteligencia artificial", "internet", "celular", "aplicativo", "app ", "big tech", "ciberat", "dados pessoais", "redes sociais", "5g", "startup"],
    publicInterest: false,
  },
  justica: {
    label: "Justiça",
    keywords: ["stf", "stj", "supremo", "tribunal", "justica", "juiz", "julgamento", "ministerio publico", "mpma", "mpf", "condena", "denuncia", "defensoria", "processo judicial", "habeas"],
    publicInterest: true,
  },
  direitos_humanos: {
    label: "Direitos humanos",
    keywords: ["direitos humanos", "racismo", "indigena", "quilombola", "lgbt", "trabalho escravo", "analogo a escravidao", "acessibilidade", "pessoa com deficiencia", "violencia contra a mulher", "crianca e adolescente", "refugiad"],
    publicInterest: true,
  },
  ciencia: {
    label: "Ciência",
    keywords: ["ciencia", "pesquisa", "cientista", "estudo aponta", "nasa", "foguete", "alcantara", "espacial", "descoberta", "fiocruz", "embrapa", "inpe"],
    publicInterest: false,
  },
  internacional: {
    label: "Internacional",
    keywords: ["eua ", "estados unidos", "trump", "china", "russia", "ucrania", "israel", "gaza", "argentina", "venezuela", "onu ", "europa", "guerra"],
    publicInterest: false,
  },
  geral: { label: "Acontecimentos gerais", keywords: [], publicInterest: false },
};

export const LOCAL_CATEGORIES: CategoryKey[] = [
  "politica", "seguranca", "saude", "educacao", "infraestrutura", "mobilidade", "economia",
  "cultura", "esporte", "meio_ambiente", "servicos_publicos", "oportunidades", "geral",
];

export const NATIONAL_CATEGORIES: CategoryKey[] = [
  "politica", "economia", "saude", "educacao", "seguranca", "meio_ambiente", "tecnologia",
  "justica", "direitos_humanos", "cultura", "esporte", "ciencia", "internacional", "geral",
];

export function isCategoryKey(v: unknown): v is CategoryKey {
  return typeof v === "string" && v in CATEGORIES;
}

export function categoryLabel(key: string): string {
  return isCategoryKey(key) ? CATEGORIES[key].label : key;
}

/**
 * Classificação por palavras-chave (determinística e explicável).
 * Título pesa 3x mais que o trecho; categorias informadas pela própria fonte (RSS) somam pontos.
 */
export function classify(title: string, excerpt: string, feedCategories: string[] = []): CategoryKey {
  const t = ` ${normalize(title)} `;
  const e = ` ${normalize(excerpt)} `;
  const fc = ` ${normalize(feedCategories.join(" "))} `;
  let best: CategoryKey = "geral";
  let bestScore = 0;
  for (const [key, def] of Object.entries(CATEGORIES) as [CategoryKey, CategoryDef][]) {
    let score = 0;
    for (const kw of def.keywords) {
      const needle = ` ${kw}`;
      if (t.includes(needle)) score += 3;
      if (e.includes(needle)) score += 1;
      if (fc.includes(needle)) score += 2;
    }
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

const IMPERATRIZ_TERMS = ["imperatriz", "regiao tocantina", "tocantina", "sudoeste maranhense", "acailandia", "davinopolis", "joao lisboa", "senador la rocque", "governador edison lobao", "ribamar fiquene", "estreito"];

export function mentionsImperatriz(text: string): boolean {
  const n = ` ${normalize(text)} `;
  return IMPERATRIZ_TERMS.some((term) => n.includes(` ${term} `));
}

/** Distingue notícia, opinião e análise a partir de sinais explícitos da fonte (URL, título, categoria). */
export function detectContentKind(url: string, title: string, feedCategories: string[] = []): "noticia" | "opiniao" | "analise" {
  const hay = normalize(`${url} ${title} ${feedCategories.join(" ")}`);
  if (/\b(opiniao|colunistas?|colunas?|editorial|artigo de opiniao|tendencias debates|ponto de vista)\b/.test(hay)) return "opiniao";
  if (/\b(analise|analysis)\b/.test(hay)) return "analise";
  return "noticia";
}

/** Título que relata declaração de alguém (fala ≠ fato verificado). */
export function hasStatement(title: string): boolean {
  const n = normalize(title);
  return /["“”]/.test(title) || /\b(diz|dizem|afirma|afirmam|declara|defende|critica|nega|acusa|promete|alega|avalia|aponta)\b/.test(n);
}

const UTILITY_TERMS = ["alerta", "interdic", "interdit", "falta de agua", "falta de energia", "desabastecimento", "vacinac", "prazo", "inscric", "ponto facultativo", "feriado", "mudanca no transito", "defesa civil", "aviso", "suspens", "horario", "campanha", "mutirao", "gratuito", "gratuita", "recadastramento"];

/** Indica potencial de utilidade pública (alertas, prazos, serviços). */
export function isUtilityAlert(title: string, excerpt: string | null): boolean {
  const n = ` ${normalize(`${title} ${excerpt ?? ""}`)} `;
  return UTILITY_TERMS.some((term) => n.includes(` ${term}`));
}

const EVENT_TERMS = ["festival", "show ", "feira", "exposicao", "evento", "programacao", "apresentacao", "espetaculo", "corrida", "maratona", "campeonato", "festa", "inauguracao", "audiencia publica", "sessao solene"];

export function isEvent(title: string, excerpt: string | null): boolean {
  const n = ` ${normalize(`${title} ${excerpt ?? ""}`)} `;
  return EVENT_TERMS.some((term) => n.includes(` ${term}`));
}

const DEVELOPING_TERMS = ["ao vivo", "atualizac", "minuto a minuto", "em andamento", "o que se sabe", "segue", "continua", "investigac"];

export function looksDeveloping(title: string): boolean {
  const n = normalize(title);
  return DEVELOPING_TERMS.some((t) => n.includes(t));
}
