import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import RiskOverviewSection from '../RiskOverviewSection.vue';

const { push, get } = vi.hoisted(() => ({
  push: vi.fn(),
  get: vi.fn(async () => ({ data: { data: [] } })),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get }),
}));

// The status widget drills into the register with a filter, as the real one does.
const drillDownWidget = {
  emits: ['navigate'],
  template:
    '<button class="drill-down" @click="$emit(\'navigate\', { status: \'open\' })" />',
};
const quietWidget = { template: '<div />' };

function mountSection(props: Record<string, unknown> = {}) {
  return mount(RiskOverviewSection, {
    props: { sspId: 'ssp-1', riskListRouteName: 'risks:index', ...props },
    global: {
      stubs: {
        RiskStatusBreakdownWidget: drillDownWidget,
        RiskSeverityHeatmapWidget: quietWidget,
        OverdueReviewsWidget: quietWidget,
        TopRisksWidget: quietWidget,
        RiskTrendWidget: quietWidget,
        AcceptanceMetricsWidget: quietWidget,
      },
    },
  });
}

describe('RiskOverviewSection', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('merges registerQuery into every drill-down', async () => {
    const wrapper = mountSection({ registerQuery: { view: 'register' } });
    await flushPromises();

    await wrapper.find('.drill-down').trigger('click');

    expect(push).toHaveBeenCalledWith({
      name: 'risks:index',
      query: { status: 'open', view: 'register' },
    });
  });

  it('drills down with the filters alone when no registerQuery is given', async () => {
    const wrapper = mountSection();
    await flushPromises();

    await wrapper.find('.drill-down').trigger('click');

    expect(push).toHaveBeenCalledWith({
      name: 'risks:index',
      query: { status: 'open' },
    });
  });

  it('shows the "Open risk register" link by default', async () => {
    const wrapper = mountSection();
    await flushPromises();

    expect(wrapper.text()).toContain('Open risk register');
  });

  it('hides the register link when the section sits next to the register', async () => {
    const wrapper = mountSection({ showRegisterLink: false });
    await flushPromises();

    expect(wrapper.text()).not.toContain('Open risk register');
  });
});
