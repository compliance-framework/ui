import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import IndexView from '../IndexView.vue';

const listProfiles = vi.fn();
const axiosGet = vi.fn();
const loadRisks = vi.fn(async () => ({ data: { value: { data: [] } } }));
const fetchControlImplementations = vi.fn();
const uiStore = {
  controlImplementationDrawerOpen: false,
  controlImplementationSelectedRequirementId: null as string | null,
  controlImplementationExpandedKeys: {},
  setControlImplementationDrawerOpen: vi.fn((value: boolean) => {
    uiStore.controlImplementationDrawerOpen = value;
  }),
  setControlImplementationSelectedRequirementId: vi.fn(
    (value: string | null) => {
      uiStore.controlImplementationSelectedRequirementId = value;
    },
  ),
  setControlImplementationExpandedKeys: vi.fn((value) => {
    uiStore.controlImplementationExpandedKeys = value;
  }),
};

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: { securityPlan: { uuid: 'ssp-1' } },
  }),
}));

vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => ({
    listProfiles,
  }),
}));

vi.mock('@/stores/ui.ts', () => ({
  useUIStore: () => uiStore,
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/composables/useCatalogTree', () => ({
  buildTreeNodesWithPrefix: () => [
    {
      key: 'control:ac-1',
      type: 'control',
      data: { id: 'ac-1', title: 'Access Control' },
    },
    {
      key: 'control:ac-2',
      type: 'control',
      data: { id: 'ac-2', title: 'Audit Control' },
    },
  ],
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: axiosGet, post: vi.fn() }),
  decamelizeKeys: (data: unknown) => data,
  useDataApi: (url: string | null) => {
    if (typeof url === 'string' && url.includes('control-implementation')) {
      return {
        isLoading: ref(false),
        execute: fetchControlImplementations,
      };
    }
    return {
      data: ref([]),
      isLoading: ref(false),
      error: ref(null),
      execute: loadRisks,
    };
  },
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

vi.mock('bootstrap-icons-vue', () => ({
  BIconEye: { template: '<span />' },
}));

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForMountedControls() {
  for (let index = 0; index < 5; index += 1) {
    await flushPromises();
  }
}

const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  Message: { template: '<div><slot /></div>' },
  Badge: { template: '<span><slot />{{ value }}</span>', props: ['value'] },
  Button: {
    props: ['disabled', 'ariaLabel', 'title', 'label'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" :aria-label="ariaLabel" :title="title" @click="!disabled && $emit(\'click\', $event)"><slot />{{ label }}</button>',
  },
  Tree: defineComponent({
    props: ['value'],
    setup(props, { slots }) {
      function flatten(nodes: unknown[]): unknown[] {
        return nodes.flatMap((node) => {
          const item = node as { type?: string; children?: unknown[] };
          return item.type === 'control'
            ? [item]
            : flatten(item.children ?? []);
        });
      }

      return () =>
        h(
          'div',
          flatten((props.value as unknown[]) ?? []).map((node) =>
            h('div', { key: (node as { key: string }).key }, [
              slots.control?.({ node }),
            ]),
          ),
        );
    },
  }),
  Drawer: { template: '<div><slot /></div>' },
  IndexControlImplementation: { template: '<div />' },
  RiskIndicatorBadge: { template: '<span />' },
  ControlEvidenceCounter: { template: '<span />' },
  StatementByComponent: { template: '<div />' },
  PageHeader: { template: '<h1><slot /></h1>' },
  PageSubHeader: { template: '<p><slot /></p>' },
};

describe('control implementations IndexView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uiStore.controlImplementationDrawerOpen = false;
    uiStore.controlImplementationSelectedRequirementId = null;
    uiStore.controlImplementationExpandedKeys = {};
    listProfiles.mockResolvedValue({
      data: [{ uuid: 'profile-1', title: 'Profile One' }],
    });
    axiosGet.mockResolvedValue({ data: { data: { uuid: 'catalog-1' } } });
    fetchControlImplementations.mockResolvedValue({
      data: {
        value: {
          data: {
            implementedRequirements: [
              {
                uuid: 'req-1',
                controlId: 'ac-1',
                statements: [],
              },
            ],
          },
        },
      },
    });
  });

  it('disables the implementation eye button when a control has no implementation', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const noImplementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'No implementation yet');

    expect(noImplementationButton?.attributes('disabled')).toBeDefined();
    await noImplementationButton?.trigger('click');
    expect(uiStore.setControlImplementationDrawerOpen).not.toHaveBeenCalled();
  });

  it('opens the drawer with the selected requirement when an implementation exists', async () => {
    const wrapper = mount(IndexView, { global: { stubs } });
    await waitForMountedControls();

    const implementationButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('title') === 'View implementation');

    expect(implementationButton).toBeDefined();
    expect(implementationButton?.attributes('disabled')).toBeUndefined();
    await implementationButton?.trigger('click');

    expect(uiStore.setControlImplementationDrawerOpen).toHaveBeenCalledWith(
      true,
    );
    expect(
      uiStore.setControlImplementationSelectedRequirementId,
    ).toHaveBeenCalledWith('req-1');
  });
});
