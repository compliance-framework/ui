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

vi.mock('@/ds/toasts', () => ({
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
  // Inline, so the dialog's content is in the wrapper.
  Dialog: {
    props: ['open', 'title'],
    template: '<div v-if="open"><h2>{{ title }}</h2><slot /></div>',
  },
  // A disabled button's reason tooltip needs a provider; the text is enough here.
  Tooltip: { template: '<slot />' },
};

/** The input labelled `label` (FormField ties them with a generated id). */
function field(wrapper: VueWrapper, label: string) {
  const labelEl = wrapper
    .findAll('label')
    .find((l) => l.text().replace('*', '').trim() === label);
  expect(labelEl, `missing field ${label}`).toBeTruthy();
  return wrapper.find(`[id="${labelEl!.attributes('for')}"]`);
}

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
    await field(topLevel, 'ID').setValue('ac-1');
    await field(topLevel, 'Title').setValue('Policy');
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
    await field(groupControl, 'ID').setValue('ac-2');
    await field(groupControl, 'Title').setValue('Account Management');
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
    await field(nestedControl, 'ID').setValue('ac-1.1');
    await field(nestedControl, 'Title').setValue('Policy Procedures');
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
    await field(wrapper, 'ID').setValue('ac-1');
    await field(wrapper, 'Title').setValue('Policy');
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
    await field(topLevel, 'ID').setValue('ia');
    await field(topLevel, 'Title').setValue('Identification');
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
    await field(subGroup, 'ID').setValue('ac-family');
    await field(subGroup, 'Title').setValue('Family');
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
    await field(controlEdit, 'Title').setValue('');
    await submit(controlEdit);
    expect(controlEdit.text()).toContain('Title is required');
    expect(
      executeFor('/api/oscal/catalogs/catalog-1/controls/ac-1'),
    ).not.toHaveBeenCalled();

    await field(controlEdit, 'Title').setValue('Updated Control');
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
    await field(groupEdit, 'Title').setValue('Updated Group');
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
    await field(catalogEdit, 'Title').setValue('Updated Catalog');
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
