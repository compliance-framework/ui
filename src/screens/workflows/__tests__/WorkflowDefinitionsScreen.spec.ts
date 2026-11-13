import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import WorkflowDefinitionsScreen from '../WorkflowDefinitionsScreen.vue';

const state = vi.hoisted(() => ({
  definitions: [] as unknown[],
  post: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(state.definitions),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ post: state.post, delete: vi.fn() }),
  decamelizeKeys: (data: unknown) => data,
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountScreen(path = '/workflows') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workflows', component: WorkflowDefinitionsScreen },
      {
        path: '/workflow-definitions/:id',
        name: 'workflow-definition-editor',
        component: { render: () => null },
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(WorkflowDefinitionsScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('WorkflowDefinitionsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    state.post.mockReset();
    state.definitions = [
      {
        id: 'd1',
        name: 'Quarterly review',
        suggestedCadence: 'quarterly',
        stepCount: 12,
      },
      { id: 'd2', name: 'Annual DR test', stepCount: 3 },
    ];
  });

  it('lists definitions with cadence and steps, hiding status the API lacks', async () => {
    const { wrapper } = await mountScreen();
    const rows = wrapper.findAll('tbody tr').map((r) => r.text());
    expect(rows[0]).toContain('Annual DR test');
    expect(rows[1]).toContain('Quarterly');
    expect(rows[1]).toContain('12');
    expect(wrapper.find('thead').text()).not.toContain('Status');
  });

  it('sorts by step count numerically', async () => {
    const { wrapper } = await mountScreen(
      '/workflows?sort=steps&dir=descending',
    );
    expect(wrapper.findAll('tbody a').map((a) => a.text())).toEqual([
      'Quarterly review',
      'Annual DR test',
    ]);
  });

  it('filters by status once definitions have one', async () => {
    state.definitions = [
      { id: 'd1', name: 'Draft one', status: 'draft' },
      { id: 'd2', name: 'Live one', status: 'published' },
    ];
    const { wrapper } = await mountScreen('/workflows?status=draft');
    expect(wrapper.findAll('tbody a').map((a) => a.text())).toEqual([
      'Draft one',
    ]);
    expect(wrapper.text()).toContain('Status: Draft');
  });

  it('creates a definition and opens it', async () => {
    state.post.mockResolvedValue({ data: { data: { id: 'd9', name: 'New' } } });
    const { wrapper, router } = await mountScreen();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'New definition')!
      .trigger('click');
    await flushPromises();
    const form = document.body.querySelector('[role="dialog"] form')!;
    form.dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(document.body.textContent).toContain('Enter a name.');
    const name = document.body.querySelector<HTMLInputElement>(
      '[role="dialog"] input',
    )!;
    name.value = 'New';
    name.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(state.post).toHaveBeenCalledWith(
      '/api/workflows/definitions',
      expect.objectContaining({ name: 'New', gracePeriodDays: 7 }),
      expect.anything(),
    );
    expect(router.currentRoute.value.fullPath).toBe('/workflow-definitions/d9');
  });
});
