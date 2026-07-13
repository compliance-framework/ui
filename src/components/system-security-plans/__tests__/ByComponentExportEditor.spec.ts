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
      '<div>' +
      '<textarea :value="description" @input="$emit(\'update:description\', $event.target.value)" />' +
      '<button type="button" @click="$emit(\'update:responsibleRoles\', [...responsibleRoles, { roleId: \'owner\', partyUuids: [] }])">Add Role</button>' +
      '</div>',
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

function findButton(wrapper: ReturnType<typeof mountEditor>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
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
    await findButton(wrapper, 'Add Provided').trigger('click');
    await wrapper.find('textarea').setValue('We provide X');
    await findButton(wrapper, 'Save').trigger('click');
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

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    const lastPayload = emitted![emitted!.length - 1][0] as ByComponentExport;
    expect(lastPayload.provided).toContainEqual(
      expect.objectContaining({ uuid: 'p-1', description: 'We provide X' }),
    );
  });

  it('includes responsible roles when creating a provided entry', async () => {
    postMock
      .mockResolvedValueOnce({
        data: { data: { description: '', remarks: '' } },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            uuid: 'p-1',
            description: 'We provide X',
            responsibleRoles: [{ roleId: 'owner', partyUuids: [] }],
          },
        },
      });

    const wrapper = mountEditor({ modelValue: undefined });
    await findButton(wrapper, 'Add Provided').trigger('click');
    await wrapper.find('textarea').setValue('We provide X');
    await findButton(wrapper, 'Add Role').trigger('click');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/provided',
      expect.objectContaining({
        responsibleRoles: [{ roleId: 'owner', partyUuids: [] }],
      }),
      expect.anything(),
    );
  });

  it('uses the statement-level route when stmtId is set', async () => {
    postMock
      .mockResolvedValueOnce({ data: { data: { description: '' } } })
      .mockResolvedValueOnce({
        data: { data: { uuid: 'p-1', description: 'x', responsibleRoles: [] } },
      });

    const wrapper = mountEditor({ modelValue: undefined, stmtId: 'stmt-1' });
    await findButton(wrapper, 'Add Provided').trigger('click');
    await wrapper.find('textarea').setValue('x');
    await findButton(wrapper, 'Save').trigger('click');
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
    await findButton(wrapper, 'Edit').trigger('click');
    await wrapper.find('textarea').setValue('Updated');
    await findButton(wrapper, 'Save').trigger('click');
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
    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/provided/p-1',
    );
  });

  it('discards draft changes and issues no request when adding a provided entry is cancelled', async () => {
    const wrapper = mountEditor({ modelValue: undefined });
    await findButton(wrapper, 'Add Provided').trigger('click');
    await wrapper.find('textarea').setValue('Discarded description');
    await findButton(wrapper, 'Cancel').trigger('click');
    await flushPromises();

    expect(postMock).not.toHaveBeenCalled();
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(
      wrapper.findAll('button').some((b) => b.text() === 'Add Provided'),
    ).toBe(true);
  });

  it('discards edits to an existing provided entry when Cancel is clicked', async () => {
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [
        { uuid: 'p-1', description: 'Original', responsibleRoles: [] },
      ],
      responsibilities: [],
    };
    const wrapper = mountEditor({ modelValue });
    await findButton(wrapper, 'Edit').trigger('click');
    await wrapper.find('textarea').setValue('Changed but discarded');
    await findButton(wrapper, 'Cancel').trigger('click');
    await flushPromises();

    expect(putMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Original');
    expect(wrapper.text()).not.toContain('Changed but discarded');
  });

  it('shows an error toast when creating a provided entry fails', async () => {
    postMock
      .mockResolvedValueOnce({ data: { data: { description: '' } } })
      .mockRejectedValueOnce(new Error('network down'));

    const wrapper = mountEditor({ modelValue: undefined });
    await findButton(wrapper, 'Add Provided').trigger('click');
    await wrapper.find('textarea').setValue('We provide X');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
  });

  it('shows an error toast when removing a provided entry fails', async () => {
    deleteMock.mockRejectedValueOnce(new Error('network down'));
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [
        { uuid: 'p-1', description: 'Original', responsibleRoles: [] },
      ],
      responsibilities: [],
    };
    const wrapper = mountEditor({ modelValue });
    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
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
    await findButton(wrapper, 'Add Responsibility').trigger('click');
    await findButton(wrapper, 'Save').trigger('click');
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
    await findButton(wrapper, 'Add Responsibility').trigger('click');
    await wrapper.find('select').setValue('p-1');
    await wrapper.find('textarea').setValue('My responsibility');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/responsibilities',
      expect.objectContaining({ providedUuid: 'p-1' }),
      expect.anything(),
    );
  });

  it('includes responsible roles when creating a responsibility entry', async () => {
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
          responsibleRoles: [{ roleId: 'owner', partyUuids: [] }],
        },
      },
    });

    const wrapper = mountEditor({ modelValue });
    await findButton(wrapper, 'Add Responsibility').trigger('click');
    await wrapper.find('select').setValue('p-1');
    await wrapper.find('textarea').setValue('My responsibility');
    await findButton(wrapper, 'Add Role').trigger('click');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/responsibilities',
      expect.objectContaining({
        providedUuid: 'p-1',
        responsibleRoles: [{ roleId: 'owner', partyUuids: [] }],
      }),
      expect.anything(),
    );
  });

  it('edits an existing responsibility entry via PUT', async () => {
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [],
      responsibilities: [
        {
          uuid: 'r-1',
          description: 'Original',
          providedUuid: 'p-1',
          responsibleRoles: [],
        },
      ],
    };
    putMock.mockResolvedValueOnce({
      data: {
        data: {
          uuid: 'r-1',
          description: 'Updated',
          providedUuid: 'p-1',
          responsibleRoles: [],
        },
      },
    });

    const wrapper = mountEditor({ modelValue });
    await findButton(wrapper, 'Edit').trigger('click');
    await wrapper.find('textarea').setValue('Updated');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(putMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/responsibilities/r-1',
      expect.objectContaining({ description: 'Updated' }),
      expect.anything(),
    );
  });

  it('removes a responsibility entry via DELETE', async () => {
    const modelValue: ByComponentExport = {
      uuid: 'exp-1',
      description: '',
      provided: [],
      responsibilities: [
        {
          uuid: 'r-1',
          description: 'Original',
          providedUuid: 'p-1',
          responsibleRoles: [],
        },
      ],
    };
    const wrapper = mountEditor({ modelValue });
    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-1/export/responsibilities/r-1',
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
