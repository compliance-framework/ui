// Agent plugin schedules: standard 5-field robfig/cron plus descriptors (API
// agentconfig.ParseSchedule). NOT the 6-field workflow validator in utils/cron.ts.

interface FieldSpec {
  name: string;
  min: number;
  max: number;
  names?: Record<string, number>;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const DOWS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const FIELDS: FieldSpec[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: MONTHS },
  { name: 'day of week', min: 0, max: 6, names: DOWS },
];

const DESCRIPTORS = [
  '@yearly',
  '@annually',
  '@monthly',
  '@weekly',
  '@daily',
  '@midnight',
  '@hourly',
];

/** Go time.ParseDuration syntax (as used by `@every`). */
export const GO_DURATION_RE =
  /^[-+]?(0|((\d+(\.\d*)?|\.\d+)(ns|us|µs|μs|ms|s|m|h))+)$/;

function parseValue(raw: string, spec: FieldSpec): number | string {
  const lower = raw.toLowerCase();
  if (spec.names && lower in spec.names) return spec.names[lower];
  if (!/^\d+$/.test(raw)) return `invalid ${spec.name} value "${raw}"`;
  return Number(raw);
}

function validateRange(expr: string, spec: FieldSpec): string | null {
  const [rangePart, stepPart, ...extra] = expr.split('/');
  if (extra.length > 0) return `too many slashes in ${spec.name} "${expr}"`;
  let start: number;
  let end: number;
  if (rangePart === '*' || rangePart === '?') {
    start = spec.min;
    end = spec.max;
  } else {
    const bounds = rangePart.split('-');
    if (bounds.length > 2) return `too many hyphens in ${spec.name} "${expr}"`;
    const lo = parseValue(bounds[0], spec);
    if (typeof lo === 'string') return lo;
    start = lo;
    if (bounds.length === 2) {
      const hi = parseValue(bounds[1], spec);
      if (typeof hi === 'string') return hi;
      end = hi;
    } else {
      end = stepPart !== undefined ? spec.max : start;
    }
  }
  if (stepPart !== undefined) {
    if (!/^\d+$/.test(stepPart) || Number(stepPart) === 0) {
      return `step of ${spec.name} "${expr}" must be a positive number`;
    }
  }
  if (start < spec.min)
    return `${spec.name} ${start} is below the minimum ${spec.min}`;
  if (end > spec.max)
    return `${spec.name} ${end} is above the maximum ${spec.max}`;
  if (start > end) return `${spec.name} range "${expr}" starts after it ends`;
  return null;
}

/** Returns an error message, or null when the expression is a valid agent schedule. */
export function validateCron5(input: string): string | null {
  // Mirrors robfig/cron Parse: no trimming before the TZ prefix or a descriptor (so
  // "@daily " is rejected as the agent would), fields split like strings.Fields.
  let expr = input;
  if (!expr.trim()) return 'Schedule is empty';
  if (expr.startsWith('TZ=') || expr.startsWith('CRON_TZ=')) {
    const space = expr.indexOf(' ');
    if (space < 0) return 'a time zone prefix must be followed by a schedule';
    const zone = expr.slice(expr.indexOf('=') + 1, space);
    if (!validTimeZone(zone)) return `unknown time zone "${zone}"`;
    expr = expr.slice(space).trim();
  }
  if (expr.startsWith('@')) {
    if (DESCRIPTORS.includes(expr)) return null;
    if (expr.startsWith('@every ')) {
      const d = expr.slice('@every '.length);
      return GO_DURATION_RE.test(d)
        ? null
        : `invalid duration "${d}" in @every`;
    }
    return `unrecognized descriptor "${expr}"`;
  }
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    return `expected 5 fields (minute hour day-of-month month day-of-week), found ${fields.length}`;
  }
  for (let i = 0; i < 5; i++) {
    for (const part of fields[i].split(',')) {
      if (part === '') return `empty value in ${FIELDS[i].name}`;
      const err = validateRange(part, FIELDS[i]);
      if (err) return err;
    }
  }
  return null;
}

function validTimeZone(zone: string): boolean {
  if (!zone) return false;
  if (zone === 'UTC' || zone === 'Local') return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isInt(s: string, min: number, max: number): boolean {
  return /^\d+$/.test(s) && Number(s) >= min && Number(s) <= max;
}

/** A short human description of common schedules; anything else is "Custom schedule". */
export function describeCron5(input: string): string {
  const expr = input.trim();
  switch (expr) {
    case '@hourly':
      return 'Every hour';
    case '@daily':
    case '@midnight':
      return 'Every day at 00:00';
    case '@weekly':
      return 'Every Sunday at 00:00';
    case '@monthly':
      return 'On the 1st of every month at 00:00';
    case '@yearly':
    case '@annually':
      return 'Every year on 1 January at 00:00';
  }
  if (expr.startsWith('@every ')) {
    const d = expr.slice('@every '.length).trim();
    return GO_DURATION_RE.test(d) ? `Every ${d}` : 'Custom schedule';
  }
  const f = expr.split(/\s+/);
  if (f.length !== 5) return 'Custom schedule';
  const [m, h, dom, mon, dow] = f;
  if (dom !== '*' || mon !== '*') return 'Custom schedule';
  if (m === '*' && h === '*' && dow === '*') return 'Every minute';
  const everyN = /^\*\/(\d+)$/.exec(m);
  if (everyN && h === '*' && dow === '*' && Number(everyN[1]) > 0) {
    const n = Number(everyN[1]);
    return n === 1 ? 'Every minute' : `Every ${n} minutes`;
  }
  if (isInt(m, 0, 59) && h === '*' && dow === '*') {
    return `Every hour at minute ${Number(m)}`;
  }
  if (isInt(m, 0, 59) && isInt(h, 0, 23)) {
    const time = `${pad(Number(h))}:${pad(Number(m))}`;
    if (dow === '*') return `Every day at ${time}`;
    const d = dow.toLowerCase();
    const idx = isInt(dow, 0, 6) ? Number(dow) : d in DOWS ? DOWS[d] : -1;
    if (idx >= 0) return `Every ${DAY_NAMES[idx]} at ${time}`;
  }
  return 'Custom schedule';
}
