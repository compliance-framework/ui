<template>
  <div class="space-y-6">
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
        <p class="text-xs uppercase tracking-wide text-blue-700">Compliance</p>
        <p class="mt-2 text-3xl font-semibold text-blue-800">
          {{ summary.compliancePercent }}%
        </p>
      </div>
      <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <p class="text-xs uppercase tracking-wide text-indigo-700">Assessed</p>
        <p class="mt-2 text-3xl font-semibold text-indigo-800">
          {{ summary.assessedPercent }}%
        </p>
      </div>
    </div>

    <div class="rounded-lg border border-ccf-300 bg-white p-5">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-medium text-zinc-700">{{ progressTitle }}</p>
        <p class="text-sm font-semibold text-zinc-900">
          {{ summary.compliancePercent }}% compliant
        </p>
      </div>
      <div class="flex h-4 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          class="bg-emerald-600"
          :style="{ width: `${summaryWidths.satisfied}%` }"
        ></div>
        <div
          class="bg-red-500"
          :style="{ width: `${summaryWidths.notSatisfied}%` }"
        ></div>
        <div
          class="bg-slate-400"
          :style="{ width: `${summaryWidths.unknown}%` }"
        ></div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
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
      v-if="implementation"
      class="rounded-lg border border-ccf-300 bg-white p-5"
    >
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-medium text-zinc-700">Implementation Coverage</p>
        <p class="text-sm font-semibold text-zinc-900">
          {{ implementation.implementationPercent }}% implemented
        </p>
      </div>
      <div class="flex h-4 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          class="bg-blue-600"
          :style="{ width: `${implementation.implementationPercent}%` }"
        ></div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        <span>{{ implementation.implementedControls }} implemented</span>
        <span>{{ implementation.unimplementedControls }} not implemented</span>
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
          <template v-if="showDetailedGroupBreakdown">
            <div class="mb-2 flex items-center justify-between gap-2 text-sm">
              <p class="font-medium text-zinc-900">{{ group.title }}</p>
              <p class="text-zinc-600">
                {{ group.compliancePercent }}% compliant
              </p>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-zinc-200">
              <div
                class="h-full bg-emerald-600"
                :style="{ width: `${groupWidths(group).satisfied}%` }"
              ></div>
              <div
                class="h-full bg-red-500"
                :style="{ width: `${groupWidths(group).notSatisfied}%` }"
              ></div>
              <div
                class="h-full bg-slate-400"
                :style="{ width: `${groupWidths(group).unknown}%` }"
              ></div>
            </div>
            <div
              class="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-600"
            >
              <span>{{ group.satisfied }} satisfied</span>
              <span>{{ group.notSatisfied }} not satisfied</span>
              <span>{{ group.unknown }} unknown</span>
              <span v-if="implementation && groupNotImplementedCount">
                {{ groupNotImplementedCount(group.id) }} not implemented
              </span>
            </div>
          </template>

          <template v-else>
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
                :style="{ width: `${groupWidths(group).satisfied}%` }"
              ></div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-ccf-300 bg-white p-5">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Controls
        </h3>
        <p class="text-sm text-zinc-600">{{ controls.length }} total</p>
      </div>

      <div
        v-if="controls.length === 0"
        class="rounded border border-dashed border-zinc-300 bg-zinc-50 dark:bg-slate-800 dark:border-slate-700 p-6 text-sm text-zinc-600 dark:text-slate-400"
      >
        No controls are available for this profile.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-zinc-200 text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-zinc-600">
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ResultStatusBadge from '@/components/ResultStatusBadge.vue';
import type {
  ProfileComplianceControl,
  ProfileComplianceGroup,
  ProfileComplianceImplementation,
  ProfileComplianceSummary,
} from '@/types/compliance';
import {
  computeComplianceWidths,
  controlKey,
  statusClass,
  statusCount,
  statusLabel,
} from '@/utils/compliance';

interface Props {
  summary: ProfileComplianceSummary;
  controls: ProfileComplianceControl[];
  groups: ProfileComplianceGroup[];
  progressTitle: string;
  implementation?: ProfileComplianceImplementation;
  showDetailedGroupBreakdown?: boolean;
  groupNotImplementedCount?: (groupId: string) => number;
}

const props = withDefaults(defineProps<Props>(), {
  showDetailedGroupBreakdown: false,
});

const summaryWidths = computed(() => computeComplianceWidths(props.summary));

function groupWidths(group: ProfileComplianceGroup) {
  return computeComplianceWidths(group);
}
</script>
