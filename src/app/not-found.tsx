import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="font-serif text-5xl font-bold text-accent">404</p>
        <p className="mt-2 text-text">Página não encontrada.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">Voltar ao painel</Link>
      </div>
    </main>
  );
}
