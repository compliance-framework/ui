<template>
  <button
    type="button"
    class="rounded-lg border border-ccf-300 bg-white p-4 text-left transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
    @click="openAcceptedRisks"
  >
    <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
      Addressed Risks
    </h4>
    <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
      Accepted and mitigation-complete vs active risks
    </p>

    <div class="mt-4 flex items-end gap-2">
      <span
        class="text-3xl font-semibold text-emerald-700 dark:text-emerald-300"
      >
        {{ metrics.percentage.toFixed(1) }}%
      </span>
      <span class="pb-1 text-sm text-gray-600 dark:text-slate-400">
        {{ metrics.addressed }} / {{ metrics.totalInScope }}
      </span>
    </div>

    <div
      class="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-slate-700"
    >
      <div
        class="h-full bg-emerald-600"
        :style="{ width: `${metrics.percentage}%` }"
      ></div>
    </div>
  </button>
</template>

<script setup lang="ts">
import type { RiskAcceptanceMetrics } from '@/utils/risk-dashboard';

defineProps<{
  metrics: RiskAcceptanceMetrics;
}>();

const emit = defineEmits<{
  (event: 'navigate', query: Record<string, string>): void;
}>();

function openAcceptedRisks() {
  emit('navigate', { statusCategory: 'addressed' });
}
</script>
