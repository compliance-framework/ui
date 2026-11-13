import { test, expect } from '@playwright/test';
import { EVIDENCE_ID, mockApi, signIn, SYSTEMS } from './support/api';

/**
 * Reflow and keyboard checks for the redesigned shell: no sideways page scrolling down to 320 CSS
 * pixels (WCAG 1.4.10), the skip link, menus that close on Escape and return focus, and every
 * action reachable at 1280×800 with the navigation expanded.
 */
const routes = [
  '/evidence',
  '/systems',
  `/systems/${SYSTEMS.scoped}/evidence`,
  `/systems/${SYSTEMS.scoped}/evidence/${EVIDENCE_ID}/signature`,
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  await mockApi(page);
});

for (const width of [320, 1024, 1440]) {
  test(`no document overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const url of routes) {
      await page.goto(url);
      await page.locator('main h1').first().waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${url} at ${width}px`).toBeLessThanOrEqual(0);
    }
  });
}

test('the skip link is the first tab stop and moves focus to the content', async ({
  page,
}) => {
  await page.goto('/systems');
  await page.locator('main h1').waitFor();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('menus close on Escape and return focus to their trigger', async ({
  page,
}) => {
  await page.goto('/systems');
  const trigger = page.getByRole('button', { name: /^Actions for / }).first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the system switcher opens from the keyboard and switches system', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/systems/${SYSTEMS.scoped}/evidence`);
  await page.locator('main h1').waitFor();
  await page.locator('.switcher__trigger').first().focus();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Customer');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(
    new RegExp(`/systems/${SYSTEMS.unscoped}/evidence`),
  );
});

test('every action is reachable at 1280×800 with the navigation expanded', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => localStorage.setItem('ccf-nav', 'expanded'));
  for (const url of routes) {
    await page.goto(url);
    await page.locator('main h1').waitFor();
    for (const button of await page
      .locator('main button, main a[href]')
      .all()) {
      await button.scrollIntoViewIfNeeded();
      await expect(
        button,
        `${url}: ${await button.textContent()}`,
      ).toBeInViewport();
    }
  }
});
