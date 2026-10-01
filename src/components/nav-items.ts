import {
  BookmarkCheck,
  CalendarDays,
  Flag,
  LayoutDashboard,
  Lightbulb,
  MapPin,
  PenSquare,
  Radar,
  Rss,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/imperatriz", label: "Notícias de Imperatriz", icon: MapPin },
  { href: "/nacionais", label: "Notícias Nacionais", icon: Flag },
  { href: "/radar", label: "Radar de Acontecimentos", icon: Radar },
  { href: "/pautas", label: "Gerador de Pautas", icon: Lightbulb },
  { href: "/conteudo", label: "Criador de Conteúdo", icon: PenSquare },
  { href: "/calendario", label: "Calendário Editorial", icon: CalendarDays },
  { href: "/salvos", label: "Notícias Salvas", icon: BookmarkCheck },
  { href: "/fontes", label: "Fontes de Informação", icon: Rss },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;
