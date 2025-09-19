<template>
  <div class="space-y-4">
    <div
      v-if="!entries.length"
      class="text-sm text-gray-600 dark:text-slate-400"
    >
      No log entries recorded for this risk.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="entry in entries"
        :key="entry.uuid"
        class="border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-2"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-gray-800 dark:text-slate-200">
            {{ entry.title || 'Log Entry' }}
          </h4>
          <span class="text-xs text-gray-500 dark:text-slate-400">
            {{ formatDate(entry.start) }}
            <template v-if="entry.end">→ {{ formatDate(entry.end) }}</template>
          </span>
        </div>

        <div
          v-if="entry.description"
          class="text-sm text-gray-700 dark:text-slate-300"
        >
          {{ entry.description }}
        </div>

        <div
          v-if="entry.statusChange"
          class="text-xs text-gray-500 dark:text-slate-400"
        >
          Status change: {{ entry.statusChange }}
        </div>

        <div
          v-if="entry.loggedBy?.length"
          class="text-xs text-gray-500 dark:text-slate-400"
        >
          Logged by:
          {{ entry.loggedBy.map((actor) => actor.partyUuid).join(', ') }}
        </div>

        <div
          v-if="entry.relatedResponses?.length"
          class="text-xs text-gray-500 dark:text-slate-400"
        >
          Related responses: {{ entry.relatedResponses.length }}
        </div>

        <div
          v-if="entry.remarks"
          class="text-xs text-gray-500 dark:text-slate-400"
        >
          {{ entry.remarks }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RiskLogEntry } from '@/oscal';

const props = defineProps<{
  entries?: RiskLogEntry[];
}>();

const entries = computed(() => props.entries ?? []);

function formatDate(value?: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
</script>
