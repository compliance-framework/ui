import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { SystemSecurityPlan } from '@/oscal';
import SuggestionScopeDialog from '../partials/SuggestionScopeDialog.vue';

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

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
  },
  useRoute: () => ({ params: { sspId: 'ssp-1' } }),
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
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

vi.mock('@/composables/useDashboardSuggestions', () => ({
  useDashboardSuggestions: () => ({
    pendingSuggestions: state.pendingSuggestions,
    historySuggestions: state.historySuggestions,
    labelSets: state.labelSets,
    labelKeys: { value: [] },
    pendingSuggestionsLoading: { value: false },
    historySuggestionsLoading: { value: false },
    generating: { value: false },
    generalizing: { value: false },
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
    run: { value: undefined },
    progressPercent: { value: 0 },
    pollLatest: state.pollLatest,
    start: state.start,
  }),
}));

import SuggestionsView from '../SuggestionsView.vue';

function mountView() {
  return mount(SuggestionsView, {
    global: {
      stubs: {
        PageHeader: { template: '<h1><slot /></h1>' },
        PageSubHeader: { template: '<p><slot /></p>' },
        PageCard: { template: '<section><slot /></section>' },
        Chip: { props: ['label'], template: '<span>{{ label }}</span>' },
        Message: { template: '<div><slot /></div>' },
        SuggestionScopeDialog: {
          name: 'SuggestionScopeDialog',
          props: ['controls'],
          template:
            '<div><span v-for="control in controls" :key="control.value">{{ control.label }}</span></div>',
        },
        SuggestionEditDialog: {
          name: 'SuggestionEditDialog',
          props: ['group', 'controlOptions'],
          template: '<div />',
        },
        Dialog: { template: '<div><slot /><slot name="footer" /></div>' },
        Textarea: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        PrimaryButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        SecondaryButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
}

describe('SuggestionsView', () => {
  beforeEach(() => {
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

  it('groups pending suggestions by labelSetHash and expands reasoning', async () => {
    const wrapper = mountView();

    expect(wrapper.findAll('[data-testid^="suggestion-group-"]')).toHaveLength(
      1,
    );
    expect(wrapper.text()).toContain('Production access');
    expect(wrapper.text()).toContain('AC-1');
    expect(wrapper.text()).toContain('_agent=scanner');
    expect(wrapper.text()).toContain('env=prod');

    const evidenceLink = wrapper.find('a[data-to]');
    expect(evidenceLink.text()).toContain('7 matched evidence');
    expect(JSON.parse(evidenceLink.attributes('data-to') ?? '{}')).toEqual({
      name: 'evidence:index',
      query: { filter: '_agent=scanner and env=prod' },
    });

    const reasoningButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reasoning'));
    await reasoningButton?.trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('Fits AC-1 and is relevant to payments');
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
        sampleTitles: ['todo-app evidence'],
      },
      {
        hash: 'full-hash-2',
        labels: { _policy: policy, repository: 'api' },
        evidenceCount: 4,
        sampleTitles: ['api evidence'],
      },
      {
        hash: 'full-hash-3',
        labels: { _policy: 'other.policy', repository: 'api' },
        evidenceCount: 9,
        sampleTitles: ['unrelated evidence'],
      },
    ];

    const wrapper = mountView();

    expect(wrapper.findAll('[data-testid^="suggestion-group-"]')).toHaveLength(
      1,
    );
    // Chips and link use the proposed filter, not the full originating label set.
    expect(wrapper.text()).toContain(`_policy=${policy}`);
    expect(wrapper.text()).not.toContain('repository=todo-app');

    const evidenceLink = wrapper.find('a[data-to]');
    // Sums evidence across every label set that is a superset of the filter.
    expect(evidenceLink.text()).toContain('7 matched evidence');
    expect(JSON.parse(evidenceLink.attributes('data-to') ?? '{}')).toEqual({
      name: 'evidence:index',
      query: { filter: `_policy=${policy}` },
    });
  });

  it('wires group accept and reject reason payloads', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Accept group')
      ?.trigger('click');
    expect(state.acceptSuggestions).toHaveBeenCalledWith(['sug-1', 'sug-2']);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Reject group')
      ?.trigger('click');
    await wrapper.find('textarea').setValue('Not useful');
    await wrapper
      .findAll('button')
      .filter((button) => button.text() === 'Reject')
      .at(-1)
      ?.trigger('click');

    expect(state.rejectSuggestions).toHaveBeenCalledWith(
      ['sug-1', 'sug-2'],
      'Not useful',
    );
  });

  it('refreshes and polls suggestions when the config is enabled', async () => {
    state.aiEnabled = true;
    state.aiFetched = false;
    state.fetchConfig.mockImplementation(async () => {
      state.aiFetched = true;
      return true;
    });

    mountView();
    await flushPromises();

    expect(state.refreshLabelSets).toHaveBeenCalled();
    expect(state.refreshHistorySuggestions).toHaveBeenCalled();
    expect(state.pollLatest).toHaveBeenCalled();
  });

  it('enriches scope control options with catalog titles and profile membership', async () => {
    const wrapper = mountView();
    await flushPromises();

    const controls = wrapper
      .findComponent(SuggestionScopeDialog)
      .props('controls') as Array<{
      label: string;
      value: string;
      controlId: string;
      title: string;
      catalogTitle: string;
      profileTitles: string[];
    }>;

    // The option value is the catalog-qualified control key the scope API expects.
    expect(controls).toContainEqual({
      label: 'ac-1 - Access control policy',
      value: 'catalog-1:ac-1',
      controlId: 'ac-1',
      title: 'Access control policy',
      catalogTitle: 'Catalog',
      profileTitles: ['Moderate Baseline'],
    });
    expect(controls).toContainEqual({
      label: 'AC-2 - Account management',
      value: 'catalog-1:AC-2',
      controlId: 'AC-2',
      title: 'Account management',
      catalogTitle: 'Catalog',
      profileTitles: ['Moderate Baseline'],
    });
    expect(state.axiosGet).not.toHaveBeenCalledWith(
      '/api/oscal/catalogs/catalog-1/full',
    );
  });

  it('does not poll or refresh suggestions when the config is disabled', async () => {
    state.aiEnabled = false;
    state.aiFetched = false;
    state.fetchConfig.mockImplementation(async () => {
      state.aiFetched = true;
      return false;
    });

    const wrapper = mountView();
    await flushPromises();
    await wrapper.vm.$forceUpdate();
    await nextTick();

    expect(wrapper.text()).toContain(
      'AI is not configured, so dashboard suggestions cannot be generated.',
    );
    expect(state.refreshLabelSets).not.toHaveBeenCalled();
    expect(state.refreshHistorySuggestions).not.toHaveBeenCalled();
    expect(state.pollLatest).not.toHaveBeenCalled();
    expect(state.start).not.toHaveBeenCalled();
  });
});
