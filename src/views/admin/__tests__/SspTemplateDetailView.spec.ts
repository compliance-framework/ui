import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SspTemplateDetailView from '../SspTemplateDetailView.vue';

const state = vi.hoisted(() => ({
  template: undefined as unknown,
  load: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 't-1' } }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => {
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
      },
    },
  });
}

describe('SspTemplateDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
