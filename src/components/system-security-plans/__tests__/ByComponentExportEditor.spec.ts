import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ByComponentExportEditor from '../ByComponentExportEditor.vue';
import type { ByComponentExport } from '@/oscal';

const { postMock, putMock, deleteMock, toastAddMock, permState } = vi.hoisted(
  () => ({
    postMock: vi.fn(),
    putMock: vi.fn(),
    deleteMock: vi.fn(),
    toastAddMock: vi.fn(),
    permState: { can: true },
  }),
);

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => permState.can,
    permissionTooltip: () => '',
  }),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: (data: unknown) => data,
  useAuthenticatedInstance: () => ({
    post: postMock,
    put: putMock,
    delete: deleteMock,
  }),
}));

const stubs = {
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.uuid" :value="o.uuid">{{ o.description }}</option></select>',
  },
  Label: { template: '<label><slot /></label>' },
  Message: { template: '<div class="message"><slot /></div>' },
  PrimaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SecondaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  ByComponentExportEntryFields: {
    props: ['description', 'responsibleRoles'],
    emits: ['update:description', 'update:responsibleRoles'],
    template:
      '<textarea :value="description" @input="$emit(\'update:description\', $event.target.value)" />',
  },
};

function mountEditor(props: {
  modelValue: ByComponentExport | undefined;
  stmtId?: string;
}) {
  return mount(ByComponentExportEditor, {
    props: {
      sspId: 'ssp-1',
      reqId: 'req-1',
      byComponentId: 'bc-1',
      ...props,
    },
    global: { stubs },
  });
}

describe('ByComponentExportEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    postMock.mockResolvedValue({ data: { data: {} } });
    putMock.mockResolvedValue({ data: { data: {} } });
    deleteMock.mockResolvedValue({});
  });

  it('renders empty states when there is no export data', () => {
    const wrapper = mountEditor({ modelValue: undefined });
    expect(wrapper.text()).toContain('No provided entries yet.');
    expect(wrapper.text()).toContain('No responsibility entries yet.');
  });

  it('creates the export then the provided entry on first Add Provided', async () => {
    postMock
      .mockResolvedValueOnce({
        data: { data: { description: '', remarks: '' } },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            uuid: 'p-1',
            description: 'We provide X',
            responsibleRoles: [],
          },
        },
      });

    const wrapper = mountEditor({ modelValue: undefined });
    await wrapper.find('button').trigger('click'); // Add Provided
    await wrapper.find('textarea').setValue('We provide X');
    const saveButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save')!;
    await saveButton.trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export',
      expect.objectContaining({ description: '' }),
      expect.anything(),
    );
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/provided',
      expect.objectContaining({ description: 'We provide X' }),
      expect.anything(),
    );
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('uses the statement-level route when stmtId is set', async () => {
    postMock
      .mockResolvedValueOnce({ data: { data: { description: '' } } })
      .mockResolvedValueOnce({
        data: { data: { uuid: 'p-1', description: 'x', responsibleRoles: [] } },
      });

    const wrapper = mountEditor({ modelValue: undefined, stmtId: 'stmt-1' });
    await wrapper.find('button').trigger('click');
    await wrapper.find('textarea').setValue('x');
    const saveButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save')!;
    await saveButton.trigger('click');
    await flushPromises();

    expect(postMock.mock.calls[0][0]).toBe(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components/bc-1/export',
    );
  });

  it('edits an existing provided entry via PUT', async () => {
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [
        { uuid: 'p-1', description: 'Original', responsibleRoles: [] },
      ],
      responsibilities: [],
    };
    putMock.mockResolvedValueOnce({
      data: {
        data: { uuid: 'p-1', description: 'Updated', responsibleRoles: [] },
      },
    });

    const wrapper = mountEditor({ modelValue });
    const editButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Edit')!;
    await editButton.trigger('click');
    await wrapper.find('textarea').setValue('Updated');
    const saveButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save')!;
    await saveButton.trigger('click');
    await flushPromises();

    expect(putMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/provided/p-1',
      expect.objectContaining({ description: 'Updated' }),
      expect.anything(),
    );
  });

  it('removes a provided entry via DELETE', async () => {
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [
        { uuid: 'p-1', description: 'Original', responsibleRoles: [] },
      ],
      responsibilities: [],
    };
    const wrapper = mountEditor({ modelValue });
    const removeButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Remove')!;
    await removeButton.trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/provided/p-1',
    );
  });

  it('blocks saving a new responsibility without a selected provided entry', async () => {
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [
        { uuid: 'p-1', description: 'Provided A', responsibleRoles: [] },
      ],
      responsibilities: [],
    };
    const wrapper = mountEditor({ modelValue });
    const addResponsibilityButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add Responsibility')!;
    await addResponsibilityButton.trigger('click');
    const saveButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save')!;
    await saveButton.trigger('click');
    await flushPromises();

    expect(postMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(
      'Select a provided entry before saving this responsibility.',
    );
  });

  it('creates a responsibility with the selected providedUuid', async () => {
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [
        { uuid: 'p-1', description: 'Provided A', responsibleRoles: [] },
      ],
      responsibilities: [],
    };
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          uuid: 'r-1',
          description: 'My responsibility',
          providedUuid: 'p-1',
          responsibleRoles: [],
        },
      },
    });

    const wrapper = mountEditor({ modelValue });
    const addResponsibilityButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add Responsibility')!;
    await addResponsibilityButton.trigger('click');
    await wrapper.find('select').setValue('p-1');
    await wrapper.find('textarea').setValue('My responsibility');
    const saveButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save')!;
    await saveButton.trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/responsibilities',
      expect.objectContaining({ providedUuid: 'p-1' }),
      expect.anything(),
    );
  });

  it('hides Add/Edit/Remove controls without ssp:update', () => {
    permState.can = false;
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [
        { uuid: 'p-1', description: 'Provided A', responsibleRoles: [] },
      ],
      responsibilities: [],
    };
    const wrapper = mountEditor({ modelValue });
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Add Provided');
    expect(buttonTexts).not.toContain('Add Responsibility');
    expect(buttonTexts).not.toContain('Edit');
    expect(buttonTexts).not.toContain('Remove');
  });
});
