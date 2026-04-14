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
  query: {} as Record<string, string | string[] | undefined>,
};

type MockRisk = {
  uuid: string;
  title: string;
  description: string;
  statement: string;
  status: string;
  likelihood?: string;
  impact?: string;
  reviewDeadline?: string;
  lastReviewedAt?: string;
  acceptanceJustification?: string;
  sourceType: string;
  firstSeenAt: string;
  lastSeenAt: string;
  threatIds?: Array<
    | string
    | {
        threatRefId?: string;
        refId: string;
        system: string;
        title?: string;
        url?: string;
      }
  >;
  remediationTemplate?: {
    id?: string;
    title?: string;
    description?: string;
    tasks?: Array<{
      id?: string;
      title?: string;
      orderIndex?: number;
    }>;
  };
  remediations?: Array<{
    id?: string;
    title?: string;
    description?: string;
    tasks?: Array<{
      id?: string;
      title?: string;
      orderIndex?: number;
    }>;
  }>;
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
  likelihood: 'moderate',
  impact: 'high',
  reviewDeadline: '2026-04-01T12:00:00Z',
  lastReviewedAt: '2026-03-01T12:00:00Z',
  acceptanceJustification: 'Accepted pending migration.',
  sourceType: 'manual',
  firstSeenAt: '2026-01-01T00:00:00Z',
  lastSeenAt: '2026-03-10T00:00:00Z',
  threatIds: [
    {
      threatRefId: 'threat-ref-1',
      refId: 'T-001',
      system: 'CAPEC',
      title: 'CAPEC Threat',
      url: 'https://capec.mitre.org/data/definitions/1.html',
    },
    {
      threatRefId: 'threat-ref-2',
      refId: 'T-002',
      system: 'NVD',
      title: 'NVD Threat',
    },
  ],
  remediationTemplate: {
    id: 'remediation-template-1',
    title: 'Rotate DB encryption keys',
    description: 'Rotate all stale encryption keys within 30 days.',
    tasks: [
      {
        id: 'task-1',
        title: 'Generate new key material',
        orderIndex: 1,
      },
    ],
  },
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
} = vi.hoisted(() => {
  type ApiCall = {
    endpoint: string;
    method: string;
    data?: unknown;
  };

  const apiCalls: ApiCall[] = [];
  const mockRouterPush = vi.fn();
  const mockRouterBack = vi.fn();

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
    reviewResponses: {} as Record<string, unknown>,
    scoreHistoryResponses: {} as Record<string, unknown>,
    scoreHistoryResponseQueues: {} as Record<
      string,
      Array<unknown | Promise<unknown>>
    >,
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
    scoreReviewModalPayload: {
      decision: 'reassess',
      likelihood: 'high',
      impact: 'critical',
      notes: 'Updated after new threat intel',
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
    promoteToPoamPayload: {
      title: 'Mitigation Plan to remediate risk',
      deadline: '',
      resourceRequired: '',
    } as Record<string, unknown>,
    poamItemsByRisk: [] as Array<Record<string, unknown>>,
  };

  const resetMockApiState = () => {
    apiCalls.length = 0;
    mockRouterPush.mockReset();
    mockRouterBack.mockReset();
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
    mockApiState.reviewResponses = {};
    mockApiState.scoreHistoryResponses = {};
    mockApiState.scoreHistoryResponseQueues = {};
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
    mockApiState.scoreReviewModalPayload = {
      decision: 'reassess',
      likelihood: 'high',
      impact: 'critical',
      notes: 'Updated after new threat intel',
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
    mockApiState.promoteToPoamPayload = {
      title: 'Mitigation Plan to remediate risk',
      deadline: '',
      resourceRequired: '',
    };
    mockApiState.poamItemsByRisk = [];
  };

  return {
    apiCalls,
    mockApiState,
    resetMockApiState,
    mockRouterPush,
    mockRouterBack,
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    push: mockRouterPush,
    back: mockRouterBack,
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
    const response = ref<{ data: unknown } | null>(null);
    const isLoading = ref(false);
    const error = ref(null);

    const execute = vi.fn(async (arg1?: unknown, arg2?: unknown) => {
      response.value = null;
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

      const endpointWithoutQuery = endpoint.split('?')[0];

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
        if (payload.decision === 'reassess') {
          if (typeof payload.likelihood === 'string') {
            mockRisk.likelihood = payload.likelihood;
          }
          if (typeof payload.impact === 'string') {
            mockRisk.impact = payload.impact;
          }
        }
        if (payload.decision === 'implement') {
          mockRisk.status = 'mitigating-implemented';
        }
        mockRisk.lastReviewedAt = '2026-03-16T12:30:00Z';
        data.value = { ...mockRisk };
      } else if (endpoint.endsWith('/system-security-plans/ssp-1/risks')) {
        data.value = [{ ...mockRisk }];
      } else if (
        endpoint in mockApiState.eventResponses ||
        endpointWithoutQuery in mockApiState.eventResponses
      ) {
        const rawResponse =
          mockApiState.eventResponses[endpoint] ??
          mockApiState.eventResponses[endpointWithoutQuery];
        response.value = { data: rawResponse };
        const record =
          rawResponse && typeof rawResponse === 'object'
            ? (rawResponse as Record<string, unknown>)
            : null;
        data.value = record && 'data' in record ? record.data : rawResponse;
      } else if (
        endpoint in mockApiState.reviewResponses ||
        endpointWithoutQuery in mockApiState.reviewResponses
      ) {
        const rawResponse =
          mockApiState.reviewResponses[endpoint] ??
          mockApiState.reviewResponses[endpointWithoutQuery];
        response.value = { data: rawResponse };
        const record =
          rawResponse && typeof rawResponse === 'object'
            ? (rawResponse as Record<string, unknown>)
            : null;
        data.value = record && 'data' in record ? record.data : rawResponse;
      } else if (
        endpoint in mockApiState.scoreHistoryResponseQueues ||
        endpointWithoutQuery in mockApiState.scoreHistoryResponseQueues
      ) {
        const queue =
          mockApiState.scoreHistoryResponseQueues[endpoint] ??
          mockApiState.scoreHistoryResponseQueues[endpointWithoutQuery];
        const rawResponse = await queue.shift();
        response.value = { data: rawResponse };
        const record =
          rawResponse && typeof rawResponse === 'object'
            ? (rawResponse as Record<string, unknown>)
            : null;
        data.value = record && 'data' in record ? record.data : rawResponse;
      } else if (
        endpoint in mockApiState.scoreHistoryResponses ||
        endpointWithoutQuery in mockApiState.scoreHistoryResponses
      ) {
        const rawResponse =
          mockApiState.scoreHistoryResponses[endpoint] ??
          mockApiState.scoreHistoryResponses[endpointWithoutQuery];
        response.value = { data: rawResponse };
        const record =
          rawResponse && typeof rawResponse === 'object'
            ? (rawResponse as Record<string, unknown>)
            : null;
        data.value = record && 'data' in record ? record.data : rawResponse;
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
      } else if (endpoint.includes('/reviews')) {
        data.value = [];
      } else if (endpoint.includes('/score-history')) {
        data.value = [];
      } else if (endpoint === '/api/poam-items?riskId=risk-1') {
        data.value = [...mockApiState.poamItemsByRisk];
      } else if (
        endpoint ===
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/promote-to-poam' &&
        method === 'POST'
      ) {
        mockRisk.status = 'mitigating-planned';
        data.value = {
          id: 'poam-1',
          title:
            ((requestConfig.data as Record<string, unknown> | undefined)
              ?.title as string | undefined) || mockRisk.title,
          status: 'open',
        };
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
        '/api/oscal/system-security-plans/ssp-1/risks/risk-1/threat-ids'
      ) {
        if (method === 'POST') {
          const payload = requestConfig.data as {
            id?: string;
            system?: string;
            title?: string;
            url?: string;
          };
          if (payload?.id && payload?.system && payload?.title) {
            const nextThreat = {
              threatRefId: `threat-ref-${(mockRisk.threatIds || []).length + 1}`,
              refId: payload.id,
              system: payload.system,
              title: payload.title,
              ...(payload.url ? { url: payload.url } : {}),
            };
            mockRisk.threatIds = [...(mockRisk.threatIds || []), nextThreat];
          }
        }
        data.value = [...(mockRisk.threatIds || [])];
      } else if (
        endpointWithoutQuery.startsWith(
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/threat-ids/',
        )
      ) {
        const threatRefId = decodeURIComponent(
          endpointWithoutQuery.split('/threat-ids/')[1] || '',
        );

        if (method === 'PUT') {
          const payload = requestConfig.data as {
            id?: string;
            system?: string;
            title?: string;
            url?: string;
          };
          mockRisk.threatIds = (mockRisk.threatIds || []).map((threat) =>
            typeof threat !== 'string' && threat.threatRefId === threatRefId
              ? {
                  threatRefId: threat.threatRefId,
                  refId: payload.id || threat.refId,
                  system: payload.system || threat.system,
                  title: payload.title || threat.title,
                  ...(payload.url ? { url: payload.url } : {}),
                }
              : threat,
          );
        }

        if (method === 'DELETE') {
          mockRisk.threatIds = (mockRisk.threatIds || []).filter(
            (threat) =>
              typeof threat === 'string' || threat.threatRefId !== threatRefId,
          );
        }

        data.value = [...(mockRisk.threatIds || [])];
      } else if (
        endpoint ===
        '/api/oscal/system-security-plans/ssp-1/risks/risk-1/remediation-template'
      ) {
        if (method === 'POST') {
          const payload = requestConfig.data as MockRisk['remediationTemplate'];
          mockRisk.remediationTemplate = {
            id: 'remediation-template-1',
            ...payload,
          };
        }
        if (method === 'PUT') {
          const payload = requestConfig.data as MockRisk['remediationTemplate'];
          mockRisk.remediationTemplate = {
            id: mockRisk.remediationTemplate?.id || 'remediation-template-1',
            ...payload,
          };
        }

        if (method === 'DELETE') {
          mockRisk.remediationTemplate = undefined;
        }

        data.value = mockRisk.remediationTemplate;
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

      if (!response.value) {
        response.value = { data: data.value };
      }

      return { data: response.value.data };
    });

    return {
      data,
      response,
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
        RiskScoreReviewModal: {
          props: ['visible'],
          emits: ['update:visible', 'submit'],
          setup() {
            return { mockApiState };
          },
          template:
            '<div v-if="visible" data-testid="score-review-modal"><button data-testid="score-review-modal-submit" @click="$emit(\'submit\', mockApiState.scoreReviewModalPayload)">Submit Score Review</button></div>',
        },
        PromoteToPoamModal: {
          props: ['visible'],
          emits: ['update:visible', 'submit'],
          setup() {
            return { mockApiState };
          },
          template:
            '<div v-if="visible" data-testid="promote-to-poam-modal"><button data-testid="promote-to-poam-modal-submit" @click="$emit(\'submit\', mockApiState.promoteToPoamPayload)">Submit Create Mitigation</button></div>',
        },
        RiskOwnerAssignment: {
          emits: ['change', 'save'],
          setup() {
            return { mockApiState };
          },
          template:
            '<div data-testid="owner-assignment"><button data-testid="owner-assignment-change" @click="$emit(\'change\', mockApiState.ownerAssignmentChangePayload)">Emit Owner Change</button><button data-testid="owner-assignment-save" @click="$emit(\'save\')">Save Owner</button></div>',
        },
        LineChart: {
          name: 'LineChart',
          template: '<div data-testid="line-chart" />',
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
    mockRoute.name = 'system-security-plan-risk-detail';
    mockRoute.params.id = 'ssp-1';
    mockRoute.params.riskId = 'risk-1';
    mockRoute.query = {};
    window.history.replaceState({}, '', window.location.href);
    resetMockApiState();
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockRisk.status = 'open';
    mockRisk.likelihood = 'moderate';
    mockRisk.impact = 'high';
    mockRisk.reviewDeadline = '2026-04-01T12:00:00Z';
    mockRisk.lastReviewedAt = '2026-03-01T12:00:00Z';
    mockRisk.acceptanceJustification = 'Accepted pending migration.';
    mockRisk.threatIds = [
      {
        threatRefId: 'threat-ref-1',
        refId: 'T-001',
        system: 'CAPEC',
        title: 'CAPEC Threat',
        url: 'https://capec.mitre.org/data/definitions/1.html',
      },
      {
        threatRefId: 'threat-ref-2',
        refId: 'T-002',
        system: 'NVD',
        title: 'NVD Threat',
      },
    ];
    mockRisk.remediationTemplate = {
      id: 'remediation-template-1',
      title: 'Rotate DB encryption keys',
      description: 'Rotate all stale encryption keys within 30 days.',
      tasks: [
        {
          id: 'task-1',
          title: 'Generate new key material',
          orderIndex: 1,
        },
      ],
    };
    mockRisk.remediations = undefined;
    mockRisk.primaryOwnerUserId = '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f';
    mockRisk.ownerAssignments = [
      {
        ownerKind: 'user',
        ownerRef: '8d6d887f-2a45-4d8f-9cb0-6e8d3595d87f',
        isPrimary: true,
      },
    ];
  });

  it('renders the updated risk detail tabs in the expected order', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Overview');
    expect(text).toContain('Evidence');
    expect(text).toContain('Controls');
    expect(text).toContain('Components');
    expect(text).toContain('Threats');
    expect(text).toContain('Suggested Remediations');
    expect(text).toContain('Reviews');
    expect(text).toContain('History & Events');

    // Test that the Mitigation Plan tab is not rendered
    const tabsContainer = wrapper.find('.flex.flex-wrap.gap-2.pb-2');
    const tabs = tabsContainer.findAll('button');
    const tabTexts = tabs.map((t) => t.text());
    expect(tabTexts).not.toContain('Mitigation Plan');
    expect(tabTexts).not.toContain('Log');

    expect(text.indexOf('Threats')).toBeLessThan(
      text.indexOf('Suggested Remediations'),
    );
    expect(text.indexOf('Suggested Remediations')).toBeLessThan(
      text.indexOf('Reviews'),
    );
    expect(text.indexOf('Reviews')).toBeLessThan(
      text.indexOf('History & Events'),
    );

    await clickButtonByText(wrapper, 'History & Events');
    await flushPromises();

    expect(wrapper.text()).toContain('Risk created');
  });

  it('shows Mitigation Plan tab when risk status is mitigating-planned', async () => {
    mockRisk.status = 'mitigating-planned';
    const wrapper = mountComponent();
    await flushPromises();

    const tabsContainer = wrapper.find('.flex.flex-wrap.gap-2.pb-2');
    const tabs = tabsContainer.findAll('button');
    const tabTexts = tabs.map((t) => t.text());
    expect(tabTexts).toContain('Mitigation Plan');
  });

  it('loads score history on the overview tab from the scoped SSP endpoint', async () => {
    mockApiState.scoreHistoryResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/score-history?page=1&limit=100&offset=0'
    ] = {
      data: [
        {
          id: 'score-1',
          riskId: 'risk-1',
          sspId: 'ssp-1',
          occurredAt: '2026-03-01T00:00:00Z',
          createdAt: '2026-03-01T00:01:00Z',
          sourceEventType: 'created',
          status: 'open',
          likelihood: 'low',
          impact: 'low',
          baselineScore: 4,
          residualScore: 4,
          openBaselineScore: 4,
          openResidualScore: 4,
        },
        {
          id: 'score-2',
          riskId: 'risk-1',
          sspId: 'ssp-1',
          occurredAt: '2026-03-02T00:00:00Z',
          createdAt: '2026-03-02T00:01:00Z',
          sourceEventType: 'score_reassessed',
          status: 'open',
          likelihood: 'moderate',
          impact: 'critical',
          baselineScore: 4,
          residualScore: 15,
          openBaselineScore: 4,
          openResidualScore: 15,
        },
      ],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    };

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('Risk Score History');
    expect(wrapper.text()).toContain('Baseline 4');
    expect(wrapper.text()).toContain('Residual 15');
    expect(wrapper.text()).toContain('Score Reassessed');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/score-history?page=1&limit=100&offset=0',
        method: 'GET',
      }),
    );
  });

  it('does not duplicate unpaged score history responses', async () => {
    mockApiState.scoreHistoryResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/score-history'
    ] = {
      data: Array.from({ length: 101 }, (_, index) => ({
        id: `score-${index + 1}`,
        riskId: 'risk-1',
        sspId: 'ssp-1',
        occurredAt: new Date(Date.UTC(2026, 2, index + 1)).toISOString(),
        createdAt: new Date(Date.UTC(2026, 2, index + 1, 0, 1)).toISOString(),
        sourceEventType: index === 0 ? 'created' : 'score_reassessed',
        status: 'open',
        likelihood: 'moderate',
        impact: 'high',
        baselineScore: 4,
        residualScore: index + 1,
        openBaselineScore: 4,
        openResidualScore: index + 1,
      })),
    };

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('Residual 101');
    expect(
      apiCalls.filter((call) => call.endpoint.includes('/score-history')),
    ).toEqual([
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/score-history?page=1&limit=100&offset=0',
      }),
    ]);
  });

  it('keeps the latest score history when overlapping refreshes finish out of order', async () => {
    const scoreHistoryEndpoint =
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/score-history?page=1&limit=100&offset=0';
    let resolveFirstLoad!: (value: unknown) => void;
    const firstLoadResponse = new Promise<unknown>((resolve) => {
      resolveFirstLoad = resolve;
    });

    mockApiState.scoreHistoryResponseQueues[scoreHistoryEndpoint] = [
      firstLoadResponse,
      {
        data: [
          {
            id: 'score-new',
            riskId: 'risk-1',
            sspId: 'ssp-1',
            occurredAt: '2026-03-02T00:00:00Z',
            createdAt: '2026-03-02T00:01:00Z',
            sourceEventType: 'score_reassessed',
            status: 'open',
            likelihood: 'high',
            impact: 'critical',
            baselineScore: 12,
            residualScore: 22,
            openBaselineScore: 12,
            openResidualScore: 22,
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Review Risk Score');
    await wrapper
      .get('[data-testid="score-review-modal-submit"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Residual 22');

    resolveFirstLoad({
      data: [
        {
          id: 'score-old',
          riskId: 'risk-1',
          sspId: 'ssp-1',
          occurredAt: '2026-03-01T00:00:00Z',
          createdAt: '2026-03-01T00:01:00Z',
          sourceEventType: 'created',
          status: 'open',
          likelihood: 'low',
          impact: 'low',
          baselineScore: 1,
          residualScore: 1,
          openBaselineScore: 1,
          openResidualScore: 1,
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Residual 22');
    expect(wrapper.text()).not.toContain('Residual 1');
  });

  it('loads reviews from the reviews endpoint', async () => {
    mockApiState.reviewResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/reviews'
    ] = [
      {
        uuid: 'review-1',
        decision: 'extend',
        reviewedAt: '2026-03-16T12:30:00Z',
        reviewer: { displayName: 'Security Lead' },
        notes: 'Quarterly review completed.',
        nextReviewDeadline: '2026-06-30T00:00:00Z',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Reviews');
    await flushPromises();

    expect(wrapper.text()).toContain('Quarterly review completed.');
    expect(wrapper.text()).toContain('Security Lead');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/reviews?page=1&limit=10&offset=0',
        method: 'GET',
      }),
    );
  });

  it('loads reviews and events with pagination params for POA&M risk detail', async () => {
    mockRoute.name = 'plan-of-action-and-milestones-risk-detail';
    mockRoute.params.id = 'poam-1';
    mockApiState.reviewResponses[
      '/api/oscal/plan-of-action-and-milestones/poam-1/risks/risk-1/reviews?page=1&limit=10&offset=0'
    ] = {
      data: [
        {
          uuid: 'poam-review-1',
          decision: 'extend',
          reviewedAt: '2026-03-16T12:30:00Z',
          reviewerName: 'POAM Reviewer',
          notes: 'POAM review entry',
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    };
    mockApiState.eventResponses[
      '/api/oscal/plan-of-action-and-milestones/poam-1/risks/risk-1/events?page=1&limit=10&offset=0'
    ] = {
      data: [
        {
          uuid: 'poam-event-1',
          eventType: 'updated',
          createdAt: '2026-03-18T10:00:00Z',
          actorName: 'POAM System',
          details: 'POAM event entry',
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    };

    const wrapper = mountComponent();
    await flushPromises();

    expect(findButtonByText(wrapper, 'Threats')).toBeDefined();
    expect(findButtonByText(wrapper, 'Suggested Remediations')).toBeDefined();
    expect(wrapper.text()).toContain('Threat IDs:');
    expect(wrapper.text()).toContain('T-001, T-002');

    await clickButtonByText(wrapper, 'Reviews');
    await flushPromises();
    expect(wrapper.text()).toContain('POAM review entry');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/plan-of-action-and-milestones/poam-1/risks/risk-1/reviews?page=1&limit=10&offset=0',
        method: 'GET',
      }),
    );

    await clickButtonByText(wrapper, 'History & Events');
    await flushPromises();
    expect(wrapper.text()).toContain('POAM event entry');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/plan-of-action-and-milestones/poam-1/risks/risk-1/events?page=1&limit=10&offset=0',
        method: 'GET',
      }),
    );
  });

  it('creates threats and remediations through POA&M risk detail endpoints', async () => {
    mockRoute.name = 'plan-of-action-and-milestones-risk-detail';
    mockRoute.params.id = 'poam-1';
    mockRisk.remediationTemplate = undefined;
    mockRisk.remediations = undefined;

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Threats');
    await flushPromises();
    await clickButtonByText(wrapper, 'Add Threat');
    await wrapper.get('[data-testid="threat-id-input"]').setValue('T-900');
    await wrapper.get('[data-testid="threat-system-input"]').setValue('MITRE');
    await wrapper
      .get('[data-testid="threat-title-input"]')
      .setValue('POAM Threat');
    await wrapper.get('[data-testid="save-threat-button"]').trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/plan-of-action-and-milestones/poam-1/risks/risk-1/threat-ids',
        method: 'POST',
        data: {
          id: 'T-900',
          system: 'MITRE',
          title: 'POAM Threat',
        },
      }),
    );

    await clickButtonByText(wrapper, 'Suggested Remediations');
    await flushPromises();
    await clickButtonByText(wrapper, 'Add Remediation');
    await wrapper
      .get('[data-testid="remediation-title-input"]')
      .setValue('POAM remediation');
    await wrapper
      .get('[data-testid="save-remediation-button"]')
      .trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/plan-of-action-and-milestones/poam-1/risks/risk-1/remediation-template',
        method: 'POST',
        data: {
          title: 'POAM remediation',
          description: undefined,
          tasks: undefined,
        },
      }),
    );
  });

  it('supports pagination for reviews tab', async () => {
    mockApiState.reviewResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/reviews?page=1&limit=10&offset=0'
    ] = {
      data: [
        {
          uuid: 'review-page-1',
          decision: 'extend',
          reviewedAt: '2026-03-16T12:30:00Z',
          reviewerName: 'Reviewer One',
          notes: 'Review page 1 entry',
        },
      ],
      total: 11,
      limit: 10,
      offset: 0,
      hasMore: true,
    };
    mockApiState.reviewResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/reviews?page=2&limit=10&offset=10'
    ] = {
      data: [
        {
          uuid: 'review-page-2',
          decision: 'reassess',
          reviewedAt: '2026-03-10T10:00:00Z',
          reviewerName: 'Reviewer Two',
          notes: 'Review page 2 entry',
        },
      ],
      total: 11,
      limit: 10,
      offset: 10,
      hasMore: false,
    };

    const wrapper = mountComponent();
    await flushPromises();
    await clickButtonByText(wrapper, 'Reviews');
    await flushPromises();

    expect(wrapper.text()).toContain('Review page 1 entry');
    expect(wrapper.text()).toContain('Page 1');
    expect(wrapper.text()).toContain('of 2');
    await wrapper
      .get('[data-testid="reviews-pagination-next"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Review page 2 entry');
    expect(wrapper.text()).toContain('Page 2');
    expect(wrapper.text()).toContain('of 2');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/reviews?page=2&limit=10&offset=10',
        method: 'GET',
      }),
    );

    await wrapper
      .get('[data-testid="reviews-pagination-prev"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Review page 1 entry');
  });

  it('renders threat and remediation tabs for SSP risk detail', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('Threat IDs:');
    expect(wrapper.text()).toContain('T-001, T-002');

    await clickButtonByText(wrapper, 'Threats');
    await flushPromises();
    expect(wrapper.text()).toContain('T-001');
    expect(wrapper.text()).toContain('CAPEC Threat');
    expect(wrapper.text()).toContain('System: CAPEC');
    expect(wrapper.text()).toContain(
      'https://capec.mitre.org/data/definitions/1.html',
    );

    await clickButtonByText(wrapper, 'Suggested Remediations');
    await flushPromises();
    expect(wrapper.text()).toContain('Rotate DB encryption keys');
    expect(wrapper.text()).toContain(
      'Rotate all stale encryption keys within 30 days.',
    );
    expect(wrapper.text()).toContain('Generate new key material');
  });

  it('renders untitled remediation templates without dropping their details', async () => {
    mockRisk.remediationTemplate = {
      description: 'Remediation migrated without a title.',
      tasks: [
        {
          id: 'task-untitled-1',
          title: 'Recover missing remediation title',
          orderIndex: 1,
        },
      ],
    };

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Suggested Remediations');
    await flushPromises();

    expect(wrapper.text()).toContain('Untitled remediation');
    expect(wrapper.text()).toContain('Remediation migrated without a title.');
    expect(wrapper.text()).toContain('Recover missing remediation title');

    await clickButtonByText(wrapper, 'Edit Remediation');
    expect(
      (
        wrapper.get('[data-testid="remediation-title-input"]')
          .element as HTMLInputElement
      ).value,
    ).toBe('');
  });

  it('uses the untitled remediation fallback in the remove confirmation prompt', async () => {
    mockRisk.remediationTemplate = {
      description: 'Remediation migrated without a title.',
    };

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Suggested Remediations');
    await flushPromises();
    await clickButtonByText(wrapper, 'Remove');

    expect(window.confirm).toHaveBeenCalledWith(
      'Remove remediation "Untitled remediation" from this risk?',
    );
  });

  it('renders non-http threat href values as plain text without clickable link', async () => {
    mockRisk.threatIds = [
      {
        threatRefId: 'threat-ref-9',
        refId: 'T-999',
        system: 'Custom',
        title: 'Unsafe threat',
        url: 'javascript:alert(1)',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Threats');
    await flushPromises();

    expect(wrapper.text()).toContain('javascript:alert(1)');
    expect(wrapper.find('a[href="javascript:alert(1)"]').exists()).toBe(false);
  });

  it('disables edit and remove actions for legacy threats without a threat reference', async () => {
    mockRisk.threatIds = ['legacy-threat-id'];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Threats');
    await flushPromises();

    const editButton = findButtonByText(wrapper, 'Edit');
    const removeButton = findButtonByText(wrapper, 'Remove');

    expect(editButton?.attributes('disabled')).toBeDefined();
    expect(removeButton?.attributes('disabled')).toBeDefined();
    expect(editButton?.attributes('title')).toContain('cannot be edited');
    expect(removeButton?.attributes('title')).toContain('cannot be removed');
  });

  it('creates threats through the threat-ids endpoint', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Threats');
    await flushPromises();
    await clickButtonByText(wrapper, 'Add Threat');
    await wrapper.get('[data-testid="threat-id-input"]').setValue('T-003');
    await wrapper.get('[data-testid="threat-system-input"]').setValue('MITRE');
    await wrapper
      .get('[data-testid="threat-title-input"]')
      .setValue('New Threat');
    await wrapper
      .get('[data-testid="threat-url-input"]')
      .setValue('https://threats.local/3');
    await wrapper.get('[data-testid="save-threat-button"]').trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/threat-ids',
        method: 'POST',
        data: {
          id: 'T-003',
          system: 'MITRE',
          title: 'New Threat',
          url: 'https://threats.local/3',
        },
      }),
    );
  });

  it('updates threats through the threat-ids item endpoint', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Threats');
    await flushPromises();
    await clickButtonByText(wrapper, 'Edit');
    await wrapper
      .get('[data-testid="threat-title-input"]')
      .setValue('Updated Threat Title');
    await wrapper.get('[data-testid="save-threat-button"]').trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/threat-ids/threat-ref-1',
        method: 'PUT',
        data: expect.objectContaining({
          id: 'T-001',
          system: 'CAPEC',
          title: 'Updated Threat Title',
        }),
      }),
    );
  });

  it('upserts remediation template through the remediation-template endpoint', async () => {
    mockRisk.remediationTemplate = {
      title: 'Rotate DB encryption keys',
      description: 'Rotate all stale encryption keys within 30 days.',
      tasks: [
        {
          id: 'task-1',
          title: 'Generate new key material',
          orderIndex: 1,
        },
      ],
    };

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Suggested Remediations');
    await flushPromises();
    await clickButtonByText(wrapper, 'Edit Remediation');
    expect(wrapper.text()).toContain('Edit Remediation');
    await wrapper
      .get('[data-testid="remediation-title-input"]')
      .setValue('Updated remediation');
    await wrapper
      .get('[data-testid="remediation-description-input"]')
      .setValue('Updated remediation details');
    await wrapper
      .get('[data-testid="add-remediation-task-button"]')
      .trigger('click');
    await wrapper
      .get('[data-testid="remediation-task-input-1"]')
      .setValue('Validate rollout');
    await wrapper
      .get('[data-testid="save-remediation-button"]')
      .trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/remediation-template',
        method: 'PUT',
        data: {
          title: 'Updated remediation',
          description: 'Updated remediation details',
          tasks: [
            { title: 'Generate new key material', orderIndex: 1 },
            { title: 'Validate rollout', orderIndex: 2 },
          ],
        },
      }),
    );
  });

  it('shows add remediation only when no remediation template exists', async () => {
    mockRisk.remediationTemplate = undefined;
    mockRisk.remediations = [
      {
        id: 'legacy-remediation-1',
        title: 'Legacy remediation',
        description: 'Legacy remediation data from inline risk form.',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Suggested Remediations');
    await flushPromises();

    expect(wrapper.text()).toContain('Legacy remediation');
    expect(findButtonByText(wrapper, 'Add Remediation')).toBeDefined();
    expect(findButtonByText(wrapper, 'Edit Remediation')).toBeUndefined();
    const editButton = findButtonByText(wrapper, 'Edit');
    const removeButton = findButtonByText(wrapper, 'Remove');
    expect(editButton?.attributes('disabled')).toBeDefined();
    expect(removeButton?.attributes('disabled')).toBeDefined();
    expect(editButton?.attributes('title')).toContain('cannot be edited');
    expect(removeButton?.attributes('title')).toContain('cannot be removed');

    await clickButtonByText(wrapper, 'Add Remediation');
    await wrapper
      .get('[data-testid="remediation-title-input"]')
      .setValue('New remediation');
    await wrapper
      .get('[data-testid="save-remediation-button"]')
      .trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/remediation-template',
        method: 'POST',
        data: {
          title: 'New remediation',
          description: undefined,
          tasks: undefined,
        },
      }),
    );
  });

  it('removes remediation template through the remediation-template endpoint', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Suggested Remediations');
    await flushPromises();
    await clickButtonByText(wrapper, 'Remove');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/remediation-template',
        method: 'DELETE',
      }),
    );
  });

  it('uses router back when an in-app back target exists', async () => {
    window.history.replaceState(
      { back: '/system/risks' },
      '',
      window.location.href,
    );
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Back');

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('falls back to list route when no in-app back target exists', async () => {
    window.history.replaceState({}, '', window.location.href);
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Back');

    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'system-security-plan-risks',
      params: { id: 'ssp-1' },
    });
  });

  it('falls back to system risks route when opened from system risks list', async () => {
    mockRoute.name = 'risks:detail';
    mockRoute.params.id = '';
    mockRoute.query = { from: 'system' };
    window.history.replaceState({}, '', window.location.href);
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Back');

    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'system:risks' });
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
    expect(text).toContain('Review Deadline');
    expect(text).toContain('Last Reviewed At');
    expect(text).toContain('Source Type');
  });

  it('hides acceptance justification when risk is not accepted', async () => {
    mockRisk.status = 'open';
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).not.toContain('Acceptance Justification');
    expect(wrapper.text()).not.toContain('Last Reviewed At');
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

  it('shows Create Mitigation only when no linked POAM items exist', async () => {
    mockRisk.status = 'investigating';
    mockApiState.poamItemsByRisk = [];

    const wrapper = mountComponent();
    await flushPromises();

    expect(findButtonByText(wrapper, 'Create Mitigation')).toBeDefined();
    expect(findButtonByText(wrapper, 'Mitigate Risk')).toBeUndefined();
  });

  it('shows Mitigate Risk instead of Create Mitigation when linked POAM items exist', async () => {
    mockRisk.status = 'investigating';
    mockApiState.poamItemsByRisk = [
      {
        id: 'poam-1',
        title: 'Existing mitigation plan',
        status: 'open',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    expect(findButtonByText(wrapper, 'Create Mitigation')).toBeUndefined();
    expect(findButtonByText(wrapper, 'Mitigate Risk')).toBeDefined();
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

  it('shows Review Risk Score only for open and investigating statuses', async () => {
    mockRisk.status = 'open';
    const openWrapper = mountComponent();
    await flushPromises();
    expect(findButtonByText(openWrapper, 'Review Risk Score')).toBeDefined();

    mockRisk.status = 'investigating';
    const investigatingWrapper = mountComponent();
    await flushPromises();
    expect(
      findButtonByText(investigatingWrapper, 'Review Risk Score'),
    ).toBeDefined();

    mockRisk.status = 'risk-accepted';
    const acceptedWrapper = mountComponent();
    await flushPromises();
    expect(
      findButtonByText(acceptedWrapper, 'Review Risk Score'),
    ).toBeUndefined();
  });

  it('posts reassess decision when Review Risk Score is submitted', async () => {
    mockRisk.status = 'open';
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Review Risk Score');
    await flushPromises();
    expect(wrapper.find('[data-testid="score-review-modal"]').exists()).toBe(
      true,
    );

    await wrapper
      .get('[data-testid="score-review-modal-submit"]')
      .trigger('click');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1/review',
        method: 'POST',
        data: {
          decision: 'reassess',
          likelihood: 'high',
          impact: 'critical',
          notes: 'Updated after new threat intel',
        },
      }),
    );
    expect(wrapper.text()).toContain('High');
    expect(wrapper.text()).toContain('Critical');
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

  it('updates risk status from Mitigate Risk when an active POAM item already exists', async () => {
    mockRisk.status = 'investigating';
    mockApiState.poamItemsByRisk = [
      {
        id: 'poam-1',
        title: 'Existing mitigation plan',
        status: 'open',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Mitigate Risk');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/poam-items?riskId=risk-1',
        method: 'GET',
      }),
    );
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1',
        method: 'PUT',
        data: expect.objectContaining({
          status: 'mitigating-planned',
        }),
      }),
    );
    expect(apiCalls).not.toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/promote-to-poam',
        method: 'POST',
      }),
    );
    expect(wrapper.find('[data-testid="promote-to-poam-modal"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain('Mitigating Planned');
  });

  it('marks the risk as mitigating-implemented from Mitigate Risk when all linked POAM items are completed', async () => {
    mockRisk.status = 'investigating';
    mockApiState.poamItemsByRisk = [
      {
        id: 'poam-1',
        title: 'Completed mitigation plan',
        status: 'completed',
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Mitigate Risk');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/poam-items?riskId=risk-1',
        method: 'GET',
      }),
    );
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1',
        method: 'PUT',
        data: expect.objectContaining({
          status: 'mitigating-implemented',
        }),
      }),
    );
    expect(apiCalls).not.toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/promote-to-poam',
        method: 'POST',
      }),
    );
    expect(wrapper.find('[data-testid="promote-to-poam-modal"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain('Mitigating Implemented');
  });

  it('posts the implement review decision when Mark Mitigating Implemented is clicked', async () => {
    mockRisk.status = 'mitigating-planned';

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Mark Mitigating Implemented');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1/review',
        method: 'POST',
        data: {
          decision: 'implement',
        },
      }),
    );
    expect(apiCalls).not.toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/transition',
      }),
    );
    expect(wrapper.text()).toContain('Mitigating Implemented');
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

  it('falls back to risk log entries when events endpoint returns empty', async () => {
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

    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'History & Events');
    await flushPromises();

    expect(wrapper.text()).toContain('Fallback Log Event');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events?page=1&limit=10&offset=0',
        method: 'GET',
      }),
    );
    expect(apiCalls).not.toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/system-security-plans/ssp-1/risks/risk-1/history',
      }),
    );

    mockRisk.riskLog.entries = [];
  });

  it('supports pagination for history and events tab', async () => {
    mockApiState.eventResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events?page=1&limit=10&offset=0'
    ] = {
      data: [
        {
          uuid: 'evt-page-1',
          eventType: 'updated',
          createdAt: '2026-03-18T10:00:00Z',
          actorName: 'System',
          details: 'Event page 1 entry',
        },
      ],
      total: 11,
      limit: 10,
      offset: 0,
      hasMore: true,
    };
    mockApiState.eventResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events?page=2&limit=10&offset=10'
    ] = {
      data: [
        {
          uuid: 'evt-page-2',
          eventType: 'reviewed',
          createdAt: '2026-03-10T10:00:00Z',
          actorName: 'Security Lead',
          details: 'Event page 2 entry',
        },
      ],
      total: 11,
      limit: 10,
      offset: 10,
      hasMore: false,
    };

    const wrapper = mountComponent();
    await flushPromises();
    await clickButtonByText(wrapper, 'History & Events');
    await flushPromises();

    expect(wrapper.text()).toContain('Event page 1 entry');
    expect(wrapper.text()).toContain('Page 1');
    expect(wrapper.text()).toContain('of 2');
    await wrapper
      .get('[data-testid="events-pagination-next"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Event page 2 entry');
    expect(wrapper.text()).toContain('Page 2');
    expect(wrapper.text()).toContain('of 2');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events?page=2&limit=10&offset=10',
        method: 'GET',
      }),
    );

    await wrapper
      .get('[data-testid="events-pagination-prev"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Event page 1 entry');
  });

  it('does not fall back to risk log entries for empty events API responses on later pages', async () => {
    mockRisk.riskLog.entries = [
      {
        uuid: 'fallback-log-event',
        title: 'Fallback Log Event',
        start: '2026-03-11T08:00:00Z',
        loggedBy: [],
      },
    ];
    mockApiState.eventResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events?page=1&limit=10&offset=0'
    ] = {
      data: [
        {
          uuid: 'evt-page-1',
          eventType: 'updated',
          createdAt: '2026-03-18T10:00:00Z',
          actorName: 'System',
          details: 'Event page 1 entry',
        },
      ],
      total: 11,
      limit: 10,
      offset: 0,
      hasMore: true,
    };
    mockApiState.eventResponses[
      '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events?page=2&limit=10&offset=10'
    ] = {
      data: [],
      total: 11,
      limit: 10,
      offset: 10,
      hasMore: false,
    };

    const wrapper = mountComponent();
    await flushPromises();
    await clickButtonByText(wrapper, 'History & Events');
    await flushPromises();

    await wrapper
      .get('[data-testid="events-pagination-next"]')
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Fallback Log Event');
    expect(wrapper.text()).toContain(
      'No events have been recorded for this risk.',
    );
    expect(wrapper.text()).toContain('Page 2');
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint:
          '/api/oscal/system-security-plans/ssp-1/risks/risk-1/events?page=2&limit=10&offset=10',
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

  it('loads resolved controls via /profiles/ endpoint only', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await clickButtonByText(wrapper, 'Controls');
    await flushPromises();
    await clickButtonByText(wrapper, 'Add Control');
    await flushPromises();

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/profiles/profile-1/resolved-with-catalogs',
        method: 'GET',
      }),
    );
    expect(apiCalls).not.toContainEqual(
      expect.objectContaining({
        endpoint: '/api/oscal/profile/profile-1/resolved-with-catalogs',
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
