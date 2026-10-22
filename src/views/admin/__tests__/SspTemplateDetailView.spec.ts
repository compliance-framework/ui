import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SspTemplateDetailView from '../SspTemplateDetailView.vue';

const state = vi.hoisted(() => ({
  template: undefined as unknown,
  load: vi.fn(),
  run: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 't-1' } }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (_url: unknown, config: { method?: string }) => {
    if (config.method === 'POST') {
      return { execute: state.run, isLoading: ref(false) };
    }
    const data = ref<unknown>(undefined);
    state.load.mockImplementation(async () => {
      data.value = state.template;
    });
    return {
      data,
      isLoading: ref(false),
      error: ref(null),
      execute: state.load,
    };
  },
}));

function mountView() {
  return mount(SspTemplateDetailView, {
    global: {
      stubs: {
        RouterLinkButton: { template: '<a><slot /></a>' },
        SspTemplateFormDialog: {
          name: 'SspTemplateFormDialog',
          props: ['visible', 'template'],
          emits: ['update:visible', 'saved'],
          template: '<div />',
        },
        SspTemplatePreviewPanel: {
          name: 'SspTemplatePreviewPanel',
          props: ['template'],
          template: '<div />',
        },
        SspTemplateInstancesTable: {
          name: 'SspTemplateInstancesTable',
          props: ['templateId'],
          template: '<div />',
        },
      },
    },
  });
}

describe('SspTemplateDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.run.mockResolvedValue({});
    state.template = {
      id: 't-1',
      name: 'Applications by _app',
      enabled: true,
      keys: ['_app'],
      filter: {
        scope: {
          condition: { label: 'auto_create_ssp', operator: '=', value: 'true' },
        },
      },
      scopeLabels: [['repo'], ['aws_account', 'region']],
      minStreams: 2,
      titleTemplate: 'SSP for Application {{ ._app }}',
      props: [{ name: 'application', value: '{{ ._app }}' }],
      profileIds: ['p-1'],
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
    };
  });

  it('loads the template from the route and shows its settings', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(state.load).toHaveBeenCalledWith('/api/admin/ssp-templates/t-1');
    const summary = wrapper.find('[data-testid="ssp-template-summary"]');
    expect(summary.text()).toContain('_app');
    expect(summary.text()).toContain('auto_create_ssp=true');
    expect(summary.text()).toContain('aws_account + region');
    expect(summary.text()).toContain('SSP for Application {{ ._app }}');
    expect(summary.text()).toContain('application: {{ ._app }}');
  });

  it('edits the template in the form dialog and reloads it when saved', async () => {
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('button').trigger('click');
    const dialog = wrapper.findComponent({ name: 'SspTemplateFormDialog' });
    expect(dialog.props('visible')).toBe(true);
    expect(dialog.props('template')).toMatchObject({ id: 't-1' });

    dialog.vm.$emit('saved');
    expect(state.load).toHaveBeenCalledTimes(2);
  });

  it('shows the preview and created SSPs panels for the template', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(
      wrapper
        .findComponent({ name: 'SspTemplatePreviewPanel' })
        .props('template'),
    ).toMatchObject({ id: 't-1' });
    expect(
      wrapper
        .findComponent({ name: 'SspTemplateInstancesTable' })
        .props('templateId'),
    ).toBe('t-1');
  });

  it('queues a discovery run', async () => {
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="run-now"]').trigger('click');
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
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="run-now"]').trigger('click');
    await flushPromises();

    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Run failed',
        detail: 'template is disabled',
      }),
    );
  });

  it('disables Run now for a disabled template', async () => {
    (state.template as { enabled: boolean }).enabled = false;
    const wrapper = mountView();
    await flushPromises();

    expect(
      wrapper.find('[data-testid="run-now"]').attributes('disabled'),
    ).toBeDefined();
    expect(wrapper.text()).toContain('Enable the template to run it.');
  });
});
