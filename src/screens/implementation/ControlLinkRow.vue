<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { ByComponent, Control } from '@/oscal';
import { partMarkdown } from '@/utils/oscal-parts';
import IndexControlImplementation from '@/views/control-implementations/partials/IndexControlImplementation.vue';
import ControlEvidenceCounter from '@/views/control-implementations/partials/ControlEvidenceCounter.vue';
import Button from '@/ds/components/Button/Button.vue';
import ClampedText from '@/ds/components/ClampedText/ClampedText.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import LinkedColumns from '@/ds/components/LinkedColumns/LinkedColumns.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import { statuses, type StatusKey } from '@/ds/components/StatusBadge/statuses';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { evidenceLink } from '../filters/evidenceLink';
import { LINK_COLUMNS, useControlTree } from './controlTree';

/**
 * One control in the Implementation tree, as three linked boxes: the control (ID, title and its
 * statement, cut to a few lines), its implementation (remarks, then each component's statement and
 * status), and its evidence (the counts, then the evidence filters that check it). The statements
 * editor (IndexControlImplementation) sits closed beneath them.
 */
const props = defineProps<{ control: Control }>();
const tree = useControlTree();

const id = computed(() => props.control.id);
const statement = computed(() => {
  const part = props.control.parts?.find((p) => p.name === 'statement');
  return part ? partMarkdown(part).trim() : '';
});
const implementation = computed(() => tree.implementation(id.value));

/** Every component's statement for the control, whether made for the control or one of its parts. */
const byComponents = computed<ByComponent[]>(() => [
  ...(implementation.value?.byComponents ?? []),
  ...(implementation.value?.statements ?? []).flatMap(
    (s) => s.byComponents ?? [],
  ),
]);
const componentTitle = (bc: ByComponent) =>
  tree.component(bc.componentUuid)?.title ?? 'Component not in this plan';
function statusOf(bc: ByComponent): StatusKey | undefined {
  const state = bc.implementationStatus?.state?.trim().toLowerCase();
  return state && state in statuses ? (state as StatusKey) : undefined;
}

const filters = computed(() => tree.filters(id.value));
</script>

<template>
  <Stack gap="2">
    <LinkedColumns :columns="LINK_COLUMNS">
      <template #control>
        <Cluster gap="2">
          <Tag :label="id" code />
          <Text as="strong">{{ control.title }}</Text>
          <Tag v-if="tree.highlighted(id)" label="Just changed" />
        </Cluster>
        <ClampedText v-if="statement" :text="statement" />
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
            >{{ tree.suggestionCount(id) }} suggestion{{
              tree.suggestionCount(id) === 1 ? '' : 's'
            }}</Text
          >
        </Cluster>
      </template>

      <template #implementation>
        <template v-if="implementation">
          <Cluster gap="2">
            <Tag :label="implementation.uuid.slice(0, 8)" code />
          </Cluster>
          <ClampedText
            v-if="implementation.remarks"
            :text="implementation.remarks"
          />
        </template>
        <Stack v-if="byComponents.length" as="ul" gap="4">
          <li v-for="bc in byComponents" :key="bc.uuid">
            <Stack gap="1">
              <Cluster gap="2" justify="between">
                <Text as="strong">{{ componentTitle(bc) }}</Text>
                <StatusBadge v-if="statusOf(bc)" :status="statusOf(bc)!" />
              </Cluster>
              <ClampedText v-if="bc.description" :text="bc.description" />
            </Stack>
          </li>
        </Stack>
        <Text v-else variant="secondary">No component implements it yet.</Text>
        <Cluster gap="2">
          <Button
            size="sm"
            icon="next"
            :disabled-reason="
              implementation || tree.suggestionCount(id)
                ? undefined
                : 'No implementation or suggestions yet.'
            "
            @click="tree.openDrawer(id)"
            >Details</Button
          >
        </Cluster>
      </template>

      <template #evidence>
        <ControlEvidenceCounter :control="control" :ssp-id="tree.sspId()" />
        <Stack v-if="filters.length" as="ul" gap="2">
          <li v-for="filter in filters" :key="filter.id">
            <TextLink :to="evidenceLink(filter)">{{ filter.name }}</TextLink>
          </li>
        </Stack>
        <Text v-else variant="secondary"
          >No evidence filter checks it yet.</Text
        >
      </template>
    </LinkedColumns>
    <Disclosure :label="`${id} statements`">
      <IndexControlImplementation
        :control="control"
        :implementation="implementation"
        @exported="tree.onExported"
        @imported="tree.onImported"
        @closed="tree.onStatementsClosed"
      />
    </Disclosure>
  </Stack>
</template>
