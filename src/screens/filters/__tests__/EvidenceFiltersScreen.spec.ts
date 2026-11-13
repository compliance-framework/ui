import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import EvidenceFiltersScreen from '../EvidenceFiltersScreen.vue';

const state = vi.hoisted(() => ({
  responses: {} as Record<string, unknown>,
  remove: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(state.responses[url]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ delete: state.remove, post: state.post }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('@/views/dashboard/partials/FilterEditModal.vue', () => ({
  default: {
    name: 'FilterEditModal',
    props: ['visible', 'dashboard'],
    template: '<div />',
  },
}));

const condition = (value: string) => ({
  scope: { condition: { label: 'app', operator: '=', value } },
});

async function mountScreen(path = '/dashboards') {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboards', component: EvidenceFiltersScreen },
      {
        path: '/dashboards/create',
        name: 'dashboards.create',
        component: Stub,
      },
      { path: '/evidence', name: 'evidence:index', component: Stub },
      {
        path: '/systems/:systemId/evidence',
        name: 'system-evidence',
        component: Stub,
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(EvidenceFiltersScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

const names = (wrapper: Awaited<ReturnType<typeof mountScreen>>) =>
  wrapper.findAll('tbody a').map((a) => a.text());

describe('EvidenceFiltersScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    state.remove.mockReset().mockResolvedValue({});
    state.post.mockReset().mockResolvedValue({ data: { data: [] } });
    state.responses = {
      '/api/filters': [
        {
          id: 'f1',
          name: 'Payments services',
          sspId: 's1',
          filter: condition('pay'),
          scopeBase: condition('x'),
          controls: [{ id: 'ac-2', title: 'Account management' }],
          components: [],
        },
        {
          id: 'f2',
          name: 'All hosts',
          filter: condition('hosts'),
          controls: [],
          components: [{ uuid: 'c1', title: 'Database' }],
        },
      ],
      '/api/oscal/system-security-plans': [
        { uuid: 's1', metadata: { title: 'Payments' } },
      ],
    };
  });

  it('lists each filter with its scope, links and tags', async () => {
    const wrapper = await mountScreen();
    expect(names(wrapper)).toEqual(['All hosts', 'Payments services']);
    const rows = wrapper.findAll('tbody tr').map((r) => r.text());
    expect(rows[0]).toContain('Global');
    expect(rows[0]).toContain('Database');
    expect(rows[1]).toContain('Payments');
    expect(rows[1]).toContain('Follows scope');
    expect(rows[1]).toContain('ac-2');
  });

  it('opens a system filter on that system’s evidence', async () => {
    const wrapper = await mountScreen();
    const href = wrapper.findAll('tbody a')[1]!.attributes('href');
    expect(href).toContain('/systems/s1/evidence?filter=');
  });

  it('shows the empty state when there are no filters', async () => {
    state.responses['/api/filters'] = [];
    const wrapper = await mountScreen();
    expect(wrapper.text()).toContain('No evidence filters yet');
  });

  it('filters by scope, control and component from the URL', async () => {
    expect(names(await mountScreen('/dashboards?scope=global'))).toEqual([
      'All hosts',
    ]);
    expect(names(await mountScreen('/dashboards?scope=s1'))).toEqual([
      'Payments services',
    ]);
    expect(names(await mountScreen('/dashboards?control=ac-2'))).toEqual([
      'Payments services',
    ]);
    expect(names(await mountScreen('/dashboards?component=c1'))).toEqual([
      'All hosts',
    ]);
    const none = await mountScreen('/dashboards?scope=global&control=ac-2');
    expect(none.text()).toContain('Scope: Global');
    expect(none.text()).toContain('Control: ac-2');
    expect(names(none)).toEqual([]);
  });

  it('edits a filter in the classic dialog', async () => {
    const wrapper = await mountScreen();
    const items = wrapper
      .findAllComponents(Menu)[0]!
      .props('items') as MenuAction[];
    items.find((i) => i.label === 'Edit')!.onSelect!();
    await flushPromises();
    const modal = wrapper.findComponent({ name: 'FilterEditModal' });
    expect(modal.props('visible')).toBe(true);
    expect(modal.props('dashboard')).toMatchObject({ id: 'f2' });
  });

  it('deletes a filter after confirmation', async () => {
    const wrapper = await mountScreen();
    const items = wrapper
      .findAllComponents(Menu)[0]!
      .props('items') as MenuAction[];
    items.find((i) => i.label === 'Delete filter')!.onSelect!();
    await flushPromises();
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(state.remove).toHaveBeenCalledWith('/api/filters/f2');
    expect(names(wrapper)).toEqual(['Payments services']);
  });
});
