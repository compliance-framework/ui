<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { Control } from '@/oscal';
import ControlEvidenceCounter from '@/views/control-implementations/partials/ControlEvidenceCounter.vue';
import LinkedColumns from '@/ds/components/LinkedColumns/LinkedColumns.vue';
import { countsSentence } from '@/ds/components/StatusBadge/statuses';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import { plural } from '@/ds/format';
import { implementationSummary, partMap } from './controlParts';
import { LINK_COLUMNS, useControlTree } from './controlTree';

/**
 * One control in the Implementation list, as three linked boxes that summarise it: the control
 * (ID and title, which opens the control's view; risks and suggestions), its implementation (how
 * much of it, by status, and by which components) and its evidence (the counts and the filters).
 * The full text is in the control's view, which the title, or a click anywhere on the row, opens.
 */
const props = defineProps<{ control: Control }>();
const tree = useControlTree();

const id = computed(() => props.control.id);
const implementation = computed(() => tree.implementation(id.value));
const summary = computed(() =>
  implementationSummary(partMap(props.control, implementation.value)),
);
const statusText = computed(() =>
  [
    countsSentence(summary.value.statusCounts),
    summary.value.noStatus ? `${summary.value.noStatus} without a status` : '',
  ]
    .filter(Boolean)
    .join(', '),
);
const componentNames = computed(() =>
  summary.value.componentUuids
    .map(
      (uuid) => tree.component(uuid)?.title ?? 'A component not in this plan',
    )
    .join(', '),
);
const filters = computed(() => tree.filters(id.value));
</script>

<template>
  <LinkedColumns :columns="LINK_COLUMNS" :to="tree.controlLink(id)">
    <template #control>
      <Cluster gap="2">
        <Tag :label="id" code />
        <TextLink :to="tree.controlLink(id)">{{ control.title }}</TextLink>
        <Tag v-if="tree.highlighted(id)" label="Just changed" />
      </Cluster>
      <Cluster
        v-if="
          tree.riskCount(id) ||
          (tree.suggestionsEnabled() && tree.suggestionCount(id))
        "
        gap="2"
      >
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
          >{{ plural(tree.suggestionCount(id), 'suggestion') }}</Text
        >
      </Cluster>
    </template>

    <template #implementation>
      <template v-if="implementation">
        <Text v-if="summary.partsTotal > 1"
          >Statements for {{ summary.partsCovered }} of
          {{ summary.partsTotal }} parts</Text
        >
        <Text v-if="statusText">{{ statusText }}</Text>
        <Text v-else variant="secondary">No component implements it yet.</Text>
        <Text v-if="componentNames" variant="caption">{{
          componentNames
        }}</Text>
      </template>
      <Text v-else variant="secondary">Not implemented yet.</Text>
    </template>

    <template #evidence>
      <ControlEvidenceCounter :control="control" :ssp-id="tree.sspId()" />
      <Text v-if="filters.length">{{
        plural(filters.length, 'evidence filter')
      }}</Text>
      <Text v-else variant="secondary">No evidence filter checks it yet.</Text>
    </template>
  </LinkedColumns>
</template>
