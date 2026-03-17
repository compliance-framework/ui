import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RiskSeverityHeatmapWidget from '@/components/system-security-plans/risk-widgets/RiskSeverityHeatmapWidget.vue';
import { riskSeverityLevels } from '@/utils/risk-dashboard';

describe('RiskSeverityHeatmapWidget', () => {
  it('emits likelihood and impact filters when a cell is clicked', async () => {
    const cells = riskSeverityLevels.flatMap((likelihood) =>
      riskSeverityLevels.map((impact) => ({
        likelihood,
        impact,
        count: likelihood === 'critical' && impact === 'high' ? 3 : 0,
      })),
    );

    const wrapper = mount(RiskSeverityHeatmapWidget, {
      props: {
        cells,
        maxCount: 3,
      },
    });

    await wrapper.get('[data-testid="heatmap-critical-high"]').trigger('click');

    expect(wrapper.emitted('navigate')).toEqual([
      [{ status: 'all', likelihood: 'critical', impact: 'high' }],
    ]);
  });

  it('renders descriptive aria labels for heatmap cells', () => {
    const cells = riskSeverityLevels.flatMap((likelihood) =>
      riskSeverityLevels.map((impact) => ({
        likelihood,
        impact,
        count: likelihood === 'critical' && impact === 'high' ? 3 : 0,
      })),
    );

    const wrapper = mount(RiskSeverityHeatmapWidget, {
      props: {
        cells,
        maxCount: 3,
      },
    });

    expect(
      wrapper.get('[data-testid="heatmap-critical-high"]').attributes(),
    ).toMatchObject({
      'aria-label': 'Critical likelihood, High impact: 3 risks',
    });
  });
});
