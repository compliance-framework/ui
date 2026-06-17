import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUserStore } from '@/stores/auth';

describe('diagnostics routes', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('redirects /admin/notifications to Diagnostics notifications', async () => {
    const { default: router } = await import('@/router');
    const userStore = useUserStore();
    userStore.isAuthenticated = true;

    await router.push('/admin/notifications');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(
      'admin-diagnostics-notifications',
    );
    expect(router.currentRoute.value.path).toBe(
      '/admin/diagnostics/notifications',
    );
  });
});
