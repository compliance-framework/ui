<template>
  <div class="mt-6 space-y-6">
    <template v-if="isLoading">
      <PageHeader>Loading compliance progress...</PageHeader>
    </template>

    <template v-else-if="summary">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p class="text-xs uppercase tracking-wide text-emerald-700">
            Satisfied
          </p>
          <p class="mt-2 text-3xl font-semibold text-emerald-800">
            {{ summary.satisfied }}
          </p>
        </div>
        <div class="rounded-lg border border-red-200 bg-red-50 p-4">
          <p class="text-xs uppercase tracking-wide text-red-700">
            Not Satisfied
          </p>
          <p class="mt-2 text-3xl font-semibold text-red-800">
            {{ summary.notSatisfied }}
          </p>
        </div>
        <div class="rounded-lg border border-slate-300 bg-slate-100 p-4">
          <p class="text-xs uppercase tracking-wide text-slate-700">Unknown</p>
          <p class="mt-2 text-3xl font-semibold text-slate-800">
            {{ summary.unknown }}
          </p>
        </div>
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p class="text-xs uppercase tracking-wide text-blue-700">
            Compliance
          </p>
          <p class="mt-2 text-3xl font-semibold text-blue-800">
            {{ summary.compliancePercent }}%
          </p>
        </div>
        <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p class="text-xs uppercase tracking-wide text-indigo-700">
            Assessed
          </p>
          <p class="mt-2 text-3xl font-semibold text-indigo-800">
            {{ summary.assessedPercent }}%
          </p>
        </div>
      </div>

      <div class="rounded-lg border border-ccf-300 bg-white p-5">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-medium text-zinc-700">
            Overall Profile Progress
          </p>
          <p class="text-sm font-semibold text-zinc-900">
            {{ summary.compliancePercent }}% compliant
          </p>
        </div>
        <div class="flex h-4 w-full overflow-hidden rounded-full bg-zinc-200">
          <div class="bg-emerald-600" :style="{ width: satisfiedWidth }"></div>
          <div class="bg-red-500" :style="{ width: notSatisfiedWidth }"></div>
          <div class="bg-slate-400" :style="{ width: unknownWidth }"></div>
        </div>
        <div
          class="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600"
        >
          <span class="inline-flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
            Satisfied
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
            Not Satisfied
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
            Unknown
          </span>
        </div>
      </div>

      <div
        v-if="groups.length"
        class="rounded-lg border border-ccf-300 bg-white p-5"
      >
        <h3 class="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Group Breakdown
        </h3>
        <div class="mt-4 space-y-4">
          <div v-for="group in groups" :key="group.id">
            <div class="mb-2 flex items-center justify-between gap-2 text-sm">
              <p class="font-medium text-zinc-900">{{ group.title }}</p>
              <p class="text-zinc-600">
                {{ group.satisfied }}/{{ group.totalControls }} ({{
                  group.compliancePercent
                }}%)
              </p>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-zinc-200">
              <div
                class="h-full bg-emerald-600"
                :style="{
                  width: `${percent(group.satisfied, group.totalControls)}%`,
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-ccf-300 bg-white p-5">
        <div class="mb-4 flex items-center justify-between gap-4">
          <h3
            class="text-sm font-semibold uppercase tracking-wide text-zinc-700"
          >
            Controls
          </h3>
          <p class="text-sm text-zinc-600">{{ controls.length }} total</p>
        </div>

        <div
          v-if="controls.length === 0"
          class="rounded border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600"
        >
          No controls are available for this profile.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-zinc-200 text-sm">
            <thead>
              <tr
                class="text-left text-xs uppercase tracking-wide text-zinc-600"
              >
                <th class="px-3 py-2">Control</th>
                <th class="px-3 py-2">Group</th>
                <th class="px-3 py-2">Status</th>
                <th class="px-3 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              <tr v-for="control in controls" :key="controlKey(control)">
                <td class="px-3 py-2">
                  <div class="font-medium text-zinc-900">
                    {{ control.controlId }}
                  </div>
                  <div class="text-zinc-600">{{ control.title }}</div>
                </td>
                <td class="px-3 py-2 text-zinc-700">
                  {{ control.groupTitle || 'Ungrouped' }}
                </td>
                <td class="px-3 py-2">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="statusClass(control.computedStatus)"
                  >
                    {{ statusLabel(control.computedStatus) }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <ResultStatusBadge
                    :green="statusCount(control, 'satisfied')"
                    :gray="
                      statusCount(control, 'unknown') +
                      statusCount(control, 'incomplete')
                    "
                    :red="statusCount(control, 'not-satisfied')"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="rounded border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600"
      >
        No compliance data available.
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import PageHeader from '@/components/PageHeader.vue';
import ResultStatusBadge from '@/components/ResultStatusBadge.vue';
import { useProfileCompliance } from '@/composables/useProfileCompliance';
import type {
  ProfileComplianceControl,
  ProfileComplianceStatusCount,
} from '@/types/compliance';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

const route = useRoute();
const toast = useToast();

const profileId = computed(() => String(route.params.id || ''));
const { summary, controls, groups, isLoading, error, loadCompliance } =
  useProfileCompliance(profileId);

watch(
  profileId,
  async (id) => {
    if (!id) return;
    await loadCompliance({ includeControls: true });
  },
  { immediate: true },
);

watch(error, () => {
  if (!error.value) return;
  const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
  toast.add({
    severity: 'error',
    summary: 'Error loading compliance progress',
    detail:
      errorResponse.response?.data.errors.body ||
      'Unable to load profile compliance progress.',
    life: 4000,
  });
});

const satisfiedWidth = computed(() => {
  if (!summary.value) return '0%';
  return `${percent(summary.value.satisfied, summary.value.totalControls)}%`;
});
const notSatisfiedWidth = computed(() => {
  if (!summary.value) return '0%';
  const sat = percent(summary.value.satisfied, summary.value.totalControls);
  const notSat = percent(
    summary.value.notSatisfied,
    summary.value.totalControls,
  );
  // Fill remaining space to avoid rounding gaps
  const remaining = 100 - sat;
  const notSatCapped = Math.min(notSat, remaining);
  return `${notSatCapped}%`;
});
const unknownWidth = computed(() => {
  if (!summary.value) return '0%';
  const sat = percent(summary.value.satisfied, summary.value.totalControls);
  const notSat = percent(
    summary.value.notSatisfied,
    summary.value.totalControls,
  );
  const used = Math.min(sat + notSat, 100);
  return `${100 - used}%`;
});

function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function controlKey(control: ProfileComplianceControl): string {
  return `${control.catalogId}:${control.controlId}`;
}

function statusCount(
  control: ProfileComplianceControl,
  status: string,
): number {
  return (
    control.statusCounts.find(
      (item: ProfileComplianceStatusCount) => item.status === status,
    )?.count || 0
  );
}

function statusClass(status: string): string {
  switch (status) {
    case 'satisfied':
      return 'bg-emerald-100 text-emerald-800';
    case 'not-satisfied':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'satisfied':
      return 'Satisfied';
    case 'not-satisfied':
      return 'Not Satisfied';
    default:
      return 'Unknown';
  }
}
</script>
