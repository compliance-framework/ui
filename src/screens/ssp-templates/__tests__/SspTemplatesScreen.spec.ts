import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import SspTemplatesScreen from '../SspTemplatesScreen.vue';

const state = vi.hoisted(() => ({
  templates: [] as unknown[],
  remove: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(state.templates),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ delete: state.remove }),
}));
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));
vi.mock('@/screens/ssp-templates/SspTemplateFormDialog.vue', () => ({
  default: {
    name: 'SspTemplateFormDialog',
    props: ['visible', 'template'],
    emits: ['update:visible', 'saved'],
    template: '<div />',
  },
}));

const template = {
  id: 't-1',
  name: 'Applications by _app',
  enabled: true,
  keys: ['_app', 'env'],
  sspCount: 4,
  lastRunAt: '2026-10-19T10:00:00Z',
};

async function mountScreen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/ssp-templates', component: SspTemplatesScreen },
      {
        path: '/admin/ssp-templates/:id',
        name: 'admin-ssp-template-detail',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/admin/ssp-templates');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(SspTemplatesScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

const action = (
  wrapper: Awaited<ReturnType<typeof mountScreen>>,
  label: string,
) =>
  (wrapper.findAllComponents(Menu)[0]!.props('items') as MenuAction[]).find(
    (item) => item.label === label,
  )!;

describe('SspTemplatesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    state.templates = [
      template,
      { id: 't-2', name: 'Other', keys: ['x'], enabled: false },
    ];
    state.remove.mockResolvedValue({});
  });

  it('lists name, keys, created system count and last run', async () => {
    const rows = (await mountScreen()).findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain('Applications by _app');
    expect(rows[0]!.text()).toContain('env');
    expect(rows[0]!.text()).toContain('4');
    expect(rows[0]!.text()).not.toContain('Never');
    // Counts and run times the API does not return yet say so.
    expect(rows[1]!.text()).toContain('Disabled');
    expect(rows[1]!.text()).toContain('Not known');
    expect(rows[1]!.text()).toContain('Never');
  });

  it('opens the form empty for create and with the template for edit', async () => {
    const wrapper = await mountScreen();
    const dialog = () =>
      wrapper.findComponent({ name: 'SspTemplateFormDialog' });
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'New template')!
      .trigger('click');
    expect(dialog().props('visible')).toBe(true);
    expect(dialog().props('template')).toBeNull();

    action(wrapper, 'Edit').onSelect!();
    await flushPromises();
    expect(dialog().props('template')).toEqual(template);
  });

  it('deletes a template after confirmation', async () => {
    const wrapper = await mountScreen();
    action(wrapper, 'Delete template').onSelect!();
    await flushPromises();
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(state.remove).toHaveBeenCalledWith('/api/admin/ssp-templates/t-1');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
  });

  it('reports a failed delete and keeps the row', async () => {
    state.remove.mockRejectedValue(new Error('boom'));
    const wrapper = await mountScreen();
    action(wrapper, 'Delete template').onSelect!();
    await flushPromises();
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
  });
});
