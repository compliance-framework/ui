<script setup lang="ts">
import { computed } from 'vue';
import type { ByComponent, Risk } from '@/oscal';
import BurgerMenu from '@/components/BurgerMenu.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';
import StatementByComponent from './StatementByComponent.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

defineProps<{
  byComponents: ByComponent[];
  controlId?: string;
  sspRisks: Risk[];
  riskFetchLimit: number;
}>();

const emit = defineEmits<{
  addComponent: [];
  createComponent: [];
  inheritFromSsp: [];
  save: [byComponent: ByComponent];
  delete: [byComponent: ByComponent];
}>();

const { can } = usePermissions();

// PermissionGate can't wrap a MenuItem, so the same double gate the import surfaces use
// (subscribing writes to this SSP) is expressed via the item's `visible` flag.
const menuItems = computed(() => [
  {
    label: 'Add Component',
    command: () => emit('addComponent'),
  },
  {
    label: 'Create New Component',
    command: () => emit('createComponent'),
  },
  {
    label: 'Inherit from SSP',
    visible:
      can(RESOURCES.SSP_EXPORT_OFFERING, ACTIONS.SUBSCRIBE) &&
      can(RESOURCES.SSP, ACTIONS.UPDATE),
    command: () => emit('inheritFromSsp'),
  },
]);
</script>

<template>
  <div class="flex items-center mb-4 gap-x-4">
    <TooltipTitle
      text="Components"
      tooltip-key="control.implementation.components"
      position="bottom"
      underline-class="font-medium text-xl underline decoration-dotted cursor-help"
    />
    <BurgerMenu :items="menuItems" />
  </div>

  <div v-for="(byComponent, index) in byComponents" :key="byComponent.uuid">
    <div
      v-if="index !== 0"
      class="h-0.5 w-full bg-gray-200 dark:bg-slate-700 my-4"
    ></div>
    <StatementByComponent
      :by-component="byComponent"
      :control-id="controlId"
      :ssp-risks="sspRisks"
      :risk-fetch-limit="riskFetchLimit"
      @save="emit('save', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>
