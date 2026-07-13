import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SystemSecurityPlanInheritedCapabilitiesView from '../SystemSecurityPlanInheritedCapabilitiesView.vue';
import type { LeveragedControl } from '@/types/ssp-leverage';

const { postMock, toastAddMock, confirmRequireMock, permState, controlsData } =
  vi.hoisted(() => ({
    postMock: vi.fn(),
    toastAddMock: vi.fn(),
    confirmRequireMock: vi.fn(),
    permState: { canUpdateSsp: true },
    controlsData: { current: [] as LeveragedControl[] },
  }));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'ssp-downstream-1' } }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: confirmRequireMock }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => permState.canUpdateSsp,
    permissionTooltip: () => '',
  }),
}));

const fetchedUrls: string[] = [];
const executeMock = vi.fn();
vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    useDataApi: (url: string) => {
      fetchedUrls.push(url);
      return {
        data: ref(controlsData.current),
        isLoading: ref(false),
        execute: executeMock,
      };
    },
    useAuthenticatedInstance: () => ({ post: postMock }),
  };
});

const stubs = {
  RouterLink: {
    props: ['to'],
    template: '<a><slot /></a>',
  },
  Badge: {
    props: ['severity'],
    template: '<span :data-severity="severity"><slot /></span>',
  },
  SecondaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
};

function makeControl(
  overrides: Partial<LeveragedControl> = {},
): LeveragedControl {
  return {
    id: 'link-1',
    controlId: 'ac-2',
    statementId: 'ac-2_smt.a',
    inheritedFrom: {
      upstreamSspId: 'ssp-upstream-1',
      offeringId: 'offering-1',
      offeringTitle: 'FedRAMP AC-2 Baseline',
      offeringVersion: 1,
    },
    satisfaction: 'full',
    status: 'active',
    outstandingResponsibilities: [],
    responsibilityPosture: {},
    ...overrides,
  };
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

function mountView() {
  return mount(SystemSecurityPlanInheritedCapabilitiesView, {
    global: { stubs },
  });
}

describe('SystemSecurityPlanInheritedCapabilitiesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.canUpdateSsp = true;
    controlsData.current = [];
    fetchedUrls.length = 0;
    postMock.mockResolvedValue({ data: { data: {} } });
    executeMock.mockResolvedValue(undefined);
  });

  it('renders an empty state when there are no inherited capabilities', () => {
    const wrapper = mountView();
    expect(wrapper.text()).toContain('No inherited capabilities yet.');
  });

  it('renders the covered-by badge, satisfaction, and no catalog controls are fetched', () => {
    controlsData.current = [makeControl()];
    const wrapper = mountView();
    expect(wrapper.text()).toContain('ac-2');
    expect(wrapper.text()).toContain('Statement ac-2_smt.a');
    expect(wrapper.text()).toContain('Covered by FedRAMP AC-2 Baseline v1');
    expect(wrapper.text()).toContain('full');

    expect(fetchedUrls).toEqual([
      '/api/oscal/system-security-plans/ssp-downstream-1/leveraged-controls',
    ]);
    for (const url of fetchedUrls) {
      expect(url).not.toContain('/catalogs');
      expect(url).not.toContain('/profiles');
    }
  });

  it('renders outstanding responsibilities with posture', () => {
    controlsData.current = [
      makeControl({
        satisfaction: 'partial',
        outstandingResponsibilities: [
          { responsibilityUuid: 'r-1', description: 'Rotate credentials' },
        ],
        responsibilityPosture: { 'r-1': 'not-satisfied' },
      }),
    ];
    const wrapper = mountView();
    expect(wrapper.text()).toContain('partial');
    expect(wrapper.text()).toContain('Rotate credentials');
    expect(wrapper.text()).toContain('not-satisfied');
  });

  it('shows a warning and Re-attest for a drifted link, plus a link to the drift risk', async () => {
    controlsData.current = [
      makeControl({ status: 'drifted', driftRiskId: 'risk-1' }),
    ];
    const wrapper = mountView();
    expect(wrapper.text()).toContain(
      'This capability is drifted and may no longer reflect the upstream offering.',
    );
    expect(wrapper.text()).toContain('View drift risk');
    expect(wrapper.findAll('button').map((b) => b.text())).toContain(
      'Re-attest',
    );
  });

  it('shows a warning for a revoked link without a Re-attest button', () => {
    controlsData.current = [makeControl({ status: 'revoked' })];
    const wrapper = mountView();
    expect(wrapper.text()).toContain(
      'This capability is revoked and may no longer reflect the upstream offering.',
    );
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain(
      'Re-attest',
    );
  });

  it('does not show a drift-risk link when driftRiskId is absent', () => {
    controlsData.current = [makeControl({ status: 'drifted' })];
    const wrapper = mountView();
    expect(wrapper.text()).not.toContain('View drift risk');
  });

  it('re-attests a drifted link and refreshes the projection', async () => {
    controlsData.current = [
      makeControl({ status: 'drifted', driftRiskId: 'risk-1' }),
    ];
    const wrapper = mountView();

    await findButton(wrapper, 'Re-attest').trigger('click');
    expect(confirmRequireMock).toHaveBeenCalled();

    const { accept } = confirmRequireMock.mock.calls[0][0];
    await accept();
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-downstream-1/leveraged-controls/link-1/attest',
    );
    expect(executeMock).toHaveBeenCalled();
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
  });

  it('hides Re-attest without ssp:update', () => {
    permState.canUpdateSsp = false;
    controlsData.current = [
      makeControl({ status: 'drifted', driftRiskId: 'risk-1' }),
    ];
    const wrapper = mountView();
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain(
      'Re-attest',
    );
  });
});
