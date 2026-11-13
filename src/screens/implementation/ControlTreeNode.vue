<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { TreeNode } from '@/composables/useCatalogTree';
import type { Control } from '@/oscal';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';
import ControlEvidenceCounter from '@/views/control-implementations/partials/ControlEvidenceCounter.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import Button from '@/ds/components/Button/Button.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import { useControlTree } from './controlTree';

/**
 * One node of the Implementation tree: a group (a disclosure holding its groups and controls) or
 * a control with its counts, risk and suggestion markers, evidence, and its implementation
 * editor. The editor is the classic one, embedded as a legacy island until it is rebuilt.
 */
defineOptions({ name: 'ControlTreeNode' });
const props = defineProps<{ node: TreeNode }>();
const tree = useControlTree();

const control = computed(() => props.node.data as Control);
const id = computed(() => control.value.id);

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
    <Stack gap="3" as="ul">
      <li v-for="child in visibleChildren" :key="child.key">
        <ControlTreeNode :node="child" />
      </li>
    </Stack>
  </Disclosure>

  <Stack v-else gap="2">
    <Cluster gap="2">
      <Tag :label="id" />
      <Text as="span" variant="label">{{ control.title }}</Text>
      <Tag v-if="tree.highlighted(id)" label="Just changed" />
    </Cluster>
    <Cluster gap="2">
      <Text as="span" variant="caption">{{
        `${tree.byComponentCount(id)} component statement${tree.byComponentCount(id) === 1 ? '' : 's'}`
      }}</Text>
      <TextLink
        v-if="tree.riskCount(id)"
        :to="tree.risksLink(id) as RouteLocationRaw"
        >{{ tree.riskCount(id) }} open risk{{
          tree.riskCount(id) === 1 ? '' : 's'
        }}
        ({{ tree.riskSeverity(id) }})</TextLink
      >
      <Text
        v-if="tree.suggestionsEnabled() && tree.suggestionCount(id)"
        as="span"
        variant="caption"
        >{{ tree.suggestionCount(id) }} suggestion{{
          tree.suggestionCount(id) === 1 ? '' : 's'
        }}</Text
      >
      <Button
        size="sm"
        icon="next"
        :disabled-reason="
          tree.implementation(id) || tree.suggestionCount(id)
            ? undefined
            : 'No implementation or suggestions yet.'
        "
        @click="tree.openDrawer(id)"
        >Details</Button
      >
    </Cluster>
    <LegacyPage>
      <ControlEvidenceCounter :control="control" :ssp-id="tree.sspId()" />
      <IndexControlImplementation
        :control="control"
        :implementation="tree.implementation(id)"
        @exported="tree.onExported"
        @imported="tree.onImported"
      />
    </LegacyPage>
  </Stack>
</template>
