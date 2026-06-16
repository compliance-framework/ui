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

  it('registers one dashboards drawer route for system components', () => {
    const routes = router
      .getRoutes()
      .filter((route) => route.name === 'system-component-dashboards');

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/system/components/dashboards/:componentId');
    expect(
      router.resolve({
        name: 'system-component-dashboards',
        params: { componentId: 'component-1' },
      }).path,
    ).toBe('/system/components/dashboards/component-1');
  });

  it('registers the dashboard suggestions review route behind auth meta', () => {
    const route = router
      .getRoutes()
      .find((route) => route.name === 'dashboards.suggestions');

    expect(route?.path).toBe('/dashboards/suggestions/:sspId');
    expect(route?.meta.requiresAuth).toBe(true);
    expect(
      router.resolve({
        name: 'dashboards.suggestions',
        params: { sspId: 'ssp-1' },
      }).path,
    ).toBe('/dashboards/suggestions/ssp-1');
  });
});
