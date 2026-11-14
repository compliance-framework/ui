import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import type { LeveragedControl } from '@/types/ssp-leverage';
import SystemInheritedCapabilitiesSection from '../SystemInheritedCapabilitiesSection.vue';

const { postMock, toastAddMock, permState, controlsData, fetched } = vi.hoisted(
  () => ({
    postMock: vi.fn(),
    toastAddMock: vi.fn(),
    permState: { canUpdateSsp: true },
    controlsData: { current: [] as LeveragedControl[] },
    fetched: [] as { url: string; config: unknown }[],
  }),
);

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => permState.canUpdateSsp }),
}));
vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  return {
    useDataApi: (url: string, config: unknown) => {
      fetched.push({ url, config });
      return {
        data: ref(controlsData.current),
        error: ref(undefined),
        isLoading: ref(false),
        isFinished: ref(true),
        execute: vi.fn(() => {
          fetched.push({ url, config });
          return Promise.resolve();
        }),
      };
    },
    useAuthenticatedInstance: () => ({ post: postMock }),
  };
});

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
    providedUuid: 'up-p-1',
    byComponentId: 'bc-1',
    satisfaction: 'full',
    status: 'active',
    outstandingResponsibilities: [],
    responsibilityPosture: {},
    ...overrides,
  };
}

const PROJECTION =
  '/api/oscal/system-security-plans/ssp-downstream-1/leveraged-controls';

async function mountSection() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      {
        path: '/system-security-plans/:id/risks/:riskId',
        name: 'system-security-plan-risk-detail',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SystemInheritedCapabilitiesSection, { sspId: 'ssp-downstream-1' }),
        ),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  // Open every capability, as a reader would.
  for (const d of wrapper.findAllComponents(Disclosure))
    d.vm.$emit('update:open', true);
  await flushPromises();
  return wrapper;
}

const buttons = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('button').map((b) => b.text());

describe('SystemInheritedCapabilitiesSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    permState.canUpdateSsp = true;
    controlsData.current = [];
    fetched.length = 0;
    postMock.mockResolvedValue({ data: { data: {} } });
  });

  it('renders an empty state when there are no inherited capabilities', async () => {
    const wrapper = await mountSection();
    expect(wrapper.text()).toContain('No inherited capabilities yet');
    wrapper.unmount();
  });

  it('shows the offering and satisfaction, fetching only the projection (posture keys kept)', async () => {
    controlsData.current = [makeControl()];
    const wrapper = await mountSection();
    expect(wrapper.findComponent(Disclosure).props('label')).toBe(
      'ac-2 · Statement ac-2_smt.a',
    );
    expect(wrapper.text()).toContain('Covered by FedRAMP AC-2 Baseline v1');
    expect(wrapper.text()).toContain('full satisfaction');
    expect(fetched.map((f) => f.url)).toEqual([PROJECTION]);
    expect(fetched[0]!.config).toEqual({
      camelcaseStopPaths: ['data.responsibilityPosture'],
    });
    wrapper.unmount();
  });

  it('shows outstanding responsibilities with their posture', async () => {
    controlsData.current = [
      makeControl({
        satisfaction: 'partial',
        outstandingResponsibilities: [
          { responsibilityUuid: 'r-1', description: 'Rotate credentials' },
        ],
        responsibilityPosture: { 'r-1': 'not-satisfied' },
      }),
    ];
    const wrapper = await mountSection();
    expect(wrapper.text()).toContain('partial satisfaction');
    expect(wrapper.text()).toContain('Rotate credentials');
    expect(wrapper.text()).toContain('Not satisfied');
    wrapper.unmount();
  });

  it('opens drifted capabilities with a warning, Re-attest and the drift risk', async () => {
    controlsData.current = [
      makeControl({ status: 'drifted', driftRiskId: 'risk-1' }),
    ];
    const wrapper = await mountSection();
    expect(wrapper.findComponent(Disclosure).props('open')).toBe(true);
    expect(wrapper.text()).toContain('This capability is drifted');
    expect(
      wrapper
        .find('a[href="/system-security-plans/ssp-downstream-1/risks/risk-1"]')
        .text(),
    ).toBe('View drift risk');
    expect(buttons(wrapper)).toContain('Re-attest');
    wrapper.unmount();
  });

  it('warns about a revoked capability without offering Re-attest or a missing risk link', async () => {
    controlsData.current = [makeControl({ status: 'revoked' })];
    const wrapper = await mountSection();
    expect(wrapper.text()).toContain('This capability is revoked');
    expect(buttons(wrapper)).not.toContain('Re-attest');
    expect(wrapper.text()).not.toContain('View drift risk');
    wrapper.unmount();
  });

  it('re-attests after confirmation and reloads the projection', async () => {
    controlsData.current = [makeControl({ status: 'drifted' })];
    const wrapper = await mountSection();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Re-attest')!
      .trigger('click');
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(postMock).toHaveBeenCalledWith(`${PROJECTION}/link-1/attest`);
    expect(fetched.map((f) => f.url)).toEqual([PROJECTION, PROJECTION]);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
    wrapper.unmount();
  });

  it('shows an error toast when re-attest fails', async () => {
    postMock.mockRejectedValueOnce(new Error('network down'));
    controlsData.current = [makeControl({ status: 'drifted' })];
    const wrapper = await mountSection();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Re-attest')!
      .trigger('click');
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
    wrapper.unmount();
  });

  it('disables Re-attest without ssp:update', async () => {
    permState.canUpdateSsp = false;
    controlsData.current = [makeControl({ status: 'drifted' })];
    const wrapper = await mountSection();
    const button = wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Re-attest'))!;
    expect(button.attributes('aria-disabled')).toBe('true');
    wrapper.unmount();
  });
});
