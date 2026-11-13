/** One date style everywhere: "11 Oct 2026" and "11 Oct 2026, 09:12" (F-26 consistency). */
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso || 'Not set'
    : dateFormat.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso || 'Not set'
    : dateTimeFormat.format(date);
}

/** "2 hours ago", "in 4 days". */
export function relativeTime(iso: string, at = Date.now()): string {
  const minutes = Math.round((Date.parse(iso) - at) / 60000);
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
  if (Math.abs(minutes) < 60 * 24)
    return format.format(Math.round(minutes / 60), 'hour');
  // Past two months, months read better than days ("7 months ago"); past two years, years.
  const days = minutes / (60 * 24);
  if (Math.abs(days) < 60) return format.format(Math.round(days), 'day');
  if (Math.abs(days) < 730)
    return format.format(Math.round(days / 30.44), 'month');
  return format.format(Math.trunc(days / 365), 'year');
}

/** "1 control", "3 controls" (F-26 AC5). */
export function plural(
  count: number,
  singular: string,
  pluralForm = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Local wall time for date/time forms; the record retains its UTC instant. */
export function formatLocalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || 'Not set';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
