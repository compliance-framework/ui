import { describe, expect, it } from 'vitest';
import { buildDashboardMiniChartModel } from './dashboardMiniChart';
import type { ComplianceInterval } from '@/stores/evidence';

function bucket(
  interval: string,
  satisfied: number,
  notSatisfied: number,
): ComplianceInterval {
  return {
    interval,
    statuses: [
      { status: 'satisfied', count: satisfied },
      { status: 'not-satisfied', count: notSatisfied },
    ],
  };
}

describe('buildDashboardMiniChartModel', () => {
  it('returns an empty chart model when no chart data is populated', () => {
    const model = buildDashboardMiniChartModel([]);

    expect(model.state).toBe('empty');
    expect(model.dominantStatus).toBe('none');
    expect(model.baselineStatus).toBeNull();
    expect(model.bars).toHaveLength(7);
    expect(model.bars.every((height) => height === 4)).toBe(true);
  });

  it('uses satisfied as the dominant series and keeps not-satisfied as baseline', () => {
    const model = buildDashboardMiniChartModel([
      bucket('2026-01-01T00:00:00.000Z', 1, 0),
      bucket('2026-01-01T00:10:00.000Z', 3, 0),
      bucket('2026-01-01T00:20:00.000Z', 2, 0),
    ]);

    expect(model.state).toBe('ready');
    expect(model.dominantStatus).toBe('satisfied');
    expect(model.baselineStatus).toBe('not-satisfied');
    expect(Math.max(...model.bars)).toBeGreaterThan(4);
  });

  it('uses not-satisfied as the dominant series and keeps satisfied as baseline', () => {
    const model = buildDashboardMiniChartModel([
      bucket('2026-01-01T00:00:00.000Z', 0, 1),
      bucket('2026-01-01T00:10:00.000Z', 0, 4),
      bucket('2026-01-01T00:20:00.000Z', 0, 2),
    ]);

    expect(model.state).toBe('ready');
    expect(model.dominantStatus).toBe('not-satisfied');
    expect(model.baselineStatus).toBe('satisfied');
    expect(Math.max(...model.bars)).toBeGreaterThan(4);
  });
});
