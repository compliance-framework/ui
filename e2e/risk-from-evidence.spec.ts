import { test, expect } from '@playwright/test';
import {
  created,
  EVIDENCE_ID,
  linked,
  mockApi,
  signIn,
  SYSTEMS,
} from './support/api';

/** Create risk on an evidence record: the risk is created in the system and linked to the stream. */
test('creates a risk from evidence and links it to the evidence stream', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page);
  await mockApi(page);
  await page.goto(`/systems/${SYSTEMS.scoped}/evidence/${EVIDENCE_ID}/risks`);
  await page.getByRole('button', { name: 'Create risk' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill('Restores untested');
  await dialog
    .getByLabel('Description')
    .fill('No restore rehearsal this quarter.');
  await dialog.getByLabel('Statement').fill('Data could be lost.');
  await dialog.getByLabel('Status').selectOption('open');
  await dialog.getByRole('button', { name: 'Create risk' }).click();
  await expect(dialog).toBeHidden();
  expect((created[0] as { title: string }).title).toBe('Restores untested');
  expect(linked[0]).toEqual({
    path: `/api/oscal/system-security-plans/${SYSTEMS.scoped}/risks/risk-9/evidence`,
    body: { 'evidence-id': EVIDENCE_ID },
  });
});
