import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import SspTemplateScreen from '../SspTemplateScreen.vue';

const state = vi.hoisted(() => ({
  template: undefined as Record<string, unknown> | undefined,
  run: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(state.template),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ post: state.run }),
}));
vi.mock('@/ds/toasts', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));
vi.mock('@/screens/ssp-templates/SspTemplateFormDialog.vue', () => ({
  default: {
    name: 'SspTemplateFormDialog',
    props: ['visible', 'template'],
    template: '<div />',
  },
}));
vi.mock('../SspTemplatePreviewSection.vue', () => ({
  default: {
    name: 'SspTemplatePreviewSection',
    props: ['template'],
    template: '<div />',
  },
}));
vi.mock('../SspTemplateInstancesPanel.vue', () => ({
  default: {
    name: 'SspTemplateInstancesPanel',
    props: ['templateId'],
    template: '<div />',
  },
}));

async function mountScreen() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/ssp-templates/:id', component: SspTemplateScreen },
    ],
  });
  await router.push('/admin/ssp-templates/t-1');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(SspTemplateScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

const runNow = (wrapper: Awaited<ReturnType<typeof mountScreen>>) =>
  wrapper.findAll('button').find((b) => b.text().includes('Run now'))!;

describe('SspTemplateScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    state.template = {
      id: 't-1',
      name: 'Applications by _app',
      enabled: true,
      keys: ['_app'],
      minStreams: 2,
      titleTemplate: '{{ ._app }}',
      updatedAt: '2026-10-19T10:00:00Z',
    };
    state.run.mockResolvedValue({});
  });

  it('shows the template settings and its classic panels', async () => {
    const wrapper = await mountScreen();
    expect(wrapper.find('h1').text()).toBe('Applications by _app');
    expect(wrapper.text()).toContain('{{ ._app }}');
    expect(
      wrapper
        .findComponent({ name: 'SspTemplatePreviewSection' })
        .props('template'),
    ).toMatchObject({ id: 't-1' });
    expect(
      wrapper
        .findComponent({ name: 'SspTemplateInstancesPanel' })
        .props('templateId'),
    ).toBe('t-1');
  });

  it('queues a discovery run', async () => {
    const wrapper = await mountScreen();
    await runNow(wrapper).trigger('click');
    await flushPromises();
    expect(state.run).toHaveBeenCalledWith('/api/admin/ssp-templates/t-1/run');
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Discovery queued' }),
    );
  });

  it('reports a rejected run', async () => {
    state.run.mockRejectedValue({
      response: {
        status: 409,
        data: { errors: { body: 'template is disabled' } },
      },
    });
    const wrapper = await mountScreen();
    await runNow(wrapper).trigger('click');
    await flushPromises();
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'template is disabled' }),
    );
  });

  it('explains why Run now is unavailable for a disabled template', async () => {
    state.template!.enabled = false;
    const wrapper = await mountScreen();
    expect(runNow(wrapper).attributes('aria-disabled')).toBe('true');
    await runNow(wrapper).trigger('click');
    expect(state.run).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(
      'Enable the template to run it.',
    );
  });
});
