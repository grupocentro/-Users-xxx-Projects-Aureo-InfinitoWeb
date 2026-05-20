import { format, startOfDay, subDays, startOfMonth } from "date-fns";

export type DateRangePreset = "today" | "7d" | "30d" | "month" | "custom";

export interface DateRange {
  preset: DateRangePreset;
  from: string | null; // ISO yyyy-MM-dd
  to:   string | null;
}

function isoDay(d: Date): string {
  return format(startOfDay(d), "yyyy-MM-dd");
}

export function rangeToIsoBounds(range: DateRange): { from: string | null; to: string | null } {
  return { from: range.from, to: range.to };
}

export function presetRange(preset: DateRangePreset): DateRange {
  const today = new Date();
  switch (preset) {
    case "today":  return { preset, from: isoDay(today),                  to: isoDay(today) };
    case "7d":     return { preset, from: isoDay(subDays(today, 6)),       to: isoDay(today) };
    case "30d":    return { preset, from: isoDay(subDays(today, 29)),      to: isoDay(today) };
    case "month":  return { preset, from: isoDay(startOfMonth(today)),     to: isoDay(today) };
    case "custom": return { preset, from: null,                            to: null };
  }
}
