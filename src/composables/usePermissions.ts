import { computed } from 'vue';
import { usePermissionsStore } from '@/stores/permissions';
import { RESOURCES, ACTIONS, permissionTooltip } from '@/constants/permissions';

// Ergonomic access to the permission map for templates and components.
//
//   const { can } = usePermissions();
//   <PrimaryButton :disabled="!can(RESOURCES.RISK, ACTIONS.CREATE)" />
//
// or the reactive convenience computeds for common gates.
export function usePermissions() {
  const store = usePermissionsStore();

  // Stable function reference; reads the store getter (reactive) at call time.
  const can = (resource: string, action: string): boolean =>
    store.can(resource, action);

  const canManageAdmin = computed(() =>
    store.can(RESOURCES.ADMIN, ACTIONS.MANAGE),
  );

  return {
    can,
    canManageAdmin,
    hydrate: () => store.hydrate(),
    permissionTooltip,
    RESOURCES,
    ACTIONS,
  };
}
