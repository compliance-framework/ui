<template>
  <header
    class="flex flex-wrap items-start justify-between gap-4 rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    data-test="config-header"
  >
    <div class="space-y-1 text-sm">
      <p
        v-if="!config || config.revision === 0"
        class="text-gray-700 dark:text-slate-300"
      >
        No overlay saved: agents run their local configuration.
      </p>
      <p
        v-else
        class="text-gray-700 dark:text-slate-300"
        data-test="desired-revision"
      >
        Desired revision
        <span class="font-semibold">r{{ config.revision }}</span>
        <template v-if="config.createdBy">
          · by {{ config.createdBy }}</template
        >
        <template v-if="config.createdAt">
          ·
          <span v-tooltip.top="formatAbsolute(config.createdAt)">{{
            formatRelative(config.createdAt)
          }}</span>
        </template>
        <template v-if="config.comment"> · “{{ config.comment }}”</template>
        <ConfigPill v-if="config.revertOf" severity="info" class="ml-1">
          Revert of r{{ config.revertOf }}
        </ConfigPill>
      </p>
      <p v-if="instanceCount === 0" class="text-gray-500 dark:text-slate-400">
        No instances have connected yet.
      </p>
      <p
        v-else
        class="flex flex-wrap items-center gap-x-3 gap-y-1"
        data-test="sync-summary"
      >
        <span class="font-medium text-gray-900 dark:text-slate-200">
          In sync: {{ syncSummary.inSync }}/{{ syncSummary.expected }} instances
        </span>
        <span
          v-if="syncSummary.reportOnly"
          class="text-gray-500 dark:text-slate-400"
        >
          {{ syncSummary.reportOnly }} report-only
        </span>
        <span
          v-if="syncSummary.notReported"
          class="text-gray-500 dark:text-slate-400"
        >
          {{ syncSummary.notReported }} not reporting
        </span>
        <span
          v-if="syncSummary.stale"
          class="text-gray-500 dark:text-slate-400"
        >
          {{ syncSummary.stale }} stale
        </span>
        <span
          v-if="syncSummary.partial"
          class="text-amber-700 dark:text-amber-300"
          data-test="partial-fleet"
        >
          Showing {{ syncSummary.loaded }} of {{ syncSummary.total }} instances:
          the list and problems below cover only those
        </span>
        <button
          v-for="p in syncSummary.problems"
          :key="p.instanceId"
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:underline dark:bg-red-500/15 dark:text-red-300"
          data-test="problem-chip"
          @click="$emit('select-instance', p.instanceId)"
        >
          <i class="pi pi-exclamation-triangle text-[0.7rem]" />
          {{ p.hostname || p.instanceId.slice(0, 8) }}: {{ p.label }}
        </button>
      </p>
    </div>
    <div class="flex items-center gap-2">
      <SecondaryButton
        size="small"
        :disabled="loading"
        aria-label="Refresh configuration"
        data-test="refresh"
        @click="$emit('refresh')"
      >
        <i class="pi pi-refresh" :class="{ 'animate-spin': loading }" />
      </SecondaryButton>
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type { AgentConfigRevision } from '@/types/agent-config';
import type { SyncSummary } from '@/utils/agent-config/instance-status';
import { formatAbsolute, formatRelative } from '@/utils/agent-config/display';
import ConfigPill from './ConfigPill.vue';

withDefaults(
  defineProps<{
    config: AgentConfigRevision | null;
    syncSummary: SyncSummary;
    /** Every instance of the agent (the API's count), loaded or not. */
    instanceCount: number;
    loading?: boolean;
  }>(),
  { loading: false },
);

defineEmits<{ refresh: []; 'select-instance': [id: string] }>();
</script>
