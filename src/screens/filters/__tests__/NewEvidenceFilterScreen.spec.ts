import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateFormView from '../NewEvidenceFilterScreen.vue';

const state = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  push: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: state.query }),
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({ execute: state.execute }),
  decamelizeKeys: vi.fn(),
}));

function mountView() {
  return mount(CreateFormView, {
    global: {
      stubs: {
        Breadcrumbs: { template: '<nav />' },
        FilterForm: {
          name: 'FilterForm',
          props: ['initialFilter', 'initialSspId'],
          emits: ['submit'],
          template: '<form />',
        },
      },
    },
  });
}

const payload = {
  name: 'Payments',
  sspId: 'ssp-1',
  filter: {
    scope: { condition: { label: 'team', operator: '=', value: 'pay' } },
  },
  controls: [],
  components: [],
};

describe('NewEvidenceFilterScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = {};
    state.execute.mockResolvedValue({});
  });

  it('pre-selects the SSP given in the URL and returns to the scoped evidence page', async () => {
    state.query = { filter: 'team=pay', sspId: 'ssp-1' };
    const wrapper = mountView();
    const form = wrapper.findComponent({ name: 'FilterForm' });
    expect(form.props('initialFilter')).toBe('team=pay');
    expect(form.props('initialSspId')).toBe('ssp-1');

    form.vm.$emit('submit', payload);
    await flushPromises();

    expect(state.push).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'system:evidence' }),
    );
  });

  it('returns to the global evidence page without an SSP in the URL', async () => {
    const wrapper = mountView();
    const form = wrapper.findComponent({ name: 'FilterForm' });
    expect(form.props('initialSspId')).toBeNull();

    form.vm.$emit('submit', { ...payload, sspId: null });
    await flushPromises();

    expect(state.push).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'evidence:index' }),
    );
  });
});
