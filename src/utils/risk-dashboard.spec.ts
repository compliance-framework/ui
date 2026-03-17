import { describe, expect, it } from 'vitest';
import type { Risk } from '@/oscal';
import {
  buildRiskSeverityHeatmap,
  buildRiskStatusBreakdown,
  buildRiskTrend,
  computeRiskAcceptanceMetrics,
  listOverdueRisks,
  listTopOpenRisks,
} from './risk-dashboard';

function makeRisk(overrides: Partial<Risk> & Record<string, unknown>): Risk {
  return {
    uuid: 'risk-default',
    title: 'Default risk',
    description: 'Default description',
    statement: 'Default statement',
    status: 'open',
    ...overrides,
  } as Risk;
}

function riskWithLevels(
  uuid: string,
  likelihood: string,
  impact: string,
  status = 'open',
) {
  return makeRisk({
    uuid,
    status,
    characterizations: [
      {
        origin: { actors: [] },
        facets: [
          {
            name: 'likelihood',
            system: 'http://fedramp.gov',
            value: likelihood,
          },
          { name: 'impact', system: 'http://fedramp.gov', value: impact },
        ],
      },
    ],
  });
}

describe('risk-dashboard', () => {
  it('builds status breakdown and acceptance metrics', () => {
    const risks = [
      makeRisk({ uuid: 'r1', status: 'open' }),
      makeRisk({ uuid: 'r2', status: 'risk-accepted' }),
      makeRisk({ uuid: 'r3', status: 'risk-accepted' }),
      makeRisk({ uuid: 'r4', status: 'closed' }),
    ];

    const breakdown = buildRiskStatusBreakdown(risks);
    const acceptance = computeRiskAcceptanceMetrics(risks);

    expect(breakdown).toEqual([
      { status: 'risk-accepted', count: 2, label: 'Risk Accepted' },
      { status: 'open', count: 1, label: 'Open' },
    ]);
    expect(acceptance).toEqual({
      addressed: 2,
      totalInScope: 3,
      percentage: 66.7,
    });
  });

  it('builds a heatmap including critical values', () => {
    const risks = [
      riskWithLevels('r1', 'high', 'critical'),
      riskWithLevels('r2', 'critical', 'critical'),
      riskWithLevels('r3', 'moderate', 'low'),
    ];

    const heatmap = buildRiskSeverityHeatmap(risks);

    const criticalCell = heatmap.cells.find(
      (cell) => cell.likelihood === 'critical' && cell.impact === 'critical',
    );
    const mediumLowCell = heatmap.cells.find(
      (cell) => cell.likelihood === 'medium' && cell.impact === 'low',
    );
    const highCriticalCell = heatmap.cells.find(
      (cell) => cell.likelihood === 'high' && cell.impact === 'critical',
    );

    expect(criticalCell?.count).toBe(1);
    expect(mediumLowCell?.count).toBe(1);
    expect(highCriticalCell?.count).toBe(1);
    expect(heatmap.maxCount).toBe(1);
  });

  it('returns overdue review risks ordered by nearest deadline', () => {
    const now = new Date('2026-03-10T00:00:00.000Z');
    const risks = [
      makeRisk({
        uuid: 'r1',
        title: 'Later overdue',
        reviewDeadline: '2026-03-05T00:00:00Z',
      }),
      makeRisk({
        uuid: 'r2',
        title: 'Earliest overdue',
        reviewDeadline: '2026-03-01T00:00:00Z',
      }),
      makeRisk({
        uuid: 'r3',
        title: 'Upcoming',
        reviewDeadline: '2026-03-20T00:00:00Z',
      }),
    ];

    const overdue = listOverdueRisks(risks, now);
    expect(overdue.map((item) => item.id)).toEqual(['r2', 'r1']);
  });

  it('returns top five open risks sorted by impact then likelihood', () => {
    const risks = [
      riskWithLevels('r1', 'low', 'medium', 'open'),
      riskWithLevels('r2', 'high', 'critical', 'open'),
      riskWithLevels('r3', 'critical', 'high', 'open'),
      riskWithLevels('r4', 'critical', 'critical', 'open'),
      riskWithLevels('r5', 'medium', 'high', 'open'),
      riskWithLevels('r6', 'low', 'low', 'open'),
      riskWithLevels('r7', 'critical', 'critical', 'closed'),
    ];

    const top = listTopOpenRisks(risks, 5);
    expect(top.map((item) => item.id)).toEqual(['r4', 'r2', 'r3', 'r5', 'r1']);
  });

  it('includes open risks even when impact/likelihood are missing', () => {
    const risks = [
      makeRisk({
        uuid: 'open-without-levels',
        status: 'open',
        title: 'Needs triage',
      }),
      makeRisk({
        uuid: 'accepted-without-levels',
        status: 'risk-accepted',
        title: 'Accepted risk',
      }),
    ];

    const top = listTopOpenRisks(risks, 5);
    expect(top.map((item) => item.id)).toEqual(['open-without-levels']);
    expect(top[0]).toMatchObject({
      impact: 'unknown',
      likelihood: 'unknown',
    });
  });

  it('excludes closed risks from addressed denominator and numerator', () => {
    const risks = [
      makeRisk({ uuid: 'r1', status: 'open' }),
      makeRisk({ uuid: 'r2', status: 'investigating' }),
      makeRisk({ uuid: 'r3', status: 'mitigation-planned' }),
      makeRisk({ uuid: 'r4', status: 'risk-accepted' }),
      makeRisk({ uuid: 'r5', status: 'mitigating-implemented' }),
      makeRisk({ uuid: 'r6', status: 'closed' }),
    ];

    const metrics = computeRiskAcceptanceMetrics(risks);
    expect(metrics).toEqual({
      addressed: 2,
      totalInScope: 5,
      percentage: 40,
    });
  });

  it('builds trend points with per-day buckets and click range metadata', () => {
    const now = new Date('2026-03-04T12:00:00.000Z');
    const risks = [
      makeRisk({ uuid: 'r1', createdAt: '2026-03-01T02:00:00.000Z' }),
      makeRisk({ uuid: 'r2', createdAt: '2026-03-02T02:00:00.000Z' }),
      makeRisk({ uuid: 'r3', createdAt: '2026-03-02T10:00:00.000Z' }),
    ];

    const trend = buildRiskTrend(risks, 30, now);
    const marchSecond = trend.find((point) => point.date === '2026-03-02');
    const marchFirst = trend.find((point) => point.date === '2026-03-01');

    expect(marchFirst?.count).toBe(1);
    expect(marchSecond?.count).toBe(2);
    expect(marchSecond?.createdFrom).toBe('2026-03-02T00:00:00.000Z');
    expect(marchSecond?.createdTo).toBe('2026-03-02T23:59:59.999Z');
  });
});
