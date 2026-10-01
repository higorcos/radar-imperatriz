import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { collectFeeds } from "@/lib/collector/collect";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const a = createHash("sha256").update(header.slice(7)).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/**
 * Coleta periódica (Vercel Cron, cron do servidor ou outro agendador).
 * Consulta só as fontes "vencidas" conforme a frequência de cada uma.
 * Exige: Authorization: Bearer <CRON_SECRET>
 */
async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const summary = await collectFeeds(db());
  return NextResponse.json({
    startedAt: summary.startedAt,
    finishedAt: summary.finishedAt,
    sources: summary.results.map((r) => ({ name: r.name, status: r.status, found: r.found, inserted: r.inserted, error: r.error })),
  });
}

export const GET = handle;
export const POST = handle;
