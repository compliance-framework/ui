import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import DiagnosticsScreen from '../DiagnosticsScreen.vue';

const state = vi.hoisted(() => ({ aiEnabled: false, fetchConfig: vi.fn() }));

vi.mock('@/stores/ai-config', () => ({
  useAiConfigStore: () => ({
    get dashboardSuggestionsEnabled() {
      return state.aiEnabled;
    },
    fetchDashboardSuggestionsConfig: state.fetchConfig,
  }),
}));

async function mountScreen() {
  const Section = { render: () => h('p', 'section') };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/diagnostics',
        component: DiagnosticsScreen,
        children: [
          {
            path: 'notifications',
            name: 'admin-diagnostics-notifications',
            component: Section,
          },
          {
            path: 'ai-suggestions',
            name: 'admin-diagnostics-ai-suggestions',
            component: Section,
          },
        ],
      },
    ],
  });
  await router.push('/admin/diagnostics/notifications');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(DiagnosticsScreen)),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return wrapper;
}

const tabLabels = (wrapper: Awaited<ReturnType<typeof mountScreen>>) =>
  wrapper
    .find('[role="tablist"]')
    .findAll('[role="tab"]')
    .map((tab) => tab.text());

describe('DiagnosticsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.aiEnabled = false;
    state.fetchConfig.mockReset().mockResolvedValue(false);
  });

  it('hides the AI suggestions tab when the feature is off', async () => {
    const wrapper = await mountScreen();
    expect(wrapper.find('h1').text()).toBe('Diagnostics');
    expect(tabLabels(wrapper)).toEqual(['Notifications']);
    expect(state.fetchConfig).toHaveBeenCalled();
  });

  it('shows the AI suggestions tab when the feature is on', async () => {
    state.aiEnabled = true;
    const wrapper = await mountScreen();
    expect(tabLabels(wrapper)).toEqual(['Notifications', 'AI suggestions']);
  });
});
