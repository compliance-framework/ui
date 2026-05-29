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
});
