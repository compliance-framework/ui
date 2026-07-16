import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SystemSecurityPlanControlImplementationView from '../SystemSecurityPlanControlImplementationView.vue';
import type { ControlImplementation } from '@/oscal';

const { deleteMock, toastAddMock, permState } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  toastAddMock: vi.fn(),
  permState: { can: true },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'ssp-1' } }),
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

vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: (onConfirm: () => void) => onConfirm(),
  }),
}));

// One requirement holding both shapes: a statement-level by-component (authorable) and a
// legacy requirement-level one (read-only + deletable).
const controlImplementation: ControlImplementation = {
  description: 'How we do it',
  implementedRequirements: [
    {
      uuid: 'req-1',
      controlId: 'ac-2',
      statements: [
        {
          uuid: 'stmt-1',
          statementId: 'ac-2_smt.a',
          description: 'Statement A',
          byComponents: [
            {
              uuid: 'bc-stmt',
              componentUuid: 'comp-1',
              description: 'Statement-level implementation',
            },
          ],
        },
      ],
      byComponents: [
        {
          uuid: 'bc-legacy',
          componentUuid: 'comp-2',
          description: 'Legacy requirement-level implementation',
        },
      ],
    },
  ],
};

// The SSP and control-implementation reads now go through `execute(url)` against a computed
// URL (the <KeepAlive> stale-fetch fix), so the URL arrives per call rather than at
// construction — this routing has to key on the execute url, not the ctor arg.
vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    decamelizeKeys: (data: unknown) => data,
    useDataApi: () => {
      const data = ref<unknown>(undefined);
      const execute = (executeUrl: string) => {
        if (typeof executeUrl === 'string') {
          if (executeUrl.endsWith('/control-implementation')) {
            data.value = controlImplementation;
            return Promise.resolve({ data: ref({ data: data.value }) });
          }
          if (
            executeUrl.startsWith('/api/oscal/system-security-plans/') &&
            !executeUrl.includes('/control-implementation') &&
            !executeUrl.includes('/risks')
          ) {
            data.value = { uuid: 'ssp-1' };
            return Promise.resolve({ data: ref({ data: data.value }) });
          }
        }
        // Mutations (DELETE/PUT) and the risks read land here.
        return deleteMock(executeUrl);
      };
      return { data, isLoading: ref(false), execute };
    },
    useAuthenticatedInstance: () => ({
      get: vi.fn(async () => ({ data: { data: { inherits: [] } } })),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }),
  };
});

const stubs = {
  TooltipTitle: { template: '<h3><slot /></h3>' },
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible"><slot /></div>',
  },
  PrimaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SecondaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  TertiaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  ImplementedRequirementCreateForm: { template: '<div />' },
  ImplementedRequirementEditForm: { template: '<div />' },
  ControlImplementationEditForm: { template: '<div />' },
  StatementEditForm: { template: '<div />' },
  StatementCreateForm: { template: '<div />' },
  ByComponentEditForm: {
    props: ['sspId', 'requirement', 'statement', 'byComponent'],
    template:
      '<div data-testid="by-component-form" :data-stmt-id="statement?.uuid ?? \'\'" :data-bc-id="byComponent.uuid" />',
  },
  StatementByComponent: {
    props: ['byComponent'],
    emits: ['editSharedResponsibility'],
    template:
      '<button data-testid="edit-shared" @click="$emit(\'editSharedResponsibility\', byComponent)">Edit Shared Responsibility</button>',
  },
};

function mountView() {
  return mount(SystemSecurityPlanControlImplementationView, {
    global: { stubs, directives: { tooltip: () => {} } },
  });
}

describe('SystemSecurityPlanControlImplementationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    deleteMock.mockResolvedValue(undefined);
  });

  // The regression this whole change starts from: the statement-level modal was declared but
  // its visibility flag was never set, so the export editor was unreachable in the running
  // app — every seeded SSP is 100% statement-level.
  it('opens ByComponentEditForm with the statement when a statement-level by-component is edited', async () => {
    const wrapper = mountView();

    expect(wrapper.find('[data-testid="by-component-form"]').exists()).toBe(
      false,
    );

    await wrapper.find('[data-testid="edit-shared"]').trigger('click');

    const form = wrapper.find('[data-testid="by-component-form"]');
    expect(form.exists()).toBe(true);
    expect(form.attributes('data-stmt-id')).toBe('stmt-1');
    expect(form.attributes('data-bc-id')).toBe('bc-stmt');
  });

  it('offers the legacy requirement-level path a read-only View and a Delete, never an Edit', async () => {
    const wrapper = mountView();

    expect(wrapper.text()).toContain(
      'Legacy — shared responsibility is tracked per statement',
    );

    const legacySection = wrapper.text();
    expect(legacySection).toContain('Legacy requirement-level implementation');

    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).toContain('View');
    expect(buttonTexts).toContain('Delete');

    // Opening it yields the form with no statement — ByComponentEditForm renders that
    // read-only.
    const view = wrapper.findAll('button').find((b) => b.text() === 'View');
    await view!.trigger('click');
    const form = wrapper.find('[data-testid="by-component-form"]');
    expect(form.attributes('data-stmt-id')).toBe('');
    expect(form.attributes('data-bc-id')).toBe('bc-legacy');
  });

  it('deletes a legacy by-component against the requirement-level route', async () => {
    const wrapper = mountView();

    const deleteButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Delete');
    // The last Delete belongs to the legacy by-component (the first is the requirement's).
    await deleteButtons[deleteButtons.length - 1].trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-legacy',
    );
  });
});
