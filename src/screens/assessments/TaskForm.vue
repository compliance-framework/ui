<script setup lang="ts">
/**
 * Add or edit an assessment plan task: title, type, description, when it happens (on a date,
 * within a date range, or at a frequency) and, when editing, the plan's other tasks it depends
 * on. Saves the task itself and emits `created` or `updated`.
 */
import { computed, reactive, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskTiming } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ assessmentPlanId: string; task?: Task }>();
const emit = defineEmits<{
  created: [task: Task];
  updated: [task: Task];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/assessment-plans/${props.assessmentPlanId}/tasks`;

type TimingKind = 'none' | 'onDate' | 'withinDateRange' | 'atFrequency';
const timing = props.task?.timing;
const draft = reactive({
  title: props.task?.title ?? '',
  type: props.task?.type ?? '',
  description: props.task?.description ?? '',
  timingKind: (timing?.onDate !== undefined
    ? 'onDate'
    : timing?.withinDateRange
      ? 'withinDateRange'
      : timing?.atFrequency
        ? 'atFrequency'
        : 'none') as TimingKind,
  onDate: timing?.onDate?.slice(0, 10) ?? '',
  start: timing?.withinDateRange?.start?.slice(0, 10) ?? '',
  end: timing?.withinDateRange?.end?.slice(0, 10) ?? '',
  period: timing?.atFrequency?.period ?? '',
  unit: timing?.atFrequency?.unit ?? 'months',
  dependsOn: (props.task?.dependencies ?? []).map((d) => d.taskUuid),
});
const timingKinds = [
  { value: 'none', label: 'Not scheduled' },
  { value: 'onDate', label: 'On a date' },
  { value: 'withinDateRange', label: 'Within dates' },
  { value: 'atFrequency', label: 'Repeating' },
];
const units = ['days', 'weeks', 'months', 'years'].map((value) => ({
  value,
  label: value[0]!.toUpperCase() + value.slice(1),
}));

// Dependencies are other tasks in the plan; only offered when editing.
const tasks = props.task ? useApiQuery<Task[]>(base) : undefined;
const dependencyOptions = computed(() =>
  (tasks?.data.value ?? [])
    .filter((t) => t.uuid !== props.task?.uuid)
    .map((t) => ({ value: t.uuid, label: t.title || t.uuid })),
);

const errors = reactive({ title: '', type: '', timing: '' });
const saving = ref(false);
const saveError = ref('');

/** The API wants RFC 3339 timestamps; the date fields give days. */
const timestamp = (day: string) => `${day}T00:00:00Z`;

function buildTiming(): TaskTiming | undefined {
  switch (draft.timingKind) {
    case 'onDate':
      return { onDate: timestamp(draft.onDate) };
    case 'withinDateRange':
      return {
        withinDateRange: {
          start: timestamp(draft.start),
          end: timestamp(draft.end),
        },
      };
    case 'atFrequency':
      return { atFrequency: { period: draft.period, unit: draft.unit } };
    default:
      return undefined;
  }
}

async function save() {
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.type = draft.type.trim()
    ? ''
    : 'Enter a type, e.g. action or milestone.';
  errors.timing =
    (draft.timingKind === 'onDate' && !draft.onDate) ||
    (draft.timingKind === 'withinDateRange' && (!draft.start || !draft.end)) ||
    (draft.timingKind === 'atFrequency' && !draft.period)
      ? 'Complete the schedule, or choose Not scheduled.'
      : draft.timingKind === 'withinDateRange' && draft.end < draft.start
        ? 'The end must be after the start.'
        : '';
  if (errors.title || errors.type || errors.timing) return;
  saving.value = true;
  saveError.value = '';
  const previous = new Map(
    (props.task?.dependencies ?? []).map((d) => [d.taskUuid, d]),
  );
  const body: Task = {
    ...(props.task ?? { uuid: uuidv4(), props: [], links: [] }),
    title: draft.title.trim(),
    type: draft.type.trim(),
    description: draft.description,
    timing: buildTiming(),
    // Kept dependencies keep their remarks.
    dependencies: draft.dependsOn.map(
      (taskUuid) => previous.get(taskUuid) ?? { taskUuid },
    ),
  };
  try {
    const response = props.task
      ? await api.put<{ data: Task }>(`${base}/${props.task.uuid}`, body, {
          transformRequest: [decamelizeKeys],
        })
      : await api.post<{ data: Task }>(base, body, {
          transformRequest: [decamelizeKeys],
        });
    toast.add({
      severity: 'success',
      summary: props.task ? 'Task saved' : 'Task added',
      life: 3000,
    });
    if (props.task) emit('updated', response.data.data);
    else emit('created', response.data.data);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Stack gap="4">
      <Grid min="sm" gap="4">
        <FormField label="Title" required :error="errors.title">
          <TextInput v-model="draft.title" />
        </FormField>
        <FormField
          label="Type"
          required
          hint="OSCAL task type, e.g. action or milestone."
          :error="errors.type"
        >
          <TextInput v-model="draft.type" :options="['action', 'milestone']" />
        </FormField>
      </Grid>
      <FormField label="Description">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <RadioGroup
        v-model="draft.timingKind"
        legend="When"
        :options="timingKinds"
        variant="segmented"
        :error="errors.timing"
      />
      <FormField v-if="draft.timingKind === 'onDate'" label="Date">
        <TextInput v-model="draft.onDate" type="date" />
      </FormField>
      <Grid v-else-if="draft.timingKind === 'withinDateRange'" min="sm" gap="4">
        <FormField label="From"
          ><TextInput v-model="draft.start" type="date"
        /></FormField>
        <FormField label="To"
          ><TextInput v-model="draft.end" type="date"
        /></FormField>
      </Grid>
      <Grid v-else-if="draft.timingKind === 'atFrequency'" min="sm" gap="4">
        <FormField label="Every"
          ><TextInput v-model="draft.period" type="number"
        /></FormField>
        <FormField label="Unit"
          ><Select v-model="draft.unit" :options="units"
        /></FormField>
      </Grid>
      <CheckboxGroup
        v-if="task && dependencyOptions.length"
        v-model="draft.dependsOn"
        legend="Depends on"
        :options="dependencyOptions"
      />
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          task ? 'Save task' : 'Add task'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
