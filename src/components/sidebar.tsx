"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav-items";
import { cx } from "./ui";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
              active ? "bg-white/10 font-medium text-white" : "text-on-navy-muted hover:bg-white/5 hover:text-on-navy",
            )}
          >
            <Icon className={cx("size-[18px] shrink-0", active ? "text-[#8fb6ff]" : "opacity-80")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy px-3 py-5 lg:flex">
        <div className="mb-7 px-2">
          <Logo />
        </div>
        <NavList />
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-on-navy-muted/80">
          Ferramenta de apoio. Toda informação deve ser apurada e revisada antes da publicação.
        </p>
      </aside>

      {/* Mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 lg:hidden">
        <Logo compact />
        <span className="font-serif font-bold text-on-navy">Radar Imperatriz</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-1.5 text-on-navy hover:bg-white/10"
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="fade-in absolute inset-y-0 left-0 flex w-72 flex-col bg-navy px-3 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-on-navy hover:bg-white/10" aria-label="Fechar menu">
                <X className="size-5" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
