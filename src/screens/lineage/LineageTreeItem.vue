<script setup lang="ts">
/**
 * One node of the Compliance Map tree: its summary, a Details button (a risk or evidence item
 * opens its own page; anything else opens the drawer) and, when it has children, a toggle that
 * loads them the first time it opens.
 */
import { computed } from 'vue';
import type { LineageTreeNode } from '@/composables/useLineage/types';
import Button from '@/ds/components/Button/Button.vue';
import TreeItem from '@/ds/components/TreeItem/TreeItem.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import LineageNodeSummary from './LineageNodeSummary.vue';
import { useLineageTree } from './lineageTree';

defineOptions({ name: 'LineageTreeItem' });
const props = defineProps<{ node: LineageTreeNode }>();
const tree = useLineageTree();

const open = computed({
  get: () => tree.isOpen(props.node.key),
  set: (value: boolean) => tree.setOpen(props.node, value),
});
</script>

<template>
  <TreeItem
    v-model:open="open"
    :label="node.data.title"
    :expandable="!node.leaf"
    :loading="node.loading"
  >
    <Cluster justify="between" gap="3" align="start">
      <LineageNodeSummary :node="node.data" />
      <Button
        size="sm"
        icon="details"
        :aria-label="`Details for ${node.data.title}`"
        @click="tree.select(node)"
        >Details</Button
      >
    </Cluster>
    <template #children>
      <LineageTreeItem
        v-for="child in node.children ?? []"
        :key="child.key"
        :node="child"
      />
    </template>
  </TreeItem>
</template>
