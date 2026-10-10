<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
      Top Risks
    </h4>
    <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
      Highest-impact open risks
    </p>

    <div
      v-if="!items.length"
      class="mt-4 text-sm text-gray-500 dark:text-slate-400"
    >
      No open risks available.
    </div>

    <div v-else class="mt-4 space-y-2">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :data-testid="`top-risk-${item.id}`"
        class="w-full rounded-md border border-ccf-300 px-3 py-2 text-left hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
        @click="openRisk(item.id)"
      >
        <p
          class="truncate text-sm font-medium text-gray-900 dark:text-slate-200"
        >
          {{ item.title }}
        </p>
        <p class="mt-1 text-xs text-gray-600 dark:text-slate-400">
          Impact {{ formatLevel(item.impact) }} | Likelihood
          {{ formatLevel(item.likelihood) }}
        </p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TopRiskItem } from '@/utils/risk-dashboard';

defineProps<{
  items: TopRiskItem[];
}>();

const emit = defineEmits<{
  (event: 'navigate', query: Record<string, string>): void;
}>();

function openRisk(riskId: string) {
  emit('navigate', { riskId });
}

function formatLevel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
</script>
