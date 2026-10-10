import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fullScopeProvidedDescription,
  useStatementExport,
  type StatementExportDraft,
} from '../useStatementExport';

const { getMock, postMock, putMock, deleteMock, decamelizeMarker } = vi.hoisted(
  () => ({
    getMock: vi.fn(),
    postMock: vi.fn(),
    putMock: vi.fn(),
    deleteMock: vi.fn(),
    // A recognizable stand-in: OSCAL calls must pass exactly this function in
    // transformRequest; camelCase (offering) calls must not.
    decamelizeMarker: () => '',
  }),
);

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    get: getMock,
    post: postMock,
    put: putMock,
    delete: deleteMock,
  }),
  decamelizeKeys: decamelizeMarker,
}));

const SSP = 'ssp-1';
const OSCAL_BASE = `/api/oscal/system-security-plans/${SSP}`;
const BC_BASE = `${OSCAL_BASE}/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components`;

// Mutable "server" the URL-routed get mock serves from. Control/statement ids are
// deliberately cased differently from the target's — the joins must be case-insensitive.
interface ServerState {
  components: Array<Record<string, unknown>>;
  byComponents: Array<Record<string, unknown>>;
  offerings: Array<Record<string, unknown>>;
  allowed: Array<Record<string, unknown>>;
}

let server: ServerState;

function installGetMock() {
  getMock.mockImplementation((url: string) => {
    if (url.endsWith('/control-implementation')) {
      return Promise.resolve({
        data: {
          data: {
            implementedRequirements: [
              {
                uuid: 'req-1',
                controlId: 'AC-2',
                statements: [{ uuid: 'stmt-1', statementId: 'AC-2_smt.a' }],
              },
            ],
          },
        },
      });
    }
    if (url.endsWith('/system-implementation/components')) {
      return Promise.resolve({ data: { data: server.components } });
    }
    if (url.endsWith('/by-components')) {
      return Promise.resolve({ data: { data: server.byComponents } });
    }
    if (url.endsWith('/allowed-downstreams')) {
      return Promise.resolve({ data: { data: server.allowed } });
    }
    if (url.endsWith('/export-offerings')) {
      return Promise.resolve({ data: { data: server.offerings } });
    }
    if (url === '/api/oscal/system-security-plans') {
      return Promise.resolve({
        data: {
          data: [
            { uuid: SSP, metadata: { title: 'Meridian Platform' } },
            { uuid: 'ssp-b', metadata: { title: 'Downstream B' } },
            { uuid: 'ssp-c', metadata: { title: 'Downstream C' } },
          ],
        },
      });
    }
    return Promise.reject(new Error(`unrouted GET ${url}`));
  });
}

function makeComposable() {
  return useStatementExport(() => ({
    sspId: SSP,
    sspTitle: 'Meridian Platform',
    controlId: 'ac-2',
    statementId: 'ac-2_smt.a',
  }));
}

function emptyDraft(): StatementExportDraft {
  return { provided: [], responsibilities: [], allowedSspIds: [] };
}

function postedUrls(): string[] {
  return postMock.mock.calls.map((call) => call[0] as string);
}

function postBody(urlSuffix: string): Record<string, unknown> {
  const call = postMock.mock.calls.find((c) =>
    (c[0] as string).endsWith(urlSuffix),
  );
  if (!call) throw new Error(`no POST ending in ${urlSuffix}`);
  return call[1] as Record<string, unknown>;
}

function postConfig(urlSuffix: string): { transformRequest?: unknown[] } {
  const call = postMock.mock.calls.find((c) =>
    (c[0] as string).endsWith(urlSuffix),
  );
  if (!call) throw new Error(`no POST ending in ${urlSuffix}`);
  return (call[2] ?? {}) as { transformRequest?: unknown[] };
}

describe('useStatementExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server = { components: [], byComponents: [], offerings: [], allowed: [] };
    installGetMock();
    postMock.mockImplementation((url: string, body: unknown) =>
      Promise.resolve({ data: { data: { id: 'created', ...(body ?? {}) } } }),
    );
    putMock.mockResolvedValue({ data: { data: {} } });
    deleteMock.mockResolvedValue({});
  });

  it('runs the full ensure-chain, in order, for a fresh export with an empty draft', async () => {
    // The statement is uniformly implemented — the created anchor must copy that state.
    server.byComponents = [
      {
        uuid: 'bc-existing',
        componentUuid: 'comp-github',
        description: 'existing',
        implementationStatus: { state: 'implemented' },
      },
    ];

    const { load, save, stepError } = makeComposable();
    expect(await load()).toBe(true);
    expect(await save(emptyDraft())).toBe(true);
    expect(stepError.value).toBeNull();

    expect(postedUrls()).toEqual([
      `${OSCAL_BASE}/system-implementation/components`,
      BC_BASE,
      expect.stringMatching(/\/by-components\/.+\/export$/),
      expect.stringMatching(/\/export\/provided$/),
      `${OSCAL_BASE}/export-offerings`,
      expect.stringMatching(/\/export-offerings\/.+\/items$/),
      expect.stringMatching(/\/export-offerings\/.+\/publish$/),
    ]);

    // this-system component: client uuid is mandatory (the API MustParses it).
    const component = postBody('/system-implementation/components');
    expect(component.type).toBe('this-system');
    expect(component.title).toBe('Meridian Platform');
    expect(component.uuid).toEqual(expect.any(String));

    // The anchor by-component copies the statement's uniform status — without it the
    // Controls page's status chip (and the Export button) would vanish after export.
    const anchor = postBody('/by-components');
    expect(anchor.uuid).toEqual(expect.any(String));
    expect(anchor.componentUuid).toBe(component.uuid);
    expect(anchor.implementationStatus).toEqual({ state: 'implemented' });

    // Empty draft ⇒ the auto full-scope provided block.
    const provided = postBody('/export/provided');
    expect(provided.description).toBe(
      fullScopeProvidedDescription('Meridian Platform'),
    );

    // The offering item ties (control, statement, component, provided) together. The
    // statementId is the SSP's own casing, not the target's.
    const item = postBody('/items');
    expect(item).toEqual({
      controlId: 'ac-2',
      statementId: 'AC-2_smt.a',
      componentUuid: component.uuid,
      providedUuid: provided.uuid,
    });

    // Casing rules: OSCAL subtree kebab-cases via decamelizeKeys; the hand-written
    // camelCase offering endpoints must NOT.
    expect(
      postConfig('/system-implementation/components').transformRequest,
    ).toContain(decamelizeMarker);
    expect(postConfig('/export/provided').transformRequest).toContain(
      decamelizeMarker,
    );
    expect(postConfig('/items').transformRequest).toBeUndefined();
    expect(postConfig('/publish').transformRequest).toBeUndefined();
  });

  it('reuses everything on edit: only the changed provided is PUT, then publish', async () => {
    server.components = [
      { uuid: 'comp-sys', type: 'this-system', title: 'Meridian Platform' },
    ];
    server.byComponents = [
      {
        uuid: 'bc-sys',
        componentUuid: 'comp-sys',
        implementationStatus: { state: 'implemented' },
        export: {
          uuid: 'exp-1',
          description: '',
          provided: [{ uuid: 'p-1', description: 'Old description' }],
          responsibilities: [],
        },
      },
    ];
    server.offerings = [
      {
        id: 'off-1',
        sspId: SSP,
        title: 'Meridian Platform — Shared capabilities',
        status: 'published',
        items: [
          {
            id: 'item-1',
            controlId: 'ac-2',
            statementId: 'AC-2_smt.a',
            componentUuid: 'comp-sys',
            providedUuid: 'p-1',
          },
        ],
      },
    ];

    const { state, load, save } = makeComposable();
    expect(await load()).toBe(true);
    expect(state.value?.provided).toEqual([
      { uuid: 'p-1', description: 'Old description' },
    ]);
    expect(state.value?.alreadyPublished).toBe(true);

    expect(
      await save({
        provided: [{ uuid: 'p-1', description: 'New description' }],
        responsibilities: [],
        allowedSspIds: [],
      }),
    ).toBe(true);

    expect(putMock).toHaveBeenCalledWith(
      `${BC_BASE}/bc-sys/export/provided/p-1`,
      { uuid: 'p-1', description: 'New description' },
      expect.objectContaining({ transformRequest: [decamelizeMarker] }),
    );
    // Idempotency: nothing recreated, no duplicate item — just the publish re-sync.
    expect(postedUrls()).toEqual([
      `${OSCAL_BASE}/export-offerings/off-1/publish`,
    ]);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('links responsibilities to the auto-created full-scope provided when none are defined', async () => {
    server.byComponents = [
      {
        uuid: 'bc-1',
        componentUuid: 'comp-x',
        implementationStatus: { state: 'alternative' },
      },
    ];

    const { load, save } = makeComposable();
    await load();
    await save({
      provided: [],
      responsibilities: [
        { description: 'Consumers rotate their own keys', providedIndex: 0 },
      ],
      allowedSspIds: [],
    });

    const provided = postBody('/export/provided');
    const responsibility = postBody('/export/responsibilities');
    expect(responsibility.providedUuid).toBe(provided.uuid);
    expect(responsibility.description).toBe('Consumers rotate their own keys');
    // The alternative state is copied onto the anchor too.
    expect(postBody('/by-components').implementationStatus).toEqual({
      state: 'alternative',
    });
  });

  it('ignores revoked/deprecated offerings and creates a fresh default offering', async () => {
    server.byComponents = [
      {
        uuid: 'bc-1',
        componentUuid: 'comp-x',
        implementationStatus: { state: 'implemented' },
      },
    ];
    server.offerings = [
      {
        id: 'off-revoked',
        sspId: SSP,
        title: 'Meridian Platform — Shared capabilities',
        status: 'revoked',
        items: [],
      },
    ];

    const { load, save } = makeComposable();
    await load();
    await save(emptyDraft());

    const offeringPosts = postedUrls().filter((url) =>
      url.endsWith('/export-offerings'),
    );
    expect(offeringPosts).toHaveLength(1);
    expect(postedUrls().some((url) => url.includes('off-revoked'))).toBe(false);
  });

  it('syncs the allow-list by diffing: adds the new downstream, removes the stale one', async () => {
    server.components = [
      { uuid: 'comp-sys', type: 'this-system', title: 'Meridian Platform' },
    ];
    server.byComponents = [
      {
        uuid: 'bc-sys',
        componentUuid: 'comp-sys',
        implementationStatus: { state: 'implemented' },
        export: {
          uuid: 'exp-1',
          description: '',
          provided: [{ uuid: 'p-1', description: 'Cap' }],
          responsibilities: [],
        },
      },
    ];
    server.offerings = [
      {
        id: 'off-1',
        sspId: SSP,
        title: 'Meridian Platform — Shared capabilities',
        status: 'published',
        items: [
          {
            id: 'item-1',
            controlId: 'ac-2',
            statementId: 'AC-2_smt.a',
            componentUuid: 'comp-sys',
            providedUuid: 'p-1',
          },
        ],
      },
    ];
    server.allowed = [{ id: 'a-1', downstreamSspId: 'ssp-c' }];

    const { state, load, save } = makeComposable();
    await load();
    expect(state.value?.allowedSspIds).toEqual(['ssp-c']);

    await save({
      provided: [{ uuid: 'p-1', description: 'Cap' }],
      responsibilities: [],
      allowedSspIds: ['ssp-b'],
    });

    expect(postMock).toHaveBeenCalledWith(
      `${OSCAL_BASE}/export-offerings/off-1/allowed-downstreams`,
      { downstreamSspId: 'ssp-b' },
    );
    expect(deleteMock).toHaveBeenCalledWith(
      `${OSCAL_BASE}/export-offerings/off-1/allowed-downstreams/ssp-c`,
    );
  });

  it('halts on a failed step with a named stepError, and a retry completes the rest', async () => {
    server.byComponents = [
      {
        uuid: 'bc-1',
        componentUuid: 'comp-x',
        implementationStatus: { state: 'implemented' },
      },
    ];

    postMock.mockImplementation((url: string, body: unknown) => {
      if (url.endsWith('/export')) {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({ data: { data: { id: 'x', ...(body ?? {}) } } });
    });

    const { load, save, stepError } = makeComposable();
    await load();
    expect(await save(emptyDraft())).toBe(false);
    expect(stepError.value?.step).toBe('export');
    // The chain stopped: nothing offering-side happened.
    expect(postedUrls().some((url) => url.includes('export-offerings'))).toBe(
      false,
    );

    // Retry: the already-created component/anchor are reused, the rest completes.
    postMock.mockImplementation((url: string, body: unknown) =>
      Promise.resolve({ data: { data: { id: 'x', ...(body ?? {}) } } }),
    );
    postMock.mockClear();
    expect(await save(emptyDraft())).toBe(true);
    expect(stepError.value).toBeNull();
    expect(postedUrls()).toEqual([
      expect.stringMatching(/\/by-components\/.+\/export$/),
      expect.stringMatching(/\/export\/provided$/),
      `${OSCAL_BASE}/export-offerings`,
      expect.stringMatching(/\/items$/),
      expect.stringMatching(/\/publish$/),
    ]);
  });
});
