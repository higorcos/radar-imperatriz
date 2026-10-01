import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  APP_PASSWORD: z.string().min(10, "APP_PASSWORD precisa de pelo menos 10 caracteres"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET precisa de pelo menos 32 caracteres"),
  CRON_SECRET: z.string().min(16).optional().or(z.literal("").transform(() => undefined)),
  ANTHROPIC_API_KEY: z.string().optional().or(z.literal("").transform(() => undefined)),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Lê e valida as variáveis de ambiente (somente no servidor). */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuração inválida no .env.local — ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
