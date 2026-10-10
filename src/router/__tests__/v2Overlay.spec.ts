import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import router from '../v2';
import { applyV2Routes, V2_ROUTE_OVERRIDES } from '../v2';

vi.mock('@/stores/auth', () => ({
  useUserStore: () => ({ isAuthenticated: true }),
}));
vi.mock('@/stores/permissions', () => ({
  usePermissionsStore: () => ({ can: () => true }),
}));

describe('V2 route overlay', () => {
  it.each(Object.keys(V2_ROUTE_OVERRIDES))('tags %s as v2', (name) => {
    expect(
      router.resolve({
        name,
        params: { id: 'x', componentId: 'x', riskId: 'x' },
      }).name,
    ).toBe(name);
    const record = router.getRoutes().find((r) => r.name === name);
    expect(record?.meta.uiVersion).toBe('v2');
  });

  it('swaps the component when an override provides one', () => {
    const login = router.getRoutes().find((r) => r.name === 'login');
    expect(login?.components?.default).toBe(
      V2_ROUTE_OVERRIDES.login!.component,
    );
  });

  it('keeps main meta alongside the v2 tag', () => {
    const auth = router.getRoutes().find((r) => r.name === 'auth');
    expect(auth?.meta).toMatchObject({
      requiresAuth: false,
      hideThemeToggle: true,
      uiVersion: 'v2',
    });
  });

  it.each(['ui-v2:tokens', 'ui-v2:components', 'not-found'])(
    'adds the V2-only route %s',
    (name) => {
      expect(router.hasRoute(name)).toBe(true);
    },
  );

  it('fails loudly when main renames a targeted route', () => {
    const bare = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'app', component: {}, children: [] }],
    });
    expect(() => applyV2Routes(bare)).toThrow(/missing from src\/router/);
  });
});
