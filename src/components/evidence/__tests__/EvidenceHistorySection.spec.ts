import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import EvidenceHistorySection from '../EvidenceHistorySection.vue';

type MockRef<T> = {
  value: T;
};

type HistorySectionRefs = {
  nullGetCallIndex: number;
  history: MockRef<Array<Record<string, unknown>>>;
  compliance: MockRef<Array<Record<string, unknown>>>;
  heartbeat: MockRef<Array<Record<string, unknown>>>;
  loading: MockRef<boolean>;
  error: MockRef<unknown>;
};

const { routerPush, refs } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  refs: {
    nullGetCallIndex: 0,
  } as HistorySectionRefs,
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
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

  refs.history = ref([
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `historic-${index + 1}`,
      uuid: 'history-uuid-1',
      title: `Evidence ${String(index + 1).padStart(2, '0')}`,
      description: 'Previous run',
      labels: [],
      start: '2026-04-06T10:00:00Z',
      end: '2026-04-06T10:15:00Z',
      status: {
        state: 'satisfied',
        reason: 'ok',
      },
      activities: [],
    })),
  ]);
  refs.compliance = ref([]);
  refs.heartbeat = ref([]);
  refs.loading = ref(false);
  refs.error = ref(null);

  return {
    useDataApi: (
      url: string | { value?: string } | null,
      config?: { method?: string },
    ) => {
      if (url === null && !config) {
        refs.nullGetCallIndex = Number(refs.nullGetCallIndex || 0) + 1;

        if (refs.nullGetCallIndex === 1) {
          return {
            data: refs.history,
            isLoading: refs.loading,
            error: refs.error,
            execute: vi.fn(async () => {
              if (refs.error.value) {
                throw refs.error.value;
              }

              refs.history.value = [
                ...Array.from({ length: 12 }, (_, index) => ({
                  id: `historic-${index + 1}`,
                  uuid: 'history-uuid-1',
                  title: `Evidence ${String(index + 1).padStart(2, '0')}`,
                  description: 'Previous run',
                  labels: [],
                  start: '2026-04-06T10:00:00Z',
                  end: '2026-04-06T10:15:00Z',
                  status: {
                    state: 'satisfied',
                    reason: 'ok',
                  },
                  activities: [],
                })),
              ];

              return {
                data: { value: { data: refs.history.value } },
              };
            }),
          };
        }

        return {
          data: refs.compliance,
          isLoading: refs.loading,
          error: refs.error,
          execute: vi.fn(async () => {
            if (refs.error.value) {
              throw refs.error.value;
            }

            refs.compliance.value = [];

            return {
              data: { value: { data: refs.compliance.value } },
            };
          }),
        };
      }

      if (url === '/api/agent/heartbeat/over-time') {
        return {
          data: refs.heartbeat,
          isLoading: refs.loading,
          error: refs.error,
        };
      }

      return {
        data: ref(undefined),
        isLoading: refs.loading,
        error: refs.error,
        execute: vi.fn(async () => ({ data: { value: undefined } })),
      };
    },
  };
});

describe('EvidenceHistorySection', () => {
  beforeEach(() => {
    refs.nullGetCallIndex = 0;
    routerPush.mockClear();
  });

  it('navigates to the evidence detail view when clicking View', async () => {
    const wrapper = mount(EvidenceHistorySection, {
      props: {
        uuid: 'history-uuid-1',
      },
      global: {
        stubs: {
          PageCard: {
            template: '<section><slot /></section>',
          },
          Message: {
            template: '<div><slot /></div>',
          },
          TertiaryButton: {
            emits: ['click'],
            template:
              '<button type="button" @click="$emit(\'click\')" :disabled="$attrs.disabled"><slot /></button>',
          },
          ResultComplianceOverTimeChart: {
            template: '<div>Chart</div>',
          },
          ResultStatusRing: {
            template: '<div>StatusRing</div>',
          },
        },
      },
    });

    await flushPromises();

    const button = wrapper
      .findAll('button')
      .find((item) => item.text() === 'View');
    expect(button).toBeDefined();

    await button!.trigger('click');

    expect(wrapper.text()).toContain('Showing 1-10 of 12');
    expect(wrapper.text()).toContain('Page 1 of 2');

    expect(routerPush).toHaveBeenCalledWith({
      name: 'evidence:view',
      params: { id: 'historic-1' },
    });
  });

  it('supports client-side pagination for history rows', async () => {
    const wrapper = mount(EvidenceHistorySection, {
      props: {
        uuid: 'history-uuid-1',
      },
      global: {
        stubs: {
          PageCard: {
            template: '<section><slot /></section>',
          },
          Message: {
            template: '<div><slot /></div>',
          },
          TertiaryButton: {
            emits: ['click'],
            template:
              '<button type="button" @click="$emit(\'click\')" :disabled="$attrs.disabled"><slot /></button>',
          },
          ResultComplianceOverTimeChart: {
            template: '<div>Chart</div>',
          },
          ResultStatusRing: {
            template: '<div>StatusRing</div>',
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Evidence 01');
    expect(wrapper.text()).toContain('Evidence 10');
    expect(wrapper.text()).not.toContain('Evidence 11');

    const nextButton = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Next');
    expect(nextButton).toBeDefined();

    await nextButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Showing 11-12 of 12');
    expect(wrapper.text()).toContain('Page 2 of 2');
    expect(wrapper.text()).toContain('Evidence 11');
    expect(wrapper.text()).toContain('Evidence 12');
    expect(wrapper.text()).not.toContain('Evidence 01');
  });

  it('shows an error state when loading history fails', async () => {
    refs.error.value = new Error('history failed');

    const wrapper = mount(EvidenceHistorySection, {
      props: {
        uuid: 'history-uuid-1',
      },
      global: {
        stubs: {
          PageCard: {
            template: '<section><slot /></section>',
          },
          Message: {
            template: '<div><slot /></div>',
          },
          TertiaryButton: {
            emits: ['click'],
            template:
              '<button type="button" @click="$emit(\'click\')" :disabled="$attrs.disabled"><slot /></button>',
          },
          ResultComplianceOverTimeChart: {
            template: '<div>Chart</div>',
          },
          ResultStatusRing: {
            template: '<div>StatusRing</div>',
          },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain(
      'Failed to load evidence history for this stream.',
    );
    expect(wrapper.text()).not.toContain(
      'No history is available for this evidence stream.',
    );
  });
});
