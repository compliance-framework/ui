import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComponentDashboardsView from '../ComponentDashboardsView.vue';

const state = vi.hoisted(() => ({
  getSspId: undefined as undefined | (() => string | undefined),
  fetchBaselineEvidence: vi.fn(),
}));

vi.mock('@/composables/useBaselineEvidence', () => ({
  useBaselineEvidence: (getSspId: () => string | undefined) => {
    state.getSspId = getSspId;
    return { fetchBaselineEvidence: state.fetchBaselineEvidence };
  },
}));

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    useDataApi: () => ({
      data: ref(undefined),
      execute: vi.fn(async () => ({ data: ref({ data: [] }) })),
    }),
    decamelizeKeys: vi.fn(),
  };
});

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('ComponentDashboardsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.fetchBaselineEvidence.mockResolvedValue([
      { id: 'a', title: 'Repo check', labels: [{ name: 'repo', value: 'a' }] },
    ]);
  });

  it('loads the baseline evidence for its SSP when a filter is created', async () => {
    const wrapper = mount(ComponentDashboardsView, {
      props: {
        sspId: 'ssp-1',
        component: { uuid: 'comp-1', title: 'API' } as never,
      },
      global: {
        stubs: {
          BurgerMenu: {
            props: ['items'],
            template:
              '<button data-testid="create" @click="items[0].command()" />',
          },
          DashboardEvidenceCounter: true,
          FormInput: true,
          Select: true,
          PrimaryButton: true,
          SecondaryButton: true,
          Button: true,
        },
      },
    });
    await flushPromises();

    await wrapper.find('[data-testid="create"]').trigger('click');
    await flushPromises();

    expect(state.getSspId?.()).toBe('ssp-1');
    expect(state.fetchBaselineEvidence).toHaveBeenCalledTimes(1);
  });
});
