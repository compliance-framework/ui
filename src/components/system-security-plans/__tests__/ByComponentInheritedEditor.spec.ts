import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ByComponentInheritedEditor from '../ByComponentInheritedEditor.vue';
import type { ByComponentInherit } from '@/oscal';

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

// The two editors now confirm before deleting (every other delete in this feature does);
// auto-confirm so the specs still exercise the DELETE itself.
vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: (onConfirm: () => void) => onConfirm(),
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
  Label: { template: '<label><slot /></label>' },
  Message: { template: '<div class="message"><slot /></div>' },
  InputText: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
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
      '<div><textarea :value="description" @input="$emit(\'update:description\', $event.target.value)" /></div>',
  },
};

const INHERITED_URL =
  '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components/bc-1/inherited';

function mountEditor(modelValue: ByComponentInherit[] | undefined) {
  return mount(ByComponentInheritedEditor, {
    props: {
      sspId: 'ssp-1',
      reqId: 'req-1',
      stmtId: 'stmt-1',
      byComponentId: 'bc-1',
      modelValue,
    },
    global: { stubs },
  });
}

function findButton(wrapper: ReturnType<typeof mountEditor>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

describe('ByComponentInheritedEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    postMock.mockResolvedValue({ data: { data: {} } });
    putMock.mockResolvedValue({ data: { data: {} } });
    deleteMock.mockResolvedValue({});
  });

  it('renders an empty state when there is nothing inherited', () => {
    const wrapper = mountEditor([]);
    expect(wrapper.text()).toContain('No inherited entries yet.');
  });

  it('creates an inherited entry against the statement-level URL', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          uuid: 'i-1',
          providedUuid: 'p-1',
          description: 'We inherit encryption at rest',
          responsibleRoles: [],
        },
      },
    });

    const wrapper = mountEditor([]);
    await findButton(wrapper, 'Add Inherited').trigger('click');
    await wrapper.find('input').setValue('p-1');
    await wrapper.find('textarea').setValue('We inherit encryption at rest');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      INHERITED_URL,
      expect.objectContaining({
        providedUuid: 'p-1',
        description: 'We inherit encryption at rest',
      }),
      // The OSCAL routes go over the wire kebab-cased.
      expect.objectContaining({ transformRequest: expect.anything() }),
    );

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted![emitted!.length - 1][0]).toContainEqual(
      expect.objectContaining({ uuid: 'i-1', providedUuid: 'p-1' }),
    );
  });

  it('refuses to create an entry without a provided uuid', async () => {
    const wrapper = mountEditor([]);
    await findButton(wrapper, 'Add Inherited').trigger('click');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).not.toHaveBeenCalled();
    expect(wrapper.find('.message').text()).toContain(
      'A provided UUID is required',
    );
  });

  it('does not let providedUuid be edited after create, and preserves it on PUT', async () => {
    const modelValue: ByComponentInherit[] = [
      { uuid: 'i-1', providedUuid: 'p-1', description: 'Original' },
    ];
    putMock.mockResolvedValueOnce({
      data: {
        data: {
          uuid: 'i-1',
          providedUuid: 'p-1',
          description: 'Updated',
          responsibleRoles: [],
        },
      },
    });

    const wrapper = mountEditor(modelValue);
    await findButton(wrapper, 'Edit').trigger('click');

    // No input for providedUuid is rendered in edit mode — only the draft form has one.
    expect(wrapper.find('input').exists()).toBe(false);

    await wrapper.find('textarea').setValue('Updated');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(putMock).toHaveBeenCalledWith(
      `${INHERITED_URL}/i-1`,
      expect.objectContaining({ providedUuid: 'p-1', description: 'Updated' }),
      expect.anything(),
    );
  });

  it('deletes an inherited entry', async () => {
    const wrapper = mountEditor([
      { uuid: 'i-1', providedUuid: 'p-1', description: 'Original' },
    ]);
    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(`${INHERITED_URL}/i-1`);
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted![emitted!.length - 1][0]).toEqual([]);
  });

  it('fires only one DELETE when Remove is double-clicked', async () => {
    // Without an in-flight guard the second DELETE 404s, toasting an error over a delete that
    // actually succeeded.
    let resolveDelete!: () => void;
    deleteMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );

    const wrapper = mountEditor([
      { uuid: 'i-1', providedUuid: 'p-1', description: 'Original' },
    ]);
    const remove = findButton(wrapper, 'Remove');
    await remove.trigger('click');
    await remove.trigger('click');

    expect(deleteMock).toHaveBeenCalledTimes(1);

    resolveDelete();
    await flushPromises();
    expect(toastAddMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
  });

  it('tells the user to unsubscribe when the entry is owned by a subscription (409)', async () => {
    deleteMock.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { errors: { body: 'the Meridian Platform Baseline offering' } },
      },
    });

    const wrapper = mountEditor([
      { uuid: 'i-1', providedUuid: 'p-1', description: 'Inherited from above' },
    ]);
    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        detail:
          'This capability is inherited from the Meridian Platform Baseline offering. Unsubscribe from the offering to remove it.',
      }),
    );
    // The row survives: only unsubscribing may remove it.
    expect(wrapper.text()).toContain('Inherited from above');
  });

  it('hides every mutation affordance without ssp:update', () => {
    permState.can = false;
    const wrapper = mountEditor([
      { uuid: 'i-1', providedUuid: 'p-1', description: 'Original' },
    ]);
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Add Inherited');
    expect(buttonTexts).not.toContain('Edit');
    expect(buttonTexts).not.toContain('Remove');
  });
});
