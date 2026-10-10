import { describe, expect, it } from 'vitest';
import router from '@/router';

describe('diagnostics routes', () => {
  it('configures /admin/notifications as a compatibility redirect', () => {
    const route = router
      .getRoutes()
      .find(
        (route) =>
          route.path === '/admin/notifications' ||
          route.name === 'admin-notifications',
      );

    expect(route?.redirect).toEqual({
      name: 'admin-diagnostics-notifications',
    });
  });
});
