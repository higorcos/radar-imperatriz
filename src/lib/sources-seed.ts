/**
 * Fontes iniciais. Todos os feeds RSS abaixo foram testados em 01/10/2026.
 * Sites institucionais sem RSS podem usar "pagina_html": lemos só título, link e data da página de
 * listagem de notícias, nunca o conteúdo das matérias. Os demais ficam como "sem_integracao".
 */
export interface SourceSeed {
  name: string;
  site_url: string;
  feed_url: string | null;
  type: "jornalistica" | "institucional" | "documento_publico" | "relato_usuario" | "agregador";
  scope: "local" | "estadual" | "nacional";
  region: string;
  categories: string[];
  method: "rss" | "pagina_html" | "manual" | "sem_integracao";
  /** Só para "pagina_html": regex que identifica links de notícia na listagem. */
  link_pattern?: string;
  frequency_minutes: number;
  enabled: boolean;
  allow_images: boolean;
  notes: string | null;
}

export const SOURCE_SEEDS: SourceSeed[] = [
  // — Imperatriz / Maranhão —
  {
    name: "Imperatriz Notícias",
    site_url: "https://imperatriznoticias.com.br/",
    feed_url: "https://imperatriznoticias.com.br/feed/",
    type: "jornalistica", scope: "local", region: "Imperatriz (MA)", categories: [],
    method: "rss", frequency_minutes: 60, enabled: true, allow_images: false, notes: null,
  },
  {
    name: "g1 Maranhão",
    site_url: "https://g1.globo.com/ma/maranhao/",
    feed_url: "https://g1.globo.com/rss/g1/ma/",
    type: "jornalistica", scope: "estadual", region: "Maranhão", categories: [],
    method: "rss", frequency_minutes: 60, enabled: true, allow_images: false,
    notes: "Itens que mencionam Imperatriz ou a região Tocantina são marcados como locais.",
  },
  {
    name: "Imirante",
    site_url: "https://imirante.com/",
    feed_url: "https://imirante.com/rss/",
    type: "jornalistica", scope: "estadual", region: "Maranhão", categories: [],
    method: "rss", frequency_minutes: 60, enabled: true, allow_images: false,
    notes: "Feed volumoso; coletamos só os itens mais recentes de cada consulta.",
  },
  {
    name: "Google Notícias — busca \"Imperatriz Maranhão\"",
    site_url: "https://news.google.com/",
    feed_url: "https://news.google.com/rss/search?q=Imperatriz+Maranh%C3%A3o&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    type: "agregador", scope: "local", region: "Imperatriz (MA)", categories: [],
    method: "rss", frequency_minutes: 120, enabled: false, allow_images: false,
    notes: "Desativada por padrão: os termos do feed limitam o uso a leitores pessoais e não comerciais. Avalie antes de ativar.",
  },
  {
    name: "Prefeitura de Imperatriz",
    site_url: "https://imperatriz.ma.gov.br/",
    feed_url: "https://imperatriz.ma.gov.br/noticias/",
    type: "institucional", scope: "local", region: "Imperatriz (MA)", categories: ["servicos_publicos"],
    method: "pagina_html", link_pattern: "/noticias/[a-z0-9-]+\\.html$", frequency_minutes: 120, enabled: true, allow_images: false,
    notes: "Sem RSS. Coleta da página de listagem de notícias (título, link e data). O site informa só o dia da publicação.",
  },
  {
    name: "Câmara Municipal de Imperatriz",
    site_url: "https://www.camaraimperatriz.ma.gov.br/",
    feed_url: "https://www.camaraimperatriz.ma.gov.br/noticias",
    type: "institucional", scope: "local", region: "Imperatriz (MA)", categories: ["politica"],
    method: "pagina_html", link_pattern: "/noticia/[a-z0-9-]+$", frequency_minutes: 120, enabled: true, allow_images: false,
    notes: "Sem RSS. Coleta da página de listagem de notícias (título, link e data). robots.txt permite acesso.",
  },
  {
    name: "Governo do Maranhão",
    site_url: "https://www.ma.gov.br/",
    feed_url: null,
    type: "institucional", scope: "estadual", region: "Maranhão", categories: [],
    method: "sem_integracao", frequency_minutes: 1440, enabled: true, allow_images: false,
    notes: "Sem RSS público (teste em 01/10/2026). Consulta manual.",
  },
  // — Nacionais: agências públicas e institucionais —
  {
    name: "Agência Brasil",
    site_url: "https://agenciabrasil.ebc.com.br/",
    feed_url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "rss", frequency_minutes: 30, enabled: true, allow_images: true,
    notes: "Conteúdo sob licença Creative Commons BY (com crédito à Agência Brasil).",
  },
  {
    name: "Agência Senado",
    site_url: "https://www12.senado.leg.br/noticias",
    feed_url: "https://www12.senado.leg.br/noticias/feed/todasnoticias/RSS",
    type: "institucional", scope: "nacional", region: "Brasil", categories: ["politica"],
    method: "rss", frequency_minutes: 60, enabled: true, allow_images: true, notes: null,
  },
  {
    name: "Câmara dos Deputados",
    site_url: "https://www.camara.leg.br/noticias",
    feed_url: "https://www.camara.leg.br/noticias/rss/ultimas-noticias",
    type: "institucional", scope: "nacional", region: "Brasil", categories: ["politica"],
    method: "rss", frequency_minutes: 60, enabled: true, allow_images: true, notes: null,
  },
  {
    name: "Governo Federal (gov.br)",
    site_url: "https://www.gov.br/pt-br/noticias",
    feed_url: null,
    type: "institucional", scope: "nacional", region: "Brasil", categories: [],
    method: "sem_integracao", frequency_minutes: 1440, enabled: true, allow_images: false,
    notes: "O endereço de RSS testado retornou 404 (01/10/2026). Consulta manual.",
  },
  {
    name: "Defesa Civil Nacional",
    site_url: "https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil",
    feed_url: null,
    type: "institucional", scope: "nacional", region: "Brasil", categories: ["servicos_publicos"],
    method: "sem_integracao", frequency_minutes: 1440, enabled: true, allow_images: false,
    notes: "Sem RSS encontrado. Consulte alertas oficiais quando aplicável.",
  },
  // — Nacionais: veículos jornalísticos —
  {
    name: "g1",
    site_url: "https://g1.globo.com/",
    feed_url: "https://g1.globo.com/rss/g1/",
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "rss", frequency_minutes: 30, enabled: true, allow_images: false, notes: null,
  },
  {
    name: "BBC News Brasil",
    site_url: "https://www.bbc.com/portuguese",
    feed_url: "https://feeds.bbci.co.uk/portuguese/rss.xml",
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "rss", frequency_minutes: 60, enabled: true, allow_images: false, notes: null,
  },
  {
    name: "CNN Brasil",
    site_url: "https://www.cnnbrasil.com.br/",
    feed_url: "https://www.cnnbrasil.com.br/feed/",
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "rss", frequency_minutes: 30, enabled: true, allow_images: false, notes: null,
  },
  {
    name: "Folha de S.Paulo — Em cima da hora",
    site_url: "https://www1.folha.uol.com.br/",
    feed_url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "rss", frequency_minutes: 30, enabled: true, allow_images: false, notes: "Feed em ISO-8859-1.",
  },
  {
    name: "Estadão — Brasil",
    site_url: "https://www.estadao.com.br/",
    feed_url: "https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/brasil/",
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "rss", frequency_minutes: 60, enabled: true, allow_images: false, notes: null,
  },
  {
    name: "Poder360",
    site_url: "https://www.poder360.com.br/",
    feed_url: "https://www.poder360.com.br/feed/",
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "rss", frequency_minutes: 60, enabled: false, allow_images: false,
    notes: "Desativada: o feed recusa leitores automatizados (HTTP 403 em 01/10/2026). Respeitamos o bloqueio.",
  },
  {
    name: "UOL Notícias",
    site_url: "https://noticias.uol.com.br/",
    feed_url: null,
    type: "jornalistica", scope: "nacional", region: "Brasil", categories: [],
    method: "sem_integracao", frequency_minutes: 1440, enabled: true, allow_images: false,
    notes: "O RSS público testado não retornou itens (01/10/2026).",
  },
];
