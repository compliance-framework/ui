<script setup lang="ts">
import { computed } from 'vue';
import { usePermissions } from '@/composables/usePermissions';

// Permission gate for the "hide" mode (BCH-1318): renders its default slot only when the
// current subject may perform (resource, action); otherwise renders the optional #fallback
// slot. Use it for nav entries, whole sections, and page-level action regions.
//
//   <PermissionGate :resource="RESOURCES.SSP" :action="ACTIONS.CREATE">
//     <PrimaryButton @click="create">New SSP</PrimaryButton>
//   </PermissionGate>
//
// For in-page buttons that should stay visible-but-disabled, prefer binding can() directly
// to :disabled with a permissionTooltip rather than wrapping in <PermissionGate>.
const props = defineProps<{
  resource: string;
  action: string;
}>();

const { can } = usePermissions();
const allowed = computed(() => can(props.resource, props.action));
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
