import { describe, expect, it } from 'vitest';
import router from '../index';
import { navGroups } from '@/ds/templates/AppShell/nav';

function scoped(name: string): boolean {
  return router
    .resolve({ name })
    .matched.some((record) => record.meta.activeSystemScoped);
}

// Every This System page now takes its system from the URL (/systems/:systemId/...), so links
// are shareable and a system switch changes the URL. Classic pages that still read the current
// system from the store carry `activeSystemScoped`, and the shell remounts them on a switch.
describe('system-scoped routes', () => {
  const systemItems = navGroups.find((group) => group.id === 'system')!.items;

  it.each(systemItems.map((item) => item.route))(
    '%s takes its system from the URL',
    (name) => {
      const record = router.getRoutes().find((r) => r.name === name);
      expect(record?.path).toContain(':systemId');
    },
  );

  it.each([
    'evidence:index',
    'admin-risks',
    'lineage',
    'catalog-list',
    'profile-list',
    'dashboards',
  ])('%s ignores system switches', (name) => {
    expect(scoped(name)).toBe(false);
  });
});
