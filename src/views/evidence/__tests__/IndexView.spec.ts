import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import IndexView from '../IndexView.vue';

const {
  routeState,
  replaceMock,
  pushMock,
  toastAdd,
  evidenceSearchPost,
  loadComplianceOverTime,
  loadHeartbeats,
  uiStore,
  configStore,
} = vi.hoisted(() => {
  const baseEvidence = Array.from({ length: 55 }, (_, index) => ({
    id: `evidence-${index + 1}`,
    uuid: `uuid-${index + 1}`,
    title: `Evidence ${String(index + 1).padStart(2, '0')}`,
    end: `2026-04-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
    status: {
      state: 'satisfied',
    },
    labels: [],
  }));

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

      let data = baseEvidence;
      if (filterText.includes('recent')) {
        data = [
          {
            id: 'filtered-evidence',
            uuid: 'filtered-uuid',
            title: 'Recent Evidence',
            end: '2026-05-01T12:00:00Z',
            status: {
              state: 'satisfied',
            },
            labels: [],
          },
        ];
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
      setEvidenceFilter: vi.fn((value: string) => {
        uiStore.evidenceFilter = value;
      }),
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
const complianceData = ref([]);
const heartbeatData = ref([]);

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
  beforeEach(() => {
    vi.clearAllMocks();
    routeMock.query = {};
    uiStore.evidenceFilter = '';
  });

  function mountView() {
    return mount(IndexView, {
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
              '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          PrimaryButton: {
            props: ['type', 'disabled'],
            emits: ['click'],
            template:
              '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          TertiaryButton: {
            props: ['disabled'],
            emits: ['click'],
            template:
              '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          },
          BurgerMenu: {
            props: ['items'],
            template: '<div>Menu</div>',
          },
          EvidenceList: {
            props: ['evidence'],
            template: `
              <ul>
                <li v-for="item in evidence" :key="item.id">{{ item.title }}</li>
              </ul>
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
        },
      },
    });
  }

  it('loads the first evidence page on mount and renders pagination summary', async () => {
    const wrapper = mountView();

    await flushPromises();

    expect(evidenceSearchPost).toHaveBeenCalledWith(
      '/api/evidence/search?page=1&limit=50',
      expect.any(Object),
    );
    expect(loadComplianceOverTime).toHaveBeenCalled();
    expect(loadHeartbeats).toHaveBeenCalled();

    expect(wrapper.text()).toContain('Evidence 01');
    expect(wrapper.text()).toContain('Evidence 50');
    expect(wrapper.text()).not.toContain('Evidence 51');
    expect(wrapper.text()).toContain('Showing 1-50 of 55');
    expect(wrapper.text()).toContain('Page 1 of 2');
  });

  it('requests the next page when pagination advances', async () => {
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
        page: '2',
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=2&limit=50',
      expect.any(Object),
    );
    expect(wrapper.text()).toContain('Evidence 51');
    expect(wrapper.text()).toContain('Evidence 55');
    expect(wrapper.text()).toContain('Showing 51-55 of 55');
    expect(wrapper.text()).toContain('Page 2 of 2');
  });

  it('resets pagination to the first page when the filter changes', async () => {
    routeMock.query = {
      page: '2',
    };

    const wrapper = mountView();
    await flushPromises();

    const filterInput = wrapper.find('input[name="filter"]');
    expect(filterInput.exists()).toBe(true);

    await filterInput.setValue('category=recent');
    await flushPromises();

    expect(replaceMock).toHaveBeenLastCalledWith({
      query: {
        filter: 'category=recent',
        page: undefined,
      },
    });
    expect(evidenceSearchPost).toHaveBeenLastCalledWith(
      '/api/evidence/search?page=1&limit=50',
      expect.any(Object),
    );
    expect(wrapper.text()).toContain('Recent Evidence');
    expect(wrapper.text()).toContain('Showing 1-1 of 1');
    expect(wrapper.text()).toContain('Page 1 of 1');
  });
});
