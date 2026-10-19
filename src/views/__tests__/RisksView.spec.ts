import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, reactive, ref } from 'vue';
import RisksView from '../RisksView.vue';

const { route, replace } = vi.hoisted(() => ({
  route: { params: {}, query: {} } as {
    params: Record<string, string>;
    query: Record<string, string>;
  },
  replace: vi.fn(),
}));

const reactiveRoute = reactive(route);

vi.mock('vue-router', () => ({
  useRoute: () => reactiveRoute,
  useRouter: () => ({ replace }),
}));

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: {
      securityPlan: { uuid: 'ssp-1', metadata: { title: 'Payments' } },
    },
  }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref([]),
    error: ref(null),
    isLoading: ref(false),
    execute: vi.fn(async () => undefined),
  }),
}));

// Minimal tab stubs: Tabs exposes the active value it was given; selecting a tab is
// simulated by emitting update:value from it, as PrimeVue's Tabs does.
const TabsStub = defineComponent({
  name: 'TabsStub',
  props: ['value'],
  emits: ['update:value'],
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.value }, [slots.default?.()]);
  },
});

const stubs = {
  Tabs: TabsStub,
  TabList: { template: '<div><slot /></div>' },
  Tab: { props: ['value'], template: '<button class="tab"><slot /></button>' },

  TabPanels: { template: '<div><slot /></div>' },
  TabPanel: {
    props: ['value'],
    template: '<section :data-panel="value"><slot /></section>',
  },
  RiskOverviewSection: {
    props: ['registerQuery'],
    template:
      '<div data-testid="dashboard" :data-register-query="JSON.stringify(registerQuery)" />',
  },
  RiskRegisterPanel: { template: '<div data-testid="register" />' },
  PageHeader: { template: '<h1><slot /></h1>' },
  PageSubHeader: { template: '<p><slot /></p>' },
  NoActiveSystem: { template: '<div />' },
};

function mountView() {
  return mount(RisksView, { global: { stubs } });
}

describe('RisksView', () => {
  beforeEach(() => {
    replace.mockReset();
    reactiveRoute.params = {};
    reactiveRoute.query = {};
  });

  it('opens on the Dashboard tab by default', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-active]').attributes('data-active')).toBe(
      'dashboard',
    );
    expect(wrapper.find('[data-testid="dashboard"]').exists()).toBe(true);
  });

  it('opens the Register tab from ?view=register', async () => {
    reactiveRoute.query = { view: 'register' };
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-active]').attributes('data-active')).toBe(
      'register',
    );
    // The dashboard (and its charts) isn't rendered while hidden.
    expect(wrapper.find('[data-testid="dashboard"]').exists()).toBe(false);
  });

  it('opens the Register tab for a filtered deep link without a view', async () => {
    reactiveRoute.query = { status: 'open' };
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-active]').attributes('data-active')).toBe(
      'register',
    );
  });

  it('records the chosen tab in the query, keeping existing filters', async () => {
    reactiveRoute.query = { status: 'open', view: 'dashboard' };
    const wrapper = mountView();
    await flushPromises();

    await wrapper.findComponent(TabsStub).vm.$emit('update:value', 'register');

    expect(replace).toHaveBeenCalledWith({
      query: { status: 'open', view: 'register' },
    });
  });

  it('sends dashboard drill-downs to the Register tab', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(
      JSON.parse(
        wrapper
          .find('[data-testid="dashboard"]')
          .attributes('data-register-query')!,
      ),
    ).toEqual({ view: 'register' });
  });
});
