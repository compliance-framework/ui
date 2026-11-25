<script setup lang="ts">
import { computed } from 'vue';
import type { Control } from '@/oscal';
import { statuses } from '@/ds/components/StatusBadge/statuses';
import Pill from '@/ds/components/Pill/Pill.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import {
  implementationSummary,
  implementationTone,
  partMap,
} from './controlParts';
import { useControlTree } from './controlTree';

/**
 * The end of a control row's second line in the Implementation list: how many of its component
 * implementations have each status ("5 implemented", "2 partial"), as pills (green when
 * implemented, amber when partial, blue otherwise, grey without a status). Nothing when no
 * component implements it. The list summarises; the control's view has the detail.
 */
const props = defineProps<{ control: Control }>();
const tree = useControlTree();

const counts = computed(
  () =>
    implementationSummary(
      partMap(props.control, tree.implementation(props.control.id)),
    ).statusCounts,
);
</script>

<template>
  <Cluster v-if="counts.length" gap="1" align="center">
    <Pill
      v-for="{ status, count } in counts"
      :key="status"
      :label="`${count} ${statuses[status].label.toLowerCase()}`"
      :tone="status === 'no-status' ? 'neutral' : implementationTone(status)"
    />
  </Cluster>
</template>
