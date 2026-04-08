import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ViewView from '../ViewView.vue';

type MockRef<T> = {
  value: T;
};

type MockRouteState = {
  params: {
    id: string;
  };
};

type ViewTestRefs = {
  nullGetCallIndex: number;
  evidence: MockRef<Record<string, unknown>>;
  signature: MockRef<Record<string, unknown>>;
  latestEvidence: MockRef<Record<string, unknown> | undefined>;
  verification: MockRef<Record<string, unknown> | null>;
  history: MockRef<Array<Record<string, unknown>>>;
  compliance: MockRef<Array<Record<string, unknown>>>;
  heartbeat: MockRef<Array<Record<string, unknown>>>;
  loading: MockRef<boolean>;
  error: MockRef<unknown>;
  signatureError: MockRef<unknown>;
  verifyError: MockRef<unknown>;
  route: MockRouteState;
};

const {
  mockRoute,
  routerPush,
  executeVerify,
  baseEvidence,
  signedSignatureDetail,
  invalidVerificationResult,
  historyItems,
  complianceHistory,
  heartbeatHistory,
  refs,
} = vi.hoisted(() => ({
  mockRoute: {
    params: {
      id: 'evidence-1',
    },
  },
  routerPush: vi.fn(),
  executeVerify: vi.fn(async (url?: string) => {
    refs.verification.value = invalidVerificationResult;
    return { data: { value: { data: invalidVerificationResult } }, url };
  }),
  baseEvidence: {
    id: 'evidence-1',
    uuid: 'evidence-uuid-1',
    title: 'Repository attestation evidence',
    description: 'Collected from CI attestations.',
    labels: [
      { name: 'env', value: 'prod' },
      { name: '_internal', value: 'hidden' },
    ],
    start: '2026-04-07T10:00:00Z',
    end: '2026-04-07T10:15:00Z',
    expires: '2099-04-10T10:15:00Z',
    links: [
      { href: '#resource-1', rel: 'reference', text: 'Attestation bundle' },
      {
        href: 'https://example.com/evidence',
        rel: 'external',
        text: 'Source',
      },
    ],
    props: [
      {
        name: 'check',
        value: 'baseline',
        class: 'compliance',
        ns: 'urn:test',
        remarks: 'Collected nightly',
      },
    ],
    backMatter: {
      resources: [
        {
          uuid: 'resource-1',
          title: 'Attestation bundle',
          base64: { mediaType: 'text/plain', value: 'Zm9v' },
        },
        {
          uuid: 'resource-2',
          title: 'Unlinked resource',
          base64: { mediaType: 'text/plain', value: 'YmFy' },
        },
      ],
    },
    status: {
      state: 'satisfied',
      reason: 'Attestation verified',
    },
    activities: [
      {
        uuid: 'activity-1',
        title: 'Build pipeline',
        description: 'Collected during CI',
        steps: [
          {
            uuid: 'step-1',
            title: 'Generate attestation',
            description: 'Create the signed payload',
          },
        ],
      },
    ],
  },
  signedSignatureDetail: {
    status: 'signed',
    signature: {
      version: '1',
      signatureAlgorithm: 'RS256',
      signedAt: '2026-04-07T10:15:00Z',
      contentHash: {
        algorithm: 'SHA-256',
        value: 'abc123',
      },
      signer: {
        type: 'user',
        name: 'A User',
        email: 'user@example.com',
        id: 'user-1',
        credentialId: 'cred-1',
      },
      claims: {
        subject: 'user@example.com',
        issuer: 'ccf',
        tokenKind: 'user',
        issuedAt: '2026-04-07T10:00:00Z',
        expiresAt: '2026-04-07T11:00:00Z',
        notBefore: '2026-04-07T10:00:00Z',
        authMethod: 'password',
      },
      jws: 'header.payload.signature',
    },
  },
  invalidVerificationResult: {
    status: 'signed',
    isValid: false,
    checks: {
      hashMatch: false,
      signatureValid: true,
      temporalValid: true,
      signedContentMatches: false,
    },
    errors: [
      'current evidence content does not match the stored signature envelope hash',
    ],
    contentHash: {
      algorithm: 'SHA-256',
      value: 'def456',
    },
  },
  historyItems: [
    {
      id: 'historic-1',
      uuid: 'evidence-uuid-1',
      title: 'Older repository attestation evidence',
      description: 'Older collection',
      labels: [],
      start: '2026-04-06T10:00:00Z',
      end: '2026-04-06T10:15:00Z',
      links: [],
      props: [],
      backMatter: { resources: [] },
      status: {
        state: 'satisfied',
        reason: 'Previous run',
      },
      activities: [],
    },
  ],
  complianceHistory: [
    {
      interval: '2026-04-07T10:00:00Z',
      statuses: [
        { status: 'satisfied', count: 1 },
        { status: 'not-satisfied', count: 0 },
      ],
    },
  ],
  heartbeatHistory: [
    {
      interval: '2026-04-07T10:00:00Z',
      statuses: [{ status: 'healthy', count: 1 }],
    },
  ],
  refs: {
    nullGetCallIndex: 0,
  } as ViewTestRefs,
}));

vi.mock('vue-router', () => ({
  useRoute: () => refs.route,
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock('@/parsers/findings.ts', () => ({
  calculateComplianceOverTimeData: () => ({
    datasets: [],
    labels: [],
  }),
}));

vi.mock('@/parsers/heartbeats.ts', () => ({
  calculateHeartbeatOverTimeData: () => ({
    datasets: [],
    labels: [],
  }),
}));

vi.mock('@/composables/axios', async () => {
  const { ref } = await import('vue');
  const { reactive } = await import('vue');

  refs.evidence = ref(baseEvidence);
  refs.signature = ref(signedSignatureDetail);
  refs.latestEvidence = ref(baseEvidence);
  refs.verification = ref(null);
  refs.history = ref(historyItems);
  refs.compliance = ref(complianceHistory);
  refs.heartbeat = ref(heartbeatHistory);
  refs.loading = ref(false);
  refs.error = ref(null);
  refs.signatureError = ref(null);
  refs.verifyError = ref(null);
  refs.route = reactive(structuredClone(mockRoute));

  return {
    useDataApi: (
      url: string | { value?: string } | null,
      config?: { method?: string },
    ) => {
      const resolvedUrl =
        typeof url === 'string'
          ? url
          : url && 'value' in url
            ? url.value
            : null;

      if (url === null && !config) {
        refs.nullGetCallIndex = Number(refs.nullGetCallIndex || 0) + 1;

        if (refs.nullGetCallIndex === 1) {
          return {
            data: refs.evidence,
            isLoading: refs.loading,
            error: refs.error,
            execute: vi.fn(async (nextUrl?: string) => {
              if (nextUrl === '/api/evidence/evidence-2') {
                refs.evidence.value = {
                  ...structuredClone(baseEvidence),
                  id: 'evidence-2',
                  uuid: 'evidence-uuid-2',
                  title: 'Second evidence record',
                };
              }
              return { data: { value: { data: refs.evidence.value } } };
            }),
          };
        }

        if (refs.nullGetCallIndex === 2) {
          return {
            data: refs.signature,
            error: refs.signatureError,
            execute: vi.fn(async (nextUrl?: string) => {
              if (nextUrl === '/api/evidence/evidence-2/signature') {
                refs.signature.value = {
                  status: 'unsigned',
                };
              }
              return { data: { value: { data: refs.signature.value } } };
            }),
          };
        }

        return {
          data: refs.latestEvidence,
          error: refs.error,
          execute: vi.fn(async (nextUrl?: string) => {
            if (nextUrl === '/api/evidence/latest/evidence-uuid-2') {
              refs.latestEvidence.value = {
                ...structuredClone(baseEvidence),
                id: 'evidence-2',
                uuid: 'evidence-uuid-2',
                title: 'Second evidence record',
              };
            }
            return { data: { value: { data: refs.latestEvidence.value } } };
          }),
        };
      }

      if (resolvedUrl === '/api/evidence/evidence-1') {
        return {
          data: refs.evidence,
          isLoading: refs.loading,
          error: refs.error,
          execute: vi.fn(async () => ({
            data: { value: { data: refs.evidence.value } },
          })),
        };
      }

      if (resolvedUrl === '/api/evidence/evidence-1/signature') {
        return {
          data: refs.signature,
          error: refs.signatureError,
          execute: vi.fn(async () => ({
            data: { value: { data: refs.signature.value } },
          })),
        };
      }

      if (resolvedUrl === '/api/evidence/history/evidence-uuid-1') {
        return {
          data: refs.history,
          isLoading: refs.loading,
          error: refs.error,
        };
      }

      if (resolvedUrl === '/api/evidence/status-over-time/evidence-uuid-1') {
        return {
          data: refs.compliance,
          isLoading: refs.loading,
          error: refs.error,
        };
      }

      if (resolvedUrl === '/api/agent/heartbeat/over-time') {
        return {
          data: refs.heartbeat,
          isLoading: refs.loading,
          error: refs.error,
        };
      }

      if (url === null && config?.method === 'POST') {
        return {
          data: refs.verification,
          execute: executeVerify,
          isLoading: refs.loading,
          error: refs.verifyError,
        };
      }

      return {
        data: ref(undefined),
        isLoading: refs.loading,
        error: refs.error,
        execute: vi.fn(async () => ({ data: { value: undefined } })),
      };
    },
  };
});

function mountView() {
  return mount(ViewView, {
    global: {
      stubs: {
        PageHeader: {
          template: '<h1><slot /></h1>',
        },
        PageSubHeader: {
          template: '<h2><slot /></h2>',
        },
        PageCard: {
          template: '<section><slot /></section>',
        },
        SecondaryButton: {
          emits: ['click'],
          template:
            '<button type="button" @click="$emit(\'click\')" :disabled="$attrs.disabled"><slot /></button>',
        },
        Dialog: {
          template: '<div><slot /></div>',
        },
        Message: {
          template: '<div><slot /></div>',
        },
        BIconLockFill: {
          template: '<span>lock</span>',
        },
        BIconUnlockFill: {
          template: '<span>unlock</span>',
        },
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
        },
        BackMatterDisplay: {
          props: ['resource'],
          template: '<div>BackMatterDisplay {{ resource.title }}</div>',
        },
        LabelList: {
          props: ['labels'],
          template:
            '<div>Labels: {{ labels.map((label) => `${label.name}=${label.value}`).join(", ") }}</div>',
        },
        EvidenceHistorySection: {
          props: ['uuid'],
          template: '<div>EvidenceHistorySection {{ uuid }}</div>',
        },
        ResultComplianceOverTimeChart: {
          template: '<div>Chart</div>',
        },
        ResultStatusRing: {
          template: '<div>StatusRing</div>',
        },
        BIconDownload: {
          template: '<span>download</span>',
        },
      },
      directives: {
        tooltip: () => undefined,
      },
    },
  });
}

async function clickButtonByText(
  wrapper: ReturnType<typeof mountView>,
  text: string,
) {
  const button = wrapper.findAll('button').find((item) => item.text() === text);
  expect(button, `Missing button: ${text}`).toBeDefined();
  await button!.trigger('click');
  await flushPromises();
}

describe('Evidence ViewView', () => {
  beforeEach(() => {
    refs.nullGetCallIndex = 0;
    refs.evidence.value = structuredClone(baseEvidence);
    refs.signature.value = structuredClone(signedSignatureDetail);
    refs.latestEvidence.value = structuredClone(baseEvidence);
    refs.verification.value = null;
    refs.history.value = structuredClone(historyItems);
    refs.compliance.value = structuredClone(complianceHistory);
    refs.heartbeat.value = structuredClone(heartbeatHistory);
    refs.loading.value = false;
    refs.error.value = null;
    refs.signatureError.value = null;
    refs.verifyError.value = null;
    refs.route.params.id = 'evidence-1';
    executeVerify.mockClear();
    routerPush.mockClear();
  });

  it('renders the evidence detail tabs with overview as the default tab', async () => {
    const wrapper = mountView();
    await flushPromises();

    const tabContainer = wrapper.find('.border-b');
    const tabTexts = tabContainer
      .findAll('button')
      .map((button) => button.text());

    expect(tabTexts).toEqual([
      'Overview',
      'Metadata',
      'Media',
      'Signature',
      'History',
    ]);
    expect(wrapper.text()).toContain('Current State');
    expect(wrapper.text()).not.toContain('Internal resource reference:');
    expect(wrapper.text()).toContain('Expiration Date');
    expect(wrapper.text()).toContain('Signed');
  });

  it('shows labels, props, and links in the metadata tab', async () => {
    const wrapper = mountView();
    await flushPromises();

    await clickButtonByText(wrapper, 'Metadata');

    expect(wrapper.text()).toContain('Labels: env=prod, _internal=hidden');
    expect(wrapper.text()).toContain('check: baseline');
    expect(wrapper.text()).toContain('https://example.com/evidence');
    expect(wrapper.text()).toContain('Internal resource reference:');
  });

  it('shows only referenced back matter resources in the media tab', async () => {
    const wrapper = mountView();
    await flushPromises();

    await clickButtonByText(wrapper, 'Media');

    expect(wrapper.text()).toContain('Attestation bundle');
    expect(wrapper.text()).not.toContain('Unlinked resource');
  });

  it('shows signed metadata and only verifies on manual action', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(executeVerify).not.toHaveBeenCalled();

    await clickButtonByText(wrapper, 'Signature');

    expect(wrapper.text()).toContain('Stored signature status:');
    expect(wrapper.text()).toContain('Signed');
    expect(wrapper.text()).toContain('RS256');
    expect(wrapper.text()).toContain('header.payload.signature');

    await clickButtonByText(wrapper, 'Verify');

    expect(executeVerify).toHaveBeenCalledWith(
      '/api/evidence/evidence-1/verify',
    );
    expect(wrapper.text()).toContain('Invalid');
    expect(wrapper.text()).toContain('Verification Errors');
    expect(wrapper.text()).toContain(
      'current evidence content does not match the stored signature envelope hash',
    );
  });

  it('shows unsigned state when there is no stored signature envelope', async () => {
    refs.signature.value = {
      status: 'unsigned',
    };

    const wrapper = mountView();
    await flushPromises();

    await clickButtonByText(wrapper, 'Signature');

    expect(wrapper.text()).toContain('Unsigned');
    expect(wrapper.text()).toContain(
      'No stored signature envelope is available for this evidence record.',
    );
  });

  it('renders the shared history section in the history tab', async () => {
    const wrapper = mountView();
    await flushPromises();

    await clickButtonByText(wrapper, 'History');

    expect(wrapper.text()).toContain('EvidenceHistorySection evidence-uuid-1');
  });

  it('shows expired evidence in red expiration styling', async () => {
    refs.evidence.value = {
      ...structuredClone(baseEvidence),
      expires: '2000-01-01T00:00:00Z',
    };

    const wrapper = mountView();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Expiration Date');
    expect(text).toContain('(expired)');
    expect(text).not.toContain('Collection Window');
  });

  it('replaces expiration with a latest-evidence link for stale evidence', async () => {
    refs.evidence.value = {
      ...structuredClone(baseEvidence),
      id: 'historic-1',
    };
    refs.latestEvidence.value = {
      ...structuredClone(baseEvidence),
      id: 'latest-1',
    };

    const wrapper = mountView();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Latest Evidence');
    expect(text).toContain('Go to latest evidence');
    expect(text).not.toContain('Expiration Date');
    expect(wrapper.find('[data-to*="latest-1"]').exists()).toBe(true);
  });

  it('reloads evidence details when the route id changes', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('Repository attestation evidence');

    refs.route.params.id = 'evidence-2';
    await flushPromises();
    await flushPromises();

    expect(wrapper.text()).toContain('Second evidence record');
    expect(wrapper.text()).toContain('Unsigned');
  });
});
