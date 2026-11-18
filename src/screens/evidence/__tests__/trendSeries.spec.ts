import { describe, expect, it } from 'vitest';
import {
  heartbeatSeries,
  niceMax,
  statusSeries,
  timeFormatter,
} from '../trendSeries';

describe('trendSeries', () => {
  it('splits status intervals into satisfied and not satisfied, oldest first', () => {
    const series = statusSeries([
      {
        interval: '2026-11-13T10:00:00Z',
        statuses: [{ status: 'satisfied', count: 3 }],
      },
      {
        interval: '2026-11-13T09:00:00Z',
        statuses: [
          { status: 'satisfied', count: 1 },
          { status: 'not-satisfied', count: 2 },
        ],
      },
    ]);
    expect(series.map((s) => s.name)).toEqual(['Satisfied', 'Not satisfied']);
    expect(series[0]!.points.map((p) => p.y)).toEqual([1, 3]);
    // A status missing from an interval counts as 0.
    expect(series[1]!.points.map((p) => p.y)).toEqual([2, 0]);
  });

  it('charts heartbeats as one series', () => {
    const [series] = heartbeatSeries(
      [
        { interval: '2026-11-13T10:00:00Z', total: 4 },
        { interval: '2026-11-13T09:30:00Z', total: 2 },
      ],
      Date.parse('2026-11-13T10:05:00Z'),
    );
    expect(series!.points.map((p) => p.y)).toEqual([2, 4]);
  });

  it('keeps only the last hour of heartbeats', () => {
    const [series] = heartbeatSeries(
      [
        { interval: '2026-09-09T09:24:00Z', total: 1 },
        { interval: '2026-11-13T09:00:00Z', total: 3 },
        { interval: '2026-11-13T09:10:00Z', total: 5 },
      ],
      Date.parse('2026-11-13T10:05:00Z'),
    );
    expect(series!.points.map((p) => p.x)).toEqual(['2026-11-13T09:10:00Z']);
  });

  it('rounds the y axis up to a readable maximum', () => {
    expect(niceMax([{ name: 'a', points: [{ x: '', y: 0 }] }])).toBe(4);
    expect(niceMax([{ name: 'a', points: [{ x: '', y: 37 }] }])).toBe(40);
    expect(niceMax([{ name: 'a', points: [{ x: '', y: 120 }] }])).toBe(150);
  });

  it('adds the date to time labels when the points span more than a day', () => {
    const sameDay = timeFormatter([
      {
        name: 'a',
        points: [
          { x: '2026-11-13T09:00:00Z', y: 1 },
          { x: '2026-11-13T10:00:00Z', y: 1 },
        ],
      },
    ]);
    expect(sameDay('2026-11-13T09:00:00Z')).toMatch(/^\d\d:\d\d$/);

    const days = timeFormatter([
      {
        name: 'a',
        points: [
          { x: '2026-11-10T09:00:00Z', y: 1 },
          { x: '2026-11-13T09:00:00Z', y: 1 },
        ],
      },
    ]);
    expect(days('2026-11-13T09:00:00Z')).toMatch(/Nov/);
  });
});
