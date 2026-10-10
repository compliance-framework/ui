import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RiskScoreHistoryWidget from '@/components/risk/RiskScoreHistoryWidget.vue';
import type { RiskScoreSnapshot } from '@/utils/risk-dashboard';

function makeSnapshot(
  overrides: Partial<RiskScoreSnapshot>,
): RiskScoreSnapshot {
  return {
    id: 'score-default',
    riskId: 'risk-1',
    sspId: 'ssp-1',
    occurredAt: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:01:00Z',
    sourceEventType: 'created',
    status: 'open',
    baselineScore: 4,
    residualScore: 4,
    openBaselineScore: 4,
    openResidualScore: 4,
    ...overrides,
  };
}

describe('RiskScoreHistoryWidget', () => {
  it('sorts snapshots chronologically for chart data and latest metadata', () => {
    const wrapper = mount(RiskScoreHistoryWidget, {
      props: {
        snapshots: [
          makeSnapshot({
            id: 'newest',
            occurredAt: '2026-03-03T00:00:00Z',
            sourceEventType: 'score_reassessed',
            likelihood: 'critical',
            impact: 'high',
            baselineScore: 4,
            residualScore: 15,
          }),
          makeSnapshot({
            id: 'oldest',
            occurredAt: '2026-03-01T00:00:00Z',
            sourceEventType: 'created',
            likelihood: 'low',
            impact: 'low',
            baselineScore: 4,
            residualScore: 4,
          }),
        ],
      },
      global: {
        stubs: {
          LineChart: {
            name: 'LineChart',
            props: ['data', 'options'],
            template: '<div />',
          },
        },
      },
    });

    const chart = wrapper.findComponent({ name: 'LineChart' });
    expect(chart.props('data')).toMatchObject({
      labels: ['2026-03-01', '2026-03-03'],
      datasets: [{ data: [4, 4] }, { data: [4, 15] }],
    });
    expect(wrapper.text()).toContain('Residual 15');
    expect(wrapper.text()).toContain('Score Reassessed');
    expect(wrapper.text()).toContain('Critical');
  });
});
