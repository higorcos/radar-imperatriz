"use client";

import { RotateCcw } from "lucide-react";
import { Notice, buttonClass } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <Notice tone="danger" title="Não foi possível carregar esta página">
        Pode ser uma falha temporária de conexão com o banco de dados. Se persistir, confira a página Configurações.
      </Notice>
      <button type="button" onClick={reset} className={`${buttonClass("secondary")} mt-4`}>
        <RotateCcw className="size-4" aria-hidden /> Tentar novamente
      </button>
    </div>
  );
}
