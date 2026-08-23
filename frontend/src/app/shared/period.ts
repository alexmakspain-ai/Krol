export type PeriodPreset = 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Formats a Date as yyyy-mm-dd using its LOCAL calendar date. Deliberately
 * avoids `toISOString()`, which converts to UTC first and silently shifts
 * the date by a day whenever the local timezone offset crosses midnight
 * (e.g. UTC+2 turns local midnight Aug 1 into Jul 31 22:00 UTC).
 */
export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function presetRange(preset: PeriodPreset, custom: DateRange): DateRange {
  const today = new Date();
  switch (preset) {
    case 'week':
      return { start: isoDate(startOfWeek(today)), end: isoDate(today) };
    case 'month':
      return { start: isoDate(startOfMonth(today)), end: isoDate(today) };
    case 'year':
      return { start: isoDate(startOfYear(today)), end: isoDate(today) };
    case 'custom':
      return custom;
  }
}

/** The full previous calendar month (e.g. run in August → July 1–31). */
export function previousMonthRange(): DateRange {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  // Day 0 of the current month rolls back to the last day of the previous month.
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: isoDate(start), end: isoDate(end) };
}
