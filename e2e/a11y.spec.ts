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
  '/users',
  '/admin/groups',
  '/parties',
  '/roles',
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
