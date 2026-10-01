// Coleta manual pelo terminal. Uso: npm run collect  (ou  npm run collect -- --force)
import postgres from "postgres";
import { collectFeeds } from "../src/lib/collector/collect";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (veja .env.example)");
const sql = postgres(url, { max: 4, onnotice: () => {} });

collectFeeds(sql, { force: process.argv.includes("--force") })
  .then((summary) => {
    for (const r of summary.results) {
      const info = r.status === "erro" ? `ERRO: ${r.error}` : `${r.found} itens, ${r.inserted} novos`;
      console.log(`${r.status.padEnd(14)} ${r.name} — ${info}`);
    }
    if (summary.results.length === 0) console.log("Nenhuma fonte vencida. Use --force para consultar todas.");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
