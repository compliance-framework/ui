import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import IndexControlImplementation from '../IndexControlImplementation.vue';
import type { Control, ImplementedRequirement } from '@/oscal';

const { executeCreateMock, permState } = vi.hoisted(() => ({
  executeCreateMock: vi.fn(),
  permState: { can: true },
}));

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: {
      securityPlan: {
        uuid: 'ssp-1',
        metadata: { title: 'Meridian Platform' },
      },
    },
  }),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: (data: unknown) => data,
  useDataApi: () => ({
    execute: executeCreateMock,
    data: ref(null),
    isLoading: ref(false),
    error: ref(null),
  }),
}));

const stubs = {
  InheritedResponsibilityRows: {
    props: ['controlId', 'statementId', 'statement'],
    template: '<div data-testid="responsibility-rows" />',
  },
  Drawer: {
    props: ['visible'],
    template:
      '<div v-if="visible" data-testid="statement-drawer"><slot /></div>',
  },
  Message: { template: '<div><slot /></div>' },
  TooltipTitle: { props: ['text'], template: '<span>{{ text }}</span>' },
  ControlStatementImplementation: {
    template: '<div data-testid="statement-implementation" />',
  },
  ExportStatementDialog: {
    props: [
      'visible',
      'sspId',
      'sspTitle',
      'controlId',
      'statementId',
      'statementText',
    ],
    emits: ['update:visible', 'saved'],
    template:
      '<div v-if="visible" data-testid="export-dialog" :data-control-id="controlId" :data-statement-id="statementId" :data-ssp-title="sspTitle" />',
  },
  SecondaryButton: {
    emits: ['click'],
    template:
      '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  PermissionGate: {
    template: '<span v-if="allowed"><slot /></span>',
    computed: {
      allowed: () => permState.can,
    },
  },
};

const control: Control = {
  id: 'ac-1',
  title: 'Access Control',
  parts: [
    {
      id: 'ac-1_smt.a',
      name: 'statement',
      prose: 'The org must manage accounts.',
    },
  ],
} as Control;

function makeImplementation(
  states: Array<string | undefined>,
  options: { inherited?: boolean } = {},
): ImplementedRequirement {
  return {
    uuid: 'req-1',
    controlId: 'ac-1',
    statements: [
      {
        uuid: 'stmt-1',
        statementId: 'ac-1_smt.a',
        byComponents: states.map((state, index) => ({
          uuid: `bc-${index}`,
          componentUuid: `comp-${index}`,
          description: 'x',
          ...(state ? { implementationStatus: { state } } : {}),
          ...(options.inherited
            ? { inherited: [{ uuid: `i-${index}`, description: 'inh' }] }
            : {}),
        })),
      },
    ],
  } as ImplementedRequirement;
}

function mountComponent(implementation: ImplementedRequirement | null) {
  return mount(IndexControlImplementation, {
    props: { control, implementation },
    global: { stubs },
  });
}

function exportButton(wrapper: ReturnType<typeof mountComponent>) {
  return wrapper.findAll('button').find((b) => b.text() === 'Export');
}

describe('IndexControlImplementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
  });

  it.each([['implemented'], ['alternative']])(
    'shows the Export button on a uniformly %s statement',
    (state) => {
      const wrapper = mountComponent(makeImplementation([state, state]));
      expect(exportButton(wrapper)).toBeTruthy();
    },
  );

  it.each([['partial'], ['planned'], ['not-applicable']])(
    'hides the Export button for a uniformly %s statement',
    (state) => {
      const wrapper = mountComponent(makeImplementation([state]));
      expect(exportButton(wrapper)).toBeUndefined();
    },
  );

  it('hides the Export button when the by-component states are mixed or absent', () => {
    expect(
      exportButton(
        mountComponent(makeImplementation(['implemented', 'planned'])),
      ),
    ).toBeUndefined();
    expect(
      exportButton(mountComponent(makeImplementation([undefined]))),
    ).toBeUndefined();
    expect(exportButton(mountComponent(null))).toBeUndefined();
  });

  it('hides the Export button without permission', () => {
    permState.can = false;
    const wrapper = mountComponent(makeImplementation(['implemented']));
    expect(exportButton(wrapper)).toBeUndefined();
  });

  it('shows the Inherited chip even when the by-component carries no status', () => {
    // Subscribe materializes downstream by-components with NO implementationStatus:
    // there is no status chip at all, but the Inherited tag must still render.
    const wrapper = mountComponent(
      makeImplementation([undefined], { inherited: true }),
    );
    expect(wrapper.text()).toContain('Inherited');
    expect(wrapper.text()).not.toContain('Implemented');
  });

  it('shows the Inherited chip alongside a status chip when both apply', () => {
    const wrapper = mountComponent(
      makeImplementation(['implemented'], { inherited: true }),
    );
    expect(wrapper.text()).toContain('Implemented');
    expect(wrapper.text()).toContain('Inherited');
  });

  it('never offers Export on an inherited statement, even a uniformly implemented one', () => {
    // Re-exporting a capability the SSP merely consumes would rebroadcast the upstream
    // provider's implementation as this system's own.
    const wrapper = mountComponent(
      makeImplementation(['implemented'], { inherited: true }),
    );
    expect(exportButton(wrapper)).toBeUndefined();
  });

  it('shows no Inherited chip without inherited entries', () => {
    const wrapper = mountComponent(makeImplementation(['implemented']));
    expect(wrapper.text()).not.toContain('Inherited');
  });

  it('opens the export dialog without opening the statement drawer', async () => {
    const wrapper = mountComponent(makeImplementation(['implemented']));

    await exportButton(wrapper)!.trigger('click');
    await flushPromises();

    const dialog = wrapper.find('[data-testid="export-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes('data-control-id')).toBe('ac-1');
    expect(dialog.attributes('data-statement-id')).toBe('ac-1_smt.a');
    expect(dialog.attributes('data-ssp-title')).toBe('Meridian Platform');

    // @click.stop: exporting must not also select the statement part (which opens the
    // drawer and can even lazily create an implemented requirement).
    expect(wrapper.find('[data-testid="statement-drawer"]').exists()).toBe(
      false,
    );
    expect(executeCreateMock).not.toHaveBeenCalled();
  });

  it('re-emits exported when the dialog saves', async () => {
    const wrapper = mountComponent(makeImplementation(['implemented']));
    await exportButton(wrapper)!.trigger('click');

    wrapper
      .getComponent<
        typeof IndexControlImplementation
      >('[data-testid="export-dialog"]')
      .vm.$emit('saved');

    expect(wrapper.emitted('exported')).toHaveLength(1);
  });
});
