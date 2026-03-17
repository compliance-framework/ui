<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
      Risk Severity Heatmap
    </h4>
    <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
      Likelihood x Impact
    </p>

    <div class="mt-4 space-y-2">
      <div
        v-for="likelihood in levels"
        :key="likelihood"
        class="grid grid-cols-[6rem_repeat(4,minmax(0,1fr))] gap-2"
      >
        <div
          class="self-center text-xs font-medium uppercase text-gray-500 dark:text-slate-400"
        >
          {{ formatLevel(likelihood) }}
        </div>
        <button
          v-for="impact in levels"
          :key="`${likelihood}:${impact}`"
          type="button"
          :data-testid="`heatmap-${likelihood}-${impact}`"
          class="rounded-md border border-ccf-300 px-2 py-3 text-sm font-semibold transition hover:opacity-90 dark:border-slate-700"
          :style="{
            backgroundColor: cellColor(likelihood, impact),
            color: cellTextColor(likelihood, impact),
          }"
          @click="navigate(likelihood, impact)"
        >
          {{ countFor(likelihood, impact) }}
        </button>
      </div>
    </div>

    <div
      class="mt-3 grid grid-cols-[6rem_repeat(4,minmax(0,1fr))] gap-2 text-xs"
    >
      <span></span>
      <span
        v-for="impact in levels"
        :key="`impact-${impact}`"
        class="text-center font-medium uppercase text-gray-500 dark:text-slate-400"
      >
        {{ formatLevel(impact) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  riskSeverityLevels,
  type RiskHeatmapCell,
  type RiskSeverityLevel,
} from '@/utils/risk-dashboard';

const props = defineProps<{
  cells: RiskHeatmapCell[];
  maxCount: number;
}>();

const emit = defineEmits<{
  (event: 'navigate', query: Record<string, string>): void;
}>();

const levels = riskSeverityLevels;

const countMap = computed(() => {
  const map = new Map<string, number>();
  for (const cell of props.cells) {
    map.set(`${cell.likelihood}:${cell.impact}`, cell.count);
  }
  return map;
});

function formatLevel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function countFor(
  likelihood: RiskSeverityLevel,
  impact: RiskSeverityLevel,
): number {
  return countMap.value.get(`${likelihood}:${impact}`) || 0;
}

function intensity(
  likelihood: RiskSeverityLevel,
  impact: RiskSeverityLevel,
): number {
  if (!props.maxCount) return 0;
  const count = countFor(likelihood, impact);
  return count / props.maxCount;
}

function cellColor(
  likelihood: RiskSeverityLevel,
  impact: RiskSeverityLevel,
): string {
  const ratio = intensity(likelihood, impact);
  const alpha = 0.08 + ratio * 0.82;
  return `rgba(220, 38, 38, ${alpha.toFixed(3)})`;
}

function cellTextColor(
  likelihood: RiskSeverityLevel,
  impact: RiskSeverityLevel,
): string {
  return intensity(likelihood, impact) > 0.45 ? '#ffffff' : '#7f1d1d';
}

function navigate(likelihood: RiskSeverityLevel, impact: RiskSeverityLevel) {
  emit('navigate', {
    likelihood,
    impact,
  });
}
</script>
