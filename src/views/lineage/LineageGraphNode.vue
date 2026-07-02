<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import LineageNodeRow from '@/components/lineage/LineageNodeRow.vue';
import { heatStyle } from '@/components/lineage/heatScale';
import { NODE_WIDTH } from './layout';
import type { LineageNode } from '@/composables/useLineage/types';

// Vue Flow passes the node's `data` object through as a prop.
const props = defineProps<{
  data: { node: LineageNode; expanded?: boolean };
}>();

const heat = computed(() => heatStyle(props.data.node.risk.openScoreSum));
const canExpand = computed(
  () => props.data.node.hasChildren && !props.data.expanded,
);
</script>

<template>
  <div
    class="rounded-lg border-l-4 border border-surface-200 shadow-sm dark:border-surface-700"
    :class="heat.nodeClass"
    :style="{ width: NODE_WIDTH + 'px' }"
  >
    <Handle type="target" :position="Position.Top" />
    <div class="px-2">
      <LineageNodeRow :node="data.node" compact />
    </div>
    <Handle type="source" :position="Position.Bottom" />
    <span
      v-if="canExpand"
      class="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface-700 px-1.5 text-[10px] font-semibold text-white dark:bg-surface-200 dark:text-surface-900"
    >
      +{{ data.node.childrenCount || '' }}
    </span>
  </div>
</template>
