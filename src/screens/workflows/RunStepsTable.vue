<script setup lang="ts">
/**
 * A workflow run's steps in order: status, who is responsible, when each is due and was done,
 * how long it took (from the run's metrics) and the evidence submitted, with Open for the step's
 * panel. Overdue and failed steps say why.
 */
import { computed } from 'vue';
import type {
  StepExecution,
  WorkflowExecutionMetrics,
} from '@/types/workflows';
import { formatDateTime, plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { formatDuration } from './runDuration';

const props = defineProps<{
  steps: StepExecution[];
  metrics?: WorkflowExecutionMetrics | null;
}>();
const emit = defineEmits<{ open: [step: StepExecution] }>();

const definition = (step: StepExecution) =>
  step.workflowStepDefinition || step.stepDefinition;

const rows = computed(() =>
  [...props.steps]
    .sort((a, b) => (definition(a)?.order ?? 0) - (definition(b)?.order ?? 0))
    .map((step) => {
      const def = definition(step);
      const metric = props.metrics?.stepMetrics?.find(
        (m) => m.stepDefinitionId === def?.id,
      );
      return {
        id: step.id,
        name: def?.name || 'Unnamed step',
        description: def?.description,
        status: `step-${step.status.replace(/_/g, '-')}` as StatusKey,
        role: def?.responsibleRole || 'Not set',
        due: step.dueDate ? formatDateTime(step.dueDate) : 'Not set',
        done: step.completedAt
          ? formatDateTime(step.completedAt)
          : step.failedAt
            ? `Failed ${formatDateTime(step.failedAt)}`
            : '',
        duration: formatDuration(metric?.durationMinutes),
        evidence: plural(step.evidence?.length ?? 0, 'item'),
        note: step.failureReason
          ? `Failed: ${step.failureReason}`
          : step.overdueAt
            ? `Overdue since ${formatDateTime(step.overdueAt)}`
            : step.completionNotes
              ? `Notes: ${step.completionNotes}`
              : '',
        step,
      };
    }),
);

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Step', minWidth: 'sm' },
  { key: 'status', label: 'Status', nowrap: true },
  { key: 'role', label: 'Responsible' },
  { key: 'due', label: 'Due', nowrap: true },
  { key: 'done', label: 'Done', nowrap: true },
  { key: 'duration', label: 'Took', nowrap: true },
  { key: 'evidence', label: 'Evidence', nowrap: true },
];
</script>

<template>
  <DataTable
    :caption="plural(rows.length, 'step')"
    :columns="columns"
    :rows="rows"
    :row-key="(r) => r.id"
  >
    <template #cell-name="{ row: r }">
      <Stack gap="1">
        <Text as="span">{{ r.name }}</Text>
        <Text v-if="r.note" as="span" variant="caption">{{ r.note }}</Text>
      </Stack>
    </template>
    <template #cell-status="{ row: r }"
      ><StatusBadge :status="r.status"
    /></template>
    <template #cell-done="{ row: r }">{{ r.done || 'Not yet' }}</template>
    <template #actions="{ row: r }">
      <Button size="sm" @click="emit('open', r.step)">Open</Button>
    </template>
  </DataTable>
</template>
