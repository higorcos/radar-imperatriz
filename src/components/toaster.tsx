"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

const EVENT = "radar:toast";

/** Notificação discreta. Pode ser chamada de qualquer componente cliente. */
export function toast(message: string, tone: Toast["tone"] = "ok") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const id = ++seq;
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="fade-in pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text shadow-lg"
        >
          {t.tone === "ok" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
