<script setup lang="ts">
import { computed } from 'vue';
import type { Control } from '@/oscal';
import { statuses } from '@/ds/components/StatusBadge/statuses';
import Text from '@/ds/components/Text/Text.vue';
import { implementationSummary, partMap } from './controlParts';
import { useControlTree } from './controlTree';

/**
 * The end of a control row's second line in the Implementation list: how many of its parts are
 * implemented and each component that implements it with its status ("Okta: implemented"), or
 * that nothing does yet.
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
/** "Okta: implemented", or "Okta: implemented, partial" when its parts differ. */
const componentTexts = computed(() =>
  summary.value.components.map(({ uuid, statuses: found }) => ({
    uuid,
    text: `${tree.component(uuid)?.title ?? 'Unknown component'}: ${
      found.length
        ? found.map((s) => statuses[s].label.toLowerCase()).join(', ')
        : 'no status'
    }`,
  })),
);
</script>

<template>
  <Text v-if="!implementation" as="span" variant="caption"
    >Not implemented yet</Text
  >
  <Text v-else-if="!componentTexts.length" as="span" variant="caption"
    >No component implements it yet</Text
  >
  <template v-else>
    <Text v-if="partsText" as="span" variant="caption">{{ partsText }}</Text>
    <Text
      v-for="component in componentTexts"
      :key="component.uuid"
      as="span"
      variant="caption"
      >{{ component.text }}</Text
    >
  </template>
</template>
