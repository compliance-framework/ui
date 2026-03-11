import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import RiskDetailView from '../RiskDetailView.vue';

const mockRoute = {
  name: 'system-security-plan-risk-detail',
  params: {
    id: 'ssp-1',
    riskId: 'risk-1',
  },
};

const mockRisk = {
  uuid: 'risk-1',
  title: 'Database Encryption Risk',
  description: 'Encryption policy drift.',
  statement: 'Data at rest may not be encrypted.',
  status: 'open',
  riskLog: { entries: [] as Array<Record<string, unknown>> },
};

const mockToastAdd = vi.fn();

const { apiCalls, mockApiState, resetMockApiState } = vi.hoisted(() => {
  type ApiCall = {
    endpoint: string;
    method: string;
    data?: unknown;
  };

  const apiCalls: ApiCall[] = [];

  const mockApiState = {
    evidenceLinks: [] as Array<string | { riskId: string; evidenceId: string }>,
    controlLinks: [] as Array<
      string | { riskId: string; catalogId: string; controlId: string }
    >,
    componentLinks: [] as Array<
      string | { riskId: string; componentId: string }
    >,
    resolvedControls: [
      {
        controlId: 'AC-1',
        catalogId: 'catalog-1',
        title: 'Access Control',
        class: 'SP800-53',
      },
    ] as Array<{
      controlId: string;
      catalogId: string;
      title: string;
      class: string;
    }>,
    eventResponses: {} as Record<string, unknown>,
  };

  const resetMockApiState = () => {
    apiCalls.length = 0;
    mockApiState.evidenceLinks = [];
    mockApiState.controlLinks = [];
    mockApiState.componentLinks = [];
    mockApiState.resolvedControls = [
      {
        controlId: 'AC-1',
        catalogId: 'catalog-1',
        title: 'Access Control',
        class: 'SP800-53',
      },
    ];
    mockApiState.eventResponses = {};
  };

  return {
    apiCalls,
    mockApiState,
    resetMockApiState,
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}));

vi.mock('@/stores/system', () => ({
  useSystemStore: () => ({
    system: {
      poam: { uuid: 'poam-1' },
      securityPlan: { uuid: 'ssp-1' },
    },
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: vi.fn((input) => input),
  useDataApi: (initialUrl?: string, config?: { method?: string }) => {
    const data = ref();
    const isLoading = ref(false);
    const error = ref(null);

    const execute = vi.fn(async (arg1?: unknown, arg2?: unknown) => {
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

      apiCalls.push({
        endpoint,
        method,
        data: requestConfig.data,
      });

      if (endpoint.endsWith('/risks/risk-1')) {
        data.value = mockRisk;
      } else if (endpoint.endsWith('/system-security-plans/ssp-1/risks')) {
        data.value = [mockRisk];
      } else if (endpoint in mockApiState.eventResponses) {
        data.value = mockApiState.eventResponses[endpoint];
      } else if (endpoint.includes('/events')) {
        data.value = [
          {
            uuid: 'evt-1',
            eventType: 'created',
            createdAt: '2026-03-11T10:00:00Z',
            actorName: 'System',
            details: 'Risk created',
          },
        ];
      } else if (endpoint === '/api/evidence/search') {
        data.value = [
          {
            id: 'ev-1',
            uuid: 'ev-uuid-1',
            title: 'Evidence One',
            description: 'Evidence description',
            start: '2026-03-01T10:00:00Z',
            end: '2026-03-02T10:00:00Z',
          },
        ];
      } else if (
        endpoint === '/api/evidence/latest/06d6174b-39be-443a-b282-0fb821e24a94'
      ) {
        data.value = {
          id: 'EV-001',
          uuid: '06d6174b-39be-443a-b282-0fb821e24a94',
          title: 'Loaded Evidence 1',
          description: 'Hydrated from evidence details endpoint',
          start: '2026-03-03T10:00:00Z',
          end: '2026-03-04T10:00:00Z',
        };
      } else if (endpoint.endsWith('/system-security-plans/ssp-1/profile')) {
        data.value = {
          uuid: 'profile-1',
        };
      } else if (
        endpoint.endsWith('/profile/profile-1/resolved-with-catalogs') ||
        endpoint.endsWith('/profiles/profile-1/resolved-with-catalogs')
      ) {
        data.value = [...mockApiState.resolvedControls];
      } else if (
        endpoint.endsWith(
          '/system-security-plans/ssp-1/system-implementation/components',
        )
      ) {
        data.value = [
          {
            uuid: 'comp-1',
            title: 'Component One',
            type: 'service',
            description: 'Component description',
          },
        ];
      } else if (
        endpoint ===
        '/api/oscal/system-security-plans/ssp-1/risks/risk-1/evidence'
      ) {
        if (method === 'POST') {
          const payload = requestConfig.data as { evidenceId?: string };
          if (payload?.evidenceId) {
            mockApiState.evidenceLinks.push({
              riskId: 'risk-1',
              evidenceId: payload.evidenceId,
            });
          }
        }
        data.value = [...mockApiState.evidenceLinks];
      } else if (
        endpoint ===
        '/api/oscal/system-security-plans/ssp-1/risks/risk-1/controls'
      ) {
        if (method === 'POST') {
          const payload = requestConfig.data as {
            catalogId?: string;
            controlId?: string;
          };
          if (payload?.catalogId && payload?.controlId) {
            mockApiState.controlLinks.push({
              riskId: 'risk-1',
              catalogId: payload.catalogId,
              controlId: payload.controlId,
            });
          }
        }
        data.value = [...mockApiState.controlLinks];
      } else if (
        endpoint ===
        '/api/oscal/system-security-plans/ssp-1/risks/risk-1/components'
      ) {
        if (method === 'POST') {
          const payload = requestConfig.data as { componentId?: string };
          if (payload?.componentId) {
            mockApiState.componentLinks.push({
              riskId: 'risk-1',
              componentId: payload.componentId,
            });
          }
        }
        data.value = [...mockApiState.componentLinks];
      } else if (
        endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/components/comp-1' &&
        method === 'DELETE'
      ) {
        mockApiState.componentLinks = mockApiState.componentLinks.filter(
          (item) =>
            typeof item === 'string'
              ? item !== 'comp-1'
              : item.componentId !== 'comp-1',
        );
        data.value = {};
      } else {
        data.value = [];
      }

      return { data };
    });

    return {
      data,
      error,
      isLoading,
      execute,
    };
  },
}));

function mountComponent() {
  return mount(RiskDetailView, {
    global: {
      stubs: {
        PageHeader: { template: '<div><slot /></div>' },
        Message: { template: '<div><slot /></div>' },
        Dialog: { template: '<div><slot /></div>' },
        TertiaryButton: { template: '<button><slot /></button>' },
        RouterLinkButton: { template: '<button><slot /></button>' },
        RiskLogTab: { template: '<div>Risk log tab</div>' },
      },
    },
  });
}

describe('RiskDetailView', () => {
  beforeEach(() => {
    resetMockApiState();
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders the new risk detail tabs and history event entry', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Overview');
    expect(text).toContain('Evidence');
    expect(text).toContain('Controls');
    expect(text).toContain('Components');
    expect(text).toContain('History & Events');
    expect(text).toContain('Log');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'History & Events')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Risk created');
  });

  it('continues loading events across endpoints when the first one is empty', async () => {
    mockRisk.riskLog.entries = [
      {
        uuid: 'fallback-log-event',
        title: 'Fallback Log Event',
        start: '2026-03-11T08:00:00Z',
        loggedBy: [],
      },
    ];
    mockApiState.eventResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events'
    ] = [];
    mockApiState.eventResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/history'
    ] = [
      {
        uuid: 'evt-history-1',
        eventType: 'status-change',
        createdAt: '2026-03-12T11:00:00Z',
        actorName: 'Auditor',
        details: 'History endpoint event',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'History & Events')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('History endpoint event');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1/history',
        method: 'GET',
      }),
    );

    mockRisk.riskLog.entries = [];
  });

  it('hydrates linked evidence when risk evidence endpoint returns id array', async () => {
    mockApiState.evidenceLinks = ['06d6174b-39be-443a-b282-0fb821e24a94'];

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Evidence')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Loaded Evidence 1');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/evidence/latest/06d6174b-39be-443a-b282-0fb821e24a94',
        method: 'GET',
      }),
    );
  });

  it('hydrates linked controls and components when endpoints return id arrays', async () => {
    mockApiState.controlLinks = ['AC-1'];
    mockApiState.componentLinks = ['comp-1'];

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Controls')
      ?.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Access Control');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Components')
      ?.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Component One');
  });

  it('links evidence through SSP risk link endpoint', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Evidence')
      ?.trigger('click');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Evidence')
      ?.trigger('click');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Evidence One'))
      ?.trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/evidence',
        method: 'POST',
        data: { evidenceId: 'ev-uuid-1' },
      }),
    );
  });

  it('links controls through SSP risk link endpoint', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Controls')
      ?.trigger('click');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Control')
      ?.trigger('click');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Access Control'))
      ?.trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/controls',
        method: 'POST',
        data: { catalogId: 'catalog-1', controlId: 'AC-1' },
      }),
    );
  });

  it('does not refetch controls repeatedly when resolved controls are empty', async () => {
    mockApiState.resolvedControls = [];

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Controls')
      ?.trigger('click');
    await flushPromises();

    const addControlButton = () =>
      wrapper
        .findAll('button')
        .find((button) => button.text() === 'Add Control');

    await addControlButton()?.trigger('click');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Close')
      ?.trigger('click');
    await flushPromises();

    await addControlButton()?.trigger('click');
    await flushPromises();

    const resolvedControlsCalls = apiCalls.filter((call) =>
      call.endpoint.endsWith('/resolved-with-catalogs'),
    );
    expect(resolvedControlsCalls).toHaveLength(1);
  });

  it('removes components through SSP risk link endpoint', async () => {
    mockApiState.componentLinks = [
      {
        riskId: 'risk-1',
        componentId: 'comp-1',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Components')
      ?.trigger('click');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove')
      ?.trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/components/comp-1',
        method: 'DELETE',
      }),
    );
  });
});
