import type { Page, Route } from '@playwright/test';
import { RESOURCES } from '../../src/constants/permissions';

/**
 * A mocked API for the browser checks. Fixtures use the API's wire format (OSCAL kebab-case,
 * `{ data }` envelopes, paginated lists), so the UI's own camelCasing and unwrapping are
 * exercised. `signIn` seeds the persisted auth store, as a real sign-in would.
 */

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

export async function mockApi(page: Page, options: MockOptions = {}) {
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

    if (path === '/api/me/permissions') {
      return json(route, { subject: { type: 'user', id: 'u-1' }, permissions });
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
      if (rest === '/scope') {
        const entries =
          plan.uuid === SYSTEMS.scoped
            ? [{ labels: [{ name: 'system', value: 'payments' }] }]
            : [];
        return json(route, { data: { entries, exceptions: [] } });
      }
      if (rest === '/evidence/search') {
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
    }

    return json(route, { errors: { body: `Unmocked ${method} ${path}` } }, 404);
  });
}
