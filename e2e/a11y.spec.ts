import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  EVIDENCE_ID,
  mockApi,
  signIn,
  SYSTEMS,
  type ApiState,
} from './support/api';

/**
 * axe-core (WCAG 2.2 A/AA plus best practice) on every redesigned route, in light and dark, in
 * each data state, and with each menu, popover and drawer open.
 */
const routes = [
  '/evidence',
  '/evidence/create',
  `/evidence/${EVIDENCE_ID}/update`,
  '/systems',
  '/catalogs',
  '/catalogs/cat-1/control/ac-2/evidence',
  '/users',
  '/admin/groups',
  '/parties',
  '/roles',
  '/workflows',
  '/admin/risks',
  '/poam-items',
  '/admin/ssp-templates',
  '/dashboards',
  '/my-tasks',
  '/component-definitions/create',
  '/profiles/create',
  '/catalogs/new',
  '/control-links',
  '/control-links?view=catalog',
  '/control-links/new',
  '/system-security-plans/create',
  '/assessment-plans/create',
  '/assessment-results/create',
  '/plan-of-action-and-milestones/create',
  '/about',
  '/profiles/build-props',
  ...['', '/components', '/capabilities', '/back-matter'].map(
    (tab) => `/component-definitions/cd-1${tab}`,
  ),
  ...['', '/tasks'].map((tab) => `/assessment-plans/ap-1${tab}`),
  ...['', '/results'].map((tab) => `/assessment-results/ar-1${tab}`),
  ...[
    '',
    '/poam-items',
    '/local-definitions',
    '/observations',
    '/risks',
    '/findings',
    '/back-matter',
  ].map((tab) => `/plan-of-action-and-milestones/poam-1${tab}`),
  '/preferences',
  '/profiles',
  '/component-definitions',
  '/assessment-plans',
  '/assessment-results',
  '/plan-of-action-and-milestones',
  `/systems/${SYSTEMS.scoped}/evidence`,
  `/systems/${SYSTEMS.scoped}/compliance`,
  `/systems/${SYSTEMS.scoped}/workflows`,
  `/systems/${SYSTEMS.scoped}/risks`,
  `/systems/${SYSTEMS.scoped}/risks/register`,
  `/systems/${SYSTEMS.unscoped}/evidence`,
  ...[
    'characteristics',
    'components',
    'scope',
    'system-implementation',
    'users',
    'authorizations',
    'export-offerings',
    'leverage',
    'inherited-capabilities',
  ].map((section) => `/systems/${SYSTEMS.scoped}/configure/${section}`),
  `/systems/${SYSTEMS.missing}/evidence`,
];
const record = `/systems/${SYSTEMS.scoped}/evidence/${EVIDENCE_ID}`;
const recordTabs = [
  '',
  '/metadata',
  '/risks',
  '/media',
  '/signature',
  '/history',
];
const themes = ['light', 'dark'] as const;
const states: ApiState[] = ['ready', 'empty', 'error', 'loading'];

async function axe(
  page: Page,
  context: string,
  options: { menuOpen?: boolean } = {},
): Promise<string[]> {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ]);
  // Menus and popovers are portalled to <body>, outside the landmarks, by design. "region" is a
  // best-practice rule, not a WCAG criterion, so it is skipped only while one is open.
  if (options.menuOpen) builder = builder.disableRules(['region']);
  const result = await builder.analyze();
  return result.violations.map(
    (v) =>
      `${context} :: ${v.id} (${v.impact}) ${v.help} → ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(' | ')}`,
  );
}

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator('main h1').first().waitFor();
}

test.beforeEach(async ({ page }) => {
  // Reduced motion makes transitions instant, so axe never measures a half-faded element.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const guestRoutes = [
  '/auth/login',
  '/auth/login?error=session_expired',
  '/auth/forgot-password',
  '/auth/password-reset?token=not-a-token',
];

for (const theme of themes) {
  test(`axe: signed-out pages (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await mockApi(page);
    // A sign-in banner, as an administrator can configure.
    await page.route('**/config.json', (route) =>
      route.fulfill({
        json: {
          API_URL: '',
          LOGIN_BANNER: 'Maintenance on Saturday from 02:00 UTC.',
          LOGIN_BANNER_SEVERITY: 'warn',
        },
      }),
    );
    const violations: string[] = [];
    for (const url of guestRoutes) {
      await open(page, url);
      violations.push(...(await axe(page, `${theme} ${url}`)));
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
}

for (const theme of themes) {
  for (const state of states) {
    test(`axe: every route, ${state} (${theme})`, async ({ page }) => {
      test.setTimeout(routes.length * 5_000); // one axe pass per route
      await signIn(page, theme);
      await mockApi(page, { lists: state });
      const violations: string[] = [];
      for (const url of routes) {
        await open(page, url);
        violations.push(...(await axe(page, `${theme} ${state} ${url}`)));
      }
      expect(violations, violations.join('\n')).toEqual([]);
    });
  }

  test(`axe: a toast on screen (${theme})`, async ({ page }) => {
    await signIn(page, theme);
    await mockApi(page);
    await open(page, '/catalogs');
    await page
      .getByRole('button', { name: /^Actions for / })
      .first()
      .click();
    // The activate endpoint isn't mocked, so this raises an error toast.
    await page.getByRole('menuitem', { name: /activate/i }).click();
    await page
      .getByRole('alert')
      .getByText(/wasn't/)
      .waitFor();
    const violations = await axe(page, `${theme} toast`);
    expect(violations, violations.join('\n')).toEqual([]);
  });

  test(`axe: menus and popovers open (${theme})`, async ({ page }) => {
    await signIn(page, theme);
    await mockApi(page);
    const violations: string[] = [];

    await open(page, '/systems');
    await page
      .getByRole('button', { name: /^Actions for / })
      .first()
      .click();
    await page.getByRole('menu').waitFor();
    violations.push(
      ...(await axe(page, `${theme} row menu`, { menuOpen: true })),
    );
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Account menu/ }).click();
    await page.getByRole('menu').waitFor();
    violations.push(
      ...(await axe(page, `${theme} account menu`, { menuOpen: true })),
    );
    await page.keyboard.press('Escape');

    await open(page, `/systems/${SYSTEMS.scoped}/evidence`);
    await page.getByRole('button', { name: 'Subject' }).click();
    await page.getByRole('button', { name: 'Columns' }).click();
    await page.getByRole('button', { name: 'Show as table' }).first().click();
    violations.push(
      ...(await axe(page, `${theme} evidence filters and chart table open`)),
    );

    await open(page, `/systems/${SYSTEMS.scoped}/workflows`);
    await page.getByRole('button', { name: 'New instance' }).first().click();
    await page.getByRole('dialog').waitFor();
    violations.push(...(await axe(page, `${theme} new instance dialog`)));
    await page.keyboard.press('Escape');

    await open(page, `/systems/${SYSTEMS.scoped}/risks/register`);
    await page.getByRole('button', { name: 'New risk' }).first().click();
    await page.getByRole('dialog').waitFor();
    violations.push(...(await axe(page, `${theme} new risk dialog`)));
    await page.keyboard.press('Escape');

    await open(page, `/systems/${SYSTEMS.scoped}/evidence`);
    await page.locator('.switcher__trigger').first().click();
    await page.getByRole('listbox', { name: 'Systems' }).waitFor();
    violations.push(
      ...(await axe(page, `${theme} system switcher`, { menuOpen: true })),
    );

    expect(violations, violations.join('\n')).toEqual([]);
  });

  test(`axe: every evidence record tab (${theme})`, async ({ page }) => {
    await signIn(page, theme);
    await mockApi(page);
    const violations: string[] = [];
    for (const tab of recordTabs) {
      await open(page, `${record}${tab}`);
      if (tab === '/media')
        await page.getByRole('button', { name: 'Show restore.log' }).click();
      if (tab === '/signature') {
        await page.getByRole('button', { name: 'Verify' }).click();
        await page.getByText('The signature is not valid').waitFor();
      }
      violations.push(
        ...(await axe(page, `${theme} record${tab || ' overview'}`)),
      );
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });

  test(`axe: navigation drawer open on a phone (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, theme);
    await mockApi(page);
    await open(page, `/systems/${SYSTEMS.scoped}/evidence`);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('dialog').waitFor();
    const violations = await axe(page, `${theme} nav drawer`);
    expect(violations, violations.join('\n')).toEqual([]);
  });
}
