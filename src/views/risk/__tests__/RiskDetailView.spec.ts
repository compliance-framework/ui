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

type MockRisk = {
  uuid: string;
  title: string;
  description: string;
  statement: string;
  status: string;
  reviewDeadline?: string;
  lastReviewedAt?: string;
  acceptanceJustification?: string;
  sourceType: string;
  firstSeenAt: string;
  lastSeenAt: string;
  primaryOwnerUserId?: string;
  ownerAssignments: Array<{
    ownerKind: string;
    ownerRef: string;
    isPrimary: boolean;
  }>;
  riskLog: {
    entries: Array<Record<string, unknown>>;
  };
};

const mockRisk: MockRisk = {
  uuid: 'risk-1',
  title: 'Database Encryption Risk',
  description: 'Encryption policy drift.',
  statement: 'Data at rest may not be encrypted.',
  status: 'open',
  reviewDeadline: '2026-04-01T12:00:00Z',
  lastReviewedAt: '2026-03-01T12:00:00Z',
  acceptanceJustification: 'Accepted pending migration.',
  sourceType: 'manual',
  firstSeenAt: '2026-01-01T00:00:00Z',
  lastSeenAt: '2026-03-10T00:00:00Z',
  primaryOwnerUserId: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
  ownerAssignments: [
    {
      ownerKind: 'user',
      ownerRef: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
      isPrimary: true,
    },
  ],
  riskLog: { entries: [] as Array<Record<string, unknown>> },
};

const mockToastAdd = vi.fn();

const {
  apiCalls,
  mockApiState,
  resetMockApiState,
  mockRouterPush,
  mockRouterBack,
  mockRouterHistoryState,
} = vi.hoisted(() => {
  type ApiCall = {
    endpoint: string;
    method: string;
    data?: unknown;
  };

  const apiCalls: ApiCall[] = [];
  const mockRouterPush = vi.fn();
  const mockRouterBack = vi.fn();
  const mockRouterHistoryState: { back: string | null } = { back: null };

  const mockApiState = {
    evidenceLinks: [] as Array<string | { riskId: string; evidenceId: string }>,
    evidenceDetails: {} as Record<string, Record<string, unknown>>,
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
    acceptModalPayload: {
      justification: 'Business accepted for now',
      reviewDeadline: '2026-04-20T10:00:00.000Z',
      ownerUpdate: {
        primaryOwnerUserId: '9ca68f40-f5cd-4f7a-a788-5f5d68d56e6e',
        ownerAssignments: [
          {
            ownerKind: 'user',
            ownerRef: '9ca68f40-f5cd-4f7a-a788-5f5d68d56e6e',
            isPrimary: true,
          },
        ],
      },
    } as Record<string, unknown>,
    reviewModalPayload: {
      decision: 'extend',
      notes: 'Continue accepted status',
      nextReviewDeadline: '2026-05-01T00:00:00.000Z',
    } as Record<string, unknown>,
    ownerAssignmentChangePayload: {
      primaryOwnerUserId: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
      ownerAssignments: [
        {
          ownerKind: 'user',
          ownerRef: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
          isPrimary: true,
        },
      ],
    } as Record<string, unknown>,
  };

  const resetMockApiState = () => {
    apiCalls.length = 0;
    mockRouterPush.mockReset();
    mockRouterBack.mockReset();
    mockRouterHistoryState.back = null;
    mockApiState.evidenceLinks = [];
    mockApiState.evidenceDetails = {};
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
    mockApiState.acceptModalPayload = {
      justification: 'Business accepted for now',
      reviewDeadline: '2026-04-20T10:00:00.000Z',
      ownerUpdate: {
        primaryOwnerUserId: '9ca68f40-f5cd-4f7a-a788-5f5d68d56e6e',
        ownerAssignments: [
          {
            ownerKind: 'user',
            ownerRef: '9ca68f40-f5cd-4f7a-a788-5f5d68d56e6e',
            isPrimary: true,
          },
        ],
      },
    };
    mockApiState.reviewModalPayload = {
      decision: 'extend',
      notes: 'Continue accepted status',
      nextReviewDeadline: '2026-05-01T00:00:00.000Z',
    };
    mockApiState.ownerAssignmentChangePayload = {
      primaryOwnerUserId: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
      ownerAssignments: [
        {
          ownerKind: 'user',
          ownerRef: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
          isPrimary: true,
        },
      ],
    };
  };

  return {
    apiCalls,
    mockApiState,
    resetMockApiState,
    mockRouterPush,
    mockRouterBack,
    mockRouterHistoryState,
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    push: mockRouterPush,
    back: mockRouterBack,
    options: {
      history: {
        state: mockRouterHistoryState,
      },
    },
  }),
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
  useAuthenticatedInstance: () => ({
    get: vi.fn(async (endpoint: string) => {
      apiCalls.push({
        endpoint,
        method: 'GET',
      });

      if (endpoint.startsWith('/api/evidence/latest/')) {
        const evidenceUuid = endpoint.replace('/api/evidence/latest/', '');
        return {
          data: {
            data: mockApiState.evidenceDetails[evidenceUuid] || {
              id: 'EV-001',
              uuid: evidenceUuid,
              title: 'Loaded Evidence 1',
              description: 'Hydrated from evidence details endpoint',
              start: '2026-03-03T10:00:00Z',
              end: '2026-03-04T10:00:00Z',
            },
          },
        };
      }

      return { data: { data: undefined } };
    }),
  }),
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
        if (method === 'PUT') {
          const payload = (requestConfig.data || {}) as Record<string, unknown>;

          if ('status' in payload && typeof payload.status === 'string') {
            mockRisk.status = payload.status;
          }
          if (
            'reviewDeadline' in payload &&
            typeof payload.reviewDeadline === 'string'
          ) {
            mockRisk.reviewDeadline = payload.reviewDeadline;
          }
          if (
            'lastReviewedAt' in payload &&
            typeof payload.lastReviewedAt === 'string'
          ) {
            mockRisk.lastReviewedAt = payload.lastReviewedAt;
          }
          if (
            'acceptanceJustification' in payload &&
            typeof payload.acceptanceJustification === 'string'
          ) {
            mockRisk.acceptanceJustification = payload.acceptanceJustification;
          }
          if (
            'ownerAssignments' in payload &&
            Array.isArray(payload.ownerAssignments)
          ) {
            mockRisk.ownerAssignments = payload.ownerAssignments as Array<{
              ownerKind: string;
              ownerRef: string;
              isPrimary: boolean;
            }>;
          }
          if (
            'primaryOwnerUserId' in payload &&
            typeof payload.primaryOwnerUserId === 'string'
          ) {
            mockRisk.primaryOwnerUserId = payload.primaryOwnerUserId;
          }
        }

        data.value = { ...mockRisk };
      } else if (
        endpoint.endsWith('/risks/risk-1/accept') &&
        method === 'POST'
      ) {
        const payload = (requestConfig.data || {}) as Record<string, unknown>;
        mockRisk.status = 'risk-accepted';
        if (typeof payload.justification === 'string') {
          mockRisk.acceptanceJustification = payload.justification;
        }
        if (typeof payload.reviewDeadline === 'string') {
          mockRisk.reviewDeadline = payload.reviewDeadline;
        }
        mockRisk.lastReviewedAt = '2026-03-16T12:00:00Z';
        data.value = { ...mockRisk };
      } else if (
        endpoint.endsWith('/risks/risk-1/review') &&
        method === 'POST'
      ) {
        const payload = (requestConfig.data || {}) as Record<string, unknown>;
        if (payload.decision === 'extend') {
          mockRisk.status = 'risk-accepted';
          if (typeof payload.nextReviewDeadline === 'string') {
            mockRisk.reviewDeadline = payload.nextReviewDeadline;
          }
        }
        if (payload.decision === 'reopen') {
          mockRisk.status = 'investigating';
          mockRisk.reviewDeadline = undefined;
          mockRisk.acceptanceJustification = undefined;
        }
        mockRisk.lastReviewedAt = '2026-03-16T12:30:00Z';
        data.value = { ...mockRisk };
      } else if (endpoint.endsWith('/system-security-plans/ssp-1/risks')) {
        data.value = [{ ...mockRisk }];
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
      } else if (endpoint.startsWith('/api/evidence/latest/')) {
        const evidenceUuid = endpoint.replace('/api/evidence/latest/', '');
        data.value = mockApiState.evidenceDetails[evidenceUuid] || {
          id: 'EV-001',
          uuid: evidenceUuid,
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
        RiskAcceptModal: {
          props: ['visible'],
          emits: ['update:visible', 'submit'],
          setup() {
            return { mockApiState };
          },
          template:
            '<div v-if="visible" data-testid="accept-modal"><button data-testid="accept-modal-submit" @click="$emit(\'submit\', mockApiState.acceptModalPayload)">Submit Accept</button></div>',
        },
        RiskReviewModal: {
          props: ['visible'],
          emits: ['update:visible', 'submit'],
          setup() {
            return { mockApiState };
          },
          template:
            '<div v-if="visible" data-testid="review-modal"><button data-testid="review-modal-submit" @click="$emit(\'submit\', mockApiState.reviewModalPayload)">Submit Review</button></div>',
        },
        RiskOwnerAssignment: {
          emits: ['change', 'save'],
          setup() {
            return { mockApiState };
          },
          template:
            '<div data-testid="owner-assignment"><button data-testid="owner-assignment-change" @click="$emit(\'change\', mockApiState.ownerAssignmentChangePayload)">Emit Owner Change</button><button data-testid="owner-assignment-save" @click="$emit(\'save\')">Save Owner</button></div>',
        },
      },
    },
  });
}

function findButtonByText(
  wrapper: ReturnType<typeof mountComponent>,
  text: string,
) {
  return wrapper.findAll('button').find((button) => button.text() === text);
}

function findButtonContainingText(
  wrapper: ReturnType<typeof mountComponent>,
  text: string,
) {
  return wrapper
    .findAll('button')
    .find((button) => button.text().includes(text));
}

async function clickButtonByText(
  wrapper: ReturnType<typeof mountComponent>,
  text: string,
) {
  const button = findButtonByText(wrapper, text);
  expect(button, `Missing button: ${text}`).toBeDefined();
  await button!.trigger('click');
}

async function clickButtonContainingText(
  wrapper: ReturnType<typeof mountComponent>,
  text: string,
) {
  const button = findButtonContainingText(wrapper, text);
  expect(button, `Missing button containing: ${text}`).toBeDefined();
  await button!.trigger('click');
}

describe('RiskDetailView', () => {
  beforeEach(() => {
    resetMockApiState();
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockRisk.status = 'open';
    mockRisk.reviewDeadline = '2026-04-01T12:00:00Z';
    mockRisk.lastReviewedAt = '2026-03-01T12:00:00Z';
    mockRisk.acceptanceJustification = 'Accepted pending migration.';
    mockRisk.primaryOwnerUserId = '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f';
    mockRisk.ownerAssignments = [
      {
        ownerKind: 'user',
        ownerRef: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
        isPrimary: true,
      },
    ];
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

    await clickButtonByText(wrapper, 'History & Events');
    await flushPromises();

    expect(wrapper.text()).toContain('Risk created');
  });

  it('uses router back when an in-app back target exists', async () => {
    mockRouterHistoryState.back = '/system/risks';
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Back');

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('falls back to list route when no in-app back target exists', async () => {
    mockRouterHistoryState.back = null;
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Back');

    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'system-security-plan-risks',
      params: { id: 'ssp-1' },
    });
  });

  it('renders lifecycle and workflow content in the overview tab', async () => {
    mockRisk.status = 'risk-accepted';
    const wrapper = mountComponent();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Lifecycle');
    expect(text).toContain('Workflow State');
    expect(text).toContain('Transition Matrix');
    expect(text).toContain('Risk Accepted');
    expect(text).toContain('Acceptance Justification');
    expect(text).toContain('Source Type');
  });

  it('shows Accept Risk button only for investigating status', async () => {
    mockRisk.status = 'investigating';
    const investigatingWrapper = mountComponent();
    await flushPromises();
    expect(findButtonByText(investigatingWrapper, 'Accept Risk')).toBeDefined();

    mockRisk.status = 'open';
    const openWrapper = mountComponent();
    await flushPromises();
    expect(findButtonByText(openWrapper, 'Accept Risk')).toBeUndefined();
  });

  it('shows Review Risk button only for risk-accepted status', async () => {
    mockRisk.status = 'risk-accepted';
    const acceptedWrapper = mountComponent();
    await flushPromises();
    expect(findButtonByText(acceptedWrapper, 'Review Risk')).toBeDefined();

    mockRisk.status = 'investigating';
    const investigatingWrapper = mountComponent();
    await flushPromises();
    expect(
      findButtonByText(investigatingWrapper, 'Review Risk'),
    ).toBeUndefined();
  });

  it('shows start/close lifecycle actions for the correct statuses', async () => {
    mockRisk.status = 'open';
    const openWrapper = mountComponent();
    await flushPromises();
    expect(findButtonByText(openWrapper, 'Start Investigation')).toBeDefined();
    expect(findButtonByText(openWrapper, 'Close Risk')).toBeDefined();

    mockRisk.status = 'risk-accepted';
    const acceptedWrapper = mountComponent();
    await flushPromises();
    expect(
      findButtonByText(acceptedWrapper, 'Start Investigation'),
    ).toBeUndefined();
    expect(findButtonByText(acceptedWrapper, 'Close Risk')).toBeDefined();

    mockRisk.status = 'investigating';
    const investigatingWrapper = mountComponent();
    await flushPromises();
    expect(
      findButtonByText(investigatingWrapper, 'Start Investigation'),
    ).toBeUndefined();
    expect(
      findButtonByText(investigatingWrapper, 'Close Risk'),
    ).toBeUndefined();
  });

  it('merges duplicate owner refs while preserving primary owner on save', async () => {
    mockRisk.status = 'open';
    mockApiState.ownerAssignmentChangePayload = {
      ownerAssignments: [
        {
          ownerKind: 'user',
          ownerRef: 'd6f19f16-e8b6-4f2d-b583-ef0a906f22e5',
          isPrimary: false,
        },
        {
          ownerKind: 'user',
          ownerRef: 'd6f19f16-e8b6-4f2d-b583-ef0a906f22e5',
          isPrimary: true,
        },
      ],
    };
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .get('[data-testid="owner-assignment-change"]')
      .trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="owner-assignment-save"]').trigger('click');
    await flushPromises();

    const ownerPutCall = apiCalls.find(
      (call) =>
        call.endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1' &&
        call.method === 'PUT' &&
        Boolean(
          (call.data as Record<string, unknown> | undefined)?.ownerAssignments,
        ),
    );

    expect(ownerPutCall).toBeDefined();
    expect(ownerPutCall?.data).toMatchObject({
      primaryOwnerUserId: 'd6f19f16-e8b6-4f2d-b583-ef0a906f22e5',
      ownerAssignments: [
        {
          ownerKind: 'user',
          ownerRef: 'd6f19f16-e8b6-4f2d-b583-ef0a906f22e5',
          isPrimary: true,
        },
      ],
    });
  });

  it('rejects owner save when no primary owner is present', async () => {
    mockRisk.status = 'open';
    mockApiState.ownerAssignmentChangePayload = {
      ownerAssignments: [],
    };
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .get('[data-testid="owner-assignment-change"]')
      .trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="owner-assignment-save"]').trigger('click');
    await flushPromises();

    const ownerPutCalls = apiCalls.filter(
      (call) =>
        call.endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1' &&
        call.method === 'PUT' &&
        Boolean(
          (call.data as Record<string, unknown> | undefined)?.ownerAssignments,
        ),
    );

    expect(ownerPutCalls).toHaveLength(0);
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Owner update failed',
        detail: 'Primary owner is required before saving owner assignments.',
      }),
    );
  });

  it('updates risk to investigating when Start Investigation is clicked', async () => {
    mockRisk.status = 'open';
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Start Investigation');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1',
        method: 'PUT',
        data: expect.objectContaining({
          status: 'investigating',
        }),
      }),
    );
    expect(wrapper.text()).toContain('Investigating');
  });

  it('updates risk to closed when Close Risk is clicked from open status', async () => {
    mockRisk.status = 'open';
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Close Risk');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1',
        method: 'PUT',
        data: expect.objectContaining({
          status: 'closed',
        }),
      }),
    );
    expect(wrapper.text()).toContain('Closed');
  });

  it('submits owner PUT before accept POST when accept owner update is present', async () => {
    mockRisk.status = 'investigating';
    mockApiState.acceptModalPayload = {
      justification: 'Temporary business acceptance',
      reviewDeadline: '2026-05-05T00:00:00.000Z',
      ownerUpdate: {
        primaryOwnerUserId: '57f3438f-6e99-4f89-98f7-7481bfce3c2d',
        ownerAssignments: [
          {
            ownerKind: 'user',
            ownerRef: '57f3438f-6e99-4f89-98f7-7481bfce3c2d',
            isPrimary: true,
          },
        ],
      },
    };

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Accept Risk');
    await flushPromises();
    await wrapper.get('[data-testid="accept-modal-submit"]').trigger('click');
    await flushPromises();

    const ownerPutIndex = apiCalls.findIndex(
      (call) =>
        call.endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1' &&
        call.method === 'PUT',
    );
    const acceptPostIndex = apiCalls.findIndex(
      (call) =>
        call.endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/accept' &&
        call.method === 'POST',
    );

    expect(ownerPutIndex).toBeGreaterThan(-1);
    expect(acceptPostIndex).toBeGreaterThan(ownerPutIndex);
  });

  it('validates review payload before posting to review endpoint', async () => {
    mockRisk.status = 'risk-accepted';
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Review Risk');
    await flushPromises();

    mockApiState.reviewModalPayload = {
      decision: 'extend',
      notes: 'invalid extend payload',
    };
    await wrapper.get('[data-testid="review-modal-submit"]').trigger('click');
    await flushPromises();

    mockApiState.reviewModalPayload = {
      decision: 'reopen',
      notes: 'invalid reopen payload',
      nextReviewDeadline: '2026-06-01T00:00:00.000Z',
    };
    await wrapper.get('[data-testid="review-modal-submit"]').trigger('click');
    await flushPromises();

    const reviewPosts = apiCalls.filter(
      (call) =>
        call.endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/review' &&
        call.method === 'POST',
    );

    expect(reviewPosts).toHaveLength(0);
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Validation Error',
      }),
    );
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

    await clickButtonByText(wrapper, 'History & Events');
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

    await clickButtonByText(wrapper, 'Evidence');
    await flushPromises();

    expect(wrapper.text()).toContain('Loaded Evidence 1');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/evidence/latest/06d6174b-39be-443a-b282-0fb821e24a94',
        method: 'GET',
      }),
    );
  });

  it('renders duplicate evidence titles with distinct labels', async () => {
    const firstUuid = '06d6174b-39be-443a-b282-0fb821e24a94';
    const secondUuid = '7f3469f4-1a7a-4f44-b291-7e288f3f9cdd';
    mockApiState.evidenceLinks = [firstUuid, secondUuid];
    mockApiState.evidenceDetails[firstUuid] = {
      id: 'EV-100',
      uuid: firstUuid,
      title: 'Shared Evidence Title',
      description: 'First evidence detail',
      labels: [
        { name: 'account', value: 'prod-a' },
        { name: 'region', value: 'us-east-1' },
      ],
    };
    mockApiState.evidenceDetails[secondUuid] = {
      id: 'EV-200',
      uuid: secondUuid,
      title: 'Shared Evidence Title',
      description: 'Second evidence detail',
      labels: [
        { name: 'account', value: 'prod-b' },
        { name: 'region', value: 'us-west-2' },
      ],
    };

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Evidence');
    await flushPromises();

    expect(wrapper.text()).toContain('Shared Evidence Title');
    expect(wrapper.text()).toContain('account=prod-a');
    expect(wrapper.text()).toContain('account=prod-b');
    expect(wrapper.text()).toContain('First evidence detail');
    expect(wrapper.text()).toContain('Second evidence detail');
  });

  it('hydrates linked controls and components when endpoints return id arrays', async () => {
    mockApiState.controlLinks = ['AC-1'];
    mockApiState.componentLinks = ['comp-1'];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Controls');
    await flushPromises();
    expect(wrapper.text()).toContain('Access Control');

    await clickButtonByText(wrapper, 'Components');
    await flushPromises();
    expect(wrapper.text()).toContain('Component One');
  });

  it('links evidence through SSP risk link endpoint', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Evidence');
    await flushPromises();

    await clickButtonByText(wrapper, 'Add Evidence');
    await flushPromises();

    await clickButtonContainingText(wrapper, 'Evidence One');
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

    await clickButtonByText(wrapper, 'Controls');
    await flushPromises();

    await clickButtonByText(wrapper, 'Add Control');
    await flushPromises();

    await clickButtonContainingText(wrapper, 'Access Control');
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

    await clickButtonByText(wrapper, 'Controls');
    await flushPromises();

    await clickButtonByText(wrapper, 'Add Control');
    await flushPromises();
    await clickButtonByText(wrapper, 'Close');
    await flushPromises();

    await clickButtonByText(wrapper, 'Add Control');
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

    await clickButtonByText(wrapper, 'Components');
    await flushPromises();

    await clickButtonByText(wrapper, 'Remove');
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
