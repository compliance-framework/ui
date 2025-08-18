<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

import { useDataApi } from '@/composables/axios';

import type {
  AssessmentPlan,
  AssociatedActivity,
  Task,
} from '@/stores/assessment-plans.ts';
import type { Activity } from '@/stores/activities.ts';

import Timeline from '@/volt/Timeline.vue';
import Chip from '@/volt/Chip.vue';
import TaskEditModal from '@/components/assessment-plans/TaskEditModal.vue';

interface FullAssociatedActivity extends AssociatedActivity {
  activity: Activity;
}

const toast = useToast();
const confirm = useConfirm();

const props = defineProps<{
  assessmentPlan: AssessmentPlan;
  task: Task;
}>();

const emit = defineEmits<{
  updated: [task: Task];
  deleted: [task: Task];
}>();

const showEditModal = ref(false);

const { data: associatedActivities, execute: fetchAssociatedActivities } =
  useDataApi<FullAssociatedActivity[]>(
    `/api/oscal/assessment-plans/${props.assessmentPlan.uuid}/tasks/${props.task.uuid}/associated-activities`,
    {},
    {
      immediate: false,
    },
  );
const { execute: getActivities } = useDataApi<Activity>();
const { execute: deleteTask } = useDataApi<void>(
  `/api/oscal/assessment-plans/${props.assessmentPlan.uuid}/tasks/${props.task.uuid}`,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

function editTask() {
  showEditModal.value = true;
}

onMounted(async () => {
  await fetchAssociatedActivities();
  if (!associatedActivities.value) return;
  for (const activity of associatedActivities.value!) {
    const { data: activityData } = await getActivities(
      `/api/oscal/activities/${activity.activityUuid}`,
    );
    if (!activityData.value) continue;
    activity.activity = activityData.value.data;
  }
});

async function onTaskUpdated(task: Task) {
  emit('updated', task);
}

async function removeTask() {
  confirm.require({
    message: 'Are you sure you want to remove this task?',
    header: 'Remove Task',
    rejectProps: {
      label: 'Cancel',
    },
    acceptProps: {
      label: 'Yes',
      severity: 'danger',
    },
    accept: async () => {
      await deleteTask();
      emit('deleted', props.task);
      toast.add({
        severity: 'success',
        summary: 'Task Removed',
        detail: 'Task has been removed successfully',
        life: 3000,
      });
    },
  });
}
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center">
      <Chip :label="props.task.type" class="mr-2" />
      <h3
        class="font-medium text-lg text-gray-900 dark:text-slate-300 inline-block"
      >
        {{ props.task.title }}
      </h3>
    </div>
    <div class="flex gap-2">
      <button
        @click="editTask"
        class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Edit
      </button>
      <button
        @click="removeTask"
        class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
      >
        Remove
      </button>
    </div>
  </div>

  <div v-if="props.task.description" class="mt-2 px-4">
    <span class="font-medium text-gray-700 dark:text-slate-400"
      >Description:</span
    >
    <p class="mt-1 text-gray-900 dark:text-slate-300">
      {{ props.task.description }}
    </p>
  </div>

  <div class="px-4 mt-4">
    <span class="font-medium text-lg">Activities</span>
    <div v-for="activity in associatedActivities" :key="activity.activityUuid">
      <h4>{{ activity.activity?.title }}</h4>
      <h5 class="font-medium text-lg">Steps:</h5>
      <Timeline
        :value="activity.activity?.steps"
        :hide-opposite="true"
        class="mt-8"
      >
        <template #content="slotProps">
          <h2 class="font-medium">{{ slotProps.item.title }}</h2>
          <p class="py-2">{{ slotProps.item.description }}</p>
        </template>
      </Timeline>
    </div>
  </div>

  <!-- Task Edit Modal -->
  <TaskEditModal
    v-model="showEditModal"
    :assessment-plan-id="props.assessmentPlan.uuid"
    :task="props.task"
    @updated="onTaskUpdated"
  />
</template>
