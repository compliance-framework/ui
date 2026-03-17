import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import RiskTrendWidget from '@/components/system-security-plans/risk-widgets/RiskTrendWidget.vue';
import type { RiskTrendPoint } from '@/utils/risk-dashboard';

describe('RiskTrendWidget', () => {
  it('emits created range filters when a point is clicked', async () => {
    const points: RiskTrendPoint[] = [
      {
        date: '2026-03-01',
        count: 1,
        createdFrom: '2026-03-01T00:00:00.000Z',
        createdTo: '2026-03-01T23:59:59.999Z',
      },
      {
        date: '2026-03-02',
        count: 4,
        createdFrom: '2026-03-02T00:00:00.000Z',
        createdTo: '2026-03-02T23:59:59.999Z',
      },
    ];

    const wrapper = mount(RiskTrendWidget, {
      props: {
        rangeDays: 30,
        points,
      },
      global: {
        stubs: {
          LineChart: {
            name: 'LineChart',
            template: '<div />',
          },
          SelectButton: {
            name: 'SelectButton',
            template: '<div />',
          },
        },
      },
    });

    wrapper.findComponent({ name: 'LineChart' }).vm.$emit('element-click', 1);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('navigate')).toEqual([
      [
        {
          createdFrom: '2026-03-02T00:00:00.000Z',
          createdTo: '2026-03-02T23:59:59.999Z',
        },
      ],
    ]);
  });
});
