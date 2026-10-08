import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/toaster";
import { Topbar } from "@/components/topbar";
import { requireSession } from "@/lib/auth";

// O botão "Atualizar agora" (topo de todas as páginas) coleta todas as fontes numa server action;
// a coleta completa leva ~15 s. Páginas com IA definem um limite maior.
export const maxDuration = 60;

// Páginas autenticadas e com dados do banco: sempre renderizadas por requisição, nunca no build
// (no build, a tentativa de pré-gerar "/" e "/radar" travava consultando o banco).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Suspense>
          <Topbar />
        </Suspense>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
