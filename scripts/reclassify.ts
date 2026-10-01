// Reaplica as regras de classificação às notícias já armazenadas (use após alterar categories.ts).
// Uso: npm run reclassify
import postgres from "postgres";
import { classify, detectContentKind, hasStatement, isCategoryKey, mentionsImperatriz } from "../src/lib/categories";
import { scopeFor } from "../src/lib/collector/collect";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (veja .env.example)");
const sql = postgres(url, { max: 1, onnotice: () => {} });

type Row = { id: string; title: string; excerpt: string | null; url: string; source_scope: "local" | "estadual" | "nacional"; source_categories: string[] };

async function main() {
  const rows = await sql<Row[]>`
    select a.id, a.title, a.excerpt, a.url, s.scope as source_scope, s.categories as source_categories
    from articles a join sources s on s.id = a.source_id
  `;
  let changed = 0;
  for (const r of rows) {
    const local = mentionsImperatriz(`${r.title} ${r.excerpt ?? ""}`);
    let category: string = classify(r.title, r.excerpt ?? "");
    const fallback = r.source_categories.find(isCategoryKey);
    if (category === "geral" && fallback) category = fallback;
    const res = await sql`
      update articles set category = ${category}, content_kind = ${detectContentKind(r.url, r.title)},
        has_statement = ${hasStatement(r.title)}, mentions_imperatriz = ${local},
        scope = ${local ? "local" : scopeFor(r.source_scope, r.url)}
      where id = ${r.id}
        and (category, content_kind, has_statement, mentions_imperatriz, scope)
          is distinct from (${category}, ${detectContentKind(r.url, r.title)}, ${hasStatement(r.title)}, ${local}, ${local ? "local" : scopeFor(r.source_scope, r.url)})
    `;
    changed += res.count;
  }
  console.log(`${changed} de ${rows.length} notícia(s) atualizada(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
