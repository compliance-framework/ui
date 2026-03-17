import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { Risk, SystemComponent, SystemUser } from '@/oscal';
import ComponentRisksList from '../ComponentRisksList.vue';

interface ApiCall {
  endpoint: string;
  method: string;
  data?: unknown;
}

const { mockApiState, resetMockApiState, pushMock, toastAddMock } = vi.hoisted(
  () => {
    const mockApiState = {
      apiCalls: [] as ApiCall[],
      linkError: null as Error | null,
    };

    const pushMock = vi.fn();
    const toastAddMock = vi.fn();

    const resetMockApiState = () => {
      mockApiState.apiCalls = [];
      mockApiState.linkError = null;
      pushMock.mockReset();
      toastAddMock.mockReset();
    };

    return {
      mockApiState,
      resetMockApiState,
      pushMock,
      toastAddMock,
    };
  },
);

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAddMock,
  }),
}));

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');

  return {
    decamelizeKeys: (data: unknown) => data,
    useDataApi: (
      initialUrl?: unknown,
      config?: { method?: string },
    ): {
      data: ReturnType<typeof ref<unknown>>;
      isLoading: ReturnType<typeof ref<boolean>>;
      error: ReturnType<typeof ref<unknown>>;
      execute: (arg1?: unknown, arg2?: unknown) => Promise<unknown>;
    } => {
      const data = ref<unknown>([]);
      const isLoading = ref(false);
      const error = ref<unknown>(null);

      const execute = async (arg1?: unknown, arg2?: unknown) => {
        const endpoint =
          typeof arg1 === 'string'
            ? arg1
            : typeof initialUrl === 'string'
              ? initialUrl
              : '';
        const requestConfig =
          typeof arg1 === 'string'
            ? ((arg2 as Record<string, unknown> | undefined) ?? {})
            : ((arg1 as Record<string, unknown> | undefined) ?? {});

        const method = String(
          requestConfig.method || config?.method || 'GET',
        ).toUpperCase();

        mockApiState.apiCalls.push({
          endpoint,
          method,
          data: requestConfig.data,
        });

        if (
          endpoint.includes('/api/oscal/system-security-plans/ssp-1/risks/') &&
          endpoint.endsWith('/components') &&
          method === 'POST'
        ) {
          if (mockApiState.linkError) {
            const nextError = mockApiState.linkError;
            mockApiState.linkError = null;
            throw nextError;
          }

          return { data: { data: undefined } };
        }

        return { data: { data: undefined } };
      };

      return {
        data,
        isLoading,
        error,
        execute,
      };
    },
  };
});

vi.mock('@/volt/PrimaryButton.vue', () => ({
  default: {
    name: 'PrimaryButton',
    props: ['disabled'],
    template: '<button :disabled="disabled" type="button"><slot /></button>',
  },
}));

vi.mock('@/volt/Drawer.vue', () => ({
  default: {
    name: 'Drawer',
    props: ['visible'],
    emits: ['update:visible'],
    template: '<div v-if="visible"><slot /></div>',
  },
}));

vi.mock('@/components/risk/RiskCreateForm.vue', () => ({
  default: {
    name: 'RiskCreateForm',
    emits: ['cancel', 'created'],
    template: `
      <div data-testid="risk-create-form">
        <button
          type="button"
          data-testid="emit-created"
          @click="$emit('created', { uuid: 'risk-created' })"
        >
          Emit Created
        </button>
      </div>
    `,
  },
}));

const component: SystemComponent = {
  uuid: 'comp-1',
  type: 'service',
  title: 'API Service',
  description: 'Primary API',
  status: { state: 'operational' },
};

function makeRisk(
  overrides: Partial<Risk> & Record<string, unknown>,
  uuid: string,
): Risk {
  return {
    uuid,
    title: `Risk ${uuid}`,
    description: `Description ${uuid}`,
    statement: `Statement ${uuid}`,
    status: 'open',
    ...overrides,
  } as Risk;
}

async function mountView(risks: Risk[]) {
  const wrapper = mount(ComponentRisksList, {
    props: {
      sspId: 'ssp-1',
      component,
      risks,
      users: [
        {
          uuid: 'user-1',
          title: 'Alice Owner',
        } as SystemUser,
      ],
    },
  });

  await flushPromises();
  return wrapper;
}

describe('ComponentRisksList', () => {
  beforeEach(() => {
    resetMockApiState();
  });

  it('shows only risks associated with the current component', async () => {
    const wrapper = await mountView([
      makeRisk({ componentIds: ['comp-1'], title: 'Linked A' }, 'risk-a'),
      makeRisk(
        { componentIds: ['comp-2'], title: 'Other Component' },
        'risk-b',
      ),
      makeRisk(
        { relatedComponents: [{ componentUuid: 'comp-1' }], title: 'Linked B' },
        'risk-c',
      ),
    ]);

    const rows = wrapper.findAll('[data-testid="risk-row"]');
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain('Linked A');
    expect(wrapper.text()).toContain('Linked B');
    expect(wrapper.text()).not.toContain('Other Component');
  });

  it('filters risks by selected status', async () => {
    const wrapper = await mountView([
      makeRisk(
        { componentIds: ['comp-1'], status: 'open', title: 'Open Risk' },
        'risk-open',
      ),
      makeRisk(
        { componentIds: ['comp-1'], status: 'closed', title: 'Closed Risk' },
        'risk-closed',
      ),
    ]);

    await wrapper.get('[data-testid="status-filter"]').setValue('closed');
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="risk-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Closed Risk');
  });

  it('treats resolved and complete statuses as closed in filtering', async () => {
    const wrapper = await mountView([
      makeRisk(
        {
          componentIds: ['comp-1'],
          status: 'resolved',
          title: 'Resolved Risk',
        },
        'risk-resolved',
      ),
      makeRisk(
        {
          componentIds: ['comp-1'],
          status: 'complete',
          title: 'Complete Risk',
        },
        'risk-complete',
      ),
      makeRisk(
        { componentIds: ['comp-1'], status: 'open', title: 'Open Risk' },
        'risk-open',
      ),
    ]);

    await wrapper.get('[data-testid="status-filter"]').setValue('closed');
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="risk-row"]');
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain('Resolved Risk');
    expect(wrapper.text()).toContain('Complete Risk');
    expect(wrapper.text()).not.toContain('Open Risk');
  });

  it('sorts risks by severity, status, and deadline', async () => {
    const wrapper = await mountView([
      makeRisk(
        {
          componentIds: ['comp-1'],
          title: 'Medium Deadline',
          likelihood: 'moderate',
          impact: 'high',
          deadline: '2026-03-05T00:00:00Z',
          status: 'investigating',
        },
        'risk-medium',
      ),
      makeRisk(
        {
          componentIds: ['comp-1'],
          title: 'Critical Deadline',
          likelihood: 'critical',
          impact: 'high',
          deadline: '2026-03-10T00:00:00Z',
          status: 'open',
        },
        'risk-critical',
      ),
      makeRisk(
        {
          componentIds: ['comp-1'],
          title: 'Low Deadline',
          likelihood: 'low',
          impact: 'low',
          deadline: '2026-03-01T00:00:00Z',
          status: 'closed',
        },
        'risk-low',
      ),
    ]);

    let rows = wrapper.findAll('[data-testid="risk-row"]');
    expect(rows[0].text()).toContain('Critical Deadline');

    await wrapper.get('[data-testid="sort-by"]').setValue('status');
    await wrapper.get('[data-testid="sort-direction"]').setValue('asc');
    await flushPromises();

    rows = wrapper.findAll('[data-testid="risk-row"]');
    expect(rows[0].text()).toContain('Low Deadline');

    await wrapper.get('[data-testid="sort-by"]').setValue('deadline');
    await wrapper.get('[data-testid="sort-direction"]').setValue('asc');
    await flushPromises();

    rows = wrapper.findAll('[data-testid="risk-row"]');
    expect(rows[0].text()).toContain('Low Deadline');
  });

  it('navigates to risk detail when clicking a risk row', async () => {
    const wrapper = await mountView([
      makeRisk(
        { componentIds: ['comp-1'], title: 'Clickable Risk' },
        'risk-click',
      ),
    ]);

    await wrapper.get('[data-testid="risk-row"]').trigger('click');

    expect(pushMock).toHaveBeenCalledWith({
      name: 'system-security-plan-risk-detail',
      params: {
        id: 'ssp-1',
        riskId: 'risk-click',
      },
    });
  });

  it('creates and links a risk to the current component, then refreshes', async () => {
    const wrapper = await mountView([
      makeRisk(
        { componentIds: ['comp-1'], title: 'Existing Risk' },
        'risk-existing',
      ),
    ]);

    await wrapper.get('[data-testid="create-risk"]').trigger('click');
    await wrapper.get('[data-testid="emit-created"]').trigger('click');
    await flushPromises();

    const linkCall = mockApiState.apiCalls.find(
      (call) =>
        call.endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-created/components' &&
        call.method === 'POST',
    );

    expect(linkCall).toBeDefined();
    expect(linkCall?.data).toEqual({
      componentId: 'comp-1',
    });

    const refreshEvents = wrapper.emitted('risks-updated');
    expect(refreshEvents).toBeTruthy();
    expect(refreshEvents?.length).toBe(1);
  });

  it('emits refresh when created risk cannot be linked due to missing identifier', async () => {
    const wrapper = await mountView([
      makeRisk(
        { componentIds: ['comp-1'], title: 'Existing Risk' },
        'risk-existing',
      ),
    ]);

    await wrapper.get('[data-testid="create-risk"]').trigger('click');
    wrapper
      .findComponent({ name: 'RiskCreateForm' })
      .vm.$emit('created', {} as Risk);
    await flushPromises();

    const linkCalls = mockApiState.apiCalls.filter(
      (call) =>
        call.endpoint.includes(
          '/api/oscal/system-security-plans/ssp-1/risks/',
        ) &&
        call.endpoint.endsWith('/components') &&
        call.method === 'POST',
    );
    expect(linkCalls).toHaveLength(0);

    const refreshEvents = wrapper.emitted('risks-updated');
    expect(refreshEvents).toBeTruthy();
    expect(refreshEvents?.length).toBe(1);
  });

  it('shows owner display name from owner assignments and does not show UUID', async () => {
    const wrapper = await mountView([
      makeRisk(
        {
          componentIds: ['comp-1'],
          title: 'Owned Risk',
          primaryOwnerUserId: 'user-1',
          ownerAssignments: [
            {
              ownerKind: 'user',
              ownerRef: 'user-1',
              isPrimary: true,
            },
          ],
        },
        'risk-owned',
      ),
    ]);

    expect(wrapper.text()).toContain('Alice Owner');
    expect(wrapper.text()).not.toContain('user-1');
    expect(wrapper.text()).not.toContain('Unassigned');
  });

  it('prefers primary user assignment when multiple owner assignments exist', async () => {
    const wrapper = await mount(ComponentRisksList, {
      props: {
        sspId: 'ssp-1',
        component,
        risks: [
          makeRisk(
            {
              componentIds: ['comp-1'],
              title: 'Primary Owner Risk',
              ownerAssignments: [
                {
                  ownerKind: 'user',
                  ownerRef: 'user-2',
                  isPrimary: false,
                },
                {
                  ownerKind: 'user',
                  ownerRef: 'user-1',
                  isPrimary: true,
                },
              ],
            },
            'risk-primary-owner',
          ),
        ],
        users: [
          {
            uuid: 'user-1',
            title: 'Alice Owner',
          } as SystemUser,
          {
            uuid: 'user-2',
            title: 'Bob Secondary',
          } as SystemUser,
        ],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Alice Owner');
    expect(wrapper.text()).not.toContain('Bob Secondary');
  });

  it('falls back to owner display label before generic assigned placeholder', async () => {
    const wrapper = await mount(ComponentRisksList, {
      props: {
        sspId: 'ssp-1',
        component,
        risks: [
          makeRisk(
            {
              componentIds: ['comp-1'],
              title: 'Fallback Owner Risk',
              primaryOwnerUserId: 'missing-user',
              ownerName: 'External Owner',
            },
            'risk-fallback-owner',
          ),
        ],
        users: [],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('External Owner');
    expect(wrapper.text()).not.toContain('Assigned');
  });
});
