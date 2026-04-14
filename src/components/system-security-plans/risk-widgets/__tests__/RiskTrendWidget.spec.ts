import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RiskTrendWidget from '@/components/system-security-plans/risk-widgets/RiskTrendWidget.vue';

const apiState = vi.hoisted(() => ({
  data: { value: [] },
  error: { value: null as unknown },
  isLoading: { value: false },
  execute: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: apiState.data,
    error: apiState.error,
    isLoading: apiState.isLoading,
    execute: apiState.execute,
  }),
}));

describe('RiskTrendWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T12:00:00.000Z'));
    apiState.data.value = [];
    apiState.error.value = null;
    apiState.isLoading.value = false;
    apiState.execute.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('loads score timeseries from the provided endpoint', () => {
    const wrapper = mount(RiskTrendWidget, {
      props: {
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/score-timeseries',
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

    expect(wrapper.text()).toContain('Risk Score Trend');
    expect(wrapper.text()).not.toContain('Risks created over time');
    expect(apiState.execute).toHaveBeenCalledTimes(1);
    const endpoint = String(apiState.execute.mock.calls[0][0]);
    expect(endpoint).toContain(
      '/api/oscal/system-security-plans/ssp-1/risks/score-timeseries?',
    );
    expect(endpoint).toContain('bucket=day');
    expect(endpoint).toContain('from=2026-02-03T12%3A00%3A00.000Z');
    expect(endpoint).toContain('to=2026-03-04T12%3A00%3A00.000Z');
  });

  it('reloads score timeseries when the range changes', async () => {
    const wrapper = mount(RiskTrendWidget, {
      props: {
        endpoint: '/api/risks/score-timeseries',
      },
      global: {
        stubs: {
          LineChart: {
            name: 'LineChart',
            template: '<div />',
          },
          SelectButton: {
            name: 'SelectButton',
            template:
              '<button data-testid="range" @click="$emit(\'update:model-value\', 60)">60D</button>',
          },
        },
      },
    });

    await wrapper.get('[data-testid="range"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(apiState.execute).toHaveBeenCalledTimes(2);
    const endpoint = String(apiState.execute.mock.calls[1][0]);
    expect(endpoint).toContain('/api/risks/score-timeseries?');
    expect(endpoint).toContain('from=2026-01-04T12%3A00%3A00.000Z');
  });

  it('clears stale errors when disabled by a null endpoint', () => {
    apiState.error.value = new Error('previous request failed');

    const wrapper = mount(RiskTrendWidget, {
      props: {
        endpoint: null,
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

    expect(apiState.error.value).toBeUndefined();
    expect(wrapper.text()).not.toContain('Unable to load risk score trend.');
    expect(apiState.execute).not.toHaveBeenCalled();
  });
});
