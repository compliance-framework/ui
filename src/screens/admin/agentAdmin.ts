import { computed, ref } from 'vue';
import { usePermissions } from '@/composables/usePermissions';

/**
 * Whether the user administers agents (registration, keys, editing). `can()` is optimistic until
 * /me/permissions hydrates, so this waits for it: a non-admin never sees admin controls flash or
 * sends the admin-only keys request (R40). If hydration fails, the optimistic answer stands; the
 * API remains the real gate.
 */
export function useAgentAdmin() {
  const { canManageAdmin, loaded, hydrate } = usePermissions();
  const ready = ref(loaded.value);
  if (!ready.value) {
    Promise.resolve(hydrate())
      .catch(() => undefined)
      .finally(() => {
        ready.value = true;
      });
  }
  return {
    ready,
    isAdmin: computed(() => ready.value && canManageAdmin.value),
  };
}
