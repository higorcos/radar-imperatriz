// Datas exibidas no fuso de Imperatriz (UTC-3, sem horário de verão).
export const TIME_ZONE = "America/Fortaleza";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
const longDateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatLongDate = (d: Date | string) => longDateFmt.format(new Date(d));
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));

/** "agora há pouco", "há 25 min", "há 3 h", "há 2 dias". */
export function relativeTime(d: Date | string, now = Date.now()): string {
  const diff = now - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  // Datas no futuro só ocorrem com fontes que informam apenas o dia (guardado ao meio-dia): mostramos só a data.
  if (min < 0) return formatDate(d);
  if (min < 2) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** Data (YYYY-MM-DD) no fuso local, para inputs e agrupamento de calendário. */
export function localDateKey(d: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
  return parts; // en-CA já formata como YYYY-MM-DD
}

/** Converte "YYYY-MM-DD" + "HH:MM" (horário local de Imperatriz) em Date UTC. */
export function fromLocalInput(date: string, time = "09:00"): Date {
  return new Date(`${date}T${time}:00-03:00`);
}

/** Horas desde a data (para avisos de defasagem). */
export function hoursSince(d: Date | string, now = Date.now()): number {
  return (now - new Date(d).getTime()) / 3_600_000;
}
