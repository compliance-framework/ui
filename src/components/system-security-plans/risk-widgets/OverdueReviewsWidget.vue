<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="flex items-center justify-between gap-2">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
        Overdue Reviews
      </h4>
      <button
        type="button"
        class="text-xs font-medium text-blue-600 underline dark:text-blue-300"
        @click="navigateToOverdue"
      >
        Open filtered list
      </button>
    </div>

    <div v-if="!items.length" class="mt-4 text-sm text-gray-500 dark:text-slate-400">
      No overdue review deadlines.
    </div>

    <div v-else class="mt-4 max-h-48 space-y-2 overflow-auto pr-1">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="w-full rounded-md border border-ccf-300 px-3 py-2 text-left hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
        @click="navigateToOverdue"
      >
        <p class="truncate text-sm font-medium text-gray-900 dark:text-slate-200">
          {{ item.title }}
        </p>
        <p class="mt-1 text-xs text-red-700 dark:text-red-300">
          Due {{ formatDate(item.reviewDeadline) }}
        </p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OverdueRiskItem } from '@/utils/risk-dashboard';

defineProps<{
  items: OverdueRiskItem[];
}>();

const emit = defineEmits<{
  (event: 'navigate', query: Record<string, string>): void;
}>();

function navigateToOverdue() {
  emit('navigate', { review: 'overdue' });
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}
</script>
