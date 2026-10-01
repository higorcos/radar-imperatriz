export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#1f5fd0" />
        <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="5" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" />
        <path d="M16 16 L24.5 9.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2" fill="#fff" />
      </svg>
      {!compact && (
        <div className="leading-tight">
          <p className="font-serif text-[17px] font-bold text-on-navy">Radar Imperatriz</p>
          <p className="text-[11px] text-on-navy-muted">A informação que movimenta a cidade.</p>
        </div>
      )}
    </div>
  );
}
