<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { Control } from '@/oscal';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import { plural } from '@/ds/format';
import EvidenceCapsule from '../EvidenceCapsule.vue';
import { useControlTree } from './controlTree';

/**
 * The end of a control row's first line in the Implementation list: open risks, suggestions, how
 * many evidence filters check it, and its evidence results as a capsule (satisfied, unknown and
 * not satisfied counts). Its implementation is on the second
 * line (ControlRowImplementation); the detail is in the control's view.
 */
const props = defineProps<{ control: Control }>();
const tree = useControlTree();

const id = computed(() => props.control.id);
const filterCount = computed(() => tree.filters(id.value).length);
const filterKey = computed(() =>
  tree
    .filters(id.value)
    .map((f) => f.id)
    .sort()
    .join(','),
);
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
    <Text v-if="filterCount" as="span" variant="caption">{{
      plural(filterCount, 'evidence filter')
    }}</Text>
    <EvidenceCapsule
      :control-id="id"
      :ssp-id="tree.sspId()"
      :refresh-key="filterKey"
      quiet
    />
  </Cluster>
</template>
