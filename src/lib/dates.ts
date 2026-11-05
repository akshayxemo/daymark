/**
 * Calendar helpers shared by server and client code. All functions work with
 * plain YYYY-MM-DD strings so no timezone conversion happens accidentally.
 */

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Calendar date of `instant` in the given IANA timezone. */
export function dateInTimezone(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function todayIn(timezone: string): string {
  return dateInTimezone(new Date(), timezone);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((Date.UTC(...ymd(to)) - Date.UTC(...ymd(from))) / 86400000);
}

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y!, m! - 1, d!];
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** First day of the week containing `date`, given the configured week start. */
export function startOfWeek(date: string, weekStartsOn = 1): string {
  const offset = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

export function endOfWeek(date: string, weekStartsOn = 1): string {
  return addDays(startOfWeek(date, weekStartsOn), 6);
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string): string {
  const [y, m] = ymd(date);
  const last = new Date(Date.UTC(y, m + 1, 0));
  return last.toISOString().slice(0, 10);
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

export type Period = 'today' | 'week' | 'month';

export function rangeForPeriod(
  period: Period,
  today: string,
  weekStartsOn = 1,
): { from: string; to: string } {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: startOfWeek(today, weekStartsOn), to: endOfWeek(today, weekStartsOn) };
    default:
      return { from: startOfMonth(today), to: endOfMonth(today) };
  }
}

export function formatDuration(seconds: number): string {
  const s = Math.floor(Math.max(0, seconds));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

export function hoursLabel(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function minutesLabel(minutes: number | null | undefined): string {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Short human label such as "Nov 5" or "Nov 5, 2026" without timezone shifts. */
export function formatIsoDate(
  date: string,
  options: { year?: boolean; weekday?: boolean } = {},
): string {
  const [y, m, d] = ymd(date);
  const parts = [];
  if (options.weekday) parts.push(dayNames[weekdayOf(date)]);
  parts.push(`${monthNames[m]} ${d}`);
  const label = parts.join(', ');
  return options.year ? `${label}, ${y}` : label;
}

export function weekdayShort(date: string): string {
  return dayNames[weekdayOf(date)]!;
}
