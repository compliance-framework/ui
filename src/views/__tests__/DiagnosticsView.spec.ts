import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  aiEnabled: false,
  aiFetched: true,
  fetchConfig: vi.fn(),
  routeName: 'admin-diagnostics-notifications',
}));

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
  },
  RouterView: { template: '<main />' },
  useRoute: () => ({
    get name() {
      return state.routeName;
    },
  }),
}));

vi.mock('@/stores/ai-config', () => ({
  useAiConfigStore: () => ({
    get dashboardSuggestionsEnabled() {
      return state.aiEnabled;
    },
    get dashboardSuggestionsConfigFetched() {
      return state.aiFetched;
    },
    fetchDashboardSuggestionsConfig: state.fetchConfig,
  }),
}));

import DiagnosticsView from '../admin/DiagnosticsView.vue';

function mountView() {
  return mount(DiagnosticsView, {
    global: {
      stubs: {
        PageHeader: { template: '<h1><slot /></h1>' },
        PageSubHeader: { template: '<p><slot /></p>' },
        Message: { template: '<div><slot /></div>' },
      },
    },
  });
}

describe('DiagnosticsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.aiEnabled = false;
    state.aiFetched = true;
    state.fetchConfig.mockResolvedValue(false);
  });

  it('hides the AI Suggestions tab when the feature flag is disabled', () => {
    const wrapper = mountView();

    expect(wrapper.text()).toContain('Diagnostics');
    expect(wrapper.text()).toContain('Notifications');
    expect(wrapper.text()).not.toContain('AI Suggestions');
  });

  it('shows the AI Suggestions tab when the feature flag is enabled', () => {
    state.aiEnabled = true;

    const wrapper = mountView();

    expect(wrapper.text()).toContain('AI Suggestions');
  });
});
