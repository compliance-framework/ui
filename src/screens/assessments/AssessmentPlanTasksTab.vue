<script setup lang="ts">
/**
 * An assessment plan's Tasks tab, as a RecordCollection: each task with its type, description
 * and timing, and once opened its activities and their steps. The task form is the design system's.
 */
import { useRoute } from 'vue-router';
import type { Task } from '@/oscal';
import { RESOURCES } from '@/constants/permissions';
import { formatDate } from '@/ds/format';
import RecordCollection from '../RecordCollection.vue';
import type { CollectionKind } from '../collectionKind';
import TaskActivities from './TaskActivities.vue';

const route = useRoute();
const planId = route.params.id as string;

const timing = (task: Task) => {
  const t = task.timing;
  if (t?.onDate) return `On ${formatDate(t.onDate)}`;
  if (t?.withinDateRange?.start)
    return `${formatDate(t.withinDateRange.start)} to ${
      t.withinDateRange.end ? formatDate(t.withinDateRange.end) : 'open'
    }`;
  if (t?.atFrequency?.period)
    return `Every ${t.atFrequency.period} ${t.atFrequency.unit}`.trim();
  return '';
};

const TASKS: CollectionKind = {
  noun: 'task',
  plural: 'tasks',
  resource: RESOURCES.ASSESSMENT_PLAN,
  emptyBody:
    'A task is an assessment activity, such as a scan or an interview, with its schedule and subjects.',
  editProp: 'task',
  tags: (task: Task) => (task.type ? [task.type] : []),
  facts: (task: Task) => [
    { key: 'description', label: 'Description', value: task.description },
    { key: 'timing', label: 'Timing', value: timing(task) },
    { key: 'remarks', label: 'Remarks', value: task.remarks },
  ],
  createForm: () => import('./TaskForm.vue'),
  editForm: () => import('./TaskForm.vue'),
  designSystemForms: true,
};
</script>

<template>
  <RecordCollection
    :kind="TASKS"
    :url="`/api/oscal/assessment-plans/${planId}/tasks`"
    :form-props="{ assessmentPlanId: planId }"
    icon="assessments"
  >
    <template #details="{ entry }">
      <TaskActivities :plan-id="planId" :task-id="entry.uuid!" />
    </template>
  </RecordCollection>
</template>
