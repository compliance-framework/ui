import type { ComplianceInterval } from '@/stores/evidence';

export type DashboardMiniChartStatus = 'satisfied' | 'not-satisfied' | 'none';

export interface DashboardMiniChartModel {
  state: 'ready' | 'empty';
  dominantStatus: DashboardMiniChartStatus;
  baselineStatus: Exclude<DashboardMiniChartStatus, 'none'> | null;
  bars: number[];
}

const BAR_COUNT = 7;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 24;

function statusCount(bucket: ComplianceInterval, status: string): number {
  return bucket.statuses.find((item) => item.status === status)?.count ?? 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sampleCounts(values: number[]): number[] {
  if (values.length === 0) {
    return Array.from({ length: BAR_COUNT }, () => 0);
  }

  if (values.length === 1) {
    return Array.from({ length: BAR_COUNT }, () => values[0] ?? 0);
  }

  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const sourceIndex = Math.round(
      (index * (values.length - 1)) / (BAR_COUNT - 1),
    );
    return values[sourceIndex] ?? 0;
  });
}

function toBarHeights(values: number[]): number[] {
  const maxValue = Math.max(...values, 0);

  if (maxValue <= 0) {
    return Array.from({ length: BAR_COUNT }, () => MIN_BAR_HEIGHT);
  }

  return values.map((value) => {
    if (value <= 0) {
      return MIN_BAR_HEIGHT;
    }

    return Math.max(
      MIN_BAR_HEIGHT,
      Math.round((value / maxValue) * MAX_BAR_HEIGHT),
    );
  });
}

export function buildDashboardMiniChartModel(
  intervals: ComplianceInterval[] | null | undefined,
): DashboardMiniChartModel {
  const safeIntervals = intervals ?? [];
  const satisfied = safeIntervals.map((bucket) =>
    statusCount(bucket, 'satisfied'),
  );
  const notSatisfied = safeIntervals.map((bucket) =>
    statusCount(bucket, 'not-satisfied'),
  );

  const satisfiedTotal = sum(satisfied);
  const notSatisfiedTotal = sum(notSatisfied);

  if (satisfiedTotal === 0 && notSatisfiedTotal === 0) {
    return {
      state: 'empty',
      dominantStatus: 'none',
      baselineStatus: null,
      bars: Array.from({ length: BAR_COUNT }, () => MIN_BAR_HEIGHT),
    };
  }

  const dominantStatus =
    satisfiedTotal >= notSatisfiedTotal ? 'satisfied' : 'not-satisfied';
  const baselineStatus =
    dominantStatus === 'satisfied' ? 'not-satisfied' : 'satisfied';
  const source = dominantStatus === 'satisfied' ? satisfied : notSatisfied;

  return {
    state: 'ready',
    dominantStatus,
    baselineStatus,
    bars: toBarHeights(sampleCounts(source)),
  };
}
