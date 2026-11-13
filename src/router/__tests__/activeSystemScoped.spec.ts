import { describe, expect, it } from 'vitest';
import router from '../index';

function scoped(name: string): boolean {
  return router
    .resolve({ name })
    .matched.some((record) => record.meta.activeSystemScoped);
}

// The shell remounts only `activeSystemScoped` pages when the active system changes, so the
// flag must match the nav's classic This System pages. Migrated system pages take the system
// from their URL (/systems/:systemId/...) instead, and their classic names only redirect.
describe('activeSystemScoped routes', () => {
  it.each([
    'controls:index',
    'risks:index',
    'system:overview',
    'system:components',
    'system:diagrams',
  ])('%s follows the active system', (name) => {
    expect(scoped(name)).toBe(true);
  });

  it.each([
    'evidence:index',
    'admin-risks',
    'lineage',
    'catalog-list',
    'profile-list',
    'dashboards',
    'system-security-plans',
  ])('%s ignores system switches', (name) => {
    expect(scoped(name)).toBe(false);
  });
});
