import Link from "next/link";
import { hoursSince, relativeTime } from "@/lib/format";
import { collectionStatus } from "@/lib/repo/sources";
import { Notice } from "./ui";

const STALE_HOURS = 3;

/** Avisa quando a coleta falhou ou os dados estão desatualizados (regra 10). */
export async function StaleNotice() {
  const status = await collectionStatus();
  if (!status.lastSuccessAt) {
    return (
      <Notice tone="warn" title="Nenhuma coleta concluída ainda" className="mb-6">
        Use “Atualizar agora” para buscar as notícias das fontes cadastradas.
      </Notice>
    );
  }
  const ageH = hoursSince(status.lastSuccessAt);
  return (
    <div className="mb-6 space-y-2">
      {ageH > STALE_HOURS && (
        <Notice tone="warn" title={`Dados possivelmente desatualizados — última coleta ${relativeTime(status.lastSuccessAt)}`}>
          O sistema atualiza periodicamente, não em tempo real. Clique em “Atualizar agora” para consultar as fontes.
        </Notice>
      )}
      {status.failing.length > 0 && (
        <Notice tone="danger" title={`${status.failing.length} fonte(s) com falha na última consulta`}>
          {status.failing.slice(0, 3).map((f) => f.name).join(", ")}
          {status.failing.length > 3 && "…"} —{" "}
          <Link href="/fontes" className="font-medium text-accent hover:underline">
            ver detalhes
          </Link>
        </Notice>
      )}
    </div>
  );
}

export async function LastUpdate() {
  const status = await collectionStatus();
  return (
    <span className="text-xs text-muted">
      {status.lastSuccessAt ? `Última coleta: ${relativeTime(status.lastSuccessAt)} · atualização periódica` : "Ainda sem coleta"}
    </span>
  );
}
