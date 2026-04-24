import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import IndexView from '../IndexView.vue';
import type { Evidence } from '@/stores/evidence.ts';

const {
  routeState,
  replaceMock,
  pushMock,
  toastAdd,
  evidenceSearchPost,
  loadComplianceOverTime,
  loadHeartbeats,
  uiStore: uiStoreState,
  configStore,
} = vi.hoisted(() => {
  const baseEvidence: Evidence[] = Array.from({ length: 55 }, (_, index) => ({
    id: `evidence-${index + 1}`,
    uuid: `uuid-${index + 1}`,
    title: `Evidence ${String(index + 1).padStart(2, '0')}`,
    description: `Description ${index + 1}`,
    start: `2026-04-${String((index % 28) + 1).padStart(2, '0')}T00:00:00Z`,
    end: `2026-04-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
    status: {
      reason: 'ok',
      state: 'satisfied',
    },
    labels: [],
    activities: [],
  }));
  const exportableEvidence: Evidence[] = [
    {
      id: 'export-1',
      uuid: 'export-uuid-1',
      title: 'Export Evidence 1',
      description: 'Primary export row',
      start: '2026-04-01T00:00:00Z',
      end: '2026-04-01T12:00:00Z',
      expires: '2026-05-01T00:00:00Z',
      status: {
        reason: 'fresh',
        state: 'satisfied',
      },
      labels: [
        { name: 'resource_id', value: 'arn:aws:iam::123456789012:role/Export' },
        { name: 'account_id', value: '123456789012' },
      ],
      activities: [],
    },
    {
      id: 'export-2',
      uuid: 'export-uuid-2',
      title: '=CSV Injection',
      description: 'Secondary export row',
      start: '2026-04-02T00:00:00Z',
      end: '2026-04-02T12:00:00Z',
      status: {
        reason: 'stale',
        state: 'not-satisfied',
      },
      labels: [{ name: 'owner', value: 'security' }],
      activities: [],
    },
    ...Array.from({ length: 133 }, (_, index) => ({
      id: `export-${index + 3}`,
      uuid: `export-uuid-${index + 3}`,
      title: `Export Evidence ${index + 3}`,
      description: `Generated export row ${index + 3}`,
      start: '2026-04-03T00:00:00Z',
      end: '2026-04-03T12:00:00Z',
      status: {
        reason: 'generated',
        state: 'satisfied',
      },
      labels: [{ name: 'batch', value: `batch-${index + 1}` }],
      activities: [],
    })),
  ];
  const hugeExportableEvidence: Evidence[] = Array.from(
    { length: 1001 },
    (_, index) => ({
      id: `huge-export-${index + 1}`,
      uuid: `huge-export-uuid-${index + 1}`,
      title: `Huge Export Evidence ${index + 1}`,
      description: `Huge export row ${index + 1}`,
      start: '2026-04-04T00:00:00Z',
      end: '2026-04-04T12:00:00Z',
      status: {
        reason: 'bulk',
        state: 'satisfied',
      },
      labels: [{ name: 'batch', value: `huge-${index + 1}` }],
      activities: [],
    }),
  );

  return {
    routeState: {
      query: {} as Record<string, string | undefined>,
    },
    replaceMock: vi.fn(),
    pushMock: vi.fn(),
    toastAdd: vi.fn(),
    evidenceSearchPost: vi.fn(async (url: string) => {
      const searchParams = new URL(url, 'http://localhost').searchParams;
      const page = Number(searchParams.get('page') || '1');
      const limit = Number(searchParams.get('limit') || '50');
      const filterText = routeState.query.filter ?? '';
      const name = searchParams.get('name') ?? '';

      if (filterText.includes('broken')) {
        throw new Error('search failed');
      }

      let data = baseEvidence;
      if (filterText.includes('recent') || name.includes('recent')) {
        data = [
          {
            id: 'filtered-evidence',
            uuid: 'filtered-uuid',
            title: 'Recent Evidence',
            description: 'Recent evidence row',
            start: '2026-05-01T00:00:00Z',
            end: '2026-05-01T12:00:00Z',
            status: {
              reason: 'fresh',
              state: 'satisfied',
            },
            labels: [],
            activities: [],
          },
        ];
      }
      if (filterText.includes('exportable') || name.includes('exportable')) {
        data = exportableEvidence;
      }
      if (filterText.includes('huge-export') || name.includes('huge-export')) {
        data = hugeExportableEvidence;
      }

      const start = (page - 1) * limit;
      const pageItems = data.slice(start, start + limit);

      return {
        data: {
          data: pageItems,
          total: data.length,
          page,
          limit,
          totalPages: Math.max(Math.ceil(data.length / limit), 1),
        },
      };
    }),
    loadComplianceOverTime: vi.fn(async () => ({})),
    loadHeartbeats: vi.fn(async () => ({})),
    uiStore: {
      evidenceFilter: '',
      setEvidenceFilter: vi.fn(),
    },
    configStore: {
      showLabels: true,
      showHiddenLabels: false,
      toggleLabels: vi.fn(),
      toggleHiddenLabels: vi.fn(),
    },
  };
});

const routeMock = reactive(routeState);
const uiStore = reactive(uiStoreState);
uiStore.setEvidenceFilter = vi.fn((value: string) => {
  uiStore.evidenceFilter = value;
});
const complianceData = ref([]);
const heartbeatData = ref([]);
const mountedWrappers: Array<ReturnType<typeof mount>> = [];
const EVIDENCE_STATUS_INTERVAL =
  '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h';

replaceMock.mockImplementation(
  async ({ query }: { query: Record<string, string> }) => {
    routeMock.query = query;
  },
);

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}));

vi.mock('@/stores/ui.ts', () => ({
  useUIStore: () => uiStore,
}));

vi.mock('@/stores/config.ts', () => ({
  useConfigStore: () => configStore,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
  }),
}));

vi.mock('@/parsers/findings.ts', () => ({
  calculateComplianceOverTimeData: () => ({
    datasets: [],
    labels: [],
  }),
}));

vi.mock('@/parsers/heartbeats.ts', () => ({
  calculateHeartbeatOverTimeData: () => ({
    datasets: [],
    labels: [],
  }),
}));

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');

  return {
    useAuthenticatedInstance: () => ({
      post: evidenceSearchPost,
    }),
    useDataApi: (
      url?: string | null,
      config?: {
        method?: string;
      },
    ) => {
      if (
        url === '/api/evidence/status-over-time' &&
        config?.method === 'POST'
      ) {
        return {
          data: complianceData,
          execute: loadComplianceOverTime,
        };
      }

      if (
        url === '/api/agent/heartbeat/over-time' &&
        config?.method === 'GET'
      ) {
        return {
          data: heartbeatData,
          execute: loadHeartbeats,
        };
      }

      return {
        data: ref(undefined),
        execute: vi.fn(async () => ({})),
      };
    },
  };
});

describe('Evidence IndexView', () => {
  beforeEach(async () => {
    routeMock.query = {};
    uiStore.evidenceFilter = '';
    await flushPromises();
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const wrapper of mountedWrappers) {
      wrapper.unmount();
    }
    mountedWrappers.length = 0;
    vi.useRealTimers();
  });

  function mountView() {
    const wrapper = mount(IndexView, {
      global: {
        directives: {
          tooltip: {
            mounted() {
              return;
            },
          },
        },
        stubs: {
          PageHeader: { template: '<h1><slot /></h1>' },
          PageSubHeader: { template: '<h2><slot /></h2>' },
          PageCard: { template: '<section><slot /></section>' },
          Message: {
            props: ['severity'],
            template: '<div><slot /></div>',
          },
          ResultComplianceOverTimeChart: {
            template: '<div>Chart</div>',
          },
          SecondaryButton: {
            props: ['type', 'disabled'],
            emits: ['click'],
            template:
              '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
          },
          PrimaryButton: {
            props: ['type', 'disabled'],
            emits: ['click'],
            template:
              '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
          },
          TertiaryButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button type="button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
          },
          BurgerMenu: {
            props: ['items'],
            template: '<div>Menu</div>',
          },
          EvidenceList: {
            props: ['evidence', 'sortBy', 'sortDirection', 'navigationQuery'],
            emits: ['sort'],
            template: `
              <div>
                <output data-testid="navigation-query">
                  {{ JSON.stringify(navigationQuery) }}
                </output>
                <button
                  type="button"
                  data-testid="sort-status"
                  @click="$emit('sort', 'status')"
                >
                  Status
                </button>
                <button
                  type="button"
                  data-testid="sort-evidence-name"
                  @click="$emit('sort', 'name')"
                >
                  Evidence Name
                </button>
                <button
                  type="button"
                  data-testid="sort-last-seen-at"
                  @click="$emit('sort', 'lastSeenAt')"
                >
                  Last Seen At
                </button>
                <ul>
                  <li v-for="item in evidence" :key="item.id">{{ item.title }}</li>
                </ul>
              </div>
            `,
          },
          InfoCircleIcon: {
            template: '<span>i</span>',
          },
          BIconSearch: {
            template: '<span>search</span>',
          },
          BIconShare: {
            template: '<span>share</span>',
          },
          BIconDownload: {
            template: '<span>download</span>',
          },
        },
      },
    });
    mountedWrappers.push(wrapper);
    return wrapper;
  }

  async function waitForSearchDebounce() {
    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();
  }

  it('loads all evidence on mount when the search is empty', async () => {
    const wrapper = mountView();

    await flushPromises();

    expect(evidenceSearchPost).toHaveBeenCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc',
      expect.any(Object),
    );
    expect(loadComplianceOverTime).toHaveBeenCalledWith({
      data: {
        filter: {
          scope: {},
        },
      },
      params: {
        interval: EVIDENCE_STATUS_INTERVAL,
      },
    });
    expect(loadHeartbeats).toHaveBeenCalled();

    expect(wrapper.text()).toContain('Evidence 01');
    expect(wrapper.text()).toContain('Evidence 50');
    expect(wrapper.text()).not.toContain('Evidence 51');
    expect(wrapper.text()).toContain('Showing 1-50 of 55');
    expect(wrapper.text()).toContain('Page 1 of 2');
  });

  it('loads the first evidence page for a valid initial search and renders pagination summary', async () => {
    routeMock.query = {
      filter: 'abc',
    };

    const wrapper = mountView();

    await flushPromises();

    expect(evidenceSearchPost).toHaveBeenCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc&name=abc',
      expect.any(Object),
    );
    expect(loadComplianceOverTime).toHaveBeenCalledWith({
      data: {
        filter: {
          scope: {},
        },
      },
      params: {
        interval: EVIDENCE_STATUS_INTERVAL,
        name: 'abc',
      },
    });
    expect(loadHeartbeats).toHaveBeenCalled();

    expect(wrapper.text()).toContain('Evidence 01');
    expect(wrapper.text()).toContain('Evidence 50');
    expect(wrapper.text()).not.toContain('Evidence 51');
    expect(wrapper.text()).toContain('Showing 1-50 of 55');
    expect(wrapper.text()).toContain('Page 1 of 2');
  });

  it('clears an invalid initial route filter and falls back to the unfiltered search', async () => {
    routeMock.query = {
      filter: 'ab',
    };

    const wrapper = mountView();

    await flushPromises();

    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        filter: undefined,
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc',
      expect.any(Object),
    );
    expect(wrapper.text()).toContain('Evidence 01');
    expect(wrapper.text()).toContain('Showing 1-50 of 55');
  });

  it('requests the next page when pagination advances', async () => {
    routeMock.query = {
      filter: 'abc',
    };

    const wrapper = mountView();

    await flushPromises();

    const nextButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Next');

    expect(nextButton).toBeDefined();

    await nextButton!.trigger('click');
    await flushPromises();

    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        filter: 'abc',
        page: '2',
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=2&limit=50&sortBy=lastSeenAt&sortDirection=desc&name=abc',
      expect.any(Object),
    );
    expect(wrapper.text()).toContain('Evidence 51');
    expect(wrapper.text()).toContain('Evidence 55');
    expect(wrapper.text()).toContain('Showing 51-55 of 55');
    expect(wrapper.text()).toContain('Page 2 of 2');
  });

  it('resets pagination to the first page when the filter changes', async () => {
    vi.useFakeTimers();
    routeMock.query = {
      filter: 'abc',
      page: '2',
    };

    const wrapper = mountView();
    await flushPromises();
    vi.clearAllMocks();

    const filterInput = wrapper.find('input[name="filter"]');
    expect(filterInput.exists()).toBe(true);

    await filterInput.setValue('category=recent');
    await waitForSearchDebounce();

    expect(replaceMock).toHaveBeenLastCalledWith({
      query: {
        filter: 'category=recent',
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc',
      expect.any(Object),
    );
    expect(wrapper.text()).toContain('Recent Evidence');
    expect(wrapper.text()).toContain('Showing 1-1 of 1');
    expect(wrapper.text()).toContain('Page 1 of 1');
  });

  it('clears a stale error after a later successful search', async () => {
    vi.useFakeTimers();
    const wrapper = mountView();
    await flushPromises();
    await flushPromises();
    vi.clearAllMocks();

    const filterInput = wrapper.find('input[name="filter"]');
    expect(filterInput.exists()).toBe(true);

    await filterInput.setValue('category=broken');
    await waitForSearchDebounce();

    expect(wrapper.text()).toContain('search failed');

    await filterInput.setValue('category=recent');
    await waitForSearchDebounce();

    expect(wrapper.text()).not.toContain('search failed');
    expect(wrapper.text()).toContain('Recent Evidence');
  });

  it('sends plain text search as an evidence name query parameter', async () => {
    vi.useFakeTimers();
    const wrapper = mountView();
    await flushPromises();

    const filterInput = wrapper.find('input[name="filter"]');
    await filterInput.setValue('recent');
    await waitForSearchDebounce();

    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc&name=recent',
      {
        filter: {
          scope: {},
        },
      },
    );
    expect(loadComplianceOverTime).toHaveBeenLastCalledWith({
      data: {
        filter: {
          scope: {},
        },
      },
      params: {
        interval: EVIDENCE_STATUS_INTERVAL,
        name: 'recent',
      },
    });
    expect(wrapper.text()).toContain('Recent Evidence');
  });

  it('keeps label expressions in the request body without a name query parameter', async () => {
    vi.useFakeTimers();
    const wrapper = mountView();
    await flushPromises();

    const filterInput = wrapper.find('input[name="filter"]');
    await filterInput.setValue('category=recent');
    await waitForSearchDebounce();

    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc',
      {
        filter: {
          scope: {
            condition: {
              label: 'category',
              operator: '=',
              value: 'recent',
            },
          },
        },
      },
    );
    expect(loadComplianceOverTime).toHaveBeenLastCalledWith({
      data: {
        filter: {
          scope: {
            condition: {
              label: 'category',
              operator: '=',
              value: 'recent',
            },
          },
        },
      },
      params: {
        interval: EVIDENCE_STATUS_INTERVAL,
      },
    });
    expect(wrapper.text()).toContain('Recent Evidence');
  });

  it('flushes a pending debounced route update when the search form is submitted', async () => {
    vi.useFakeTimers();
    const wrapper = mountView();
    await flushPromises();
    await flushPromises();
    vi.clearAllMocks();

    const filterInput = wrapper.find('input[name="filter"]');
    await filterInput.setValue('recent');
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();

    expect(replaceMock).not.toHaveBeenCalled();
    expect(evidenceSearchPost).not.toHaveBeenCalled();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenLastCalledWith({
      query: {
        filter: 'recent',
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenCalledTimes(1);
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc&name=recent',
      expect.any(Object),
    );

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(evidenceSearchPost).toHaveBeenCalledTimes(1);
  });

  it('debounces typed search and skips short or incomplete label queries', async () => {
    vi.useFakeTimers();
    const wrapper = mountView();
    await flushPromises();
    await flushPromises();
    expect(wrapper.text()).toContain('Evidence 01');

    const initialSearchCalls = evidenceSearchPost.mock.calls.length;
    const initialComplianceCalls = loadComplianceOverTime.mock.calls.length;
    const initialHeartbeatCalls = loadHeartbeats.mock.calls.length;

    const filterInput = wrapper.find('input[name="filter"]');

    await filterInput.setValue('ab');
    await waitForSearchDebounce();

    expect(replaceMock).not.toHaveBeenCalled();
    expect(evidenceSearchPost).toHaveBeenCalledTimes(initialSearchCalls);
    expect(loadComplianceOverTime).toHaveBeenCalledTimes(
      initialComplianceCalls,
    );
    expect(loadHeartbeats).toHaveBeenCalledTimes(initialHeartbeatCalls);
    expect(wrapper.text()).toContain('Evidence 01');
    expect(wrapper.text()).toContain('Showing 1-50 of 55');

    await filterInput.setValue('abc');
    await vi.advanceTimersByTimeAsync(499);
    await flushPromises();

    expect(evidenceSearchPost).toHaveBeenCalledTimes(initialSearchCalls);

    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(evidenceSearchPost).toHaveBeenCalledTimes(initialSearchCalls + 1);
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc&name=abc',
      expect.any(Object),
    );

    await filterInput.setValue('category=');
    await waitForSearchDebounce();

    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(evidenceSearchPost).toHaveBeenCalledTimes(initialSearchCalls + 1);
    expect(wrapper.text()).toContain('Evidence 01');
  });

  it('passes the latest valid filter to evidence navigation before the debounced route update runs', async () => {
    vi.useFakeTimers();
    routeMock.query = {
      filter: 'abc',
      page: '2',
      sortBy: 'name',
      sortDirection: 'asc',
    };

    const wrapper = mountView();
    await flushPromises();
    vi.clearAllMocks();

    const filterInput = wrapper.find('input[name="filter"]');
    await filterInput.setValue('recent');
    await flushPromises();

    expect(replaceMock).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="navigation-query"]').text()).toContain(
      '"filter":"recent"',
    );
    expect(wrapper.get('[data-testid="navigation-query"]').text()).toContain(
      '"page":"2"',
    );
    expect(wrapper.get('[data-testid="navigation-query"]').text()).toContain(
      '"sortBy":"name"',
    );
    expect(wrapper.get('[data-testid="navigation-query"]').text()).toContain(
      '"sortDirection":"asc"',
    );

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();

    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        filter: 'recent',
        page: undefined,
        sortBy: 'name',
        sortDirection: 'asc',
      },
    });
  });

  it('trims padded filters before persisting them to the route', async () => {
    vi.useFakeTimers();
    const wrapper = mountView();
    await flushPromises();
    await flushPromises();
    vi.clearAllMocks();

    const filterInput = wrapper.find('input[name="filter"]');
    await filterInput.setValue('  recent  ');
    await waitForSearchDebounce();

    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        filter: 'recent',
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc&name=recent',
      expect.any(Object),
    );
  });

  it('clears whitespace-only filters from the route', async () => {
    vi.useFakeTimers();
    routeMock.query = {
      filter: 'abc',
      page: '2',
    };

    const wrapper = mountView();
    await flushPromises();
    vi.clearAllMocks();

    const filterInput = wrapper.find('input[name="filter"]');
    await filterInput.setValue('   ');
    await waitForSearchDebounce();

    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        filter: undefined,
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc',
      expect.any(Object),
    );
  });

  it('updates the route and request when sortable headers change', async () => {
    routeMock.query = {
      filter: 'abc',
    };

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="sort-evidence-name"]').trigger('click');
    await flushPromises();

    expect(replaceMock).toHaveBeenLastCalledWith({
      query: {
        filter: 'abc',
        sortBy: 'name',
        sortDirection: 'asc',
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=name&sortDirection=asc&name=abc',
      expect.any(Object),
    );

    await wrapper.find('[data-testid="sort-evidence-name"]').trigger('click');
    await flushPromises();

    expect(replaceMock).toHaveBeenLastCalledWith({
      query: {
        filter: 'abc',
        sortBy: 'name',
        sortDirection: 'desc',
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=name&sortDirection=desc&name=abc',
      expect.any(Object),
    );

    await wrapper.find('[data-testid="sort-status"]').trigger('click');
    await flushPromises();

    expect(replaceMock).toHaveBeenLastCalledWith({
      query: {
        filter: 'abc',
        sortBy: 'status',
        sortDirection: 'asc',
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50&sortBy=status&sortDirection=asc&name=abc',
      expect.any(Object),
    );
  });

  it('exports all evidence rows for the last executed search as CSV with flattened fields and label columns', async () => {
    routeMock.query = {
      filter: 'exportable',
    };
    const originalBlob = global.Blob;
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node);
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);
    let exportedBlob:
      | {
          parts: unknown[];
          type: string;
        }
      | undefined;

    class MockBlob {
      parts: unknown[];
      type: string;

      constructor(parts: unknown[], options?: { type?: string }) {
        this.parts = parts;
        this.type = options?.type ?? '';
      }
    }

    global.Blob = MockBlob as unknown as typeof Blob;

    createObjectURLSpy.mockImplementation((blob: Blob | MediaSource) => {
      exportedBlob = blob as unknown as { parts: unknown[]; type: string };
      return 'blob:mock-url';
    });

    try {
      const wrapper = mountView();
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Export to CSV'));

      expect(exportButton).toBeDefined();

      await exportButton!.trigger('click');
      await flushPromises();

      const exportCalls = evidenceSearchPost.mock.calls.slice(-2);

      expect(exportCalls).toEqual([
        [
          '/api/evidence/search?page=1&limit=100&sortBy=lastSeenAt&sortDirection=desc&name=exportable',
          {
            filter: {
              scope: {},
            },
          },
        ],
        [
          '/api/evidence/search?page=2&limit=100&sortBy=lastSeenAt&sortDirection=desc&name=exportable',
          {
            filter: {
              scope: {},
            },
          },
        ],
      ]);
      expect(exportedBlob).toBeDefined();

      const csvContent = exportedBlob!.parts.join('');
      const [headerRow] = csvContent.split('\n');

      expect(csvContent).toContain('"description"');
      expect(csvContent).toContain('"status.state"');
      expect(csvContent).toContain('"status.reason"');
      expect(csvContent).toContain('"label.account_id"');
      expect(csvContent).toContain('"label.owner"');
      expect(csvContent).toContain('"label.resource_id"');
      expect(csvContent).not.toContain('"id"');
      expect(csvContent).not.toContain('"uuid"');
      expect(csvContent).not.toContain('"labels"');
      expect(csvContent).not.toContain('"origins"');
      expect(csvContent).not.toContain('"backMatter"');
      expect(csvContent).toContain('"arn:aws:iam::123456789012:role/Export"');
      expect(csvContent).toContain('"Generated export row 135"');
      expect(csvContent).toContain("'=CSV Injection");
      expect(headerRow.indexOf('"description"')).toBeLessThan(
        headerRow.indexOf('"status.reason"'),
      );
      expect(headerRow.indexOf('"status.reason"')).toBeLessThan(
        headerRow.indexOf('"status.state"'),
      );
      expect(headerRow.indexOf('"status.state"')).toBeLessThan(
        headerRow.indexOf('"label.account_id"'),
      );
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'CSV Exported',
        }),
      );
    } finally {
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
      clickSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      global.Blob = originalBlob;
    }
  });

  it('confirms before exporting very large evidence result sets', async () => {
    routeMock.query = {
      filter: 'huge-export',
    };
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const wrapper = mountView();
    await flushPromises();
    vi.clearAllMocks();

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Export to CSV'));

    expect(exportButton).toBeDefined();

    await exportButton!.trigger('click');
    await flushPromises();

    expect(confirmSpy).toHaveBeenCalledWith(
      'Export 1001 evidence records to CSV? This may take a while.',
    );
    expect(evidenceSearchPost).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
