"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/session";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

const digest = (s: string) => createHash("sha256").update(s).digest();

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: "Informe a senha." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(ip)) return { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };

  const { APP_PASSWORD, SESSION_SECRET } = env();
  if (!timingSafeEqual(digest(parsed.data.password), digest(APP_PASSWORD))) {
    return { error: "Senha incorreta." };
  }
  attempts.delete(ip);

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
