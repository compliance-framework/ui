<script setup lang="ts">
import {
  type AssessmentPlan,
  type AssociatedActivity,
  type Task,
  useAssessmentPlanStore,
} from '@/stores/assessment-plans.ts';
import TaskEditModal from '@/components/assessment-plans/TaskEditModal.vue';
import { onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { type Activity, useActivityStore } from '@/stores/activities.ts';
import Timeline from '@/volt/Timeline.vue';
import Chip from '@/volt/Chip.vue';

const toast = useToast();
const confirm = useConfirm();
const assessmentPlanStore = useAssessmentPlanStore();
const activityStore = useActivityStore();

const props = defineProps<{
  assessmentPlan: AssessmentPlan;
  task: Task;
}>();

const emit = defineEmits<{
  updated: [task: Task];
  deleted: [task: Task];
}>();

const showEditModal = ref(false);

function editTask() {
  showEditModal.value = true;
}

interface FullAssociatedActivity extends AssociatedActivity {
  activity: Activity;
}

const associatedActivities = ref<FullAssociatedActivity[]>([]);

onMounted(() => {
  assessmentPlanStore
    .getAssociatedActivities(props.assessmentPlan.uuid, props.task.uuid)
    .then((data) => {
      associatedActivities.value = data.data as FullAssociatedActivity[];
      for (let i = 0; associatedActivities.value.length > i; i++) {
        activityStore.get(associatedActivities.value[i].activityUuid).then((res) => {
          associatedActivities.value[i].activity = res.data;
        })
      }
    });
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
      await assessmentPlanStore.deleteTask(
        props.assessmentPlan.uuid,
        props.task.uuid,
      );
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
      <h3 class="font-medium text-lg text-gray-900 dark:text-slate-300 inline-block">
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
      <Timeline :value="activity.activity?.steps" :hide-opposite="true" class="mt-8" >
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
