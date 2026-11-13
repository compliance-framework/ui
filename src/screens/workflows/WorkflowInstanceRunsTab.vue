<script setup lang="ts">
import { computed } from 'vue';
import { useWorkflowInstanceStore } from '@/stores/workflows/instances';
import { formatDateTime, plural } from '@/ds/format';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';

/** A workflow instance's Runs tab: every run, newest first, each opening its run page. */
const store = useWorkflowInstanceStore();

const rows = computed(() =>
  [...store.executions]
    .sort(
      (a, b) =>
        new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
    )
    .map((run) => ({
      id: run.id,
      // The time the run actually started, not when it was triggered.
      started: run.startedAt ? formatDateTime(run.startedAt) : 'Not started',
      status: `run-${run.status.replace(/_/g, '-')}` as StatusKey,
      triggeredBy: run.triggeredBy,
      finished: run.completedAt
        ? formatDateTime(run.completedAt)
        : run.cancelledAt
          ? `Cancelled ${formatDateTime(run.cancelledAt)}`
          : run.status.replace(/_/g, ' '),
    })),
);
</script>

<template>
  <Text v-if="store.instance && !rows.length"
    >No runs yet. Use Run now to start the first one.</Text
  >
  <DataTable
    v-else-if="store.instance"
    :caption="plural(rows.length, 'run')"
    caption-hidden
    :columns="[
      { key: 'started', label: 'Started', nowrap: true },
      { key: 'status', label: 'Status', nowrap: true },
      { key: 'triggeredBy', label: 'Triggered by' },
      { key: 'finished', label: 'Completed', nowrap: true },
    ]"
    :rows="rows"
    :row-key="(r) => r.id"
  >
    <template #cell-started="{ row: r }">
      <TextLink
        :to="{ name: 'workflow-execution-view', params: { id: r.id } }"
        >{{ r.started }}</TextLink
      >
    </template>
    <template #cell-status="{ row: r }"
      ><StatusBadge :status="r.status"
    /></template>
  </DataTable>
</template>
