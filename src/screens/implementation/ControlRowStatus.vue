<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { Control } from '@/oscal';
import ControlEvidenceCounter from '@/views/control-implementations/partials/ControlEvidenceCounter.vue';
import { statuses } from '@/ds/components/StatusBadge/statuses';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import { plural } from '@/ds/format';
import { implementationSummary, partMap } from './controlParts';
import { useControlTree } from './controlTree';

/**
 * The end of a control's row in the Implementation list: open risks, suggestions, how many of its
 * parts are implemented, each component that implements it with its status ("Okta: implemented"),
 * how many evidence filters check it, and its evidence results. The detail is in the control's
 * view.
 */
const props = defineProps<{ control: Control }>();
const tree = useControlTree();

const id = computed(() => props.control.id);
const implementation = computed(() => tree.implementation(id.value));
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
const filterCount = computed(() => tree.filters(id.value).length);
</script>

<template>
  <Cluster gap="3">
    <TextLink
      v-if="tree.riskCount(id)"
      :to="tree.risksLink(id) as RouteLocationRaw"
      >{{ plural(tree.riskCount(id), 'open risk') }} ({{
        tree.riskSeverity(id)
      }})</TextLink
    >
    <Text
      v-if="tree.suggestionsEnabled() && tree.suggestionCount(id)"
      as="span"
      variant="caption"
      >{{ plural(tree.suggestionCount(id), 'suggestion') }}</Text
    >
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
    <Text v-if="filterCount" as="span" variant="caption">{{
      plural(filterCount, 'evidence filter')
    }}</Text>
    <ControlEvidenceCounter :control="control" :ssp-id="tree.sspId()" />
  </Cluster>
</template>
