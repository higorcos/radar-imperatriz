import Link from "next/link";
import { buttonClass } from "./ui";

export function Pagination({
  page,
  total,
  pageSize,
  searchParams,
  basePath,
}: {
  page: number;
  total: number;
  pageSize: number;
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "pagina") params.set(k, v);
    params.set("pagina", String(p));
    return `${basePath}?${params}`;
  };
  return (
    <nav aria-label="Paginação" className="mt-6 flex items-center justify-between">
      {page > 1 ? <Link href={href(page - 1)} className={buttonClass("secondary", "sm")}>← Anteriores</Link> : <span />}
      <span className="text-xs text-muted">Página {page} de {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className={buttonClass("secondary", "sm")}>Próximas →</Link> : <span />}
    </nav>
  );
}
