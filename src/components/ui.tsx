import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Info, Sparkles, XCircle } from "lucide-react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ai";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap";
const BUTTON_SIZES = { sm: "h-8 px-2.5 text-[13px]", md: "h-9 px-3.5" } as const;
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-text hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  danger: "border border-border bg-surface text-danger hover:bg-danger-soft",
  ai: "bg-ai text-white hover:opacity-90 dark:text-[#140a2b]",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: keyof typeof BUTTON_SIZES = "md"): string {
  return cx(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant]);
}

export const inputClass =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none";
export const textareaClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-none";
export const labelClass = "mb-1 block text-xs font-medium text-muted";

export function Card({ children, className, as: As = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "article" | "div" }) {
  return <As className={cx("rounded-xl border border-border bg-surface", className)}>{children}</As>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  icon: Icon,
  description,
  href,
  hrefLabel = "Ver tudo",
  actions,
}: {
  title: string;
  icon?: LucideIcon;
  description?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text">
          {Icon && <Icon className="size-4 text-accent" aria-hidden />}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {href && (
          <Link href={href} className="text-xs font-medium text-accent hover:underline">
            {hrefLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "ai";
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  ai: "bg-ai-soft text-ai",
};

export function Badge({ children, tone = "neutral", title, className }: { children: React.ReactNode; tone?: Tone; title?: string; className?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4", TONES[tone], className)}>
      {children}
    </span>
  );
}

const NOTICE_ICONS = { info: Info, warn: AlertTriangle, danger: XCircle, ai: Sparkles } as const;
const NOTICE_TONES = {
  info: "border-accent/25 bg-accent-soft text-text",
  warn: "border-warn/30 bg-warn-soft text-text",
  danger: "border-danger/30 bg-danger-soft text-text",
  ai: "border-ai/25 bg-ai-soft text-text",
} as const;
const NOTICE_ICON_TONES = { info: "text-accent", warn: "text-warn", danger: "text-danger", ai: "text-ai" } as const;

export function Notice({ tone = "info", title, children, className }: { tone?: keyof typeof NOTICE_TONES; title?: string; children?: React.ReactNode; className?: string }) {
  const Icon = NOTICE_ICONS[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm", NOTICE_TONES[tone], className)}>
      <Icon className={cx("mt-0.5 size-4 shrink-0", NOTICE_ICON_TONES[tone])} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx("text-muted", title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-surface-2">
        <Icon className="size-5 text-muted" aria-hidden />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Selo para todo conteúdo produzido por IA (regra 3 de confiabilidade). */
export function AiLabel({ children = "Sugestão da IA — revisar antes de usar" }: { children?: React.ReactNode }) {
  return (
    <Badge tone="ai">
      <Sparkles className="size-3" aria-hidden />
      {children}
    </Badge>
  );
}
