import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ExportOfferingItemsDialog from '../ExportOfferingItemsDialog.vue';
import type { ControlImplementation, SystemImplementation } from '@/oscal';
import type { SSPExportOffering } from '@/types/ssp-export-offerings';

const { postMock, deleteMock, toastAddMock, permState } = vi.hoisted(() => ({
  postMock: vi.fn(),
  deleteMock: vi.fn(),
  toastAddMock: vi.fn(),
  permState: { can: true },
}));

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
  useAuthenticatedInstance: () => ({
    post: postMock,
    delete: deleteMock,
  }),
}));

const stubs = {
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.key" :value="o.key">{{ o.label }}</option></select>',
  },
  Label: { template: '<label><slot /></label>' },
  PrimaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
};

const systemImplementation: SystemImplementation = {
  users: [],
  components: [
    {
      uuid: 'comp-1',
      type: 'software',
      title: 'API',
      description: '',
      status: { state: 'operational' },
    },
  ],
};

const controlImplementation: ControlImplementation = {
  description: '',
  implementedRequirements: [
    {
      uuid: 'req-1',
      controlId: 'ac-1',
      byComponents: [
        {
          uuid: 'bc-1',
          componentUuid: 'comp-1',
          description: '',
          export: {
            uuid: 'exp-1',
            description: '',
            provided: [
              { uuid: 'p-1', description: 'We provide access control' },
            ],
          },
        },
      ],
    },
  ],
};

function makeOffering(
  overrides: Partial<SSPExportOffering> = {},
): SSPExportOffering {
  return {
    id: 'offering-1',
    sspId: 'ssp-1',
    title: 'My Offering',
    description: '',
    version: 0,
    status: 'draft',
    contentHash: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [],
    ...overrides,
  };
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

describe('ExportOfferingItemsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    postMock.mockResolvedValue({ data: { data: {} } });
    deleteMock.mockResolvedValue({});
  });

  it('renders an empty state when the offering has no items', () => {
    const wrapper = mount(ExportOfferingItemsDialog, {
      props: {
        sspId: 'ssp-1',
        offering: makeOffering(),
        controlImplementation,
        systemImplementation,
      },
      global: { stubs },
    });
    expect(wrapper.text()).toContain(
      "No items yet. Add one from the SSP's authored capabilities.",
    );
  });

  it('adds an item for the selected capability', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          id: 'item-1',
          offeringId: 'offering-1',
          controlId: 'ac-1',
          componentUuid: 'comp-1',
          providedUuid: 'p-1',
        },
      },
    });

    const wrapper = mount(ExportOfferingItemsDialog, {
      props: {
        sspId: 'ssp-1',
        offering: makeOffering(),
        controlImplementation,
        systemImplementation,
      },
      global: { stubs },
    });

    await wrapper.find('select').setValue('ac-1::::comp-1::p-1');
    await findButton(wrapper, 'Add Item').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/items',
      {
        controlId: 'ac-1',
        statementId: undefined,
        componentUuid: 'comp-1',
        providedUuid: 'p-1',
      },
    );
    expect(wrapper.emitted('updated')).toBeTruthy();
    expect(wrapper.text()).toContain('ac-1');
  });

  it('removes an existing item', async () => {
    const wrapper = mount(ExportOfferingItemsDialog, {
      props: {
        sspId: 'ssp-1',
        offering: makeOffering({
          items: [
            {
              id: 'item-1',
              offeringId: 'offering-1',
              controlId: 'ac-1',
              componentUuid: 'comp-1',
              providedUuid: 'p-1',
            },
          ],
        }),
        controlImplementation,
        systemImplementation,
      },
      global: { stubs },
    });

    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/items/item-1',
    );
    const emitted = wrapper.emitted('updated');
    expect(emitted).toBeTruthy();
    expect(emitted![emitted!.length - 1][0]).toEqual([]);
  });

  it('shows an error toast when adding an item fails', async () => {
    postMock.mockRejectedValueOnce(new Error('network down'));

    const wrapper = mount(ExportOfferingItemsDialog, {
      props: {
        sspId: 'ssp-1',
        offering: makeOffering(),
        controlImplementation,
        systemImplementation,
      },
      global: { stubs },
    });

    await wrapper.find('select').setValue('ac-1::::comp-1::p-1');
    await findButton(wrapper, 'Add Item').trigger('click');
    await flushPromises();

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Failed to add item.',
      }),
    );
  });

  it('shows an error toast when removing an item fails', async () => {
    deleteMock.mockRejectedValueOnce(new Error('network down'));

    const wrapper = mount(ExportOfferingItemsDialog, {
      props: {
        sspId: 'ssp-1',
        offering: makeOffering({
          items: [
            {
              id: 'item-1',
              offeringId: 'offering-1',
              controlId: 'ac-1',
              componentUuid: 'comp-1',
              providedUuid: 'p-1',
            },
          ],
        }),
        controlImplementation,
        systemImplementation,
      },
      global: { stubs },
    });

    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: 'Failed to remove item.',
      }),
    );
  });

  it('hides Add/Remove controls without the corresponding permission', () => {
    permState.can = false;
    const wrapper = mount(ExportOfferingItemsDialog, {
      props: {
        sspId: 'ssp-1',
        offering: makeOffering({
          items: [
            {
              id: 'item-1',
              offeringId: 'offering-1',
              controlId: 'ac-1',
              componentUuid: 'comp-1',
              providedUuid: 'p-1',
            },
          ],
        }),
        controlImplementation,
        systemImplementation,
      },
      global: { stubs },
    });

    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Add Item');
    expect(buttonTexts).not.toContain('Remove');
  });

  it('disables Add/Remove controls once the offering is revoked', () => {
    const wrapper = mount(ExportOfferingItemsDialog, {
      props: {
        sspId: 'ssp-1',
        offering: makeOffering({
          status: 'revoked',
          items: [
            {
              id: 'item-1',
              offeringId: 'offering-1',
              controlId: 'ac-1',
              componentUuid: 'comp-1',
              providedUuid: 'p-1',
            },
          ],
        }),
        controlImplementation,
        systemImplementation,
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain(
      'This offering has been revoked and can no longer be modified.',
    );
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Add Item');
    expect(buttonTexts).not.toContain('Remove');
  });
});
