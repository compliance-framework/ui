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
const isExpanded = ref(true);

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
      for (const activity of associatedActivities.value) {
        activityStore.get(activity.activityUuid).then((res) => {
          activity.activity = res.data;
        });
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

async function removeActivity(activity: FullAssociatedActivity) {
  confirm.require({
    message: `Are you sure you want to remove the activity "${activity.activity?.title}"?`,
    header: 'Remove Activity',
    rejectProps: {
      label: 'Cancel',
    },
    acceptProps: {
      label: 'Yes',
      severity: 'danger',
    },
    accept: async () => {
      try {
        await assessmentPlanStore.disassociateActivity(
          props.assessmentPlan.uuid,
          props.task.uuid,
          activity.activityUuid
        );
        
        // Remove from local list
        associatedActivities.value = associatedActivities.value.filter(
          a => a.activityUuid !== activity.activityUuid
        );
        
        toast.add({
          severity: 'success',
          summary: 'Activity Removed',
          detail: 'Activity has been removed from this task',
          life: 3000,
        });
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to remove activity',
          life: 3000,
        });
      }
    },
  });
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div class="flex items-center flex-1">
        <button
          @click="isExpanded = !isExpanded"
          class="mr-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          <svg 
            :class="['w-5 h-5 transition-transform', isExpanded ? 'rotate-90' : '']" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
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

  <!-- Collapsible content -->
  <div v-show="isExpanded" class="mt-2">
    <div v-if="props.task.description" class="px-4">
    <span class="font-medium text-gray-700 dark:text-slate-400"
      >Description:</span
    >
    <p class="mt-1 text-gray-900 dark:text-slate-300">
      {{ props.task.description }}
    </p>
  </div>

  <!-- Task Timing Display -->
  <div v-if="props.task.timing" class="mt-4 px-4">
    <span class="font-medium text-gray-700 dark:text-slate-400">Timing:</span>
    <div class="mt-1 text-gray-900 dark:text-slate-300">
      <!-- On Specific Date -->
      <span v-if="props.task.timing.onDate">
        On {{ formatDate(props.task.timing.onDate) }}
      </span>
      <!-- Within Date Range -->
      <span v-else-if="props.task.timing.withinDateRange">
        Between {{ formatDate(props.task.timing.withinDateRange.start) }} and {{ formatDate(props.task.timing.withinDateRange.end) }}
      </span>
      <!-- At Frequency -->
      <span v-else-if="props.task.timing.atFrequency">
        Every {{ props.task.timing.atFrequency.period }} {{ props.task.timing.atFrequency.unit }}
      </span>
    </div>
  </div>

  <div class="px-4 mt-4">
    <div class="flex justify-between items-center mb-4">
      <span class="font-medium text-lg">Activities</span>
    </div>
    
    <!-- No activities message -->
    <div v-if="associatedActivities.length === 0" class="p-4 bg-gray-50 dark:bg-slate-800 rounded-md text-center">
      <p class="text-gray-500 dark:text-slate-400">No activities associated with this task.</p>
    </div>
    
    <!-- Activities list -->
    <div v-else class="space-y-4">
      <div v-for="activity in associatedActivities" :key="activity.activityUuid" 
           class="border border-gray-200 dark:border-slate-700 rounded-md p-4">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h4 class="font-medium text-lg text-gray-900 dark:text-slate-300">{{ activity.activity?.title }}</h4>
            <h5 class="font-medium text-base mt-4 text-gray-700 dark:text-slate-400">Steps:</h5>
            <Timeline :value="activity.activity?.steps" :hide-opposite="true" class="mt-4" >
              <template #content="slotProps">
                <h2 class="font-medium">{{ slotProps.item.title }}</h2>
                <p class="py-2">{{ slotProps.item.description }}</p>
              </template>
            </Timeline>
          </div>
          <button
            @click="removeActivity(activity)"
            class="ml-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            title="Remove activity"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
  </div> <!-- End of collapsible content -->

  <!-- Task Edit Modal -->
  <TaskEditModal
    v-model="showEditModal"
    :assessment-plan-id="props.assessmentPlan.uuid"
    :task="props.task"
    @updated="onTaskUpdated"
  />
  </div>
</template>
