import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** Verificação definitiva de sessão — chamar em toda página e server action protegida. */
export async function requireSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token, env().SESSION_SECRET))) redirect("/login");
}
