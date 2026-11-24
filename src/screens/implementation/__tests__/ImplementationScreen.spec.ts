import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, reactive, ref } from 'vue';
import IndexView from '../ImplementationScreen.vue';

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
let pendingDashboardSuggestionsReject = false;
vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => systemStoreState,
}));

vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => ({
    listProfiles,
  }),
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

// The current route; tests set `query.tab` to switch between the Controls and Profiles tabs.
const route = vi.hoisted(() => ({ value: undefined as unknown }));
vi.mock('vue-router', async () => {
  const { reactive } = await import('vue');
  route.value = reactive({ name: 'system-implementation', query: {} });
  return {
    RouterLink: {
      name: 'RouterLink',
      props: ['to'],
      template: '<a><slot /></a>',
    },
    useRouter: () => ({
      push: vi.fn(),
      resolve: (to: { query?: Record<string, string> }) => ({
        name: 'system-implementation',
        query: to.query ?? {},
      }),
    }),
    useRoute: () => route.value,
  };
});
// Opens every closed control family, so its rows show.
const openFamilies = async (wrapper: VueWrapper) => {
  for (const button of wrapper.findAll('button[aria-expanded="false"]'))
    await button.trigger('click');
  await waitForMountedControls();
};
const showTab = async (tab?: 'profiles') => {
  (route.value as { query: Record<string, string> }).query = tab ? { tab } : {};
  await waitForMountedControls();
};

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

const toastAdd = vi.fn();
vi.mock('@/ds/toasts', () => ({
  useToast: () => ({ add: toastAdd }),
}));

vi.mock('@/ds/confirm', () => ({
  useConfirm: () => ({ require: vi.fn() }),
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

// Stands in for the real picker: tests emit `updated` from it as if a profile change saved.
const ProfilePickerStub = defineComponent({
  emits: ['updated'],
  template: '<div data-testid="profile-picker" />',
});

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  Message: { template: '<div><slot /></div>' },
  Badge: { template: '<span><slot />{{ value }}</span>', props: ['value'] },
  Chip: { template: '<span>{{ label }}</span>', props: ['label'] },
  // The design-system Button: disabled with a reason, otherwise clickable.
  Button: {
    props: ['disabledReason'],
    emits: ['click'],
    template:
      '<button :disabled="!!disabledReason" @click="!disabledReason && $emit(\'click\', $event)"><slot /></button>',
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
  Tooltip: { template: '<slot />' },
  RiskIndicatorBadge: { template: '<span />' },
  EvidencePill: { template: '<span />' },
  PageHeader: { template: '<h1><slot /></h1>' },
  PageSubHeader: { template: '<p><slot /></p>' },
  ProfilesField: ProfilePickerStub,
  NoActiveSystem: { template: '<div data-testid="no-active-system" />' },
};

describe('ImplementationScreen (the classic Implementation logic, redesigned)', () => {
  beforeEach(() => setActivePinia(createPinia()));

  beforeEach(() => {
    if (route.value) (route.value as { query: object }).query = {};
    vi.clearAllMocks();
    aiConfigState.dashboardSuggestionsEnabled = false;
    aiConfigState.dashboardSuggestionsConfigFetched = false;
    systemStoreState.system.securityPlan = { uuid: 'ssp-1' };
    pendingDashboardSuggestionsFixture = [];
    pendingDashboardSuggestionsReject = false;
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
                statements: [
                  {
                    uuid: 'stmt-1',
                    statementId: 'ac-1_smt.a',
                    byComponents: [
                      {
                        uuid: 'bc-1',
                        componentUuid: 'comp-1',
                        description: 'Statement-level implementation',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    });
  });

  // A control's suggestion count shows on its row.
  const rowText = async (wrapper: VueWrapper, controlId: string) => {
    await openFamilies(wrapper);
    return wrapper
      .findAll('li')
      .find((li) => li.find('code').text() === controlId)
      ?.text();
  };

  it('fetches no suggestions when the feature flag is disabled', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    expect(await rowText(wrapper, 'ac-1')).not.toContain('suggestion');
    expect(axiosGet).not.toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions?status=pending'),
      expect.anything(),
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

  it('matches pending suggestions to their control case-insensitively, implemented or not', async () => {
    aiConfigState.dashboardSuggestionsEnabled = true;
    pendingDashboardSuggestionsFixture = [
      {
        id: 'suggestion-1',
        status: 'pending',
        controlId: 'AC-1',
        labelSetHash: 'hash-1',
        proposedFilterName: 'Production evidence',
        proposedFilterLabelSet: { env: 'prod' },
      },
      {
        id: 'suggestion-2',
        status: 'pending',
        controlId: 'AC-2',
        labelSetHash: 'hash-2',
        proposedFilterName: 'Unimplemented control suggestion',
      },
    ];

    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    expect(await rowText(wrapper, 'ac-1')).toContain('1 suggestion');
    // ac-2 has no implementation, but its suggestion still counts.
    expect(await rowText(wrapper, 'ac-2')).toContain('1 suggestion');
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard-suggestions?status=pending'),
      expect.objectContaining({
        camelcaseStopPaths: expect.arrayContaining([
          'data.proposedFilterLabelSet',
        ]),
      }),
    );
  });

  it('loads dashboard suggestion state once when config resolution enables suggestions on mount', async () => {
    aiConfigState.dashboardSuggestionsEnabled = true;
    const configDeferred = createDeferred<void>();
    const pendingDeferred = createDeferred<{
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
      return Promise.resolve({ data: { data: { uuid: 'catalog-1' } } });
    });

    mount(IndexView, { global: { stubs } });
    configDeferred.resolve();
    await flushPromises();

    const pendingCalls = axiosGet.mock.calls.filter(([url]) =>
      String(url).includes('/dashboard-suggestions?status=pending'),
    );
    expect(pendingCalls).toHaveLength(1);
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/oscal/system-security-plans/ssp-1/dashboard-suggestions?status=pending',
      ),
      expect.any(Object),
    );

    pendingDeferred.resolve({ data: { data: [] } });
    await waitForMountedControls();
  });

  it('ignores stale dashboard suggestion responses after switching SSPs', async () => {
    aiConfigState.dashboardSuggestionsEnabled = true;
    aiConfigState.dashboardSuggestionsConfigFetched = true;
    const ssp1Pending = createDeferred<{ data: { data: unknown[] } }>();
    const ssp2Pending = createDeferred<{ data: { data: unknown[] } }>();

    axiosGet.mockImplementation((url: string) => {
      if (url.includes('/ssp-1/dashboard-suggestions?status=pending')) {
        return ssp1Pending.promise;
      }
      if (url.includes('/ssp-2/dashboard-suggestions?status=pending')) {
        return ssp2Pending.promise;
      }
      return Promise.resolve({ data: { data: { uuid: 'catalog-1' } } });
    });

    const wrapper = mount(IndexView, { global: { stubs } });
    await flushPromises();

    systemStoreState.system.securityPlan = { uuid: 'ssp-2' };
    await flushPromises();

    const suggestion = (id: string) => ({
      id,
      status: 'pending',
      controlId: 'AC-1',
      labelSetHash: id,
      proposedFilterName: id,
    });
    ssp2Pending.resolve({ data: { data: [suggestion('s-2')] } });
    await flushPromises();

    // The first SSP's late answer has two suggestions; the row must keep the second's one.
    ssp1Pending.resolve({
      data: { data: [suggestion('s-1a'), suggestion('s-1b')] },
    });
    await waitForMountedControls();

    expect(await rowText(wrapper, 'ac-1')).toContain('1 suggestion');
  });

  it('applies only the latest profile reload when picker changes overlap', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const olderReload = createDeferred<{ data: unknown[] }>();
    const newerReload = createDeferred<{ data: unknown[] }>();
    listProfiles
      .mockReturnValueOnce(olderReload.promise)
      .mockReturnValueOnce(newerReload.promise);
    axiosGet.mockClear();

    await showTab('profiles');
    const picker = wrapper.findComponent(ProfilePickerStub);
    picker.vm.$emit('updated', ['profile-old']);
    picker.vm.$emit('updated', ['profile-new']);

    // The newer request answers first, then the older one arrives late.
    newerReload.resolve({ data: [{ uuid: 'profile-new', title: 'New' }] });
    await waitForMountedControls();
    olderReload.resolve({ data: [{ uuid: 'profile-old', title: 'Old' }] });
    await waitForMountedControls();

    const resolvedUrls = axiosGet.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.endsWith('/resolved'));
    expect(resolvedUrls).toContain('/api/oscal/profiles/profile-new/resolved');
    expect(resolvedUrls).not.toContain(
      '/api/oscal/profiles/profile-old/resolved',
    );
  });

  it('keeps the current controls on screen when a profile reload fails', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();
    await openFamilies(wrapper);
    expect(wrapper.text()).toContain('Access Control');

    listProfiles.mockRejectedValueOnce(new Error('reload failed'));
    await showTab('profiles');
    wrapper.findComponent(ProfilePickerStub).vm.$emit('updated', ['profile-2']);
    await waitForMountedControls();
    await showTab();
    await openFamilies(wrapper);

    expect(wrapper.text()).toContain('Access Control');
    expect(wrapper.text()).not.toContain('No profile attached yet');
  });
});
