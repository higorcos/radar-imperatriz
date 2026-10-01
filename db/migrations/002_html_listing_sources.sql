-- Coleta de páginas de listagem de notícias (sites institucionais sem RSS).
-- Lê só título, link e data da listagem; nunca o conteúdo das matérias.

alter table sources drop constraint if exists sources_method_check;
alter table sources add constraint sources_method_check check (method in ('rss','pagina_html','manual','sem_integracao'));

-- Padrão (expressão regular) que identifica links de notícia na página de listagem.
alter table sources add column if not exists link_pattern text;

-- 'date' quando a fonte informa só o dia (sem horário).
alter table articles add column if not exists published_precision text not null default 'datetime'
  check (published_precision in ('datetime','date'));

update sources set
  site_url = 'https://www.camaraimperatriz.ma.gov.br/',
  feed_url = 'https://www.camaraimperatriz.ma.gov.br/noticias',
  method = 'pagina_html',
  link_pattern = '/noticia/[a-z0-9-]+$',
  frequency_minutes = 120,
  notes = 'Sem RSS. Coleta da página de listagem de notícias (título, link e data). robots.txt permite acesso.'
where name = 'Câmara Municipal de Imperatriz';

update sources set
  site_url = 'https://imperatriz.ma.gov.br/',
  feed_url = 'https://imperatriz.ma.gov.br/noticias/',
  method = 'pagina_html',
  link_pattern = '/noticias/[a-z0-9-]+\.html$',
  frequency_minutes = 120,
  notes = 'Sem RSS. Coleta da página de listagem de notícias (título, link e data). O site informa só o dia da publicação.'
where name = 'Prefeitura de Imperatriz';
