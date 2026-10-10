import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

// Submit gating for V2 SSP editor drawers: create needs ssp:create, edit needs
// ssp:update, as main's SSP forms gate their submit (backlog M1-13). The API
// still enforces; this tells the user up front instead of failing with a 403.
export function useSspSubmitPermission(isEditMode: MaybeRefOrGetter<boolean>) {
  const { can, permissionTooltip } = usePermissions();
  const action = computed(() =>
    toValue(isEditMode) ? ACTIONS.UPDATE : ACTIONS.CREATE,
  );
  const canSubmit = computed(() => can(RESOURCES.SSP, action.value));
  const disabledReason = computed(() =>
    canSubmit.value ? '' : permissionTooltip(RESOURCES.SSP, action.value),
  );

  return { canSubmit, disabledReason };
}
