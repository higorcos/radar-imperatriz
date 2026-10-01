// Cadastra as fontes iniciais (idempotente: não duplica nem sobrescreve fontes existentes).
import postgres from "postgres";
import { SOURCE_SEEDS } from "../src/lib/sources-seed";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (veja .env.example)");
const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  let created = 0;
  for (const s of SOURCE_SEEDS) {
    const rows = await sql`
      insert into sources (name, site_url, feed_url, type, scope, region, categories, method, link_pattern,
                           frequency_minutes, enabled, allow_images, notes)
      select ${s.name}, ${s.site_url}, ${s.feed_url}, ${s.type}, ${s.scope}, ${s.region}, ${s.categories},
             ${s.method}, ${s.link_pattern ?? null}, ${s.frequency_minutes}, ${s.enabled}, ${s.allow_images}, ${s.notes}
      where not exists (select 1 from sources where name = ${s.name} or (feed_url is not null and feed_url = ${s.feed_url}))
      returning id
    `;
    created += rows.length;
  }
  console.log(`${created} fonte(s) nova(s); ${SOURCE_SEEDS.length - created} já existiam.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
