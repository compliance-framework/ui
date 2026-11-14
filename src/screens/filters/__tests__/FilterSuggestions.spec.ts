import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import type { SystemSecurityPlan } from '@/oscal';

const state = vi.hoisted(() => ({
  pendingSuggestions: { value: [] as unknown[] },
  historySuggestions: { value: [] as unknown[] },
  labelSets: { value: [] as unknown[] },
  ssp: { value: undefined as unknown },
  acceptSuggestions: vi.fn(),
  rejectSuggestions: vi.fn(),
  generateSuggestions: vi.fn(),
  generalizeSuggestions: vi.fn(),
  toastAdd: vi.fn(),
  fetchSuggestionEvents: vi.fn(),
  refreshPendingSuggestions: vi.fn(),
  refreshHistorySuggestions: vi.fn(),
  refreshLabelSets: vi.fn(),
  refreshLabelKeys: vi.fn(),
  pollLatest: vi.fn(),
  start: vi.fn(),
  axiosGet: vi.fn(),
  fetchConfig: vi.fn(),
  aiEnabled: true,
  aiFetched: true,
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
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

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: state.axiosGet }),
  useDataApi: () => ({ data: state.ssp }),
  decamelizeKeys: (data: unknown) => data,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

// Real refs, made from the fixture when the page calls the composables.
vi.mock('@/composables/useDashboardSuggestions', async () => {
  const { ref } = await import('vue');
  return {
    useDashboardSuggestions: () => ({
      pendingSuggestions: ref(state.pendingSuggestions.value),
      historySuggestions: ref(state.historySuggestions.value),
      labelSets: ref(state.labelSets.value),
      labelKeys: ref([]),
      pendingSuggestionsLoading: ref(false),
      historySuggestionsLoading: ref(false),
      generating: ref(false),
      generalizing: ref(false),
      editingGroup: ref(false),
      refreshPendingSuggestions: state.refreshPendingSuggestions,
      refreshHistorySuggestions: state.refreshHistorySuggestions,
      refreshLabelSets: state.refreshLabelSets,
      refreshLabelKeys: state.refreshLabelKeys,
      generateSuggestions: state.generateSuggestions,
      generalizeSuggestions: state.generalizeSuggestions,
      acceptSuggestions: state.acceptSuggestions,
      rejectSuggestions: state.rejectSuggestions,
      fetchSuggestionEvents: state.fetchSuggestionEvents,
    }),
    useSuggestionRunPoller: () => ({
      run: ref(undefined),
      progressPercent: ref(0),
      pollLatest: state.pollLatest,
      start: state.start,
    }),
  };
});

import FilterSuggestions from '../FilterSuggestions.vue';

async function mountView(path = '/dashboards/suggestions/ssp-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboards/suggestions/:sspId', component: FilterSuggestions },
      {
        path: '/evidence',
        name: 'evidence:index',
        component: { render: () => null },
      },
    ],
  });
  await router.push(path);
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(RouterView)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text() === text)!;

describe('FilterSuggestions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.aiEnabled = true;
    state.aiFetched = true;
    state.fetchConfig.mockImplementation(async () => {
      state.aiFetched = true;
      return state.aiEnabled;
    });
    state.ssp.value = {
      uuid: 'ssp-1',
      metadata: { title: 'Payments SSP' },
      controlImplementation: {
        implementedRequirements: [{ controlId: 'ac-1' }, { controlId: 'AC-2' }],
      },
    } as unknown as SystemSecurityPlan;
    state.pendingSuggestions.value = [
      {
        id: 'sug-1',
        status: 'pending',
        controlId: 'AC-1',
        controlTitle: 'Access control policy',
        labelSetHash: 'hash-1',
        confidence: 0.91,
        reasoning: 'Fits AC-1 and is relevant to payments',
        action: 'create',
        proposedFilterName: 'Production access',
      },
      {
        id: 'sug-2',
        status: 'pending',
        controlId: 'AC-2',
        controlTitle: 'Account management',
        labelSetHash: 'hash-1',
        confidence: 0.8,
        reasoning: 'Fits AC-2 and is relevant to accounts',
        action: 'create',
        proposedFilterName: 'Production access',
      },
    ];
    state.labelSets.value = [
      {
        hash: 'hash-1',
        labels: { _agent: 'scanner', env: 'prod' },
        evidenceCount: 7,
        sampleTitles: ['Scanner evidence'],
      },
    ];
    state.historySuggestions.value = [];
    state.fetchSuggestionEvents.mockResolvedValue([]);
    state.axiosGet.mockImplementation(async (url: string) => {
      if (url === '/api/oscal/catalogs') {
        return {
          data: {
            data: [{ uuid: 'catalog-1', metadata: { title: 'Catalog' } }],
          },
        };
      }
      if (url === '/api/oscal/catalogs/catalog-1/full') {
        return {
          data: {
            data: {
              uuid: 'catalog-1',
              metadata: { title: 'Catalog' },
              groups: [
                {
                  id: 'ac',
                  title: 'Access Control',
                  controls: [
                    { id: 'AC-1', title: 'Access control policy' },
                    { id: 'AC-2', title: 'Account management' },
                  ],
                },
              ],
            },
          },
        };
      }
      if (url === '/api/oscal/system-security-plans/ssp-1/profiles') {
        return {
          data: {
            data: [{ uuid: 'profile-1', title: 'Moderate Baseline' }],
          },
        };
      }
      if (url === '/api/oscal/profiles/profile-1/resolved-with-catalogs') {
        return {
          data: {
            data: [
              {
                controlId: 'AC-1',
                title: 'Access control policy',
                catalogId: 'catalog-1',
              },
              {
                controlId: 'AC-2',
                title: 'Account management',
                catalogId: 'catalog-1',
              },
            ],
          },
        };
      }
      throw new Error(`Unexpected axios get: ${url}`);
    });
  });

  it('groups pending suggestions by label set, with their reasoning', async () => {
    const { wrapper } = await mountView();
    expect(wrapper.findAll('[data-testid^="suggestion-group-"]')).toHaveLength(
      1,
    );
    expect(wrapper.text()).toContain('Production access');
    expect(wrapper.text()).toContain('AC-1');
    expect(wrapper.text()).toContain('_agent=scanner');
    expect(wrapper.text()).toContain('env=prod');
    const link = wrapper.find('a[href*="/evidence"]');
    expect(link.text()).toContain('7 matched evidence');
    expect(
      decodeURIComponent(link.attributes('href')!.replace(/\+/g, ' ')),
    ).toContain('filter=_agent=scanner and env=prod');
    await wrapper
      .findAll('button[aria-expanded]')
      .find((b) => b.text().includes('Reasoning for AC-1'))!
      .trigger('click');
    expect(wrapper.text()).toContain('Fits AC-1 and is relevant to payments');
    wrapper.unmount();
  });

  it('labels, links and counts groups by the proposed filter label set', async () => {
    const policy =
      'compliance_framework.secret_scanning_push_protection_enabled';
    state.pendingSuggestions.value = [
      {
        id: 'sug-1',
        status: 'pending',
        controlId: 'GD.Conf.C05',
        controlTitle: 'Detect and Block Secret Leakage',
        labelSetHash: 'full-hash-1',
        labelSet: { _policy: policy, repository: 'todo-app', team: 'ccf' },
        proposedFilterLabelSet: { _policy: policy },
        confidence: 0.95,
        action: 'create',
        proposedFilterName: 'Secret scanning push protection enabled',
      },
    ];
    state.labelSets.value = [
      {
        hash: 'full-hash-1',
        labels: { _policy: policy, repository: 'todo-app' },
        evidenceCount: 3,
        sampleTitles: [],
      },
      {
        hash: 'full-hash-2',
        labels: { _policy: policy, repository: 'api' },
        evidenceCount: 4,
        sampleTitles: [],
      },
      {
        hash: 'full-hash-3',
        labels: { _policy: 'other.policy', repository: 'api' },
        evidenceCount: 9,
        sampleTitles: [],
      },
    ];
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain(`_policy=${policy}`);
    expect(wrapper.text()).not.toContain('repository=todo-app');
    expect(wrapper.find('a[href*="/evidence"]').text()).toContain(
      '7 matched evidence',
    );
    wrapper.unmount();
  });

  it('accepts a group, and rejects it with a reason', async () => {
    const { wrapper } = await mountView();
    await button(wrapper, 'Accept group').trigger('click');
    expect(state.acceptSuggestions).toHaveBeenCalledWith(['sug-1', 'sug-2']);
    await button(wrapper, 'Reject group').trigger('click');
    await flushPromises();
    const textarea = document.querySelector<HTMLTextAreaElement>(
      '[role="dialog"] textarea',
    )!;
    textarea.value = 'Not useful';
    textarea.dispatchEvent(new Event('input'));
    document
      .querySelector<HTMLFormElement>('[role="dialog"] form')!
      .dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(state.rejectSuggestions).toHaveBeenCalledWith(
      ['sug-1', 'sug-2'],
      'Not useful',
    );
    wrapper.unmount();
  });

  it('accepts a selection', async () => {
    const { wrapper } = await mountView();
    const box = wrapper
      .findAll('label')
      .find((l) => l.text().startsWith('AC-1'))!;
    await wrapper.find(`[id="${box.attributes('for')}"]`).setValue(true);
    expect(wrapper.text()).toContain('1 selected');
    await button(wrapper, 'Accept selected').trigger('click');
    expect(state.acceptSuggestions).toHaveBeenCalledWith(['sug-1']);
    wrapper.unmount();
  });

  it('refreshes and polls suggestions when the config is enabled', async () => {
    state.aiFetched = false;
    state.fetchConfig.mockImplementation(async () => {
      state.aiFetched = true;
      return true;
    });
    const { wrapper } = await mountView();
    expect(state.refreshLabelSets).toHaveBeenCalled();
    expect(state.refreshHistorySuggestions).toHaveBeenCalled();
    expect(state.pollLatest).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('enriches the control options with catalog titles and profile membership', async () => {
    const { wrapper } = await mountView();
    const vm = wrapper.findComponent(FilterSuggestions).vm as unknown as {
      controlOptions: unknown[];
    };
    expect(vm.controlOptions).toContainEqual({
      label: 'ac-1 - Access control policy',
      value: 'catalog-1:ac-1',
      controlId: 'ac-1',
      title: 'Access control policy',
      catalogTitle: 'Catalog',
      profileTitles: ['Moderate Baseline'],
    });
    expect(state.axiosGet).not.toHaveBeenCalledWith(
      '/api/oscal/catalogs/catalog-1/full',
    );
    wrapper.unmount();
  });

  it('shows the history tab from the address', async () => {
    state.historySuggestions.value = [
      {
        id: 'h-1',
        status: 'accepted',
        controlId: 'AC-3',
        controlTitle: 'Access enforcement',
        proposedFilterName: 'Old filter',
      },
    ];
    const { wrapper } = await mountView(
      '/dashboards/suggestions/ssp-1?tab=history',
    );
    expect(wrapper.text()).toContain('AC-3 Access enforcement');
    expect(wrapper.text()).toContain('accepted · Old filter');
    wrapper.unmount();
  });

  it('does not poll or refresh suggestions when AI is not configured', async () => {
    state.aiEnabled = false;
    state.aiFetched = false;
    state.fetchConfig.mockImplementation(async () => {
      state.aiFetched = true;
      return false;
    });
    const { wrapper } = await mountView();
    await wrapper.findComponent(FilterSuggestions).vm.$forceUpdate();
    await nextTick();
    expect(wrapper.text()).toContain("AI isn't configured");
    expect(state.refreshLabelSets).not.toHaveBeenCalled();
    expect(state.pollLatest).not.toHaveBeenCalled();
    expect(state.start).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
