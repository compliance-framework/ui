import { describe, expect, it } from 'vitest';
import router from '../index';

function scoped(name: string): boolean {
  return router
    .resolve({ name })
    .matched.some((record) => record.meta.activeSystemScoped);
}

// The layout remounts only `activeSystemScoped` pages when the active system changes, so
// the flag must match the nav's This System section (minus Evidence, which is global).
describe('activeSystemScoped routes', () => {
  it.each([
    'controls:index',
    'compliance:index',
    'risks:index',
    'workflow-instances:index',
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
