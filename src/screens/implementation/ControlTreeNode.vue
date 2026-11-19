<script setup lang="ts">
import { computed } from 'vue';
import type { TreeNode } from '@/composables/useCatalogTree';
import type { Control } from '@/oscal';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import LinkedColumnsHeader from '@/ds/components/LinkedColumns/LinkedColumnsHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ControlLinkRow from './ControlLinkRow.vue';
import { LINK_COLUMNS, useControlTree } from './controlTree';

/**
 * One node of the Implementation tree: a group (a disclosure holding its groups and controls,
 * with the column labels over its controls) or a control (ControlLinkRow).
 */
defineOptions({ name: 'ControlTreeNode' });
const props = defineProps<{ node: TreeNode }>();
const tree = useControlTree();

/** Whether this node, or anything under it, matches the search. */
function matches(node: TreeNode): boolean {
  const q = tree.query().toLowerCase();
  if (!q) return true;
  if (node.type === 'control') {
    const c = node.data as Control;
    return `${c.id} ${c.title}`.toLowerCase().includes(q);
  }
  return (node.children ?? []).some(matches);
}
const visibleChildren = computed(() =>
  (props.node.children ?? []).filter(matches),
);
const hasControls = computed(() =>
  visibleChildren.value.some((child) => child.type === 'control'),
);
const groupOpen = computed({
  get: () => Boolean(tree.query()) || tree.isOpen(props.node.key),
  set: (open: boolean) => tree.setOpen(props.node.key, open),
});
</script>

<template>
  <Disclosure
    v-if="node.type !== 'control'"
    v-model:open="groupOpen"
    :label="`${node.data.title} (${visibleChildren.length})`"
  >
    <Stack gap="3">
      <LinkedColumnsHeader v-if="hasControls" :columns="LINK_COLUMNS" />
      <Stack gap="6" as="ul">
        <li v-for="child in visibleChildren" :key="child.key">
          <ControlTreeNode :node="child" />
        </li>
      </Stack>
    </Stack>
  </Disclosure>

  <ControlLinkRow v-else :control="node.data as Control" />
</template>
