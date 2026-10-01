import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <svg viewBox="0 0 32 32" className="mx-auto mb-4 size-12" aria-hidden>
            <rect width="32" height="32" rx="8" fill="#1f5fd0" />
            <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="5" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" />
            <path d="M16 16 L24.5 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2" fill="#fff" />
          </svg>
          <h1 className="font-serif text-2xl font-bold text-on-navy">Radar Imperatriz</h1>
          <p className="mt-1 text-sm text-on-navy-muted">A informação que movimenta a cidade.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
