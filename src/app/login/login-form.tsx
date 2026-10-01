"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="rounded-2xl bg-surface p-6 shadow-xl">
      <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">Senha de acesso</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className={inputClass} aria-describedby={state.error ? "login-error" : undefined} />
      {state.error && (
        <p id="login-error" role="alert" className="mt-2 text-sm text-danger">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className={`${buttonClass("primary")} mt-4 w-full`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Entrar
      </button>
    </form>
  );
}
