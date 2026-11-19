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
 * statement, cut to a few lines), its implementation (remarks, then each statement with each
 * component's text and status), and its evidence (the counts, then the evidence filters that check it). The statements
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

/**
 * The implementation's statements, each with its components: one per part of the control's text
 * it covers (`ac-2_smt.a`), in the catalog's order, after any components that implement the whole
 * control. A control without lettered parts has one statement (`ia-2_smt`).
 */
const statementGroups = computed(() => {
  const impl = implementation.value;
  if (!impl) return [];
  const whole = impl.byComponents?.length
    ? [
        {
          key: 'whole',
          statementId: undefined,
          remarks: undefined,
          byComponents: impl.byComponents,
        },
      ]
    : [];
  const statements = [...(impl.statements ?? [])]
    .sort((a, b) =>
      a.statementId.localeCompare(b.statementId, undefined, { numeric: true }),
    )
    .map((s) => ({
      key: s.uuid,
      statementId: s.statementId,
      remarks: s.remarks,
      byComponents: s.byComponents ?? [],
    }));
  return [...whole, ...statements];
});
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
          <ClampedText
            v-if="implementation.remarks"
            :text="implementation.remarks"
          />
          <Stack v-if="statementGroups.length" as="ul" gap="5">
            <li v-for="group in statementGroups" :key="group.key">
              <Stack gap="3">
                <Cluster gap="2">
                  <Tag
                    v-if="group.statementId"
                    :label="group.statementId"
                    code
                  />
                  <Text v-else as="span" variant="label">Whole control</Text>
                </Cluster>
                <ClampedText v-if="group.remarks" :text="group.remarks" />
                <Stack v-if="group.byComponents.length" as="ul" gap="4">
                  <li v-for="bc in group.byComponents" :key="bc.uuid">
                    <Stack gap="1">
                      <Cluster gap="2" justify="between">
                        <Text as="strong">{{ componentTitle(bc) }}</Text>
                        <StatusBadge
                          v-if="statusOf(bc)"
                          :status="statusOf(bc)!"
                        />
                      </Cluster>
                      <ClampedText
                        v-if="bc.description"
                        :text="bc.description"
                      />
                    </Stack>
                  </li>
                </Stack>
                <Text v-else variant="secondary"
                  >No component implements it yet.</Text
                >
              </Stack>
            </li>
          </Stack>
          <Text v-else variant="secondary">No statement written yet.</Text>
        </template>
        <Text v-else variant="secondary">Not implemented yet.</Text>
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
