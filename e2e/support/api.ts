import type { Page, Route } from '@playwright/test';
import { RESOURCES } from '../../src/constants/permissions';

/**
 * A mocked API for the browser checks. Fixtures use the API's wire format (OSCAL kebab-case,
 * `{ data }` envelopes, paginated lists), so the UI's own camelCasing and unwrapping are
 * exercised. `signIn` seeds the persisted auth store, as a real sign-in would.
 */

export const EVIDENCE_ID = 'ev-1';

export const SYSTEMS = {
  scoped: 'a1b2c3d4-0000-4000-8000-000000000001',
  unscoped: 'a1b2c3d4-0000-4000-8000-000000000002',
  missing: 'a1b2c3d4-0000-4000-8000-0000000000ff',
};

const plans = [
  {
    uuid: SYSTEMS.scoped,
    metadata: {
      title: 'Payments Processing Platform',
      version: '1.2.0',
      'last-modified': '2026-11-05T09:55:00Z',
    },
  },
  {
    uuid: SYSTEMS.unscoped,
    metadata: {
      title: 'Customer Portal',
      version: '1.0.0',
      'last-modified': '2026-10-01T12:00:00Z',
    },
  },
];

function evidence(index: number, state: string) {
  return {
    id: `ev-${index}`,
    uuid: `ev-${index}`,
    title: `Backup verification for payments-db-${index}`,
    status: { state, reason: '' },
    start: '2026-11-05T09:00:00Z',
    end: '2026-11-05T09:55:00Z',
    labels: [
      { name: 'provider', value: 'aws' },
      { name: '_policy', value: 'backups' },
    ],
    activities: [],
    'subject-references':
      index % 3 === 0
        ? []
        : [
            {
              'subject-uuid': `sub-${index}`,
              type: 'component',
              title: `payments-db-${index} in eu-west-1`,
            },
          ],
  };
}

export type ApiState = 'ready' | 'empty' | 'error' | 'loading';

export interface MockOptions {
  /** State of the list endpoints (systems list and evidence search). */
  lists?: ApiState;
  /** Permission map overrides; by default every action on every resource is allowed. */
  permissions?: Record<string, string[]>;
}

const ALL_ACTIONS = ['read', 'create', 'update', 'delete', 'manage', 'export'];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Answers per `state`: data, an empty list, a 500, or never (loading). */
async function list(
  route: Route,
  state: ApiState,
  body: unknown,
  empty: unknown,
) {
  if (state === 'loading') return; // never fulfilled: the page stays in its loading state
  if (state === 'error') return json(route, { errors: { body: 'boom' } }, 500);
  return json(route, state === 'empty' ? empty : body);
}

function searchResponse(route: Route, url: URL, lists: ApiState) {
  const page = Number(url.searchParams.get('page') ?? '1');
  const rows = Array.from({ length: 50 }, (_, i) =>
    evidence(
      (page - 1) * 50 + i + 1,
      i % 4 === 1 ? 'not-satisfied' : 'satisfied',
    ),
  );
  return list(
    route,
    lists,
    { data: rows, total: 120, page, limit: 50, totalPages: 3 },
    { data: [], total: 0, page: 1, limit: 50, totalPages: 1 },
  );
}

function trendResponse(route: Route, lists: ApiState) {
  return list(
    route,
    lists,
    {
      data: [0, 1, 2, 3].map((i) => ({
        interval: new Date(Date.UTC(2026, 10, 13, 9, i * 15)).toISOString(),
        statuses: [
          { status: 'satisfied', count: 80 + i },
          { status: 'not-satisfied', count: 40 - i },
        ],
      })),
    },
    { data: [] },
  );
}

export async function signIn(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        user: {
          id: 'u-1',
          email: 'tony@example.com',
          firstName: 'Tony',
          lastName: 'Smith',
        },
        isAuthenticated: true,
      }),
    );
    localStorage.setItem('theme', t);
  }, theme);
}

/** Bodies POSTed to /api/evidence or a system's risks during the test, newest last. */
export const created: unknown[] = [];
/** Evidence links POSTed to a risk during the test. */
export const linked: { path: string; body: unknown }[] = [];

export async function mockApi(page: Page, options: MockOptions = {}) {
  created.length = 0;
  linked.length = 0;
  const lists = options.lists ?? 'ready';
  const permissions = Object.fromEntries(
    Object.values(RESOURCES).map((resource) => [resource, ALL_ACTIONS]),
  );
  Object.assign(permissions, options.permissions);

  await page.route('**/config.json', (route) =>
    json(route, { API_URL: '', LOGIN_BANNER: '', DEMO_FEEDBACK_URL: '' }),
  );

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === '/api/evidence/config')
      return json(route, { data: { 'manual-subject-required': false } });
    if (path === '/api/evidence' && method === 'POST') {
      created.push(route.request().postDataJSON());
      return json(route, { data: { id: 'ev-9' } }, 201);
    }

    if (path === '/api/me/permissions') {
      return json(route, { subject: { type: 'user', id: 'u-1' }, permissions });
    }
    if (path === '/api/evidence/search')
      return searchResponse(route, url, lists);
    if (path === '/api/evidence/status-over-time')
      return trendResponse(route, lists);
    const record = path.match(/^\/api\/evidence\/(ev-\d+)(\/.*)?$/);
    if (record) {
      const rest = record[2] ?? '';
      const item = {
        ...evidence(Number(record[1]!.slice(3)), 'satisfied'),
        description: 'Daily restore test of the payments database.',
        props: [{ name: 'check', value: 'restore' }],
        links: [{ href: '#log', rel: 'evidence' }],
        'back-matter': {
          resources: [
            {
              uuid: 'log',
              title: 'restore.log',
              base64: { 'media-type': 'text/plain', value: btoa('restore ok') },
            },
          ],
        },
        expires: '2026-12-30T00:00:00Z',
      };
      if (rest === '') return json(route, { data: item });
      if (rest === '/signature')
        return json(route, { data: { status: 'unsigned' } });
      if (rest === '/risks') return json(route, { data: [] });
      if (rest === '/verify')
        return json(route, {
          data: {
            status: 'unsigned',
            'is-valid': false,
            checks: {
              'hash-match': false,
              'signature-valid': false,
              'temporal-valid': false,
              'signed-content-matches': false,
            },
          },
        });
    }
    if (path.startsWith('/api/evidence/latest/'))
      return json(route, { data: { id: EVIDENCE_ID } });
    if (path.startsWith('/api/evidence/history/'))
      return json(route, {
        data: [1, 2, 3].map((i) => evidence(i, 'satisfied')),
      });
    if (path.startsWith('/api/evidence/status-over-time/'))
      return json(route, { data: [] });
    if (/^\/api\/oscal\/profiles\/[^/]+\/compliance-progress$/.test(path)) {
      const controls = ['ac-1', 'ac-2', 'ac-3'].map((id, i) => ({
        'control-id': id,
        'catalog-id': 'cat-1',
        title: `Control ${id}`,
        'group-id': 'ac',
        'group-title': 'Access control',
        implemented: i !== 2,
        'computed-status': ['satisfied', 'not-satisfied', 'unknown'][i],
        'status-counts': [{ status: 'satisfied', count: 3 - i }],
      }));
      return list(
        route,
        lists,
        {
          data: {
            scope: { id: path.split('/')[4], type: 'profile' },
            summary: {
              'total-controls': 3,
              satisfied: 1,
              'not-satisfied': 1,
              unknown: 1,
              inherited: 0,
              'compliance-percent': 33,
              'assessed-percent': 67,
            },
            implementation: {
              'implemented-controls': 2,
              'implementation-percent': 67,
              'unimplemented-controls': 1,
            },
            groups: [
              {
                id: 'ac',
                title: 'Access control',
                'total-controls': 3,
                satisfied: 1,
                'not-satisfied': 1,
                unknown: 1,
                'compliance-percent': 33,
              },
            ],
            controls,
          },
        },
        { data: { scope: {}, summary: {}, groups: [], controls: [] } },
      );
    }
    if (path === '/api/admin/risk-templates') return json(route, { data: [] });
    if (path === '/api/workflows/definitions')
      return json(route, {
        data: [
          {
            id: 'def-1',
            name: 'Quarterly access review',
            'evidence-required': '',
          },
        ],
      });
    if (path === '/api/workflows/instances' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'wi-1',
              name: 'Payments access review',
              description: 'Reviews privileged access every quarter',
              'workflow-definition-id': 'def-1',
              'workflow-definition': {
                id: 'def-1',
                name: 'Quarterly access review',
              },
              cadence: 'quarterly',
              'is-active': true,
              'last-execution-at': '2026-10-01T09:00:00Z',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/agent/heartbeat/over-time') {
      return json(route, {
        data: [0, 1, 2, 3, 4, 5].map((i) => ({
          interval: new Date(Date.UTC(2026, 10, 13, 9, i * 10)).toISOString(),
          total: 2 + (i % 2),
        })),
      });
    }
    if (path === '/api/subjects') {
      return json(route, {
        data: [
          {
            'subject-uuid': 'sub-1',
            title: 'payments-db-1 in eu-west-1',
            kind: 'component',
            type: 'component',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    }
    if (path === '/api/oscal/system-security-plans' && method === 'GET') {
      return list(route, lists, { data: plans }, { data: [] });
    }

    const ssp = path.match(
      /^\/api\/oscal\/system-security-plans\/([^/]+)(\/.*)?$/,
    );
    if (ssp) {
      const plan = plans.find((candidate) => candidate.uuid === ssp[1]);
      if (!plan) return json(route, { errors: { body: 'not found' } }, 404);
      const rest = ssp[2] ?? '';
      if (rest === '') return json(route, { data: plan });
      if (rest === '/risks' && method === 'POST') {
        created.push(route.request().postDataJSON());
        return json(route, { data: { id: 'risk-9', title: 'New risk' } }, 201);
      }
      if (/^\/risks\/[^/]+\/evidence$/.test(rest) && method === 'POST') {
        linked.push({ path, body: route.request().postDataJSON() });
        return json(route, { data: {} }, 201);
      }
      if (rest === '/risks')
        return list(
          route,
          lists,
          {
            data: [
              {
                uuid: 'risk-1',
                id: 'risk-1',
                title: 'Backups not tested',
                description: 'Restores have not been rehearsed this quarter.',
                statement: 'Data could be lost.',
                status: 'open',
                likelihood: 'moderate',
                impact: 'high',
                deadline: '2026-10-01T00:00:00Z',
              },
            ],
          },
          { data: [] },
        );
      if (rest === '/risks/score-timeseries') return json(route, { data: [] });
      if (rest === '/profiles')
        return json(route, {
          data: [
            { id: 'prof-1', title: 'Payments baseline' },
            { id: 'prof-2', title: 'Resilience' },
          ],
        });
      if (rest === '/scope') {
        const entries =
          plan.uuid === SYSTEMS.scoped
            ? [{ labels: [{ name: 'system', value: 'payments' }] }]
            : [];
        return json(route, { data: { entries, exceptions: [] } });
      }
      if (rest === '/evidence/status-over-time')
        return trendResponse(route, lists);
      if (rest === '/evidence/search') return searchResponse(route, url, lists);
    }

    return json(route, { errors: { body: `Unmocked ${method} ${path}` } }, 404);
  });
}
