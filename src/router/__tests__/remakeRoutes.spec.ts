import { describe, expect, it, vi } from 'vitest';
import router from '../index';

vi.mock('@/stores/auth', () => ({
  useUserStore: () => ({ isAuthenticated: true }),
}));
vi.mock('@/stores/permissions', () => ({
  usePermissionsStore: () => ({ can: () => true }),
}));

describe('remake route integration', () => {
  it.each([
    'system-security-plan-implementation',
    'system-security-plan-components',
    'system-security-plan-risks',
    'system-security-plan-export-offerings',
    'system-security-plan-leverage',
    'system-security-plan-inherited-capabilities',
    'system:components',
    'system:risks',
    'system:compliance',
    'system:json',
    'slack-link-callback',
  ])('allows navigation to %s through the route guard', async (name) => {
    await router.push({
      name,
      params: name.startsWith('system-security-plan-') ? { id: 'ssp-1' } : {},
    });
    expect(router.currentRoute.value.name).toBe(name);
  });
});
