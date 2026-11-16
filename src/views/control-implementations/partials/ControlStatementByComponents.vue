<script setup lang="ts">
/** A statement's components, each with its statement, and a menu to add, create or inherit one. */
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { computed } from 'vue';
import type { ByComponent, Risk } from '@/oscal';
import ByComponentStatement from '@/screens/implementation/ByComponentStatement.vue';
import { useSystemStore } from '@/stores/system';
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
const systemStore = useSystemStore();

// The menu, as design-system entries; inheriting stays hidden without the access it needs.
const actions = computed<MenuEntry[]>(() =>
  menuItems.value
    .filter((item) => item.visible !== false)
    .map((item) => ({ label: item.label, onSelect: item.command })),
);
</script>

<template>
  <Stack gap="3">
    <Cluster justify="between" gap="2">
      <Text as="span" variant="label">Components</Text>
      <Menu label="Component actions" :items="actions" />
    </Cluster>
    <Text v-if="byComponents.length === 0" variant="caption"
      >No components implement this statement yet.</Text
    >
    <ByComponentStatement
      v-for="byComponent in byComponents"
      :key="byComponent.uuid"
      :by-component="byComponent"
      :ssp-id="systemStore.system.securityPlan?.uuid"
      :control-id="controlId"
      :ssp-risks="sspRisks"
      :risk-fetch-limit="riskFetchLimit"
      @save="emit('save', $event)"
      @delete="emit('delete', $event)"
    />
  </Stack>
</template>
