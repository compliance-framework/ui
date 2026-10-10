import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TopRisksWidget from '@/components/system-security-plans/risk-widgets/TopRisksWidget.vue';
import type { TopRiskItem } from '@/utils/risk-dashboard';

describe('TopRisksWidget', () => {
  it('emits riskId filter when a top risk entry is clicked', async () => {
    const items: TopRiskItem[] = [
      {
        id: 'risk-1',
        title: 'Critical exposure',
        impact: 'critical',
        likelihood: 'high',
      },
    ];

    const wrapper = mount(TopRisksWidget, {
      props: {
        items,
      },
    });

    await wrapper.get('[data-testid="top-risk-risk-1"]').trigger('click');

    expect(wrapper.emitted('navigate')).toEqual([[{ riskId: 'risk-1' }]]);
  });
});
