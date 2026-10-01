import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

// Checagem otimista: redireciona quem não tem sessão válida. As páginas e ações
// repetem a verificação no servidor (requireSession), que é a proteção definitiva.
export async function proxy(request: NextRequest) {
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  if (!ok) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Fora do proxy: login, rota de cron (autenticada por CRON_SECRET) e arquivos estáticos.
  matcher: ["/((?!login|api/cron|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
