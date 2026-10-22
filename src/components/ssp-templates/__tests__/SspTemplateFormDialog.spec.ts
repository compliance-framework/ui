import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SspTemplateFormDialog from '../SspTemplateFormDialog.vue';
import type { SspTemplate } from '@/types/ssp-templates';

const state = vi.hoisted(() => ({
  save: vi.fn(),
  loadProfiles: vi.fn(),
  saveConfig: undefined as unknown,
  toastAdd: vi.fn(),
  decamelizeKeys: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: state.decamelizeKeys,
  useDataApi: (url: string | null, config: unknown) => {
    if (url === '/api/oscal/profiles') {
      const profiles = ref<unknown[] | undefined>(undefined);
      state.loadProfiles.mockImplementation(async () => {
        profiles.value = [
          { uuid: 'p-1', metadata: { title: 'NIST Moderate' } },
        ];
      });
      return {
        data: profiles,
        isLoading: ref(false),
        execute: state.loadProfiles,
      };
    }
    state.saveConfig = config;
    return { execute: state.save, isLoading: ref(false) };
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

const saved: SspTemplate = {
  id: 't-1',
  name: 'Apps',
  enabled: true,
  keys: ['_app'],
  filter: null,
  scopeLabels: [['repo']],
  minStreams: 2,
  titleTemplate: 'SSP for {{ ._app }}',
  profileIds: ['p-1'],
  createdAt: '2026-10-19T10:00:00Z',
  updatedAt: '2026-10-19T10:00:00Z',
};

function mountDialog(template: SspTemplate | null = null) {
  return mount(SspTemplateFormDialog, {
    props: { visible: true, template },
    global: {
      stubs: {
        Dialog: {
          props: ['visible'],
          template: '<div v-if="visible"><slot /></div>',
        },
        AutoComplete: {
          name: 'AutoComplete',
          props: ['modelValue', 'disabled'],
          emits: ['update:modelValue'],
          template: '<div data-testid="chips" />',
        },
        MultiSelect: {
          name: 'MultiSelect',
          props: ['modelValue', 'options'],
          emits: ['update:modelValue'],
          template: '<div />',
        },
        TemplatePreview: {
          name: 'TemplatePreview',
          props: ['titleTemplate', 'labelSchema'],
          template: '<div />',
        },
      },
    },
  });
}

describe('SspTemplateFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.save.mockResolvedValue({ data: ref({ data: saved }) });
  });

  it('creates a template with a kebab-case body', async () => {
    const wrapper = mountDialog();
    await wrapper.find('#ssp-template-name').setValue('Apps');
    await wrapper
      .findComponent({ name: 'AutoComplete' })
      .vm.$emit('update:modelValue', ['_app']);
    await wrapper.find('#ssp-template-title').setValue('SSP for {{ ._app }}');
    await wrapper.find('#ssp-template-filter').setValue('auto_create_ssp=true');
    await wrapper
      .findComponent({ name: 'MultiSelect' })
      .vm.$emit('update:modelValue', ['p-1']);

    // The preview names sample labels like the Go template placeholders.
    expect(
      wrapper.findComponent({ name: 'TemplatePreview' }).props('labelSchema'),
    ).toEqual([{ key: '._app', description: '' }]);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(state.saveConfig).toEqual({
      transformRequest: [state.decamelizeKeys],
    });
    expect(state.save).toHaveBeenCalledWith('/api/admin/ssp-templates', {
      method: 'POST',
      data: expect.objectContaining({
        name: 'Apps',
        keys: ['_app'],
        filter: {
          scope: {
            condition: {
              label: 'auto_create_ssp',
              operator: '=',
              value: 'true',
            },
          },
        },
        profileIds: ['p-1'],
      }),
    });
    expect(wrapper.emitted('saved')?.[0]).toEqual([saved]);
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false]);
  });

  it('edits a saved template with its keys locked', async () => {
    const wrapper = mountDialog(saved);
    expect(state.loadProfiles).toHaveBeenCalledTimes(1);
    const keys = wrapper.findAllComponents({ name: 'AutoComplete' })[0];
    expect(keys.props('disabled')).toBe(true);
    expect(keys.props('modelValue')).toEqual(['_app']);
    expect(
      wrapper.findAll('[data-testid="ssp-template-scope-group"]'),
    ).toHaveLength(1);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(state.save).toHaveBeenCalledWith('/api/admin/ssp-templates/t-1', {
      method: 'PUT',
      data: expect.objectContaining({ keys: ['_app'], minStreams: 2 }),
    });
  });

  it('explains an invalid filter and does not save', async () => {
    const wrapper = mountDialog(saved);
    await wrapper.find('#ssp-template-filter').setValue('a=b AND c=d OR e=f');
    expect(wrapper.text()).toContain('Filter is invalid');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(state.save).not.toHaveBeenCalled();
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Invalid template' }),
    );
  });

  it('shows the API error when saving fails', async () => {
    state.save.mockRejectedValue({
      response: {
        status: 400,
        data: { errors: { body: 'keys cannot change' } },
      },
    });
    const wrapper = mountDialog(saved);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Save Failed',
        detail: 'keys cannot change',
      }),
    );
    expect(wrapper.emitted('saved')).toBeUndefined();
  });

  it('adds and removes scope label groups and properties', async () => {
    const wrapper = mountDialog();
    const button = (text: string) =>
      wrapper.findAll('button').find((b) => b.text() === text)!;

    await button('Add Group').trigger('click');
    await button('Add Property').trigger('click');
    expect(
      wrapper.findAll('[data-testid="ssp-template-scope-group"]'),
    ).toHaveLength(1);
    expect(wrapper.findAll('[data-testid="ssp-template-prop"]')).toHaveLength(
      1,
    );

    await button('Remove').trigger('click');
    expect(
      wrapper.findAll('[data-testid="ssp-template-scope-group"]'),
    ).toHaveLength(0);
  });

  it('does not load profiles until the dialog opens', async () => {
    const wrapper = mount(SspTemplateFormDialog, {
      props: { visible: false, template: null },
      global: { stubs: { Dialog: true } },
    });
    expect(state.loadProfiles).not.toHaveBeenCalled();

    await wrapper.setProps({ visible: true });
    expect(state.loadProfiles).toHaveBeenCalledTimes(1);
  });
});
