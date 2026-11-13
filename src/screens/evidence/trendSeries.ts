import type { ComplianceInterval } from '@/stores/evidence';
import type { HeartbeatInterval } from '@/stores/heartbeats';

/**
 * Chart series for System Evidence's two trends, from the same endpoints as the classic page:
 * evidence status over time (satisfied / not satisfied, for the applied search) and agent
 * heartbeats over time. Points are ordered oldest first and labelled with local clock time.
 */
export interface TrendSeries {
  name: string;
  points: { x: string; y: number }[];
}

/** The classic page's intervals: now back to an hour ago. */
export const STATUS_INTERVAL = '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h';

const STATUS_SERIES = [
  { status: 'satisfied', name: 'Satisfied' },
  { status: 'not-satisfied', name: 'Not satisfied' },
];

const byTime = <T extends { interval: string }>(a: T, b: T) =>
  Date.parse(a.interval) - Date.parse(b.interval);

export function statusSeries(intervals: ComplianceInterval[]): TrendSeries[] {
  const sorted = [...intervals].sort(byTime);
  return STATUS_SERIES.map(({ status, name }) => ({
    name,
    points: sorted.map((interval) => ({
      x: interval.interval,
      y: interval.statuses.find((s) => s.status === status)?.count ?? 0,
    })),
  }));
}

export function heartbeatSeries(intervals: HeartbeatInterval[]): TrendSeries[] {
  return [
    {
      name: 'Agents responding',
      points: [...intervals].sort(byTime).map((interval) => ({
        x: interval.interval,
        y: interval.total,
      })),
    },
  ];
}

/** A y-axis maximum just above the highest point, on a round number, never 0. */
export function niceMax(series: TrendSeries[]): number {
  const max = Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.y)));
  if (max <= 4) return 4;
  // About four gridlines: a step of 1, 2 or 5 (times a power of ten) covering a quarter of max.
  const quarter = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(quarter));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= quarter)! * magnitude;
  return Math.ceil(max / step) * step;
}

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});
const dayTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An x-axis formatter for the series, in the viewer's time zone: "09:55" when every point falls
 * within a day, otherwise "5 Nov, 09:55" so labels on different days can't be confused.
 */
export function timeFormatter(series: TrendSeries[]): (iso: string) => string {
  const times = series
    .flatMap((s) => s.points.map((p) => Date.parse(p.x)))
    .filter((t) => !Number.isNaN(t));
  const span = times.length ? Math.max(...times) - Math.min(...times) : 0;
  const format = span > DAY_MS ? dayTimeFormat : timeFormat;
  return (iso) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : format.format(date);
  };
}
