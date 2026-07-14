import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SharedResponsibilityPanel from '../SharedResponsibilityPanel.vue';
import type { ControlExportOffer } from '@/types/ssp-export-offerings';
import type { SharedResponsibilityRollup } from '@/types/ssp-leverage';

const { getMock, deleteMock, toastAddMock, permState, fetchedUrls } =
  vi.hoisted(() => ({
    getMock: vi.fn(),
    deleteMock: vi.fn(),
    toastAddMock: vi.fn(),
    permState: { can: true },
    fetchedUrls: [] as string[],
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

const rollupFixture: SharedResponsibilityRollup = {
  provides: [
    {
      controlId: 'ac-2',
      statementId: 'ac-2_smt.a',
      requirementUuid: 'req-1',
      statementUuid: 'stmt-1',
      byComponentUuid: 'bc-1',
      componentUuid: 'comp-1',
      componentTitle: 'API',
      providedUuid: 'p-1',
      description: 'We manage the account lifecycle',
      responsibilities: [
        { responsibilityUuid: 'resp-1', description: 'You approve requests' },
      ],
    },
  ],
  inherits: [
    {
      controlId: 'ac-2',
      statementId: 'ac-2_smt.b',
      byComponentUuid: 'bc-2',
      componentUuid: 'comp-2',
      inheritedUuid: 'i-1',
      providedUuid: 'up-p-1',
      description: 'Platform provides IdP',
      responsibilities: [],
      leverageLinkId: 'link-1',
      satisfaction: 'partial',
      status: 'drifted',
      driftRiskId: 'risk-1',
    },
  ],
  satisfies: [
    {
      controlId: 'ac-2',
      statementId: 'ac-2_smt.b',
      byComponentUuid: 'bc-2',
      componentUuid: 'comp-2',
      satisfiedUuid: 's-1',
      responsibilityUuid: 'up-resp-1',
      description: 'We review IdP access quarterly',
      leverageLinkId: 'link-1',
      status: 'active',
    },
  ],
  legacy: [
    {
      controlId: 'ac-2',
      requirementUuid: 'req-1',
      byComponentUuid: 'bc-legacy',
      componentUuid: 'comp-3',
      componentTitle: 'Legacy Box',
      description: 'Requirement-anchored export',
      providedCount: 1,
      responsibilityCount: 0,
    },
  ],
};

const offersFixture: ControlExportOffer[] = [
  {
    offeringId: 'offering-1',
    offeringTitle: 'Meridian Platform Baseline',
    offeringVersion: 2,
    upstreamSspId: 'ssp-upstream',
    upstreamSspTitle: 'Meridian Platform',
    itemId: 'item-1',
    controlId: 'ac-2',
    statementId: 'ac-2_smt.c',
    componentUuid: 'comp-9',
    providedUuid: 'up-p-9',
    providedDescription: 'Platform manages privileged accounts',
    responsibilities: [
      { responsibilityUuid: 'up-resp-9', description: 'You review the log' },
    ],
  },
];

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    useDataApi: () => {
      const data = ref<unknown>(undefined);
      const execute = (url: string) => {
        fetchedUrls.push(url);
        if (url.includes('/shared-responsibility')) {
          data.value = rollupFixture;
        }
        if (url.includes('/by-control/')) {
          data.value = offersFixture;
        }
        return Promise.resolve({ data: ref({ data: data.value }) });
      };
      return { data, isLoading: ref(false), error: ref(null), execute };
    },
    useAuthenticatedInstance: () => ({
      get: getMock,
      delete: deleteMock,
    }),
  };
});

const stubs = {
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
  Badge: {
    props: ['severity'],
    template: '<span :data-severity="severity"><slot /></span>',
  },
  Dialog: {
    props: ['visible'],
    template: '<div v-if="visible"><slot /></div>',
  },
  SecondaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SubscribeOfferingWizard: {
    props: ['sspId', 'offering', 'scopedItemIds', 'preselectedItemIds'],
    emits: ['cancel', 'subscribed'],
    template:
      '<div data-testid="wizard" :data-offering-id="offering.id" :data-scoped="scopedItemIds.join(\',\')" :data-preselected="preselectedItemIds.join(\',\')" />',
  },
};

function mountPanel() {
  return mount(SharedResponsibilityPanel, {
    props: { sspId: 'ssp-1', controlId: 'ac-2' },
    global: { stubs },
  });
}

function findButton(wrapper: ReturnType<typeof mountPanel>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

describe('SharedResponsibilityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchedUrls.length = 0;
    permState.can = true;
    getMock.mockResolvedValue({ data: { data: [] } });
    deleteMock.mockResolvedValue({});
  });

  it('fetches the rollup and the by-control offers for the selected SSP and control', () => {
    mountPanel();
    expect(fetchedUrls).toEqual([
      '/api/oscal/system-security-plans/ssp-1/shared-responsibility?controlId=ac-2',
      '/api/oscal/ssp-export-offerings/by-control/ac-2?downstreamSspId=ssp-1',
    ]);
  });

  it('renders provides, inherits, satisfies and legacy from the rollup', () => {
    const wrapper = mountPanel();
    const text = wrapper.text();

    expect(text).toContain('We manage the account lifecycle');
    expect(text).toContain('You approve requests');
    expect(text).toContain('Platform provides IdP');
    expect(text).toContain('drifted');
    expect(text).toContain('link-1');
    expect(text).toContain('We review IdP access quarterly');
    expect(text).toContain('Requirement-anchored export');
    expect(text).toContain('shared responsibility is tracked per statement');
  });

  it('emits editProvides with the statement row behind the Edit affordance', async () => {
    const wrapper = mountPanel();
    await findButton(wrapper, 'Edit').trigger('click');

    const emitted = wrapper.emitted('editProvides');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({
      statementUuid: 'stmt-1',
      byComponentUuid: 'bc-1',
    });
  });

  it('deletes a legacy row against the requirement-level by-component route', async () => {
    const wrapper = mountPanel();
    await findButton(wrapper, 'Delete').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/by-components/bc-legacy',
    );
  });

  it('renders the available-to-import offers and opens the wizard pre-scoped to the item', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: [{ id: 'offering-1', title: 'Meridian Platform Baseline' }],
      },
    });

    const wrapper = mountPanel();
    expect(wrapper.text()).toContain('Meridian Platform Baseline');
    expect(wrapper.text()).toContain('Platform manages privileged accounts');
    expect(wrapper.text()).toContain('You would take on: You review the log');

    await findButton(wrapper, 'Import implementation').trigger('click');
    await flushPromises();

    // The offering is resolved from the flat catalog — the only cross-SSP read that stays
    // inside the leverage trust boundary.
    expect(getMock).toHaveBeenCalledWith('/api/oscal/ssp-export-offerings');

    const wizard = wrapper.find('[data-testid="wizard"]');
    expect(wizard.attributes('data-offering-id')).toBe('offering-1');
    expect(wizard.attributes('data-scoped')).toBe('item-1');
    expect(wizard.attributes('data-preselected')).toBe('item-1');
  });

  it('re-emits the subscribe payload (with meta.created) after importing', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: [{ id: 'offering-1', title: 'Meridian Platform Baseline' }],
      },
    });

    const wrapper = mountPanel();
    await findButton(wrapper, 'Import implementation').trigger('click');
    await flushPromises();

    const meta = {
      created: {
        implementedRequirements: [
          { uuid: 'req-9', controlId: 'ac-2', created: true },
        ],
      },
    };
    wrapper
      .getComponent<typeof SharedResponsibilityPanel>('[data-testid="wizard"]')
      .vm.$emit('subscribed', { links: [], meta });
    await flushPromises();

    const emitted = wrapper.emitted('imported');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({ meta });
  });

  it('hides Import and Delete without the corresponding permissions', () => {
    permState.can = false;
    const wrapper = mountPanel();
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Import implementation');
    expect(buttonTexts).not.toContain('Delete');
    expect(buttonTexts).not.toContain('Edit');
  });
});
