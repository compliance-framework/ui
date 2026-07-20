import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ByComponentEditForm from '../ByComponentEditForm.vue';
import type { ByComponent, ImplementedRequirement, Statement } from '@/oscal';

const { updateMock, getMock, toastAddMock, permState } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  getMock: vi.fn(),
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

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    decamelizeKeys: (data: unknown) => data,
    useDataApi: () => ({
      data: ref({ uuid: 'bc-1', componentUuid: 'comp-1', description: 'x' }),
      isLoading: ref(false),
      execute: updateMock,
    }),
    useAuthenticatedInstance: () => ({
      get: getMock,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }),
  };
});

const stubs = {
  Message: { template: '<div class="message"><slot /></div>' },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  InputText: { template: '<input />' },
  SecondaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  ByComponentExportEditor: {
    props: ['sspId', 'reqId', 'stmtId', 'byComponentId', 'modelValue'],
    template: '<div data-testid="export-editor" :data-stmt-id="stmtId" />',
  },
  ByComponentInheritedEditor: {
    props: ['sspId', 'reqId', 'stmtId', 'byComponentId', 'modelValue'],
    template: '<div data-testid="inherited-editor" :data-stmt-id="stmtId" />',
  },
  ByComponentSatisfiedEditor: {
    props: [
      'sspId',
      'reqId',
      'stmtId',
      'byComponentId',
      'modelValue',
      'responsibilityOptions',
      'responsibilityOptionsFailed',
    ],
    template:
      '<div data-testid="satisfied-editor" :data-stmt-id="stmtId" :data-options="responsibilityOptions.map((o) => o.responsibilityUuid).join(\',\')" :data-failed="String(!!responsibilityOptionsFailed)" />',
  },
  SharedResponsibilityBlocks: {
    props: ['byComponent'],
    template: '<div data-testid="shared-blocks" />',
  },
};

const requirement: ImplementedRequirement = {
  uuid: 'req-1',
  controlId: 'ac-1',
};

const statement: Statement = {
  uuid: 'stmt-1',
  statementId: 'ac-1_smt.a',
};

const byComponent: ByComponent = {
  uuid: 'bc-1',
  componentUuid: 'comp-1',
  description: 'Implemented by the API',
  export: { uuid: 'exp-1', description: '', provided: [] },
  inherited: [{ uuid: 'i-1', providedUuid: 'p-1', description: 'inherited' }],
  satisfied: [
    { uuid: 's-1', responsibilityUuid: 'resp-1', description: 'satisfied' },
  ],
};

function mountForm(withStatement: boolean) {
  return mount(ByComponentEditForm, {
    props: {
      sspId: 'ssp-1',
      requirement,
      ...(withStatement ? { statement } : {}),
      byComponent,
    },
    global: { stubs },
  });
}

describe('ByComponentEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    updateMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue({ data: { data: [] } });
  });

  it('renders the export, inherited and satisfied editors at statement level', () => {
    const wrapper = mountForm(true);
    expect(
      wrapper.find('[data-testid="export-editor"]').attributes('data-stmt-id'),
    ).toBe('stmt-1');
    expect(wrapper.find('[data-testid="inherited-editor"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="satisfied-editor"]').exists()).toBe(
      true,
    );
  });

  it('strips export, inherited and satisfied from the by-component PUT', async () => {
    const wrapper = mountForm(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // Each of the three subtrees is persisted by its own editor against dedicated endpoints;
    // sending them here would race those writes.
    expect(updateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        export: undefined,
        inherited: undefined,
        satisfied: undefined,
      }),
    });
  });

  it('offers the inherited responsibility even when the projection cases the statement id differently', async () => {
    // Statement ids, like control ids, are not reliably cased the same in an SSP as in the
    // catalog the leveraged-controls projection echoes. An exact-match join silently told the
    // author to "inherit a capability first" while looking at the entry they had just added.
    getMock.mockResolvedValue({
      data: {
        data: [
          {
            controlId: 'AC-1',
            statementId: 'AC-1_SMT.A',
            outstandingResponsibilities: [
              {
                responsibilityUuid: 'resp-1',
                description: 'Rotate your own keys',
              },
            ],
          },
        ],
      },
    });

    const wrapper = mountForm(true);
    await flushPromises();

    const satisfied = wrapper.find('[data-testid="satisfied-editor"]');
    expect(satisfied.attributes('data-options')).toBe('resp-1');
    expect(satisfied.attributes('data-failed')).toBe('false');
  });

  it('fetches the leveraged-controls projection exactly once per open', async () => {
    mountForm(true);
    await flushPromises();

    // onMounted's Object.assign swaps the `inherited` reference, which trips the watcher — so
    // an explicit call there too would fetch the same projection twice on every open.
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/leveraged-controls',
    );
  });

  it('flags a failed projection fetch rather than reporting no responsibilities to satisfy', async () => {
    getMock.mockRejectedValueOnce(new Error('boom'));

    const wrapper = mountForm(true);
    await flushPromises();

    const satisfied = wrapper.find('[data-testid="satisfied-editor"]');
    expect(satisfied.attributes('data-failed')).toBe('true');
    expect(satisfied.attributes('data-options')).toBe('');
  });

  it('is read-only for a legacy requirement-level by-component', () => {
    const wrapper = mountForm(false);

    expect(wrapper.find('.message').text()).toContain(
      'legacy, requirement-level component implementation',
    );
    // No editors, no form, no save — read and close only.
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('[data-testid="export-editor"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="inherited-editor"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="satisfied-editor"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-testid="shared-blocks"]').exists()).toBe(true);
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).toEqual(['Close']);
  });
});
