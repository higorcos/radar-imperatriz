import "server-only";
import type { ActionResult } from "../action-result";
import { AiError, AiNotConfiguredError } from "./client";

/** Executa uma operação de IA convertendo erros conhecidos em mensagens para a usuária. */
export async function runAi<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof AiNotConfiguredError || err instanceof AiError) return { ok: false, error: err.message };
    console.error("[ia] erro inesperado", err instanceof Error ? err.message : err);
    return { ok: false, error: "Erro inesperado ao gerar com IA. Tente novamente." };
  }
}
