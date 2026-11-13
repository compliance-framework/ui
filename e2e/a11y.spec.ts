import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi, signIn, SYSTEMS, type ApiState } from './support/api';

/**
 * axe-core (WCAG 2.2 A/AA plus best practice) on every redesigned route, in light and dark, in
 * each data state, and with each menu, popover and drawer open.
 */
const routes = [
  '/next/systems',
  `/next/systems/${SYSTEMS.scoped}/evidence`,
  `/next/systems/${SYSTEMS.unscoped}/evidence`,
  `/next/systems/${SYSTEMS.missing}/evidence`,
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

    await open(page, '/next/systems');
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

    await open(page, `/next/systems/${SYSTEMS.scoped}/evidence`);
    await page.locator('.switcher__trigger').first().click();
    await page.getByRole('listbox', { name: 'Systems' }).waitFor();
    violations.push(
      ...(await axe(page, `${theme} system switcher`, { menuOpen: true })),
    );

    expect(violations, violations.join('\n')).toEqual([]);
  });

  test(`axe: navigation drawer open on a phone (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, theme);
    await mockApi(page);
    await open(page, `/next/systems/${SYSTEMS.scoped}/evidence`);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('dialog').waitFor();
    const violations = await axe(page, `${theme} nav drawer`);
    expect(violations, violations.join('\n')).toEqual([]);
  });
}
