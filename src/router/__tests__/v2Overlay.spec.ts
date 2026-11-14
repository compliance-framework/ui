import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import router from '../v2';
import { applyV2Routes, V2_COMPONENT_SWAPS, V2_ROUTE_OVERRIDES } from '../v2';

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

  it.each(['ui-v2:tokens', 'ui-v2:components'])(
    'restricts the %s sandbox to admins',
    (name) => {
      const record = router.getRoutes().find((r) => r.name === name);
      expect(record?.meta.permission).toEqual({
        resource: 'admin',
        action: 'manage',
      });
    },
  );

  it('mounts the V2 shell on the app root without tagging it v2', () => {
    const app = router.getRoutes().find((r) => r.name === 'app');
    expect(app?.components?.default).toBe(V2_COMPONENT_SWAPS.app);
    expect(app?.meta.uiVersion).toBeUndefined();
  });

  it('redirects every /system child', () => {
    const system = router.getRoutes().find((r) => r.name === 'system');
    const children = (system?.children ?? []).map((child) => child.name);

    expect(children.length).toBeGreaterThan(0);
    for (const name of children) {
      const record = router.getRoutes().find((r) => r.name === name);
      expect(record?.redirect, String(name)).toBeTypeOf('function');
    }
  });

  it('fails loudly when main adds an unmapped /system child', () => {
    const names = [
      ...Object.keys(V2_ROUTE_OVERRIDES),
      ...Object.keys(V2_COMPONENT_SWAPS),
    ].filter((name) => name !== 'app' && name !== 'system');
    const bare = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'app',
          component: {},
          children: [
            ...names.map((name) => ({ path: name, name, component: {} })),
            {
              path: 'system',
              name: 'system',
              component: {},
              children: [{ path: 'new', name: 'system:new', component: {} }],
            },
          ],
        },
      ],
    });
    expect(() => applyV2Routes(bare)).toThrow(/system:new/);
  });

  it('fails loudly when main renames a targeted route', () => {
    const bare = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'app', component: {}, children: [] }],
    });
    expect(() => applyV2Routes(bare)).toThrow(/missing from src\/router/);
  });
});
