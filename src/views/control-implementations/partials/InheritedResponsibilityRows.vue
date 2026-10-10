<template>
  <!-- `links` is `?? []`, so a failed fetch would otherwise look exactly like "nothing
       inherited" and this block would silently vanish. A muted marker is enough here — the
       statement drawer carries the full error state and the Retry. -->
  <div
    v-if="loadFailed"
    class="mt-2 text-xs text-gray-500 italic dark:text-slate-400"
  >
    Could not load inherited responsibilities.
  </div>

  <div v-else-if="links.length" class="mt-2 space-y-2">
    <div
      v-for="link in links"
      :key="link.id"
      class="rounded border border-purple-200 bg-purple-50/40 p-2 cursor-pointer dark:border-purple-900 dark:bg-purple-950/20"
      title="Open the statement to manage these responsibilities"
      @click.stop="emit('select', $event)"
    >
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="font-medium text-purple-700 dark:text-purple-300">
          Inherited from {{ link.inheritedFrom.offeringTitle }} v{{
            link.inheritedFrom.offeringVersion
          }}
        </span>
        <Badge :severity="satisfactionSeverity(link.satisfaction)">
          {{ satisfactionLabel(link.satisfaction) }}
        </Badge>
        <Badge v-if="link.status !== 'active'" severity="warn">
          Needs review
        </Badge>
      </div>

      <div
        v-for="row in rowsFor(link)"
        :key="row.responsibilityUuid"
        class="mt-1 flex flex-wrap items-center gap-2 text-xs"
      >
        <!-- Once a dashboard is linked, its evidence count carries the coverage
             signal; the posture badge would just duplicate it. -->
        <Badge
          v-if="!filtersFor(row.responsibilityUuid).length"
          :severity="postureSeverity(row.posture)"
        >
          {{ postureLabel(row.posture) }}
        </Badge>
        <span class="text-gray-700 dark:text-slate-300">
          {{ row.description }}
        </span>
        <span
          v-if="row.satisfiedUuid"
          class="text-green-600 dark:text-green-400"
          title="Your team documented how this is handled"
        >
          ✓ handled
        </span>
        <DashboardEvidenceCounter
          v-for="filter in filtersFor(row.responsibilityUuid)"
          :key="filter.filterId"
          :dashboard-id="filter.filterId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import Badge from '@/volt/Badge.vue';
import DashboardEvidenceCounter from './DashboardEvidenceCounter.vue';
import {
  LeveragedControlsKey,
  linkKey,
} from '@/composables/useLeveragedControls';
import {
  inheritedResponsibilityRows,
  postureLabel,
  postureSeverity,
  satisfactionLabel,
  satisfactionSeverity,
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
