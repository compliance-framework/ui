import { describe, expect, it } from 'vitest';
import router from '@/router';

describe('router', () => {
  it('routes SSP creation to the create view', () => {
    const route = router
      .getRoutes()
      .find((route) => route.name === 'system-security-plans-create');
    const component = route?.components?.default;

    expect(route?.path).toBe('/system-security-plans/create');
    expect(typeof component).toBe('function');
  });

  it('keeps the import surface under the admin authenticated route pattern', () => {
    const route = router
      .getRoutes()
      .find((route) => route.name === 'admin-import');

    expect(route?.path).toBe('/admin/import');
    expect(route?.meta.requiresAuth).toBe(true);
    expect(route?.meta.requiresAdmin).toBeUndefined();
  });
});
