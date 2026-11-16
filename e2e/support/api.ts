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

    if (path === '/api/auth/sso/providers')
      return json(route, {
        data: [{ name: 'google', 'display-name': 'Google', enabled: true }],
      });
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
    // Compliance Map: two roots (one with open risk and a posture breakdown); no children.
    if (path === '/api/lineage/roots') {
      const node = (
        key: string,
        type: string,
        title: string,
        open: number,
      ) => ({
        key,
        'node-type': type,
        title,
        compliance: {
          'total-controls': 4,
          satisfied: 1,
          'not-satisfied': 2,
          unknown: 1,
          'compliance-percent': 25,
          'assessed-percent': 75,
        },
        risk: {
          'open-score-sum': open,
          'muted-score-sum': 0,
          counts: {
            open: open ? 1 : 0,
            investigating: 0,
            'mitigating-planned': 0,
            'risk-accepted': 0,
            'mitigating-implemented': 0,
          },
        },
        linkage: {
          policies: 1,
          procedures: 0,
          'operational-controls': 4,
          unmapped: false,
          unanchored: !open,
        },
        'ssp-breakdown': {
          'total-ssps': 2,
          satisfied: 2,
          inherited: 0,
          'not-satisfied': 3,
          'not-applicable': 1,
          planned: 0,
          attention: 1,
          'out-of-scope': 1,
        },
        'has-children': true,
        'children-count': 2,
      });
      return list(
        route,
        lists,
        {
          data: [
            node('standard-catalog:iso', 'standard-catalog', 'ISO 27001', 30),
            node('policy-catalog:sec', 'policy-catalog', 'Security policy', 0),
          ],
        },
        { data: [] },
      );
    }
    if (/^\/api\/lineage\/nodes\/[^/]+\/children$/.test(path))
      return json(route, { data: [] });
    if (path === '/api/admin/risk-templates')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'rt-1',
              'plugin-id': 'github',
              'policy-package': 'branch-protection',
              name: 'unprotected-branch',
              title: 'Unprotected default branch',
              statement: 'The default branch accepts unreviewed pushes.',
              'usage-count': 2,
              'created-at': '2026-09-01T00:00:00Z',
            },
          ],
        },
        { data: [] },
      );
    // Admin > Diagnostics: notifications (four tabs) and AI suggestions (on, with one run).
    if (path === '/api/admin/notifications')
      return list(
        route,
        lists,
        {
          data: [
            {
              name: 'EVIDENCE_DIGEST',
              'configured-destinations': [
                {
                  'provider-type': 'slack',
                  'destination-target': '#compliance',
                },
              ],
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/admin/notifications/providers')
      return json(route, {
        data: [
          {
            'provider-type': 'email',
            'display-name': 'Email',
            description: 'SMTP delivery',
            enabled: true,
            metadata: { host: 'smtp.example.com' },
          },
          {
            'provider-type': 'slack',
            'display-name': 'Slack',
            description: 'Slack app',
            enabled: false,
            metadata: {},
          },
        ],
      });
    if (path === '/api/admin/notifications/health')
      return json(route, {
        data: {
          worker: {
            enabled: true,
            mode: 'notify',
            'poll-only': false,
            queues: [
              {
                name: 'notifications',
                'max-workers': 4,
                available: 1,
                retryable: 0,
                running: 0,
                scheduled: 2,
                'completed24-h': 12,
                'discarded24-h': 0,
                'oldest-available-at': '2026-11-16T09:00:00Z',
                'stale-count': 0,
              },
            ],
          },
          providers: [],
          notifications: [
            {
              name: 'EVIDENCE_DIGEST',
              'configured-destinations': [],
              'subscriber-counts': { email: 3, slack: 1, 'total-users': 4 },
            },
          ],
          schedules: [
            {
              name: 'evidence-digest',
              'job-kind': 'digest',
              queue: 'notifications',
              enabled: true,
              'next-run-at': '2026-11-17T09:00:00Z',
              'last-job': { id: 7, state: 'completed' },
            },
          ],
          warnings: [
            {
              code: 'slack-disabled',
              severity: 'warning',
              message: 'Slack is not configured.',
              target: 'slack',
            },
          ],
        },
      });
    if (path === '/api/admin/notifications/jobs')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 7,
              state: 'completed',
              queue: 'notifications',
              kind: 'notification',
              attempt: 1,
              'max-attempts': 5,
              'created-at': '2026-11-16T09:00:00Z',
              'notification-kind': 'EVIDENCE_DIGEST',
              provider: 'email',
              target: 'admin@example.com',
              'correlation-id': 'c-1',
              'last-error': '',
              stale: false,
            },
          ],
          pagination: {},
        },
        { data: [], pagination: {} },
      );
    if (path === '/api/admin/notifications/EVIDENCE_DIGEST/diagnostics')
      return json(route, {
        data: {
          'notification-name': 'EVIDENCE_DIGEST',
          status: 'warning',
          checks: [
            {
              code: 'subscribers',
              label: 'Has subscribers',
              status: 'pass',
              message: '4 people subscribe.',
            },
          ],
          'subscriber-counts': { email: 3, slack: 1, 'total-users': 4 },
          'system-destinations': [],
          'recommended-actions': ['Configure Slack.'],
        },
      });
    if (path === '/api/dashboard-suggestions/config')
      return json(route, { data: { enabled: true } });
    if (path === '/api/admin/ai-diagnostics/summary')
      return json(route, {
        data: {
          enabled: true,
          config: { model: 'claude-sonnet-5-5', 'prompt-version': 'v3' },
          totals: {
            runs: 3,
            'runs-by-status': {
              pending: 0,
              running: 1,
              completed: 1,
              failed: 1,
            },
            'cells-completed': 20,
            'cells-failed': 1,
            'input-tokens': 12000,
            'output-tokens': 3000,
            'cache-read-input-tokens': 6000,
            'cache-creation-input-tokens': 1000,
            'cache-hit-ratio': 0.5,
            'mappings-returned': 40,
            'mappings-rejected': 2,
            'suggestions-accepted': 10,
            'suggestions-rejected': 3,
            'suggestions-pending': 5,
            'rate-limited-total': 0,
          },
          queue: null,
          checks: [
            { id: 'api-key', status: 'pass', message: 'The API key works.' },
          ],
        },
      });
    if (path === '/api/admin/ai-diagnostics/runs')
      return list(route, lists, { data: [], meta: {} }, { data: [], meta: {} });
    if (path === '/api/admin/agents')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'ag-1',
              name: 'collector',
              description: 'Collects evidence',
              'is-active': true,
              'service-account-key-count': 1,
              'last-authenticated-at': '2026-09-09T00:00:00Z',
              'created-at': '2026-09-01T00:00:00Z',
              'updated-at': '2026-09-09T00:00:00Z',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/admin/agents/ag-1')
      return json(route, {
        data: {
          id: 'ag-1',
          name: 'collector',
          description: 'Collects evidence',
          'is-active': true,
          'service-account-key-count': 1,
          'last-authenticated-at': '2026-09-09T00:00:00Z',
          'created-at': '2026-09-01T00:00:00Z',
          'updated-at': '2026-09-09T00:00:00Z',
        },
      });
    if (path === '/api/admin/agents/ag-1/keys')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'key-1',
              name: 'primary',
              'client-id': 'client-1',
              'never-expires': true,
              'created-at': '2026-09-01T00:00:00Z',
              'updated-at': '2026-09-01T00:00:00Z',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/admin/subject-templates' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'st-1',
              name: 'github-organization',
              type: 'component',
              'source-mode': 'runtime-derived',
              'updated-at': '2026-09-09T00:00:00Z',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/admin/subject-templates/st-1')
      return json(route, {
        data: {
          id: 'st-1',
          name: 'github-organization',
          type: 'component',
          'source-mode': 'runtime-derived',
          'title-template': '{{ .organization }}',
          'identity-label-keys': ['organization'],
          'selector-labels': [{ key: '_plugin', value: 'github' }],
          'label-schema': [{ key: 'organization', description: 'GitHub org' }],
        },
      });
    // A definition's Steps tab and a run page: three steps, the last two depending on the first.
    const workflowSteps = [
      { id: 'step-1', name: 'Export access list', order: 1, deps: [] },
      { id: 'step-2', name: 'Review access', order: 2, deps: ['step-1'] },
      { id: 'step-3', name: 'Sign off', order: 3, deps: ['step-1'] },
    ].map((step) => ({
      id: step.id,
      'workflow-definition-id': 'def-1',
      name: step.name,
      'responsible-role': 'Reviewer',
      order: step.order,
      'evidence-required': [],
      'depends-on': step.deps.map((dep) => ({
        id: `${step.id}-${dep}`,
        'workflow-step-definition-id': step.id,
        'depends-on-step-id': dep,
      })),
      'created-at': '2026-01-01T00:00:00Z',
      'updated-at': '2026-01-01T00:00:00Z',
    }));
    if (path === '/api/workflows/definitions/def-1')
      return json(route, {
        data: {
          id: 'def-1',
          name: 'Quarterly access review',
          description: 'Review privileged access',
          version: '1.0.0',
          status: 'published',
        },
      });
    if (path === '/api/workflows/steps')
      return json(route, { data: workflowSteps });
    if (path === '/api/workflows/executions/run-1')
      return json(route, {
        data: {
          id: 'run-1',
          'workflow-instance-id': 'wi-1',
          status: 'in_progress',
          'started-at': '2026-01-05T09:00:00Z',
          'created-at': '2026-01-05T09:00:00Z',
          'updated-at': '2026-01-05T09:00:00Z',
        },
      });
    if (/^\/api\/workflows\/executions\/run-1\/(status|metrics)$/.test(path))
      return json(route, { data: {} });
    if (path === '/api/workflows/step-executions' && method === 'GET')
      return json(route, {
        data: workflowSteps.map((step, index) => ({
          id: `se-${index + 1}`,
          'workflow-execution-id': 'run-1',
          'workflow-step-definition-id': step.id,
          'workflow-step-definition': step,
          status: ['completed', 'in_progress', 'pending'][index],
          'created-at': '2026-01-05T09:00:00Z',
          'updated-at': '2026-01-05T09:00:00Z',
        })),
      });
    if (path === '/api/workflows/definitions') {
      const definitions = {
        data: [
          {
            id: 'def-1',
            name: 'Quarterly access review',
            description: 'Review privileged access',
            version: '1.0.0',
            status: 'published',
            'suggested-cadence': 'quarterly',
            'step-count': 3,
            'evidence-required': '',
          },
        ],
      };
      // Only the definitions list itself shows list states; other pages need it ready.
      return new URL(route.request().frame().url()).pathname === '/workflows'
        ? list(route, lists, definitions, { data: [] })
        : json(route, definitions);
    }
    if (path === '/api/risks')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'risk-1',
              title: 'Backups not tested',
              status: 'open',
              likelihood: 'moderate',
              impact: 'high',
              'ssp-id': SYSTEMS.scoped,
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/filters' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'f-1',
              name: 'Payments services',
              'ssp-id': SYSTEMS.scoped,
              filter: {
                scope: {
                  condition: { label: 'app', operator: '=', value: 'payments' },
                },
              },
              controls: [{ id: 'ac-2', title: 'Account management' }],
              components: [],
            },
          ],
        },
        { data: [] },
      );
    if (path.startsWith('/api/evidence/for-control/'))
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'e-1',
              title: 'MFA enforced for admins',
              status: { state: 'satisfied' },
              end: '2026-11-01T00:00:00Z',
            },
          ],
          metadata: { control: { id: 'ac-2', title: 'Account management' } },
        },
        {
          data: null,
          metadata: { control: { id: 'ac-2', title: 'Account management' } },
        },
      );
    if (path === '/api/control-links' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              'source-catalog-id': 'catalogs-1',
              'source-control-id': 'pol-ac',
              'target-catalog-id': 'catalogs-2',
              'target-control-id': 'ac-1',
              'relationship-type': 'implements',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/control-links/catalog' && method === 'GET')
      return json(route, { data: [] });
    if (path === '/api/users/me')
      return json(route, {
        data: {
          id: 'u-1',
          email: 'tony@example.com',
          'first-name': 'Tony',
          'last-name': 'Smith',
          'auth-method': 'password',
        },
      });
    if (path === '/api/users/me/subscriptions' && method === 'GET')
      return json(route, {
        data: { notifications: { 'evidence-digest': ['email'] } },
      });
    if (path === '/api/notifications/providers')
      return json(route, { data: { email: true, slack: false } });
    if (path === '/api/auth/slack/link/status')
      return json(route, { data: { configured: false, linked: false } });
    if (path === '/api/poam-items')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'poam-1',
              'ssp-id': SYSTEMS.scoped,
              title: 'Rotate database credentials',
              description: 'Credentials are older than policy allows.',
              status: 'open',
              deadline: '2026-12-01T00:00:00Z',
              'updated-at': '2026-11-01T00:00:00Z',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/admin/ssp-templates')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'tpl-1',
              name: 'Applications by _app',
              enabled: true,
              keys: ['_app'],
              'ssp-count': 4,
              'last-run-at': '2026-11-01T00:00:00Z',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/admin/ssp-templates/tpl-1')
      return json(route, {
        data: {
          id: 'tpl-1',
          name: 'Applications by _app',
          enabled: true,
          keys: ['_app'],
          filter: null,
          'scope-labels': [['repo']],
          'min-streams': 2,
          'title-template': 'SSP for {{ ._app }}',
          props: null,
          'profile-ids': [],
          'created-at': '2026-10-19T10:00:00Z',
          'updated-at': '2026-10-19T10:00:00Z',
        },
      });
    if (path === '/api/admin/ssp-templates/tpl-1/ssps')
      return list(
        route,
        lists,
        {
          data: [
            {
              'key-values': { _app: 'payments' },
              'ssp-id': SYSTEMS.scoped,
              title: 'SSP for payments',
              'created-at': '2026-10-19T10:00:00Z',
              'last-seen-at': '2026-10-19T10:00:00Z',
              stale: false,
              'last-error': null,
              'skipped-entries': 0,
            },
          ],
        },
        { data: [] },
      );
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
    if (path === '/api/admin/users/u1')
      return json(route, {
        data: {
          id: 'u1',
          email: 'tony@example.com',
          'first-name': 'Tony',
          'last-name': 'Smith',
          'auth-method': 'password',
          'failed-logins': 0,
          'last-login': '2026-11-10T09:00:00Z',
        },
      });
    if (path === '/api/admin/users/u1/groups')
      return json(route, {
        data: [
          { 'group-id': 'g1', 'group-name': 'Auditors', inherited: false },
        ],
      });
    if (path === '/api/admin/groups/g1')
      return json(route, {
        data: { id: 'g1', name: 'Auditors', description: 'External audit' },
      });
    const people = path.match(
      /^\/api\/admin\/(users|groups)\/[^/]+\/(roles|members)$/,
    );
    if (people) {
      const rows =
        people[2] === 'members'
          ? [{ 'user-id': 'u1', 'display-name': 'Tony Smith' }]
          : people[1] === 'users'
            ? [
                {
                  'assignment-id': 'ra-1',
                  'role-name': 'admin',
                  source: 'manual',
                  inherited: false,
                },
                {
                  'assignment-id': 'ra-2',
                  'role-name': 'viewer',
                  source: 'config',
                  inherited: true,
                  'via-group': 'Auditors',
                },
              ]
            : [
                {
                  id: 'ra-3',
                  'role-name': 'auditor',
                  source: 'manual',
                  'assignee-type': 'group',
                  'assignee-id': 'Auditors',
                },
              ];
      return list(route, lists, { data: rows }, { data: [] });
    }
    if (path === '/api/workflows/step-executions/my')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'se-1',
              status: 'in_progress',
              'due-date': '2026-12-01T00:00:00Z',
              'updated-at': '2026-11-01T00:00:00Z',
              'workflow-step-definition': { name: 'Review access list' },
              'workflow-execution': {
                'workflow-instance': { name: 'Payments access review' },
              },
            },
          ],
          total: 1,
          limit: 10,
          offset: 0,
          'has-more': false,
        },
        { data: [], total: 0, limit: 10, offset: 0, 'has-more': false },
      );
    if (path === '/api/admin/users' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'u1',
              email: 'tony@example.com',
              'first-name': 'Tony',
              'last-name': 'Smith',
              'last-login': '2026-11-10T09:00:00Z',
            },
            {
              id: 'u2',
              email: 'ada@example.com',
              'first-name': 'Ada',
              'last-name': 'Lovelace',
              'is-locked': true,
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/admin/groups' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'g1',
              name: 'Auditors',
              description: 'External audit',
              'member-count': 3,
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/oscal/parties' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              uuid: 'p1',
              name: 'Meridian Financial Group',
              type: 'organization',
            },
          ],
        },
        { data: [] },
      );
    if (path === '/api/oscal/roles' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              id: 'system-owner',
              title: 'System owner',
              description: 'Owns the system.',
            },
          ],
        },
        { data: [] },
      );
    const documentList = path.match(
      /^\/api\/oscal\/(catalogs|profiles|component-definitions|assessment-plans|assessment-results|plan-of-action-and-milestones)$/,
    );
    if (documentList && method === 'GET') {
      const documents = [1, 2].map((i) => ({
        uuid: `${documentList[1]}-${i}`,
        metadata: {
          title: `Example ${documentList[1]} ${i}`,
          version: `1.${i}`,
          'last-modified': `2026-11-0${i}T00:00:00Z`,
        },
      }));
      return list(route, lists, { data: documents }, { data: [] });
    }
    if (path === '/api/oscal/inventory' && method === 'GET')
      return list(
        route,
        lists,
        {
          data: [
            {
              uuid: 'inv-1',
              description: 'Primary database',
              source: 'Payments plan',
              'source-id': SYSTEMS.scoped,
              'source-type': 'ssp',
              props: [{ name: 'asset-type', value: 'database' }],
            },
          ],
        },
        { data: null },
      );
    // A catalog with one group holding one control.
    const catalogPath = path.match(/^\/api\/oscal\/catalogs\/cat-1(\/.*)?$/);
    if (catalogPath && method === 'GET') {
      const rest = catalogPath[1] ?? '';
      if (rest === '')
        return json(route, {
          data: {
            uuid: 'cat-1',
            metadata: { title: 'Example catalog', version: '1.0' },
          },
        });
      if (rest === '/groups')
        return list(
          route,
          lists,
          {
            data: [
              {
                id: 'ac',
                title: 'Access control',
                parts: [
                  { id: 'ac_ovw', name: 'overview', prose: 'About access.' },
                ],
              },
            ],
          },
          { data: [] },
        );
      if (rest === '/groups/ac/controls')
        return json(route, {
          data: [
            {
              id: 'ac-2',
              title: 'Account management',
              parts: [
                {
                  id: 'ac-2_smt',
                  name: 'statement',
                  prose: 'Manage accounts.',
                },
              ],
            },
          ],
        });
      return json(route, { data: [] });
    }
    if (path.startsWith('/api/evidence/compliance-by-control/'))
      return json(route, { data: [] });
    // A record of the redesigned OSCAL types, with every sub-collection its tabs read.
    const oscalRecord = path.match(
      /^\/api\/oscal\/(component-definitions|assessment-plans|assessment-results|plan-of-action-and-milestones)\/([^/]+)(\/.*)?$/,
    );
    if (oscalRecord && method === 'GET') {
      const [, kind, id] = oscalRecord;
      const rest = oscalRecord[3] ?? '';
      const document = {
        uuid: id,
        metadata: {
          title: `Example ${kind}`,
          version: '1.0',
          'last-modified': '2026-11-01T00:00:00Z',
          'oscal-version': '1.2.3',
        },
      };
      if (rest === '' || rest === '/full')
        return json(route, { data: document });
      const entry = (name: string) => ({
        uuid: `${name}-1`,
        title: `Example ${name}`,
        name: `Example ${name}`,
        description: `An example ${name}.`,
        type: 'example',
        start: '2026-11-01T00:00:00Z',
        collected: '2026-11-01T00:00:00Z',
        methods: ['TEST'],
        target: {
          type: 'objective-id',
          targetId: 'ac-1',
          status: { state: 'satisfied' },
        },
      });
      if (rest === '/back-matter')
        return list(
          route,
          lists,
          { data: { resources: [entry('resource')] } },
          { data: { resources: [] } },
        );
      if (rest === '/local-definitions')
        return list(
          route,
          lists,
          { data: { components: [entry('component')], remarks: 'Example' } },
          { data: {} },
        );
      if (/\/associated-activities$/.test(rest))
        return list(route, lists, { data: [] }, { data: [] });
      if (/^\/[a-z-]+$/.test(rest))
        return list(
          route,
          lists,
          { data: [entry(rest.slice(1))] },
          { data: [] },
        );
      return json(route, { data: [] });
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
      // The risk page: the risk, and empty links, threats, reviews and history.
      if (rest === '/risks/risk-1')
        return json(route, {
          data: {
            uuid: 'risk-1',
            id: 'risk-1',
            title: 'Backups not tested',
            description: 'Restores have not been rehearsed this quarter.',
            statement: 'Data could be lost.',
            status: 'open',
            likelihood: 'moderate',
            impact: 'high',
          },
        });
      if (rest.startsWith('/risks/risk-1/')) return json(route, { data: [] });
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

    if (/^\/api\/risks\/risk-1\//.test(path)) return json(route, { data: [] });
    return json(route, { errors: { body: `Unmocked ${method} ${path}` } }, 404);
  });
}
