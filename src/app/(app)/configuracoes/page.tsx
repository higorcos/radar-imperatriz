import type { Metadata } from "next";
import { Bot, Clock, Database, LogOut, Palette, Scale, ShieldCheck } from "lucide-react";
import { Badge, Card, SectionHeader, PageHeader, buttonClass } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { relativeTime } from "@/lib/format";
import { collectionStatus } from "@/lib/repo/sources";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = { title: "Configurações" };

async function dbStatus() {
  try {
    const sql = db();
    const [r] = await sql<{ articles: number; sources: number }[]>`
      select (select count(*) from articles)::int as articles, (select count(*) from sources)::int as sources
    `;
    return { ok: true as const, ...r };
  } catch {
    return { ok: false as const };
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2.5 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export default async function ConfiguracoesPage() {
  const e = env();
  const [database, collection] = await Promise.all([dbStatus(), collectionStatus()]);
  return (
    <>
      <PageHeader title="Configurações" description="Situação real das integrações. Chaves e senhas ficam apenas em variáveis de ambiente no servidor — nunca nesta tela." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeader icon={Database} title="Banco de dados" />
          <Row label="Conexão">{database.ok ? <Badge tone="ok">Conectado</Badge> : <Badge tone="danger">Falha na conexão</Badge>}</Row>
          {database.ok && (
            <>
              <Row label="Notícias armazenadas">{database.articles}</Row>
              <Row label="Fontes cadastradas">{database.sources}</Row>
            </>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader icon={Bot} title="Inteligência artificial" />
          <Row label="API do Claude">{e.ANTHROPIC_API_KEY ? <Badge tone="ok">Chave configurada</Badge> : <Badge tone="warn">Não configurada</Badge>}</Row>
          <Row label="Modelo">{e.ANTHROPIC_MODEL}</Row>
          {!e.ANTHROPIC_API_KEY && (
            <p className="mt-2 text-sm text-muted">
              Crie uma chave em console.anthropic.com e defina <code className="rounded bg-surface-2 px-1">ANTHROPIC_API_KEY</code> no <code className="rounded bg-surface-2 px-1">.env.local</code> (ou nas variáveis do provedor de hospedagem). Reinicie o servidor.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Todo conteúdo gerado recebe o selo “Sugestão da IA” e precisa de revisão. A IA só recebe títulos e trechos das notícias coletadas — nenhum dado pessoal.</p>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={Clock} title="Coleta de notícias" />
          <Row label="Feeds RSS ativos">{collection.activeFeeds}</Row>
          <Row label="Última coleta bem-sucedida">{collection.lastSuccessAt ? relativeTime(collection.lastSuccessAt) : "nunca"}</Row>
          <Row label="Fontes com falha">{collection.failing.length}</Row>
          <Row label="Coleta agendada (CRON_SECRET)">{e.CRON_SECRET ? <Badge tone="ok">Configurada</Badge> : <Badge tone="warn">Não configurada</Badge>}</Row>
          <p className="mt-2 text-sm text-muted">
            A atualização é periódica, não em tempo real. Agende chamadas a <code className="rounded bg-surface-2 px-1">/api/cron/collect</code> com o cabeçalho <code className="rounded bg-surface-2 px-1">Authorization: Bearer CRON_SECRET</code> (veja o README), ou use “Atualizar agora”.
          </p>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={Palette} title="Aparência" />
          <p className="text-sm text-muted">O tema claro é o padrão. Use o botão de lua/sol no topo da página para alternar o tema escuro (a escolha fica salva neste navegador).</p>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={Scale} title="Regras de confiabilidade" />
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
            <li>Toda notícia mantém fonte, link original, data de publicação (quando informada) e data de coleta.</li>
            <li>Guardamos só título, metadados e um trecho curto — nunca a matéria inteira.</li>
            <li>A IA só cita notícias do material enviado; referências inexistentes são descartadas.</li>
            <li>Opinião, análise e declarações recebem selos próprios.</li>
            <li>Ocorrências registradas começam como “não verificadas”.</li>
            <li>“Relevância” é uma ordenação por critérios explícitos e visíveis, não uma avaliação editorial.</li>
            <li>Nada é publicado automaticamente em redes sociais.</li>
          </ul>
        </Card>

        <Card className="p-4">
          <SectionHeader icon={ShieldCheck} title="Segurança e privacidade" />
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
            <li>Acesso protegido por senha; sessão em cookie assinado (HttpOnly), válida por 7 dias.</li>
            <li>O banco só é acessado pelo servidor; no Supabase, o RLS bloqueia a API pública.</li>
            <li>Não registre nomes, telefones ou CPF de quem enviou relatos (LGPD).</li>
          </ul>
          <form action={logout} className="mt-4">
            <button type="submit" className={buttonClass("danger")}>
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
