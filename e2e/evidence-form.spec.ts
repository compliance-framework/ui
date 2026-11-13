import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { created, EVIDENCE_ID, mockApi, signIn } from './support/api';

/** New evidence and Re-submit: validation, the submitted body, and where saving leads. */
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  await mockApi(page);
});

test('shows every missing field on submit, accessibly', async ({ page }) => {
  await page.goto('/evidence/create');
  await page.getByRole('button', { name: 'Create evidence' }).click();
  await expect(page.getByText('Check the highlighted fields')).toBeVisible();
  await expect(page.getByText('Enter a title.').first()).toBeVisible();
  expect(created).toHaveLength(0);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});

test('creates evidence and opens the new record', async ({ page }) => {
  await page.goto('/evidence/create');
  await page.getByLabel('Title').fill('Quarterly restore test');
  await page
    .getByRole('radio', { name: 'Satisfied', exact: true })
    .check({ force: true });
  await page.getByLabel('Start date').fill('2026-11-01');
  await page.getByLabel('End date').fill('2026-11-02');
  await page.getByRole('button', { name: 'Add label' }).click();
  await page.getByLabel('Name').first().fill('provider');
  await page.getByLabel('Value').first().fill('aws');
  await page.getByRole('button', { name: 'Create evidence' }).click();
  await expect(page).toHaveURL(/\/evidence\/ev-9$/);
  const body = created[0] as Record<string, unknown>;
  expect(body).toEqual(
    expect.objectContaining({
      title: 'Quarterly restore test',
      labels: { provider: 'aws' },
      status: { state: 'satisfied', reason: '' },
    }),
  );
});

test('re-submits a record into the same stream with its labels', async ({
  page,
}) => {
  await page.goto(`/evidence/${EVIDENCE_ID}/update`);
  await expect(
    page.getByRole('heading', { name: 'Re-submit evidence' }),
  ).toBeVisible();
  await expect(page.getByText('provider=aws')).toBeVisible();
  await page.getByRole('button', { name: 'Re-submit evidence' }).click();
  await expect(page).toHaveURL(/\/evidence\/ev-9$/);
  expect((created[0] as { uuid: string }).uuid).toBe(EVIDENCE_ID);
});

test('the classic history URL opens the latest record on its History tab', async ({
  page,
}) => {
  await page.goto('/evidence/history/some-stream');
  await expect(page).toHaveURL(new RegExp(`/evidence/${EVIDENCE_ID}/history$`));
});
