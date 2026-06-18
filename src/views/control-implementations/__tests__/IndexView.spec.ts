import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { defineComponent, h, reactive, ref } from 'vue';
import IndexView from '../IndexView.vue';

enableAutoUnmount(afterEach);

const listProfiles = vi.fn();
const axiosGet = vi.fn();
const loadRisks = vi.fn(async () => ({ data: { value: { data: [] } } }));
const fetchControlImplementations = vi.fn();
const aiConfigState = reactive({
  dashboardSuggestionsEnabled: false,
  dashboardSuggestionsConfigFetched: false,
});
const systemStoreState = reactive({
  system: { securityPlan: { uuid: 'ssp-1' } as { uuid: string } | null },
});
const fetchDashboardSuggestionsConfig = vi.fn(async () => {
  aiConfigState.dashboardSuggestionsConfigFetched = true;
  return aiConfigState.dashboardSuggestionsEnabled;
});
let pendingDashboardSuggestionsFixture: unknown[] = [];
let controlResultsFixture: unknown[] = [];
let pendingDashboardSuggestionsReject = false;
let controlResultsReject = false;
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
  useSystemStore: () => systemStoreState,
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
      return aiConfigState.dashboardSuggestionsEnabled;
    },
    get dashboardSuggestionsConfigFetched() {
      return aiConfigState.dashboardSuggestionsConfigFetched;
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
      return {
        data: ref([]),
        isLoading: ref(false),
        error: ref(null),
        execute: loadRisks,
      };
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
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
    aiConfigState.dashboardSuggestionsEnabled = false;
    aiConfigState.dashboardSuggestionsConfigFetched = false;
    systemStoreState.system.securityPlan = { uuid: 'ssp-1' };
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
    axiosGet.mockImplementation(async (url: string) => {
      if (url.includes('/dashboard-suggestions?status=pending')) {
        if (pendingDashboardSuggestionsReject) {
          throw new Error('pending failed');
        }
        return { data: { data: pendingDashboardSuggestionsFixture } };
      }
      if (url.includes('/dashboard-suggestions/control-results')) {
        if (controlResultsReject) {
          throw new Error('results failed');
        }
        return { data: { data: controlResultsFixture } };
      }
      return { data: { data: { uuid: 'catalog-1' } } };
    });
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
    expect(axiosGet).not.toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions?status=pending'),
      expect.anything(),
    );
    expect(axiosGet).not.toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions/control-results'),
    );
  });

  it('loads core controls data before dashboard suggestions config resolves', async () => {
    const configDeferred = createDeferred<boolean>();
    fetchDashboardSuggestionsConfig.mockImplementationOnce(
      () => configDeferred.promise,
    );

    mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    expect(fetchDashboardSuggestionsConfig).toHaveBeenCalled();
    expect(listProfiles).toHaveBeenCalled();
    expect(fetchControlImplementations).toHaveBeenCalled();
    expect(axiosGet).not.toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions?status=pending'),
      expect.anything(),
    );
  });

  it('matches pending suggestions to the selected control case-insensitively', async () => {
    aiConfigState.dashboardSuggestionsEnabled = true;
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
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions?status=pending'),
      expect.objectContaining({
        camelcaseStopPaths: expect.arrayContaining([
          'data.proposed_filter_label_set',
        ]),
      }),
    );
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions/control-results'),
    );
  });

  it('loads dashboard suggestion state once when config resolution enables suggestions on mount', async () => {
    aiConfigState.dashboardSuggestionsEnabled = true;
    const configDeferred = createDeferred<void>();
    const pendingDeferred = createDeferred<{
      data: { data: unknown[] };
    }>();
    const controlResultsDeferred = createDeferred<{
      data: { data: unknown[] };
    }>();

    fetchDashboardSuggestionsConfig.mockImplementationOnce(async () => {
      await configDeferred.promise;
      aiConfigState.dashboardSuggestionsConfigFetched = true;
      return aiConfigState.dashboardSuggestionsEnabled;
    });
    axiosGet.mockImplementation((url: string) => {
      if (url.includes('/dashboard-suggestions?status=pending')) {
        return pendingDeferred.promise;
      }
      if (url.includes('/dashboard-suggestions/control-results')) {
        return controlResultsDeferred.promise;
      }
      return Promise.resolve({ data: { data: { uuid: 'catalog-1' } } });
    });

    mount(IndexView, { global: { stubs } });
    configDeferred.resolve();
    await flushPromises();

    const pendingCalls = axiosGet.mock.calls.filter(([url]) =>
      String(url).includes('/dashboard-suggestions?status=pending'),
    );
    const controlResultsCalls = axiosGet.mock.calls.filter(([url]) =>
      String(url).includes('/dashboard-suggestions/control-results'),
    );
    expect(pendingCalls).toHaveLength(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/oscal/system-security-plans/ssp-1/dashboard-suggestions?status=pending',
      ),
      expect.any(Object),
    );
    expect(controlResultsCalls).toHaveLength(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/oscal/system-security-plans/ssp-1/dashboard-suggestions/control-results',
      ),
    );

    pendingDeferred.resolve({ data: { data: [] } });
    controlResultsDeferred.resolve({ data: { data: [] } });
    await waitForMountedControls();
  });

  it('ignores stale dashboard suggestion responses after switching SSPs', async () => {
    aiConfigState.dashboardSuggestionsEnabled = true;
    aiConfigState.dashboardSuggestionsConfigFetched = true;
    const ssp1Pending = createDeferred<{ data: { data: unknown[] } }>();
    const ssp1ControlResults = createDeferred<{ data: { data: unknown[] } }>();
    const ssp2Pending = createDeferred<{ data: { data: unknown[] } }>();
    const ssp2ControlResults = createDeferred<{ data: { data: unknown[] } }>();

    axiosGet.mockImplementation((url: string) => {
      if (url.includes('/ssp-1/dashboard-suggestions?status=pending')) {
        return ssp1Pending.promise;
      }
      if (url.includes('/ssp-1/dashboard-suggestions/control-results')) {
        return ssp1ControlResults.promise;
      }
      if (url.includes('/ssp-2/dashboard-suggestions?status=pending')) {
        return ssp2Pending.promise;
      }
      if (url.includes('/ssp-2/dashboard-suggestions/control-results')) {
        return ssp2ControlResults.promise;
      }
      return Promise.resolve({ data: { data: { uuid: 'catalog-1' } } });
    });

    const wrapper = mount(IndexView, { global: { stubs } });
    await flushPromises();

    systemStoreState.system.securityPlan = { uuid: 'ssp-2' };
    await flushPromises();

    ssp2Pending.resolve({
      data: {
        data: [
          {
            id: 'suggestion-2',
            status: 'pending',
            controlId: 'AC-1',
            labelSetHash: 'hash-2',
            proposedFilterName: 'Second SSP suggestion',
          },
        ],
      },
    });
    ssp2ControlResults.resolve({ data: { data: [] } });
    await flushPromises();

    ssp1Pending.resolve({
      data: {
        data: [
          {
            id: 'suggestion-1',
            status: 'pending',
            controlId: 'AC-1',
            labelSetHash: 'hash-1',
            proposedFilterName: 'First SSP stale suggestion',
          },
        ],
      },
    });
    ssp1ControlResults.resolve({ data: { data: [] } });
    await waitForMountedControls();

    const callsBeforeDrawerOpen = axiosGet.mock.calls.length;
    const implementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'View implementation');
    await implementationButton?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Second SSP suggestion');
    expect(wrapper.text()).not.toContain('First SSP stale suggestion');
    expect(axiosGet.mock.calls).toHaveLength(callsBeforeDrawerOpen);
  });

  it('keeps pending suggestions visible when control-results cannot be fetched', async () => {
    aiConfigState.dashboardSuggestionsEnabled = true;
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
    aiConfigState.dashboardSuggestionsEnabled = true;
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
