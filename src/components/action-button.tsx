"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { toast } from "./toaster";
import { buttonClass } from "./ui";

/** Botão que executa uma server action, mostra carregamento e notifica o resultado. */
export function ActionButton({
  action,
  label,
  pendingLabel = "Processando…",
  icon,
  variant = "secondary",
  size = "md",
  confirm,
}: {
  action: () => Promise<ActionResult<unknown>>;
  label: string;
  pendingLabel?: string;
  /** Elemento já renderizado (ex.: <Sparkles className="size-4" />). */
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ai";
  size?: "sm" | "md";
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass(variant, size)}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          try {
            const res = await action();
            if (res.ok) toast(res.message ?? "Concluído.");
            else toast(res.error, "error");
          } catch {
            toast("Algo deu errado. Tente novamente.", "error");
          }
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {pending ? pendingLabel : label}
    </button>
  );
}
