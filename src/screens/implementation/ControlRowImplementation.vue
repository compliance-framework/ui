<script setup lang="ts">
import { computed } from 'vue';
import type { Control } from '@/oscal';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import StatusPill from '@/ds/components/StatusPill/StatusPill.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Text from '@/ds/components/Text/Text.vue';
import {
  implementationSummary,
  implementationTone,
  partMap,
} from './controlParts';
import { useControlTree } from './controlTree';

/**
 * The end of a control row's second line in the Implementation list: how many of its parts are
 * implemented and each component that implements it with its status as a pill ("Okta:
 * [Implemented]"; green when implemented, amber when partial, blue otherwise), or that nothing
 * does yet.
 */
const props = defineProps<{ control: Control }>();
const tree = useControlTree();

const implementation = computed(() => tree.implementation(props.control.id));
const summary = computed(() =>
  implementationSummary(partMap(props.control, implementation.value)),
);
const partsText = computed(() => {
  const { partsCovered, partsTotal } = summary.value;
  return partsTotal > 1 && partsCovered
    ? `${partsCovered} of ${partsTotal} parts`
    : '';
});
/** Each component's name and its statuses across the parts ("no status" when it has none). */
const components = computed(() =>
  summary.value.components.map(({ uuid, statuses: found }) => ({
    uuid,
    name: tree.component(uuid)?.title ?? 'Unknown component',
    statuses: found.length ? found : (['no-status'] as StatusKey[]),
  })),
);
</script>

<template>
  <Text v-if="!implementation" as="span" variant="caption"
    >Not implemented yet</Text
  >
  <Text v-else-if="!components.length" as="span" variant="caption"
    >No component implements it yet</Text
  >
  <template v-else>
    <Text v-if="partsText" as="span" variant="caption">{{ partsText }}</Text>
    <Cluster
      v-for="component in components"
      :key="component.uuid"
      gap="1"
      align="center"
    >
      <Text as="span" variant="caption">{{ component.name }}:</Text>
      <StatusPill
        v-for="status in component.statuses"
        :key="status"
        :status="status"
        :tone="implementationTone(status)"
      />
    </Cluster>
  </template>
</template>
