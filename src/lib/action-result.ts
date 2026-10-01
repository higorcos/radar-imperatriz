import { z } from "zod";

export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string };

export const uuid = z.string().uuid();

/** Converte FormData em objeto simples (campos repetidos viram array). */
export function formToObject(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value !== "string") continue;
    const prev = out[key];
    out[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}

/** Texto opcional: vazio vira null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const tagsField = z
  .string()
  .optional()
  .transform((v) =>
    [...new Set((v ?? "").split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length <= 40))].slice(0, 12),
  );

export function firstIssue(err: z.ZodError): string {
  const issue = err.issues[0];
  return issue ? `${issue.path.join(".") || "campo"}: ${issue.message}` : "Dados inválidos";
}
