<template>
  <Message
    v-if="!systemStore.system.assessmentPlan"
    severity="error"
    variant="outlined"
  >
    <h4 class="font-bold">Assessment Plan not selected</h4>
    <p>You have not selected a assessment plan for editing.</p>
    <p>
      Please return to the
      <RouterLink :to="{ name: 'assessment-plans' }" class="underline"
        >Assessment Plans
      </RouterLink>
      to select one
    </p>
  </Message>

  <div
    v-else
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700 p-6"
  >
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold dark:text-slate-300">Workflows</h3>
      <button
        @click="showCreateModal = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Add Task
      </button>
    </div>

    <div v-if="tasksLoaded">
      <div class="space-y-8" v-if="assessmentPlan">
        <div v-for="(task, index) in tasks" :key="task.uuid || index">
          <TaskDetail
            @updated="taskUpdated"
            @deleted="taskDeleted"
            :task="task"
            :assessment-plan="assessmentPlan"
          />
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No tasks defined yet.</p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Click "Add Task" to create your first assessment task.
      </p>
    </div>

    <!-- Task Create Modal -->
    <TaskCreateModal
      v-model="showCreateModal"
      :assessment-plan-id="route.params.id as string"
      @created="taskCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { onActivated, onMounted, ref } from 'vue';
import type { AssessmentPlan, Task } from '@/stores/assessment-plans.ts';
import { useRoute } from 'vue-router';
import TaskCreateModal from '@/components/assessment-plans/TaskCreateModal.vue';
import TaskDetail from '@/views/assessment-plans/partials/TaskDetail.vue';
import { useDataApi } from '@/composables/axios';
import { useSystemStore } from '@/stores/system';
import Message from '@/volt/Message.vue';

const systemStore = useSystemStore();

const route = useRoute();

const showCreateModal = ref(false);

const { data: assessmentPlan, execute: refreshAssessmentPlan } =
  useDataApi<AssessmentPlan>(
    `/api/oscal/assessment-plans/${systemStore.system.assessmentPlan?.uuid}`,
    null,
    { immediate: false },
  );
const {
  data: tasks,
  execute: refreshTasks,
  isFinished: tasksLoaded,
} = useDataApi<Task[]>(
  `/api/oscal/assessment-plans/${systemStore.system.assessmentPlan?.uuid}/tasks`,
  null,
  { immediate: false },
);

async function taskUpdated(task: Task) {
  if (!tasks.value) return;
  tasks.value = tasks.value.map((value) =>
    value.uuid == task.uuid ? task : value,
  );
}

async function taskDeleted(task: Task) {
  if (!tasks.value) return;
  tasks.value = tasks.value.filter((value) => value.uuid != task.uuid);
}

async function taskCreated(task: Task) {
  if (!tasks.value) return;
  tasks.value.push(task);
}

onMounted(async () => {
  await refreshAssessmentPlan();
  await refreshTasks();
});
</script>
