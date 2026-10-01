"use client";

import { useSyncExternalStore, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Moon, RefreshCw, Search, Sun } from "lucide-react";
import { refreshCollection } from "@/app/(app)/actions";
import { toast } from "./toaster";
import { buttonClass, cx } from "./ui";

// O tema vive na classe "dark" do <html>; observamos a classe para manter o ícone em sincronia.
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("radar-theme", next ? "dark" : "light");
    } catch {
      // armazenamento indisponível (modo privado): o tema vale só nesta sessão
    }
  }
  return (
    <button type="button" onClick={toggle} className={buttonClass("ghost")} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"} title={dark ? "Tema claro" : "Tema escuro"}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function RefreshButton({
  label = "Atualizar agora",
  variant = "secondary",
  compactOnMobile = false,
}: {
  label?: string;
  variant?: "secondary" | "primary";
  compactOnMobile?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass(variant)}
      onClick={() =>
        start(async () => {
          const res = await refreshCollection();
          if (res.ok) toast(res.message ?? "Coleta concluída.");
          else toast(res.error, "error");
          router.refresh();
        })
      }
      title="Consulta agora todas as fontes RSS ativas"
    >
      <RefreshCw className={cx("size-4", pending && "animate-spin")} aria-hidden />
      <span className={compactOnMobile ? "sr-only sm:not-sr-only" : undefined}>{pending ? "Coletando…" : label}</span>
    </button>
  );
}

export function Topbar() {
  const params = useSearchParams();
  return (
    <div className="sticky top-14 z-20 border-b border-border bg-bg/85 backdrop-blur lg:top-0">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <form action="/busca" role="search" className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="busca-global" className="sr-only">
            Pesquisar notícias, pautas e ocorrências
          </label>
          <input
            id="busca-global"
            name="q"
            defaultValue={params.get("q") ?? ""}
            placeholder="Pesquisar notícias, pautas, ocorrências…"
            className="h-9 w-full max-w-xl rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none"
          />
        </form>
        <RefreshButton compactOnMobile />
        <ThemeToggle />
      </div>
    </div>
  );
}
