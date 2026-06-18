import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import IndexView from '../IndexView.vue';

const listProfiles = vi.fn();
const axiosGet = vi.fn();
const loadRisks = vi.fn(async () => ({ data: { value: { data: [] } } }));
const fetchControlImplementations = vi.fn();
const fetchPendingDashboardSuggestions = vi.fn();
const fetchDashboardSuggestionControlResults = vi.fn();
let dashboardSuggestionsEnabled = false;
let dashboardSuggestionsConfigFetched = false;
const fetchDashboardSuggestionsConfig = vi.fn(async () => {
  dashboardSuggestionsConfigFetched = true;
  return dashboardSuggestionsEnabled;
});
let pendingDashboardSuggestionsFixture: unknown[] = [];
let controlResultsFixture: unknown[] = [];
let pendingDashboardSuggestionsReject = false;
let controlResultsReject = false;
let useDataApiNullCallIndex = 0;
const uiStore = {
  controlImplementationDrawerOpen: false,
  controlImplementationSelectedRequirementId: null as string | null,
  controlImplementationExpandedKeys: {},
  setControlImplementationDrawerOpen: vi.fn((value: boolean) => {
    uiStore.controlImplementationDrawerOpen = value;
  }),
  setControlImplementationSelectedRequirementId: vi.fn(
    (value: string | null) => {
      uiStore.controlImplementationSelectedRequirementId = value;
    },
  ),
  setControlImplementationExpandedKeys: vi.fn((value) => {
    uiStore.controlImplementationExpandedKeys = value;
  }),
};

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: { securityPlan: { uuid: 'ssp-1' } },
  }),
}));

vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => ({
    listProfiles,
  }),
}));

vi.mock('@/stores/ui.ts', () => ({
  useUIStore: () => uiStore,
}));

vi.mock('@/stores/ai-config', () => ({
  useAiConfigStore: () => ({
    get dashboardSuggestionsEnabled() {
      return dashboardSuggestionsEnabled;
    },
    get dashboardSuggestionsConfigFetched() {
      return dashboardSuggestionsConfigFetched;
    },
    fetchDashboardSuggestionsConfig,
  }),
}));

vi.mock('vue-router', () => ({
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a><slot /></a>',
  },
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/composables/useCatalogTree', () => ({
  buildTreeNodesWithPrefix: () => [
    {
      key: 'control:ac-1',
      type: 'control',
      data: { id: 'ac-1', title: 'Access Control' },
    },
    {
      key: 'control:ac-2',
      type: 'control',
      data: { id: 'ac-2', title: 'Audit Control' },
    },
  ],
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: axiosGet, post: vi.fn() }),
  decamelizeKeys: (data: unknown) => data,
  useDataApi: (url: string | null) => {
    if (typeof url === 'string' && url.includes('control-implementation')) {
      return {
        isLoading: ref(false),
        execute: fetchControlImplementations,
      };
    }
    if (url === null) {
      const callIndex = useDataApiNullCallIndex;
      useDataApiNullCallIndex += 1;
      if (callIndex % 3 === 1) {
        const data = ref([]);
        return {
          data,
          isLoading: ref(false),
          error: ref(null),
          execute: async (...args: unknown[]) => {
            const response = await fetchPendingDashboardSuggestions(...args);
            data.value = response.data.value.data;
            return response;
          },
        };
      }
      if (callIndex % 3 === 2) {
        const data = ref([]);
        return {
          data,
          isLoading: ref(false),
          error: ref(null),
          execute: async (...args: unknown[]) => {
            const response = await fetchDashboardSuggestionControlResults(
              ...args,
            );
            data.value = response.data.value.data;
            return response;
          },
        };
      }
    }
    return {
      data: ref([]),
      isLoading: ref(false),
      error: ref(null),
      execute: loadRisks,
    };
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

vi.mock('bootstrap-icons-vue', () => ({
  BIconEye: { template: '<span />' },
}));

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForMountedControls() {
  for (let index = 0; index < 5; index += 1) {
    await flushPromises();
  }
}

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  Message: { template: '<div><slot /></div>' },
  Badge: { template: '<span><slot />{{ value }}</span>', props: ['value'] },
  Chip: { template: '<span>{{ label }}</span>', props: ['label'] },
  Button: {
    props: ['disabled', 'ariaLabel', 'title', 'label'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" :aria-label="ariaLabel" :title="title" @click="!disabled && $emit(\'click\', $event)"><slot />{{ label }}</button>',
  },
  Tree: defineComponent({
    props: ['value'],
    setup(props, { slots }) {
      function flatten(nodes: unknown[]): unknown[] {
        return nodes.flatMap((node) => {
          const item = node as { type?: string; children?: unknown[] };
          return item.type === 'control'
            ? [item]
            : flatten(item.children ?? []);
        });
      }

      return () =>
        h(
          'div',
          flatten((props.value as unknown[]) ?? []).map((node) =>
            h('div', { key: (node as { key: string }).key }, [
              slots.control?.({ node }),
            ]),
          ),
        );
    },
  }),
  Drawer: { template: '<div><slot /></div>' },
  IndexControlImplementation: { template: '<div />' },
  RiskIndicatorBadge: { template: '<span />' },
  ControlEvidenceCounter: { template: '<span />' },
  StatementByComponent: { template: '<div />' },
  PageHeader: { template: '<h1><slot /></h1>' },
  PageSubHeader: { template: '<p><slot /></p>' },
};

describe('control implementations IndexView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataApiNullCallIndex = 0;
    dashboardSuggestionsEnabled = false;
    dashboardSuggestionsConfigFetched = false;
    pendingDashboardSuggestionsFixture = [];
    controlResultsFixture = [];
    pendingDashboardSuggestionsReject = false;
    controlResultsReject = false;
    uiStore.controlImplementationDrawerOpen = false;
    uiStore.controlImplementationSelectedRequirementId = null;
    uiStore.controlImplementationExpandedKeys = {};
    listProfiles.mockResolvedValue({
      data: [{ uuid: 'profile-1', title: 'Profile One' }],
    });
    axiosGet.mockResolvedValue({ data: { data: { uuid: 'catalog-1' } } });
    fetchControlImplementations.mockResolvedValue({
      data: {
        value: {
          data: {
            implementedRequirements: [
              {
                uuid: 'req-1',
                controlId: 'ac-1',
                statements: [],
              },
            ],
          },
        },
      },
    });
    fetchPendingDashboardSuggestions.mockImplementation(async () => {
      if (pendingDashboardSuggestionsReject) {
        throw new Error('pending failed');
      }
      return {
        data: {
          value: {
            data: pendingDashboardSuggestionsFixture,
          },
        },
      };
    });
    fetchDashboardSuggestionControlResults.mockImplementation(async () => {
      if (controlResultsReject) {
        throw new Error('results failed');
      }
      return {
        data: {
          value: {
            data: controlResultsFixture,
          },
        },
      };
    });
  });

  it('disables the implementation eye button when a control has no implementation', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const noImplementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'No implementation yet');

    expect(noImplementationButton?.attributes('disabled')).toBeDefined();
    await noImplementationButton?.trigger('click');
    expect(uiStore.setControlImplementationDrawerOpen).not.toHaveBeenCalled();
  });

  it('opens the drawer with the selected requirement when an implementation exists', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const implementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'View implementation');

    expect(implementationButton).toBeDefined();
    expect(implementationButton?.attributes('disabled')).toBeUndefined();
    await implementationButton?.trigger('click');

    expect(uiStore.setControlImplementationDrawerOpen).toHaveBeenCalledWith(
      true,
    );
    expect(
      uiStore.setControlImplementationSelectedRequirementId,
    ).toHaveBeenCalledWith('req-1');
  });

  it('does not render the AI dashboard suggestions panel when the feature flag is disabled', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const implementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'View implementation');
    await implementationButton?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('AI dashboard suggestions');
    expect(fetchPendingDashboardSuggestions).not.toHaveBeenCalled();
    expect(fetchDashboardSuggestionControlResults).not.toHaveBeenCalled();
  });

  it('matches pending suggestions to the selected control case-insensitively', async () => {
    dashboardSuggestionsEnabled = true;
    pendingDashboardSuggestionsFixture = [
      {
        id: 'suggestion-1',
        status: 'pending',
        controlId: 'AC-1',
        labelSetHash: 'hash-1',
        proposedFilterName: 'Production evidence',
        proposedFilterLabelSet: { env: 'prod' },
        confidence: 0.8,
        reasoning: 'Uppercase control id still matches.',
      },
    ];

    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const implementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'View implementation');
    await implementationButton?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('AI dashboard suggestions');
    expect(wrapper.text()).toContain('Production evidence');
    expect(wrapper.text()).toContain('80% confidence');
    expect(fetchPendingDashboardSuggestions).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions?status=pending'),
      expect.objectContaining({
        camelcaseStopPaths: expect.arrayContaining([
          'data.proposedFilterLabelSet',
        ]),
      }),
    );
    expect(fetchDashboardSuggestionControlResults).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions/control-results'),
    );
  });

  it('keeps pending suggestions visible when control-results cannot be fetched', async () => {
    dashboardSuggestionsEnabled = true;
    controlResultsReject = true;
    pendingDashboardSuggestionsFixture = [
      {
        id: 'suggestion-1',
        status: 'pending',
        controlId: 'AC-1',
        labelSetHash: 'hash-1',
        proposedFilterName: 'Resilient suggestion',
      },
    ];

    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const implementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'View implementation');
    await implementationButton?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Resilient suggestion');
  });

  it('keeps no-match state visible when pending suggestions cannot be fetched', async () => {
    dashboardSuggestionsEnabled = true;
    pendingDashboardSuggestionsReject = true;
    controlResultsFixture = [
      {
        controlId: 'AC-1',
        outcome: 'no_match',
        evaluatedAt: '2026-06-18T10:30:00Z',
      },
    ];

    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const implementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'View implementation');
    await implementationButton?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain(
      'AI reviewed this control and found no matching dashboard filter',
    );
  });
});
