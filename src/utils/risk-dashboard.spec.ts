import { describe, expect, it } from 'vitest';
import type { Risk } from '@/oscal';
import {
  buildRiskSeverityHeatmap,
  buildRiskStatusBreakdown,
  computeRiskAcceptanceMetrics,
  listOverdueRisks,
  listTopOpenRisks,
  normalizeRiskScoreSnapshots,
  normalizeRiskScoreTimeseries,
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
      makeRisk({ uuid: 'r2', status: 'accepted' }),
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
      riskWithLevels('r4', 'critical', 'critical', 'closed'),
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
      makeRisk({
        uuid: 'r4',
        title: 'Closed and overdue',
        status: 'closed',
        reviewDeadline: '2026-03-02T00:00:00Z',
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

  it('normalizes score timeseries points from the API shape', () => {
    const points = normalizeRiskScoreTimeseries({
      data: {
        data: [
          {
            'bucket-start': '2026-01-01T00:00:00Z',
            'open-baseline-score': 28,
            'open-residual-score': 12,
          },
          {
            bucketStart: '2026-01-02T00:00:00Z',
            openBaselineScore: '30',
            openResidualScore: '14',
          },
        ],
      },
    });

    expect(points).toEqual([
      {
        bucketStart: '2026-01-01T00:00:00Z',
        openBaselineScore: 28,
        openResidualScore: 12,
      },
      {
        bucketStart: '2026-01-02T00:00:00Z',
        openBaselineScore: 30,
        openResidualScore: 14,
      },
    ]);
  });

  it('normalizes risk score history snapshots from the API shape', () => {
    const snapshots = normalizeRiskScoreSnapshots({
      data: {
        data: [
          {
            id: 'score-1',
            'risk-id': 'risk-1',
            'ssp-id': 'ssp-1',
            'occurred-at': '2026-01-01T00:00:00Z',
            'created-at': '2026-01-01T00:01:00Z',
            'source-event-type': 'created',
            status: 'open',
            likelihood: 'low',
            impact: 'high',
            'baseline-score': 8,
            'residual-score': 8,
            'open-baseline-score': 8,
            'open-residual-score': 8,
          },
          {
            id: 'score-2',
            riskId: 'risk-1',
            sspId: 'ssp-1',
            occurredAt: '2026-01-02T00:00:00Z',
            createdAt: '2026-01-02T00:01:00Z',
            sourceEventType: 'score_reassessed',
            status: 'open',
            baselineScore: '8',
            residualScore: '15',
            openBaselineScore: '8',
            openResidualScore: '15',
          },
        ],
      },
    });

    expect(snapshots).toMatchObject([
      {
        id: 'score-1',
        riskId: 'risk-1',
        sspId: 'ssp-1',
        occurredAt: '2026-01-01T00:00:00Z',
        baselineScore: 8,
        residualScore: 8,
        openBaselineScore: 8,
        openResidualScore: 8,
      },
      {
        id: 'score-2',
        riskId: 'risk-1',
        sspId: 'ssp-1',
        occurredAt: '2026-01-02T00:00:00Z',
        baselineScore: 8,
        residualScore: 15,
        openBaselineScore: 8,
        openResidualScore: 15,
      },
    ]);
  });

  it('returns empty score data for empty API responses', () => {
    expect(normalizeRiskScoreTimeseries({ data: [] })).toEqual([]);
    expect(normalizeRiskScoreSnapshots({ data: [] })).toEqual([]);
  });
});
