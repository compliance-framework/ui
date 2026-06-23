import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import type { Component } from 'vue';
import ControlCreateForm from '@/components/catalogs/ControlCreateForm.vue';
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue';
import ControlEditModal from '@/components/catalogs/ControlEditModal.vue';
import GroupCreateForm from '@/components/catalogs/GroupCreateForm.vue';
import GroupEditModal from '@/components/catalogs/GroupEditModal.vue';
import CatalogEditModal from '@/components/catalogs/CatalogEditModal.vue';
import type { Catalog, Control, Group } from '@/oscal';

const apiCalls: Array<{
  url: string;
  execute: ReturnType<typeof vi.fn>;
}> = [];

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: (url = '') => {
    const execute = vi.fn(async () => ({
      data: {
        value: {
          data: {
            id: 'created-id',
            uuid: 'catalog-1',
            title: 'Created item',
            metadata: { title: 'Created catalog' },
          },
        },
      },
    }));
    apiCalls.push({ url: String(url), execute });
    return {
      execute,
      data: { value: undefined },
      isLoading: { value: false },
      error: { value: null },
    };
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

const catalog: Catalog = {
  uuid: 'catalog-1',
  metadata: { title: 'Catalog One' },
} as Catalog;

const group: Group = {
  id: 'ac',
  title: 'Access Control',
} as Group;

const control: Control = {
  id: 'ac-1',
  title: 'Access Control Policy',
  class: 'SP800-53',
} as Control;

const stubs = {
  Label: {
    props: ['for', 'required'],
    template:
      '<label :for="$props.for"><slot /><span v-if="required">*</span></label>',
  },
  InputText: {
    props: ['id', 'modelValue', 'invalid', 'disabled', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<input :id="id" :value="modelValue" :disabled="disabled" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Textarea: {
    props: ['id', 'modelValue', 'invalid', 'disabled', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<textarea :id="id" :value="modelValue" :disabled="disabled" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Message: {
    props: ['severity'],
    template: '<div role="alert"><slot /></div>',
  },
  PrimaryButton: {
    props: ['disabled', 'type'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
  },
  SecondaryButton: {
    props: ['disabled', 'type'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
  },
  TertiaryButton: {
    props: ['disabled', 'type'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
  },
  Dialog: {
    props: ['visible', 'header'],
    template: '<div v-if="visible"><h2>{{ header }}</h2><slot /></div>',
  },
};

function mountForm(component: Component, props: Record<string, unknown>) {
  return mount(component, {
    props,
    global: { stubs },
  });
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit.prevent');
}

function executeFor(url: string) {
  const call = apiCalls.find((apiCall) => apiCall.url === url);
  expect(call, `missing API call for ${url}`).toBeTruthy();
  return call?.execute;
}

describe('catalog forms', () => {
  beforeEach(() => {
    apiCalls.length = 0;
    vi.clearAllMocks();
  });

  it('blocks control creation when required fields are missing', async () => {
    const wrapper = mountForm(ControlCreateForm, { catalog });

    await submit(wrapper);

    expect(wrapper.text()).toContain('Control ID is required');
    expect(wrapper.text()).toContain('Title is required');
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(
      apiCalls.every((apiCall) => apiCall.execute.mock.calls.length === 0),
    ).toBe(true);
  });

  it('creates top-level, group, and nested controls through the existing endpoints', async () => {
    const topLevel = mountForm(ControlCreateForm, { catalog });
    await topLevel.find('#control-id').setValue('ac-1');
    await topLevel.find('#control-title').setValue('Policy');
    await submit(topLevel);

    expect(
      executeFor('/api/oscal/catalogs/catalog-1/controls'),
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'ac-1', title: 'Policy' }),
    });
    expect(topLevel.emitted('created')).toBeTruthy();

    apiCalls.length = 0;
    const groupControl = mountForm(ControlCreateForm, {
      catalog,
      parentGroup: group,
    });
    await groupControl.find('#control-id').setValue('ac-2');
    await groupControl.find('#control-title').setValue('Account Management');
    await submit(groupControl);

    expect(
      executeFor('/api/oscal/catalogs/catalog-1/groups/ac/controls'),
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'ac-2',
        title: 'Account Management',
      }),
    });

    apiCalls.length = 0;
    const nestedControl = mountForm(ControlCreateForm, {
      catalog,
      parentControl: control,
    });
    await nestedControl.find('#control-id').setValue('ac-1.1');
    await nestedControl.find('#control-title').setValue('Policy Procedures');
    await submit(nestedControl);

    expect(
      executeFor('/api/oscal/catalogs/catalog-1/controls/ac-1/controls'),
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'ac-1.1',
        title: 'Policy Procedures',
      }),
    });
  });

  it('renders server errors in the control create form', async () => {
    const wrapper = mountForm(ControlCreateForm, { catalog });
    await wrapper.find('#control-id').setValue('ac-1');
    await wrapper.find('#control-title').setValue('Policy');
    executeFor('/api/oscal/catalogs/catalog-1/controls')?.mockRejectedValueOnce(
      new Error('API rejected control'),
    );

    await submit(wrapper);

    expect(wrapper.text()).toContain('API rejected control');
  });

  it('closes the control create modal on cancel without calling the API', async () => {
    const wrapper = mount(ControlCreateModal, {
      props: {
        catalog,
        modelValue: true,
      },
      global: { stubs },
    });

    const cancelButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel');
    expect(cancelButton).toBeTruthy();
    await cancelButton?.trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(
      apiCalls.every((apiCall) => apiCall.execute.mock.calls.length === 0),
    ).toBe(true);
  });

  it('blocks group creation when required fields are missing', async () => {
    const wrapper = mountForm(GroupCreateForm, { catalog });

    await submit(wrapper);

    expect(wrapper.text()).toContain('Group ID is required');
    expect(wrapper.text()).toContain('Title is required');
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(
      apiCalls.every((apiCall) => apiCall.execute.mock.calls.length === 0),
    ).toBe(true);
  });

  it('creates groups and sub-groups through the existing endpoints', async () => {
    const topLevel = mountForm(GroupCreateForm, { catalog });
    await topLevel.find('#group-id').setValue('ia');
    await topLevel.find('#group-title').setValue('Identification');
    await submit(topLevel);

    expect(
      executeFor('/api/oscal/catalogs/catalog-1/groups'),
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'ia', title: 'Identification' }),
      }),
    );
    expect(topLevel.emitted('created')).toBeTruthy();

    apiCalls.length = 0;
    const subGroup = mountForm(GroupCreateForm, { catalog, parent: group });
    await subGroup.find('#group-id').setValue('ac-family');
    await subGroup.find('#group-title').setValue('Family');
    await submit(subGroup);

    expect(
      executeFor('/api/oscal/catalogs/catalog-1/groups/ac/groups'),
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 'ac-family', title: 'Family' }),
      }),
    );
  });

  it('updates control, group, and catalog forms with validation', async () => {
    const controlEdit = mountForm(ControlEditModal, {
      catalog,
      control,
      modelValue: true,
    });
    await controlEdit.find('#control-edit-title').setValue('');
    await submit(controlEdit);
    expect(controlEdit.text()).toContain('Title is required');
    expect(
      executeFor('/api/oscal/catalogs/catalog-1/controls/ac-1'),
    ).not.toHaveBeenCalled();

    await controlEdit.find('#control-edit-title').setValue('Updated Control');
    await submit(controlEdit);
    expect(
      executeFor('/api/oscal/catalogs/catalog-1/controls/ac-1'),
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'ac-1', title: 'Updated Control' }),
    });
    expect(controlEdit.emitted('updated')).toBeTruthy();

    const groupEdit = mountForm(GroupEditModal, {
      catalog,
      group,
      modelValue: true,
    });
    await groupEdit.find('#group-edit-title').setValue('Updated Group');
    await submit(groupEdit);
    expect(
      executeFor('/api/oscal/catalogs/catalog-1/groups/ac'),
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: 'ac', title: 'Updated Group' }),
    });
    expect(groupEdit.emitted('updated')).toBeTruthy();

    const catalogEdit = mountForm(CatalogEditModal, {
      catalog,
      modelValue: true,
    });
    await catalogEdit.find('#catalog-edit-title').setValue('Updated Catalog');
    await submit(catalogEdit);
    expect(executeFor('/api/oscal/catalogs/catalog-1')).toHaveBeenCalledWith({
      data: expect.objectContaining({
        uuid: 'catalog-1',
        metadata: expect.objectContaining({ title: 'Updated Catalog' }),
      }),
    });
    expect(catalogEdit.emitted('updated')).toBeTruthy();
  });
});
