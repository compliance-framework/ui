import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../v2';

const systemStore = vi.hoisted(() => ({
  system: {} as { securityPlan?: { uuid: string } },
}));
vi.mock('@/stores/system', () => ({ useSystemStore: () => systemStore }));

vi.mock('@/stores/auth', () => ({
  useUserStore: () => ({ isAuthenticated: true }),
}));
vi.mock('@/stores/permissions', () => ({
  usePermissionsStore: () => ({ can: () => true }),
}));

describe('remake route integration', () => {
  it.each([
    'system-security-plan-implementation',
    'system-security-plan-risks',
    'system-security-plan-export-offerings',
    'system-security-plan-leverage',
    'system-security-plan-inherited-capabilities',
    'slack-link-callback',
  ])('allows navigation to %s through the route guard', async (name) => {
    await router.push({
      name,
      params: name.startsWith('system-security-plan-') ? { id: 'ssp-1' } : {},
    });
    expect(router.currentRoute.value.name).toBe(name);
  });

  it.each(['users', 'components', 'authorizations'])(
    'redirects the duplicate SSP %s tab to its Implementation section',
    async (section) => {
      await router.push({
        name: `system-security-plan-${section}`,
        params: { id: 'ssp-1' },
      });
      expect(router.currentRoute.value.name).toBe(
        'system-security-plan-implementation',
      );
      expect(router.currentRoute.value.params.id).toBe('ssp-1');
      expect(router.currentRoute.value.query.section).toBe(section);
    },
  );

  describe('/system', () => {
    beforeEach(async () => {
      systemStore.system = {};
      await router.push('/');
    });

    it.each([
      ['/system', 'system-security-plan-overview', undefined],
      ['/system/compliance', 'system-security-plan-compliance', undefined],
      ['/system/json', 'system-security-plan-json', undefined],
      ['/system/users', 'system-security-plan-implementation', 'users'],
      [
        '/system/components/dashboards/c-1',
        'system-security-plan-implementation',
        'components',
      ],
    ])('redirects %s to the active SSP (%s)', async (path, name, section) => {
      systemStore.system = { securityPlan: { uuid: 'ssp-active' } };
      await router.push(path);

      expect(router.currentRoute.value.name).toBe(name);
      expect(router.currentRoute.value.params.id).toBe('ssp-active');
      expect(router.currentRoute.value.query.section).toBe(section);
    });

    it('redirects navigation by the parent route name', async () => {
      systemStore.system = { securityPlan: { uuid: 'ssp-active' } };
      await router.push({ name: 'system' });

      expect(router.currentRoute.value.name).toBe(
        'system-security-plan-overview',
      );
    });

    it('sends you to the library to pick an SSP when none is active', async () => {
      await router.push('/system/risks');

      expect(router.currentRoute.value.name).toBe('system-security-plans');
      expect(router.currentRoute.value.query.next).toBe('/system/risks');
    });
  });
});
