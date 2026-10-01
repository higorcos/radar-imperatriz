// Aplica as migrações SQL de db/migrations em ordem. Uso: npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (veja .env.example)");

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = path.resolve("db/migrations");

async function main() {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const content = readFileSync(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(content); // arquivo versionado do próprio projeto, sem entrada de usuário
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`✓ ${file}`);
  }
  console.log("Migrações em dia.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
