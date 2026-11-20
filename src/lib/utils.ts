import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateFr(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
  timeZone = "Europe/Paris"
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone }).format(d);
}

export function formatRelativeTimeFr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  if (Math.abs(diffMin) < 1) return "à l'instant";
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  return formatDateFr(d);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "NX";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NX";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
