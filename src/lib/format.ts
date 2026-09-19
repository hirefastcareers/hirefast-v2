// src/lib/format.ts
// British formatting helpers. Use these everywhere — never format dates/money inline.

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const gbpFmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d); // DD/MM/YYYY
}

export function formatGBP(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : gbpFmt.format(value);
}

export function formatPayPerHour(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${gbpFmt.format(value)}/hr`;
}

export function formatMiles(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)} ${value === 1 ? "mile" : "miles"}`;
}

export function formatMinutesEst(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `~${value} min (est.)`;
}

export function daysSince(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
