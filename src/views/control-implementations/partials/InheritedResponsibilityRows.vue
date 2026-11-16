<script setup lang="ts">
/** A statement's inherited responsibilities in the Implementation tree: where each comes from, its satisfaction and posture, and Manage responsibilities (opens the statement). */
import Button from '@/ds/components/Button/Button.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { computed, inject } from 'vue';
import DashboardEvidenceCounter from './DashboardEvidenceCounter.vue';
import {
  LeveragedControlsKey,
  linkKey,
} from '@/composables/useLeveragedControls';
import {
  inheritedResponsibilityRows,
  postureLabel,
  satisfactionLabel,
} from './responsibility-posture';
import type { LeveragedControl } from '@/types/ssp-leverage';
import type { Statement } from '@/oscal';

const props = defineProps<{
  controlId: string;
  statementId: string;
  statement?: Statement;
}>();

const emit = defineEmits<{
  // The row block is a shortcut into the statement drawer, where the responsibilities
  // are managed.
  select: [event: Event];
}>();

// Provided by IndexView so the N statement cards share one leveraged-controls fetch.
// Without a provider (other surfaces) the rows simply don't render.
const leveraged = inject(LeveragedControlsKey, null);

// Only a provider that actually failed — with no provider at all there is nothing to
// report, and the rows are meant to stay absent.
const loadFailed = computed(() => Boolean(leveraged?.controlsError.value));

const links = computed<LeveragedControl[]>(
  () =>
    leveraged?.linksByStatement.value.get(
      linkKey(props.controlId, props.statementId),
    ) ?? [],
);

function rowsFor(link: LeveragedControl) {
  return inheritedResponsibilityRows(link, props.statement);
}

function filtersFor(responsibilityUuid: string) {
  return leveraged?.filtersByResponsibility.value.get(responsibilityUuid) ?? [];
}
</script>

<template>
  <!-- `links` is `?? []`, so a failed fetch would otherwise look exactly like "nothing
       inherited" and this block would silently vanish. A short note is enough here: the
       statement drawer carries the full error state and the Retry. -->
  <Text v-if="loadFailed" variant="caption"
    >Inherited responsibilities couldn't be loaded.</Text
  >
  <Stack v-else-if="links.length" gap="3">
    <Stack v-for="link in links" :key="link.id" gap="2">
      <Cluster gap="2">
        <Text as="span" variant="label"
          >Inherited from {{ link.inheritedFrom.offeringTitle }} v{{
            link.inheritedFrom.offeringVersion
          }}</Text
        >
        <Tag :label="satisfactionLabel(link.satisfaction)" />
        <Tag v-if="link.status !== 'active'" label="Needs review" />
        <Button size="sm" @click="emit('select', $event)"
          >Manage responsibilities</Button
        >
      </Cluster>
      <Stack gap="1" as="ul">
        <li v-for="row in rowsFor(link)" :key="row.responsibilityUuid">
          <Cluster gap="2">
            <!-- Once a filter is linked, its evidence count carries the coverage signal; the
                 posture tag would just repeat it. -->
            <Tag
              v-if="!filtersFor(row.responsibilityUuid).length"
              :label="postureLabel(row.posture)"
            />
            <Text as="span">{{ row.description }}</Text>
            <Tag v-if="row.satisfiedUuid" label="Handled by your team" />
            <DashboardEvidenceCounter
              v-for="filter in filtersFor(row.responsibilityUuid)"
              :key="filter.filterId"
              :dashboard-id="filter.filterId"
            />
          </Cluster>
        </li>
      </Stack>
    </Stack>
  </Stack>
</template>
