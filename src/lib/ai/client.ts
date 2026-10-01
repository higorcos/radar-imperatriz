import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env } from "../env";
import { SYSTEM_PROMPT } from "./prompts";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("A IA não está configurada. Defina ANTHROPIC_API_KEY no .env.local (veja o README).");
  }
}

export class AiError extends Error {}

// Modelos que aceitam o fallback automático do servidor em caso de recusa.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

let client: Anthropic | undefined;

/**
 * Chamada única à API do Claude com saída estruturada (validada por zod).
 * Não há modo "simulado": sem chave, lança AiNotConfiguredError e a interface avisa.
 */
export async function generateStructured<S extends z.ZodType>(
  schema: S,
  userPrompt: string,
): Promise<{ data: z.infer<S>; model: string }> {
  const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = env();
  if (!ANTHROPIC_API_KEY) throw new AiNotConfiguredError();
  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 180_000 });

  const useFallback = FALLBACK_MODELS.has(ANTHROPIC_MODEL);
  try {
    const res = await client.beta.messages.parse({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    if (res.stop_reason === "refusal") {
      throw new AiError("A IA recusou esta solicitação. Reformule o pedido ou escolha outro material.");
    }
    if (res.stop_reason === "max_tokens") {
      throw new AiError("A resposta da IA ficou longa demais e foi interrompida. Tente com menos itens.");
    }
    if (!res.parsed_output) throw new AiError("A IA respondeu em um formato inesperado. Tente novamente.");
    return { data: res.parsed_output as z.infer<S>, model: res.model };
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new AiError("Chave da API do Claude inválida. Verifique ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.PermissionDeniedError) throw new AiError("A chave da API não tem permissão para usar este modelo.");
    if (err instanceof Anthropic.RateLimitError) throw new AiError("Limite de uso da API atingido. Aguarde alguns minutos.");
    if (err instanceof Anthropic.BadRequestError) throw new AiError(`Requisição recusada pela API: ${err.message.slice(0, 200)}`);
    if (err instanceof Anthropic.APIConnectionError) throw new AiError("Não foi possível conectar à API do Claude. Verifique a internet.");
    if (err instanceof Anthropic.APIError) throw new AiError(`Erro na API do Claude (HTTP ${err.status}). Tente novamente.`);
    throw err;
  }
}
