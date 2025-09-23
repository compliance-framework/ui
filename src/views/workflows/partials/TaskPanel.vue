<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

import { useDataApi } from '@/composables/axios';

import type { AssessmentPlan } from '@/oscal';
import type { Task, Activity, AssociatedActivity } from '@/oscal';

import Panel from '@/volt/Panel.vue';
import TaskTiming from './TaskTiming.vue';
import { useToggle } from '@/composables/useToggle';
import ActivityPanel from './ActivityPanel.vue';
import ActivityCreateForm from './ActivityCreateForm.vue';
import Dialog from '@/volt/Dialog.vue';
import TaskEditForm from './TaskEditForm.vue';
import Button from '@/volt/Button.vue';

interface FullAssociatedActivity extends AssociatedActivity {
  activity: Activity;
}

const toast = useToast();
const confirm = useConfirm();
const {
  value: creatingActivity,
  toggle: toggleCreatingActivity,
  set: setCreatingActivity,
} = useToggle(false);
const { value: editingTask, set: setEditingTask } = useToggle(false);

const props = defineProps<{
  assessmentPlan: AssessmentPlan;
  task: Task;
}>();

const emit = defineEmits<{
  updated: [task: Task];
  deleted: [task: Task];
}>();

const activities = ref<Activity[]>([]);

const { data: associatedActivities, execute: fetchAssociatedActivities } =
  useDataApi<FullAssociatedActivity[]>(
    `/api/oscal/assessment-plans/${props.assessmentPlan.uuid}/tasks/${props.task.uuid}/associated-activities`,
    {},
    {
      immediate: false,
    },
  );
const { execute: getActivity } = useDataApi<Activity>();
const { execute: deleteTask } = useDataApi<void>(
  `/api/oscal/assessment-plans/${props.assessmentPlan.uuid}/tasks/${props.task.uuid}`,
  {
    method: 'DELETE',
  },
  { immediate: false },
);

onMounted(async () => {
  await fetchAssociatedActivities();
  if (!associatedActivities.value) return;
  const localActivities = [];
  for (const activity of associatedActivities.value!) {
    const { data: activityData } = await getActivity(
      `/api/oscal/activities/${activity.activityUuid}`,
    );
    if (!activityData.value) continue;
    activity.activity = activityData.value.data;
    localActivities.push(activityData.value.data);
  }
  activities.value = localActivities;
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

function activityCreated(activity: Activity) {
  activities.value.push(activity);
  setCreatingActivity(false);
}

import { BIconPencil, BIconTrash } from 'bootstrap-icons-vue';
</script>

<template>
  <Panel toggleable collapsed class="my-2">
    <template #header>
      <div class="grow flex items-center gap-2">
        <div>
          <span>{{ props.task.title }}</span>
          <div>
            <TaskTiming :timing="props.task.timing" v-if="props.task.timing" />
          </div>
        </div>

        <!-- <Badge value="AC-1" severity="info" /> -->
        <div class="flex">
          <Button variant="text" size="small" @click="setEditingTask(true)"
            ><BIconPencil
          /></Button>
          <Button variant="text" size="small" @click="removeTask"
            ><BIconTrash
          /></Button>
        </div>
      </div>
    </template>
    <div>
      <div v-if="props.task.description">
        <p class="mt-1 dark:text-slate-300 whitespace-pre-wrap">
          {{ props.task.description }}
        </p>
      </div>

      <div v-if="props.task.remarks" class="mt-2">
        <h5>Remarks:</h5>
        <p class="font-light whitespace-pre-wrap">
          {{ props.task.remarks }}
        </p>
      </div>

      <div class="mt-4">
        <!-- <h5>Activities</h5> -->

        <ActivityPanel
          v-for="activity in activities"
          :key="activity.uuid"
          :activity="activity"
        />

        <Button @click="toggleCreatingActivity" size="small"
          >Add Activity
        </Button>
      </div>

      <div v-if="props.task.tasks && props.task.tasks.length" class="mt-4">
        <h4>Sub Tasks</h4>
        <TaskPanel
          v-for="(task, index) in props.task.tasks"
          :key="task.uuid || index"
          :task="task"
          :assessment-plan="assessmentPlan"
        />
        <Button @click="toggleCreatingActivity" size="small"
          >Add Sub Task
        </Button>
      </div>
    </div>
  </Panel>

  <Dialog
    header="Edit Task"
    size="lg"
    v-model:visible="editingTask"
    modal
    :draggable="false"
  >
    <TaskEditForm
      @updated="onTaskUpdated"
      @cancel="setEditingTask(false)"
      :assessment-plan-id="props.assessmentPlan.uuid"
      :task="task"
    />
  </Dialog>

  <Dialog
    header="New Activity"
    size="lg"
    v-model:visible="creatingActivity"
    modal
  >
    <ActivityCreateForm
      @created="activityCreated"
      @cancel="setCreatingActivity(false)"
      :assessment-plan="props.assessmentPlan"
      :task="props.task"
    />
  </Dialog>
</template>
